// Mapa do site para o Google, dividido em partes (o Search Console mostra quantas de cada parte
// foram indexadas): /sitemap.xml é o índice; /sitemaps/paginas.xml tem as páginas principais e
// as páginas por marca/categoria; /sitemaps/pecas-N.xml tem as peças, 10 mil por arquivo.
// Cada página entra duas vezes: em espanhol (/...) e em português (/pt/...), cada uma apontando
// para a outra (xhtml:link hreflang), como o Google pede para sites em dois idiomas.
import { SITE_URL } from "./site";
import { comPrefixo, HREFLANG } from "./idioma";

export const POR_ARQUIVO = 10_000;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// Endereço completo de uma página (caminho interno, sem "/pt") no idioma pedido
const endereco = (caminho: string, idioma: "es" | "pt") =>
  `${SITE_URL}${comPrefixo(caminho, idioma)}`;
// As duas versões da página, cada uma com os links para as duas
const url = (caminho: string, extra = "") => {
  const alternativos =
    `<xhtml:link rel="alternate" hreflang="${HREFLANG.es}" href="${esc(endereco(caminho, "es"))}"/>` +
    `<xhtml:link rel="alternate" hreflang="${HREFLANG.pt}" href="${esc(endereco(caminho, "pt"))}"/>` +
    `<xhtml:link rel="alternate" hreflang="x-default" href="${esc(endereco(caminho, "es"))}"/>`;
  return (["es", "pt"] as const)
    .map((i) => `<url><loc>${esc(endereco(caminho, i))}</loc>${alternativos}${extra}</url>`)
    .join("\n");
};
const urlset = (linhas: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${linhas.join("\n")}\n</urlset>\n`;

let cache: { pecas: Array<{ sku: string; data: string }>; em: number } | null = null;
async function pecas() {
  if (cache && Date.now() - cache.em < 60 * 60 * 1000) return cache.pecas;
  const { prisma } = await import("./prisma");
  const rows = await prisma.agricolas.findMany({
    where: { duplicado_de: null, category_id: { not: null } },
    select: { sku: true, updated_at: true },
    orderBy: { sku: "asc" },
  });
  cache = {
    pecas: rows.map((r) => ({ sku: r.sku.trim(), data: r.updated_at.toISOString().slice(0, 10) })),
    em: Date.now(),
  };
  return cache.pecas;
}

export async function indiceSitemap() {
  const n = Math.max(1, Math.ceil((await pecas()).length / POR_ARQUIVO));
  const hoje = new Date().toISOString().slice(0, 10);
  const arquivos = ["paginas.xml", ...Array.from({ length: n }, (_, i) => `pecas-${i + 1}.xml`)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${arquivos
    .map((a) => `<sitemap><loc>${SITE_URL}/sitemaps/${a}</loc><lastmod>${hoje}</lastmod></sitemap>`)
    .join("\n")}\n</sitemapindex>\n`;
}

