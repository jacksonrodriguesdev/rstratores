// Estilo, textos e utilidades comuns das artes da pré-Black (peças e capas).
import fs from "fs";
import path from "path";
import { createRequire } from "module";

export const RAIZ = process.cwd();
const require = createRequire(path.join(RAIZ, "package.json"));
export const { chromium } = require("playwright");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const L = require("lucide-react");

// Desconto da pré-Black que está no site (Admin → Campanhas e cupons). 0 = artes sem %.
// Mudou no admin? Troque aqui e gere de novo.
export const DESCONTO = 20;
export const pct = DESCONTO ? `-${DESCONTO}%` : "";

export const PASTA = path.join(RAIZ, "marketing/produtos-50");
export const PECAS = JSON.parse(fs.readFileSync(path.join(PASTA, "selecao.json"), "utf8"));
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

// Estamos na PRÉ-Black: o desconto já vale; a Black Friday começa em 27/11.
export const TXT = {
  es: {
    chip: "PRE BLACK FRIDAY",
    ja: "YA EN PRE BLACK",
    comeca: "LA BLACK EMPIEZA EL 27/11",
    aplic: "Para",
    codigo: "CÓDIGO",
    cta: DESCONTO ? `${pct} de pre Black en agropartsuy.com` : "Precio de pre Black en agropartsuy.com",
    curto: DESCONTO ? `${pct} en todo el sitio` : "Precio de pre Black en el sitio",
    todo: "EN TODO EL SITIO",
    envio: "Envíos por DAC a todo Uruguay",
    zap: "Cotizá por WhatsApp",
    lema: "REPUESTOS AGRÍCOLAS",
    desliza: "DESLIZÁ",
    pecas: "repuestos",
    nome: (p) => p.es,
    cat: (p) => p.cat_es,
  },
  pt: {
    chip: "PRÉ-BLACK FRIDAY",
    ja: "JÁ NA PRÉ-BLACK",
    comeca: "A BLACK COMEÇA EM 27/11",
    aplic: "Para",
    codigo: "CÓDIGO",
    cta: DESCONTO ? `${pct} de pré-Black em agropartsuy.com/pt` : "Preço de pré-Black em agropartsuy.com/pt",
    curto: DESCONTO ? `${pct} em todo o site` : "Preço de pré-Black no site",
    todo: "EM TODO O SITE",
    envio: "Envio para todo o RS",
    zap: "Peça pelo WhatsApp",
    lema: "PEÇAS AGRÍCOLAS",
    desliza: "ARRASTE",
    pecas: "peças",
    nome: (p) => p.pt,
    cat: (p) => p.cat_pt,
  },
};

export const CSS = `
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=JetBrains+Mono:wght@800&display=swap" rel="stylesheet">
<style>
  :root { --oro:#f5c518; --negro:#060606; --gris:#a1a1aa }
  * { box-sizing:border-box; margin:0; padding:0 }
  body { font-family:"Archivo",system-ui,sans-serif; -webkit-font-smoothing:antialiased; background:#000 }
  .l { position:relative; width:1080px; height:1350px; overflow:hidden; background:var(--negro); color:#fff }
  .brillo { position:absolute; inset:0; background:radial-gradient(55% 40% at 90% 5%, rgba(245,197,24,.25), transparent 70%), radial-gradient(50% 35% at 0% 100%, rgba(245,197,24,.14), transparent 70%) }
  .marca { position:absolute; left:64px; top:56px; display:flex; align-items:center; gap:14px; z-index:3 }
  .marca img { width:58px; height:58px; background:#fff; border-radius:16px; padding:5px }
  .marca b { display:block; font-size:27px; font-weight:900; font-stretch:88% }
  .marca span { display:block; font-size:12px; font-weight:800; letter-spacing:4px; color:var(--oro) }
  .chip { position:absolute; right:64px; top:66px; z-index:3; background:var(--oro); color:#000; font-weight:900; font-size:20px; letter-spacing:2px; padding:12px 22px; border-radius:999px }
  .t { font-weight:900; font-stretch:68%; line-height:.9; letter-spacing:-.5px; text-transform:uppercase; text-wrap:balance }
  .meta { font-size:20px; font-weight:800; letter-spacing:4px; color:var(--gris); text-transform:uppercase }
  .cod { display:inline-flex; align-items:center; gap:16px; border:2px solid rgba(245,197,24,.55); border-radius:18px; padding:12px 20px }
  .cod small { font-size:15px; font-weight:800; letter-spacing:4px; color:var(--gris) }
  .cod b { font-family:"JetBrains Mono",monospace; font-size:40px; color:var(--oro); letter-spacing:1px }
  .cta { display:flex; align-items:center; gap:12px; background:var(--oro); color:#000; font-weight:900; font-size:27px; padding:20px 30px; border-radius:999px; width:max-content }
  .rodape { display:flex; gap:28px; font-size:21px; font-weight:700; color:#d4d4d8 }
  .rodape span { display:flex; align-items:center; gap:8px }
  .rodape svg { color:var(--oro) }
  .foto { width:100%; height:100%; object-fit:contain }
  .cinta { position:absolute; background:var(--oro); color:#000; font-weight:900; font-size:22px; letter-spacing:3px; padding:10px 0; text-align:center; font-stretch:80% }
  .selo { position:absolute; z-index:4; width:190px; height:190px; border-radius:50%; background:var(--oro); color:#000; display:flex; flex-direction:column; align-items:center; justify-content:center; box-shadow:0 20px 60px rgba(0,0,0,.45); transform:rotate(-10deg) }
  .selo small { font-size:15px; font-weight:900; letter-spacing:2px }
  .selo b { font-size:64px; font-weight:900; font-stretch:70%; line-height:.9 }
</style>`;

export const cab = (t) =>
  `<div class="brillo"></div><div class="marca"><img src="${LOGO}"><div><b>AGRO PARTS</b><span>${t.lema}</span></div></div><div class="chip">${t.chip}</div>`;
// Selo redondo "PRE BLACK -20%" (some se DESCONTO = 0)
export const selo = (t, estilo) =>
  DESCONTO
    ? `<div class="selo" style="${estilo}"><small>${t.chip.split(" FRIDAY")[0]}</small><b>${pct}</b></div>`
    : "";

export async function abrir() {
  const b = await chromium.launch();
  const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  const render = async (html, arq, w = 1080, h = 1350) => {
    await pg.setViewportSize({ width: w, height: h });
    await pg.setContent(`<!doctype html><html><head><meta charset="utf-8">${CSS}</head><body>${html}</body></html>`, {
      waitUntil: "networkidle",
    });
    await pg.evaluate(() => document.fonts.ready);
    const ok = await pg.evaluate(() => [...document.images].every((im) => im.complete && im.naturalWidth > 0));
    await pg.screenshot({ path: arq, clip: { x: 0, y: 0, width: w, height: h } });
    return ok;
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
  return { render, mosaico, fechar: () => b.close() };
}
