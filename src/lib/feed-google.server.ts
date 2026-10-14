// Feed de produtos para o Google Merchant Center (/feeds/google-merchant.xml): com ele as peças
// podem aparecer de graça na aba Shopping do Google. Só entram peças com preço e foto, e só
// quando "mostrar preços no site" está ligado (o Google confere se o preço do feed é o da página).
import { SITE_URL } from "./site";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const limpo = (s: string, max: number) => s.replace(/\s+/g, " ").trim().slice(0, max);
const urlImagem = (p: string) =>
  p.startsWith("http") ? p : `${SITE_URL}${p.startsWith("/") ? p : `/uploads/${p}`}`;

let cache: { xml: string; itens: number; em: number } | null = null;

export async function feedGoogle(): Promise<{ xml: string; itens: number }> {
  if (cache && Date.now() - cache.em < 60 * 60 * 1000) return cache;
  const { prisma } = await import("./prisma");
  const { configPrecos } = await import("./precos.server");
  const { precoVenda } = await import("./precos");
  const { categoriaEs } = await import("./pecas-es");
  const cfg = await configPrecos();
  const itens: string[] = [];
  if (cfg.mostrar) {
    const rows = await prisma.agricolas.findMany({
      where: {
        duplicado_de: null,
        category_id: { not: null },
        imagem_principal: { not: null },
        OR: [{ preco_brl: { gt: 0 } }, { preco_uyu: { gt: 0 } }],
      },
      select: {
        sku: true,
        nome: true,
        nome_es: true,
        descricao_es: true,
        marca: true,
        codigo_fabricante: true,
        fabricante: true,
        estoque: true,
        imagem_principal: true,
        categoria: true,
        preco_brl: true,
        preco_modo: true,
        preco_uyu: true,
        valor_promocional: true,
      },
    });
    const disponivelEm = new Date(Date.now() + 10 * 86400_000).toISOString().slice(0, 10);
    for (const p of rows) {
      const pr = precoVenda(p, cfg);
      // O site mostra o preço em $U: sem cotação não há preço para conferir
      if (!pr?.uyu || !p.imagem_principal || p.imagem_principal.includes("redeparts")) continue;
      const sku = p.sku.trim();
      const titulo = limpo(p.nome_es || p.nome, 150);
      const desc = limpo(
        p.descricao_es ||
          `${titulo}. Repuesto agrícola${p.marca ? ` para ${p.marca}` : ""}. Envíos a todo Uruguay por DAC.`,
        5000,
      );
      const preco = pr.deUyu && pr.deUyu > pr.uyu ? pr.deUyu : pr.uyu;
      const campos = [
        `<g:id>${esc(sku)}</g:id>`,
        `<g:title>${esc(titulo)}</g:title>`,
        `<g:description>${esc(desc)}</g:description>`,
        `<g:link>${SITE_URL}/produto/${encodeURIComponent(sku)}</g:link>`,
        `<g:image_link>${esc(urlImagem(p.imagem_principal))}</g:image_link>`,
        `<g:condition>new</g:condition>`,
        // Sem estoque: pedido por encomenda (chega em uns dias)
        p.estoque > 0
          ? `<g:availability>in_stock</g:availability>`
          : `<g:availability>backorder</g:availability><g:availability_date>${disponivelEm}</g:availability_date>`,
        `<g:price>${preco.toFixed(2)} UYU</g:price>`,
        ...(pr.deUyu && pr.deUyu > pr.uyu
          ? [`<g:sale_price>${pr.uyu.toFixed(2)} UYU</g:sale_price>`]
          : []),
        ...(p.marca ? [`<g:brand>${esc(limpo(p.marca, 70))}</g:brand>`] : []),
        `<g:mpn>${esc(limpo(p.codigo_fabricante || sku, 70))}</g:mpn>`,
        ...(p.categoria
          ? [`<g:product_type>${esc(limpo(categoriaEs(p.categoria), 750))}</g:product_type>`]
          : []),
        // Peças e acessórios de veículos (taxonomia do Google)
        `<g:google_product_category>5613</g:google_product_category>`,
      ];
      itens.push(`<item>${campos.join("")}</item>`);
    }
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
<title>AGRO PARTS — Repuestos agrícolas</title>
<link>${SITE_URL}</link>
<description>Repuestos para tractores y cosechadoras en Uruguay</description>
${itens.join("\n")}
</channel>
</rss>
`;
  cache = { xml, itens: itens.length, em: Date.now() };
  return cache;
}
