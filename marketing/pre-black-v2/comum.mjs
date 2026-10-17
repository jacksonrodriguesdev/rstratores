// Base visual da PRÉ-BLACK v2 (capas, cards de produto, kit e stories) — espanhol e português.
// Efeitos 3D em CSS (perspectiva, parede de fotos, texto em relevo, moeda dourada, cartão com
// espessura e reflexo), renderizados pelo Chromium do Playwright.
// Fotos: só as da agrotrator.com.br (loja própria), da seleção em ../produtos-50/selecao.json.
import fs from "fs";
import path from "path";
import { createRequire } from "module";

export const RAIZ = process.cwd();
const require = createRequire(path.join(RAIZ, "package.json"));
const { chromium } = require("playwright");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const L = require("lucide-react");

// Desconto da pré-Black no site (Admin → Campanhas e cupons). Mudou lá? Troque aqui e gere de novo.
export const DESCONTO = 20;
export const pct = `-${DESCONTO}%`;

export const PASTA = path.join(RAIZ, "marketing/pre-black-v2");
const SELECAO = JSON.parse(
  fs.readFileSync(path.join(RAIZ, "marketing/produtos-50/selecao.json"), "utf8"),
);

// Fotos baixadas uma vez para .fotos/ (fora do git) e usadas como data URI: cada arte carrega
// dezenas de fotos (parede 3D) e buscar tudo na loja a cada imagem falhava às vezes.
const CACHE = path.join(RAIZ, "marketing/pre-black-v2/.fotos");
fs.mkdirSync(CACHE, { recursive: true });
async function local(url) {
  const arq = path.join(CACHE, url.split("/").pop().replace(/[^\w.-]/g, "_"));
  if (!fs.existsSync(arq)) {
    for (let k = 0; ; k++) {
      try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(`${r.status} ${url}`);
        fs.writeFileSync(arq, Buffer.from(await r.arrayBuffer()));
        break;
      } catch (e) {
        if (k >= 3) throw e;
        await new Promise((ok) => setTimeout(ok, 1500));
      }
    }
  }
  const ext = arq.toLowerCase().endsWith(".png") ? "png" : "jpeg";
  return `data:image/${ext};base64,${fs.readFileSync(arq).toString("base64")}`;
}
export const PECAS = [];
for (const p of SELECAO) PECAS.push({ ...p, url: p.img, img: await local(p.img) });
export const dataUri = (arq) => `data:image/png;base64,${fs.readFileSync(arq).toString("base64")}`;
export const LOGO = dataUri(path.join(RAIZ, "public/logo.png"));
export const ico = (n, s = 32, w = 2) =>
  renderToStaticMarkup(React.createElement(L[n] ?? L.Wrench, { size: s, strokeWidth: w }));
export const slug = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

// Estamos na PRÉ-Black (o desconto já vale); a Black Friday vai de 27 a 30/11.
export const TXT = {
  es: {
    pre: "PRE",
    preBlack: "PRE BLACK",
    chip: "PRE BLACK FRIDAY",
    ja: "YA EN PRE BLACK",
    jaComecou: "YA EMPEZÓ",
    comeca: "La Black empieza el 27/11",
    periodo: "Black Friday · 27 al 30 de noviembre",
    todo: "en todo el sitio",
    para: "Para",
    codigo: "CÓDIGO",
    cta: `${pct} en agropartsuy.com`,
    site: "agropartsuy.com",
    envio: "Envíos por DAC a todo Uruguay",
    zap: "Cotizá por WhatsApp",
    lema: "REPUESTOS AGRÍCOLAS",
    desliza: "Deslizá",
    pecas: "repuestos",
    nome: (p) => p.es,
    cat: (p) => p.cat_es,
  },
  pt: {
    pre: "PRÉ",
    preBlack: "PRÉ-BLACK",
    chip: "PRÉ-BLACK FRIDAY",
    ja: "JÁ NA PRÉ-BLACK",
    jaComecou: "JÁ COMEÇOU",
    comeca: "A Black começa em 27/11",
    periodo: "Black Friday · 27 a 30 de novembro",
    todo: "em todo o site",
    para: "Para",
    codigo: "CÓDIGO",
    cta: `${pct} em agropartsuy.com/pt`,
    site: "agropartsuy.com/pt",
    envio: "Envio para todo o RS",
    zap: "Peça pelo WhatsApp",
    lema: "PEÇAS AGRÍCOLAS",
    desliza: "Arraste",
    pecas: "peças",
    nome: (p) => p.pt,
    cat: (p) => p.cat_pt,
  },
};

