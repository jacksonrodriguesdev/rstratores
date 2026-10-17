// 50 peças × 2 idiomas = 100 artes de produto (feed 4:5, 1080×1350) da PRÉ-BLACK FRIDAY.
// Uso (raiz do projeto):  node marketing/produtos-50/gerar.mjs
// Saída: marketing/produtos-50/saida/es/*.png, saida/pt/*.png e um mosaico de cada idioma.
//
// Fotos: só as da agrotrator.com.br (loja própria), escolhidas na folha de contato
// (selecao.json). Nada de fotos da redeparts nem de /catalogo (origem de terceiros).
// Sem preço e sem % nas artes: o preço é o do site, que muda com a cotação e a campanha.
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const RAIZ = process.cwd();
const require = createRequire(path.join(RAIZ, "package.json"));
const { chromium } = require("playwright");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const L = require("lucide-react");

const PASTA = path.join(RAIZ, "marketing/produtos-50");
const PECAS = JSON.parse(fs.readFileSync(path.join(PASTA, "selecao.json"), "utf8"));
const dataUri = (arq) => `data:image/png;base64,${fs.readFileSync(arq).toString("base64")}`;
const LOGO = dataUri(path.join(RAIZ, "public/logo.png"));
const ico = (n, s = 32, w = 2) =>
  renderToStaticMarkup(React.createElement(L[n] ?? L.Wrench, { size: s, strokeWidth: w }));

const TXT = {
  es: {
    chip: "PRE BLACK FRIDAY",
    datas: "BLACK FRIDAY · 27—30 NOV",
    aplic: "Para",
    codigo: "CÓDIGO",
    cta: "Precio de pre Black en agropartsuy.com",
    curto: "Precio de pre Black en el sitio",
    envio: "Envíos por DAC a todo Uruguay",
    zap: "Cotizá por WhatsApp",
    lema: "REPUESTOS AGRÍCOLAS",
    nome: (p) => p.es,
    cat: (p) => p.cat_es,
  },
  pt: {
    chip: "PRÉ-BLACK FRIDAY",
    datas: "BLACK FRIDAY · 27—30 NOV",
    aplic: "Para",
    codigo: "CÓDIGO",
    cta: "Preço de pré-Black em agropartsuy.com/pt",
    curto: "Preço de pré-Black no site",
    envio: "Envio para todo o RS",
    zap: "Peça pelo WhatsApp",
    lema: "PEÇAS AGRÍCOLAS",
    nome: (p) => p.pt,
    cat: (p) => p.cat_pt,
  },
};

const CSS = `
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
</style>`;

const cab = (t) =>
  `<div class="brillo"></div><div class="marca"><img src="${LOGO}"><div><b>AGRO PARTS</b><span>${t.lema}</span></div></div><div class="chip">${t.chip}</div>`;
const meta = (p, t) =>
  `${t.cat(p)}${p.marca ? ` · ${t.aplic} ${p.marca}` : ""}${p.extra ? ` · ${p.extra}` : ""}`;
const cod = (p, t) => `<div class="cod"><small>${t.codigo}</small><b>${p.cod}</b></div>`;
const rodape = (t) =>
  `<div class="rodape"><span>${ico("Truck", 24)} ${t.envio}</span><span>${ico("MessageCircle", 24)} ${t.zap}</span></div>`;
const tam = (s, base) => (s.length > 34 ? base * 0.72 : s.length > 22 ? base * 0.86 : base);

// 1) Cartão branco com a foto e a fita dourada no canto
const cartao = (p, t) => `<div class="l">${cab(t)}
  <div style="position:absolute;left:64px;right:64px;top:160px;height:640px;background:#fff;border-radius:44px;overflow:hidden;box-shadow:0 40px 120px rgba(245,197,24,.18)">
    <img class="foto" src="${p.img}" style="padding:40px">
    <div class="cinta" style="width:420px;right:-110px;top:54px;transform:rotate(35deg)">${t.datas.split(" · ")[1]}</div>
  </div>
  <div style="position:absolute;left:64px;right:64px;top:835px">
    <div class="meta">${meta(p, t)}</div>
    <div class="t" style="font-size:${tam(t.nome(p), 92)}px;margin-top:12px">${t.nome(p)}</div>
  </div>
  <div style="position:absolute;left:64px;right:64px;bottom:150px;display:flex;align-items:center;justify-content:space-between">${cod(p, t)}<div class="cta" style="font-size:22px;padding:16px 24px">${ico("Tag", 24, 2.4)} ${t.curto}</div></div>
  <div style="position:absolute;left:64px;bottom:62px">${rodape(t)}</div>
</div>`;

