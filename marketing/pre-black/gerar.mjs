// Kit de Instagram da PRÉ-BLACK FRIDAY 2026 (feed 4:5, carrosséis e stories 9:16).
// Uso (raiz do projeto):  node marketing/pre-black/gerar.mjs
// Saída: marketing/pre-black/saida/*.png + mosaico.png. Legendas em marketing/pre-black/legendas.md
//
// Sem fotos de peças (parte das fotos do catálogo veio de outra loja): os produtos aparecem
// pelo código, nome, marca e ícone da categoria. Sem % de desconto fixo nas artes: os descontos
// são os que estiverem em Admin → Campanhas e cupons quando a pré-Black entrar no ar.
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const RAIZ = process.cwd();
const require = createRequire(path.join(RAIZ, "package.json"));
const { chromium } = require("playwright");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const L = require("lucide-react");

const OUT = path.join(RAIZ, "marketing/pre-black/saida");
fs.mkdirSync(OUT, { recursive: true });
// Imagens embutidas (página em branco não carrega arquivos locais)
const dataUri = (arq) => `data:image/png;base64,${fs.readFileSync(arq).toString("base64")}`;
const LOGO = dataUri(path.join(RAIZ, "public/logo.png"));
const SITE = "agropartsuy.com";

const ico = (nome, size = 64, stroke = 1.6, cor = "currentColor") =>
  renderToStaticMarkup(
    React.createElement(L[nome] ?? L.Wrench, { size, strokeWidth: stroke, color: cor }),
  );

// ---------------------------------------------------------------- datas (Uruguai)
const PRE = "28 de octubre";
const BLACK = "27 al 30 de noviembre";

// ---------------------------------------------------------------- peças (do banco, com preço)
const PECAS = [
  { cod: "PSH211", nome: "Filtro hidráulico", marca: "Massey Ferguson", cat: "Filtros", ico: "Funnel" },
  { cod: "83063502", nome: "Kit de embrague plato + disco", marca: "Massey Ferguson", cat: "Embragues", ico: "Disc3", extra: "Marca LuK" },
  { cod: "F000510701", nome: "Bomba hidráulica doble", marca: "Massey Ferguson", cat: "Hidráulica", ico: "Droplets" },
  { cod: "LA5013", nome: "Rodamiento 30208", marca: "Valtra", cat: "Rodamientos", ico: "CircleDot" },
  { cod: "685121530", nome: "Correa del alternador", marca: "Valtra", cat: "Transmisión", ico: "Repeat2" },
  { cod: "1482841", nome: "Motor de arranque 12V 3kW", marca: "Massey Ferguson", cat: "Eléctrica", ico: "Zap" },
];
const CATS = [
  ["Funnel", "Filtros"],
  ["Disc3", "Embragues y frenos"],
  ["Droplets", "Hidráulica"],
  ["CircleDot", "Rodamientos"],
  ["Cog", "Transmisión"],
  ["Zap", "Eléctrica"],
];

// ---------------------------------------------------------------- estilo
const RUIDO = `url("data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>',
)}")`;

