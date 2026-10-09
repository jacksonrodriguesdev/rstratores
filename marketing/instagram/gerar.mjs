// Publicações para o perfil do Instagram da AGRO PARTS (feed 4:5, carrossel e stories).
// Conteúdo do site: estoque, cotação por WhatsApp, busca por código, catálogos para mecânicos,
// envios DAC, marcas e manutenção. Sem fotos de peças (parte delas veio de outra loja).
//
// Uso (raiz do projeto):  node marketing/instagram/gerar.mjs
// Saída: marketing/instagram/saida/  (PNGs, legendas.md, mosaico.png)
// Fotos de fundo: config.json → "fotos" (caminhos relativos à raiz do projeto).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const RAIZ = process.cwd();
const DIR = path.join(RAIZ, "marketing/instagram");
const OUT = path.join(DIR, "saida");
const { chromium } = require(path.join(RAIZ, "node_modules/playwright"));
const C = JSON.parse(fs.readFileSync(path.join(DIR, "config.json"), "utf8"));
const SITE = C.site;
const url = (p) => pathToFileURL(p).href;
const LOGO = url(path.join(RAIZ, "public/logo.png"));
const FOTO = Object.fromEntries(
  Object.entries(C.fotos).map(([k, v]) => {
    const p = path.resolve(RAIZ, v);
    if (!fs.existsSync(p)) console.warn(`! foto não encontrada: ${k} -> ${p}`);
    return [k, fs.existsSync(p) ? url(p) : null];
  }),
);

// ---------- Ícones (traço, estilo lucide) ----------
const P = {
  check: '<circle cx="12" cy="12" r="10"/><path d="m8.5 12 2.5 2.5 4.5-5"/>',
  truck: '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  book: '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
  lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  box: '<path d="m16 16 2 2 4-4"/><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/><path d="m7.5 4.27 9 5.15"/><path d="M3.29 7 12 12l8.71-5"/><path d="M12 22V12"/>',
  drop: '<path d="M12 22a7 7 0 0 0 7-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5C6 11.1 5 13 5 15a7 7 0 0 0 7 7z"/>',
  dot: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  disc: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="2"/><path d="M12 2a10 10 0 0 1 10 10"/>',
  gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  user: '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  list: '<path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3 6h.01"/><path d="M3 12h.01"/><path d="M3 18h.01"/>',
};
const ico = (n, s = 40, cor = "currentColor", w = 2.2) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${cor}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${P[n]}</svg>`;
const WA = (s = 40, cor = "currentColor") =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><path fill="${cor}" d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.5a9.45 9.45 0 0 1-4.82-1.32l-.35-.2-3.58.94.96-3.49-.23-.36a9.43 9.43 0 0 1-1.45-5.03c0-5.22 4.25-9.46 9.48-9.46 2.53 0 4.9.99 6.69 2.78a9.4 9.4 0 0 1 2.77 6.69c0 5.22-4.25 9.46-9.46 9.46zm8.05-17.51A11.3 11.3 0 0 0 12.04.67C5.77.67.67 5.77.67 12.03c0 2 .52 3.96 1.52 5.68L.57 23.33l5.75-1.51a11.35 11.35 0 0 0 5.71 1.46c6.26 0 11.36-5.1 11.36-11.36 0-3.03-1.18-5.89-3.32-8.03z"/></svg>`;

