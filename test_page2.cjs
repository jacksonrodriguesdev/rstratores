const { chromium } = require("playwright");

async function run() {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
    page.on("pageerror", (err) => console.error("PAGE ERROR:", err));
    console.log("Navigating...");
    const res = await page.goto("http://localhost:8080/", { timeout: 15000 });
    console.log("Status:", res.status());
    const content = await page.content();
    console.log("Body length:", content.length);
    await browser.close();
  } catch (e) {
    console.error("Script Error:", e);
  }
}
run();
