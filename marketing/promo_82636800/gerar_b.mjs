// Layout B ("industrial": amarelo/preto, faixas diagonais, etiqueta de preço) do Kit Motor Sisu
// Valtra 82636800 em promoção — espanhol e português.
// Uso (raiz do projeto): node marketing/promo_82636800/gerar_b.mjs
// Saída: marketing/promo_82636800/saida_b/{es,pt}/
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

const CONFIG = { sku: "82636800", precoBrl: 1095.35, promoBrl: 895.91, cotacao: 7.982394, arredondar: 10 };
const arred = (v) => Math.ceil(v / CONFIG.arredondar) * CONFIG.arredondar;
const uyuCheio = arred(CONFIG.precoBrl * CONFIG.cotacao);
const uyuPromo = arred(CONFIG.promoBrl * CONFIG.cotacao);
const desconto = Math.round((1 - CONFIG.promoBrl / CONFIG.precoBrl) * 100);
const fU = (n) => `$U ${n.toLocaleString("es-UY")}`;
const fR = (n) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const KIT = "1791612921935-nanhub.webp", KIT2 = "1791612921934-qwdrx4.webp", PECAS = "1791612921932-dr9j89.webp", PISTAO = "1791612921939-789tp4.webp";

const T = {
  es: {
    sub: "REPUESTOS AGRÍCOLAS", faixa: "OFERTA ESPECIAL", titulo: ["KIT MOTOR", "SISU"], para: "Para tractor Valtra",
    itens: ["Camisa", "Pistón", "Perno", "Anillos"], ks: "Calidad KS · Kolbenschmidt", antes: "ANTES", ahora: "AHORA",
    voce: "Ahorrás", cta: "Pedilo por WhatsApp", web: "agropartsuy.com", envio: "Envíos a todo Uruguay por DAC",
    p1: fU(uyuPromo), p1de: fU(uyuCheio), p2: fR(CONFIG.promoBrl), eco: fU(uyuCheio - uyuPromo), comp: "Comparalo",
    tudo: "Todo lo que tu motor necesita", nota: "Precio en $U según la cotización del día. Sujeto a stock.", toque: "Tocá el enlace", cod: "Cód.",
  },
  pt: {
    sub: "PEÇAS AGRÍCOLAS", faixa: "OFERTA ESPECIAL", titulo: ["KIT MOTOR", "SISU"], para: "Para trator Valtra",
    itens: ["Camisa", "Pistão", "Pino", "Anéis"], ks: "Qualidade KS · Kolbenschmidt", antes: "DE", ahora: "POR",
    voce: "Economize", cta: "Peça pelo WhatsApp", web: "agropartsuy.com", envio: "Enviamos para todo o Uruguai",
    p1: fR(CONFIG.promoBrl), p1de: fR(CONFIG.precoBrl), p2: fU(uyuPromo), eco: fR(CONFIG.precoBrl - CONFIG.promoBrl), comp: "Compare",
    tudo: "Tudo o que o seu motor precisa", nota: "Preço sujeito a estoque.", toque: "Toque no link", cod: "Cód.",
  },
};

