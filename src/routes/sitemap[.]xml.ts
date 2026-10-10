import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";
import { MONTADORAS } from "@/lib/navegacao";

// Mapa do site para o Google: páginas principais, categorias, marcas e todas as peças da vitrine.
// Cerca de 29 mil endereços (o limite por arquivo é 50 mil). Gerado na hora e guardado por 1 hora.
let cache: { xml: string; em: number } | null = null;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const url = (loc: string, extra = "") => `<url><loc>${esc(loc)}</loc>${extra}</url>`;

async function gerar() {
  const { prisma } = await import("@/lib/prisma");
  const [pecas, categorias] = await Promise.all([
    prisma.agricolas.findMany({
      where: { duplicado_de: null, category_id: { not: null } },
      select: { sku: true, updated_at: true },
    }),
    prisma.agricolas.groupBy({
      by: ["categoria"],
      where: { duplicado_de: null, category_id: { not: null } },
    }),
  ]);
  const linhas = [
    url(`${SITE_URL}/`, "<changefreq>daily</changefreq><priority>1.0</priority>"),
    url(`${SITE_URL}/loja`, "<changefreq>daily</changefreq><priority>0.9</priority>"),
    url(`${SITE_URL}/ayuda`, "<priority>0.5</priority>"),
    url(`${SITE_URL}/pedido-rapido`, "<priority>0.6</priority>"),
    url(`${SITE_URL}/cotizar`, "<changefreq>weekly</changefreq><priority>0.8</priority>"),
    url(`${SITE_URL}/catalogos`, "<changefreq>weekly</changefreq><priority>0.7</priority>"),
    ...categorias
      .filter((c) => c.categoria)
      .map((c) => url(`${SITE_URL}/loja?categoria=${encodeURIComponent(c.categoria!)}`, "<priority>0.8</priority>")),
    ...MONTADORAS.map((m) => url(`${SITE_URL}/loja?marca=${encodeURIComponent(m)}`, "<priority>0.8</priority>")),
    ...pecas.map((p) =>
      url(`${SITE_URL}/produto/${encodeURIComponent(p.sku)}`, `<lastmod>${p.updated_at.toISOString().slice(0, 10)}</lastmod>`),
    ),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${linhas.join("\n")}\n</urlset>\n`;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        if (!cache || Date.now() - cache.em > 60 * 60 * 1000) cache = { xml: await gerar(), em: Date.now() };
        return new Response(cache.xml, {
          headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
