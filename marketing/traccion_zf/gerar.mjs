// Carrossel do Instagram (1080×1080): componentes de tração ZF com foto, em espanhol e português.
// Layout inspirado nas referências do dono (capa com faixa oliva e título enorme, peça por slide
// com faixa clara e barra escura, arte final com hexágono verde e barra de contato).
//
// Uso (raiz do projeto):  node marketing/traccion_zf/gerar.mjs
// Saída: marketing/traccion_zf/saida/es/ e saida/pt/ (PNGs + legendas.md) e saida/mosaico_<idioma>.png
//
// Peças: fotos em fotos/ (da loja agrotrator, do próprio dono). Todas com estoque no dia da
// criação; confira antes de publicar de novo. Fotos de trator: Wikimedia Commons com licença de
// uso comercial; o crédito do autor vai em cada arte (não remova).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const RAIZ = process.cwd();
const DIR = path.join(RAIZ, "marketing/traccion_zf");
const { chromium } = require(path.join(RAIZ, "node_modules/playwright"));
const url = (p) => pathToFileURL(path.join(RAIZ, p)).href;

const SITE = "agropartsuy.com";
const WHATS_NUM = "+55 (53) 99942-8130";
const INSTAGRAM = "@agroparts";
const LOGO = url("public/logo.png");

// Fotos de trator (licença de uso comercial, com crédito)
const FUNDOS = {
  capa: { arq: "marketing/transmision/fotos/massey-ferguson.jpg", credito: "David Wright · CC BY 2.0" },
  valtra: { arq: "marketing/transmision/fotos/valtra.jpg", credito: "blodgett esq. · CC BY 2.0" },
  massey: { arq: "marketing/posts_pecas/fotos/massey-5465.jpg", credito: "Juan Emilio Prades Bel · CC BY 4.0" },
  final: { arq: "marketing/posts_pecas/fotos/valtra-franca.jpg", credito: "PtiBzh · CC0" },
};

// Peças (título grande + complemento), por idioma
const PECAS = [
  { sku: "87530800Z", cod: "87530800", marca: "Valtra", es: ["CORONA", "Y PIÑÓN", "Conjunto completo, listo para montar."], pt: ["COROA", "E PINHÃO", "Conjunto completo, pronto para montar."] },
  { sku: "87539400Z", cod: "87539400", marca: "Valtra", es: ["CORONA", "TRACCIÓN DELANTERA", "Corona del eje de tracción delantera."], pt: ["COROA", "TRAÇÃO DIANTEIRA", "Coroa do eixo de tração dianteira."] },
  { sku: "87531600Z", cod: "87531600", marca: "Valtra", es: ["CAJA", "DEL DIFERENCIAL", "Caja de satélites del diferencial."], pt: ["GAIOLA", "DO DIFERENCIAL", "Gaiola de satélites do diferencial."] },
  { sku: "87532000Z", cod: "87532000", marca: "Valtra", es: ["PLANETARIO", "DEL DIFERENCIAL", "Engranaje planetario del diferencial."], pt: ["PLANETÁRIA", "DO DIFERENCIAL", "Engrenagem planetária do diferencial."] },
  { sku: "82799700Z", cod: "82799700", marca: "Valtra", es: ["CARCASA", "DE ARTICULACIÓN", "Lado derecho del eje delantero."], pt: ["CARCAÇA", "DE ARTICULAÇÃO", "Lado direito do eixo dianteiro."] },
  { sku: "81622700Z", cod: "81622700", marca: "Valtra", es: ["CRUCETA", "335", "Cruceta para la transmisión de tracción."], pt: ["CRUZETA", "335", "Cruzeta para a transmissão de tração."] },
  { sku: "80772900Z", cod: "80772900", marca: "Valtra", es: ["PORTA", "PLANETARIOS", "Soporte de los planetarios del cubo."], pt: ["PORTA", "PLANETÁRIA", "Suporte das planetárias do cubo."] },
  { sku: "033728Z", cod: "033728", marca: "Massey Ferguson", es: ["CUBO", "TRACCIÓN DELANTERA", "Cubo del eje de tracción delantera."], pt: ["CUBO", "TRAÇÃO DIANTEIRA", "Cubo do eixo de tração dianteira."] },
  { sku: "3603216Z", cod: "3603216", marca: "Massey Ferguson", es: ["ENGRANAJE", "DEL EJE DELANTERO", "Engranaje de la tracción delantera."], pt: ["ENGRENAGEM", "DO EIXO DIANTEIRO", "Engrenagem da tração dianteira."] },
  { sku: "3603219Z", cod: "3603219", marca: "Massey Ferguson", es: ["EJE", "DE ACCIONAMIENTO", "Accionamiento de la tracción delantera."], pt: ["EIXO", "DE ACIONAMENTO", "Acionamento da tração dianteira."] },
  { sku: "040663Z", cod: "040663", marca: "Massey Ferguson", es: ["CARCASA", "DEL EJE DELANTERO", "Carcasa del eje de tracción delantera."], pt: ["CARCAÇA", "DO EIXO DIANTEIRO", "Carcaça do eixo de tração dianteira."] },
];