const BASE = `
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=JetBrains+Mono:wght@700;800&display=swap" rel="stylesheet">
<style>
  :root { --oro:#f5c518; --oro2:#ffdf6b; --negro:#060606; --gris:#a1a1aa; --linea:rgba(255,255,255,.12); --verde:#25D366 }
  * { box-sizing:border-box; margin:0; padding:0 }
  body { font-family:"Archivo",system-ui,sans-serif; -webkit-font-smoothing:antialiased; background:#000 }
  .lienzo { position:relative; overflow:hidden; background:var(--negro); color:#fff }
  .brillo { position:absolute; inset:0; background:
      radial-gradient(60% 45% at 85% 8%, rgba(245,197,24,.28), transparent 70%),
      radial-gradient(55% 40% at 0% 100%, rgba(245,197,24,.16), transparent 70%) }
  .ruido { position:absolute; inset:0; background-image:${RUIDO}; opacity:.07; mix-blend-mode:overlay }
  .grade { position:absolute; inset:0; opacity:.07; background-image:
      linear-gradient(var(--linea) 1px, transparent 1px), linear-gradient(90deg, var(--linea) 1px, transparent 1px);
      background-size:90px 90px; mask-image:radial-gradient(70% 60% at 50% 40%, #000, transparent) }
  .cinta { position:absolute; left:-60px; right:-60px; height:64px; background:var(--oro); color:#000; display:flex;
      align-items:center; gap:34px; white-space:nowrap; font-weight:900; font-size:26px; letter-spacing:3px;
      font-stretch:75%; box-shadow:0 10px 40px rgba(245,197,24,.25) }
  .cinta i { font-style:normal; opacity:.55 }
  .marca { display:flex; align-items:center; gap:14px }
  .marca img { width:60px; height:60px; background:#fff; border-radius:16px; padding:5px }
  .marca b { display:block; font-size:28px; font-weight:900; letter-spacing:.5px; font-stretch:88% }
  .marca span { display:block; font-size:12px; font-weight:800; letter-spacing:4px; color:var(--oro) }
  .titulo { font-weight:900; font-stretch:68%; line-height:.86; letter-spacing:-1px; text-transform:uppercase }
  .oro { color:var(--oro) }
  .contorno { color:transparent; -webkit-text-stroke:3px var(--oro) }
  .chip { display:inline-flex; align-items:center; gap:10px; border-radius:999px; font-weight:800; letter-spacing:2px; text-transform:uppercase }
  .chip-oro { background:var(--oro); color:#000 }
  .chip-borde { border:2px solid rgba(245,197,24,.6); color:var(--oro) }
  .vidro { background:linear-gradient(160deg, rgba(255,255,255,.09), rgba(255,255,255,.02)); border:1px solid rgba(255,255,255,.12);
      border-radius:34px; backdrop-filter:blur(8px) }
  .mono { font-family:"JetBrains Mono",ui-monospace,monospace }
  .cta { display:inline-flex; align-items:center; gap:14px; font-weight:900; border-radius:999px }
  .num { font-weight:900; font-stretch:62%; line-height:.8; letter-spacing:-4px }
  .pie { position:absolute; display:flex; align-items:center; justify-content:space-between; font-weight:800; color:var(--gris); letter-spacing:2px; font-size:18px }
</style>`;

const fundo = () => `<div class="brillo"></div><div class="grade"></div><div class="ruido"></div>`;
const marca = () =>
  `<div class="marca"><img src="${LOGO}"><div><b>AGRO PARTS</b><span>REPUESTOS AGRÍCOLAS</span></div></div>`;
const cinta = (top, rot = -4, txt = "PRE BLACK FRIDAY") =>
  `<div class="cinta" style="top:${top}px;transform:rotate(${rot}deg)">${Array.from({ length: 8 }, () => `<span>${txt}</span><i>✦</i>`).join("")}</div>`;
const pie = (w, h, pag, total) =>
  `<div class="pie" style="left:72px;right:72px;bottom:54px"><span>${SITE.toUpperCase()}</span>${
    pag ? `<span>${pag}/${total}</span>` : ""
  }<span class="oro">${pag && pag < total ? "DESLIZÁ →" : "LINK EN LA BIO"}</span></div>`;
const zap = (size = 34) =>
  `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg>`;

const ARTES = [];
const add = (nome, w, h, corpo) =>
  ARTES.push({ nome, w, h, html: `<div class="lienzo" style="width:${w}px;height:${h}px">${fundo()}${corpo}</div>` });
const F = [1080, 1350];
const S = [1080, 1920];

