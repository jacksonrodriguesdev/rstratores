// Vídeos curtos (Reels/Stories 1080×1920, sem áudio) para o Instagram do AGRO PARTS.
// A narração é feita depois no CapCut seguindo saida/roteiros.md.
// Uso (raiz do projeto):  npx tsx marketing/videos/gerar.mts            → todos
//                         npx tsx marketing/videos/gerar.mts v01 v05    → só alguns
//                         npx tsx marketing/videos/gerar.mts --previa   → 10 fps, mais rápido
// Saída: marketing/videos/saida/*.webm (+ capa *.jpg) e roteiros.md
// Como funciona: cada vídeo é uma página HTML com animações CSS; o Playwright tira 30 fotos
// por segundo (controlando o tempo das animações) e o ffmpeg do Playwright junta em WebM.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import { nomeProduto } from "../../src/lib/pecas-es";

const RAIZ = process.cwd();
const DIR = path.join(RAIZ, "marketing/videos");
const OUT = path.join(DIR, "saida");
const args = process.argv.slice(2);
const PREVIA = args.includes("--previa");
const FPS = PREVIA ? 10 : 30;
const so = args.filter((a) => !a.startsWith("--"));

const url = (p: string) => pathToFileURL(path.join(RAIZ, p)).href;
const LOGO = url("public/logo.png");
const TELA = (n: string) => url(`marketing/como_funciona/telas/${n}.png`);
const TELA_V = (n: string) => url(`marketing/vitrine/telas/${n}.png`);
const KIT = (n: string) => url(`marketing/promo_82636800/fotos/${n}`);
const TRATOR = url("marketing/transmision/fotos/massey-ferguson.jpg");
const POPUP = url("public/img/popup-acceso.jpg");

// ---------- Peças recortadas (fundo transparente) ----------
type Peca = { sku: string; img: string; nome: string; codigo: string; marca: string | null; categoria: string | null };
async function carregarPecas(): Promise<Peca[]> {
  const p = new PrismaClient();
  const arquivos = fs.readdirSync(path.join(RAIZ, "marketing/redes/recortes")).filter((f) => f.endsWith(".png"));
  const skus = arquivos.map((f) => f.replace(/-1\.png$/, ""));
  const rows = await p.agricolas.findMany({ where: { sku: { in: skus } } });
  await p.$disconnect();
  return rows.map((r) => ({
    sku: r.sku,
    img: url(`marketing/redes/recortes/${r.sku}-1.png`),
    nome: nomeProduto(r as any),
    codigo: (r.codigo_fabricante || r.sku).trim(),
    marca: r.marca,
    categoria: r.categoria,
  }));
}

// ---------- Animação: "nome início duração [fill]" em segundos ----------
const A = (nome: string, ini: number, dur = 0.6, fill = "both", ease = "cubic-bezier(.2,.8,.2,1)") => `${nome} ${dur}s ${ease} ${ini}s ${fill}`;
const LOOP = (nome: string, dur: number, ini = 0) => `${nome} ${dur}s ease-in-out ${ini}s infinite`;
// Cena: aparece em t0 e some em t1
const cena = (t0: number, t1: number, html: string, extra = "") =>
  `<div class="cena" style="animation:${A("cenaIn", t0, 0.35)},${A("cenaOut", t1 - 0.35, 0.35, "forwards")};${extra}">${html}</div>`;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

const CSS = `
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1920px;overflow:hidden;background:#041f11}
body{font-family:Archivo,system-ui,sans-serif;color:#fff;-webkit-font-smoothing:antialiased}
.v{position:relative;width:1080px;height:1920px;overflow:hidden;background:radial-gradient(circle at 30% 20%,#0f6b3a 0,#06321b 55%,#031a0d 100%)}
.grao{position:absolute;inset:0;opacity:.07;background-image:radial-gradient(#fff 1.2px,transparent 1.2px);background-size:14px 14px}
.cena{position:absolute;inset:0}
.d{font-weight:900;font-stretch:68%;line-height:.9;letter-spacing:-1px}
.c{position:absolute;left:0;right:0;text-align:center}
.amarelo{color:#f2c94c}
.chip{display:inline-flex;align-items:center;gap:12px;border-radius:999px;padding:16px 30px;font-weight:800;font-size:34px}
.card{background:#fff;border-radius:36px;box-shadow:0 40px 80px rgba(0,0,0,.45)}
.celular{position:absolute;width:560px;height:1160px;border-radius:70px;background:#0b0b0b;padding:18px;box-shadow:0 50px 100px rgba(0,0,0,.6),inset 0 0 0 3px #333}
.celular .tela{width:100%;height:100%;border-radius:54px;overflow:hidden;background:#fff}
.celular .tela img{width:100%;display:block}
.ring{position:absolute;border-radius:50%;border:3px solid rgba(242,201,76,.35)}
@keyframes cenaIn{from{opacity:0}to{opacity:1}}
@keyframes cenaOut{from{opacity:1}to{opacity:0}}
@keyframes fadeUp{from{opacity:0;transform:translateY(80px)}to{opacity:1;transform:none}}
@keyframes fadeDown{from{opacity:0;transform:translateY(-80px)}to{opacity:1;transform:none}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes zoomIn{from{opacity:0;transform:scale(.55)}to{opacity:1;transform:scale(1)}}
@keyframes zoomOut{from{opacity:0;transform:scale(1.6)}to{opacity:1;transform:scale(1)}}
@keyframes popIn{0%{opacity:0;transform:scale(.3) rotate(-10deg)}65%{opacity:1;transform:scale(1.1) rotate(3deg)}100%{opacity:1;transform:scale(1) rotate(0)}}
@keyframes slideL{from{opacity:0;transform:translateX(-110%)}to{opacity:1;transform:none}}
@keyframes slideR{from{opacity:0;transform:translateX(110%)}to{opacity:1;transform:none}}
@keyframes cai{0%{opacity:0;transform:translateY(-1400px) rotate(-40deg)}80%{opacity:1;transform:translateY(30px) rotate(4deg)}100%{opacity:1;transform:none}}
@keyframes kenburns{from{transform:scale(1.05)}to{transform:scale(1.22) translate(-3%,-2%)}}
@keyframes flutua{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-28px) rotate(3deg)}}
@keyframes gira{to{transform:rotate(360deg)}}
@keyframes pulso{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
@keyframes rola{from{transform:translateY(0)}to{transform:translateY(var(--rola,-30%))}}
@keyframes barra{from{width:0}to{width:100%}}
@keyframes digita{from{width:0}to{width:var(--w)}}
@keyframes cursor{0%,49%{opacity:1}50%,100%{opacity:0}}
@keyframes risca{from{width:0}to{width:108%}}
@keyframes onda{from{transform:scale(.4);opacity:.9}to{transform:scale(2.2);opacity:0}}
@keyframes esteira{from{transform:translateX(0)}to{transform:translateX(-50%)}}
</style>`;

