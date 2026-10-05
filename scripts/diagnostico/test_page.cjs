const { chromium } = require("playwright");

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
  await page.goto("http://localhost:8080/");
  const content = await page.content();
  console.log("Body length:", content.length);
  console.log("Includes blocos?", content.includes("blocos"));
  await browser.close();
}
run();