// ================================================================ CARROSSEL A — Se viene la Black
const TA = 6;
add("A1_capa_faltan_30_dias", ...F, `
  <div style="position:absolute;left:72px;top:64px">${marca()}</div>
  <div class="chip chip-borde" style="position:absolute;right:72px;top:78px;padding:12px 22px;font-size:20px">${ico("CalendarDays", 24, 2)} 27—30 NOV</div>
  <div style="position:absolute;left:72px;top:230px">
    <div class="chip chip-oro" style="padding:12px 26px;font-size:30px">PRE</div>
    <div class="titulo" style="font-size:250px;margin-top:22px">Black<br><span class="contorno">Friday</span></div>
  </div>
  ${cinta(860, -5, "SE VIENE LA BLACK")}
  <div style="position:absolute;left:72px;bottom:150px;display:flex;align-items:flex-end;gap:26px">
    <div class="num oro" style="font-size:300px">30</div>
    <div style="padding-bottom:36px"><div class="titulo" style="font-size:78px">días</div><div style="font-size:30px;font-weight:700;color:var(--gris);margin-top:10px">para la Black Friday<br>de AGRO PARTS</div></div>
  </div>
  ${pie(...F, 1, TA)}`);

add("A2_como_funciona", ...F, `
  <div style="position:absolute;left:72px;top:64px">${marca()}</div>
  <div class="titulo" style="position:absolute;left:72px;top:200px;font-size:132px">¿Cómo<br><span class="oro">funciona?</span></div>
  <div style="position:absolute;left:72px;right:72px;top:520px;display:grid;gap:26px">
    ${[
      ["Timer", "Desde el " + PRE, "PRE BLACK", "Cuenta regresiva y las primeras piezas con precio especial en el sitio."],
      ["Flame", BLACK, "BLACK FRIDAY", "Los descuentos de la campaña en repuestos para tractores y cosechadoras."],
      ["Bell", "Para no perderte nada", "AVISOS", "Creá tu cuenta en el sitio y te avisamos por e-mail cuando empiece."],
    ]
      .map(
        ([i, quando, t, txt], k) => `
      <div class="vidro" style="display:flex;gap:28px;align-items:center;padding:30px 34px">
        <div style="flex:none;width:96px;height:96px;border-radius:28px;background:${k === 1 ? "var(--oro)" : "rgba(245,197,24,.12)"};color:${k === 1 ? "#000" : "var(--oro)"};display:flex;align-items:center;justify-content:center">${ico(i, 50, 1.8)}</div>
        <div><div style="font-size:18px;font-weight:800;letter-spacing:3px;color:var(--oro)">${quando.toUpperCase()}</div>
        <div class="titulo" style="font-size:52px;margin-top:6px">${t}</div>
        <div style="font-size:24px;color:#d4d4d8;margin-top:8px;line-height:1.35">${txt}</div></div>
      </div>`,
      )
      .join("")}
  </div>
  ${pie(...F, 2, TA)}`);

add("A3_categorias", ...F, `
  <div style="position:absolute;left:72px;top:64px">${marca()}</div>
  <div class="titulo" style="position:absolute;left:72px;top:190px;font-size:120px">Precio de<br><span class="oro">pre Black</span> en</div>
  <div style="position:absolute;left:72px;right:72px;top:470px;display:grid;grid-template-columns:1fr 1fr;gap:22px">
    ${CATS.map(
      ([i, n]) => `<div class="vidro" style="height:190px;padding:28px;display:flex;flex-direction:column;justify-content:space-between">
        <div class="oro">${ico(i, 60, 1.6)}</div><div class="titulo" style="font-size:48px">${n}</div></div>`,
    ).join("")}
  </div>
  <div style="position:absolute;left:72px;right:72px;bottom:130px;font-size:24px;color:var(--gris)">Massey Ferguson · Valtra · John Deere · New Holland · Case IH y más</div>
  ${pie(...F, 3, TA)}`);