const T = {
  es: {
    capa1: "TRAC", capa2: "CIÓN", capaZf: "ZF",
    capaSub: "REPUESTOS PARA TU TRACTOR",
    capaTxt: "Coronas, planetarios, crucetas, cubos y carcasas para Valtra y Massey Ferguson.",
    desliza: "Deslizá y mirá los repuestos",
    linha: "Línea ZF · tracción delantera",
    para: (m) => `Para tractor ${m}`,
    cod: "Cód.",
    cta: "Consultá precio por WhatsApp",
    envio: "Envíos a todo Uruguay",
    final: ["Hacé la revisión", "PREVENTIVA", "de la", "TRACCIÓN", "DELANTERA."],
    final2: ["¡Tené + ", "durabilidad", " en el ", "campo", "!"],
    leia: ["Leé la", "descripción."],
    foto: "Foto",
    editada: "editada",
  },
  pt: {
    capa1: "TRA", capa2: "ÇÃO", capaZf: "ZF",
    capaSub: "PEÇAS PARA O SEU TRATOR",
    capaTxt: "Coroas, planetárias, cruzetas, cubos e carcaças para Valtra e Massey Ferguson.",
    desliza: "Arraste e veja as peças",
    linha: "Linha ZF · tração dianteira",
    para: (m) => `Para trator ${m}`,
    cod: "Cód.",
    cta: "Consulte o preço no WhatsApp",
    envio: "Envio para todo o RS",
    final: ["Faça a revisão", "PREVENTIVA", "da", "TRAÇÃO", "DIANTEIRA."],
    final2: ["Tenha + ", "durabilidade", " no ", "campo", "!"],
    leia: ["Leia a", "legenda."],
    foto: "Foto",
    editada: "editada",
  },
};

// ---------- peças de desenho (vetores próprios) ----------
const WHATS = `<svg class="ico" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg>`;
const ICONES = {
  trator: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8 30V20h14l4 10"/><path d="M22 20v-8h8l3 8"/><path d="M30 28h10v6"/><circle cx="14" cy="34" r="7"/><circle cx="14" cy="34" r="2"/><circle cx="37" cy="36" r="4.5"/></svg>`,
  engrenagem: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M24 5v6M24 37v6M43 24h-6M11 24H5M37.4 10.6l-4.2 4.2M14.8 33.2l-4.2 4.2M37.4 37.4l-4.2-4.2M14.8 14.8l-4.2-4.2"/><circle cx="24" cy="24" r="11"/><path d="M24 29c0-4 2-6 5-7-3 0-5 1-5 3 0-2-2-3-5-3 3 1 5 3 5 7Z"/></svg>`,
  broto: `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M24 40V22"/><path d="M24 26c0-7 5-11 13-11 0 8-5 11-13 11Z"/><path d="M24 22c0-6-4-9-11-9 0 7 4 9 11 9Z"/><path d="M10 40h28"/></svg>`,
};
const icones = (cls = "") =>
  `<div class="icones ${cls}">${["trator", "engrenagem", "broto"].map((k) => `<span>${ICONES[k]}</span>`).join("")}</div>`;
// Folha desenhada (com desfoque para dar profundidade, como nas referências)
const folha = (x, y, tam, rot, desfoque = 0, op = 0.95) =>
  `<svg class="folha" style="left:${x}px;top:${y}px;width:${tam}px;height:${tam}px;transform:rotate(${rot}deg);filter:blur(${desfoque}px);opacity:${op}" viewBox="0 0 100 100"><defs><linearGradient id="f${x}${y}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#b6e05a"/><stop offset=".55" stop-color="#5fa823"/><stop offset="1" stop-color="#2f6b12"/></linearGradient></defs><path d="M50 4C78 18 92 46 82 72 74 92 50 98 50 98S26 92 18 72C8 46 22 18 50 4Z" fill="url(#f${x}${y})"/><path d="M50 10V94M50 40 30 28M50 56 70 42M50 72 32 62" stroke="#e8f7c8" stroke-opacity=".55" stroke-width="2.2" fill="none"/></svg>`;