// ---------- Estilo ----------
const BASE = `
<link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,500;0,600;0,700;0,800;0,900;1,900&display=swap" rel="stylesheet">
<style>
:root{--oscuro:#06321b;--verde:#0b7a3b;--verde2:#12a150;--amarillo:#ffd200;--crema:#f6f3e8}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Montserrat",sans-serif;color:#fff;-webkit-font-smoothing:antialiased}
.l{position:relative;width:1080px;height:1350px;overflow:hidden;background:var(--oscuro)}
.l.s{height:1920px}
.foto{position:absolute;inset:0;background-size:cover;background-position:center}
.campo{position:absolute;inset:0;background:radial-gradient(120% 70% at 70% 0%,#2e9b55 0%,#0b5a2c 45%,#06321b 100%)}
.rayas{position:absolute;inset:0;opacity:.07;background:repeating-linear-gradient(-28deg,#fff 0 3px,transparent 3px 60px)}
.logo{position:absolute;display:flex;align-items:center;gap:16px;z-index:5}
.logo img{width:82px;height:82px;background:#fff;border-radius:22px;padding:7px;box-shadow:0 8px 20px rgba(0,0,0,.25)}
.logo b{display:block;font-size:38px;font-weight:900;letter-spacing:.5px;line-height:1}
.logo span{display:block;font-size:14px;font-weight:800;letter-spacing:4.5px;margin-top:5px;color:var(--amarillo)}
.logo.esc b{color:var(--oscuro)} .logo.esc span{color:var(--verde)}
.kicker{display:inline-flex;align-items:center;gap:10px;background:var(--amarillo);color:var(--oscuro);font-weight:900;font-size:24px;letter-spacing:2px;text-transform:uppercase;padding:12px 22px;border-radius:999px}
.amar{color:var(--amarillo)} .verde{color:var(--verde2)}
h1{font-weight:900;letter-spacing:-1.5px;line-height:.98}
.barra{position:absolute;left:0;right:0;bottom:0;height:104px;background:var(--amarillo);color:var(--oscuro);display:flex;align-items:center;justify-content:space-between;padding:0 56px;font-weight:900;font-size:28px;z-index:6}
.barra .w{display:flex;align-items:center;gap:12px}
.s .barra{height:150px;font-size:34px}
.chip{display:inline-flex;align-items:center;gap:10px;border-radius:999px;padding:12px 22px;font-weight:800;font-size:24px;background:rgba(255,255,255,.12);border:2px solid rgba(255,255,255,.22)}
.btn{display:inline-flex;align-items:center;gap:14px;background:var(--amarillo);color:var(--oscuro);font-weight:900;font-size:34px;padding:24px 38px;border-radius:22px;box-shadow:0 14px 30px rgba(0,0,0,.3)}
.btn.wa{background:#25D366;color:#fff}
.card{background:#fff;color:#18181b;border-radius:28px;box-shadow:0 24px 50px rgba(0,0,0,.28)}
.num{font-weight:900;font-style:italic;letter-spacing:-4px;line-height:.85}
.pag{position:absolute;right:56px;top:66px;font-weight:800;font-size:24px;background:rgba(0,0,0,.35);padding:10px 18px;border-radius:999px;z-index:6}
.desliza{position:absolute;right:56px;bottom:140px;display:flex;align-items:center;gap:10px;font-weight:900;font-size:28px;z-index:6}
.aviso{position:absolute;left:56px;right:56px;bottom:116px;font-size:15px;font-weight:600;opacity:.7;z-index:6}
</style>`;

const logo = (pos = "left:56px;top:56px", esc = false) =>
  `<div class="logo ${esc ? "esc" : ""}" style="${pos}"><img src="${LOGO}"><div><b>AGRO PARTS</b><span>REPUESTOS AGRÍCOLAS</span></div></div>`;
const barra = () =>
  `<div class="barra"><span class="w">${WA(36, "#06321b")} ${C.whatsapp ? `WhatsApp ${C.whatsapp}` : "Cotizá por WhatsApp"}</span><span>${SITE}</span></div>`;
const fundoFoto = (f, pos = "center", extra = "") =>
  f ? `<div class="foto" style="background-image:url('${f}');background-position:${pos};${extra}"></div>` : `<div class="campo"></div><div class="rayas"></div>`;

const posts = [];
const add = (nome, html, legenda, story = false) => posts.push({ nome, html, legenda, story });

// ---------- 1. Manifesto ----------
add(
  "01_manifiesto",
  `<div class="l">
    ${fundoFoto(FOTO.atardecer, "60% 50%")}
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(246,243,232,1) 0%,rgba(246,243,232,.97) 40%,rgba(246,243,232,0) 62%)"></div>
    ${logo("left:56px;top:56px", true)}
    <div style="position:absolute;left:56px;top:200px;right:56px;color:var(--oscuro)">
      <h1 style="font-size:92px">EL CAMPO<br>URUGUAYO<br><span style="color:var(--verde)">NO PARA.</span></h1>
      <p style="margin-top:22px;font-size:36px;font-weight:800">Tu tractor tampoco.</p>
      <div style="margin-top:34px;display:grid;gap:18px;font-size:27px;font-weight:700">
        <div style="display:flex;align-items:center;gap:16px">${ico("box", 44, "#0b7a3b")} Más de 29.000 repuestos</div>
        <div style="display:flex;align-items:center;gap:16px">${ico("truck", 44, "#0b7a3b")} Envíos a los 19 departamentos</div>
        <div style="display:flex;align-items:center;gap:16px">${ico("wrench", 44, "#0b7a3b")} Te ayudamos a encontrar la pieza</div>
      </div>
    </div>
    ${barra()}
  </div>`,
  "El campo uruguayo no para. Tu tractor tampoco. 🚜\n\nEn AGRO PARTS tenés más de 29.000 repuestos para tractores y cosechadoras, con envío por DAC a los 19 departamentos.\n\n👉 Buscá tu pieza en agropartsuy.com o escribinos por WhatsApp.",
);