// ---------- Blocos reutilizados ----------
const fundo = (extra = "") => `<div class="grao"></div>${extra}`;
const marca = (ini = 0.2) =>
  `<div style="position:absolute;left:60px;top:150px;display:flex;align-items:center;gap:16px;animation:${A("fadeDown", ini)}">
    <img src="${LOGO}" style="width:78px;height:78px;background:#fff;border-radius:20px;padding:6px">
    <div><div style="font-size:34px;font-weight:900;font-stretch:90%">AGRO PARTS</div><div style="font-size:15px;font-weight:800;letter-spacing:4px;color:#f2c94c">REPUESTOS AGRÍCOLAS</div></div>
  </div>`;
const barraTempo = (dur: number) => `<div style="position:absolute;left:0;top:0;height:10px;background:#f2c94c;animation:${A("barra", 0, dur, "both", "linear")}"></div>`;
const WA = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm4.5 12.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg>`;
const LUPA = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>`;
const CAMINHAO = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.62l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/></svg>`;
const LIVRO = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>`;

// Títulos grandes palavra por palavra
// *palavras* saem em amarelo e ~palavras~ em verde do WhatsApp
function titulo(linhas: string[], ini: number, top: number, tam = 150, passo = 0.14) {
  let k = 0;
  let cor = "";
  const palavra = (p: string) => {
    let t = p;
    if (t.startsWith("*")) { cor = "#f2c94c"; t = t.slice(1); }
    if (t.startsWith("~")) { cor = "#25D366"; t = t.slice(1); }
    const fecha = t.endsWith("*") || t.endsWith("~");
    if (fecha) t = t.slice(0, -1);
    const html = `<span style="display:inline-block;margin:0 .12em;${cor ? `color:${cor};` : ""}animation:${A("popIn", ini + passo * k++, 0.55)}">${t}</span>`;
    if (fecha) cor = "";
    return html;
  };
  return `<div class="c d" style="top:${top}px;font-size:${tam}px;padding:0 50px">${linhas.map((l) => `<div>${l.split(" ").map(palavra).join("")}</div>`).join("")}</div>`;
}
// Peça em destaque: holofote, recorte flutuando, nome e código
function heroi(p: Peca, ini: number, top = 520) {
  return `
  <div style="position:absolute;left:140px;top:${top}px;width:800px;height:800px;border-radius:50%;background:radial-gradient(circle,rgba(242,201,76,.35),rgba(242,201,76,0) 65%);animation:${A("zoomIn", ini, 0.7)}"></div>
  <div class="ring" style="left:190px;top:${top + 50}px;width:700px;height:700px;animation:${A("zoomIn", ini + 0.1, 0.7)},${LOOP("gira", 30)}"></div>
  <div style="position:absolute;left:190px;top:${top + 50}px;width:700px;height:700px;animation:${A("zoomOut", ini + 0.15, 0.7)}">
    <img src="${p.img}" style="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 40px 50px rgba(0,0,0,.55));animation:${LOOP("flutua", 4, ini)}">
  </div>
  <div class="c" style="top:${top + 820}px;animation:${A("fadeUp", ini + 0.4)}">
    <div style="display:inline-block;background:#f2c94c;color:#06321b;font-weight:900;font-size:34px;letter-spacing:2px;padding:10px 26px;border-radius:14px">CÓD. ${esc(p.codigo)}</div>
    <div style="margin:22px auto 0;max-width:900px;font-size:44px;font-weight:800;line-height:1.15">${esc(p.nome)}</div>
  </div>`;
}
// Grade de peças entrando uma a uma
function grade(pecas: Peca[], ini: number, top = 520, colunas = 3) {
  const lado = colunas === 3 ? 300 : 440;
  return `<div style="position:absolute;left:0;right:0;top:${top}px;display:grid;grid-template-columns:repeat(${colunas},${lado}px);gap:30px;justify-content:center">${pecas
    .map((p, i) => `<div class="card" style="height:${lado}px;padding:26px;animation:${A("popIn", ini + i * 0.12, 0.55)}"><img src="${p.img}" style="width:100%;height:100%;object-fit:contain"></div>`)
    .join("")}</div>`;
}
// Esteira: faixa de peças passando de lado (preenche a parte de baixo e dá movimento)
function esteira(pecas: Peca[], ini: number, top = 1180) {
  const lista = [...pecas, ...pecas].slice(0, 16);
  const cards = (k: string) => lista.map((p, i) => `<div class="card" style="flex:none;width:250px;height:250px;padding:22px;border-radius:30px" data-k="${k}${i}"><img src="${p.img}" style="width:100%;height:100%;object-fit:contain"></div>`).join("");
  return `<div style="position:absolute;left:0;right:0;top:${top}px;height:300px;overflow:hidden;animation:${A("fadeUp", ini, 0.7)}">
    <div style="display:flex;gap:28px;width:max-content;padding:20px 0;animation:${LOOP("esteira", 14).replace("ease-in-out", "linear")}">${cards("a")}${cards("b")}</div>
  </div>`;
}
function celular(img: string, ini: number, left = 260, top = 470, rola = "-25%", durRola = 4) {
  return `<div class="celular" style="left:${left}px;top:${top}px;animation:${A("fadeUp", ini, 0.8)}"><div class="tela"><img src="${img}" style="--rola:${rola};animation:${A("rola", ini + 1, durRola, "both", "ease-in-out")}"></div></div>`;
}
// Cartão final: logo, site, WhatsApp
function final(t0: number, t1: number, chamada = "Cotizá por WhatsApp") {
  return cena(
    t0,
    t1,
    `${fundo()}
    <div class="c" style="top:470px;animation:${A("popIn", t0, 0.6)}"><img src="${LOGO}" style="width:260px;height:260px;background:#fff;border-radius:60px;padding:20px;box-shadow:0 30px 60px rgba(0,0,0,.4)"></div>
    <div class="c d" style="top:790px;font-size:110px;animation:${A("fadeUp", t0 + 0.4)}">AGRO PARTS</div>
    <div class="c" style="top:910px;font-size:30px;font-weight:800;letter-spacing:8px;color:#f2c94c;animation:${A("fadeUp", t0 + 0.5)}">REPUESTOS AGRÍCOLAS</div>
    <div class="c" style="top:1040px;animation:${A("zoomIn", t0 + 0.8)}"><span class="chip" style="background:#fff;color:#06321b;font-size:48px;padding:22px 44px">agropartsuy.com</span></div>
    <div class="c" style="top:1180px;animation:${A("zoomIn", t0 + 1.1)}"><span class="chip" style="background:#25D366;color:#06381b;font-size:40px;animation:${LOOP("pulso", 1.4, t0 + 1.6)}">${WA} ${chamada}</span></div>
    <div class="c" style="top:1320px;font-size:32px;font-weight:700;color:rgba(255,255,255,.85);animation:${A("fadeIn", t0 + 1.4)}"><span style="display:inline-flex;align-items:center;gap:12px">${CAMINHAO} Envíos a todo Uruguay por DAC</span></div>`,
  );
}

