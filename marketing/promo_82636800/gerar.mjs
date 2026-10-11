// Propaganda do Kit Motor Sisu Valtra 82636800 (KS) em promoção — espanhol e português.
// Uso (raiz do projeto): node marketing/promo_82636800/gerar.mjs
// Saída: marketing/promo_82636800/saida/{es,pt}/ (feed 1080x1350, story 1080x1920, legendas.md)
// Preços: edite CONFIG abaixo (os $U seguem a cotação do dia do site; confira antes de postar).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const RAIZ = process.cwd();
const DIR = path.join(RAIZ, "marketing/promo_82636800");
const { chromium } = require(path.join(RAIZ, "node_modules/playwright"));
const LOGO = pathToFileURL(path.join(RAIZ, "public/logo.png")).href;
const foto = (n) => pathToFileURL(path.join(DIR, "fotos", n)).href;

const CONFIG = {
  sku: "82636800",
  precoBrl: 1095.35,
  promoBrl: 895.91,
  cotacao: 7.982394, // 1 R$ = X $U (Admin → Produtos mostra a do dia)
  arredondar: 10,
};
const arred = (v) => Math.ceil(v / CONFIG.arredondar) * CONFIG.arredondar;
const uyuCheio = arred(CONFIG.precoBrl * CONFIG.cotacao);
const uyuPromo = arred(CONFIG.promoBrl * CONFIG.cotacao);
const desconto = Math.round((1 - CONFIG.promoBrl / CONFIG.precoBrl) * 100);
const fU = (n) => `$U ${n.toLocaleString("es-UY")}`;
const fR = (n) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const F = {
  kit: "1791612921935-nanhub.webp", // kit completo com embalagem KS
  kit2: "1791612921934-qwdrx4.webp",
  kit3: "1791612921933-ud0s4c.webp",
  medidas: "1791612921933-ud0s4c.webp",
  pecas: "1791612921932-dr9j89.webp",
  pistao: "1791612921939-789tp4.webp",
};

const T = {
  es: {
    sub: "REPUESTOS AGRÍCOLAS",
    oferta: "OFERTA",
    titulo: "Kit Motor Sisu",
    para: "para tractor Valtra",
    itens: ["Camisa", "Pistón", "Perno", "Juego de anillos"],
    marca: "Calidad KS (Kolbenschmidt)",
    de: "Antes",
    agora: "Ahora",
    economia: (v) => `Ahorrás ${v}`,
    cta: "Pedilo por WhatsApp",
    incluye: "Qué incluye el kit",
    medidas: "Medidas de la camisa",
    alto: "Alto",
    diam: "Ancho",
    cod: "Cód.",
    envio: "Envío a todo Uruguay por DAC",
    nota: "Precio en $U según la cotización del día. Sujeto a stock.",
    story: "Tocá el enlace",
    principal: fU(uyuPromo),
    segundo: fR(CONFIG.promoBrl),
    cheio: fU(uyuCheio),
    legenda: `🔥 OFERTA -${desconto}% · Kit Motor Sisu para tractor Valtra\n\nCamisa + pistón + perno + juego de anillos, calidad KS (Kolbenschmidt).\nCód. ${CONFIG.sku}\n\n❌ Antes ${fU(uyuCheio)}\n✅ Ahora ${fU(uyuPromo)} (${fR(CONFIG.promoBrl)})\n\n📦 Envío a todo Uruguay por DAC\n💬 Pedilo por WhatsApp\n👉 agropartsuy.com/produto/${CONFIG.sku}\n\nPrecio en $U según la cotización del día. Sujeto a stock.\n\n#AgroParts #Valtra #Sisu #RepuestosAgricolas #Tractores #Uruguay #KitMotor`,
  },
  pt: {
    sub: "PEÇAS AGRÍCOLAS",
    oferta: "OFERTA",
    titulo: "Kit Motor Sisu",
    para: "para trator Valtra",
    itens: ["Camisa", "Pistão", "Pino", "Jogo de anéis"],
    marca: "Qualidade KS (Kolbenschmidt)",
    de: "De",
    agora: "Por",
    economia: (v) => `Economize ${v}`,
    cta: "Peça pelo WhatsApp",
    incluye: "O que vem no kit",
    medidas: "Medidas da camisa",
    alto: "Altura",
    diam: "Largura",
    cod: "Cód.",
    envio: "Enviamos para todo o Uruguai",
    nota: "Preço sujeito a estoque.",
    story: "Toque no link",
    principal: fR(CONFIG.promoBrl),
    segundo: fU(uyuPromo),
    cheio: fR(CONFIG.precoBrl),
    legenda: `🔥 OFERTA -${desconto}% · Kit Motor Sisu para trator Valtra\n\nCamisa + pistão + pino + jogo de anéis, qualidade KS (Kolbenschmidt).\nCód. ${CONFIG.sku}\n\n❌ De ${fR(CONFIG.precoBrl)}\n✅ Por ${fR(CONFIG.promoBrl)}\n\n💬 Peça pelo WhatsApp\n👉 agropartsuy.com/produto/${CONFIG.sku}\n\nPreço sujeito a estoque.\n\n#AgroParts #Valtra #Sisu #PecasAgricolas #Tratores #KitMotor`,
  },
};

