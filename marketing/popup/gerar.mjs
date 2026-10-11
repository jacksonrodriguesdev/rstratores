// Imagem do pop-up "Entrá y ganá" (lado esquerdo do modal no computador, topo no celular).
// O selo do desconto (15%) é desenhado pelo próprio modal, para acompanhar o valor do admin.
// Uso (raiz do projeto): node marketing/popup/gerar.mjs  →  public/img/popup-acceso.jpg (720×1040)
// Foto do trator: Wikimedia Commons, David Wright, CC BY 2.0 (crédito no canto, obrigatório).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const RAIZ = process.cwd();
const { chromium } = require(path.join(RAIZ, "node_modules/playwright"));
const FOTO = pathToFileURL(path.join(RAIZ, "marketing/transmision/fotos/massey-ferguson.jpg")).href;
const LOGO = pathToFileURL(path.join(RAIZ, "public/logo.png")).href;
const OUT = path.join(RAIZ, "public/img/popup-acceso.jpg");

const capa = (marca, cor, rot, x, y, z) => `
  <div style="position:absolute;left:${x}px;top:${y}px;width:200px;height:260px;border-radius:16px;background:#fff;transform:rotate(${rot}deg);box-shadow:0 24px 50px rgba(0,0,0,.45);overflow:hidden;z-index:${z}">
    <div style="height:92px;background:${cor};display:flex;align-items:flex-end;padding:14px 16px">
      <span style="font-weight:900;font-stretch:75%;font-size:28px;line-height:.9;color:#fff;letter-spacing:-.5px">${marca}</span>
    </div>
    <div style="padding:14px 16px">
      <div style="font-size:12px;font-weight:800;letter-spacing:2px;color:#71717a">CATÁLOGO</div>
      <div style="margin-top:10px;height:8px;width:85%;background:#e4e4e7;border-radius:4px"></div>
      <div style="margin-top:8px;height:8px;width:65%;background:#e4e4e7;border-radius:4px"></div>
      <div style="margin-top:8px;height:8px;width:75%;background:#e4e4e7;border-radius:4px"></div>
      <div style="margin-top:16px;display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
        ${Array.from({ length: 6 }, () => `<div style="height:26px;border-radius:5px;background:#f4f4f5;border:1px solid #e4e4e7"></div>`).join("")}
      </div>
    </div>
  </div>`;

const html = `<!doctype html><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Archivo,sans-serif;-webkit-font-smoothing:antialiased}</style>
<body>
<div style="position:relative;width:720px;height:1040px;overflow:hidden;background:radial-gradient(circle at 30% 20%,#11804a 0,#06321b 60%,#041f11 100%)">
  <div style="position:absolute;inset:0;opacity:.08;background-image:radial-gradient(#fff 1.2px,transparent 1.2px);background-size:12px 12px"></div>
  <!-- trator embaixo, em duotom verde -->
  <div style="position:absolute;left:0;right:0;bottom:0;height:560px;background:url('${FOTO}') 46% 60%/cover;filter:grayscale(1) contrast(1.15)"></div>
  <div style="position:absolute;left:0;right:0;bottom:0;height:560px;background:#0b7a3b;mix-blend-mode:multiply;opacity:.85"></div>
  <div style="position:absolute;left:0;right:0;bottom:0;height:560px;background:linear-gradient(180deg,#06321b 0%,rgba(6,50,27,.2) 45%,rgba(4,31,17,.85) 100%)"></div>
  <!-- engrenagem -->
  <svg style="position:absolute;right:-120px;top:-110px;opacity:.14" width="460" height="460" viewBox="0 0 100 100"><path fill="#f2c94c" d="M43 2h14l2 12 7 3 10-7 10 10-7 10 3 7 12 2v14l-12 2-3 7 7 10-10 10-10-7-7 3-2 12H43l-2-12-7-3-10 7-10-10 7-10-3-7-12-2V43l12-2 3-7-7-10 10-10 10 7 7-3zM50 32a18 18 0 1 0 0 36 18 18 0 1 0 0-36z"/></svg>
  <!-- logo -->
  <div style="position:absolute;left:48px;top:44px;display:flex;align-items:center;gap:14px">
    <img src="${LOGO}" style="width:64px;height:64px;background:#fff;border-radius:16px;padding:5px">
    <div><div style="font-size:28px;font-weight:900;color:#fff;font-stretch:90%">AGRO PARTS</div><div style="font-size:12px;font-weight:800;letter-spacing:3.5px;color:#f2c94c">REPUESTOS AGRÍCOLAS</div></div>
  </div>
  <!-- catálogos em leque -->
  ${capa("JOHN<br>DEERE", "#367c2b", -14, 70, 190, 1)}
  ${capa("MASSEY<br>FERGUSON", "#c8102e", -3, 220, 165, 2)}
  ${capa("NEW<br>HOLLAND", "#1f4e9c", 9, 370, 195, 3)}
  ${capa("VALTRA", "#d7262d", 20, 500, 255, 2)}
  <!-- chamada -->
  <div style="position:absolute;left:48px;bottom:90px;color:#fff;z-index:4">
    <div style="font-size:22px;font-weight:800;letter-spacing:5px;color:#f2c94c">GRATIS CON TU CUENTA</div>
    <div style="font-size:62px;font-weight:900;font-stretch:68%;line-height:.92;margin-top:8px">TODOS LOS<br>CATÁLOGOS DE<br>TRACTORES</div>
  </div>
  <div style="position:absolute;right:14px;bottom:10px;font-size:13px;color:rgba(255,255,255,.75)">Foto: David Wright · CC BY 2.0</div>
</div>
</body>`;

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 720, height: 1040 } });
const tmp = path.join(RAIZ, "marketing/popup/_tmp.html");
fs.writeFileSync(tmp, html);
await p.goto(pathToFileURL(tmp).href, { waitUntil: "networkidle" });
await p.evaluate(() => document.fonts.ready);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
await p.screenshot({ path: OUT, type: "jpeg", quality: 82 });
fs.rmSync(tmp);
await b.close();
console.log("ok", OUT, Math.round(fs.statSync(OUT).size / 1024) + " KB");
