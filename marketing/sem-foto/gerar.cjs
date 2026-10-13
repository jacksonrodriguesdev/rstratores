// Gera public/img/sem-foto.jpg (500×500): logo da AGRO PARTS para peças ainda sem foto.
// A arte é marketing/sem-foto/logo-sem-foto.png (enviada pelo dono, fundo branco); aqui só vira
// JPEG leve, centralizada em 500×500 com fundo branco.
// Uso (raiz do projeto): node marketing/sem-foto/gerar.cjs
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const RAIZ = path.join(__dirname, "../..");
const arte = "data:image/png;base64," + fs.readFileSync(path.join(__dirname, "logo-sem-foto.png")).toString("base64");

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 500, height: 500 } });
  await p.setContent(`<html><body style="margin:0;width:500px;height:500px;background:#fff;display:flex;align-items:center;justify-content:center">
    <img src="${arte}" style="width:500px;height:500px;object-fit:contain"></body></html>`);
  await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(RAIZ, "public/img/sem-foto.jpg"), type: "jpeg", quality: 88 });
  await b.close();
  console.log("public/img/sem-foto.jpg");
})();