export async function sitemapParte(arquivo: string): Promise<string | null> {
  if (arquivo === "paginas.xml") {
    const { MARCAS_SEO, CATEGORIAS_SEO } = await import("./seo-paginas");
    const { LOCAIS_SEO } = await import("./locais-seo");
    const { buscarSkus } = await import("./busca-catalogo.server");
    // Marca + categoria só quando tem peças (página vazia não vale a pena indexar)
    const combos: string[] = [];
    for (const m of MARCAS_SEO)
      for (const c of CATEGORIAS_SEO)
        if ((await buscarSkus({ marca: m.marca, categoria: c.categoria, vitrine: true })).length)
          combos.push(`/repuestos/${m.slug}/${c.slug}`);
    return urlset([
      url(`/`, "<changefreq>daily</changefreq><priority>1.0</priority>"),
      url(`/loja`, "<changefreq>daily</changefreq><priority>0.9</priority>"),
      url(`/repuestos`, "<changefreq>weekly</changefreq><priority>0.9</priority>"),
      ...MARCAS_SEO.map((m) =>
        url(`/repuestos/${m.slug}`, "<changefreq>weekly</changefreq><priority>0.9</priority>"),
      ),
      ...CATEGORIAS_SEO.map((c) =>
        url(`/repuestos/${c.slug}`, "<changefreq>weekly</changefreq><priority>0.8</priority>"),
      ),
      ...combos.map((u) => url(u, "<priority>0.7</priority>")),
      url(`/repuestos-agricolas`, "<changefreq>weekly</changefreq><priority>0.8</priority>"),
      ...LOCAIS_SEO.map((l) =>
        url(
          `/repuestos-agricolas/${l.slug}`,
          "<changefreq>weekly</changefreq><priority>0.7</priority>",
        ),
      ),
      url(`/catalogos`, "<changefreq>weekly</changefreq><priority>0.7</priority>"),
      ...(await catalogosPublicos()).map((c) =>
        url(c.caminho, `<lastmod>${c.data}</lastmod><priority>0.7</priority>`),
      ),
      url(`/cotizar`, "<changefreq>weekly</changefreq><priority>0.7</priority>"),
      url(`/pedido-rapido`, "<priority>0.6</priority>"),
      url(`/ayuda`, "<priority>0.5</priority>"),
      // Campanha (endereço fixo o ano todo) e cupons
      url(`/black-friday`, "<changefreq>daily</changefreq><priority>0.8</priority>"),
      url(`/cupones`, "<changefreq>daily</changefreq><priority>0.6</priority>"),
    ]);
  }
  const m = arquivo.match(/^pecas-(\d+)\.xml$/);
  if (!m) return null;
  const i = Number(m[1]) - 1;
  const lista = (await pecas()).slice(i * POR_ARQUIVO, (i + 1) * POR_ARQUIVO);
  if (!lista.length) return null;
  return urlset(
    lista.map((p) => url(`/produto/${encodeURIComponent(p.sku)}`, `<lastmod>${p.data}</lastmod>`)),
  );
}

// Página pública de cada catálogo publicado (/catalogos/<titulo>-<id>)
async function catalogosPublicos() {
  const { prisma } = await import("./prisma");
  const { urlCatalogo } = await import("./catalogos");
  const rows = await prisma.catalogos
    .findMany({ where: { ativo: true }, select: { id: true, titulo: true, updated_at: true } })
    .catch(() => []);
  return rows.map((c) => ({
    caminho: urlCatalogo(c),
    data: c.updated_at.toISOString().slice(0, 10),
  }));
}

// Todas as URLs do mapa (para avisar o Bing pela IndexNow). desde: só peças/catálogos alterados depois
export async function urlsDoSite(desde?: Date): Promise<string[]> {
  if (desde) {
    const { prisma } = await import("./prisma");
    const pecasNovas = await prisma.agricolas.findMany({
      where: { duplicado_de: null, category_id: { not: null }, updated_at: { gt: desde } },
      select: { sku: true },
      take: 10_000,
    });
    const cats = await prisma.catalogos
      .findMany({
        where: { ativo: true, updated_at: { gt: desde } },
        select: { id: true, titulo: true },
      })
      .catch(() => []);
    const { urlCatalogo } = await import("./catalogos");
    return [
      ...pecasNovas.flatMap((p) => [
        endereco(`/produto/${encodeURIComponent(p.sku.trim())}`, "es"),
        endereco(`/produto/${encodeURIComponent(p.sku.trim())}`, "pt"),
      ]),
      ...cats.flatMap((c) => [endereco(urlCatalogo(c), "es"), endereco(urlCatalogo(c), "pt")]),
      ...(cats.length ? [endereco("/catalogos", "es"), endereco("/catalogos", "pt")] : []),
    ];
  }
  const paginas = await sitemapParte("paginas.xml");
  const locs = [...(paginas ?? "").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) =>
    m[1].replace(/&amp;/g, "&"),
  );
  return [
    ...locs,
    ...(await pecas()).flatMap((p) => [
      endereco(`/produto/${encodeURIComponent(p.sku)}`, "es"),
      endereco(`/produto/${encodeURIComponent(p.sku)}`, "pt"),
    ]),
  ];
}
