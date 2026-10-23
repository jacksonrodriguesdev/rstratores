// Copia as fotos das peças importadas do agrotrator.com.br (endereços 600×600 da VTEX) para a pasta
// de uploads do servidor e troca o endereço no banco por "agrotrator/<sku>-<n>.jpg" (servido em
// /uploads/...). Roda em segundo plano no servidor, pelo botão do admin (Produtos). Pode parar e
// recomeçar: cada foto copiada já deixa de ser externa, então a próxima rodada continua de onde parou.
// Também recupera as que já estavam copiadas mas sumiram da pasta (ex.: troca da pasta de uploads
// no Hostinger): o banco de produção só guarda "agrotrator/<sku>-<n>.jpg", então o endereço original
// vem da lista src/lib/dados/fotos-agrotrator.tsv (gerada do banco local, ver scripts/manutencao).
import fs from "fs";
import path from "path";

const ORIGEM = "vteximg.com.br";
const PASTA = "agrotrator";
const SIMULTANEAS = 4;
const VTEX = "https://agrotrator2.vteximg.com.br/arquivos/ids/";
const TAMANHOS_LOGO = new Set([10889, 10322, 10377, 10648, 10597]);

type Estado = {
  rodando: boolean;
  copiadas: number;
  falhas: number;
  inicio: string | null;
  fim: string | null;
  erro: string | null;
  recuperadas: number;
  sumidas: number | null;
};
const g = globalThis as unknown as { __fotosAgrotrator?: Estado };
const estado = (): Estado =>
  (g.__fotosAgrotrator ??= {
    rodando: false,
    copiadas: 0,
    falhas: 0,
    inicio: null,
    fim: null,
    erro: null,
    recuperadas: 0,
    sumidas: null,
  });

// Arquivo → endereço original (só carregado quando precisa)
let _lista: Map<string, string> | null = null;
async function listaOriginais() {
  if (!_lista) {
    const { default: tsv } = await import("./dados/fotos-agrotrator.tsv?raw");
    const lista = new Map<string, string>();
    for (const l of tsv.split("\n")) {
      const [arq, ids] = l.split("\t");
      if (arq && ids) lista.set(`${PASTA}/${arq.trim()}`, VTEX + ids.trim());
    }
    _lista = lista;
  }
  return _lista;
}

// Fotos que o banco diz estarem no servidor, mas cujo arquivo não existe na pasta
async function fotosSumidas() {
  const { prisma } = await import("./prisma");
  const { caminhoUpload } = await import("./uploads.server");
  const [galeria, principais] = await Promise.all([
    prisma.agricolas_img.findMany({
      where: { image_path: { startsWith: `${PASTA}/` } },
      select: { image_path: true },
    }),
    prisma.agricolas.findMany({
      where: { imagem_principal: { startsWith: `${PASTA}/` } },
      select: { imagem_principal: true },
    }),
  ]);
  const caminhos = new Set(galeria.map((r) => r.image_path.trim()));
  for (const p of principais) if (p.imagem_principal) caminhos.add(p.imagem_principal.trim());
  return [...caminhos].filter((c) => !fs.existsSync(caminhoUpload(c)));
}

async function baixar(url: string, relativo: string) {
  const { caminhoUpload } = await import("./uploads.server");
  const destino = caminhoUpload(relativo);
  const r = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!r.ok || !(r.headers.get("content-type") || "").startsWith("image/"))
    throw new Error(`HTTP ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  // Nunca grava a logo do AGROTRATOR como foto de peça (os 5 tamanhos conhecidos da logo 600×600)
  if (TAMANHOS_LOGO.has(buf.length)) throw new Error("logo, não é foto da peça");
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, buf);
}

const nomeArquivo = (sku: string, ordem: number) =>
  `${PASTA}/${sku.trim().replace(/[^A-Za-z0-9._-]/g, "_")}-${ordem + 1}.jpg`;

export async function situacaoFotos() {
  const { prisma } = await import("./prisma");
  const [faltam, copiadas] = await Promise.all([
    prisma.agricolas_img.count({ where: { image_path: { contains: ORIGEM } } }),
    prisma.agricolas_img.count({ where: { image_path: { startsWith: `${PASTA}/` } } }),
  ]);
  const e = estado();
  if (!e.rodando) e.sumidas = (await fotosSumidas()).length;
  return { ...e, faltam, copiadasTotal: copiadas };
}

async function copiarUma(img: { id: number; sku: string; image_path: string; sort_order: number }) {
  const { prisma } = await import("./prisma");
  const { caminhoUpload } = await import("./uploads.server");
  const relativo = nomeArquivo(img.sku, img.sort_order);
  if (!fs.existsSync(caminhoUpload(relativo))) await baixar(img.image_path, relativo);
  await prisma.agricolas_img.update({ where: { id: img.id }, data: { image_path: relativo } });
  await prisma.agricolas.updateMany({
    where: { sku: img.sku, imagem_principal: img.image_path },
    data: { imagem_principal: relativo },
  });
}

export function iniciarCopiaFotos() {
  const e = estado();
  if (e.rodando) return e;
  Object.assign(e, {
    rodando: true,
    copiadas: 0,
    falhas: 0,
    recuperadas: 0,
    inicio: new Date().toISOString(),
    fim: null,
    erro: null,
  });
  void (async () => {
    const { prisma } = await import("./prisma");
    try {
      // 1. Baixa de novo as que sumiram da pasta
      const sumidas = await fotosSumidas();
      const lista = await listaOriginais();
      e.sumidas = sumidas.length;
      for (let i = 0; i < sumidas.length; i += SIMULTANEAS) {
        await Promise.all(
          sumidas.slice(i, i + SIMULTANEAS).map(async (c) => {
            try {
              const url = lista.get(c);
              if (!url) throw new Error("sem endereço original");
              await baixar(url, c);
              e.recuperadas++;
            } catch {
              e.falhas++;
            }
            e.sumidas = Math.max(0, (e.sumidas ?? 1) - 1);
          }),
        );
      }
      // 2. Copia as que ainda apontam para a VTEX
      // Fotos que falharam nesta rodada ficam para a próxima (não trava em loop)
      const pular = new Set<number>();
      for (;;) {
        const lote = await prisma.agricolas_img.findMany({
          where: { image_path: { contains: ORIGEM }, id: { notIn: [...pular].slice(-5000) } },
          select: { id: true, sku: true, image_path: true, sort_order: true },
          orderBy: { id: "asc" },
          take: 200,
        });
        if (!lote.length) break;
        for (let i = 0; i < lote.length; i += SIMULTANEAS) {
          await Promise.all(
            lote.slice(i, i + SIMULTANEAS).map((img) =>
              copiarUma(img)
                .then(() => void e.copiadas++)
                .catch(() => {
                  e.falhas++;
                  pular.add(img.id);
                }),
            ),
          );
        }
        if (pular.size >= 5000) break;
      }
    } catch (err: any) {
      e.erro = err?.message ?? String(err);
    } finally {
      e.rodando = false;
      e.fim = new Date().toISOString();
    }
  })();
  return e;
}