// 2) Metade de cima branca com a foto grande, corte diagonal
const dividido = (p, t) => `<div class="l">
  <div style="position:absolute;inset:0 0 auto 0;height:800px;background:#fff;clip-path:polygon(0 0,100% 0,100% 84%,0 100%)">
    <img class="foto" src="${p.img}" style="padding:150px 120px 110px">
  </div>
  <div class="brillo" style="top:700px"></div>
  <div class="marca" style="color:#111"><img src="${LOGO}" style="box-shadow:0 0 0 1px #e4e4e7"><div><b>AGRO PARTS</b><span style="color:#b8930f">${t.lema}</span></div></div>
  <div class="chip">${t.chip}</div>
  <div style="position:absolute;left:64px;right:64px;top:820px">
    <div class="meta">${meta(p, t)}</div>
    <div class="t" style="font-size:${tam(t.nome(p), 96)}px;margin-top:12px">${t.nome(p)}</div>
    <div style="margin-top:26px">${cod(p, t)}</div>
  </div>
  <div style="position:absolute;left:64px;bottom:140px" class="cta">${ico("Tag", 28, 2.4)} ${t.cta}</div>
  <div style="position:absolute;left:64px;bottom:62px">${rodape(t)}</div>
</div>`;

// 3) Título em cima, foto num círculo branco com brilho dourado
const destaque = (p, t) => `<div class="l">${cab(t)}
  <div style="position:absolute;left:64px;right:64px;top:175px">
    <div class="meta">${meta(p, t)}</div>
    <div class="t" style="font-size:${tam(t.nome(p), 104)}px;margin-top:12px">${t.nome(p)}</div>
  </div>
  <div style="position:absolute;right:-60px;top:${t.nome(p).length > 22 ? 450 : 400}px;width:660px;height:660px;border-radius:50%;background:radial-gradient(circle, rgba(245,197,24,.55), transparent 68%)"></div>
  <div style="position:absolute;right:40px;top:${t.nome(p).length > 22 ? 510 : 460}px;width:540px;height:540px;border-radius:50%;background:#fff;overflow:hidden;border:10px solid var(--oro)">
    <img class="foto" src="${p.img}" style="padding:70px">
  </div>
  <div style="position:absolute;left:64px;top:${t.nome(p).length > 22 ? 640 : 580}px;display:grid;gap:18px">${cod(p, t)}<div class="meta" style="color:var(--oro);font-size:17px;letter-spacing:3px">${t.datas}</div></div>
  <div style="position:absolute;left:64px;bottom:140px" class="cta">${ico("Tag", 28, 2.4)} ${t.cta}</div>
  <div style="position:absolute;left:64px;bottom:62px">${rodape(t)}</div>
</div>`;

const LAYOUTS = [cartao, dividido, destaque];
const slug = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
const falhas = [];
for (const idioma of ["es", "pt"]) {
  const t = TXT[idioma];
  const dir = path.join(PASTA, "saida", idioma);
  fs.mkdirSync(dir, { recursive: true });
  const feitos = [];
  for (const [i, p] of PECAS.entries()) {
    const nome = `${String(i + 1).padStart(2, "0")}_${slug(t.nome(p))}_${p.cod.toLowerCase()}`;
    await pg.setContent(`<!doctype html><html><head><meta charset="utf-8">${CSS}</head><body>${LAYOUTS[i % 3](p, t)}</body></html>`, {
      waitUntil: "networkidle",
    });
    await pg.evaluate(() => document.fonts.ready);
    const ok = await pg.evaluate(() => [...document.images].every((im) => im.complete && im.naturalWidth > 0));
    if (!ok) falhas.push(`${idioma}/${nome}`);
    const arq = path.join(dir, `${nome}.png`);
    await pg.screenshot({ path: arq, clip: { x: 0, y: 0, width: 1080, height: 1350 } });
    feitos.push(arq);
  }
  // Mosaico do idioma
  await pg.setViewportSize({ width: 1600, height: 1000 });
  await pg.setContent(`<body style="margin:0;background:#18181b;padding:16px;display:grid;grid-template-columns:repeat(10,1fr);gap:8px">${feitos
    .map((a) => `<img src="${dataUri(a)}" style="width:100%;border-radius:6px">`)
    .join("")}</body>`, { waitUntil: "load" });
  await pg.screenshot({ path: path.join(PASTA, "saida", `mosaico_${idioma}.png`), fullPage: true });
  await pg.setViewportSize({ width: 1080, height: 1350 });
  console.log(`✔ ${idioma}: ${feitos.length} artes`);
}
await b.close();
if (falhas.length) console.log("⚠ foto não carregou:", falhas.join(", "));