// ---------- 2. Número grande ----------
const cats = [["gear", "Transmisión"], ["drop", "Filtros"], ["wrench", "Hidráulica"], ["dot", "Rodamientos"], ["disc", "Frenos y embragues"], ["zap", "Eléctrica"]];
add(
  "02_29mil_repuestos",
  `<div class="l">
    ${fundoFoto(FOTO.johnDeereSiembra, "50% 60%")}
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,50,27,.92) 0%,rgba(6,50,27,.55) 45%,rgba(6,50,27,.2) 62%,rgba(6,50,27,.9) 100%)"></div>
    ${logo()}
    <div style="position:absolute;left:56px;top:210px;right:56px">
      <span class="kicker">Stock para tu máquina</span>
      <div class="num amar" style="font-size:250px;margin-top:26px">+29.000</div>
      <h1 style="font-size:66px;margin-top:10px">repuestos para tractores<br>y cosechadoras</h1>
    </div>
    <div style="position:absolute;left:56px;right:56px;bottom:140px;display:flex;flex-wrap:wrap;gap:14px">
      ${cats.map(([i, t]) => `<span class="chip" style="background:rgba(6,50,27,.75)">${ico(i, 30, "#ffd200")} ${t}</span>`).join("")}
    </div>
    ${barra()}
  </div>`,
  "+29.000 repuestos para tractores y cosechadoras 🔧\n\nTransmisión, filtros, hidráulica, rodamientos, frenos, eléctrica y mucho más para Massey Ferguson, Valtra, John Deere, New Holland y Case IH.\n\n📦 Envíos a todo Uruguay por DAC.\n👉 agropartsuy.com",
);

// ---------- 3. Catálogos para mecânicos ----------
const capa = (marca, cor, tipo, estilo) =>
  `<div class="card" style="position:absolute;width:300px;${estilo}"><div style="height:18px;border-radius:28px 28px 0 0;background:${cor}"></div><div style="padding:26px">
   <p style="font-size:17px;font-weight:900;letter-spacing:1.5px;color:${cor}">${marca.toUpperCase()}</p><p style="font-size:28px;font-weight:900;margin-top:6px;line-height:1.05">${tipo}</p>
   ${[100, 82, 92, 70, 86].map((w) => `<div style="height:10px;border-radius:9px;background:#eee;margin-top:14px;width:${w}%"></div>`).join("")}
   <span style="display:inline-block;margin-top:20px;font-weight:900;font-size:17px;color:#dc2626;background:#fef2f2;border:2px solid #fecaca;border-radius:9px;padding:4px 10px">PDF</span></div></div>`;
add(
  "03_catalogos_mecanicos",
  `<div class="l">
    ${fundoFoto(FOTO.pulverizacion, "50% 50%", "filter:saturate(.8)")}
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,50,27,.96) 0%,rgba(6,50,27,.85) 55%,rgba(6,50,27,.6) 100%)"></div>
    <div class="rayas"></div>
    ${logo()}
    <div style="position:absolute;left:56px;top:205px;right:56px">
      <span class="kicker">${ico("wrench", 26, "#06321b", 2.6)} Para mecánicos y talleres</span>
      <h1 style="font-size:82px;margin-top:28px">CATÁLOGOS<br>Y MANUALES<br><span class="amar">GRATIS</span></h1>
      <p style="font-size:30px;font-weight:600;margin-top:22px;line-height:1.35;max-width:600px">Manuales de taller y catálogos de piezas en PDF. Solo tenés que crear tu cuenta.</p>
    </div>
    ${capa("John Deere", "#367c2b", "Catálogo de piezas", "right:250px;top:760px;transform:rotate(-11deg);opacity:.92")}
    ${capa("Case IH", "#b5121b", "Manual de servicio", "right:40px;top:740px;transform:rotate(9deg);opacity:.95")}
    ${capa("Massey Ferguson", "#c8102e", "Manual de taller", "right:140px;top:690px")}
    <div style="position:absolute;left:56px;top:1060px"><span class="btn">Creá tu cuenta gratis ${ico("arrow", 34, "#06321b", 3)}</span>
      <p style="margin-top:18px;font-size:24px;font-weight:700;opacity:.85">${ico("lock", 24, "#ffd200")} agropartsuy.com/catalogos</p></div>
    ${barra()}
  </div>`,
  "🔧 Mecánicos y talleres: catálogos y manuales GRATIS\n\nManuales de taller y catálogos de piezas en PDF para tractores y cosechadoras. Abrilos desde el celular o la PC y encontrá el código exacto de la pieza.\n\n✅ Solo tenés que crear tu cuenta (es gratis)\n👉 agropartsuy.com/catalogos",
);

