// 100 artes de produto (feed 4:5) no estilo estúdio claro: peça recortada flutuando, código grande,
// tipografia condensada. Grupos: engrenagens, motor, embreagem e tração. Gera em espanhol e português.
//
// Uso (raiz do projeto):  npx tsx marketing/pecas100/gerar.mjs
// Saída: marketing/pecas100/saida/es/ e saida/pt/  (PNGs, legendas.md, mosaico.png)
//
// Peças: PRODUCTS/agrotrator.csv + fotos de public/catalogo (qualidade medida em
// marketing/estudio/cache_fotos.json). Atenção: parte dessas fotos veio de outra loja.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { nomeEs } from "../../src/lib/pecas-es.ts";

const require = createRequire(import.meta.url);
const RAIZ = process.cwd();
const DIR = path.join(RAIZ, "marketing/pecas100");
const { chromium } = require(path.join(RAIZ, "node_modules/playwright"));
const { lerCsv } = require(path.join(RAIZ, "scripts/catalogo/importar_agrotrator.cjs"));
const SITE = "agropartsuy.com";
const LOGO = pathToFileURL(path.join(RAIZ, "public/logo.png")).href;
const fotoUrl = (f) => pathToFileURL(path.join(RAIZ, "public/catalogo", f)).href;
const cache = JSON.parse(fs.readFileSync(path.join(RAIZ, "marketing/estudio/cache_fotos.json"), "utf8"));

// ---------- Textos por idioma ----------
const T = {
  es: {
    grupo: { engrenagem: "Engranajes", motor: "Motor", embreagem: "Embrague", tracao: "Tracción" },
    temCodigo: ["¿Tenés este código?", "Lo tenemos."],
    cta: "Consultá precio por WhatsApp",
    ctaCurto: "Pedí precio",
    envio: "Envíos a todo Uruguay",
    para: (m) => `Para tractor ${m}`,
    rot: { codigo: "Código", marca: "Marca", fab: "Fabricante", linha: "Línea" },
    destaque: "Repuesto destacado",
    pronta: "Pieza lista para enviar",
    legenda: (p, g) =>
      `${p.curto}${p.marca ? ` para ${p.marca}` : ""} ⚙️\nCód. ${p.codigo_fabricante}${p.fabricante ? ` · ${p.fabricante}` : ""}\n\nConsultá precio y disponibilidad por WhatsApp. Envíos a todo Uruguay por DAC.\n👉 ${SITE}\n\n#AgroParts #Uruguay #RepuestosAgricolas #${g.replace(/\s/g, "")} #Tractores${p.marca ? ` #${p.marca.replace(/\s+/g, "")}` : ""}`,
  },
  pt: {
    grupo: { engrenagem: "Engrenagens", motor: "Motor", embreagem: "Embreagem", tracao: "Tração" },
    temCodigo: ["Tem este código?", "Nós temos."],
    cta: "Consulte o preço no WhatsApp",
    ctaCurto: "Peça o preço",
    envio: "Envio para todo o Uruguai",
    para: (m) => `Para trator ${m}`,
    rot: { codigo: "Código", marca: "Marca", fab: "Fabricante", linha: "Linha" },
    destaque: "Peça em destaque",
    pronta: "Peça pronta para envio",
    legenda: (p, g) =>
      `${p.curto}${p.marca ? ` para ${p.marca}` : ""} ⚙️\nCód. ${p.codigo_fabricante}${p.fabricante ? ` · ${p.fabricante}` : ""}\n\nConsulte preço e disponibilidade pelo WhatsApp.\n👉 ${SITE}\n\n#AgroParts #PecasAgricolas #${g.replace(/\s/g, "")} #Tratores${p.marca ? ` #${p.marca.replace(/\s+/g, "")}` : ""}`,
  },
};

// ---------- Peças ----------
const RUIDO = /\b(trator|tractor|massey|ferguson|valtra|valmet|john|deere|new|holland|nh|ce|case|ih|ford|agrale|jd|mf|para|construction|contruction|ref|colheitadeira|cosechadora|cosech\.?)\b/gi;
const semAc = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
function encurtar(nome, p) {
  let n = nome;
  for (const t of [p.codigo_fabricante, p.sku, ...(p.fabricante || "").split(/\s+/)]) {
    if (t && t.length >= 2) n = n.replace(new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), "");
  }
  const fab = semAc(p.fabricante || "").toUpperCase().split(/\s+/);
  n = n.split(" ").filter((w) => !fab.includes(semAc(w).toUpperCase())).join(" ");
  n = n.replace(RUIDO, "").replace(/\s{2,}/g, " ").trim().replace(/(\s+(y|e|de|del|do|da|con|com|la|el|-|\/))+$/i, "").trim();
  return n.length > 40 ? n.slice(0, 38).replace(/\s+\S*$/, "") + "…" : n;
}

