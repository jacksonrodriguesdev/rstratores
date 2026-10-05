const fs = require("fs");
const cheerio = require("cheerio");

async function fetchHtml(url) {
  const response = await fetch(url.replace("http://", "https://"), {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
  });
  const buffer = await response.arrayBuffer();
  const decoder = new TextDecoder("latin1");
  return decoder.decode(buffer);
}

async function start() {
  console.log("Iniciando Robô Extrator da Stockar...");

  // 1. Pegar o sitemap principal
  console.log("Buscando Mapa do Site...");
  const sitemapIndexHtml = await fetchHtml("https://www.stockcarpecas.com.br/sitemap.xml");
  const $index = cheerio.load(sitemapIndexHtml, { xmlMode: true });

  let sitemapUrls = [];
  $index("loc").each((i, el) => {
    sitemapUrls.push($index(el).text());
  });

  if (sitemapUrls.length === 0) {
    sitemapUrls = ["https://www.stockcarpecas.com.br/sitemap.xml"];
  }

  let productUrls = [];

  for (const sUrl of sitemapUrls) {
    if (!sUrl.includes("sitemap_")) continue;
    console.log(`Lendo sitemap interno: ${sUrl}`);
    try {
      const xml = await fetchHtml(sUrl);
      const $ = cheerio.load(xml, { xmlMode: true });
      $("loc").each((i, el) => {
        const link = $(el).text();
        if (!link.endsWith(".xml") && !link.includes("/c/")) {
          productUrls.push(link);
        }
      });
    } catch (e) {
      console.log(`Erro ao ler sitemap ${sUrl}: ${e.message}`);
    }
  }

  productUrls = [...new Set(productUrls)].filter((u) => u.includes(".com.br/") && u.length > 30);

  console.log(`Encontrados ${productUrls.length} links potenciais de produtos.`);
  console.log(
    "Iniciando extração (isso pode demorar). Pressione Ctrl+C para parar a qualquer momento.\n",
  );

  const results = [];
  const total = productUrls.length;
  fs.writeFileSync(
    "produtos_extraidos.csv",
    "SKU;NOME;CATEGORIA;MARCA;PRECO;IMAGEM;DESCRICAO;LINHA\n",
    "utf8",
  );

  for (let i = 0; i < total; i++) {
    const url = productUrls[i];
    try {
      console.log(`[${i + 1}/${total}] Extraindo: ${url}`);
      const html = await fetchHtml(url);
      const $ = cheerio.load(html);

      const nome = $("h1").first().text().trim().replace(/;/g, ",");
      if (!nome) continue;

      let image = $('meta[property="og:image"]').attr("content") || "";
      let price =
        $('meta[property="product:price:amount"]').attr("content") ||
        $("#preco_atual")
          .text()
          .replace(/[^\d,]/g, "")
          .replace(",", ".") ||
        "";
      let sku =
        $('meta[itemprop="sku"]').attr("content") ||
        $("#product_reference").text().trim() ||
        $("#variacao_preco").attr("data-product-sku") ||
        `AUTO_${i}`;
      let descricao = (
        $("#description").text().trim() || $('div[itemprop="description"]').text().trim()
      )
        .replace(/[\r\n\t;]/g, " ")
        .substring(0, 500);

      let categoria = "";
      const breadcrumbs = [];
      $(".breadcrumb li, .brc a").each((_, el) => breadcrumbs.push($(el).text().trim()));
      if (breadcrumbs.length >= 2) categoria = breadcrumbs[breadcrumbs.length - 2];

      const linha = `${sku};"${nome}";"${categoria}";"";${price};"${image}";"${descricao}";"AUTOMOTIVA"\n`;
      fs.appendFileSync("produtos_extraidos.csv", linha, "utf8");

      results.push({ sku, nome });

      await new Promise((r) => setTimeout(r, 200));
    } catch (e) {
      console.log(`  -> Erro ao acessar ${url}: ${e.message}`);
    }
  }

  console.log(
    `\nExtração Concluída! ${results.length} produtos salvos em 'produtos_extraidos.csv'.`,
  );
}

start();
