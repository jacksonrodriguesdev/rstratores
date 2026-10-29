// Catálogo do Meta (anúncios que mostram a peça que a pessoa viu): status do feed e do Pixel,
// o tamanho do público de remarketing (quem viu peças no Uruguai e não pediu nada) e o retorno
// das visitas que vieram do catálogo (utm_campaign catalogo_meta_*). O feed: feed-google.server.ts.
import { prisma } from "./prisma";

const PECA = [{ path: { startsWith: "/produto/" } }, { path: { startsWith: "/pt/produto/" } }];
const skuDe = (path: string) => {
  const m = path.match(/^(?:\/pt)?\/produto\/([^/?#]+)/);
  if (!m) return null;
  try {
    return decodeURIComponent(m[1]).trim();
  } catch {
    return m[1];
  }
};

export async function painelCatalogoMeta(dias = 30) {
  const { feedGoogle } = await import("./feed-google.server");
  const { configMarketing } = await import("./marketing-config.server");
  const { SITE_URL } = await import("./site");
  const desde = new Date(Date.now() - dias * 86400_000);
  const [feed, mkt] = await Promise.all([
    feedGoogle("UY", "meta").catch(() => ({ itens: 0 })),
    configMarketing(),
  ]);

  // Quem viu peças no Uruguai (sem conta) e quem pediu algo (WhatsApp/cotação)
  const [vistas, pediram] = await Promise.all([
    prisma.site_visits.findMany({
      where: {
        created_at: { gte: desde },
        country_code: "UY",
        visitor_id: { not: null },
        OR: PECA,
      },
      select: { visitor_id: true, path: true },
      take: 200_000,
    }),
    prisma.site_eventos.findMany({
      where: {
        created_at: { gte: desde },
        tipo: { in: ["whatsapp", "cotacao"] },
        visitor_id: { not: null },
      },
      select: { visitor_id: true },
      distinct: ["visitor_id"],
    }),
  ]);
  const pediu = new Set(pediram.map((p) => p.visitor_id));
  const viram = new Set<string>();
  const semPedido = new Set<string>();
  const porPeca = new Map<string, Set<string>>();
  for (const v of vistas) {
    const vid = v.visitor_id!;
    viram.add(vid);
    if (pediu.has(vid)) continue;
    semPedido.add(vid);
    const sku = skuDe(v.path);
    if (!sku) continue;
    if (!porPeca.has(sku)) porPeca.set(sku, new Set());
    porPeca.get(sku)!.add(vid);
  }
  const top = [...porPeca.entries()]
    .map(([sku, s]) => ({ sku, pessoas: s.size }))
    .sort((a, b) => b.pessoas - a.pessoas)
    .slice(0, 12);
  const nomes = top.length
    ? await prisma.agricolas.findMany({
        where: { sku: { in: top.map((t) => t.sku) } },
        select: { sku: true, nome: true, nome_es: true, imagem_principal: true },
      })
    : [];
  const nome = new Map(nomes.map((n) => [n.sku.trim(), n]));

  // Retorno do catálogo: visitas com utm do feed do Meta e o que fizeram depois
  const doCatalogo = await prisma.site_visits.findMany({
    where: { created_at: { gte: desde }, utm_campaign: { startsWith: "catalogo_meta" } },
    select: { visitor_id: true, session_id: true },
  });
  const sessoes = [...new Set(doCatalogo.map((v) => v.session_id).filter(Boolean))] as string[];
  const conversas = sessoes.length
    ? await prisma.site_eventos.count({
        where: { session_id: { in: sessoes }, tipo: { in: ["whatsapp", "cotacao"] } },
      })
    : 0;

  return {
    feedUrl: `${SITE_URL}/feeds/meta-catalogo.xml`,
    feedItens: feed.itens,
    pixel: mkt.mkt_meta_pixel_id || null,
    dias,
    publico: { viram: viram.size, semPedido: semPedido.size },
    pecas: top.map((t) => {
      const p = nome.get(t.sku);
      return {
        sku: t.sku,
        pessoas: t.pessoas,
        nome: p ? p.nome_es || p.nome : t.sku,
        imagem: p?.imagem_principal ?? null,
        noFeed: !!p?.imagem_principal,
      };
    }),
    retorno: {
      visitas: doCatalogo.length,
      pessoas: new Set(doCatalogo.map((v) => v.visitor_id).filter(Boolean)).size,
      conversas,
    },
  };
}