const GRUPOS = [
  ["embreagem", /embreag|plat[oô]\b|disco (interno |de )?embr|rolamento.*embr/i, 25],
  ["tracao", /tra[cç][aã]o|diferencial|cardan|cruzeta|semi.?eixo|ponta de eixo/i, 20],
  ["engrenagem", /engrenag|pinh[aã]o|coroa|planet[aá]ria|sat[eé]lite|sincroniz/i, 30],
  ["motor", /pist[aã]o|bronzina|camisa|junta .*(cabe[cç]ote|motor|coletor|escape)|biela|virabrequim|cabe[cç]ote|bomba d.?[aá]gua|bomba (de )?[oó]leo|turbo|motor|injet/i, 25],
];
const pecas = lerCsv(path.join(RAIZ, "PRODUCTS"))
  .map((p) => ({ ...p, foto: p.fotos.find((f) => fs.existsSync(path.join(RAIZ, "public/catalogo", f.destino)))?.destino }))
  .filter((p) => p.foto && cache[p.foto] && cache[p.foto].massa >= 0.15 && cache[p.foto].forma >= 0.3 && p.codigo_fabricante);
const usadas = new Set();
const escolhidas = [];
for (const [g, re, n] of GRUPOS) {
  // Fora do motor: freio, pulverizador, filtros e retentores (têm grupo próprio no site)
  const l = pecas.filter((p) => re.test(p.nome) && !(g === "motor" && /freio|pulveriz|filtro|jacto/i.test(p.nome)) && !usadas.has(p.sku)).sort((a, b) => cache[b.foto].massa - cache[a.foto].massa);
  // Variedade de marcas: intercala por marca
  const porMarca = {};
  l.forEach((p) => (porMarca[p.marca || "-"] ??= []).push(p));
  const fila = [];
  for (let i = 0; fila.length < l.length; i++) for (const k of Object.keys(porMarca)) if (porMarca[k][i]) fila.push(porMarca[k][i]);
  fila.slice(0, n).forEach((p) => { usadas.add(p.sku); escolhidas.push({ ...p, grupo: g }); });
}
// Completa até 100 com engrenagens e transmissão
for (const p of pecas) {
  if (escolhidas.length >= 100) break;
  if (p.categoria === "Engrenagens e Transmissão" && !usadas.has(p.sku)) { usadas.add(p.sku); escolhidas.push({ ...p, grupo: "engrenagem" }); }
}
console.log("peças:", escolhidas.length, Object.fromEntries(GRUPOS.map(([g]) => [g, escolhidas.filter((p) => p.grupo === g).length])));

// ---------- Visual ----------
const GRAO = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E")`;
const BASE = `
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=IBM+Plex+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>
:root{--noche:#062016;--verde:#0f4d2e;--vivo:#1d8a4a;--oro:#ffc21a;--crema:#f3efe4;--tinta:#0b1510;--whats:#25D366}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Archivo",system-ui,sans-serif;color:var(--tinta);-webkit-font-smoothing:antialiased}
.l{position:relative;overflow:hidden;width:1080px;height:1350px}
.grano::after{content:"";position:absolute;inset:0;background-image:${GRAO};opacity:.12;mix-blend-mode:overlay;pointer-events:none}
.crema{background:radial-gradient(80% 60% at 70% 35%,#fffdf6 0%,var(--crema) 70%)}
.oscuro{background:radial-gradient(90% 70% at 85% 5%,#1f6e40 0%,transparent 60%),radial-gradient(70% 60% at 0% 100%,#0d3b24 0%,transparent 70%),var(--noche);color:#fff}
.d{font-weight:900;font-stretch:72%;line-height:.88;letter-spacing:-1px}
.mono{font-family:"IBM Plex Mono",monospace}
.marca{display:flex;align-items:center;gap:14px}
.marca img{width:64px;height:64px;background:#fff;border-radius:18px;padding:5px}
.marca b{display:block;font-size:28px;font-weight:900;font-stretch:90%}
.marca span{display:block;font-size:13px;font-weight:700;letter-spacing:3.5px}
.prod{position:absolute;mix-blend-mode:multiply;object-fit:contain}
.sombra{position:absolute;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.28),transparent);filter:blur(6px)}
.cta{display:inline-flex;align-items:center;gap:14px;border-radius:999px;font-weight:900;font-size:30px;padding:22px 34px}
.chip{display:inline-flex;align-items:center;gap:8px;border-radius:999px;font-weight:800;font-size:22px;padding:11px 20px;letter-spacing:1px}
.ico{width:1em;height:1em;flex:none}
</style>`;
const WHATS = `<svg class="ico" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg>`;
const GEAR = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>`;
let SUBTITULO = "REPUESTOS AGRÍCOLAS"; // muda por idioma
const marca = (claro = true) =>
  `<div class="marca"><img src="${LOGO}"><div><b style="color:${claro ? "var(--noche)" : "#fff"}">AGRO PARTS</b><span style="color:${claro ? "#a77900" : "var(--oro)"}">${SUBTITULO}</span></div></div>`;
