// Copia as fotos das peças importadas do agrotrator.com.br (endereços 600×600 da VTEX) para a pasta
// de uploads do servidor e troca o endereço no banco por "agrotrator/<sku>-<n>.jpg" (servido em
// /uploads/...). Roda em segundo plano no servidor, pelo botão do admin (Produtos). Pode parar e
// recomeçar: cada foto copiada já deixa de ser externa, então a próxima rodada continua de onde parou.
import fs from "fs";
import path from "path";

const ORIGEM = "vteximg.com.br";
const PASTA = "agrotrator";
const SIMULTANEAS = 4;

type Estado = {
  rodando: boolean;
  copiadas: number;
  falhas: number;
  inicio: string | null;
  fim: string | null;
  erro: string | null;
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
  });

const nomeArquivo = (sku: string, ordem: number) =>
  `${PASTA}/${sku.trim().replace(/[^A-Za-z0-9._-]/g, "_")}-${ordem + 1}.jpg`;

export async function situacaoFotos() {
  const { prisma } = await import("./prisma");
  const [faltam, copiadas] = await Promise.all([
    prisma.agricolas_img.count({ where: { image_path: { contains: ORIGEM } } }),
    prisma.agricolas_img.count({ where: { image_path: { startsWith: `${PASTA}/` } } }),
  ]);
  return { ...estado(), faltam, copiadasTotal: copiadas };
}

async function copiarUma(img: { id: number; sku: string; image_path: string; sort_order: number }) {
  const { prisma } = await import("./prisma");
  const { caminhoUpload } = await import("./uploads.server");
  const relativo = nomeArquivo(img.sku, img.sort_order);
  const destino = caminhoUpload(relativo);
  if (!fs.existsSync(destino)) {
    const r = await fetch(img.image_path, { signal: AbortSignal.timeout(30_000) });
    if (!r.ok || !(r.headers.get("content-type") || "").startsWith("image/"))
      throw new Error(`HTTP ${r.status}`);
    const buf = Buffer.from(await r.arrayBuffer());
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, buf);
  }
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
    inicio: new Date().toISOString(),
    fim: null,
    erro: null,
  });
  void (async () => {
    const { prisma } = await import("./prisma");
    // Fotos que falharam nesta rodada ficam para a próxima (não trava em loop)
    const pular = new Set<number>();
    try {
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
