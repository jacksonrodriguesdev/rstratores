const fs = require("fs");
const cheerio = require("cheerio");

async function fetchHtml(url) {
  const response = await fetch(url.replace("http://", "https://"), {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = await response.arrayBuffer();
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(buffer);
}

async function start() {
  console.log("Iniciando Robô Extrator da Auto Peças Dalmoro...");

  console.log("Buscando Mapa do Site...");
  const sitemapHtml = await fetchHtml("https://www.autopecasdalmoro.com.br/sitemap.xml");
  const $index = cheerio.load(sitemapHtml, { xmlMode: true });

  let productUrls = [];
  $index("loc").each((i, el) => {
    const link = $index(el).text();
    if (link.includes("/produto/")) {
      productUrls.push(link);
    }
  });

  console.log(`Encontrados ${productUrls.length} links potenciais de produtos.`);
  console.log("Iniciando extração. Pressione Ctrl+C para parar a qualquer momento.\n");

  const results = [];
  const total = productUrls.length;
  fs.writeFileSync(
    "dados/produtos_dalmoro.csv",
    "SKU;NOME;CATEGORIA;MARCA;PRECO;IMAGEM;DESCRICAO;LINHA\n",
    "utf8",
  );

  for (let i = 0; i < total; i++) {
    const url = productUrls[i];
    try {
      console.log(`[${i + 1}/${total}] Extraindo: ${url}`);
      const html = await fetchHtml(url);
      const $ = cheerio.load(html);

      const nome = ($('meta[property="og:title"]').attr("content") || $("h1").first().text())
        .trim()
        .replace(/;/g, ",");
      if (!nome) continue;

      let image = $('meta[property="og:image"]').attr("content") || "";

      // Tentativa genérica de pegar o preço no HTML
      let priceMatch =
        html.match(/price["':\s]+([\d.,]+)/i) || html.match(/preco_por["':\s]+([\d.,]+)/i);
      let price = "";
      if (priceMatch) {
        price = priceMatch[1].replace(/[^\d,]/g, "").replace(",", ".");
      } else {
        price = $('meta[property*="price:amount"]').attr("content") || "0";
      }

      // SKU da URL ou da página
      let sku = url.split("-").pop() || `DALMORO_${i}`;

      let descricao = ($('meta[property="og:description"]').attr("content") || "")
        .replace(/[\r\n\t;]/g, " ")
        .substring(0, 500);

      let categoria = "Peças Dalmoro";
      const breadcrumbs = [];
      $(".breadcrumb li, .brc a, .caminho a").each((_, el) =>
        breadcrumbs.push($(el).text().trim()),
      );
      if (breadcrumbs.length >= 2) categoria = breadcrumbs[breadcrumbs.length - 2];

      const linha = `${sku};"${nome}";"${categoria}";"";${price};"${image}";"${descricao}";"AUTOMOTIVA"\n`;
      fs.appendFileSync("dados/produtos_dalmoro.csv", linha, "utf8");

      results.push({ sku, nome });

      await new Promise((r) => setTimeout(r, 200));
    } catch (e) {
      console.log(`  -> Erro ao acessar ${url}: ${e.message}`);
    }
  }

  console.log(`\nExtração Concluída! ${results.length} produtos salvos em 'dados/produtos_dalmoro.csv'.`);
}

start();