// ---------- 4. Cotizá en 3 pasos ----------
const passo = (n, i, t, d) =>
  `<div style="display:flex;gap:26px;align-items:center;background:rgba(255,255,255,.1);border:2px solid rgba(255,255,255,.18);border-radius:28px;padding:26px 30px;backdrop-filter:blur(6px)">
    <div style="flex:none;width:96px;height:96px;border-radius:26px;background:var(--amarillo);display:grid;place-items:center;color:var(--oscuro);position:relative">${i}<b style="position:absolute;top:-14px;left:-14px;width:44px;height:44px;border-radius:50%;background:#fff;color:var(--oscuro);display:grid;place-items:center;font-size:24px">${n}</b></div>
    <div><p style="font-size:38px;font-weight:900">${t}</p><p style="font-size:24px;font-weight:600;opacity:.85;margin-top:4px">${d}</p></div></div>`;
add(
  "04_cotiza_3_pasos",
  `<div class="l">
    ${fundoFoto(FOTO.noche, "50% 40%")}
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,50,27,.94) 0%,rgba(6,50,27,.7) 50%,rgba(6,50,27,.94) 100%)"></div>
    ${logo()}
    <div style="position:absolute;left:56px;right:56px;top:200px">
      <h1 style="font-size:84px">COTIZÁ EN<br><span class="amar">3 PASOS</span></h1>
      <p style="font-size:30px;font-weight:600;margin-top:16px;opacity:.9">Sin registrarte y sin compromiso de compra.</p>
      <div style="display:grid;gap:22px;margin-top:44px">
        ${passo(1, ico("search", 50, "#06321b", 2.6), "Buscá tu repuesto", "Por nombre, código o marca del tractor")}
        ${passo(2, ico("cart", 50, "#06321b", 2.6), "Armá tu lista", "Sumá todas las piezas que necesitás")}
        ${passo(3, WA(50, "#06321b"), "Pedí el precio", "Te respondemos por WhatsApp")}
      </div>
    </div>
    ${barra()}
  </div>`,
  "¿Cómo cotizar tus repuestos? Es muy fácil 👇\n\n1️⃣ Buscá tu repuesto por nombre, código o marca\n2️⃣ Armá tu lista con todo lo que necesitás\n3️⃣ Pedí el precio por WhatsApp y te respondemos\n\nSin registrarte y sin compromiso. 👉 agropartsuy.com",
);

// ---------- 5. Envios DAC, 19 departamentos ----------
const DEPTOS = ["Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno", "Flores", "Florida", "Lavalleja", "Maldonado", "Montevideo", "Paysandú", "Río Negro", "Rivera", "Rocha", "Salto", "San José", "Soriano", "Tacuarembó", "Treinta y Tres"];
add(
  "05_envios_19_departamentos",
  `<div class="l">
    ${fundoFoto(FOTO.newHolland, "40% 50%")}
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,50,27,.25) 0%,rgba(6,50,27,.2) 35%,rgba(6,50,27,.94) 55%,rgba(6,50,27,1) 100%)"></div>
    ${logo()}
    <div style="position:absolute;left:56px;right:56px;top:560px">
      <span class="kicker">${ico("truck", 28, "#06321b", 2.6)} Envíos por DAC</span>
      <h1 style="font-size:76px;margin-top:22px">DE NUESTRO DEPÓSITO<br><span class="amar">A TU CHACRA</span></h1>
      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:30px">
        ${DEPTOS.map((d) => `<span style="font-size:20px;font-weight:800;padding:8px 14px;border-radius:999px;background:rgba(255,255,255,.1);border:1.5px solid rgba(255,255,255,.2)">${ico("pin", 18, "#ffd200", 2.6)} ${d}</span>`).join("")}
      </div>
      <p style="font-size:26px;font-weight:700;margin-top:26px">Con número de seguimiento para que sepas dónde está tu pedido.</p>
    </div>
    ${barra()}
  </div>`,
  "📦 De nuestro depósito a tu chacra\n\nEnviamos tus repuestos por DAC a los 19 departamentos de Uruguay, con número de seguimiento.\n\nArtigas, Salto, Paysandú, Rivera, Tacuarembó, Cerro Largo, Treinta y Tres, Rocha... ¡a todo el país! 🇺🇾\n\n👉 Cotizá en agropartsuy.com",
);

