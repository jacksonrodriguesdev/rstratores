const { chromium } = require("playwright-extra");
const stealth = require("puppeteer-extra-plugin-stealth")();
chromium.use(stealth);
const fs = require("fs");

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const fileName = "dados/ford.csv";
  if (!fs.existsSync(fileName)) {
     fs.writeFileSync(fileName, "SKU;NOME;CATEGORIA;MARCA;PRECO;IMAGEM;LINK\n");
  }

  let pagina = 1;
  let continueExtraindo = true;

  console.log("Iniciando Extração de FORD (Salvamento em tempo real)...");

  while (continueExtraindo) {
    console.log(`[Ford] Acessando página ${pagina}...`);
    try {
      await page.goto(`https://redeparts.com.br/produtos?machineBrand=ford&page=${pagina}`, {
        waitUntil: "networkidle",
        timeout: 60000,
      });

      await page.waitForTimeout(3000); 

      const produtosNaTela = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('a[href^="/pecas/"]'));
        if (cards.length === 0) return [];
        
        return cards.map(c => {
          let textParts = c.innerText.split('\n').filter(t => t.trim() !== '');
          let nome = textParts.length > 0 ? textParts[0].trim() : "";
          
          let imgEl = c.querySelector('img');
          let img = imgEl ? imgEl.src : "";
          
          let precoMatch = c.innerText.match(/R\$\s?([\d\.,]+)/);
          let preco = precoMatch ? precoMatch[1] : "0,00";
          
          let sku = "";
          let idMatch = c.href.match(/-(\d+)$/);
          if (idMatch) sku = idMatch[1];
          else sku = "FRD_" + Math.random().toString(36).substr(2, 5); 
          
          return { sku, nome, img, preco, href: c.href };
        });
      });

      if (produtosNaTela.length === 0) {
        console.log(`Sem produtos na página ${pagina}. Encerrando.`);
        continueExtraindo = false;
        break;
      }

      console.log(`-> Extraídos ${produtosNaTela.length} produtos da página ${pagina}. Gravando...`);
      
      let chunk = "";
      for(let p of produtosNaTela) {
         let nomeSafe = p.nome.replace(/"/g, '""').replace(/;/g, ',');
         let precoSafe = p.preco.replace(/\./g, '').replace(/,/g, '.'); 
         chunk += `${p.sku};"${nomeSafe}";"Ford";"Ford";${precoSafe};"${p.img}";"${p.href}"\n`;
      }
      fs.appendFileSync(fileName, chunk);

      pagina++;

    } catch (err) {
      console.log(`Erro ao carregar a página ${pagina}: ${err.message}`);
      break;
    }
  }

  console.log(`Extração finalizada! Os produtos foram salvos em '${fileName}'.`);
  await browser.close();
}

run();
