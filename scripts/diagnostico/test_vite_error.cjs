const { chromium } = require("playwright");

async function run() {
  try {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    page.on("console", (msg) => console.log("PAGE LOG:", msg.text()));
    page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));

    console.log("Navigating to http://localhost:8081/");
    await page.goto("http://localhost:8081/", { waitUntil: "domcontentloaded", timeout: 15000 });

    // Wait a bit for React to render and potentially crash
    await page.waitForTimeout(3000);

    const hasErrorOverlay = await page.evaluate(() => {
      return !!document.querySelector("vite-error-overlay");
    });

    if (hasErrorOverlay) {
      console.log("VITE ERROR OVERLAY DETECTED!");
      const errorText = await page.evaluate(() => {
        const overlay = document.querySelector("vite-error-overlay");
        return overlay ? overlay.shadowRoot.innerHTML : null;
      });
      console.log("ERROR HTML:", errorText.substring(0, 500));
    } else {
      console.log("No Vite error overlay detected.");
    }

    const rootHtml = await page.innerHTML("#root");
    console.log("Root HTML length:", rootHtml.length);

    await browser.close();
  } catch (e) {
    console.error("Script Error:", e);
  }
}
run();
