const { chromium } = require("playwright-extra");
const stealth = require("puppeteer-extra-plugin-stealth")();
chromium.use(stealth);
const fs = require("fs");

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  let calls = [];

  page.on("response", async (res) => {
    const url = res.url();
    if (url.includes("_serverFn")) {
      try {
        const text = await res.text();
        calls.push({ url, text });
      } catch (e) {}
    }
  });

  console.log("Acessando Massey Ferguson GERAL");
  await page.goto("https://redeparts.com.br/produtos?machineBrand=massey-ferguson&page=1", {
    waitUntil: "networkidle",
    timeout: 60000,
  });

  await page.waitForTimeout(5000);

  fs.writeFileSync("redeparts_api_dump2.json", JSON.stringify(calls, null, 2));
  console.log("Dumped " + calls.length + " API calls to redeparts_api_dump2.json");

  await browser.close();
}

run();