// Hexágono com cantos arredondados (polígono com contorno grosso da mesma cor)
const hexagono = (w, h, cor, contorno = cor, esp = 34) =>
  `<svg viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" class="hex"><polygon points="${w * 0.25},${esp / 2 + 6} ${w * 0.75},${esp / 2 + 6} ${w - esp / 2 - 6},${h / 2} ${w * 0.75},${h - esp / 2 - 6} ${w * 0.25},${h - esp / 2 - 6} ${esp / 2 + 6},${h / 2}" fill="${cor}" stroke="${contorno}" stroke-width="${esp}" stroke-linejoin="round"/></svg>`;

const CSS = `
:root{--lima:#8cc63f;--lima2:#5fa823;--oliva:#4b5320;--oliva2:#2c3112;--crema:#f3efe8;--cobre:#b5652b;--tinta:#3a3f17}
*{margin:0;padding:0;box-sizing:border-box}
body{width:1080px;height:1080px;overflow:hidden;font-family:"Montserrat",system-ui,sans-serif;-webkit-font-smoothing:antialiased;background:#1d2109}
.arte{position:relative;width:1080px;height:1080px;overflow:hidden}
.abs{position:absolute}
.fundo{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.folha{position:absolute;z-index:6;pointer-events:none}
.icones{display:flex;gap:14px}
.icones span{width:78px;height:78px;background:#fff;display:flex;align-items:center;justify-content:center;color:var(--tinta)}
.icones span svg{width:50px;height:50px}
.ico{width:1em;height:1em;flex-shrink:0}
.credito{position:absolute;z-index:9;font-size:13px;color:rgba(255,255,255,.75);letter-spacing:.02em}
.logo{height:64px}
.hex{display:block}
`;
const pagina = (corpo) =>
  `<!doctype html><html><head><meta charset="utf-8"><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800;900&display=swap" rel="stylesheet"><style>${CSS}</style></head><body>${corpo}</body></html>`;

// ---------- 1. Capa ----------
function capa(t) {
  const f = FUNDOS.capa;
  return pagina(`<div class="arte">
  <img class="fundo" src="${url(f.arq)}" style="object-position:12% 62%;transform:scale(1.12);transform-origin:80% 60%">
  <div class="abs" style="inset:0;background:linear-gradient(180deg,rgba(30,22,6,.55) 0%,rgba(80,52,10,.15) 40%,rgba(10,14,4,.75) 100%)"></div>
  <div class="abs" style="right:-120px;top:-160px;width:720px;height:720px;background:radial-gradient(circle,rgba(255,196,92,.55),rgba(255,160,40,0) 65%)"></div>
  ${icones("abs").replace('class="icones abs"', 'class="icones abs" style="left:50%;top:70px;transform:translateX(-50%);z-index:5"')}
  <div class="abs" style="left:0;top:250px;width:650px;height:350px;background:rgba(75,83,32,.94);z-index:4;padding:34px 0 0 52px">
    <div style="font-size:178px;font-weight:900;color:#fff;line-height:.84;letter-spacing:-4px">${t.capa1}</div>
    <div style="font-size:178px;font-weight:900;color:#fff;line-height:.84;letter-spacing:-4px;display:flex;align-items:flex-end;gap:18px">${t.capa2}<span style="font-size:92px;color:var(--lima);letter-spacing:-2px;margin-bottom:8px">${t.capaZf}</span></div>
  </div>
  <div class="abs" style="left:52px;top:612px;z-index:5;font-size:38px;font-weight:800;color:#fff;letter-spacing:.5px">${t.capaSub}</div>
  <div class="abs" style="left:0;top:670px;width:650px;height:150px;background:rgba(44,49,18,.9);z-index:4;padding:24px 52px;font-size:28px;font-weight:600;color:#c7e08f;line-height:1.32">${t.capaTxt}</div>
  <div class="abs" style="left:52px;bottom:58px;z-index:5;display:flex;align-items:center;gap:22px"><img class="logo" src="${LOGO}"><div style="color:#fff;font-weight:800;font-size:28px">${SITE}</div></div>
  <div class="abs" style="right:52px;bottom:64px;z-index:5;display:flex;align-items:center;gap:12px;background:var(--lima);color:var(--oliva2);font-weight:800;font-size:26px;padding:16px 26px;border-radius:999px">${t.desliza} <span style="font-size:32px">→</span></div>
  ${folha(60, 40, 150, -30, 3)}${folha(860, 230, 120, 40, 1)}${folha(590, 680, 110, 120, 2)}${folha(930, 820, 190, 20, 6, 0.85)}
  <div class="credito" style="right:18px;bottom:16px">${t.foto}: ${f.credito} (${t.editada})</div>
</div>`);
}

