// Capturas de tela do app para a janela de instalação (manifest "screenshots"), em es e pt.
// Uso: node scripts/gerar-capturas-app.cjs [https://agropartsuy.com]
const path = require("path");
const { chromium } = require(path.join(process.cwd(), "node_modules", "playwright"));
const SITE = process.argv[2] || "https://agropartsuy.com";
const pasta = path.join(__dirname, "..", "public", "img", "app");
const PAGINAS = [
  ["es-inicio", "/"],
  ["es-tienda", "/loja?linha=AGRICOLA&categoria=Engrenagens+e+Transmiss%C3%A3o"],
  ["pt-inicio", "/pt"],
  ["pt-loja", "/pt/loja?linha=AGRICOLA&categoria=Engrenagens+e+Transmiss%C3%A3o"],
];
(async () => {
  const b = await chromium.launch({ channel: "msedge" });
  const ctx = await b.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    // Navegador comum (o site não conta nem mostra o pop-up para robôs)
    userAgent:
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36",
  });
  // Equipe: não vira visita nem estatística
  // Equipe (não conta), sem a sugestão de idioma (a captura é tirada do Brasil) e sem barra do app
  await ctx.addInitScript(() => {
    localStorage.setItem("ap_equipe", "1");
    localStorage.setItem("idioma_sugestao_fechada", "1");
    localStorage.setItem("ap_app_fechou", String(Date.now()));
  });
  for (const [nome, url] of PAGINAS) {
    const p = await ctx.newPage();
    await p.goto(SITE + url, { waitUntil: "networkidle" });
    await p.waitForTimeout(1500);
    await p.screenshot({ path: path.join(pasta, `captura-${nome}.jpg`), type: "jpeg", quality: 80 });
    await p.close();
  }
  await b.close();
  console.log("capturas em public/img/app/");
})();
