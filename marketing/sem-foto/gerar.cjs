// Gera public/img/sem-foto.jpg (500×500): logo da AGRO PARTS para peças ainda sem foto.
// Uso (raiz do projeto): node marketing/sem-foto/gerar.cjs
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const RAIZ = path.join(__dirname, "../..");
const logo = "data:image/png;base64," + fs.readFileSync(path.join(RAIZ, "public/logo.png")).toString("base64");

const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@500;800&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;width:500px;height:500px}
  body{display:flex;flex-direction:column;align-items:center;justify-content:center;
    background:#ffffff;
    font-family:"Plus Jakarta Sans",system-ui,sans-serif}
  img{width:200px;height:200px;object-fit:contain}
  .marca{margin-top:22px;font-size:40px;font-weight:800;letter-spacing:.5px;color:#0b7a3b}
  .sub{margin-top:2px;font-size:15px;font-weight:800;letter-spacing:5px;color:#d9a300}
</style></head><body>
  <img src="${logo}" alt="">
  <div class="marca">AGRO PARTS</div>
  <div class="sub">REPUESTOS AGRÍCOLAS</div>
</body></html>`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 500, height: 500 } });
  await p.setContent(html, { waitUntil: "networkidle" });
  await p.waitForTimeout(500);
  fs.mkdirSync(path.join(RAIZ, "public/img"), { recursive: true });
  await p.screenshot({ path: path.join(RAIZ, "public/img/sem-foto.jpg"), type: "jpeg", quality: 86 });
  await b.close();
  console.log("public/img/sem-foto.jpg");
})();
