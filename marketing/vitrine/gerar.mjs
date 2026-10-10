// "Conocé el sitio": posts que mostram o agropartsuy.com em mockups de celular/notebook,
// com destaques de cada função (busca, ficha, pedido rápido, catálogos, conta, envios).
//
// 1) Telas: capturadas do site no ar em marketing/vitrine/telas/ (m_*.png celular, d_*.png PC).
//    Para atualizar, capture de novo (ver LEIAME.md).
// 2) Uso (raiz do projeto):  node marketing/vitrine/gerar.mjs
// Saída: marketing/vitrine/saida/ (PNGs 1080x1350 e stories 1080x1920, legendas.md, mosaico.png)
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const RAIZ = process.cwd();
const DIR = path.join(RAIZ, "marketing/vitrine");
const OUT = path.join(DIR, "saida");
const { chromium } = require(path.join(RAIZ, "node_modules/playwright"));
const SITE = "agropartsuy.com";
const LOGO = pathToFileURL(path.join(RAIZ, "public/logo.png")).href;
const tela = (n) => pathToFileURL(path.join(DIR, "telas", n + ".png")).href;

const GRAO = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E")`;
const BASE = `
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=IBM+Plex+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>
:root{--noche:#062016;--verde:#0f4d2e;--vivo:#1d8a4a;--menta:#7fe0a6;--oro:#ffc21a;--crema:#f3efe4;--whats:#25D366}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Archivo",system-ui,sans-serif;-webkit-font-smoothing:antialiased;color:#fff}
.l{position:relative;overflow:hidden;width:1080px;height:1350px}
.s{height:1920px}
.grano::after{content:"";position:absolute;inset:0;background-image:${GRAO};opacity:.12;mix-blend-mode:overlay;pointer-events:none;z-index:50}
.oscuro{background:radial-gradient(70% 55% at 80% 30%,#1f7a46 0%,transparent 60%),radial-gradient(60% 50% at 0% 100%,#0f4d2e 0%,transparent 70%),var(--noche)}
.crema{background:radial-gradient(80% 60% at 70% 35%,#fffdf6 0%,var(--crema) 70%);color:var(--noche)}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:60px 60px;mask-image:radial-gradient(70% 60% at 60% 40%,#000,transparent)}
.d{font-weight:900;font-stretch:72%;line-height:.9;letter-spacing:-1px}
.mono{font-family:"IBM Plex Mono",monospace}
.marca{display:flex;align-items:center;gap:14px}
.marca img{width:64px;height:64px;background:#fff;border-radius:18px;padding:5px}
.marca b{display:block;font-size:28px;font-weight:900;font-stretch:90%}
.marca span{display:block;font-size:13px;font-weight:700;letter-spacing:3.5px;color:var(--oro)}
.phone{position:absolute;width:430px;height:930px;border-radius:66px;background:linear-gradient(145deg,#2a2f2c,#090b0a);padding:13px;box-shadow:0 60px 120px rgba(0,0,0,.55),0 0 0 2px rgba(255,255,255,.08) inset}
.phone .tela{width:100%;height:100%;border-radius:54px;overflow:hidden;background:#fff;position:relative}
.phone .tela img{width:100%;height:100%;object-fit:cover;object-position:top}
.phone .ilha{position:absolute;left:50%;top:26px;width:120px;height:34px;border-radius:20px;background:#000;transform:translateX(-50%);z-index:2}
.glass{position:absolute;background:rgba(255,255,255,.12);border:1.5px solid rgba(255,255,255,.22);backdrop-filter:blur(14px);border-radius:26px;padding:22px 26px;box-shadow:0 20px 50px rgba(0,0,0,.3)}
.card{position:absolute;background:#fff;color:var(--noche);border-radius:26px;padding:22px 26px;box-shadow:0 24px 60px rgba(0,0,0,.28)}
.ico{display:inline-grid;place-items:center;width:58px;height:58px;border-radius:18px;font-size:30px;flex:none}
.num{display:inline-grid;place-items:center;width:52px;height:52px;border-radius:50%;background:var(--oro);color:var(--noche);font-weight:900;font-size:26px;flex:none}
.pill{display:inline-flex;align-items:center;gap:12px;border-radius:999px;font-weight:900}
.url{font-family:"IBM Plex Mono",monospace;font-weight:700}
.linha{position:absolute;height:3px;background:repeating-linear-gradient(90deg,var(--oro) 0 10px,transparent 10px 18px);transform-origin:left center}
</style>`;
const WA = `<svg viewBox="0 0 24 24" width="1em" height="1em" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg>`;
const marca = (claro) => `<div class="marca"><img src="${LOGO}"><div><b style="color:${claro ? "var(--noche)" : "#fff"}">AGRO PARTS</b><span style="${claro ? "color:#a77900" : ""}">REPUESTOS AGRÍCOLAS</span></div></div>`;
const phone = (img, est) => `<div class="phone" style="${est}"><div class="ilha"></div><div class="tela"><img src="${tela(img)}"></div></div>`;
const barraUrl = (claro) =>
  `<div class="pill url" style="position:absolute;left:64px;bottom:60px;font-size:30px;padding:20px 30px;background:${claro ? "var(--noche)" : "#fff"};color:${claro ? "#fff" : "var(--noche)"}">🌐 ${SITE}</div>`;
