// Banners de e-mail (1200×600) para as automações. Saída em JPG (leve para e-mail).
// Uso (raiz do projeto): node marketing/email_banners/gerar.mjs
// Foto do trator: Wikimedia Commons, CC BY 2.0 (crédito no canto, obrigatório pela licença).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const RAIZ = process.cwd();
const DIR = path.join(RAIZ, "marketing/email_banners");
const OUT = path.join(DIR, "saida");
const { chromium } = require(path.join(RAIZ, "node_modules/playwright"));
const LOGO = pathToFileURL(path.join(RAIZ, "public/logo.png")).href;
const FOTO = pathToFileURL(path.join(RAIZ, "marketing/transmision/fotos/massey-ferguson.jpg")).href;
const CREDITO = "Foto: David Wright · CC BY 2.0";

const BASE = `
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Archivo",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.b{position:relative;width:1200px;height:600px;overflow:hidden;color:#fff;background:#06321b}
.d{font-weight:900;font-stretch:68%;line-height:.88;letter-spacing:-1px}
.marca{display:flex;align-items:center;gap:14px}
.marca img{width:62px;height:62px;background:#fff;border-radius:16px;padding:5px}
.marca b{display:block;font-size:28px;font-weight:900;font-stretch:90%}
.marca span{display:block;font-size:12px;font-weight:800;letter-spacing:3.5px;color:#f2c94c}
.chip{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:8px 14px;font-size:16px;font-weight:700;white-space:nowrap}
.chip i{font-style:normal;font-size:18px}
.grao{position:absolute;inset:0;opacity:.07;background-image:radial-gradient(#fff 1px,transparent 1px);background-size:6px 6px}
</style>`;

const marca = `<div class="marca"><img src="${LOGO}"><div><b>AGRO PARTS</b><span>REPUESTOS AGRÍCOLAS</span></div></div>`;
const chips = `<div style="display:flex;flex-wrap:wrap;gap:10px;max-width:600px">
  <span class="chip"><i>📚</i> Catálogos de tractores</span>
  <span class="chip"><i>🚚</i> Envíos a todo Uruguay</span>
  <span class="chip"><i>💬</i> Cotizá por WhatsApp</span>
</div>`;

const banners = [
  // A: foto do trator à direita, recorte diagonal
  ["boas_vindas_foto", `<div class="b">
    <div style="position:absolute;right:0;top:0;width:640px;height:600px;clip-path:polygon(22% 0,100% 0,100% 100%,0 100%);background:url('${FOTO}') 58% 45%/cover"></div>
    <div style="position:absolute;right:0;top:0;width:640px;height:600px;clip-path:polygon(22% 0,100% 0,100% 100%,0 100%);background:linear-gradient(90deg,rgba(6,50,27,.55),rgba(6,50,27,0) 45%)"></div>
    <div style="position:absolute;left:520px;top:0;width:26px;height:600px;background:#f2c94c;transform:skewX(-14deg);transform-origin:top"></div>
    <div class="grao" style="right:auto;width:620px"></div>
    <div style="position:absolute;left:56px;top:48px">${marca}</div>
    <div style="position:absolute;left:56px;top:150px;width:470px">
      <div style="font-size:22px;font-weight:800;color:#f2c94c;letter-spacing:5px">TE DAMOS LA</div>
      <div class="d" style="font-size:104px;margin-top:8px">¡BIENVENIDA!</div>
      <div style="font-size:22px;font-weight:600;margin-top:16px;line-height:1.35;color:#d7eadc">Tu cuenta ya está activa: repuestos para tu tractor, con atención directa.</div>
    </div>
    <div style="position:absolute;left:56px;bottom:40px;width:300px">${chips}</div>
    <div style="position:absolute;right:14px;bottom:10px;font-size:11px;color:rgba(255,255,255,.8);text-shadow:0 1px 2px rgba(0,0,0,.6)">${CREDITO}</div>
  </div>`],
  // B: só gráfico (sem foto), engrenagens e faixa amarela
  ["boas_vindas_grafico", `<div class="b" style="background:radial-gradient(circle at 85% 30%,#0f6b37 0,#06321b 55%)">
    <div class="grao"></div>
    <svg style="position:absolute;right:-90px;top:-90px;opacity:.16" width="520" height="520" viewBox="0 0 100 100"><path fill="#f2c94c" d="M43 2h14l2 12 7 3 10-7 10 10-7 10 3 7 12 2v14l-12 2-3 7 7 10-10 10-10-7-7 3-2 12H43l-2-12-7-3-10 7-10-10 7-10-3-7-12-2V43l12-2 3-7-7-10 10-10 10 7 7-3zM50 32a18 18 0 1 0 0 36 18 18 0 1 0 0-36z"/></svg>
    <svg style="position:absolute;right:230px;bottom:-120px;opacity:.1" width="340" height="340" viewBox="0 0 100 100"><path fill="#fff" d="M43 2h14l2 12 7 3 10-7 10 10-7 10 3 7 12 2v14l-12 2-3 7 7 10-10 10-10-7-7 3-2 12H43l-2-12-7-3-10 7-10-10 7-10-3-7-12-2V43l12-2 3-7-7-10 10-10 10 7 7-3zM50 32a18 18 0 1 0 0 36 18 18 0 1 0 0-36z"/></svg>
    <div style="position:absolute;left:0;right:0;bottom:0;height:14px;background:repeating-linear-gradient(-45deg,#f2c94c 0 22px,#06321b 22px 44px)"></div>
    <div style="position:absolute;left:64px;top:52px">${marca}</div>
    <div style="position:absolute;left:64px;top:150px">
      <div class="d" style="font-size:150px">¡BIENVENIDO</div>
      <div class="d" style="font-size:150px;color:#f2c94c">A BORDO!</div>
      <div style="font-size:24px;font-weight:700;margin-top:18px;color:#d7eadc">Miles de repuestos y <span style="color:#f2c94c">todos los catálogos</span> de tractores, en un solo lugar.</div>
    </div>
    <div style="position:absolute;left:64px;bottom:44px">${chips.replace("max-width:600px", "max-width:1100px")}</div>
  </div>`],
];

const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1200, height: 600 } });
fs.mkdirSync(OUT, { recursive: true });
const tmp = path.join(OUT, "_tmp.html");
for (const [nome, html] of banners) {
  fs.writeFileSync(tmp, `<!doctype html><meta charset="utf-8">${BASE}<body>${html}</body>`);
  await pg.goto(pathToFileURL(tmp).href, { waitUntil: "networkidle" });
  await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: path.join(OUT, `${nome}.jpg`), type: "jpeg", quality: 86 });
}
fs.rmSync(tmp, { force: true });
await b.close();
console.log("ok");
