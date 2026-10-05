const { chromium } = require("playwright");

async function run() {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    console.log("Navigating to loja on 8081...");
    await page.goto("http://localhost:8081/loja?search=&page=1&linha=AGRICOLA&categoria=Freios", {
      waitUntil: "networkidle",
      timeout: 30000,
    });
    const content = await page.content();
    console.log("Includes Nenhum produto?", content.includes("Nenhum produto"));
    console.log("Includes Skeleton?", content.includes("animate-pulse"));
    console.log("Includes Loader?", content.includes("animate-spin"));
    await browser.close();
  } catch (e) {
    console.error("Script Error:", e);
  }
}
run();
