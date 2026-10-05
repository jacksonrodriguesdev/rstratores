const { chromium } = require("playwright");

async function run() {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    console.log("Navigating to 8081...");
    const res = await page.goto("http://localhost:8081/", { timeout: 15000 });
    console.log("Status:", res.status());
    const content = await page.content();
    console.log("Body length:", content.length);
    await browser.close();
  } catch (e) {
    console.error("Script Error:", e);
  }
}
run();