// ---------- 6. Busca por código ----------
add(
  "06_busca_por_codigo",
  `<div class="l">
    ${fundoFoto(FOTO.johnDeerePolvo, "60% 60%")}
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,50,27,.95) 0%,rgba(6,50,27,.88) 50%,rgba(6,50,27,.35) 78%,rgba(6,50,27,.85) 100%)"></div>
    ${logo()}
    <div style="position:absolute;left:56px;right:56px;top:210px">
      <h1 style="font-size:80px">¿TENÉS EL<br><span class="amar">CÓDIGO</span> DE<br>LA PIEZA?</h1>
      <p style="font-size:32px;font-weight:600;margin-top:22px;opacity:.9">Buscalo y lo encontramos al instante.</p>
      <div class="card" style="margin-top:40px;display:flex;align-items:center;gap:20px;padding:26px 30px">
        ${ico("search", 46, "#0b7a3b", 2.6)}<span style="font-size:38px;font-weight:800;color:#a1a1aa;flex:1">Ej.: 3136019</span>
        <span style="background:var(--verde);color:#fff;font-weight:900;font-size:28px;padding:16px 26px;border-radius:18px">Buscar</span>
      </div>
      <div style="margin-top:28px;display:flex;align-items:center;gap:16px;font-size:27px;font-weight:700">${ico("list", 40, "#ffd200")} ¿Muchas piezas? Pegá tu lista de códigos en <span class="amar">Pedido rápido</span></div>
    </div>
    ${barra()}
  </div>`,
  "¿Tenés el código de la pieza? 🔎\n\nEscribilo en el buscador de agropartsuy.com y lo encontramos al instante. Si necesitás muchas piezas, usá «Pedido rápido»: pegás tu lista de códigos y cotizás todo junto.\n\n👉 agropartsuy.com/pedido-rapido",
);

// ---------- 7-11. Marcas ----------
const MARCAS = [
  { m: "John Deere", cor: "#367c2b", f: FOTO.johnDeerePolvo, pos: "65% 55%" },
  { m: "New Holland", cor: "#0a5bb5", f: FOTO.newHolland, pos: "45% 50%" },
  { m: "Massey Ferguson", cor: "#c8102e", f: FOTO.pulverizacion, pos: "30% 50%" },
  { m: "Valtra", cor: "#d52b1e", f: FOTO.pulverizacion, pos: "75% 50%" },
  { m: "Case IH", cor: "#b5121b", f: FOTO.atardecer, pos: "10% 50%" },
];
MARCAS.forEach(({ m, cor, f, pos }, i) => {
  const fotoMarca = m === "John Deere" || m === "New Holland"; // foto mostra a própria marca
  add(
    `${String(7 + i).padStart(2, "0")}_marca_${m.toLowerCase().replace(/\s+/g, "-")}`,
    `<div class="l">
      <div style="position:absolute;left:0;right:0;top:0;height:64%">${fundoFoto(f, pos, fotoMarca ? "" : "filter:grayscale(.85) brightness(.8)")}
      ${fotoMarca ? "" : `<div style="position:absolute;inset:0;background:${cor};mix-blend-mode:multiply;opacity:.55"></div>`}
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.45) 0%,rgba(0,0,0,0) 30%)"></div></div>
      <div style="position:absolute;left:0;right:0;bottom:0;height:50%;background:${cor};clip-path:polygon(0 14%,100% 0,100% 100%,0 100%)"></div>
      <div style="position:absolute;left:0;right:0;bottom:0;height:50%;background:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.35));clip-path:polygon(0 14%,100% 0,100% 100%,0 100%)"></div>
      ${logo()}
      <div style="position:absolute;left:56px;right:56px;top:770px">
        <p style="font-size:34px;font-weight:800">Repuestos para tu</p>
        <h1 style="font-size:${m.length > 12 ? 92 : 118}px;margin-top:6px;letter-spacing:-3px;white-space:nowrap">${m.toUpperCase()}</h1>
        <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:22px">
          ${["Transmisión", "Hidráulica", "Filtros", "Rodamientos", "Frenos", "Eléctrica"].map((t) => `<span class="chip" style="font-size:22px;padding:10px 18px">${t}</span>`).join("")}
        </div>
        <p style="font-size:26px;font-weight:700;margin-top:28px">Pasanos el modelo y año: te confirmamos la pieza correcta.</p>
      </div>
      <div class="aviso">Las marcas mencionadas pertenecen a sus respectivos dueños.</div>
      ${barra()}
    </div>`,
    `¿Tenés un ${m}? 🚜\n\nEn AGRO PARTS encontrás repuestos de transmisión, hidráulica, filtros, rodamientos, frenos y eléctrica para tu ${m}.\n\nPasanos el modelo y el año del tractor y te confirmamos la pieza correcta.\n📦 Envíos a todo Uruguay por DAC.\n\n👉 agropartsuy.com`,
  );
});