const cta = (t, fundo = "var(--noche)", cor = "#fff") => `<div class="cta" style="background:${fundo};color:${cor}">${WHATS} ${t}</div>`;
const fontNome = (s, base) => (s.length > 30 ? base * 0.78 : s.length > 20 ? base * 0.9 : base);

// ---------- 6 layouts ----------
const L = {
  // 1. Código gigante vazado atrás da peça
  codigo: (p, t, g) => `<div class="l crema grano">
    <div style="position:absolute;left:64px;top:56px">${marca()}</div>
    <div class="chip" style="position:absolute;right:64px;top:70px;background:var(--noche);color:#fff">${g.toUpperCase()}</div>
    <div class="mono" style="position:absolute;left:-10px;right:-10px;top:180px;text-align:center;font-size:${Math.min(250, Math.floor(1550 / p.codigo_fabricante.length))}px;font-weight:700;color:transparent;-webkit-text-stroke:3px var(--noche);letter-spacing:-4px;opacity:.9">${p.codigo_fabricante}</div>
    <div class="sombra" style="left:270px;top:850px;width:540px;height:60px"></div>
    <img class="prod" src="${fotoUrl(p.foto)}" style="left:230px;top:330px;width:620px;height:540px">
    <div style="position:absolute;left:64px;right:64px;top:930px">
      <h1 class="d" style="font-size:92px;color:var(--noche)">${t.temCodigo[0]} <span style="color:var(--vivo)">${t.temCodigo[1]}</span></h1>
      <div style="font-size:30px;font-weight:600;margin-top:18px;color:#3e4d43">${p.curto}${p.marca ? ` · ${p.marca}` : ""}</div>
    </div>
    <div style="position:absolute;left:64px;bottom:64px">${cta(t.cta)}</div>
  </div>`,

  // 2. Número grande apagado + marca + nome (estilo carrossel)
  numero: (p, t, g, n) => `<div class="l crema grano">
    <div style="position:absolute;left:64px;top:56px">${marca()}</div>
    <div style="position:absolute;right:64px;top:74px;font-size:24px;font-weight:800;color:#6a756d;letter-spacing:2px">${g.toUpperCase()}</div>
    <div class="d" style="position:absolute;left:52px;top:150px;font-size:260px;color:rgba(6,32,22,.08)">${String(n).padStart(2, "0")}</div>
    <div class="sombra" style="left:250px;top:880px;width:580px;height:60px"></div>
    <img class="prod" src="${fotoUrl(p.foto)}" style="left:190px;top:230px;width:700px;height:650px">
    <div style="position:absolute;left:64px;right:64px;top:955px">
      ${p.marca ? `<div style="font-size:24px;font-weight:800;letter-spacing:3px;color:var(--vivo)">${p.marca.toUpperCase()}</div>` : ""}
      <h1 class="d" style="font-size:${fontNome(p.curto, 82)}px;margin-top:8px;color:var(--noche)">${p.curto}</h1>
      <div class="mono" style="font-size:26px;margin-top:14px;color:#4b5a50">Cód. ${p.codigo_fabricante}</div>
    </div>
    <div style="position:absolute;right:64px;bottom:64px">${cta(t.ctaCurto, "var(--whats)", "#06381b")}</div>
  </div>`,

  // 3. Dividido: peça no claro, ficha no painel verde
  split: (p, t, g) => `<div class="l crema grano">
    <div style="position:absolute;right:0;top:0;bottom:0;width:390px;background:var(--noche)"></div>
    <div style="position:absolute;right:-120px;top:120px;width:560px;height:560px;color:rgba(255,255,255,.06)">${GEAR}</div>
    <div style="position:absolute;left:64px;top:56px">${marca()}</div>
    <div class="d" style="position:absolute;right:40px;top:110px;font-size:110px;color:transparent;-webkit-text-stroke:2px var(--oro);writing-mode:vertical-rl;transform:rotate(180deg)">${g.toUpperCase()}</div>
    <div class="sombra" style="left:110px;top:840px;width:480px;height:56px"></div>
    <img class="prod" src="${fotoUrl(p.foto)}" style="left:40px;top:250px;width:620px;height:600px">
    <div style="position:absolute;left:64px;width:600px;top:930px">
      <h1 class="d" style="font-size:${fontNome(p.curto, 76)}px;color:var(--noche)">${p.curto}</h1>
      ${p.marca ? `<div style="font-size:28px;font-weight:700;margin-top:16px;color:var(--vivo)">${t.para(p.marca)}</div>` : ""}
    </div>
    <div style="position:absolute;right:40px;width:310px;top:780px;color:#fff">
      <div style="font-size:18px;font-weight:800;letter-spacing:3px;color:var(--oro)">${t.rot.codigo.toUpperCase()}</div>
      <div class="mono" style="font-size:${p.codigo_fabricante.length > 9 ? 30 : 40}px;font-weight:700;margin-top:6px">${p.codigo_fabricante}</div>
      ${p.fabricante ? `<div style="font-size:18px;font-weight:800;letter-spacing:3px;color:var(--oro);margin-top:26px">${t.rot.fab.toUpperCase()}</div><div style="font-size:28px;font-weight:700;margin-top:6px">${p.fabricante}</div>` : ""}
    </div>
    <div style="position:absolute;left:64px;bottom:64px">${cta(t.cta, "var(--whats)", "#06381b")}</div>
  </div>`,

  // 4. Ficha técnica: palco redondo + cartão com dados
  ficha: (p, t, g) => `<div class="l crema grano">
    <div style="position:absolute;left:64px;top:56px">${marca()}</div>
    <div class="chip" style="position:absolute;right:64px;top:70px;background:var(--oro);color:var(--noche)">⚙ ${t.destaque.toUpperCase()}</div>
    <div style="position:absolute;left:190px;top:170px;width:700px;height:700px;border-radius:50%;background:radial-gradient(circle,#fff 0%,#fff 55%,rgba(255,255,255,0) 72%)"></div>
    <img class="prod" src="${fotoUrl(p.foto)}" style="left:250px;top:220px;width:580px;height:580px">
    <div style="position:absolute;left:64px;right:64px;top:840px;background:#fff;border-radius:32px;box-shadow:0 24px 60px rgba(6,32,22,.12);padding:34px 40px">
      <div style="font-size:20px;font-weight:800;letter-spacing:3px;color:var(--vivo)">${g.toUpperCase()}</div>
      <h1 class="d" style="font-size:${fontNome(p.curto, 66)}px;margin-top:8px;color:var(--noche)">${p.curto}</h1>
      <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:24px;border-top:2px solid #eef0ea;padding-top:20px">
        ${[[t.rot.codigo, p.codigo_fabricante, true], [t.rot.marca, p.marca || "—"], [t.rot.fab, p.fabricante || "—"]]
          .map(([r, v, m]) => `<div><div style="font-size:16px;font-weight:800;letter-spacing:2px;color:#7a857d">${r.toUpperCase()}</div><div class="${m ? "mono" : ""}" style="font-size:26px;font-weight:700;margin-top:4px;color:var(--noche)">${v}</div></div>`)
          .join("")}
      </div>
    </div>
    <div style="position:absolute;left:64px;bottom:56px">${cta(t.cta, "var(--whats)", "#06381b")}</div>
  </div>`,

  // 5. Palavra do grupo gigante atrás da peça
  grupo: (p, t, g) => `<div class="l crema grano">
    <div class="d" style="position:absolute;left:-20px;right:-20px;top:250px;text-align:center;font-size:${g.length > 9 ? 220 : 270}px;color:rgba(29,138,74,.12)">${g.toUpperCase()}</div>
    <div style="position:absolute;left:64px;top:56px">${marca()}</div>
    <div class="sombra" style="left:260px;top:870px;width:560px;height:60px"></div>
    <img class="prod" src="${fotoUrl(p.foto)}" style="left:200px;top:210px;width:680px;height:660px;transform:rotate(-6deg)">
    <div style="position:absolute;left:64px;right:64px;top:950px">
      <h1 class="d" style="font-size:${fontNome(p.curto, 84)}px;color:var(--noche)">${p.curto}</h1>
      <div style="display:flex;gap:12px;margin-top:20px;flex-wrap:wrap">
        <span class="chip mono" style="background:var(--noche);color:#fff">Cód. ${p.codigo_fabricante}</span>
        ${p.marca ? `<span class="chip" style="background:#e3eee6;color:var(--verde)">${p.marca}</span>` : ""}
        <span class="chip" style="background:#fff3cf;color:#7a5600">🚚 ${t.envio}</span>
      </div>
    </div>
    <div style="position:absolute;left:64px;bottom:64px">${cta(t.cta)}</div>
  </div>`,

  // 6. Escuro com holofote (contraste no feed)
  holofote: (p, t, g) => `<div class="l oscuro grano">
    <div style="position:absolute;left:64px;top:56px">${marca(false)}</div>
    <div class="chip" style="position:absolute;right:64px;top:70px;background:rgba(255,255,255,.1);color:var(--oro);border:1.5px solid rgba(255,194,26,.4)">${g.toUpperCase()}</div>
    <div style="position:absolute;left:140px;top:170px;width:800px;height:800px;border-radius:50%;background:radial-gradient(closest-side,#ffffff 0%,#f4f2ea 66%,rgba(244,242,234,0) 70%)"></div>
    <img class="prod" src="${fotoUrl(p.foto)}" style="left:240px;top:270px;width:600px;height:600px">
    <div style="position:absolute;left:64px;right:64px;top:990px">
      ${p.marca ? `<div style="font-size:24px;font-weight:800;letter-spacing:3px;color:var(--oro)">${p.marca.toUpperCase()}</div>` : ""}
      <h1 class="d" style="font-size:${fontNome(p.curto, 80)}px;margin-top:8px">${p.curto}</h1>
      <div class="mono" style="font-size:26px;margin-top:12px;color:#b9d3c1">Cód. ${p.codigo_fabricante}${p.fabricante ? ` · ${p.fabricante}` : ""}</div>
    </div>
    <div style="position:absolute;right:64px;bottom:64px">${cta(t.ctaCurto, "var(--whats)", "#06381b")}</div>
  </div>`,
};
const ORDEM = ["codigo", "numero", "split", "ficha", "grupo", "holofote"];