// ---------- 2. Uma peça por arte ----------
function peca(t, idioma, p, n, total) {
  const [titulo, comp, desc] = p[idioma];
  const f = p.marca === "Valtra" ? FUNDOS.valtra : FUNDOS.massey;
  const tam = 130; // reduzido na página até caber (data-ajustar)
  return pagina(`<div class="arte" style="background:var(--crema)">
  <div class="abs" style="left:0;top:0;width:1080px;height:370px;overflow:hidden">
    <img class="fundo" src="${url(f.arq)}" style="object-position:50% ${p.marca === "Valtra" ? "62%" : "55%"}">
    <div class="abs" style="inset:0;background:linear-gradient(180deg,rgba(255,170,60,.35),rgba(60,40,8,.25))"></div>
    <div class="abs" style="right:-80px;top:-140px;width:520px;height:520px;background:radial-gradient(circle,rgba(255,214,120,.75),rgba(255,180,60,0) 62%)"></div>
  </div>
  <div class="abs" style="left:0;top:370px;width:1080px;height:380px;background:var(--crema)"></div>
  <div class="abs" style="left:56px;top:400px;z-index:3;width:530px">
    <div style="display:inline-block;background:var(--oliva);color:#d6ec9f;font-weight:800;font-size:20px;letter-spacing:1.5px;padding:8px 16px;margin-bottom:14px">${t.linha.toUpperCase()}</div>
    <div data-ajustar style="font-size:${tam}px;font-weight:900;color:var(--tinta);line-height:.95;letter-spacing:-3px;white-space:nowrap;width:530px;overflow:hidden">${titulo}</div>
    <div data-ajustar style="margin-top:8px;font-size:44px;font-weight:800;color:var(--cobre);letter-spacing:.5px;white-space:nowrap;width:530px;overflow:hidden">${comp}</div>
    <div style="margin-top:12px;font-size:23px;font-weight:600;color:#4c5130;line-height:1.3"><div data-ajustar style="white-space:nowrap;width:530px;overflow:hidden">${desc}</div><b style="color:var(--tinta)">${t.para(p.marca)}</b></div>
  </div>
  <div class="abs" style="right:56px;top:240px;z-index:5;width:420px;height:420px;background:#fff;border-radius:28px;box-shadow:0 30px 60px rgba(40,30,8,.35);display:flex;align-items:center;justify-content:center;padding:28px">
    <img src="${url(`marketing/traccion_zf/fotos/${p.sku}.jpg`)}" style="max-width:100%;max-height:100%;object-fit:contain">
    <div class="abs" style="left:-18px;bottom:-22px;background:var(--lima);color:var(--oliva2);font-weight:900;font-size:30px;padding:12px 22px;border-radius:14px;box-shadow:0 10px 24px rgba(0,0,0,.2)">${t.cod} ${p.cod}</div>
  </div>
  <div class="abs" style="left:0;top:750px;width:1080px;height:330px;background:var(--oliva2)"></div>
  <div class="abs" style="left:56px;top:788px;z-index:4">
    <div style="display:flex;align-items:center;gap:16px;color:#fff;font-weight:800;font-size:34px">${WHATS.replace('class="ico"', 'class="ico" style="color:#25D366;width:46px;height:46px"')}${t.cta}</div>
    <div style="margin-top:12px;font-size:44px;font-weight:900;color:var(--lima);letter-spacing:.5px">${WHATS_NUM}</div>
    <div style="margin-top:22px;display:flex;align-items:center;gap:20px"><img class="logo" style="height:56px" src="${LOGO}"><div style="color:#e6edd2;font-weight:700;font-size:24px;line-height:1.35">${SITE}<br><span style="color:#aab58a;font-weight:600">${t.envio}</span></div></div>
  </div>
  ${icones("abs").replace('class="icones abs"', 'class="icones abs" style="right:56px;top:952px;z-index:4;transform:scale(.82);transform-origin:right top"')}
  <div class="abs" style="right:56px;top:792px;z-index:4;color:#aab58a;font-weight:800;font-size:24px">${String(n).padStart(2, "0")} / ${String(total).padStart(2, "0")}</div>
  ${folha(-30, 290, 120, -40, 3)}${folha(560, 690, 80, 150, 1)}${folha(960, 640, 140, 30, 6, 0.75)}
  <div class="credito" style="left:16px;top:12px;text-shadow:0 1px 3px rgba(0,0,0,.6)">${t.foto}: ${f.credito} (${t.editada})</div>
</div>`);
}