const glass = (est, ico, cor, titulo, texto) =>
  `<div class="glass" style="${est};display:flex;gap:18px;align-items:center"><span class="ico" style="background:${cor}">${ico}</span><div><div style="font-size:28px;font-weight:900">${titulo}</div>${texto ? `<div style="font-size:20px;opacity:.85;margin-top:4px">${texto}</div>` : ""}</div></div>`;

const posts = [];
const add = (nome, html, legenda, story = false) => posts.push({ nome, html, legenda, story });
const TAGS = "#AgroParts #Uruguay #RepuestosAgricolas #Tractores #CampoUruguayo";

// 1. Abertura: o site no bolso
add("01_tu_tienda_en_el_bolsillo", `<div class="l oscuro grano"><div class="grid"></div>
  <div style="position:absolute;left:64px;top:56px">${marca()}</div>
  <h1 class="d" style="position:absolute;left:64px;top:180px;width:520px;font-size:104px">Tu tienda de repuestos, <span style="color:var(--oro)">en el bolsillo.</span></h1>
  <p style="position:absolute;left:64px;top:560px;width:480px;font-size:30px;line-height:1.35;color:#cfe6d7">Entrá a <b class="url" style="color:#fff">${SITE}</b> desde el celular: buscás, armás tu lista y pedís el precio por WhatsApp.</p>
  ${phone("m_home", "left:600px;top:150px;transform:rotate(6deg)")}
  ${glass("left:64px;top:820px", "🔎", "var(--oro)", "Buscá por código", "Código original o nombre de la pieza")}
  ${glass("left:64px;top:960px", WA, "var(--whats)", "Cotizá por WhatsApp", "Te respondemos con precio y stock")}
  ${glass("left:420px;top:1100px", "🚚", "#3b82f6", "Envíos por DAC", "A los 19 departamentos")}
  ${barraUrl()}
</div>`, `📱 Tu tienda de repuestos agrícolas, en el bolsillo.\n\nEntrá a ${SITE} desde el celular:\n🔎 Buscá por código original o nombre\n🛒 Armá tu lista de repuestos\n💬 Pedí el precio por WhatsApp\n🚚 Recibilo por DAC en todo Uruguay\n\n${TAGS}`);

