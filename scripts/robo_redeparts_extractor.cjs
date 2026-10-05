const { chromium } = require("playwright");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrapeRedeparts() {
  console.log("🚜 Iniciando Extrator Redeparts (Sem limites) 🚜");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("Descobrindo marcas de máquinas e categorias...");
  await page.goto("https://redeparts.com.br/produtos", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await delay(5000); // Wait for hydration and facets

  const filters = await page.evaluate(() => {
    // Encontrar todos os links de filtros
    const links = Array.from(
      document.querySelectorAll('a[href*="machineBrand="], a[href*="category="]'),
    );
    const machineBrands = new Set();
    const categories = new Set();

    links.forEach((a) => {
      try {
        const url = new URL(a.href);
        const mb = url.searchParams.get("machineBrand");
        const cat = url.searchParams.get("category");
        if (mb) machineBrands.add(mb);
        if (cat) categories.add(cat);
      } catch (e) {}
    });

    return {
      machineBrands: Array.from(machineBrands),
      categories: Array.from(categories),
    };
  });

  // Se o fallback por DOM falhar, usamos hardcoded baseados nas buscas anteriores
  const machineBrands =
    filters.machineBrands.length > 0
      ? filters.machineBrands
      : [
          "massey-ferguson",
          "valtra-valmet",
          "new-holland",
          "john-deere",
          "case-ih",
          "ford",
          "agrale",
          "cbt",
        ];
  const brands = [
    "GERAL",
    "MWM",
    "ZF",
    "IMP",
    "AGEL",
    "EATON",
    "USINIL",
    "VV",
    "KOYO",
    "FBM",
    "DANFOSS",
    "REXROTH",
    "BOSCH",
    "LUK",
    "SACHS",
    "NSK",
    "FAG",
    "SKF",
    "TIMKEN",
    "SABO",
    "ARCA",
    "CORTECO",
    "BGL",
    "INA",
    "GATES",
    "DAYCO",
    "TECFIL",
    "MANN",
    "CARRARO",
    "DANA",
    "CNH",
    "AGCO",
    "JOHN DEERE",
  ];

  console.log(`Encontradas ${machineBrands.length} montadoras e ${brands.length} marcas de peças.`);
  console.log("Iniciando varredura matriz (Montadora x Marca da Peça)...");

  for (const mb of machineBrands) {
    for (const brand of brands) {
      console.log(`\n========================================`);
      console.log(`🔍 Pesquisando: [${mb.toUpperCase()}] -> Marca da Peça: "${brand}"`);
      console.log(`========================================`);

      let currentPage = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        console.log(`\n>>> ACESSANDO PÁGINA ${currentPage} (${mb} > marca: ${brand}) <<<`);
        try {
          await page.goto(
            `https://redeparts.com.br/produtos?machineBrand=${mb}&brand=${brand}&page=${currentPage}`,
            { waitUntil: "domcontentloaded", timeout: 60000 },
          );
          await delay(3500); // Aguarda carregar os produtos
        } catch (e) {
          console.log(`Erro ao carregar a página ${currentPage}, tentando novamente...`);
          continue;
        }

        const productLinks = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a[href^="/pecas/"]'));
          return links.map((a) => a.href);
        });

        const uniqueLinks = [...new Set(productLinks)];

        if (uniqueLinks.length === 0) {
          console.log(`Nenhum produto nesta página. Fim da marca '${brand}'.`);
          hasMorePages = false;
          break;
        }

        const linksParaProcessar = [];
        for (const link of uniqueLinks) {
          const slug = link.split("/pecas/")[1];
          if (!slug) continue;
          const skuUrl = slug.split("-")[0];

          const existe = await prisma.agricolas.findUnique({
            where: { sku: skuUrl },
            select: { sku: true, categoria: true },
          });
          // Só baixa se não existir ou se a categoria for null/Geral (caso tenha sido extraído quebrado antes)
          if (!existe || existe.categoria === null) {
            linksParaProcessar.push(link);
          }
        }

        if (linksParaProcessar.length === 0) {
          console.log(`Página ${currentPage} já foi 100% processada. Pulando para a próxima... 🚀`);
          currentPage++;
          continue;
        }

        console.log(
          `Encontrados ${linksParaProcessar.length} produtos novos. Iniciando extração...`,
        );

        const CONCURRENCY = 8;
        for (let i = 0; i < linksParaProcessar.length; i += CONCURRENCY) {
          const batch = linksParaProcessar.slice(i, i + CONCURRENCY);

          await Promise.all(
            batch.map(async (link) => {
              const newPage = await context.newPage();
              try {
                await newPage.goto(link, { waitUntil: "domcontentloaded", timeout: 15000 });
                await delay(1000);

                const productData = await newPage.evaluate(() => {
                  const getText = (selector) => {
                    const el = document.querySelector(selector);
                    return el ? el.innerText.trim() : null;
                  };
                  const findByText = (tag, text) => {
                    const el = Array.from(document.querySelectorAll(tag)).find(
                      (el) => el.textContent.trim() === text,
                    );
                    return el ? el.nextElementSibling?.innerText.trim() || null : null;
                  };
                  const title = getText("h1");
                  const urlParts = window.location.pathname.split("/");
                  const slug = urlParts[urlParts.length - 1];
                  const sku = slug.split("-")[0] || `REDE-${Date.now()}`;
                  const brand =
                    findByText("span", "Marca") || findByText("div", "Marca") || "Não Informada";

                  const bread =
                    document.querySelector(".bread") ||
                    document.querySelector(".breadcrumb") ||
                    document.querySelector(".breadcrumbs");
                  let mainCategory = null;
                  let subCategory = null;
                  if (bread && bread.innerText) {
                    const parts = bread.innerText.split("/").map((p) => p.trim());
                    if (parts.length >= 3) mainCategory = parts[2];
                    if (parts.length >= 4) subCategory = parts[3];
                  }

                  const description =
                    getText('.descricao, [data-test="description"], .prose') || "";
                  const imgEl =
                    document.querySelector('img[alt="' + title + '"]') ||
                    document.querySelector("img");
                  const image = imgEl ? imgEl.src : null;

                  return { sku, title, brand, mainCategory, subCategory, description, image };
                });

                if (productData && productData.title) {
                  try {
                    const finalCategory = productData.mainCategory
                      ? productData.subCategory
                        ? `${productData.mainCategory} - ${productData.subCategory}`
                        : productData.mainCategory
                      : "Geral";
                    const finalBrand =
                      productData.brand && productData.brand !== "REDEPARTS"
                        ? productData.brand
                        : "Não Informada";
                    const dataToSave = {
                      sku: productData.sku,
                      nome: productData.title,
                      marca: finalBrand,
                      categoria: finalCategory,
                      descricao: productData.description,
                      imagem_principal: productData.image,
                      estoque: 10,
                    };
                    await prisma.agricolas.upsert({
                      where: { sku: productData.sku },
                      update: {
                        categoria: finalCategory,
                        marca: finalBrand,
                      },
                      create: dataToSave,
                    });
                    console.log(
                      `✅ [${productData.sku}] ${productData.title} (Cat: ${finalCategory})`,
                    );
                  } catch (e) {
                    console.log(`Erro ao salvar SKU ${productData.sku}: ${e.message}`);
                  }
                }
              } catch (err) {
                console.log(`Erro ao carregar aba de ${link}: ${err.message}`);
              } finally {
                await newPage.close();
              }
            }),
          );
        }

        currentPage++;
      }
    }
  }

  await browser.close();
  await prisma.$disconnect();
  console.log("Extração Total concluída!");
}

scrapeRedeparts();