// ---------- 12. Mantenimiento antes de la zafra ----------
const revisar = [["drop", "Filtros de aceite, aire y combustible"], ["gear", "Transmisión y embrague"], ["wrench", "Mangueras y sistema hidráulico"], ["dot", "Rodamientos y retenes"], ["zap", "Batería, luces y sensores"], ["disc", "Frenos"]];
add(
  "12_checklist_zafra",
  `<div class="l" style="background:var(--crema)">
    <div style="position:absolute;left:0;right:0;bottom:0;height:300px">${fundoFoto(FOTO.atardecer, "70% 40%")}</div>
    <div style="position:absolute;left:0;right:0;bottom:0;height:300px;background:linear-gradient(180deg,var(--crema) 0%,rgba(246,243,232,0) 45%)"></div>
    ${logo("left:56px;top:56px", true)}
    <div style="position:absolute;left:56px;right:56px;top:196px;color:var(--oscuro)">
      <span class="kicker" style="background:var(--verde);color:#fff">Checklist</span>
      <h1 style="font-size:78px;margin-top:22px">ANTES DE LA ZAFRA,<br><span style="color:var(--verde)">REVISÁ:</span></h1>
      <div style="display:grid;gap:16px;margin-top:34px">
        ${revisar.map(([i, t]) => `<div style="display:flex;align-items:center;gap:20px;background:#fff;border-radius:22px;padding:18px 24px;box-shadow:0 6px 16px rgba(6,50,27,.08)"><span style="width:62px;height:62px;border-radius:18px;background:#e8f3ec;display:grid;place-items:center">${ico(i, 34, "#0b7a3b")}</span><span style="font-size:30px;font-weight:800;flex:1">${t}</span>${ico("check", 40, "#12a150", 2.4)}</div>`).join("")}
      </div>
    </div>
    ${barra()}
  </div>`,
  "✅ Checklist antes de la zafra\n\nUna parada en plena cosecha sale mucho más cara que el repuesto. Revisá:\n\n• Filtros de aceite, aire y combustible\n• Transmisión y embrague\n• Mangueras y sistema hidráulico\n• Rodamientos y retenes\n• Batería, luces y sensores\n• Frenos\n\n¿Te falta alguna pieza? Cotizala en agropartsuy.com 🚜\n\n💾 Guardá este post para tenerlo a mano.",
);

// ---------- 13. Engajamento ----------
add(
  "13_que_tractor_tenes",
  `<div class="l">
    ${fundoFoto(FOTO.noche, "50% 60%")}
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,50,27,.95) 0%,rgba(6,50,27,.6) 55%,rgba(6,50,27,.95) 100%)"></div>
    ${logo()}
    <div style="position:absolute;left:56px;right:56px;top:210px;text-align:center">
      <h1 style="font-size:96px">¿QUÉ TRACTOR<br><span class="amar">TENÉS?</span></h1>
      <p style="font-size:32px;font-weight:700;margin-top:20px">Contanos en los comentarios 👇</p>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:56px;text-align:left">
        ${[["A", "Massey Ferguson", "#c8102e"], ["B", "John Deere", "#367c2b"], ["C", "New Holland", "#0a5bb5"], ["D", "Valtra", "#d52b1e"], ["E", "Case IH", "#b5121b"], ["F", "Otro", "#52525b"]]
          .map(([l, m, c]) => `<div class="card" style="display:flex;align-items:center;gap:18px;padding:22px 24px"><b style="width:60px;height:60px;border-radius:16px;background:${c};color:#fff;display:grid;place-items:center;font-size:30px">${l}</b><span style="font-size:30px;font-weight:900">${m}</span></div>`)
          .join("")}
      </div>
    </div>
    ${barra()}
  </div>`,
  "¿Qué tractor tenés? 🚜 Contanos en los comentarios 👇\n\nA) Massey Ferguson\nB) John Deere\nC) New Holland\nD) Valtra\nE) Case IH\nF) Otro (¡decinos cuál!)\n\nTenemos repuestos para todas estas marcas, con envío a todo Uruguay.",
);

