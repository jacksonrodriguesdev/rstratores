const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
chromium.use(stealth);
const fs = require('fs');

async function start() {
  console.log("Iniciando análise profunda da Algolia da Pellegrino...");
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  let key = null;
  page.on('response', async (response) => {
    if (response.url().includes('/catalogo/aiskeygen')) {
      try {
        const str = await response.text();
        const body = JSON.parse(str.startsWith('{') ? str : JSON.parse(str));
        if (body.securedKey) key = body.securedKey;
      } catch(e) {}
    }
  });

  await page.goto('https://compreonline.pellegrino.com.br/Account/Login');
  await page.waitForTimeout(5000);
  
  const userInputs = await page.$$('input[type="text"], input[type="email"], input[name="UserName"], input[name="Email"]');
  if (userInputs.length > 0) await userInputs[0].fill('jacksonrodriguesdev@gmail.com');
  
  const passInputs = await page.$$('input[type="password"]');
  if (passInputs.length > 0) await passInputs[0].fill('bzhudi');
  
  const btns = await page.$$('button[type="submit"], input[type="submit"], button:has-text("Entrar"), button:has-text("Login")');
  if (btns.length > 0) await btns[0].click();
  
  console.log("Aguardando login e verificação humana... (Você tem 2 minutos para resolver)");
  await page.waitForTimeout(20000);
  
  try {
      await page.goto('https://compreonline.pellegrino.com.br/catalogo/ais', { waitUntil: 'load', timeout: 90000 });
      await page.waitForTimeout(5000);
  } catch(e) {
      console.log("O carregamento demorou muito, mas vamos tentar ver se pegamos a chave mesmo assim...");
  }

  if (!key) {
      console.log("Falha ao pegar key da Algolia.");
      await browser.close(); 
      return;
  }
  
  console.log("Chave obtida! Fazendo análise completa...");

  const algoliaUrl = `https://cgpod1sars-dsn.algolia.net/1/indexes/*/queries?x-algolia-agent=Algolia%20for%20JavaScript%20(5.46.2)&x-algolia-api-key=${key}&x-algolia-application-id=CGPOD1SARS`;
  
  const queryPayload = {
      "requests": [
          { 
            "indexName": "b2b_prod", 
            "params": 'query=&hitsPerPage=1&facets=["brand_name", "produto_ativo_br", "curva_abc_br"]' 
          }
      ]
  };

  const resStr = await page.evaluate(async ({url, payload}) => {
      const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      });
      return await res.text();
  }, { url: algoliaUrl, payload: queryPayload });

  const data = JSON.parse(resStr);
  const result = data.results[0];

  console.log("\n==============================================");
  console.log("📊 RELATÓRIO OFICIAL DA ALGOLIA (PELLEGRINO)");
  console.log("==============================================");
  console.log(`- TOTAL DE PRODUTOS INDEXADOS: ${result.nbHits.toLocaleString('pt-BR')}`);
  
  if (result.facets) {
      if (result.facets.produto_ativo_br) {
          console.log("\n- Status de Ativação:");
          console.table(result.facets.produto_ativo_br);
      }
      if (result.facets.brand_name) {
          const totalBrands = Object.keys(result.facets.brand_name).length;
          console.log(`\n- Total de Marcas Encontradas: ${totalBrands}`);
      }
      if (result.facets.curva_abc_br) {
          console.log("\n- Curva ABC (Giro de Estoque):");
          console.table(result.facets.curva_abc_br);
      }
  }

  console.log("==============================================\n");
  
  await browser.close();
}

start();
