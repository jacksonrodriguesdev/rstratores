const { chromium } = require("playwright-extra");
const stealth = require("puppeteer-extra-plugin-stealth")();
chromium.use(stealth);

async function run() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  let urls = [];

  page.on("response", async (res) => {
    urls.push(res.url());
  });

  console.log("Acessando Massey Ferguson PÁGINA 2");
  await page.goto("https://redeparts.com.br/produtos?machineBrand=massey-ferguson&page=2", {
    waitUntil: "networkidle",
    timeout: 45000,
  });

  await page.waitForTimeout(3000);
  const fs = require("fs");
  fs.writeFileSync("urls.txt", urls.join("\n"));
  console.log("Saved URLs");

  await browser.close();
}
run();