// ---------- Render ----------
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
for (const lang of ["es", "pt"]) {
  const t = T[lang];
  SUBTITULO = lang === "es" ? "REPUESTOS AGRÍCOLAS" : "PEÇAS AGRÍCOLAS";
  const OUT = path.join(DIR, "saida", lang);
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const tmp = path.join(OUT, "_tmp.html");
  const legendas = [`# ${lang === "es" ? "Leyendas" : "Legendas"} · 100 peças (${lang})`, ""];
  const contador = {};
  const nomes = [];
  for (const [i, p0] of escolhidas.entries()) {
    const curto = encurtar(lang === "es" ? nomeEs(p0.nome) : p0.nome, p0);
    const p = { ...p0, curto };
    const g = t.grupo[p.grupo];
    contador[p.grupo] = (contador[p.grupo] || 0) + 1;
    const layout = ORDEM[i % ORDEM.length];
    const nome = `${String(i + 1).padStart(3, "0")}_${semAc(g).toLowerCase()}_${layout}_${p.sku}`;
    fs.writeFileSync(tmp, `<!doctype html><meta charset="utf-8">${BASE}<body>${L[layout](p, t, g, contador[p.grupo])}</body>`);
    await pg.goto(pathToFileURL(tmp).href, { waitUntil: "networkidle" });
    await pg.evaluate(() => document.fonts.ready);
    await pg.screenshot({ path: path.join(OUT, nome + ".png"), clip: { x: 0, y: 0, width: 1080, height: 1350 } });
    legendas.push(`## ${nome}.png`, "", t.legenda(p, g), "");
    nomes.push(nome);
  }
  fs.writeFileSync(path.join(OUT, "legendas.md"), legendas.join("\n"));
  fs.writeFileSync(tmp, `<!doctype html><body style="margin:0;background:#111"><div style="display:grid;grid-template-columns:repeat(10,200px);gap:4px;padding:4px">${nomes.map((n) => `<img src="${pathToFileURL(path.join(OUT, n + ".png")).href}" style="width:200px;height:250px">`).join("")}</div>`);
  await pg.setViewportSize({ width: 2050, height: 800 });
  await pg.goto(pathToFileURL(tmp).href, { waitUntil: "load" });
  await pg.waitForTimeout(800);
  await pg.screenshot({ path: path.join(OUT, "mosaico.png"), fullPage: true });
  await pg.setViewportSize({ width: 1080, height: 1350 });
  fs.rmSync(tmp, { force: true });
  console.log(lang, nomes.length, "artes");
}
await b.close();
