const { chromium } = require("playwright-extra");
const stealth = require("puppeteer-extra-plugin-stealth")();
chromium.use(stealth);
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const BRANDS = [
  "massey-ferguson",
  "valtra-valmet",
  "new-holland",
  "john-deere",
  "case-ih",
  "ford",
  "agrale",
  "fendt",
  "cbt",
];

async function run() {
  console.log("🚜 Iniciando Extrator Redeparts V3 (VIA API RAPIDA) 🚜");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let totalNovos = 0;
  let totalCorrigidos = 0;

  for (const mb of BRANDS) {
    console.log(`\n========================================`);
    console.log(`🔍 Pesquisando: Montadora [${mb.toUpperCase()}]`);
    console.log(`========================================`);

    // 1. Descobrir a URL dinamica do _serverFn
    let apiUrlBase = null;
    let urlInterceptada = false;

    page.on("response", async (res) => {
      const url = res.url();
      if (
        url.includes("_serverFn") &&
        url.includes("payload=") &&
        url.includes("machineBrand") &&
        !urlInterceptada
      ) {
        urlInterceptada = true;
        apiUrlBase = url.split("?payload=")[0];
        console.log("URL da API descoberta:", apiUrlBase);
      }
    });

    console.log(`>>> Acessando ${mb.toUpperCase()} (Pagina 1) para obter Token/Hash...`);
    try {
      await page.goto(`https://redeparts.com.br/produtos?machineBrand=${mb}&page=1`, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });
    } catch (e) {}

    // Esperar um pouco para a API ser chamada pelo site
    await page.waitForTimeout(5000);

    if (!apiUrlBase) {
      console.log("Nao foi possivel capturar a API. Pulando montadora...");
      continue;
    }

    let pageNum = 1;
    let hasMore = true;

    while (hasMore) {
      console.log(`\n>>> ${mb.toUpperCase()} - PÁGINA ${pageNum} <<<`);

      const payloadObj = {
        t: {
          t: 10,
          i: 0,
          p: {
            k: ["data"],
            v: [
              {
                t: 10,
                i: 1,
                p: {
                  k: [
                    "machineBrand",
                    "page",
                    "q",
                    "brand",
                    "category",
                    "machineModel",
                    "logSearch",
                  ],
                  v: [
                    { t: 1, s: mb },
                    { t: 0, s: pageNum },
                    { t: 1, s: "" },
                    { t: 1, s: "" },
                    { t: 1, s: "" },
                    { t: 1, s: "" },
                    { t: 2, s: 2 },
                  ],
                },
                o: 0,
              },
            ],
          },
          o: 0,
        },
        f: 63,
        m: [],
      };

      const payloadStr = encodeURIComponent(JSON.stringify(payloadObj));
      const apiUrl = `${apiUrlBase}?payload=${payloadStr}`;

      const resText = await page.evaluate(async (url) => {
        try {
          const res = await fetch(url);
          return await res.text();
        } catch (e) {
          return null;
        }
      }, apiUrl);

      if (!resText) {
        console.log("Erro ao buscar a API na pagina " + pageNum + ". Fim ou bloqueio.");
        break;
      }

      // Regex para encontrar os produtos no payload SuperJSON
      const regex =
        /\[\{"t":1,"s":"([^"]+)"\},\{"t":1,"s":"([^"]+)"\},\{"t":1,"s":"([^"]+)"\},\{"t":1,"s":"([^"]+)"\},\{"t":1,"s":"([^"]+)"\}/g;
      let match;
      const items = [];
      while ((match = regex.exec(resText)) !== null) {
        items.push({
          sku: match[1],
          slug: match[2],
          name: match[3],
          brand: match[4],
          category: match[5],
        });
      }

      if (items.length === 0) {
        console.log("Nenhum produto encontrado nesta pagina. Fim da montadora.");
        hasMore = false;
        break;
      }

      console.log(`Encontrados ${items.length} itens.`);

      for (const item of items) {
        // Verificar se existe
        const existe = await prisma.agricolas.findFirst({
          where: { codigo: item.sku },
        });

        if (existe) {
          if (existe.categoria === "Geral" && item.category && item.category !== "Geral") {
            await prisma.agricolas.update({
              where: { id: existe.id },
              data: { categoria: item.category },
            });
            totalCorrigidos++;
          }
        } else {
          // Criar novo produto
          await prisma.agricolas.create({
            data: {
              codigo: item.sku,
              descricao: item.name,
              marca_peca: item.brand,
              montadora: mb.toUpperCase(),
              categoria: item.category || "Geral",
              tipo_maquina: "TRATORES",
              link_imagem: `https://redeparts.com.br/assets/${item.slug}.webp`,
              link_produto: `https://redeparts.com.br/produtos/${item.slug}`,
            },
          });
          totalNovos++;
        }
      }

      pageNum++;
      await page.waitForTimeout(1000); // 1 segundo de pausa entre paginas
    }

    // Resetar listener para a proxima montadora (se necessário)
    page.removeAllListeners("response");
  }

  console.log(`\n==============================================`);
  console.log(`🏁 EXTRAÇÃO V3 CONCLUÍDA COM SUCESSO 🏁`);
  console.log(`🔧 Produtos que eram "Geral" corrigidos: ${totalCorrigidos}`);
  console.log(`📦 Produtos novos baixados e inseridos: ${totalNovos}`);
  console.log(`==============================================\n`);

  await browser.close();
  await prisma.$disconnect();
}

run().catch(console.error);
