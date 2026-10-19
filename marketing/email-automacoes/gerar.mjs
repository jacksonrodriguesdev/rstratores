// Imagens de topo das 12 automações de e-mail (1200×600 JPG, o Outlook não mostra WEBP).
// Uso (raiz do projeto): node marketing/email-automacoes/gerar.mjs
// Saída: public/email/automacoes/<tipo>.jpg (vai no build; usadas como cabecalho das automações)
// Fotos: recortes das peças da agrotrator (loja própria) feitos por marketing/pre-black-amarelo.
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const RAIZ = process.cwd();
const require = createRequire(path.join(RAIZ, "package.json"));
const { chromium } = require("playwright");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const L = require("lucide-react");

const OUT = path.join(RAIZ, "public/email/automacoes");
fs.mkdirSync(OUT, { recursive: true });
const PECAS = JSON.parse(fs.readFileSync(path.join(RAIZ, "marketing/pre-black-amarelo/pecas100.json"), "utf8")).pecas;
const CACHE = path.join(RAIZ, "marketing/pre-black-amarelo/.fotos");
const uri = (arq) => `data:image/png;base64,${fs.readFileSync(arq).toString("base64")}`;
const LOGO = uri(path.join(RAIZ, "public/logo.png"));
const ico = (n, s, w = 1.8) => renderToStaticMarkup(React.createElement(L[n] ?? L.Wrench, { size: s, strokeWidth: w }));
function foto(cod) {
  const p = PECAS.find((x) => x.cod === cod);
  if (!p) throw new Error(`peça ${cod} não está em pecas100.json`);
  const arq = path.join(CACHE, p.img.split("/").pop().replace(/[^\w.-]/g, "_").replace(/\.\w+$/, ".recorte.png"));
  if (!fs.existsSync(arq)) throw new Error(`recorte não encontrado (rode gerar.mjs da pre-black-amarelo antes): ${arq}`);
  return uri(arq);
}

// tipo → [selo, título, subtítulo, ícone, 3 peças (código)]
const AUTOS = {
  boas_vindas: ["BIENVENIDO", "Bienvenido a AGRO PARTS", "Repuestos para tu tractor, con envíos a todo Uruguay", "Handshake", ["054182EA", "PSH211", "LA5013"]],
  cupom: ["CUPÓN EXCLUSIVO", "Un regalo para vos", "Usá tu cupón en el próximo pedido", "Ticket", ["83063502", "RE509672", "81320800EA"]],
  promocao: ["OFERTA", "Repuestos en oferta", "Piezas con precio especial en el sitio", "Tag", ["F000510701", "85026800LUK", "265150EA"]],
  preco_baixou: ["BAJÓ DE PRECIO", "Ahora más baratos", "Los repuestos que mirabas bajaron de precio", "TrendingDown", ["82665410", "RE177574EA", "81321600EA"]],
  carrinho_baixou: ["TU LISTA", "Tu lista bajó de precio", "Un repuesto de tu lista ahora sale menos", "BadgePercent", ["204521EA", "4224811", "039410EA"]],
  carrinho_abandonado: ["TU LISTA", "Tus repuestos te esperan", "Terminá tu pedido: te respondemos por WhatsApp", "ShoppingCart", ["79007", "887896VV", "PSC504"]],
  reengajamento: ["TE EXTRAÑAMOS", "¿Listo para la zafra?", "Hay repuestos nuevos con precio en el sitio", "Tractor", ["80005500EA", "193990", "LA3976"]],
  catalogo_aberto: ["CATÁLOGOS", "Lo que viste en el catálogo", "Pedí la pieza por el código del fabricante", "BookOpen", ["053352EA", "81644000", "84305930"]],
  busca_sem_resultado: ["YA LO TENEMOS", "Encontramos lo que buscabas", "La pieza que buscaste ya está en el sitio", "Search", ["85584300", "223620", "48007134"]],
  catalogo_novo: ["NUEVO CATÁLOGO", "Nuevo catálogo en PDF", "Encontrá el código de la pieza de tu tractor", "FileText", ["922909300184", "1686458EA", "836640772"]],
  data_especial: ["FECHA ESPECIAL", "Ofertas por tiempo limitado", "Aprovechá los descuentos de la fecha", "CalendarHeart", ["F000510600", "RE509672", "048438ATF"]],
  aniversario: ["¡FELIZ ANIVERSARIO!", "Gracias por elegirnos", "Un año más juntos en el campo", "PartyPopper", ["82776400", "PSH211", "3409713VV"]],
};

