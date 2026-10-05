const { chromium } = require("playwright");
const fs = require("fs");

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  console.log("Acessando Massey Ferguson");
  await page.goto("https://redeparts.com.br/produtos?machineBrand=massey-ferguson&page=1", {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await page.waitForTimeout(5000);

  const html = await page.content();
  fs.writeFileSync("dados/redeparts_debug.html", html);
  console.log("Saved to redeparts_debug.html");
  await browser.close();
}

run();
