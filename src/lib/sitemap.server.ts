// Mapa do site para o Google, dividido em partes (o Search Console mostra quantas de cada parte
// foram indexadas): /sitemap.xml é o índice; /sitemaps/paginas.xml tem as páginas principais e
// as páginas por marca/categoria; /sitemaps/pecas-N.xml tem as peças, 10 mil por arquivo.
import { SITE_URL } from "./site";

export const POR_ARQUIVO = 10_000;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const url = (loc: string, extra = "") => `<url><loc>${esc(loc)}</loc>${extra}</url>`;
const urlset = (linhas: string[]) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${linhas.join("\n")}\n</urlset>\n`;

let cache: { pecas: Array<{ sku: string; data: string }>; em: number } | null = null;
async function pecas() {
  if (cache && Date.now() - cache.em < 60 * 60 * 1000) return cache.pecas;
  const { prisma } = await import("./prisma");
  const rows = await prisma.agricolas.findMany({
    where: { duplicado_de: null, category_id: { not: null } },
    select: { sku: true, updated_at: true },
    orderBy: { sku: "asc" },
  });
  cache = { pecas: rows.map((r) => ({ sku: r.sku.trim(), data: r.updated_at.toISOString().slice(0, 10) })), em: Date.now() };
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
    const { buscarSkus } = await import("./busca-catalogo.server");
    // Marca + categoria só quando tem peças (página vazia não vale a pena indexar)
    const combos: string[] = [];
    for (const m of MARCAS_SEO)
      for (const c of CATEGORIAS_SEO)
        if ((await buscarSkus({ marca: m.marca, categoria: c.categoria, vitrine: true })).length) combos.push(`/repuestos/${m.slug}/${c.slug}`);
    return urlset([
      url(`${SITE_URL}/`, "<changefreq>daily</changefreq><priority>1.0</priority>"),
      url(`${SITE_URL}/loja`, "<changefreq>daily</changefreq><priority>0.9</priority>"),
      url(`${SITE_URL}/repuestos`, "<changefreq>weekly</changefreq><priority>0.9</priority>"),
      ...MARCAS_SEO.map((m) => url(`${SITE_URL}/repuestos/${m.slug}`, "<changefreq>weekly</changefreq><priority>0.9</priority>")),
      ...CATEGORIAS_SEO.map((c) => url(`${SITE_URL}/repuestos/${c.slug}`, "<changefreq>weekly</changefreq><priority>0.8</priority>")),
      ...combos.map((u) => url(`${SITE_URL}${u}`, "<priority>0.7</priority>")),
      url(`${SITE_URL}/catalogos`, "<changefreq>weekly</changefreq><priority>0.7</priority>"),
      ...(await catalogosPublicos()).map((c) => url(`${SITE_URL}${c.caminho}`, `<lastmod>${c.data}</lastmod><priority>0.7</priority>`)),
      url(`${SITE_URL}/cotizar`, "<changefreq>weekly</changefreq><priority>0.7</priority>"),
      url(`${SITE_URL}/pedido-rapido`, "<priority>0.6</priority>"),
      url(`${SITE_URL}/ayuda`, "<priority>0.5</priority>"),
    ]);
  }
  const m = arquivo.match(/^pecas-(\d+)\.xml$/);
  if (!m) return null;
  const i = Number(m[1]) - 1;
  const lista = (await pecas()).slice(i * POR_ARQUIVO, (i + 1) * POR_ARQUIVO);
  if (!lista.length) return null;
  return urlset(lista.map((p) => url(`${SITE_URL}/produto/${encodeURIComponent(p.sku)}`, `<lastmod>${p.data}</lastmod>`)));
}

// Página pública de cada catálogo publicado (/catalogos/<titulo>-<id>)
async function catalogosPublicos() {
  const { prisma } = await import("./prisma");
  const { urlCatalogo } = await import("./catalogos");
  const rows = await prisma.catalogos.findMany({ where: { ativo: true }, select: { id: true, titulo: true, updated_at: true } }).catch(() => []);
  return rows.map((c) => ({ caminho: urlCatalogo(c), data: c.updated_at.toISOString().slice(0, 10) }));
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
    const cats = await prisma.catalogos.findMany({ where: { ativo: true, updated_at: { gt: desde } }, select: { id: true, titulo: true } }).catch(() => []);
    const { urlCatalogo } = await import("./catalogos");
    return [
      ...pecasNovas.map((p) => `${SITE_URL}/produto/${encodeURIComponent(p.sku.trim())}`),
      ...cats.map((c) => `${SITE_URL}${urlCatalogo(c)}`),
      ...(cats.length ? [`${SITE_URL}/catalogos`] : []),
    ];
  }
  const paginas = await sitemapParte("paginas.xml");
  const locs = [...(paginas ?? "").matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, "&"));
  return [...locs, ...(await pecas()).map((p) => `${SITE_URL}/produto/${encodeURIComponent(p.sku)}`)];
}