add("A4_arma_tu_lista", ...F, `
  <div style="position:absolute;left:72px;top:64px">${marca()}</div>
  <div class="titulo" style="position:absolute;left:72px;top:190px;font-size:128px">Armá tu<br><span class="oro">lista</span> para<br>la zafra</div>
  <div class="vidro" style="position:absolute;left:72px;right:72px;top:620px;padding:40px 44px;display:grid;gap:22px">
    ${["Filtros de aceite, aire y combustible", "Kit de embrague", "Correas", "Rodamientos", "Bomba hidráulica", "Motor de arranque"]
      .map(
        (t, k) => `<div style="display:flex;align-items:center;gap:22px;font-size:36px;font-weight:700">
        <span style="width:46px;height:46px;border-radius:12px;flex:none;display:flex;align-items:center;justify-content:center;${k < 3 ? "background:var(--oro);color:#000" : "border:3px solid rgba(255,255,255,.3)"}">${k < 3 ? ico("Check", 30, 3.2) : ""}</span>${t}</div>`,
      )
      .join("")}
  </div>
  <div style="position:absolute;left:72px;bottom:120px;font-size:26px;color:#d4d4d8">Guardá este post y buscá cada pieza por el <b class="oro">código</b>.</div>
  ${pie(...F, 4, TA)}`);

add("A5_cupon_misterioso", ...F, `
  <div style="position:absolute;left:72px;top:64px">${marca()}</div>
  <div class="titulo" style="position:absolute;left:72px;top:200px;font-size:132px">Cupón<br><span class="oro">misterioso</span></div>
  <div style="position:absolute;left:72px;right:72px;top:560px;height:380px;border-radius:40px;border:4px dashed var(--oro);display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(245,197,24,.06)">
    <div style="font-size:22px;font-weight:800;letter-spacing:5px;color:var(--gris)">TU CÓDIGO</div>
    <div class="mono oro" style="font-size:150px;letter-spacing:22px;margin-top:10px;filter:blur(1px)">? ? ? ?</div>
    <div class="chip chip-oro" style="padding:12px 24px;font-size:22px;margin-top:20px">${ico("Lock", 24, 2.4)} SE REVELA PRONTO</div>
  </div>
  <div style="position:absolute;left:72px;right:72px;top:1000px;font-size:30px;line-height:1.35;color:#d4d4d8">Activá las notificaciones y entrá a <b>${SITE}/cupones</b> para verlo apenas se revele.</div>
  ${pie(...F, 5, TA)}`);

add("A6_cta", ...F, `
  <div style="position:absolute;left:72px;top:64px">${marca()}</div>
  ${cinta(250, 4, "BLACK FRIDAY 27—30 NOV")}
  <div class="titulo" style="position:absolute;left:72px;top:440px;font-size:150px">Que no te<br><span class="oro">agarre</span><br>sin repuesto</div>
  <div style="position:absolute;left:72px;bottom:150px;display:grid;gap:22px">
    <div class="cta" style="background:var(--oro);color:#000;padding:28px 42px;font-size:36px">${ico("ArrowUpRight", 38, 2.6)} ${SITE}/black-friday</div>
    <div class="cta" style="background:var(--verde);color:#063b1b;padding:24px 38px;font-size:32px">${zap(36)} Cotizá por WhatsApp</div>
  </div>
  ${pie(...F, 6, TA)}`);

// ================================================================ CARROSSEL B — Produtos
const TB = PECAS.length + 2;
add("B1_capa_productos", ...F, `
  <div style="position:absolute;left:72px;top:64px">${marca()}</div>
  <div class="chip chip-oro" style="position:absolute;left:72px;top:200px;padding:12px 24px;font-size:24px">PRE BLACK FRIDAY</div>
  <div class="titulo" style="position:absolute;left:72px;top:280px;font-size:150px">Ya con<br>precio de<br><span class="oro">pre Black</span></div>
  <div style="position:absolute;left:72px;right:72px;top:820px;display:grid;grid-template-columns:repeat(3,1fr);gap:18px">
    ${PECAS.map(
      (p) => `<div class="vidro" style="border-radius:24px;padding:20px 18px;height:150px;display:flex;flex-direction:column;justify-content:space-between">
        <div class="oro">${ico(p.ico, 34, 1.8)}</div><div class="mono" style="font-size:24px;font-weight:800;letter-spacing:1px">${p.cod}</div></div>`,
    ).join("")}
  </div>
  ${pie(...F, 1, TB)}`);

PECAS.forEach((p, k) =>
  add(`B${k + 2}_producto_${p.cod.toLowerCase()}`, ...F, `
  <div style="position:absolute;left:72px;top:64px">${marca()}</div>
  <div class="chip chip-borde" style="position:absolute;right:72px;top:76px;padding:12px 22px;font-size:20px">PRE BLACK</div>
  <div style="position:absolute;right:-120px;top:150px;color:rgba(245,197,24,.09)">${ico(p.ico, 760, 1)}</div>
  <div style="position:absolute;left:72px;top:250px;width:150px;height:150px;border-radius:44px;background:var(--oro);color:#000;display:flex;align-items:center;justify-content:center;box-shadow:0 30px 80px rgba(245,197,24,.3)">${ico(p.ico, 86, 1.8)}</div>
  <div style="position:absolute;left:72px;top:450px;font-size:22px;font-weight:800;letter-spacing:5px;color:var(--gris)">${p.cat.toUpperCase()} · ${p.marca.toUpperCase()}</div>
  <div class="titulo" style="position:absolute;left:72px;right:72px;top:500px;font-size:112px">${p.nome}</div>
  <div class="vidro" style="position:absolute;left:72px;right:72px;top:860px;padding:30px 36px;display:flex;align-items:center;justify-content:space-between">
    <div><div style="font-size:18px;font-weight:800;letter-spacing:5px;color:var(--gris)">CÓDIGO</div>
    <div class="mono oro" style="font-size:66px;font-weight:800;letter-spacing:2px;margin-top:4px">${p.cod}</div></div>
    <div style="text-align:right;font-size:24px;font-weight:700;color:#d4d4d8;line-height:1.35">${p.extra ? p.extra + "<br>" : ""}Buscalo en<br><b style="color:#fff">${SITE}</b></div>
  </div>
  <div class="cta" style="position:absolute;left:72px;bottom:140px;background:var(--oro);color:#000;padding:24px 36px;font-size:30px">${ico("Tag", 32, 2.4)} Precio de pre Black en el sitio</div>
  ${pie(...F, k + 2, TB)}`),
);

add(`B${TB}_cta_productos`, ...F, `
  <div style="position:absolute;left:72px;top:64px">${marca()}</div>
  <div class="titulo" style="position:absolute;left:72px;top:220px;font-size:140px">¿No está<br>tu <span class="oro">pieza</span>?</div>
  <div class="vidro" style="position:absolute;left:72px;right:72px;top:620px;padding:44px;display:grid;gap:26px;font-size:34px;font-weight:700">
    <div style="display:flex;gap:20px;align-items:center"><span class="oro">${ico("Search", 44, 2.2)}</span>Buscá por el código del fabricante</div>
    <div style="display:flex;gap:20px;align-items:center"><span class="oro">${ico("Camera", 44, 2.2)}</span>O mandanos una foto de la pieza</div>
    <div style="display:flex;gap:20px;align-items:center"><span class="oro">${ico("Truck", 44, 2.2)}</span>Enviamos por DAC a todo Uruguay</div>
  </div>
  <div class="cta" style="position:absolute;left:72px;bottom:150px;background:var(--verde);color:#063b1b;padding:28px 42px;font-size:36px">${zap(40)} Cotizá por WhatsApp</div>
  ${pie(...F, TB, TB)}`);

// ================================================================ STORIES 9:16
// Zona segura: nada importante nos 250 px de cima e 300 px de baixo (barra e botão do Instagram)
const storyContagem = (n, rotulo, sub, arq) =>
  add(arq, ...S, `
  <div style="position:absolute;left:72px;top:250px">${marca()}</div>
  ${cinta(430, -6)}
  <div style="position:absolute;left:0;right:0;top:620px;text-align:center">
    <div style="font-size:30px;font-weight:800;letter-spacing:8px;color:var(--gris)">${rotulo}</div>
    <div class="num oro" style="font-size:${String(n).length > 2 ? 300 : 520}px;margin-top:${String(n).length > 2 ? 90 : 30}px;text-shadow:0 0 80px rgba(245,197,24,.35)">${n}</div>
    <div class="titulo" style="font-size:120px;margin-top:10px">${sub}</div>
    <div style="font-size:34px;font-weight:700;color:#d4d4d8;margin-top:34px">Black Friday AGRO PARTS<br><span class="oro">${BLACK}</span></div>
  </div>
  <div class="cta" style="position:absolute;left:50%;transform:translateX(-50%);bottom:360px;background:var(--oro);color:#000;padding:26px 44px;font-size:32px">${ico("Bell", 34, 2.4)} Activá el aviso</div>`);

storyContagem(30, "FALTAN", "días", "S1_story_faltan_30");
storyContagem(15, "FALTAN", "días", "S2_story_faltan_15");
storyContagem(7, "FALTAN", "días", "S3_story_faltan_7");
storyContagem("MAÑANA", "LA BLACK EMPIEZA", "00:00 h", "S4_story_manana");

add("S5_story_empezo_pre_black", ...S, `
  <div style="position:absolute;left:72px;top:250px">${marca()}</div>
  <div class="chip chip-oro" style="position:absolute;left:72px;top:400px;padding:14px 28px;font-size:30px">YA EMPEZÓ</div>
  <div class="titulo" style="position:absolute;left:72px;top:490px;font-size:230px">Pre<br><span class="contorno">Black</span><br><span class="oro">Friday</span></div>
  <div style="position:absolute;left:72px;right:72px;top:1180px;display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
    ${PECAS.slice(0, 6).map((p) => `<div class="vidro" style="border-radius:24px;padding:18px;height:130px;display:flex;flex-direction:column;justify-content:space-between"><span class="oro">${ico(p.ico, 30, 1.8)}</span><span class="mono" style="font-size:22px;font-weight:800">${p.cod}</span></div>`).join("")}
  </div>
  <div class="cta" style="position:absolute;left:50%;transform:translateX(-50%);bottom:360px;background:var(--oro);color:#000;padding:26px 44px;font-size:32px">${ico("ArrowUpRight", 34, 2.6)} Ver ofertas</div>`);

add("S6_story_encuesta", ...S, `
  <div style="position:absolute;left:72px;top:250px">${marca()}</div>
  <div class="titulo" style="position:absolute;left:72px;right:72px;top:420px;font-size:150px">¿Qué<br>repuesto<br>vas a <span class="oro">necesitar</span><br>en la Black?</div>
  <div style="position:absolute;left:90px;right:90px;top:1120px;height:300px;border:3px dashed rgba(245,197,24,.45);border-radius:36px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:rgba(255,255,255,.35);letter-spacing:3px">PONÉ ACÁ EL STICKER DE ENCUESTA</div>
  <div style="position:absolute;left:0;right:0;bottom:380px;text-align:center;font-size:30px;color:#d4d4d8">Filtros · Embrague · Hidráulica · Rodamientos</div>`);

add("S7_story_cupon_misterioso", ...S, `
  <div style="position:absolute;left:72px;top:250px">${marca()}</div>
  <div class="titulo" style="position:absolute;left:72px;top:420px;font-size:170px">Cupón<br><span class="oro">misterioso</span></div>
  <div style="position:absolute;left:72px;right:72px;top:860px;height:440px;border-radius:44px;border:5px dashed var(--oro);display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(245,197,24,.06)">
    <div style="font-size:26px;font-weight:800;letter-spacing:6px;color:var(--gris)">TU CÓDIGO</div>
    <div class="mono oro" style="font-size:170px;letter-spacing:24px;margin-top:10px;filter:blur(1.5px)">????</div>
    <div class="chip chip-oro" style="padding:14px 28px;font-size:26px;margin-top:24px">${ico("Lock", 28, 2.4)} SE REVELA PRONTO</div>
  </div>
  <div class="cta" style="position:absolute;left:50%;transform:translateX(-50%);bottom:360px;background:var(--oro);color:#000;padding:26px 44px;font-size:32px">${ico("Ticket", 34, 2.4)} ${SITE}/cupones</div>`);

PECAS.slice(0, 3).forEach((p, k) =>
  add(`S${8 + k}_story_producto_${p.cod.toLowerCase()}`, ...S, `
  <div style="position:absolute;left:72px;top:250px">${marca()}</div>
  <div style="position:absolute;right:-200px;top:420px;color:rgba(245,197,24,.09)">${ico(p.ico, 980, 1)}</div>
  <div class="chip chip-oro" style="position:absolute;left:72px;top:420px;padding:14px 28px;font-size:28px">PRE BLACK</div>
  <div style="position:absolute;left:72px;top:540px;width:190px;height:190px;border-radius:54px;background:var(--oro);color:#000;display:flex;align-items:center;justify-content:center">${ico(p.ico, 110, 1.8)}</div>
  <div style="position:absolute;left:72px;top:790px;font-size:26px;font-weight:800;letter-spacing:6px;color:var(--gris)">${p.marca.toUpperCase()}</div>
  <div class="titulo" style="position:absolute;left:72px;right:72px;top:840px;font-size:150px">${p.nome}</div>
  <div class="vidro" style="position:absolute;left:72px;right:72px;top:1260px;padding:30px 36px">
    <div style="font-size:20px;font-weight:800;letter-spacing:6px;color:var(--gris)">CÓDIGO</div>
    <div class="mono oro" style="font-size:80px;font-weight:800;letter-spacing:2px">${p.cod}</div>
  </div>
  <div class="cta" style="position:absolute;left:50%;transform:translateX(-50%);bottom:360px;background:var(--oro);color:#000;padding:26px 44px;font-size:32px;white-space:nowrap">${ico("Tag", 34, 2.4)} Ver precio de pre Black</div>`),
);

// ---------------------------------------------------------------- gera
const b = await chromium.launch();
const pg = await b.newPage({ deviceScaleFactor: 1 });
for (const a of ARTES) {
  await pg.setViewportSize({ width: a.w, height: a.h });
  await pg.setContent(`<!doctype html><html><head><meta charset="utf-8">${BASE}</head><body>${a.html}</body></html>`, {
    waitUntil: "networkidle",
  });
  await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: path.join(OUT, `${a.nome}.png`), clip: { x: 0, y: 0, width: a.w, height: a.h } });
  console.log("✔", a.nome);
}
// Mosaico para ver tudo de uma vez
const feed = ARTES.filter((a) => a.h === 1350).map((a) => a.nome);
const st = ARTES.filter((a) => a.h === 1920).map((a) => a.nome);
const img = (n) => dataUri(path.join(OUT, `${n}.png`));
await pg.setViewportSize({ width: 1600, height: 1000 });
await pg.setContent(`<body style="margin:0;background:#18181b;padding:30px;font-family:sans-serif;color:#fff">
  <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:12px">${feed.map((n) => `<img src="${img(n)}" style="width:100%;border-radius:8px">`).join("")}</div>
  <div style="display:grid;grid-template-columns:repeat(10,1fr);gap:12px;margin-top:20px">${st.map((n) => `<img src="${img(n)}" style="width:100%;border-radius:8px">`).join("")}</div></body>`, { waitUntil: "load" });
await pg.screenshot({ path: path.join(OUT, "mosaico.png"), fullPage: true });
await b.close();
console.log(`\n${ARTES.length} artes em ${path.relative(RAIZ, OUT)}`);
