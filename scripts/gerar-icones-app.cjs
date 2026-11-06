// Gera os ícones do app (PWA) a partir de public/icon-512.png:
//   icon-maskable-512.png / -192: logo com margem e fundo branco (o Android corta em círculo/gota)
//   badge-96.png: silhueta branca (ícone pequeno da barra de notificações do Android)
// Uso: node scripts/gerar-icones-app.cjs
const path = require("path");
const fs = require("fs");
const { chromium } = require(path.join(process.cwd(), "node_modules", "playwright"));
const pub = path.join(__dirname, "..", "public");
(async () => {
  const b = await chromium.launch({ channel: "msedge" });
  const p = await b.newPage();
  const logo = "data:image/png;base64," + fs.readFileSync(path.join(pub, "icon-512.png")).toString("base64");
  await p.setContent("<canvas></canvas>");
  const r = await p.evaluate(async (logo) => {
    const img = new Image();
    img.src = logo;
    await img.decode();
    const maskable = (n) => {
      const c = document.createElement("canvas");
      c.width = c.height = n;
      const g = c.getContext("2d");
      g.fillStyle = "#ffffff";
      g.fillRect(0, 0, n, n);
      const s = n * 0.72; // zona segura: círculo de 80% do lado
      g.drawImage(img, (n - s) / 2, (n - s) / 2, s, s);
      return c.toDataURL("image/png");
    };
    const badge = () => {
      const n = 96;
      const c = document.createElement("canvas");
      c.width = c.height = n;
      const g = c.getContext("2d");
      g.drawImage(img, 4, 4, n - 8, n - 8);
      const d = g.getImageData(0, 0, n, n);
      for (let i = 0; i < d.data.length; i += 4) {
        const [r, gr, bl, a] = d.data.slice(i, i + 4);
        const branco = r > 235 && gr > 235 && bl > 235;
        d.data[i] = d.data[i + 1] = d.data[i + 2] = 255;
        d.data[i + 3] = branco ? 0 : a;
      }
      g.putImageData(d, 0, 0);
      return c.toDataURL("image/png");
    };
    return { m512: maskable(512), m192: maskable(192), badge: badge() };
  }, logo);
  const salvar = (nome, url) => fs.writeFileSync(path.join(pub, nome), Buffer.from(url.split(",")[1], "base64"));
  salvar("icon-maskable-512.png", r.m512);
  salvar("icon-maskable-192.png", r.m192);
  salvar("badge-96.png", r.badge);
  await b.close();
  console.log("ícones gerados em public/");
})();
