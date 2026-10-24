// Feeds de produtos para o Google Merchant Center: com eles as peças podem aparecer de graça na aba
// Shopping do Google. Um por país, cada um na língua e na moeda da sua versão do site:
//   /feeds/google-merchant.xml    → Uruguai (espanhol, $U, links /produto/...)
//   /feeds/google-merchant-br.xml → Sul do Brasil (português, R$, links /pt/produto/...)
// Só entram peças com preço e foto, e só quando "mostrar preços no site" está ligado (o Google
// confere se o preço do feed é o da página).
import { SITE_URL } from "./site";
import { fotoInvalida } from "./fotos";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const limpo = (s: string, max: number) => s.replace(/\s+/g, " ").trim().slice(0, max);
const urlImagem = (p: string) =>
  p.startsWith("http") ? p : `${SITE_URL}${p.startsWith("/") ? p : `/uploads/${p}`}`;

const cache: Record<string, { xml: string; itens: number; em: number }> = {};

export async function feedGoogle(
  pais: "UY" | "BR" = "UY",
): Promise<{ xml: string; itens: number }> {
  const c = cache[pais];
  if (c && Date.now() - c.em < 60 * 60 * 1000) return c;
  const br = pais === "BR";
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
      // Preço na moeda da versão: $U (Uruguai) ou R$ (Brasil); sem ele não há o que conferir
      const atual = br ? pr?.brl : pr?.uyu;
      const cheio = br ? pr?.deBrl : pr?.deUyu;
      if (!atual || !p.imagem_principal || fotoInvalida(p.imagem_principal)) continue;
      const sku = p.sku.trim();
      const titulo = limpo(br ? p.nome : p.nome_es || p.nome, 150);
      const desc = limpo(
        br
          ? `${titulo}. Peça agrícola${p.marca ? ` para ${p.marca}` : ""}, código ${p.codigo_fabricante || sku}. Envio para RS, SC e PR com nota fiscal.`
          : p.descricao_es ||
              `${titulo}. Repuesto agrícola${p.marca ? ` para ${p.marca}` : ""}. Envíos a todo Uruguay por DAC.`,
        5000,
      );
      const moeda = br ? "BRL" : "UYU";
      const preco = cheio && cheio > atual ? cheio : atual;
      const campos = [
        `<g:id>${esc(sku)}</g:id>`,
        `<g:title>${esc(titulo)}</g:title>`,
        `<g:description>${esc(desc)}</g:description>`,
        // utm: as visitas e os pedidos que vêm do Shopping aparecem separados no painel
        `<g:link>${SITE_URL}${br ? "/pt" : ""}/produto/${encodeURIComponent(sku)}?utm_source=google_shopping&amp;utm_medium=shopping&amp;utm_campaign=merchant_${br ? "br" : "uy"}</g:link>`,
        `<g:image_link>${esc(urlImagem(p.imagem_principal))}</g:image_link>`,
        `<g:condition>new</g:condition>`,
        // Sem estoque: pedido por encomenda (chega em uns dias)
        p.estoque > 0
          ? `<g:availability>in_stock</g:availability>`
          : `<g:availability>backorder</g:availability><g:availability_date>${disponivelEm}</g:availability_date>`,
        `<g:price>${preco.toFixed(2)} ${moeda}</g:price>`,
        ...(cheio && cheio > atual
          ? [`<g:sale_price>${atual.toFixed(2)} ${moeda}</g:sale_price>`]
          : []),
        ...(p.marca ? [`<g:brand>${esc(limpo(p.marca, 70))}</g:brand>`] : []),
        `<g:mpn>${esc(limpo(p.codigo_fabricante || sku, 70))}</g:mpn>`,
        ...(p.categoria
          ? [
              `<g:product_type>${esc(limpo(br ? p.categoria : categoriaEs(p.categoria), 750))}</g:product_type>`,
            ]
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
<title>${br ? "AGRO PARTS — Peças agrícolas" : "AGRO PARTS — Repuestos agrícolas"}</title>
<link>${SITE_URL}${br ? "/pt" : ""}</link>
<description>${br ? "Peças para tratores e colheitadeiras no RS, SC e PR" : "Repuestos para tractores y cosechadoras en Uruguay"}</description>
${itens.join("\n")}
</channel>
</rss>
`;
  cache[pais] = { xml, itens: itens.length, em: Date.now() };
  return cache[pais];
}
