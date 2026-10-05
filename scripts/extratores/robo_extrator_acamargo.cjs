const fs = require("fs");
const cheerio = require("cheerio");

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const buffer = await response.arrayBuffer();
  const decoder = new TextDecoder("utf-8");
  return decoder.decode(buffer);
}

// Extrai o texto limpo de uma célula ou div baseado no rótulo
function extractByLabel($, labelRegex) {
  let result = "";
  $("*").each((i, el) => {
    const text = $(el).text().trim();
    if (labelRegex.test(text)) {
      // Geralmente o valor está na próxima célula (td) ou dentro do mesmo elemento após os dois pontos
      if ($(el).is("th") || $(el).is("td")) {
        const nextTd = $(el).next("td");
        if (nextTd.length) result = nextTd.text().trim();
      } else if ($(el).is("strong") || $(el).is("b") || $(el).is("span")) {
        const parentText = $(el).parent().text().trim();
        result = parentText
          .replace(labelRegex, "")
          .replace(/^[:\s]+/, "")
          .trim();
      }
    }
  });
  return result.replace(/[\r\n\t;"]/g, " ").trim();
}

async function start() {
  console.log("Iniciando Robô Extrator da A Camargo...");

  console.log("Buscando Mapa do Site...");
  const sitemapHtml = await fetchHtml("https://www.acamargo.com/sitemap.xml");
  const $index = cheerio.load(sitemapHtml, { xmlMode: true });

  let productSitemaps = [];
  $index("loc").each((i, el) => {
    const link = $index(el).text();
    if (link.includes("sitemap_produtos")) {
      productSitemaps.push(link);
    }
  });

  console.log(`Encontrados ${productSitemaps.length} sitemaps de produtos.`);

  const csvFile = "dados/acamargo.csv";
  fs.writeFileSync(
    csvFile,
    "SKU;TITULO;CATEGORIA;MARCA;CODIGO;REF;CONVERSAO;IMAGEM;DESCRICAO;FICHA_TECNICA;CATALOGO;LINHA\n",
    "utf8",
  );

  let globalCount = 0;

  for (const sitemapUrl of productSitemaps) {
    console.log(`\nLendo sitemap: ${sitemapUrl}`);
    try {
      const sitemap = await fetchHtml(sitemapUrl);
      const $ = cheerio.load(sitemap, { xmlMode: true });
      const urls = [];
      $("loc").each((i, el) => urls.push($(el).text()));

      console.log(`Encontrados ${urls.length} produtos neste sitemap.`);

      for (const url of urls) {
        globalCount++;
        try {
          console.log(`[${globalCount}] Extraindo: ${url}`);
          const html = await fetchHtml(url);
          const $p = cheerio.load(html);

          const titulo = (
            $p("h1").first().text() ||
            $p('meta[property="og:title"]').attr("content") ||
            ""
          )
            .trim()
            .replace(/[\r\n\t;"]/g, " ");
          if (!titulo) continue;

          let sku =
            $p('span[itemprop="sku"]').text().trim() ||
            url.split("-").pop().replace(".html", "") ||
            `ACAMARGO_${globalCount}`;

          let categoria = "A Camargo";
          const breadcrumbs = [];
          $p(".breadcrumb li, .brc a, .caminho a").each((_, el) =>
            breadcrumbs.push($p(el).text().trim()),
          );
          if (breadcrumbs.length >= 2) categoria = breadcrumbs[breadcrumbs.length - 2];
          categoria = categoria.replace(/[\r\n\t;"]/g, " ");

          // Extração dos campos solicitados
          const marca =
            extractByLabel($p, /^Marca/i) ||
            $p('span[itemprop="brand"]').text().trim() ||
            $p(".brandName").text().trim() ||
            "";
          const codigo = extractByLabel($p, /^C[óo]d(igo|\.)/i) || sku;
          const ref = extractByLabel($p, /^Ref(\.|er[eê]ncia)/i);
          const conversao = extractByLabel($p, /^Convers[ãa]o/i);

          let image =
            $p('meta[property="og:image"]').attr("content") || $p(".zoom img").attr("src") || "";
          if (!image) {
            $p("img").each((i, el) => {
              const src = $p(el).attr("src");
              if (!image && src && src.includes("catalog/product")) {
                image = src;
              }
            });
          }
          if (image.startsWith("//")) image = "https:" + image;

          const descricao = (
            $p("#descricao").text() ||
            $p(".product-description").text() ||
            $p('meta[property="og:description"]').attr("content") ||
            ""
          )
            .replace(/[\r\n\t;"]/g, " ")
            .substring(0, 1000)
            .trim();
          const fichaTecnica =
            extractByLabel($p, /^Ficha T[é]cnica/i) ||
            ($p("#caracteristicas").text() || "")
              .replace(/[\r\n\t;"]/g, " ")
              .substring(0, 500)
              .trim();
          const catalogo = extractByLabel($p, /^Cat[á]logo/i);

          const linha = `${sku};"${titulo}";"${categoria}";"${marca}";"${codigo}";"${ref}";"${conversao}";"${image}";"${descricao}";"${fichaTecnica}";"${catalogo}";"AGRICOLA"\n`;
          fs.appendFileSync(csvFile, linha, "utf8");

          // Pequena pausa para não derrubar o servidor deles
          await new Promise((r) => setTimeout(r, 200));
        } catch (e) {
          console.log(`  -> Erro ao acessar ${url}: ${e.message}`);
        }
      }
    } catch (e) {
      console.log(`Erro ao ler sitemap ${sitemapUrl}: ${e.message}`);
    }
  }

  console.log(`\nExtração Concluída! Produtos salvos em '${csvFile}'.`);
}

start();