// ---------- Os vídeos ----------
type Video = { id: string; nome: string; dur: number; html: string; roteiro: Array<[string, string, string]>; legenda: string };
const porMarca = (ps: Peca[], m: string) => ps.filter((p) => p.marca === m);
const porCat = (ps: Peca[], c: string) => ps.filter((p) => p.categoria === c);

function videos(ps: Peca[]): Video[] {
  const v: Video[] = [];
  const pega = (sku: string) => ps.find((p) => p.sku === sku)!;
  const mf = porMarca(ps, "Massey Ferguson"), va = porMarca(ps, "Valtra"), nh = porMarca(ps, "New Holland"), jd = porMarca(ps, "John Deere");
  const filtros = porCat(ps, "Filtros");

  // 1) Tractor parado
  v.push({
    id: "v01", nome: "tractor_parado", dur: 16,
    html: barraTempo(16) +
      cena(0, 4.2, `<div style="position:absolute;inset:0;background:url('${TRATOR}') center/cover;animation:${LOOP("kenburns", 8)}"></div><div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(3,26,13,.2),rgba(3,26,13,.85) 70%)"></div>${marca()}${titulo(["¿TU TRACTOR", "PARADO?"], 0.5, 1150, 170)}`) +
      cena(4.2, 8.4, `${fundo()}${titulo(["TENEMOS EL", "*REPUESTO*"], 4.25, 260, 130)}${[mf[0], va[0], nh[0], jd[0], va[3], nh[5]].map((p, i) => `<div class="card" style="position:absolute;left:${[90, 400, 710, 90, 400, 710][i]}px;top:${[700, 640, 700, 1080, 1020, 1080][i]}px;width:280px;height:280px;padding:24px;animation:${A("cai", 4.7 + i * 0.15, 0.8)}"><img src="${p.img}" style="width:100%;height:100%;object-fit:contain"></div>`).join("")}`) +
      cena(8.4, 12.4, `${fundo()}${titulo(["BUSCALO POR", "*CÓDIGO*"], 8.45, 230, 120)}${celular(TELA("01_busca"), 8.9, 260, 560, "-12%", 2.5)}`) +
      final(12.4, 16),
    roteiro: [
      ["0–4 s", "¿TU TRACTOR PARADO?", "¿Tu tractor está parado por un repuesto?"],
      ["4–8 s", "TENEMOS EL REPUESTO (peças caindo)", "En AGRO PARTS tenemos más de veintinueve mil repuestos para tractores y cosechadoras."],
      ["8–12 s", "BUSCALO POR CÓDIGO (busca no site)", "Buscalo por el código original y te confirmamos la compatibilidad."],
      ["12–16 s", "agropartsuy.com · Cotizá por WhatsApp", "Entrá a agropartsuy punto com y cotizá por WhatsApp. Enviamos a todo Uruguay."],
    ],
    legenda: "¿Tu tractor está parado? 🚜 Tenemos el repuesto: más de 29.000 piezas para Massey Ferguson, Valtra, John Deere, New Holland y más. Buscalo por código en agropartsuy.com 🔎 y cotizá por WhatsApp. Envíos a todo Uruguay por DAC 📦\n\n#repuestosagricolas #tractores #uruguay #agro #maquinariaagricola #masseyferguson #valtra #johndeere #newholland",
  });

  // 2) Cómo comprar en 3 pasos
  const passo = (n: number, t0: number, t1: number, txt: string, sub: string, tela: string) =>
    cena(t0, t1, `${fundo()}
      <div class="c" style="top:230px;animation:${A("popIn", t0 + 0.1)}"><span style="display:inline-flex;width:150px;height:150px;border-radius:50%;background:#f2c94c;color:#06321b;align-items:center;justify-content:center;font-size:100px;font-weight:900">${n}</span></div>
      ${titulo([txt], t0 + 0.3, 420, 120)}
      <div class="c" style="top:560px;font-size:38px;font-weight:600;color:rgba(255,255,255,.85);padding:0 80px;animation:${A("fadeUp", t0 + 0.6)}">${sub}</div>
      ${celular(tela, t0 + 0.5, 260, 680, "-10%", 2)}`);
  v.push({
    id: "v02", nome: "como_comprar", dur: 18,
    html: barraTempo(18) +
      cena(0, 3, `${fundo()}${marca()}${titulo(["COMPRÁ EN", "*3 PASOS*"], 0.3, 640, 170)}${esteira(ps.slice(0, 8), 0.8)}`) +
      passo(1, 3, 7, "BUSCÁ", "Por código, nombre o marca de tu tractor", TELA("01_busca")) +
      passo(2, 7, 11, "AGREGÁ", "Sumá los repuestos a tu cotización", TELA("03_cotizacion")) +
      cena(11, 15, `${fundo()}
        <div class="c" style="top:230px;animation:${A("popIn", 11.1)}"><span style="display:inline-flex;width:150px;height:150px;border-radius:50%;background:#f2c94c;color:#06321b;align-items:center;justify-content:center;font-size:100px;font-weight:900">3</span></div>
        ${titulo(["PEDÍ POR", "~WHATSAPP~"], 11.3, 420, 120)}
        ${["Hola! Quiero cotizar estos repuestos 🙌", "¡Hola! Sí, tenemos todo. Te paso precio y envío 📦"].map((m, i) => `<div style="position:absolute;${i ? "right" : "left"}:80px;top:${820 + i * 230}px;max-width:760px;background:${i ? "#fff" : "#d9fdd3"};color:#111;border-radius:30px;padding:30px 36px;font-size:40px;font-weight:600;box-shadow:0 20px 40px rgba(0,0,0,.35);animation:${A(i ? "slideR" : "slideL", 12 + i * 1.1, 0.6)}">${m}</div>`).join("")}`) +
      final(15, 18),
    roteiro: [
      ["0–3 s", "COMPRÁ EN 3 PASOS", "Comprar repuestos en AGRO PARTS es así de fácil."],
      ["3–7 s", "1 · BUSCÁ (busca no site)", "Uno: buscá por código, nombre o la marca de tu tractor."],
      ["7–11 s", "2 · AGREGÁ (cotização)", "Dos: agregá los repuestos a tu cotización."],
      ["11–15 s", "3 · PEDÍ POR WHATSAPP (conversa)", "Tres: mandala por WhatsApp y te respondemos con precio y envío."],
      ["15–18 s", "Final", "Entrá a agropartsuy punto com."],
    ],
    legenda: "Comprar repuestos nunca fue tan fácil 👇\n1️⃣ Buscá por código o modelo\n2️⃣ Agregá a tu cotización\n3️⃣ Pedí por WhatsApp\nEnviamos a todo Uruguay por DAC 📦 agropartsuy.com\n\n#repuestos #tractor #uruguay #agro #comprafacil",
  });

  // 3) Catálogos gratis
  const capa = (m: string, cor: string, i: number, t: number) =>
    `<div style="position:absolute;left:${[110, 330, 550, 770][i] - 40}px;top:${[700, 660, 700, 760][i]}px;width:300px;height:400px;border-radius:24px;background:#fff;overflow:hidden;box-shadow:0 30px 60px rgba(0,0,0,.5);transform:rotate(${[-12, -4, 6, 14][i]}deg);animation:${A("cai", t + i * 0.18, 0.8)}">
      <div style="height:150px;background:${cor};display:flex;align-items:flex-end;padding:20px;font-weight:900;font-stretch:75%;font-size:42px;line-height:.9">${m}</div>
      <div style="padding:20px;color:#71717a;font-weight:800;letter-spacing:3px;font-size:18px">CATÁLOGO</div>
      ${[80, 60, 70].map((w) => `<div style="margin:12px 20px 0;height:12px;width:${w}%;background:#e4e4e7;border-radius:6px"></div>`).join("")}
    </div>`;
  v.push({
    id: "v03", nome: "catalogos_gratis", dur: 15,
    html: barraTempo(15) +
      cena(0, 7, `${fundo()}${marca()}${titulo(["TODOS LOS", "*CATÁLOGOS*", "DE TRACTORES"], 0.3, 260, 120)}${[["JOHN<br>DEERE", "#367c2b"], ["MASSEY<br>FERGUSON", "#c8102e"], ["NEW<br>HOLLAND", "#1f4e9c"], ["VALTRA", "#d7262d"]].map(([m, c], i) => capa(m, c, i, 1.4)).join("")}
        <div class="c" style="top:1240px;animation:${A("zoomIn", 3)}"><span class="chip" style="background:#f2c94c;color:#06321b;font-size:56px;padding:22px 50px;animation:${LOOP("pulso", 1.4, 3.6)}">GRATIS</span></div>`) +
      cena(7, 11.5, `${fundo()}${titulo(["CREÁ TU", "CUENTA Y", "*CONSULTÁ*"], 7.2, 230, 120)}${celular(TELA_V("m_catalogos"), 7.6, 260, 700, "-15%", 3)}`) +
      final(11.5, 15, "Entrá gratis"),
    roteiro: [
      ["0–7 s", "TODOS LOS CATÁLOGOS DE TRACTORES · GRATIS", "¿Necesitás el catálogo de piezas de tu tractor? En AGRO PARTS tenés todos, gratis."],
      ["7–11 s", "CREÁ TU CUENTA Y CONSULTÁ", "Creá tu cuenta en segundos y buscá el código de la pieza que necesitás."],
      ["11–15 s", "Final", "Entrá a agropartsuy punto com."],
    ],
    legenda: "📚 Catálogos de piezas de John Deere, Massey Ferguson, New Holland, Valtra y más, GRATIS con tu cuenta. Encontrá el código exacto y pedí el repuesto por WhatsApp. 👉 agropartsuy.com\n\n#catalogo #repuestosagricolas #tractores #uruguay #taller #mecanico",
  });

  // 4) Envíos a todo Uruguay
  const deptos = ["Artigas", "Canelones", "Cerro Largo", "Colonia", "Durazno", "Flores", "Florida", "Lavalleja", "Maldonado", "Montevideo", "Paysandú", "Río Negro", "Rivera", "Rocha", "Salto", "San José", "Soriano", "Tacuarembó", "Treinta y Tres"];
  v.push({
    id: "v04", nome: "envios_uruguay", dur: 14,
    html: barraTempo(14) +
      cena(0, 10.5, `${fundo()}${marca()}
        <div class="c" style="top:330px;font-size:240px;color:#f2c94c;animation:${A("slideL", 0.3, 0.9)}">${CAMINHAO}</div>
        ${titulo(["ENVIAMOS A", "*TODO URUGUAY*"], 1, 640, 120)}
        <div style="position:absolute;left:0;right:0;top:960px;display:flex;flex-wrap:wrap;gap:14px;justify-content:center;padding:0 60px">${deptos.map((d, i) => `<span style="background:rgba(255,255,255,.1);border:2px solid rgba(255,255,255,.2);border-radius:999px;padding:10px 22px;font-size:30px;font-weight:700;animation:${A("zoomIn", 2 + i * 0.12, 0.4)}">${d}</span>`).join("")}</div>
        <div class="c" style="top:1500px;animation:${A("fadeUp", 4.8)}"><span class="chip" style="background:#fff;color:#06321b">Por DAC · con rastreo</span></div>`) +
      final(10.5, 14),
    roteiro: [
      ["0–4 s", "ENVIAMOS A TODO URUGUAY (caminhão)", "Estés donde estés, te enviamos tus repuestos."],
      ["4–10 s", "Os 19 departamentos aparecendo", "Llegamos a los diecinueve departamentos por DAC, con número de rastreo."],
      ["10–14 s", "Final", "Pedí por WhatsApp en agropartsuy punto com."],
    ],
    legenda: "📦 Enviamos repuestos agrícolas a los 19 departamentos de Uruguay por DAC, con rastreo. Pedí por WhatsApp y recibí en tu ciudad. agropartsuy.com\n\n#envios #uruguay #repuestos #agro #tractores #DAC",
  });

  // 5) Oferta do kit (fotos próprias)
  v.push({
    id: "v05", nome: "oferta_kit_sisu", dur: 15,
    html: barraTempo(15) +
      cena(0, 3.5, `${fundo()}${marca()}${titulo(["OFERTA", "*-18%*"], 0.3, 520, 220)}<div class="card" style="position:absolute;left:240px;top:1060px;width:600px;height:480px;overflow:hidden;animation:${A("zoomIn", 1, 0.6)}"><img src="${KIT("1791612921934-qwdrx4.webp")}" style="width:100%;height:100%;object-fit:contain"></div>`) +
      cena(3.5, 9, `${fundo()}
        <div class="card" style="position:absolute;left:90px;top:330px;width:900px;height:760px;overflow:hidden;animation:${A("zoomIn", 3.6, 0.7)}"><img src="${KIT("1791612921935-nanhub.webp")}" style="width:100%;height:100%;object-fit:contain;animation:${LOOP("kenburns", 6)}"></div>
        <div class="c d" style="top:1160px;font-size:110px;animation:${A("fadeUp", 4.2)}">KIT MOTOR SISU</div>
        <div class="c" style="top:1280px;font-size:40px;font-weight:700;animation:${A("fadeUp", 4.5)}">Camisa · Pistón · Perno · Anillos · Calidad KS</div>
        <div class="c" style="top:1370px;animation:${A("fadeUp", 4.8)}"><span class="chip" style="background:#f2c94c;color:#06321b">Para tractor Valtra · Cód. 82636800</span></div>`) +
      cena(9, 12, `${fundo()}
        <div class="c" style="top:560px;font-size:70px;font-weight:800;color:rgba(255,255,255,.6);animation:${A("fadeUp", 9.1)}"><span style="position:relative;display:inline-block">$U 8.750<span style="position:absolute;left:-4%;top:50%;height:8px;background:#e11d2a;animation:${A("risca", 9.6, 0.4)}"></span></span></div>
        <div class="c d" style="top:700px;font-size:260px;color:#f2c94c;animation:${A("popIn", 10, 0.7)}">$U 7.160</div>
        <div class="c" style="top:1000px;font-size:40px;font-weight:700;animation:${A("fadeIn", 10.6)}">Precio por tiempo limitado · sujeto a stock</div>
        <div class="card" style="position:absolute;left:290px;top:1120px;width:500px;height:400px;overflow:hidden;animation:${A("fadeUp", 10.3, 0.6)}"><img src="${KIT("1791612921935-nanhub.webp")}" style="width:100%;height:100%;object-fit:contain"></div>`) +
      final(12, 15, "Pedilo por WhatsApp"),
    roteiro: [
      ["0–3 s", "OFERTA -18%", "¡Atención dueños de Valtra! Oferta especial."],
      ["3–9 s", "KIT MOTOR SISU (fotos próprias)", "Kit motor Sisu con camisa, pistón, perno y anillos, calidad KS, código ocho dos seis tres seis ocho cero cero."],
      ["9–12 s", "De $U 8.750 por $U 7.160", "De ocho mil setecientos cincuenta, por siete mil ciento sesenta pesos."],
      ["12–15 s", "Final", "Pedilo por WhatsApp en agropartsuy punto com."],
    ],
    legenda: "🔥 OFERTA -18% · Kit Motor Sisu para Valtra (Cód. 82636800): camisa, pistón, perno y anillos, calidad KS. De $U 8.750 por $U 7.160 ✅ Precio por tiempo limitado, sujeto a stock. Pedilo por WhatsApp 👉 agropartsuy.com\n\n#valtra #sisu #repuestos #tractor #uruguay #oferta\n\n⚠️ Confirmá el precio en el sitio antes de publicar.",
  });

  // 6–9) Vídeos por marca
  const marcaVideo = (id: string, nome: string, m: string, cor: string, pecas: Peca[], falas: [string, string]) => {
    const [a, b, c] = pecas;
    v.push({
      id, nome, dur: 16,
      html: barraTempo(16) +
        cena(0, 3.5, `${fundo(`<div style="position:absolute;inset:0;background:linear-gradient(160deg,${cor}55,transparent 60%)"></div>`)}${marca()}${titulo(["REPUESTOS", `*${m.toUpperCase()}*`], 0.3, 560, m.length > 10 ? 130 : 170)}${esteira(pecas, 0.9)}`) +
        cena(3.5, 6.8, `${fundo()}${heroi(a, 3.6)}`) +
        cena(6.8, 10.1, `${fundo()}${heroi(b, 6.9)}`) +
        cena(10.1, 13, `${fundo()}${titulo(["Y MUCHOS", "MÁS…"], 10.2, 250, 120)}${grade(pecas.slice(2, 8), 10.5, 560)}`) +
        final(13, 16),
      roteiro: [
        ["0–3,5 s", `REPUESTOS ${m.toUpperCase()}`, `¿Tenés un ${m}? Esto es para vos.`],
        ["3,5–6,8 s", `${a.nome} · Cód. ${a.codigo}`, falas[0]],
        ["6,8–10 s", `${b.nome} · Cód. ${b.codigo}`, falas[1]],
        ["10–13 s", "Y MUCHOS MÁS… (grade)", `Y miles de repuestos más para tu ${m}, con código original.`],
        ["13–16 s", "Final", "Cotizá por WhatsApp en agropartsuy punto com."],
      ],
      legenda: `Repuestos para ${m} 🚜 ${a.nome} (Cód. ${a.codigo}), ${b.nome} (Cód. ${b.codigo}) y miles más con código original. Envíos a todo Uruguay por DAC. Cotizá por WhatsApp 👉 agropartsuy.com/repuestos/${m.toLowerCase().replace(/\s+/g, "-")}\n\n#${m.replace(/\s+/g, "").toLowerCase()} #repuestos #tractor #uruguay #agro`,
    });
  };
  marcaVideo("v06", "massey_ferguson", "Massey Ferguson", "#c8102e", [pega("9018102536"), pega("3410646CL"), ...mf.filter((p) => !["9018102536", "3410646CL"].includes(p.sku))], ["Bombas hidráulicas para tu Massey.", "Engranajes de caja de cambio, con el código original."]);
  marcaVideo("v07", "valtra", "Valtra", "#d7262d", [pega("ACW7483130"), pega("690050MG"), ...va.filter((p) => !["ACW7483130", "690050MG"].includes(p.sku))], ["Platos de embrague para tu Valtra.", "Engranajes Hi-Trac de la tracción delantera."]);
  marcaVideo("v08", "new_holland", "New Holland", "#1f4e9c", [pega("73162805CNH"), pega("504065879CNH"), ...nh.filter((p) => !["73162805CNH", "504065879CNH"].includes(p.sku))], ["Motores hidráulicos para tu New Holland.", "Poleas y tensores de correa."]);
  marcaVideo("v09", "john_deere", "John Deere", "#367c2b", [pega("CQ47493PR"), pega("AL176767EG"), ...jd.filter((p) => !["CQ47493PR", "AL176767EG"].includes(p.sku))], ["Engranajes para plantadoras y sembradoras John Deere.", "Sensores de posición del levante."]);

  // 10) Filtros: mantenimiento
  v.push({
    id: "v10", nome: "filtros_mantenimiento", dur: 15,
    html: barraTempo(15) +
      cena(0, 4, `${fundo()}${marca()}${titulo(["¿CUÁNDO", "CAMBIASTE LOS", "*FILTROS?*"], 0.3, 460, 130)}${esteira(filtros, 1, 1120)}`) +
      cena(4, 9, `${fundo()}${titulo(["ACEITE · AIRE", "COMBUSTIBLE"], 4.1, 240, 100)}${grade(filtros.slice(0, 4), 4.6, 560, 2)}`) +
      cena(9, 12, `${fundo()}${titulo(["PROTEGÉ", "TU *MOTOR*"], 9.1, 560, 170)}<div class="c" style="top:1000px;font-size:42px;font-weight:700;padding:0 90px;animation:${A("fadeUp", 9.8)}">Cambiá los filtros en los intervalos del fabricante y evitá reparaciones caras.</div>`) +
      final(12, 15),
    roteiro: [
      ["0–4 s", "¿CUÁNDO CAMBIASTE LOS FILTROS?", "¿Cuándo fue la última vez que cambiaste los filtros de tu tractor?"],
      ["4–9 s", "ACEITE · AIRE · COMBUSTIBLE", "Tenemos filtros de aceite, aire y combustible para Massey Ferguson, New Holland, Valtra y más."],
      ["9–12 s", "PROTEGÉ TU MOTOR", "Cambiarlos a tiempo protege el motor y te ahorra reparaciones caras."],
      ["12–15 s", "Final", "Pedilos por WhatsApp en agropartsuy punto com."],
    ],
    legenda: "🛢️ ¿Cuándo cambiaste los filtros de tu tractor? Filtros de aceite, aire y combustible para Massey Ferguson, New Holland, Valtra y más. Protegé tu motor y evitá reparaciones caras. Cotizá por WhatsApp 👉 agropartsuy.com/repuestos/filtros\n\n#filtros #mantenimiento #tractor #uruguay #repuestosagricolas",
  });

  // 11) Cupón primera compra
  v.push({
    id: "v11", nome: "cupon_15", dur: 14,
    html: barraTempo(14) +
      cena(0, 4, `${fundo()}${marca()}${titulo(["REGISTRATE", "Y LLEVATE"], 0.3, 420, 140)}<div class="c d amarelo" style="top:760px;font-size:330px;animation:${A("popIn", 1.2, 0.8)}">15%</div><div class="c d" style="top:1080px;font-size:110px;animation:${A("fadeUp", 1.8)}">EN TU PRIMERA COMPRA</div>${esteira(ps.slice(10, 18), 2.2, 1260)}`) +
      cena(4, 8, `${fundo()}${celular(POPUP, 4.1, 260, 360, "0%", 1)}<div class="c" style="top:1580px;font-size:40px;font-weight:700;animation:${A("fadeUp", 4.8)}">Con tu e-mail, en segundos</div>`) +
      cena(8, 11, `${fundo()}${titulo(["TU CUPÓN", "ÚNICO"], 8.1, 420, 140)}
        <div class="c" style="top:820px;animation:${A("zoomIn", 8.8)}"><div style="display:inline-block;border:6px dashed #f2c94c;border-radius:40px;padding:50px 70px;background:rgba(242,201,76,.08)"><div style="font-size:30px;font-weight:800;letter-spacing:6px;color:#f2c94c">TU CÓDIGO</div><div style="font-family:'Courier New',monospace;font-size:110px;font-weight:900;letter-spacing:10px;margin-top:10px">AGRO-7F3K</div></div></div>
        <div class="c" style="top:1200px;font-size:38px;font-weight:700;animation:${A("fadeUp", 9.6)}">Mencionalo al pedir por WhatsApp</div>`) +
      final(11, 14, "Registrate gratis"),
    roteiro: [
      ["0–4 s", "REGISTRATE Y LLEVATE 15% EN TU PRIMERA COMPRA", "¿Todavía no tenés cuenta en AGRO PARTS? Registrate y llevate quince por ciento de descuento en tu primera compra."],
      ["4–8 s", "Pop-up do site", "Es gratis y lleva segundos: solo tu e-mail."],
      ["8–11 s", "TU CUPÓN ÚNICO (AGRO-7F3K é exemplo)", "Recibís tu cupón único y lo mencionás al pedir por WhatsApp."],
      ["11–14 s", "Final", "Entrá a agropartsuy punto com."],
    ],
    legenda: "🎁 Registrate gratis en AGRO PARTS y llevate 15% OFF en tu primera compra + acceso a todos los catálogos de tractores. Tu cupón llega al instante 👉 agropartsuy.com\n\n#descuento #repuestos #tractores #uruguay #agro",
  });

  // 12) Pedido rápido por códigos
  const codigos = ["3136019", "6223618", "47640920", "30221420", "AL176767"];
  v.push({
    id: "v12", nome: "pedido_rapido", dur: 16,
    html: barraTempo(16) +
      cena(0, 4, `${fundo()}${marca()}${titulo(["¿TENÉS UNA", "*LISTA DE CÓDIGOS?*"], 0.3, 560, 120)}${esteira(ps.slice(18, 26), 0.9)}`) +
      cena(4, 9, `${fundo()}${titulo(["PEGALA ACÁ"], 4.1, 250, 120)}
        <div class="card" style="position:absolute;left:120px;top:480px;width:840px;padding:40px 50px;color:#18181b;animation:${A("fadeUp", 4.4)}">
          <div style="font-size:28px;font-weight:800;color:#71717a;letter-spacing:3px">PEDIDO RÁPIDO</div>
          ${codigos.map((c, i) => `<div style="margin-top:22px;display:flex;align-items:center;gap:20px;font-family:'Courier New',monospace;font-size:52px;font-weight:800;animation:${A("slideL", 4.9 + i * 0.35, 0.4)}"><span style="color:#0b7a3b">✓</span>${c}</div>`).join("")}
        </div>
        <div class="c" style="top:1340px;animation:${A("zoomIn", 7)}"><span class="chip" style="background:#f2c94c;color:#06321b;font-size:42px">Encontramos todo ✅</span></div>`) +
      cena(9, 12.5, `${fundo()}${titulo(["Y COTIZÁ", "~TODO JUNTO~"], 9.1, 230, 120)}${celular(TELA("06_pedido_rapido"), 9.4, 260, 560, "-15%", 2.5)}`) +
      final(12.5, 16),
    roteiro: [
      ["0–4 s", "¿TENÉS UNA LISTA DE CÓDIGOS?", "¿Sos mecánico o tenés una lista de repuestos para pedir?"],
      ["4–9 s", "PEGALA ACÁ (códigos sendo achados)", "Pegá todos los códigos de una vez en Pedido rápido y los encontramos al instante."],
      ["9–12,5 s", "Y COTIZÁ TODO JUNTO", "Y cotizás todo junto por WhatsApp."],
      ["12,5–16 s", "Final", "Probalo en agropartsuy punto com."],
    ],
    legenda: "🧰 ¿Sos mecánico o tenés una lista de repuestos? Usá el PEDIDO RÁPIDO: pegá todos los códigos de una vez, encontramos las piezas y cotizás todo junto por WhatsApp. 👉 agropartsuy.com/pedido-rapido\n\n#mecanico #taller #repuestos #tractores #uruguay",
  });
  return v;
}

// ---------- Renderização ----------
const FFMPEG = (() => {
  const base = path.join(os.homedir(), "AppData/Local/ms-playwright");
  const dirs = fs.existsSync(base) ? fs.readdirSync(base).filter((d) => d.startsWith("ffmpeg")).sort().reverse() : [];
  for (const d of dirs) {
    const f = path.join(base, d, "ffmpeg-win64.exe");
    if (fs.existsSync(f)) return f;
  }
  throw new Error("ffmpeg do Playwright não encontrado (npx playwright install ffmpeg)");
})();

async function renderizar(page: import("playwright").Page, vid: Video) {
  const tmp = path.join(os.tmpdir(), `agro_video_${vid.id}`);
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  const htmlArq = path.join(tmp, "video.html");
  fs.writeFileSync(htmlArq, `<!doctype html><meta charset="utf-8">${CSS}<body><div class="v">${vid.html}</div></body>`);
  await page.goto(pathToFileURL(htmlArq).href, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => (i.onload = i.onerror = r)))));
  });
  const total = Math.round(vid.dur * FPS);
  for (let f = 0; f < total; f++) {
    const t = (f / FPS) * 1000;
    await page.evaluate((ms) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = ms; }), t);
    await page.screenshot({ path: path.join(tmp, `${String(f).padStart(5, "0")}.jpg`), type: "jpeg", quality: 92 });
    if (f === Math.round(FPS * 1.6)) fs.copyFileSync(path.join(tmp, `${String(f).padStart(5, "0")}.jpg`), path.join(OUT, `${vid.id}_${vid.nome}_capa.jpg`));
  }
  const saida = path.join(OUT, `${vid.id}_${vid.nome}.webm`);
  // O ffmpeg do Playwright só lê imagens pela entrada padrão (image2pipe + mjpeg)
  const ff = spawn(FFMPEG, ["-y", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "pipe:0", "-c:v", "libvpx", "-b:v", "12M", "-crf", "5", "-qmin", "0", "-qmax", "30", "-deadline", "good", "-cpu-used", "1", "-auto-alt-ref", "0", saida]);
  let erroFF = "";
  ff.stderr.on("data", (d) => (erroFF = (erroFF + d).slice(-800)));
  const fim = new Promise<number>((ok) => ff.on("close", (c) => ok(c ?? 1)));
  for (let f = 0; f < total; f++) {
    const buf = fs.readFileSync(path.join(tmp, `${String(f).padStart(5, "0")}.jpg`));
    if (!ff.stdin.write(buf)) await new Promise((ok) => ff.stdin.once("drain", ok));
  }
  ff.stdin.end();
  if ((await fim) !== 0) throw new Error(`ffmpeg falhou em ${vid.id}: ${erroFF}`);
  // --folha: um quadro por segundo numa imagem só (para revisar sem assistir)
  if (args.includes("--folha")) {
    const quadros = Array.from({ length: Math.floor(vid.dur) }, (_, s) => path.join(tmp, `${String(Math.min(total - 1, s * FPS + Math.round(FPS / 2))).padStart(5, "0")}.jpg`));
    const folha = await page.context().newPage();
    await folha.setViewportSize({ width: 1620, height: 900 });
    const folhaArq = path.join(tmp, "folha.html");
    fs.writeFileSync(folhaArq, `<body style="margin:0;background:#222;display:flex;flex-wrap:wrap;gap:6px;padding:6px">${quadros.map((q, i) => `<div style="color:#fff;font:14px sans-serif"><img src="${pathToFileURL(q).href}" style="width:190px;display:block">${i + 0.5}s</div>`).join("")}</body>`);
    await folha.goto(pathToFileURL(folhaArq).href);
    await folha.waitForTimeout(500);
    await folha.screenshot({ path: path.join(OUT, `_folha_${vid.id}.jpg`), fullPage: true, type: "jpeg", quality: 80 });
    await folha.close();
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  return saida;
}