const BASE = `
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=IBM+Plex+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>
:root{--preto:#111312;--amarelo:#ffcc00;--rojo:#e11d2a;--whats:#25D366;--verde:#0b7a3b}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Archivo",system-ui,sans-serif;-webkit-font-smoothing:antialiased}
.l{position:relative;overflow:hidden;width:1080px;height:1350px;background:var(--amarelo);color:var(--preto)}
.s{height:1920px}
.d{font-weight:900;font-stretch:66%;line-height:.86;letter-spacing:-1px}
.mono{font-family:"IBM Plex Mono",monospace}
.listra{position:absolute;background:repeating-linear-gradient(-45deg,var(--preto) 0 34px,var(--amarelo) 34px 68px)}
.marca{display:flex;align-items:center;gap:14px}
.marca img{width:64px;height:64px;background:#fff;border-radius:16px;padding:5px}
.marca b{display:block;font-size:28px;font-weight:900;font-stretch:90%}
.marca span{display:block;font-size:13px;font-weight:800;letter-spacing:3.5px}
.card{position:absolute;background:#fff;border-radius:34px;box-shadow:0 30px 60px rgba(0,0,0,.28);overflow:hidden}
.card img{width:100%;height:100%;object-fit:contain}
.tag{position:absolute;background:var(--rojo);color:#fff;clip-path:polygon(9% 0,100% 0,100% 100%,9% 100%,0 50%);padding:26px 40px 26px 90px;box-shadow:0 20px 40px rgba(0,0,0,.25)}
.tag::before{content:"";position:absolute;left:40px;top:50%;width:26px;height:26px;margin-top:-13px;border-radius:50%;background:var(--amarelo)}
.cta{display:inline-flex;align-items:center;gap:14px;border-radius:16px;font-weight:900;font-size:30px;padding:20px 32px;background:var(--whats);color:#06381b}
</style>`;
const WA = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg>`;

function posts(lang) {
  const t = T[lang];
  const marca = (escuro = false) => `<div class="marca"><img src="${LOGO}"><div><b style="color:${escuro ? "#fff" : "var(--preto)"}">AGRO PARTS</b><span style="color:${escuro ? "var(--amarelo)" : "#5a4a00"}">${t.sub}</span></div></div>`;
  const etiqueta = (x, y, esc = 1) => `<div class="tag" style="left:${x}px;top:${y}px;transform:rotate(-4deg) scale(${esc});transform-origin:left top">
      <div style="font-size:22px;font-weight:800;opacity:.85;text-decoration:line-through">${t.antes} ${t.p1de}</div>
      <div class="d" style="font-size:104px;margin-top:4px">${t.p1}</div>
      <div style="font-size:22px;font-weight:700;margin-top:6px">${t.p2}</div></div>`;
  const lista = [];

  // 1. Capa industrial
  lista.push(["01_oferta", false, `<div class="l">
    <div class="listra" style="left:-60px;right:-60px;top:0;height:46px"></div>
    <div style="position:absolute;left:64px;top:84px">${marca()}</div>
    <div style="position:absolute;right:-30px;top:72px;background:var(--preto);color:var(--amarelo);font-weight:900;font-size:30px;letter-spacing:4px;padding:16px 70px 16px 34px;transform:rotate(3deg)">${t.faixa}</div>
    <div class="d" style="position:absolute;left:56px;top:190px;font-size:200px">${t.titulo[0]}</div>
    <div class="d" style="position:absolute;left:56px;top:360px;font-size:200px;color:transparent;-webkit-text-stroke:5px var(--preto)">${t.titulo[1]}</div>
    <div style="position:absolute;left:64px;top:540px;font-size:34px;font-weight:800">${t.para}</div>
    <div class="d" style="position:absolute;right:50px;top:330px;font-size:250px;color:var(--rojo)">-${desconto}%</div>
    <div class="card" style="left:64px;top:620px;width:620px;height:520px;transform:rotate(-2deg)"><img src="${foto(KIT)}"></div>
    ${etiqueta(560, 980)}
    <div style="position:absolute;left:720px;top:640px;display:flex;flex-direction:column;gap:12px">
      ${t.itens.map((i) => `<div style="display:flex;align-items:center;gap:12px;font-size:30px;font-weight:900"><span style="width:16px;height:16px;background:var(--preto);transform:rotate(45deg)"></span>${i}</div>`).join("")}
      <div style="font-size:20px;font-weight:800;margin-top:6px">${t.ks}</div>
    </div>
    <div style="position:absolute;left:0;right:0;bottom:0;height:120px;background:var(--preto);color:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 64px">
      <span style="display:flex;align-items:center;gap:12px;font-size:30px;font-weight:900;color:var(--whats)">${WA} ${t.cta}</span>
      <span class="mono" style="font-size:26px;color:var(--amarelo)">${t.cod} ${CONFIG.sku}</span>
    </div>
  </div>`]);

  // 2. Comparativo antes x agora
  lista.push(["02_comparativo", false, `<div class="l" style="background:var(--preto);color:#fff">
    <div class="listra" style="left:-60px;right:-60px;bottom:0;height:46px"></div>
    <div style="position:absolute;left:64px;top:56px">${marca(true)}</div>
    <div class="d" style="position:absolute;left:64px;top:170px;font-size:130px;color:var(--amarelo)">${t.comp}</div>
    <div class="d" style="position:absolute;left:64px;top:290px;font-size:64px">${t.titulo.join(" ")} · Valtra</div>
    <div class="card" style="left:64px;top:410px;width:952px;height:430px"><img src="${foto(PECAS)}" style="padding:20px"></div>
    <div style="position:absolute;left:64px;right:64px;top:880px;display:grid;grid-template-columns:1fr 1fr;gap:22px">
      <div style="border:3px solid #555;border-radius:28px;padding:26px 30px">
        <div style="font-size:26px;font-weight:900;letter-spacing:3px;color:#999">${t.antes}</div>
        <div class="d" style="font-size:84px;color:#888;text-decoration:line-through;margin-top:8px">${t.p1de}</div>
      </div>
      <div style="background:var(--amarelo);color:var(--preto);border-radius:28px;padding:26px 30px;position:relative">
        <div style="font-size:26px;font-weight:900;letter-spacing:3px">${t.ahora}</div>
        <div class="d" style="font-size:84px;margin-top:8px">${t.p1}</div>
        <div style="position:absolute;right:-14px;top:-24px;background:var(--rojo);color:#fff;font-weight:900;font-size:30px;padding:8px 16px;border-radius:12px;transform:rotate(6deg)">-${desconto}%</div>
      </div>
    </div>
    <div style="position:absolute;left:64px;right:64px;top:1130px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:32px;font-weight:800">${t.voce} <span style="color:var(--amarelo)">${t.eco}</span></span>
      <span class="cta" style="font-size:26px;padding:16px 26px">${WA} ${t.cta}</span>
    </div>
  </div>`]);

  // 3. Mosaico de peças + etiqueta
  lista.push(["03_pecas", false, `<div class="l">
    <div style="position:absolute;left:64px;top:56px">${marca()}</div>
    <div class="d" style="position:absolute;left:64px;top:160px;width:950px;font-size:110px">${t.tudo}</div>
    <div class="card" style="left:64px;top:430px;width:580px;height:580px"><img src="${foto(KIT2)}"></div>
    <div class="card" style="left:670px;top:430px;width:346px;height:278px"><img src="${foto(PISTAO)}" style="padding:16px"></div>
    <div style="position:absolute;left:670px;top:732px;width:346px;height:278px;border-radius:34px;background:var(--preto);color:#fff;display:flex;flex-direction:column;justify-content:center;padding:28px">
      <div class="d" style="font-size:74px;color:var(--amarelo)">KS</div>
      <div style="font-size:22px;font-weight:700;margin-top:8px">Kolbenschmidt</div>
      <div class="mono" style="font-size:20px;margin-top:14px;color:#bbb">${t.cod} ${CONFIG.sku}</div>
    </div>
    ${etiqueta(64, 1050, 0.9)}
    <div style="position:absolute;right:64px;bottom:72px"><div class="cta">${WA} ${t.cta}</div></div>
  </div>`]);

  // 4. Story
  lista.push(["04_story", true, `<div class="l s">
    <div class="listra" style="left:-60px;right:-60px;top:0;height:60px"></div>
    <div style="position:absolute;left:72px;top:130px">${marca()}</div>
    <div class="d" style="position:absolute;left:64px;top:260px;font-size:260px;color:var(--rojo)">-${desconto}%</div>
    <div class="d" style="position:absolute;left:64px;top:500px;font-size:150px">${t.titulo.join(" ")}</div>
    <div style="position:absolute;left:70px;top:770px;font-size:40px;font-weight:800">${t.para}</div>
    <div class="card" style="left:60px;top:860px;width:960px;height:640px;transform:rotate(-2deg)"><img src="${foto(KIT)}"></div>
    ${etiqueta(380, 1430)}
    <div style="position:absolute;left:0;right:0;bottom:0;height:200px;background:var(--preto);display:flex;align-items:center;justify-content:center">
      <span class="cta" style="font-size:40px">${WA} ${t.toque}</span>
    </div>
  </div>`]);
  return lista;
}

const b = await chromium.launch();
const pg = await b.newPage();
for (const lang of ["es", "pt"]) {
  const OUT = path.join(DIR, "saida_b", lang);
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
  // Reaproveita a legenda do layout A
  const leg = path.join(DIR, "saida", lang, "legenda.md");
  if (fs.existsSync(leg)) fs.copyFileSync(leg, path.join(OUT, "legenda.md"));
  console.log(lang, "ok");
}
await b.close();
