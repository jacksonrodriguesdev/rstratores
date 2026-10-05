const { chromium } = require("playwright-extra");
const stealth = require("puppeteer-extra-plugin-stealth")();
chromium.use(stealth);
const fs = require("fs");

async function start() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let key = null;
  page.on("response", async (response) => {
    if (response.url().includes("/catalogo/aiskeygen")) {
      try {
        const str = await response.text();
        const body = JSON.parse(str.startsWith("{") ? str : JSON.parse(str));
        if (body.securedKey) key = body.securedKey;
      } catch (e) {}
    }
  });

  await page.goto("https://compreonline.pellegrino.com.br/Account/Login");
  await page.waitForTimeout(5000);

  const userInputs = await page.$$(
    'input[type="text"], input[type="email"], input[name="UserName"], input[name="Email"]',
  );
  if (userInputs.length > 0) await userInputs[0].fill("jacksonrodriguesdev@gmail.com");

  const passInputs = await page.$$('input[type="password"]');
  if (passInputs.length > 0) await passInputs[0].fill("bzhudi");

  const btns = await page.$$(
    'button[type="submit"], input[type="submit"], button:has-text("Entrar"), button:has-text("Login")',
  );
  if (btns.length > 0) await btns[0].click();

  await page.waitForTimeout(5000);
  await page.goto("https://compreonline.pellegrino.com.br/catalogo/ais", {
    waitUntil: "networkidle",
  });
  await page.waitForTimeout(5000);

  if (!key) {
    console.log("Falha ao pegar key.");
    await browser.close();
    return;
  }

  const algoliaUrl = `https://cgpod1sars-dsn.algolia.net/1/indexes/*/queries?x-algolia-agent=Algolia%20for%20JavaScript%20(5.46.2)&x-algolia-api-key=${key}&x-algolia-application-id=CGPOD1SARS`;

  const queryPayload = {
    requests: [{ indexName: "b2b_prod", params: "query=&hitsPerPage=1" }],
  };

  const algoliaResStr = await page.evaluate(
    async ({ url, payload }) => {
      const res = await fetch(url, { method: "POST", body: JSON.stringify(payload) });
      return await res.text();
    },
    { url: algoliaUrl, payload: queryPayload },
  );

  fs.writeFileSync(
    "dados/algolia_full_item.json",
    JSON.stringify(JSON.parse(algoliaResStr).results[0].hits[0], null, 2),
  );
  console.log("Salvo em algolia_full_item.json");
  await browser.close();
}

start().catch(console.error);