// Texto em relevo: camadas de sombra (espessura) + sombra projetada
export const relevo = (topo = "#c99a06", fundo = "#5a4300", camadas = 14) =>
  Array.from({ length: camadas }, (_, i) => {
    const k = i / (camadas - 1);
    const mix = (a, b) =>
      Math.round(parseInt(a, 16) + (parseInt(b, 16) - parseInt(a, 16)) * k)
        .toString(16)
        .padStart(2, "0");
    const c = `#${mix(topo.slice(1, 3), fundo.slice(1, 3))}${mix(topo.slice(3, 5), fundo.slice(3, 5))}${mix(topo.slice(5, 7), fundo.slice(5, 7))}`;
    return `${i + 1}px ${i + 1}px 0 ${c}`;
  }).join(",") + `, ${camadas + 6}px ${camadas + 16}px 40px rgba(0,0,0,.65)`;

export const CSS = `
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=Inter+Tight:wght@500;600;700;800&family=JetBrains+Mono:wght@800&display=swap" rel="stylesheet">
<style>
  :root { --oro:#f5c518; --oro2:#ffe27a; --oro3:#a77c00; --negro:#050505; --gris:#a1a1aa }
  * { box-sizing:border-box; margin:0; padding:0 }
  body { font-family:"Inter Tight",system-ui,sans-serif; -webkit-font-smoothing:antialiased; background:#000 }
  .l { position:relative; overflow:hidden; background:var(--negro); color:#fff }
  .d { font-family:"Archivo",sans-serif; font-weight:900; font-stretch:64%; line-height:.86; text-transform:uppercase; letter-spacing:-1px }
  .mono { font-family:"JetBrains Mono",monospace }

  /* Parede 3D de fotos */
  .cena { position:absolute; inset:0; perspective:1500px; perspective-origin:50% 30% }
  .parede { position:absolute; display:grid; gap:26px; transform-style:preserve-3d }
  .parede i { display:block; aspect-ratio:1; background:#fff; border-radius:26px; overflow:hidden;
      box-shadow:0 40px 50px rgba(0,0,0,.55), inset 0 -10px 0 rgba(0,0,0,.06) }
  .parede img { width:100%; height:100%; object-fit:contain; padding:14%; display:block }
  .veu { position:absolute; inset:0; pointer-events:none }

  /* Luz e grão */
  .luz { position:absolute; border-radius:50%; filter:blur(60px); pointer-events:none }
  .feixe { position:absolute; width:900px; height:1100px; background:radial-gradient(40% 60% at 50% 0%, rgba(255,226,122,.22), transparent 70%);
      filter:blur(30px); pointer-events:none }

  /* Moeda dourada do desconto */
  .moeda { position:absolute; border-radius:50%; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#2b1f00;
      background:radial-gradient(circle at 32% 26%, #fff8cf 0%, #ffe27a 18%, #f5c518 42%, #c99a06 70%, #7a5a00 100%);
      box-shadow: inset 0 -14px 24px rgba(0,0,0,.35), inset 0 12px 22px rgba(255,255,255,.55), 0 0 0 6px rgba(0,0,0,.25), 0 30px 60px rgba(0,0,0,.65), 0 0 80px rgba(245,197,24,.35) }
  .moeda::before { content:""; position:absolute; inset:7%; border-radius:50%; border:3px dashed rgba(90,67,0,.35) }
  .moeda small { font-weight:800; letter-spacing:3px; z-index:1 }
  .moeda b { font-family:"Archivo",sans-serif; font-weight:900; font-stretch:62%; line-height:.85; z-index:1; text-shadow:0 2px 0 rgba(255,255,255,.45) }

  /* Vidro */
  .vidro { background:linear-gradient(150deg, rgba(255,255,255,.14), rgba(255,255,255,.03)); border:1px solid rgba(255,255,255,.16);
      backdrop-filter:blur(16px) saturate(140%); -webkit-backdrop-filter:blur(16px); border-radius:34px; box-shadow:0 30px 60px rgba(0,0,0,.45) }
  .pill { display:inline-flex; align-items:center; gap:10px; border-radius:999px; font-weight:800; white-space:nowrap }
  .pill-oro { background:linear-gradient(180deg,#ffe27a,#f5c518 55%,#d9a90a); color:#1a1300; box-shadow:0 10px 30px rgba(245,197,24,.35), inset 0 1px 0 rgba(255,255,255,.6) }
  .pill-vidro { background:rgba(255,255,255,.1); border:1px solid rgba(255,255,255,.2); backdrop-filter:blur(10px) }

  /* Cartão 3D da peça (espessura dourada + reflexo) */
  .palco { position:absolute; perspective:1600px }
  .cartao { position:absolute; inset:0; background:#fff; border-radius:44px; transform-style:preserve-3d;
      -webkit-box-reflect: below 22px linear-gradient(transparent 72%, rgba(255,255,255,.22)) }
  .cartao img { position:absolute; inset:0; width:100%; height:100%; object-fit:contain; padding:9% }

  .marca { display:flex; align-items:center; gap:14px }
  .marca img { width:60px; height:60px; background:#fff; border-radius:18px; padding:5px; box-shadow:0 10px 30px rgba(0,0,0,.4) }
  .marca b { display:block; font-family:"Archivo"; font-size:28px; font-weight:900; font-stretch:88% }
  .marca span { display:block; font-size:12px; font-weight:800; letter-spacing:4px; color:var(--oro) }
</style>`;