// ---------- Carrossel: cómo pedir tu repuesto ----------
const slide = (n, total, conteudo, f, pos = "center") =>
  `<div class="l">
    ${fundoFoto(f, pos)}
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,50,27,.96) 0%,rgba(6,50,27,.8) 48%,rgba(6,50,27,.2) 78%,rgba(6,50,27,.85) 100%)"></div>
    ${logo()}<span class="pag">${n}/${total}</span>
    ${conteudo}
    ${n < total ? `<div class="desliza">Deslizá ${ico("arrow", 34, "#ffd200", 3)}</div>` : ""}
    ${barra()}
  </div>`;
const passoGrande = (n, icone, titulo, texto, extra = "") =>
  `<div style="position:absolute;left:56px;right:56px;top:240px">
    <div class="num amar" style="font-size:230px;opacity:.95">0${n}</div>
    <div style="width:130px;height:130px;border-radius:34px;background:var(--amarillo);display:grid;place-items:center;margin-top:10px">${icone}</div>
    <h1 style="font-size:84px;margin-top:36px">${titulo}</h1>
    <p style="font-size:34px;font-weight:600;margin-top:22px;line-height:1.35;opacity:.92">${texto}</p>${extra}</div>`;
const carrossel = [
  slide(1, 5, `<div style="position:absolute;left:56px;right:56px;top:300px"><span class="kicker">Guía rápida</span><h1 style="font-size:118px;margin-top:30px">¿CÓMO<br>PEDIR TU<br><span class="amar">REPUESTO?</span></h1><p style="font-size:36px;font-weight:700;margin-top:30px">En 4 pasos, desde el celular.</p></div>`, FOTO.johnDeereSiembra, "50% 60%"),
  slide(2, 5, passoGrande(1, ico("search", 70, "#06321b", 2.6), "BUSCÁ", "Escribí el nombre de la pieza, el código o la marca de tu tractor en <b class=amar>agropartsuy.com</b>."), FOTO.pulverizacion),
  slide(3, 5, passoGrande(2, ico("cart", 70, "#06321b", 2.6), "ARMÁ TU LISTA", "Tocá «Agregar a mi cotización» en cada repuesto que necesitás."), FOTO.atardecer, "70% 50%"),
  slide(4, 5, passoGrande(3, WA(70, "#06321b"), "PEDÍ EL PRECIO", "Mandá tu lista por WhatsApp: te respondemos con precio y disponibilidad."), FOTO.noche),
  slide(5, 5, passoGrande(4, ico("truck", 70, "#06321b", 2.6), "RECIBILO", "Enviamos por DAC a todo Uruguay, con número de seguimiento.", `<div style="margin-top:46px"><span class="btn wa">${WA(40, "#fff")} Cotizá ahora</span></div>`), FOTO.newHolland),
];
carrossel.forEach((h, i) =>
  add(
    `14_carrusel_${i + 1}`,
    h,
    i === 0
      ? "📲 ¿Cómo pedir tu repuesto en AGRO PARTS? Deslizá 👉\n\n1️⃣ Buscá por nombre, código o marca\n2️⃣ Armá tu lista\n3️⃣ Pedí el precio por WhatsApp\n4️⃣ Recibilo por DAC en todo Uruguay\n\n👉 agropartsuy.com"
      : "",
  ),
);

// ---------- Stories (1080x1920) ----------
const story = (nome, f, pos, conteudo, legenda) =>
  add(
    nome,
    `<div class="l s">
      ${fundoFoto(f, pos)}
      <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,50,27,.9) 0%,rgba(6,50,27,.35) 40%,rgba(6,50,27,.95) 72%)"></div>
      ${logo("left:56px;top:120px")}
      ${conteudo}
      ${barra()}
    </div>`,
    legenda,
    true,
  );