function roteiros(lista: Video[]) {
  const linhas = [
    "# Roteiros dos vídeos — AGRO PARTS (Reels/Stories 1080×1920)",
    "",
    "Os vídeos estão sem áudio. No CapCut: importe o .webm, grave/gere a locução com o texto da coluna **Locución** (espanhol rioplatense, voseo), ajuste aos tempos e adicione uma música de fundo da biblioteca do CapCut. Legenda e hashtags do post abaixo de cada vídeo.",
    "",
  ];
  for (const v of lista) {
    linhas.push(`## ${v.id} · ${v.nome.replace(/_/g, " ")} (${v.dur} s) — \`${v.id}_${v.nome}.webm\``, "", "| Tempo | Na tela | Locución (voz) |", "|---|---|---|");
    for (const [t, tela, voz] of v.roteiro) linhas.push(`| ${t} | ${tela} | ${voz} |`);
    linhas.push("", "**Legenda do post:**", "", "```", v.legenda, "```", "");
  }
  return linhas.join("\n");
}

const pecas = await carregarPecas();
const todos = videos(pecas);
const lista = so.length ? todos.filter((v) => so.includes(v.id)) : todos;
fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "roteiros.md"), roteiros(todos));
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 } });
const page = await ctx.newPage();
for (const v of lista) {
  const t0 = Date.now();
  const arq = await renderizar(page, v);
  console.log(`${v.id} ok (${((Date.now() - t0) / 1000).toFixed(0)} s) → ${path.relative(RAIZ, arq)}`);
}
await browser.close();