const GRAO = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E")`;
const BASE = `
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=IBM+Plex+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>
:root{--noche:#062016;--vivo:#1d8a4a;--oro:#ffc21a;--crema:#f3efe4;--rojo:#e11d2a;--whats:#25D366}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Archivo",system-ui,sans-serif;-webkit-font-smoothing:antialiased;color:var(--noche)}
.l{position:relative;overflow:hidden;width:1080px;height:1350px}
.s{height:1920px}
.grano::after{content:"";position:absolute;inset:0;background-image:${GRAO};opacity:.12;mix-blend-mode:overlay;pointer-events:none;z-index:40}
.crema{background:radial-gradient(80% 60% at 60% 40%,#fffdf6 0%,var(--crema) 72%)}
.oscuro{background:radial-gradient(70% 55% at 75% 30%,#1f7a46 0%,transparent 60%),radial-gradient(60% 50% at 0% 100%,#0f4d2e 0%,transparent 70%),var(--noche);color:#fff}
.d{font-weight:900;font-stretch:70%;line-height:.88;letter-spacing:-1px}
.mono{font-family:"IBM Plex Mono",monospace}
.marca{display:flex;align-items:center;gap:14px}
.marca img{width:64px;height:64px;background:#fff;border-radius:18px;padding:5px}
.marca b{display:block;font-size:28px;font-weight:900;font-stretch:90%}
.marca span{display:block;font-size:13px;font-weight:700;letter-spacing:3.5px}
.prod{position:absolute;object-fit:contain;mix-blend-mode:multiply}
.selo{position:absolute;display:grid;place-items:center;border-radius:50%;background:var(--rojo);color:#fff;text-align:center;box-shadow:0 20px 40px rgba(225,29,42,.35);transform:rotate(-10deg)}
.chip{display:inline-flex;align-items:center;gap:8px;border-radius:999px;font-weight:800;font-size:24px;padding:10px 20px}
.cta{display:inline-flex;align-items:center;gap:14px;border-radius:999px;font-weight:900;font-size:32px;padding:22px 36px;background:var(--whats);color:#06381b}
</style>`;
const WA = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg>`;

function posts(lang) {
  const t = T[lang];
  const marca = (claro = true) => `<div class="marca"><img src="${LOGO}"><div><b style="color:${claro ? "var(--noche)" : "#fff"}">AGRO PARTS</b><span style="color:${claro ? "#a77900" : "var(--oro)"}">${t.sub}</span></div></div>`;
  const selo = (tam, x, y) => `<div class="selo" style="width:${tam}px;height:${tam}px;left:${x}px;top:${y}px"><div><div style="font-size:${tam * 0.12}px;font-weight:900;letter-spacing:3px">${t.oferta}</div><div class="d" style="font-size:${tam * 0.4}px">-${desconto}%</div></div></div>`;
  const precos = (claro = true) => `
    <div style="display:flex;align-items:center;gap:14px">
      <span style="font-size:26px;font-weight:700;color:${claro ? "#6b7a70" : "#a9c3b1"}">${t.de}</span>
      <span style="font-size:34px;font-weight:700;color:${claro ? "#8a948d" : "#a9c3b1"};text-decoration:line-through">${t.cheio}</span>
    </div>
    <div style="display:flex;align-items:baseline;gap:16px;margin-top:4px">
      <span style="font-size:30px;font-weight:800;color:${claro ? "var(--noche)" : "#fff"}">${t.agora}</span>
      <span class="d" style="font-size:118px;color:var(--rojo)">${t.principal}</span>
    </div>
    <div style="font-size:28px;font-weight:700;margin-top:6px;color:${claro ? "#3e4d43" : "#cfe6d7"}">${t.segundo} · <span style="color:${claro ? "var(--vivo)" : "var(--oro)"}">${t.economia(lang === "es" ? fU(uyuCheio - uyuPromo) : fR(CONFIG.precoBrl - CONFIG.promoBrl))}</span></div>`;
  const lista = [];

  // 1. Oferta (feed)
  lista.push(["01_oferta", false, `<div class="l crema grano">
    <div style="position:absolute;left:64px;top:56px">${marca()}</div>
    <div class="chip" style="position:absolute;right:64px;top:66px;background:var(--noche);color:#fff">Valtra · Sisu</div>
    <img class="prod" src="${foto(F.kit)}" style="left:110px;top:140px;width:860px;height:600px">
    ${selo(250, 790, 150)}
    <div style="position:absolute;left:64px;right:64px;top:770px">
      <h1 class="d" style="font-size:104px">${t.titulo} <span style="color:var(--vivo)">${t.para}</span></h1>
      <div style="font-size:26px;font-weight:700;margin-top:12px;color:#3e4d43">${t.itens.join(" + ")} · ${t.marca}</div>
      <div style="margin-top:22px">${precos()}</div>
    </div>
    <div style="position:absolute;left:64px;bottom:44px"><div class="cta" style="font-size:26px;padding:16px 28px">${WA} ${t.cta}</div></div>
    <div class="mono" style="position:absolute;right:64px;bottom:58px;font-size:24px;color:#6b7a70">${t.cod} ${CONFIG.sku}</div>
  </div>`]);

  // 2. O que vem no kit
  lista.push(["02_kit", false, `<div class="l oscuro grano">
    <div style="position:absolute;left:64px;top:56px">${marca(false)}</div>
    <h1 class="d" style="position:absolute;left:64px;top:170px;font-size:110px">${t.incluye}</h1>
    <div style="position:absolute;left:64px;right:64px;top:330px;height:640px;border-radius:40px;background:#fff;overflow:hidden">
      <img class="prod" src="${foto(F.kit2)}" style="left:40px;top:30px;width:920px;height:580px">
    </div>
    <div style="position:absolute;left:64px;right:64px;top:1010px;display:grid;grid-template-columns:1fr 1fr;gap:14px">
      ${t.itens.map((it, i) => `<div style="display:flex;align-items:center;gap:14px;background:rgba(255,255,255,.1);border:1.5px solid rgba(255,255,255,.2);border-radius:22px;padding:18px 22px"><span style="width:46px;height:46px;border-radius:50%;background:var(--oro);color:var(--noche);display:grid;place-items:center;font-weight:900;font-size:24px">${i + 1}</span><span style="font-size:32px;font-weight:800">${it}</span></div>`).join("")}
    </div>
    <div style="position:absolute;left:64px;right:64px;bottom:56px;display:flex;justify-content:space-between;font-size:26px;font-weight:700"><span class="d" style="font-size:44px;color:var(--oro)">KS · Kolbenschmidt</span><span>${t.cod} <span class="mono">${CONFIG.sku}</span></span></div>
  </div>`]);

  // 3. Medidas + preço
  lista.push(["03_medidas_preco", false, `<div class="l crema grano">
    <div style="position:absolute;left:64px;top:56px">${marca()}</div>
    <div style="position:absolute;left:64px;top:180px;font-size:26px;font-weight:800;letter-spacing:4px;color:var(--vivo)">${t.medidas.toUpperCase()}</div>
    <img class="prod" src="${foto(F.medidas)}" style="left:40px;top:220px;width:640px;height:640px">
    <div style="position:absolute;left:680px;top:300px;width:340px">
      <div style="border-left:6px solid var(--vivo);padding-left:22px"><div style="font-size:24px;font-weight:700;color:#6b7a70">${t.alto}</div><div class="d" style="font-size:120px">22<span style="font-size:60px"> cm</span></div></div>
      <div style="border-left:6px solid var(--vivo);padding-left:22px;margin-top:40px"><div style="font-size:24px;font-weight:700;color:#6b7a70">${t.diam}</div><div class="d" style="font-size:120px">13<span style="font-size:60px"> cm</span></div></div>
    </div>
    ${selo(200, 820, 70)}
    <div style="position:absolute;left:64px;right:64px;top:900px">${precos()}</div>
    <div style="position:absolute;left:64px;bottom:56px"><div class="cta">${WA} ${t.cta}</div></div>
  </div>`]);

  // 4. Story
  lista.push(["04_story", true, `<div class="l s oscuro grano">
    <div style="position:absolute;left:72px;top:140px">${marca(false)}</div>
    <div style="position:absolute;left:72px;right:72px;top:290px"><div class="d" style="font-size:150px;color:var(--oro)">${t.oferta} -${desconto}%</div><h1 class="d" style="font-size:96px;margin-top:20px">${t.titulo} ${t.para}</h1></div>
    <div style="position:absolute;left:60px;right:60px;top:700px;height:720px;border-radius:44px;background:#fff;overflow:hidden"><img class="prod" src="${foto(F.kit)}" style="left:30px;top:30px;width:900px;height:660px"></div>
    <div style="position:absolute;left:72px;right:72px;top:1460px">${precos(false)}</div>
    <div style="position:absolute;left:50%;bottom:120px;transform:translateX(-50%);white-space:nowrap" class="cta">${WA} ${t.story}</div>
  </div>`]);
  return lista;
}

const b = await chromium.launch();
const pg = await b.newPage();
for (const lang of ["es", "pt"]) {
  const OUT = path.join(DIR, "saida", lang);
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const tmp = path.join(OUT, "_tmp.html");
  for (const [nome, story, html] of posts(lang)) {
    const h = story ? 1920 : 1350;
    await pg.setViewportSize({ width: 1080, height: h });
    fs.writeFileSync(tmp, `<!doctype html><meta charset="utf-8">${BASE}<body>${html}</body>`);
    await pg.goto(pathToFileURL(tmp).href, { waitUntil: "networkidle" });
    await pg.evaluate(() => document.fonts.ready);
    await pg.screenshot({ path: path.join(OUT, nome + ".png"), clip: { x: 0, y: 0, width: 1080, height: h } });
  }
  fs.rmSync(tmp, { force: true });
  fs.writeFileSync(path.join(OUT, "legenda.md"), T[lang].legenda + "\n");
  console.log(lang, "ok");
}
await b.close();
console.log(`desconto ${desconto}% · ${fU(uyuCheio)} → ${fU(uyuPromo)} · ${fR(CONFIG.precoBrl)} → ${fR(CONFIG.promoBrl)}`);