story(
  "15_story_catalogos",
  FOTO.pulverizacion,
  "50% 50%",
  `<div style="position:absolute;left:56px;right:56px;top:1080px"><span class="kicker">${ico("book", 28, "#06321b", 2.6)} Nuevo en el sitio</span>
   <h1 style="font-size:96px;margin-top:26px">CATÁLOGOS<br><span class="amar">GRATIS</span> PARA<br>MECÁNICOS</h1>
   <p style="font-size:34px;font-weight:600;margin-top:20px">Creá tu cuenta y abrilos desde el celular.</p>
   <div style="margin-top:44px"><span class="btn">Tocá el enlace ${ico("arrow", 34, "#06321b", 3)}</span></div></div>`,
  "Story: agregá el sticker de enlace a agropartsuy.com/catalogos sobre el botón.",
);
story(
  "16_story_whatsapp",
  FOTO.noche,
  "50% 40%",
  `<div style="position:absolute;left:56px;right:56px;top:1060px"><h1 style="font-size:104px">¿TU TRACTOR<br>NECESITA UN<br><span class="amar">REPUESTO?</span></h1>
   <p style="font-size:36px;font-weight:600;margin-top:22px">Mandanos el código o una foto de la pieza.</p>
   <div style="margin-top:44px"><span class="btn wa">${WA(42, "#fff")} Escribinos</span></div></div>`,
  "Story: agregá el sticker de enlace al WhatsApp sobre el botón.",
);
story(
  "17_story_envios",
  FOTO.newHolland,
  "40% 50%",
  `<div style="position:absolute;left:56px;right:56px;top:1080px"><span class="kicker">${ico("truck", 28, "#06321b", 2.6)} Envíos por DAC</span>
   <h1 style="font-size:100px;margin-top:26px">LLEGAMOS<br>A TODO<br><span class="amar">URUGUAY</span></h1>
   <p style="font-size:36px;font-weight:600;margin-top:22px">19 departamentos · con seguimiento</p></div>`,
  "Story: agregá el sticker de enlace a agropartsuy.com.",
);

// ---------- Render ----------
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith(".png")) fs.unlinkSync(path.join(OUT, f));
const navegador = await chromium.launch();
const pagina = await navegador.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
const tmp = path.join(DIR, ".tmp.html");
for (const p of posts) {
  fs.writeFileSync(tmp, `<!doctype html><html><head><meta charset="utf-8">${BASE}</head><body>${p.html}</body></html>`);
  await pagina.goto(url(tmp), { waitUntil: "networkidle" });
  await pagina.evaluate(() => document.fonts.ready);
  await pagina.waitForTimeout(250);
  await (await pagina.$(".l")).screenshot({ path: path.join(OUT, p.nome + ".png") });
  console.log("ok", p.nome);
}
fs.unlinkSync(tmp);

// Legendas
const hashtags = "#AgroParts #Uruguay #RepuestosAgricolas #Tractores #Maquinaria #CampoUruguayo #Agro #Repuestos #Mecanica #Cosecha";
const md = ["# Legendas — Instagram AGRO PARTS", "", "Copie a legenda de cada post. Hashtags no final.", ""];
for (const p of posts) if (p.legenda) md.push(`## ${p.nome}${p.story ? " (story)" : ""}`, "", p.legenda + (p.story ? "" : `\n\n${hashtags}`), "");
fs.writeFileSync(path.join(OUT, "legendas.md"), md.join("\n"));

// Mosaico (só feed)
const feed = posts.filter((p) => !p.story);
fs.writeFileSync(tmp, `<!doctype html><body style="margin:0;background:#111"><div style="display:grid;grid-template-columns:repeat(4,270px);gap:6px;padding:6px">${feed.map((p) => `<img src="${url(path.join(OUT, p.nome + ".png"))}" style="width:270px;height:337px;object-fit:cover">`).join("")}</div>`);
await pagina.setViewportSize({ width: 1110, height: 800 });
await pagina.goto(url(tmp), { waitUntil: "load" });
await pagina.screenshot({ path: path.join(OUT, "mosaico.png"), fullPage: true });
fs.unlinkSync(tmp);
await navegador.close();
console.log(`\n${posts.length} imagens em ${OUT}`);