// Espessura do cartão 3D (lado e baixo dourados) + sombra no chão
export const espessura = (dx = 1, dy = 1, n = 16) =>
  Array.from({ length: n }, (_, i) => {
    const k = i / (n - 1);
    const c = k < 0.15 ? "#ffe27a" : k < 0.6 ? "#d9a90a" : "#8a6500";
    return `${(i + 1) * dx}px ${(i + 1) * dy}px 0 ${c}`;
  }).join(",") + `, ${n * dx + 30}px ${n * dy + 70}px 90px rgba(0,0,0,.75)`;

export const marca = (t) =>
  `<div class="marca"><img src="${LOGO}"><div><b>AGRO PARTS</b><span>${t.lema}</span></div></div>`;

export const moeda = (t, tam, estilo = "") =>
  `<div class="moeda" style="width:${tam}px;height:${tam}px;${estilo}"><small style="font-size:${tam * 0.075}px">${t.preBlack}</small><b style="font-size:${tam * 0.4}px">${pct}</b></div>`;

// Parede 3D: fotos repetidas num plano inclinado que some no escuro
export function parede(fotos, o = {}) {
  const { cols = 7, linhas = 8, rx = 58, rz = -24, x = -620, y = -260, w = 2300, opac = 1, gap = 26, blur = 0 } = o;
  const n = cols * linhas;
  const lista = Array.from({ length: n }, (_, i) => fotos[(i * 7 + Math.floor(i / cols) * 3) % fotos.length]);
  return `<div class="cena"><div class="parede" style="left:${x}px;top:${y}px;width:${w}px;gap:${gap}px;grid-template-columns:repeat(${cols},1fr);transform:rotateX(${rx}deg) rotateZ(${rz}deg);opacity:${opac};filter:blur(${blur}px)">${lista
    .map((f) => `<i><img src="${f}"></i>`)
    .join("")}</div></div>`;
}

export async function abrir() {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  const falhas = [];
  const render = async (html, arq, w = 1080, h = 1350) => {
    await pg.setViewportSize({ width: w, height: h });
    await pg.setContent(
      `<!doctype html><html><head><meta charset="utf-8">${CSS}</head><body><div class="l" style="width:${w}px;height:${h}px">${html}</div></body></html>`,
      { waitUntil: "networkidle" },
    );
    await pg.evaluate(() => document.fonts.ready);
    const ok = await pg.evaluate(() =>
      [...document.images].every((im) => im.complete && im.naturalWidth > 0),
    );
    if (!ok) falhas.push(arq);
    fs.mkdirSync(path.dirname(arq), { recursive: true });
    await pg.screenshot({ path: arq, clip: { x: 0, y: 0, width: w, height: h } });
  };
  const mosaico = async (arqs, destino, colunas = 10) => {
    await pg.setViewportSize({ width: 1600, height: 1000 });
    await pg.setContent(
      `<body style="margin:0;background:#18181b;padding:16px;display:grid;grid-template-columns:repeat(${colunas},1fr);gap:8px">${arqs
        .map((a) => `<img src="${dataUri(a)}" style="width:100%;border-radius:6px">`)
        .join("")}</body>`,
      { waitUntil: "load" },
    );
    await pg.screenshot({ path: destino, fullPage: true });
  };
  return { render, mosaico, falhas, fechar: () => b.close() };
}
