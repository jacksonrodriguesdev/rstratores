const { chromium } = require("playwright");

async function run() {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
    page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
    console.log("Navigating to home...");
    await page.goto("http://localhost:8081/", { waitUntil: "networkidle", timeout: 15000 });
    const url = page.url();
    console.log("Final URL:", url);
    const body = await page.innerHTML("body");
    console.log("Body HTML length:", body.length);
    await browser.close();
  } catch (e) {
    console.error("Script Error:", e);
  }
}
run();