// ---------- 3. Arte final ----------
function final(t) {
  const f = FUNDOS.final;
  const [a, b, c, d, e] = t.final;
  const [g1, g2, g3, g4, g5] = t.final2;
  return pagina(`<div class="arte">
  <img class="fundo" src="${url(f.arq)}" style="object-position:58% 60%;transform:scale(1.35);transform-origin:62% 55%">
  <div class="abs" style="inset:0;background:linear-gradient(180deg,rgba(255,255,255,.18),rgba(255,236,190,.15) 60%,rgba(255,255,255,.55))"></div>
  <div class="abs" style="left:-150px;top:-120px;z-index:3">${hexagono(860, 760, "url(#gradHex)")}</div>
  <svg width="0" height="0" class="abs"><defs><linearGradient id="gradHex" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#5fa823"/><stop offset="1" stop-color="#a6d93f"/></linearGradient></defs></svg>
  <div class="abs" style="left:-120px;top:-90px;z-index:2;opacity:.9">${hexagono(860, 760, "none", "rgba(255,255,255,.75)", 3)}</div>
  <div class="abs" style="left:96px;top:150px;z-index:4;color:#fff">
    <div style="font-size:40px;font-weight:600">${a}</div>
    <div style="font-size:84px;font-weight:900;line-height:.95;letter-spacing:-1px">${b}</div>
    <div style="font-size:84px;font-weight:900;line-height:.95;letter-spacing:-1px"><span style="font-weight:600;font-size:60px">${c} </span>${d}</div>
    <div style="font-size:84px;font-weight:900;line-height:.95;letter-spacing:-1px">${e}</div>
    <div style="margin-top:26px;font-size:36px;font-weight:600;line-height:1.2">${g1}<b style="font-weight:800">${g2}</b><br>${g3}<b style="font-weight:800">${g4}</b>${g5}</div>
    <div style="margin-top:30px;display:flex;align-items:center;gap:14px;color:#e3f6b8;font-size:24px;font-weight:600;line-height:1.1"><svg viewBox="0 0 48 40" width="54" height="46" fill="none" stroke="#e3f6b8" stroke-width="3"><rect x="3" y="3" width="42" height="26" rx="4"/><path d="M14 29l-5 8 12-8"/><circle cx="15" cy="16" r="2.2" fill="#e3f6b8"/><circle cx="24" cy="16" r="2.2" fill="#e3f6b8"/><circle cx="33" cy="16" r="2.2" fill="#e3f6b8"/></svg><span><b>${t.leia[0]}</b><br>${t.leia[1]}</span></div>
  </div>
  <div class="abs" style="left:0;top:880px;width:1080px;height:46px;z-index:3;background:linear-gradient(90deg,#9b7a45,#c9a46a,#8d6c3b)"></div>
  <div class="abs" style="left:24px;top:858px;z-index:4;width:420px;height:90px;border-radius:22px;background:linear-gradient(90deg,#5fa823,#8cc63f);display:flex;align-items:center;justify-content:flex-start;padding-left:26px;gap:10px;color:#fff;font-weight:800;font-size:27px">${WHATS.replace('class="ico"', 'class="ico" style="width:34px;height:34px"')}${WHATS_NUM}</div>
  <div class="abs" style="left:636px;top:858px;z-index:4;width:420px;height:90px;border-radius:22px;background:linear-gradient(90deg,#8cc63f,#5fa823);display:flex;align-items:center;justify-content:flex-end;padding-right:40px;gap:12px;color:#fff;font-weight:800;font-size:30px"><svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="#fff" stroke-width="2.2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.3" cy="6.7" r="1.1" fill="#fff"/></svg>${INSTAGRAM}</div>
  <div class="abs" style="left:390px;top:770px;z-index:5;filter:drop-shadow(0 18px 30px rgba(0,0,0,.3))">${hexagono(300, 270, "#fff", "#fff", 28)}</div>
  <img class="abs" src="${LOGO}" style="left:440px;top:835px;width:200px;z-index:6">
  ${folha(780, 690, 110, 30, 0)}${folha(330, 930, 120, -150, 2)}${folha(940, 120, 160, 60, 6, 0.8)}
  <div class="credito" style="right:18px;top:14px;color:rgba(40,40,20,.75)">${t.foto}: ${f.credito} (${t.editada})</div>
</div>`);
}

