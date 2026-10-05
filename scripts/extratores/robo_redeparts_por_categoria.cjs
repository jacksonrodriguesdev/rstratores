const { chromium } = require("playwright");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function capitalize(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).replace(/-/g, " ");
}

async function scrapeRedeparts() {
  console.log("🚜 Iniciando Extrator Redeparts (Por Categorias) 🚜");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("Descobrindo montadoras e categorias disponiveis...");
  await page.goto("https://redeparts.com.br/produtos", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await delay(5000);

  const filters = await page.evaluate(() => {
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

  // Se falhar, categorias basicas
  const categories =
    filters.categories.length > 0
      ? filters.categories
      : [
          "acessorios",
          "cabine",
          "eixo-dianteiro-4x2",
          "eixo-dianteiro-4x4",
          "eixo-traseiro",
          "eletrica",
          "embreagem",
          "ferramentas",
          "filtros",
          "freio",
          "hidraulico",
          "motor",
          "transmissao",
        ];

  console.log(`Encontradas ${machineBrands.length} montadoras e ${categories.length} categorias.`);

  let totalCorrigidos = 0;
  let totalNovos = 0;

  for (const mb of machineBrands) {
    for (const cat of categories) {
      const formattedCat = capitalize(cat);
      console.log(`\n========================================`);
      console.log(
        `🔍 Pesquisando: Montadora [${mb.toUpperCase()}] -> Categoria: [${formattedCat}]`,
      );
      console.log(`========================================`);

      let currentPage = 1;
      let hasMorePages = true;

      while (hasMorePages) {
        console.log(`\n>>> PÁGINA ${currentPage} (${mb} > ${cat}) <<<`);
        try {
          await page.goto(
            `https://redeparts.com.br/produtos?machineBrand=${mb}&category=${cat}&page=${currentPage}`,
            { waitUntil: "domcontentloaded", timeout: 60000 },
          );
          await delay(3500);
        } catch (e) {
          console.log(`Erro ao carregar a pagina ${currentPage}, tentando novamente...`);
          continue;
        }

        const productLinks = await page.evaluate(() => {
          const links = Array.from(document.querySelectorAll('a[href^="/pecas/"]'));
          return links.map((a) => a.href);
        });

        const uniqueLinks = [...new Set(productLinks)];

        if (uniqueLinks.length === 0) {
          console.log(`Nenhum produto nesta pagina. Fim da categoria ${cat}.`);
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

          if (existe) {
            if (!existe.categoria || existe.categoria === "Geral") {
              // Produto existe, mas esta como Geral. Consertar a categoria IMEDIATAMENTE sem abrir a pagina!
              await prisma.agricolas.update({
                where: { sku: skuUrl },
                data: { categoria: formattedCat },
              });
              console.log(
                `🛠️ Categoria corrigida rapidamente! SKU [${skuUrl}] mudou de Geral para ${formattedCat}`,
              );
              totalCorrigidos++;
            } else {
              // Ja existe e ja tem categoria certa, ignora.
            }
          } else {
            // Produto nao existe, precisa baixar os dados completos
            linksParaProcessar.push(link);
          }
        }

        if (linksParaProcessar.length === 0) {
          console.log(
            `Pagina ${currentPage} ja possui todos os itens processados/corrigidos. Avancando... 🚀`,
          );
          currentPage++;
          continue;
        }

        console.log(
          `Encontrados ${linksParaProcessar.length} produtos NOVOS. Extraindo dados profundos...`,
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
                    findByText("span", "Marca") || findByText("div", "Marca") || "Nao Informada";

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
                      : formattedCat; // fallback para a categoria da URL

                    const finalBrand =
                      productData.brand && productData.brand !== "REDEPARTS"
                        ? productData.brand
                        : "Nao Informada";
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
                      `✅ NOVO! [${productData.sku}] ${productData.title} (Cat: ${finalCategory})`,
                    );
                    totalNovos++;
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
  console.log("\n==============================================");
  console.log("🏁 EXTRAÇÃO CONCLUÍDA COM SUCESSO 🏁");
  console.log(`🔧 Produtos que eram "Geral" corrigidos: ${totalCorrigidos}`);
  console.log(`📦 Produtos novos baixados e inseridos: ${totalNovos}`);
  console.log("==============================================");
}

scrapeRedeparts();
