const { chromium } = require("playwright-extra");
const stealth = require("puppeteer-extra-plugin-stealth")();
chromium.use(stealth);

async function run() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  let captured = null;

  page.on("response", async (res) => {
    const url = res.url();
    if (url.includes("_serverFn") && url.includes("payload=")) {
      try {
        const text = await res.text();
        if (text.includes("machineBrand") || text.includes("engrenagem")) {
          console.log("Captured _serverFn!");
          captured = text;
        }
      } catch (e) {}
    }
  });

  console.log("Acessando Massey Ferguson > Motor");
  await page.goto(
    "https://redeparts.com.br/produtos?machineBrand=massey-ferguson&category=motor&page=1",
    { waitUntil: "networkidle", timeout: 60000 },
  );

  await page.waitForTimeout(5000);

  if (captured) {
    const fs = require("fs");
    fs.writeFileSync("redeparts_api_dump.json", captured);
    console.log("Dumped API to redeparts_api_dump.json");
  } else {
    console.log("Did not capture API response.");
  }

  await browser.close();
}

run();
