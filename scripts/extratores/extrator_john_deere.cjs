const { chromium } = require("playwright-extra");
const stealth = require("puppeteer-extra-plugin-stealth")();
chromium.use(stealth);
const fs = require("fs");

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let todosProdutos = [];
  let pagina = 1;
  let continueExtraindo = true;

  console.log("Iniciando Extração de John Deere...");

  while (continueExtraindo) {
    console.log(`[John Deere] Acessando página ${pagina}...`);
    try {
      await page.goto(`https://redeparts.com.br/produtos?machineBrand=john-deere&page=${pagina}`, {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      await page.waitForTimeout(3000); 

      // Verifica quantos produtos apareceram na tela (A Redeparts usa o link /pecas/)
      const produtosNaTela = await page.evaluate(() => {
        return document.querySelectorAll('a[href^="/pecas/"]').length;
      });

      if (produtosNaTela === 0) {
        console.log(`Sem produtos na página ${pagina}. Encerrando.`);
        continueExtraindo = false;
        break;
      }

      console.log(`-> Encontrados ${produtosNaTela} produtos listados na página ${pagina}. Extraindo dados ocultos...`);

      // A Redeparts carrega a página já pronta do servidor, com todos os dados escondidos num script JSON.
      // Vamos capturar esse script inteiro que tem todos os metadados (preço exato, nome, código).
      const jsonData = await page.evaluate(() => {
        const script = document.getElementById('__TSR_DEHYDRATED__') || document.querySelector('script[id*="TSR"]');
        return script ? script.textContent : null;
      });

      if (jsonData) {
        todosProdutos.push({ pagina, data: jsonData });
      } else {
        console.log("   Aviso: JSON não encontrado nesta página.");
      }

      pagina++;

      // Trava de segurança (para não rodar infinito em caso de bug no site deles)
      if (pagina > 200) {
         console.log("Limite de segurança de 200 páginas atingido.");
         break;
      }

    } catch (err) {
      console.log(`Erro ao carregar a página ${pagina}: ${err.message}`);
      break;
    }
  }

  fs.writeFileSync("dados/john_deere_raw.json", JSON.stringify(todosProdutos, null, 2));
  console.log(`Extração finalizada! Os dados brutos foram salvos em 'dados/john_deere_raw.json'.`);
  
  await browser.close();
}

run();