const CSS = `
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,500..900&display=swap" rel="stylesheet">
<style>
  * { box-sizing:border-box; margin:0; padding:0 }
  body { font-family:"Archivo",sans-serif; -webkit-font-smoothing:antialiased }
  .l { position:relative; width:1200px; height:600px; overflow:hidden; color:#fff;
       background:radial-gradient(80% 90% at 85% 50%, #0f8a45 0%, #0b6a35 35%, #06321b 75%, #041f11 100%) }
  .grade { position:absolute; inset:0; opacity:.08; background-image:linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px); background-size:60px 60px;
           mask-image:radial-gradient(60% 80% at 75% 50%, #000, transparent) }
  .aro { position:absolute; border-radius:50%; border:2px solid rgba(251,191,36,.35) }
  .prato { position:absolute; border-radius:50%; background:radial-gradient(circle at 40% 35%, #ffffff 0%, #f2f7f1 55%, #dfeadc 100%);
           box-shadow:0 30px 60px rgba(0,0,0,.45), 0 0 0 8px rgba(255,255,255,.12) }
  .prato img { position:absolute; inset:14%; width:72%; height:72%; object-fit:contain; filter:drop-shadow(0 10px 10px rgba(0,0,0,.25)) }
</style>`;

const arte = ([selo, titulo, sub, icone, cods]) => {
  const [a, b, c] = cods.map(foto);
  return `<div class="l"><div class="grade"></div>
  <div class="aro" style="width:620px;height:620px;right:-60px;top:-10px"></div>
  <div class="aro" style="width:460px;height:460px;right:20px;top:70px;border-style:dashed;opacity:.6"></div>
  <div style="position:absolute;left:60px;top:48px;display:flex;align-items:center;gap:12px">
    <img src="${LOGO}" style="width:52px;height:52px;border-radius:14px;background:#fff;padding:4px">
    <div><div style="font-weight:900;font-stretch:88%;font-size:24px">AGRO PARTS</div><div style="font-size:11px;font-weight:800;letter-spacing:3px;color:#fbbf24">REPUESTOS AGRÍCOLAS</div></div>
  </div>
  <div style="position:absolute;left:60px;top:160px;width:560px">
    <span style="display:inline-flex;align-items:center;gap:8px;background:#fbbf24;color:#06321b;font-weight:900;font-size:17px;letter-spacing:2px;padding:9px 18px;border-radius:999px">${ico(icone, 20, 2.6)} ${selo}</span>
    <div style="margin-top:22px;font-weight:900;font-stretch:66%;font-size:${titulo.length > 22 ? 78 : 92}px;line-height:.92;text-transform:uppercase;text-shadow:0 6px 24px rgba(0,0,0,.35)">${titulo}</div>
    <div style="margin-top:20px;font-weight:600;font-size:24px;line-height:1.3;color:#d5ecd9;max-width:520px">${sub}</div>
  </div>
  <div class="prato" style="width:300px;height:300px;left:760px;top:150px"><img src="${a}"></div>
  <div class="prato" style="width:190px;height:190px;left:660px;top:58px"><img src="${b}"></div>
  <div class="prato" style="width:200px;height:200px;left:990px;top:360px"><img src="${c}"></div>
  <div style="position:absolute;left:1010px;top:70px;width:110px;height:110px;border-radius:30px;background:#fbbf24;color:#06321b;display:flex;align-items:center;justify-content:center;box-shadow:0 20px 40px rgba(0,0,0,.4);transform:rotate(8deg)">${ico(icone, 58, 2.2)}</div>
</div>`;
};

const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1200, height: 600 } });
for (const [tipo, d] of Object.entries(AUTOS)) {
  await pg.setContent(`<!doctype html><html><head><meta charset="utf-8">${CSS}</head><body>${arte(d)}</body></html>`, { waitUntil: "networkidle" });
  await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: path.join(OUT, `${tipo}.jpg`), type: "jpeg", quality: 86, clip: { x: 0, y: 0, width: 1200, height: 600 } });
  console.log("✔", tipo);
}
// Visão geral (só para conferir; não vai para o site)
const lista = Object.keys(AUTOS).map((t) => `<img src="data:image/jpeg;base64,${fs.readFileSync(path.join(OUT, `${t}.jpg`)).toString("base64")}" style="width:100%;border-radius:8px">`);
await pg.setViewportSize({ width: 1500, height: 900 });
await pg.setContent(`<body style="margin:0;background:#18181b;padding:12px;display:grid;grid-template-columns:repeat(3,1fr);gap:10px">${lista.join("")}</body>`, { waitUntil: "load" });
fs.mkdirSync(path.join(RAIZ, "marketing/email-automacoes"), { recursive: true });
await pg.screenshot({ path: path.join(RAIZ, "marketing/email-automacoes/mosaico.png"), fullPage: true });
await b.close();