// 2. Loja: 999 repuestos com foto
add("02_catalogo_online", `<div class="l crema grano">
  <div style="position:absolute;left:64px;top:56px">${marca(true)}</div>
  ${phone("m_loja", "left:80px;top:200px;transform:rotate(-5deg)")}
  <div style="position:absolute;left:560px;top:200px;width:460px">
    <div style="font-size:24px;font-weight:800;letter-spacing:4px;color:var(--vivo)">CATÁLOGO ONLINE</div>
    <div class="d" style="font-size:230px;color:var(--noche);margin-top:10px">999</div>
    <div class="d" style="font-size:66px;color:var(--noche)">repuestos con foto y ficha</div>
  </div>
  <div class="card" style="left:560px;top:760px;width:460px">
    ${[["⚙️", "Por categoría", "Transmisión, hidráulica, filtros…"], ["🚜", "Por marca", "Massey, Valtra, John Deere, NH"], ["↕️", "Ordená y filtrá", "Encontrás la pieza en segundos"]]
      .map(([i, t, d], k) => `<div style="display:flex;gap:16px;align-items:center;${k ? "margin-top:20px;padding-top:20px;border-top:2px solid #eef0ea" : ""}"><span class="ico" style="background:#e8f3ec;width:52px;height:52px;font-size:26px">${i}</span><div><div style="font-size:26px;font-weight:900">${t}</div><div style="font-size:19px;color:#5b6b60">${d}</div></div></div>`).join("")}
  </div>
  ${barraUrl(true)}
</div>`, `🔧 999 repuestos agrícolas con foto y ficha, online.\n\nFiltrá por categoría o por la marca de tu tractor y encontrá la pieza en segundos.\n👉 ${SITE}/loja\n\n${TAGS}`);

// 3. Ficha do produto anotada
add("03_cada_repuesto_con_su_ficha", `<div class="l oscuro grano"><div class="grid"></div>
  <div style="position:absolute;left:64px;top:56px">${marca()}</div>
  <h1 class="d" style="position:absolute;left:64px;top:170px;width:950px;font-size:96px">Cada repuesto, <span style="color:var(--oro)">con su ficha.</span></h1>
  ${phone("m_produto", "left:90px;top:400px;transform:rotate(-4deg)")}
  ${phone("m_produto2", "left:330px;top:470px;transform:rotate(5deg) scale(.86);opacity:.97")}
  ${[["Código original", "Para pedir la pieza exacta", 760, 470], ["Marca y fabricante", "Sabés qué estás comprando", 760, 690], ["Precio por WhatsApp", "Un toque y te respondemos", 760, 910]]
    .map(([t, d, x, y], k) => `<div class="glass" style="left:${x - 30}px;top:${y}px;width:330px;padding:20px 22px"><div style="display:flex;gap:14px;align-items:center"><span class="num">${k + 1}</span><div style="font-size:25px;font-weight:900;line-height:1.1">${t}</div></div><div style="font-size:19px;opacity:.85;margin-top:8px">${d}</div></div>`).join("")}
  ${barraUrl()}
</div>`, `Cada repuesto en ${SITE} tiene su ficha 📋\n1️⃣ Código original para pedir la pieza exacta\n2️⃣ Marca y fabricante\n3️⃣ Botón para consultar el precio por WhatsApp\n\nConfirmamos la compatibilidad antes de enviar ✅\n\n${TAGS}`);

// 4. Pedido rápido: lista de códigos -> WhatsApp
add("04_pedido_rapido", `<div class="l crema grano">
  <div style="position:absolute;left:64px;top:56px">${marca(true)}</div>
  <div style="position:absolute;left:64px;top:180px;width:520px">
    <div style="font-size:24px;font-weight:800;letter-spacing:4px;color:var(--vivo)">PARA TALLERES Y REVENDEDORES</div>
    <h1 class="d" style="font-size:110px;color:var(--noche);margin-top:14px">Pedido rápido</h1>
    <p style="font-size:30px;line-height:1.35;margin-top:20px;color:#3e4d43">Pegá tu lista de códigos y cotizá todo junto en un solo mensaje.</p>
  </div>
  <div class="card mono" style="left:64px;top:700px;width:420px;font-size:30px;line-height:1.6;transform:rotate(-3deg)">
    <div style="font-family:Archivo;font-size:18px;font-weight:800;letter-spacing:3px;color:#7a857d;margin-bottom:8px">TU LISTA</div>AL81843<br>2x 6205<br>3302160 4<br>RE504836</div>
  <div class="linha" style="left:420px;top:900px;width:200px;transform:rotate(-12deg)"></div>
  <div class="card" style="left:120px;top:1040px;width:400px;background:#dcf8c6;font-size:24px;line-height:1.4;transform:rotate(2deg)"><b>¡Hola! Quiero cotizar:</b><br>• 1x AL81843<br>• 2x 6205 …</div>
  ${phone("m_pedido", "left:600px;top:250px;transform:rotate(5deg)")}
  ${barraUrl(true)}
</div>`, `⚡ ¿Tenés taller o revendés repuestos?\nUsá el Pedido rápido: pegás tu lista de códigos (con cantidades) y cotizás todo junto por WhatsApp.\n👉 ${SITE}/pedido-rapido\n\n${TAGS} #Talleres`);

// 5. Catálogos PDF
add("05_catalogos_pdf", `<div class="l oscuro grano"><div class="grid"></div>
  <div style="position:absolute;left:64px;top:56px">${marca()}</div>
  ${phone("m_catalogos", "left:580px;top:170px;transform:rotate(6deg)")}
  <div style="position:absolute;left:64px;top:190px;width:500px">
    <div class="pill" style="background:var(--oro);color:var(--noche);font-size:22px;padding:12px 22px;letter-spacing:2px">🔧 NUEVO EN EL SITIO</div>
    <h1 class="d" style="font-size:108px;margin-top:26px">Catálogos <span style="color:var(--oro)">gratis</span> para mecánicos</h1>
    <p style="font-size:30px;line-height:1.35;margin-top:24px;color:#cfe6d7">Manuales de taller y catálogos de piezas en PDF. Los abrís desde el celular.</p>
  </div>
  ${["Manual de taller", "Catálogo de piezas", "Manual de servicio"].map((t, k) => `<div class="card" style="left:${64 + k * 40}px;top:${860 + k * 70}px;width:380px;padding:18px 22px;display:flex;gap:16px;align-items:center;transform:rotate(${-4 + k * 3}deg)"><span style="font-weight:900;font-size:16px;color:#dc2626;background:#fef2f2;border:2px solid #fecaca;border-radius:9px;padding:6px 9px">PDF</span><span style="font-size:24px;font-weight:900">${t}</span></div>`).join("")}
  ${barraUrl()}
</div>`, `📚 Catálogos y manuales GRATIS para mecánicos\nCreá tu cuenta en ${SITE} y abrí los PDF desde el celular o la PC.\n👉 ${SITE}/catalogos\n\n${TAGS} #Mecanicos`);

// 6. Crie sua conta
add("06_crea_tu_cuenta", `<div class="l crema grano">
  <div style="position:absolute;left:64px;top:56px">${marca(true)}</div>
  ${phone("m_cadastro", "left:70px;top:210px;transform:rotate(-5deg)")}
  <div style="position:absolute;left:570px;top:220px;width:450px">
    <div style="font-size:24px;font-weight:800;letter-spacing:4px;color:var(--vivo)">EN MENOS DE 1 MINUTO</div>
    <h1 class="d" style="font-size:108px;color:var(--noche);margin-top:14px">Creá tu cuenta gratis</h1>
  </div>
  <div class="card" style="left:570px;top:620px;width:450px">
    ${[["G", "Entrá con Google", "o con tu e-mail"], ["📚", "Catálogos en PDF", "manuales y piezas"], ["⚡", "Cotizá más rápido", "tus datos ya guardados"], ["📦", "Tus envíos", "dirección para DAC"]]
      .map(([i, t, d], k) => `<div style="display:flex;gap:16px;align-items:center;${k ? "margin-top:18px;padding-top:18px;border-top:2px solid #eef0ea" : ""}"><span class="ico" style="background:#e8f3ec;width:50px;height:50px;font-size:24px;font-weight:900;color:var(--vivo)">${i}</span><div><div style="font-size:26px;font-weight:900">${t}</div><div style="font-size:19px;color:#5b6b60">${d}</div></div></div>`).join("")}
  </div>
  ${barraUrl(true)}
</div>`, `👤 Creá tu cuenta gratis en ${SITE}\n✅ Entrá con Google o con tu e-mail\n✅ Accedé a los catálogos en PDF\n✅ Cotizá más rápido con tus datos guardados\n\nEn menos de un minuto 👉 ${SITE}/cadastro\n\n${TAGS}`);

// 7. Cómo comprar (ayuda)
add("07_como_comprar", `<div class="l oscuro grano"><div class="grid"></div>
  <div style="position:absolute;left:64px;top:56px">${marca()}</div>
  <h1 class="d" style="position:absolute;left:64px;top:170px;width:560px;font-size:104px">Comprar es así de <span style="color:var(--oro)">simple</span></h1>
  ${phone("m_ayuda", "left:600px;top:170px;transform:rotate(5deg)")}
  ${[["🔎", "Buscá tu repuesto"], ["🛒", "Armá tu cotización"], [WA, "Pedí el precio"], ["🚚", "Recibilo por DAC"]]
    .map(([i, t], k) => `<div class="glass" style="left:64px;top:${500 + k * 150}px;width:480px;padding:18px 22px;display:flex;gap:18px;align-items:center"><span class="num">${k + 1}</span><span style="font-size:30px">${i}</span><span style="font-size:30px;font-weight:900">${t}</span></div>`).join("")}
  ${barraUrl()}
</div>`, `¿Cómo comprar en AGRO PARTS? 👇\n1️⃣ Buscá tu repuesto en ${SITE}\n2️⃣ Armá tu cotización\n3️⃣ Pedí el precio por WhatsApp\n4️⃣ Recibilo por DAC en todo Uruguay\n\n${TAGS}`);

// 8. Também no PC
add("08_tambien_en_tu_pc", `<div class="l crema grano">
  <div style="position:absolute;left:64px;top:56px">${marca(true)}</div>
  <div style="position:absolute;left:64px;right:64px;top:170px;text-align:center">
    <div style="font-size:24px;font-weight:800;letter-spacing:4px;color:var(--vivo)">CELULAR · TABLET · PC</div>
    <h1 class="d" style="font-size:112px;color:var(--noche);margin-top:14px">También desde tu PC</h1>
  </div>
  <div style="position:absolute;left:60px;top:470px;width:960px">
    <div style="background:#0b0f0d;border-radius:28px 28px 0 0;padding:18px 18px 22px;box-shadow:0 50px 100px rgba(0,0,0,.3)"><img src="${tela("d_home")}" style="width:100%;border-radius:10px;display:block"></div>
    <div style="height:30px;background:linear-gradient(#cfd2cf,#9da19e);border-radius:0 0 26px 26px;margin:0 -50px;box-shadow:0 30px 50px rgba(0,0,0,.25)"></div>
  </div>
  ${phone("m_loja", "left:800px;top:640px;transform:scale(.6);transform-origin:top left")}
  ${barraUrl(true)}
</div>`, `💻 ${SITE} también desde tu PC.\nMismo catálogo, misma cotización por WhatsApp, en la pantalla que prefieras.\n\n${TAGS}`);

// 9. Bento: tudo que o site tem
const tiles = [
  ["999", "repuestos con foto", "var(--oro)", "var(--noche)"],
  ["19", "departamentos con envío", "#fff", "var(--noche)"],
  ["PDF", "catálogos gratis", "var(--vivo)", "#fff"],
  ["1 min", "para crear tu cuenta", "#fff", "var(--noche)"],
  ["24/7", "el sitio siempre abierto", "#1e293b", "#fff"],
  [WA, "precio por WhatsApp", "var(--whats)", "#06381b"],
];
add("09_todo_en_un_sitio", `<div class="l oscuro grano"><div class="grid"></div>
  <div style="position:absolute;left:64px;top:56px">${marca()}</div>
  <h1 class="d" style="position:absolute;left:64px;top:170px;width:950px;font-size:96px">Todo en un solo <span style="color:var(--oro)">sitio</span></h1>
  <div style="position:absolute;left:64px;right:64px;top:400px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px">
    ${tiles.map(([n, t, bg, c], k) => `<div style="background:${bg};color:${c};border-radius:30px;padding:28px;height:${k === 0 || k === 5 ? 330 : 290}px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 20px 40px rgba(0,0,0,.25)"><div class="d" style="font-size:${String(n).length > 4 ? 64 : 96}px">${n}</div><div style="font-size:24px;font-weight:800;line-height:1.15">${t}</div></div>`).join("")}
  </div>
  ${barraUrl()}
</div>`, `Todo en un solo sitio 👇\n• 999 repuestos con foto\n• Envíos a los 19 departamentos\n• Catálogos en PDF gratis\n• Cuenta gratis en 1 minuto\n• Sitio abierto 24/7\n• Precio por WhatsApp\n\n👉 ${SITE}\n\n${TAGS}`);

// 10. Trio de celulares
add("10_tres_pantallas", `<div class="l crema grano">
  <div style="position:absolute;left:64px;top:56px">${marca(true)}</div>
  <h1 class="d" style="position:absolute;left:64px;right:64px;top:170px;text-align:center;font-size:100px;color:var(--noche)">Buscá. Elegí. <span style="color:var(--vivo)">Cotizá.</span></h1>
  ${phone("m_home", "left:20px;top:420px;transform:rotate(-9deg) scale(.82)")}
  ${phone("m_produto", "left:640px;top:420px;transform:rotate(9deg) scale(.82)")}
  ${phone("m_loja", "left:325px;top:370px;z-index:3")}
  ${barraUrl(true)}
</div>`, `Buscá. Elegí. Cotizá. 🔎🛒💬\nAsí de simple es comprar repuestos en ${SITE}.\n\n${TAGS}`);

// ---- Stories ----
const story = (nome, img, titulo, sub, leg) =>
  add(nome, `<div class="l s oscuro grano"><div class="grid"></div>
    <div style="position:absolute;left:72px;top:140px">${marca()}</div>
    <h1 class="d" style="position:absolute;left:72px;right:72px;top:280px;font-size:118px">${titulo}</h1>
    <p style="position:absolute;left:72px;right:72px;top:580px;font-size:36px;color:#cfe6d7">${sub}</p>
    ${phone(img, "left:300px;top:720px;transform:rotate(4deg) scale(1.05)")}
    <div class="pill" style="position:absolute;left:50%;bottom:150px;transform:translateX(-50%);background:var(--oro);color:var(--noche);font-size:38px;padding:26px 42px">Tocá el enlace 👆</div>
  </div>`, leg, true);
story("11_story_sitio", "m_home", `Conocé <span style="color:var(--oro)">${SITE}</span>`, "Repuestos agrícolas con envío a todo Uruguay.", "Story: sticker de enlace a agropartsuy.com sobre el botón.");
story("12_story_catalogos", "m_home_catalogos", `Catálogos <span style="color:var(--oro)">gratis</span>`, "Creá tu cuenta y abrilos desde el celular.", "Story: sticker de enlace a agropartsuy.com/catalogos.");
story("13_story_pedido", "m_pedido", `Pedido <span style="color:var(--oro)">rápido</span>`, "Pegá tu lista de códigos y cotizá todo junto.", "Story: sticker de enlace a agropartsuy.com/pedido-rapido.");

// ---- Render ----
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const pg = await b.newPage();
const tmp = path.join(OUT, "_tmp.html");
for (const p of posts) {
  const h = p.story ? 1920 : 1350;
  await pg.setViewportSize({ width: 1080, height: h });
  fs.writeFileSync(tmp, `<!doctype html><meta charset="utf-8">${BASE}<body>${p.html}</body>`);
  await pg.goto(pathToFileURL(tmp).href, { waitUntil: "networkidle" });
  await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: path.join(OUT, p.nome + ".png"), clip: { x: 0, y: 0, width: 1080, height: h } });
  console.log("ok", p.nome);
}
fs.writeFileSync(path.join(OUT, "legendas.md"), ["# Leyendas · Conocé el sitio", "", ...posts.flatMap((p) => [`## ${p.nome}.png`, "", p.legenda, ""])].join("\n"));
fs.writeFileSync(tmp, `<!doctype html><body style="margin:0;background:#111"><div style="display:grid;grid-template-columns:repeat(5,300px);gap:6px;padding:6px;align-items:start">${posts.map((p) => `<img src="${pathToFileURL(path.join(OUT, p.nome + ".png")).href}" style="width:300px">`).join("")}</div>`);
await pg.setViewportSize({ width: 1540, height: 800 });
await pg.goto(pathToFileURL(tmp).href, { waitUntil: "load" });
await pg.waitForTimeout(600);
await pg.screenshot({ path: path.join(OUT, "mosaico.png"), fullPage: true });
fs.rmSync(tmp, { force: true });
await b.close();
console.log(`${posts.length} artes em ${OUT}`);