// ---------- legendas ----------
function legendas(idioma) {
  const lista = PECAS.map((p) => `• ${p[idioma][0][0] + p[idioma][0].slice(1).toLowerCase()} ${p[idioma][1].toLowerCase()} — ${p.marca} — Cód. ${p.cod}`).join("\n");
  if (idioma === "es")
    return `⚙️ Repuestos de tracción ZF para tu tractor Valtra y Massey Ferguson.

Coronas, planetarios, crucetas, cubos y carcasas del eje delantero, con código original para que compres la pieza justa.

${lista}

🔧 La revisión preventiva de la tracción delantera evita que la máquina pare en plena zafra.

📲 Consultá precio por WhatsApp: ${WHATS_NUM}
🌐 ${SITE} — envíos a todo Uruguay.

#repuestosagricolas #tractores #valtra #masseyferguson #zf #tracciondelantera #maquinariaagricola #agro #uruguay #campo`;
  return `⚙️ Peças de tração ZF para seu trator Valtra e Massey Ferguson.

Coroas, planetárias, cruzetas, cubos e carcaças do eixo dianteiro, com código original para você comprar a peça certa.

${lista}

🔧 A revisão preventiva da tração dianteira evita que a máquina pare no meio da safra.

📲 Consulte o preço no WhatsApp: ${WHATS_NUM}
🌐 ${SITE}/pt — envio para todo o Rio Grande do Sul.

#pecasagricolas #trator #valtra #masseyferguson #zf #tracaodianteira #maquinasagricolas #agro #riograndedosul #campo`;
}

// ---------- gerar ----------
const b = await chromium.launch();
const pag = await b.newPage({ viewport: { width: 1080, height: 1080 } });
for (const idioma of ["es", "pt"]) {
  const t = T[idioma];
  const saida = path.join(DIR, "saida", idioma);
  fs.mkdirSync(saida, { recursive: true });
  const total = PECAS.length + 2;
  const artes = [
    ["01_capa", capa(t)],
    ...PECAS.map((p, i) => [`${String(i + 2).padStart(2, "0")}_${p.sku}`, peca(t, idioma, p, i + 2, total)]),
    [`${String(total).padStart(2, "0")}_final`, final(t)],
  ];
  const arquivos = [];
  for (const [nome, html] of artes) {
    const tmp = path.join(saida, `_tmp.html`);
    fs.writeFileSync(tmp, html);
    await pag.goto(pathToFileURL(tmp).href, { waitUntil: "networkidle" });
    await pag.evaluate(async () => {
      await document.fonts.ready;
      for (const el of document.querySelectorAll("[data-ajustar]")) {
        let t = parseFloat(getComputedStyle(el).fontSize);
        while (el.scrollWidth > el.clientWidth && t > 20) el.style.fontSize = `${(t -= 2)}px`;
      }
    });
    const arq = path.join(saida, `${nome}.png`);
    await pag.screenshot({ path: arq });
    arquivos.push(arq);
    fs.unlinkSync(tmp);
  }
  fs.writeFileSync(path.join(saida, "legendas.md"), legendas(idioma) + "\n");
  // Mosaico para conferir a sequência
  const mosaico = `<!doctype html><body style="margin:0;background:#111;display:grid;grid-template-columns:repeat(5,300px);gap:8px;padding:8px">${arquivos.map((a) => `<img src="${pathToFileURL(a).href}" style="width:300px">`).join("")}</body>`;
  const tmp = path.join(saida, "_mosaico.html");
  fs.writeFileSync(tmp, mosaico);
  await pag.setViewportSize({ width: 1556, height: 1000 });
  await pag.goto(pathToFileURL(tmp).href);
  await pag.waitForTimeout(500);
  await pag.screenshot({ path: path.join(DIR, "saida", `mosaico_${idioma}.png`), fullPage: true });
  fs.unlinkSync(tmp);
  await pag.setViewportSize({ width: 1080, height: 1080 });
  console.log(`${idioma}: ${arquivos.length} artes em ${path.relative(RAIZ, saida)}`);
}
await b.close();
