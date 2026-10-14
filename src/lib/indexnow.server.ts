// IndexNow: avisa o Bing (e Yandex, Seznam, Naver) assim que uma página é criada ou alterada,
// em vez de esperar o robô passar. O Bing alimenta também o DuckDuckGo, o Yahoo e a busca do ChatGPT.
// A chave é pública por natureza: fica em public/<chave>.txt para o Bing conferir o dono do site.
// O agendador (automacoes.server) chama indexNowPendentes() a cada 10 minutos, só em produção.
import { SITE_URL } from "./site";

export const INDEXNOW_KEY = "594f4b2ebbbde1873cb2ddbf43af4488";
// INDEXNOW_URL só serve para testes locais (servidor falso)
const API = process.env.INDEXNOW_URL || "https://api.indexnow.org/indexnow";
const LOTE = 10_000; // máximo por pedido
const ULTIMO = "indexnow_ultimo";
const RESULTADO = "indexnow_resultado";

export type ResultadoIndexNow = { quando: string; urls: number; ok: boolean; detalhe: string };

const ativo = () =>
  (process.env.NODE_ENV === "production" || !!process.env.INDEXNOW_URL) &&
  SITE_URL.startsWith("https://");

export async function avisarIndexNow(urls: string[]): Promise<ResultadoIndexNow> {
  const host = new URL(SITE_URL).hostname;
  const lista = [...new Set(urls)].filter((u) => u.startsWith(SITE_URL));
  const res: ResultadoIndexNow = {
    quando: new Date().toISOString(),
    urls: lista.length,
    ok: true,
    detalhe: "",
  };
  if (!lista.length) return { ...res, detalhe: "nada novo" };
  if (!ativo()) return { ...res, ok: false, detalhe: "só funciona no site publicado" };
  const status: string[] = [];
  for (let i = 0; i < lista.length; i += LOTE) {
    try {
      const r = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({
          host,
          key: INDEXNOW_KEY,
          keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
          urlList: lista.slice(i, i + LOTE),
        }),
        signal: AbortSignal.timeout(30_000),
      });
      // 200/202 = recebido; 422 = URLs fora do domínio; 429 = muitos pedidos
      status.push(String(r.status));
      if (r.status !== 200 && r.status !== 202) res.ok = false;
    } catch (e: any) {
      status.push(e?.name === "TimeoutError" ? "tempo esgotado" : "sem conexão");
      res.ok = false;
    }
  }
  res.detalhe = `resposta ${status.join(", ")}`;
  await guardar(res);
  return res;
}

async function guardar(r: ResultadoIndexNow) {
  const { prisma } = await import("./prisma");
  const valor = JSON.stringify(r);
  await prisma.configuracoes
    .upsert({ where: { chave: RESULTADO }, create: { chave: RESULTADO, valor }, update: { valor } })
    .catch(() => {});
}

export async function ultimoIndexNow(): Promise<ResultadoIndexNow | null> {
  const { prisma } = await import("./prisma");
  const r = await prisma.configuracoes
    .findUnique({ where: { chave: RESULTADO } })
    .catch(() => null);
  try {
    return r ? (JSON.parse(r.valor) as ResultadoIndexNow) : null;
  } catch {
    return null;
  }
}

// Envia o que mudou desde o último aviso; na primeira vez, o site inteiro
export async function indexNowPendentes() {
  if (!ativo()) return null;
  const { prisma } = await import("./prisma");
  const { urlsDoSite } = await import("./sitemap.server");
  const agora = new Date();
  const ult = await prisma.configuracoes.findUnique({ where: { chave: ULTIMO } }).catch(() => null);
  const desde = ult ? new Date(ult.valor) : null;
  const urls = await urlsDoSite(desde && !isNaN(desde.getTime()) ? desde : undefined);
  const r = urls.length ? await avisarIndexNow(urls) : null;
  if (!r || r.ok) {
    await prisma.configuracoes.upsert({
      where: { chave: ULTIMO },
      create: { chave: ULTIMO, valor: agora.toISOString() },
      update: { valor: agora.toISOString() },
    });
  }
  return r;
}

// Botão do admin: reenviar todas as páginas
export async function indexNowTudo() {
  const { urlsDoSite } = await import("./sitemap.server");
  return avisarIndexNow(await urlsDoSite());
}
