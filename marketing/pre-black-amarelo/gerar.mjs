// PRÉ-BLACK FRIDAY — campanha amarela para Instagram e Facebook (espanhol e português).
// Estilo pedido pelo cliente: capa preta com balões, confete, logo e fita de isolamento; cards
// amarelos com moldura «PRÉ-BLACK FRIDAY», peça recortada num pedestal, nome e preço grande.
// Uso: node marketing/pre-black-amarelo/gerar.mjs [--amostra]
// Antes: npx tsx marketing/pre-black-amarelo/montar.ts (gera pecas100.json com os preços de hoje)
// Saída: saida/{es,pt}/capa_*.png, saida/{es,pt}/cards/*.png, mosaicos e carrosseis.md
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const RAIZ = process.cwd();
const require = createRequire(path.join(RAIZ, "package.json"));
const { chromium } = require("playwright");

const PASTA = path.join(RAIZ, "marketing/pre-black-amarelo");
const DADOS = JSON.parse(fs.readFileSync(path.join(PASTA, "pecas100.json"), "utf8"));
const PECAS = DADOS.pecas;
const pct = `-${DADOS.desconto}%`;
const dataUri = (arq, tipo = "png") =>
  `data:image/${tipo};base64,${fs.readFileSync(arq).toString("base64")}`;
const LOGO = dataUri(path.join(RAIZ, "public/logo.png"));
const slug = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);

const TXT = {
  es: {
    pre: "PRE",
    descLabel: "DE DESCUENTO EN LA PRE BLACK",
    veja: "Mirá el precio en agropartsuy.com",
    oferta: "¡OFERTAS VÁLIDAS HASTA AGOTAR STOCK!",
    precoDe: (p) => p.preco.deUyu,
    preco: (p) => p.preco.uyu,
    moeda: "$U",
    nota: `Precios del ${DADOS.data} en agropartsuy.com (cambio del día)`,
    todo: "EN TODO EL SITIO",
    comeca: "LA BLACK FRIDAY EMPIEZA EL 27/11",
    site: "agropartsuy.com",
    para: "Para",
    nome: (p) => p.es,
    cat: (p) => p.cat_es,
    cod: "Cód.",
  },
  pt: {
    pre: "PRÉ",
    descLabel: "DE DESCONTO NA PRÉ-BLACK",
    veja: "Veja o preço em agropartsuy.com/pt",
    oferta: "OFERTAS VÁLIDAS ENQUANTO DURAREM OS ESTOQUES!",
    precoDe: (p) => p.preco.deBrl,
    preco: (p) => p.preco.brl,
    moeda: "R$",
    nota: `Preços de ${DADOS.data} em agropartsuy.com/pt`,
    todo: "EM TODO O SITE",
    comeca: "A BLACK FRIDAY COMEÇA EM 27/11",
    site: "agropartsuy.com/pt",
    para: "Para",
    nome: (p) => p.pt,
    cat: (p) => p.cat_pt ?? p.cat,
    cod: "Cód.",
  },
};

// ---------------------------------------------------------------- fotos: baixar e recortar
// Só fotos da agrotrator.com.br (loja própria). O branco que encosta na borda vira transparente,
// para a peça ficar solta sobre o amarelo (sem «caixa branca» e sem amarelar o metal).
const CACHE = path.join(PASTA, ".fotos");
fs.mkdirSync(CACHE, { recursive: true });
async function baixar(url) {
  const arq = path.join(CACHE, url.split("/").pop().replace(/[^\w.-]/g, "_"));
  if (fs.existsSync(arq)) return arq;
  for (let k = 0; ; k++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      fs.writeFileSync(arq, Buffer.from(await r.arrayBuffer()));
      return arq;
    } catch (e) {
      if (k >= 3) throw e;
      await new Promise((ok) => setTimeout(ok, 1500));
    }
  }
}
async function recortar(pg, arqJpg) {
  const destino = arqJpg.replace(/\.\w+$/, ".recorte.png");
  if (fs.existsSync(destino)) return destino;
  const png = await pg.evaluate(async (src) => {
    const im = new Image();
    im.src = src;
    await im.decode();
    const w = im.naturalWidth,
      h = im.naturalHeight;
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d");
    g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, w, h);
    const px = d.data;
    const claro = (i) => {
      const r = px[i],
        gg = px[i + 1],
        b = px[i + 2];
      return Math.min(r, gg, b) > 232 && Math.max(r, gg, b) - Math.min(r, gg, b) < 22;
    };
    // Inundação a partir das bordas
    const fora = new Uint8Array(w * h);
    const fila = [];
    for (let x = 0; x < w; x++) fila.push(x, (h - 1) * w + x);
    for (let y = 0; y < h; y++) fila.push(y * w, y * w + w - 1);
    while (fila.length) {
      const p = fila.pop();
      if (fora[p] || !claro(p * 4)) continue;
      fora[p] = 1;
      const x = p % w,
        y = (p / w) | 0;
      if (x > 0) fila.push(p - 1);
      if (x < w - 1) fila.push(p + 1);
      if (y > 0) fila.push(p - w);
      if (y < h - 1) fila.push(p + w);
    }
    // Furos (engrenagem, rolamento): manchas grandes de branco quase puro, mesmo sem tocar a borda
    const puro = (i) => Math.min(px[i], px[i + 1], px[i + 2]) > 247;
    const visto = new Uint8Array(w * h);
    for (let p0 = 0; p0 < w * h; p0++) {
      if (fora[p0] || visto[p0] || !puro(p0 * 4)) continue;
      const comp = [];
      const f2 = [p0];
      visto[p0] = 1;
      while (f2.length) {
        const p = f2.pop();
        comp.push(p);
        const x = p % w,
          y = (p / w) | 0;
        for (const q of [x > 0 && p - 1, x < w - 1 && p + 1, y > 0 && p - w, y < h - 1 && p + w])
          if (q !== false && !visto[q] && !fora[q] && puro(q * 4)) {
            visto[q] = 1;
            f2.push(q);
          }
      }
      if (comp.length > 1500) for (const p of comp) fora[p] = 1;
    }
    // Transparente fora; borda suave (vizinho de fora fica meio transparente)
    let x0 = w,
      y0 = h,
      x1 = 0,
      y1 = 0;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (fora[p]) {
          px[p * 4 + 3] = 0;
          continue;
        }
        const viz =
          (x > 0 && fora[p - 1]) ||
          (x < w - 1 && fora[p + 1]) ||
          (y > 0 && fora[p - w]) ||
          (y < h - 1 && fora[p + w]);
        if (viz) px[p * 4 + 3] = 150;
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x > x1) x1 = x;
        if (y > y1) y1 = y;
      }
    g.putImageData(d, 0, 0);
    // Corta no tamanho da peça (todas ficam do mesmo tamanho no card)
    const cw = Math.max(1, x1 - x0 + 1),
      ch = Math.max(1, y1 - y0 + 1);
    const o = document.createElement("canvas");
    o.width = cw;
    o.height = ch;
    o.getContext("2d").drawImage(c, x0, y0, cw, ch, 0, 0, cw, ch);
    return o.toDataURL("image/png");
  }, dataUri(arqJpg, "jpeg"));
  fs.writeFileSync(destino, Buffer.from(png.split(",")[1], "base64"));
  return destino;
}

// ---------------------------------------------------------------- estilo
const CSS = `
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,500..900&family=Anton&display=swap" rel="stylesheet">
<style>
  * { box-sizing:border-box; margin:0; padding:0 }
  body { font-family:"Archivo",sans-serif; -webkit-font-smoothing:antialiased }
  .l { position:relative; overflow:hidden }
  .amarelo { background:radial-gradient(70% 55% at 50% 42%, #ffe14d 0%, #f9c80e 55%, #eeb500 100%) }
  .preto { background:radial-gradient(70% 55% at 50% 45%, #1b1b1b 0%, #0a0a0a 60%, #000 100%); color:#fff }
  .balao { position:absolute; border-radius:50% 50% 48% 48%; }
  .balao::after { content:""; position:absolute; left:50%; bottom:-14px; width:14px; height:16px; transform:translateX(-50%); background:inherit; clip-path:polygon(50% 0,100% 100%,0 100%); filter:brightness(.8) }
  .ouro { background:radial-gradient(circle at 32% 28%, #fff6c4 0%, #ffd84a 22%, #e8a800 60%, #9a6d00 100%) }
  .negro { background:radial-gradient(circle at 32% 28%, #6b6b6b 0%, #232323 30%, #070707 75%) }
  .confete { position:absolute; width:12px; height:22px; border-radius:2px }
  .anton { font-family:"Anton",sans-serif; text-transform:uppercase; letter-spacing:.5px }
  .fita { position:absolute; left:-120px; right:-120px; height:62px; display:flex; align-items:center; gap:46px; white-space:nowrap; font-family:"Archivo"; font-weight:900; font-stretch:80%; font-size:30px; letter-spacing:1px; box-shadow:0 8px 24px rgba(0,0,0,.35) }
  .fita-p { background:#0b0b0b; color:#f9c80e; border-top:4px solid #f9c80e; border-bottom:4px solid #f9c80e }
  .fita-a { background:#f9c80e; color:#0b0b0b; border-top:4px solid #0b0b0b; border-bottom:4px solid #0b0b0b }
</style>`;

// Balões num canto: lista de [x, y, tamanho, ouro?]
const BALOES = {
  esq: [[-70, -60, 190, 1], [80, -90, 160, 0], [-40, 110, 150, 0], [150, 40, 120, 1], [40, 230, 110, 1]],
  dir: [[920, -70, 190, 0], [790, -100, 160, 1], [960, 110, 150, 1], [830, 50, 120, 0], [990, 260, 110, 0]],
};
const baloes = (w, lados = ["esq", "dir"], escala = 1) =>
  lados
    .flatMap((l) =>
      BALOES[l].map(
        ([x, y, s, o]) =>
          `<div class="balao ${o ? "ouro" : "negro"}" style="left:${l === "dir" ? x - 1080 + w : x}px;top:${y}px;width:${s * escala}px;height:${s * 1.12 * escala}px;box-shadow:0 18px 30px rgba(0,0,0,.35)"></div>`,
      ),
    )
    .join("");
// Confete determinístico (mesma arte sempre igual)
function confete(w, h, n, cores, seed = 7, livre = null) {
  let s = seed;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: n }, () => {
    const x = rnd() * w,
      y = rnd() * h,
      r = rnd() * 360,
      c = cores[Math.floor(rnd() * cores.length)],
      t = 0.6 + rnd() * 0.8;
    // Área livre (logo e textos): confete não cai por cima
    if (livre && x > livre[0] && x < livre[2] && y > livre[1] && y < livre[3]) return "";
    return `<div class="confete" style="left:${x}px;top:${y}px;background:${c};transform:rotate(${r}deg) scale(${t})"></div>`;
  }).join("");
}
const fitas = (t, w, h, base = 0) => {
  const txt = (cls) =>
    `${Array.from({ length: 12 }, () => `<span>${t.pre}-BLACK FRIDAY</span>`).join("")}`;
  return `<div class="fita fita-a" style="top:${h - 150 - base}px;transform:rotate(-6deg)">${txt()}</div>
  <div class="fita fita-p" style="top:${h - 95 - base}px;transform:rotate(3deg)">${txt()}</div>`;
};
const marca = (escuro, tam = 1) =>
  `<div style="display:flex;align-items:center;gap:${16 * tam}px">
    <img src="${LOGO}" style="width:${86 * tam}px;height:${86 * tam}px;border-radius:${22 * tam}px;background:#fff;padding:${6 * tam}px;box-shadow:0 8px 24px rgba(0,0,0,.25)">
    <div><div style="font-weight:900;font-stretch:85%;font-size:${54 * tam}px;line-height:.95;color:${escuro ? "#0b0b0b" : "#fff"};letter-spacing:.5px">AGRO PARTS</div>
    <div style="font-weight:800;font-size:${15 * tam}px;letter-spacing:${5 * tam}px;color:${escuro ? "#0b0b0b" : "#f9c80e"};margin-top:4px">${escuro ? "REPUESTOS · PEÇAS AGRÍCOLAS" : "REPUESTOS · PEÇAS AGRÍCOLAS"}</div></div></div>`;

// Moldura «PRÉ-BLACK / FRIDAY» dos cards
const moldura = (t) => `
  <div style="padding:10px;border:5px solid #0b0b0b;background:#f9c80e">
    <div style="border:4px solid #0b0b0b;background:#f9c80e">
      <div class="anton" style="font-size:96px;line-height:1.08;white-space:nowrap;color:#0b0b0b;text-align:center;padding:14px 36px 0">${t.pre}-BLACK</div>
      <div class="anton" style="background:#0b0b0b;color:#fff;font-size:86px;line-height:1.12;white-space:nowrap;text-align:center;padding:0 36px 4px">FRIDAY</div>
    </div></div>`;

// Pedestal (cilindro preto com aro dourado)
const pedestal = (x, y, w) => `
  <div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${w * 0.42}px">
    <div style="position:absolute;left:0;right:0;top:${w * 0.09}px;bottom:0;border-radius:0 0 ${w / 2}px ${w / 2}px / 0 0 ${w * 0.1}px ${w * 0.1}px;background:linear-gradient(90deg,#050505,#2b2b2b 30%,#0f0f0f 55%,#3a3a3a 80%,#050505);box-shadow:0 30px 40px rgba(0,0,0,.35)"></div>
    <div style="position:absolute;left:0;right:0;top:${w * 0.09}px;height:${w * 0.07}px;background:linear-gradient(90deg,#8a6500,#ffe27a 30%,#c99a06 60%,#ffe27a 85%,#8a6500)"></div>
    <div style="position:absolute;left:0;right:0;top:0;height:${w * 0.18}px;border-radius:50%;background:radial-gradient(ellipse at 50% 40%,#3a3a3a,#0b0b0b 70%);border:6px solid #e0ac00;box-shadow:inset 0 0 0 4px #7a5a00"></div>
  </div>`;

// Preço grande «R$ 2.253,17» com centavos pequenos
function precoGrande(t, p, tam) {
  const v = t.preco(p).replace(/^(R\$|\$U)\s*/, "");
  const [int, cent] = v.split(",");
  return `<div style="display:flex;align-items:flex-start;gap:6px;color:#0b0b0b">
    <span class="anton" style="font-size:${tam * 0.3}px;margin-top:${tam * 0.12}px">${t.moeda}</span>
    <span class="anton" style="font-size:${tam}px;line-height:.92">${int}</span>
    ${cent ? `<span class="anton" style="font-size:${tam * 0.3}px;margin-top:${tam * 0.58}px">,${cent}</span>` : ""}</div>`;
}

// ---------------------------------------------------------------- card de peça (4:5)
function card(t, p, foto, comPreco) {
  const nome = t.nome(p).toUpperCase();
  const tn = nome.length > 30 ? 46 : nome.length > 20 ? 54 : 64;
  return `<div class="l amarelo" style="width:1080px;height:1350px">
  ${confete(1080, 520, 26, ["#0b0b0b", "#fff3b0", "#b88400"], p.cod.length, [250, 30, 830, 430])}
  ${baloes(1080)}
  <div style="position:absolute;left:0;right:0;top:46px;display:flex;flex-direction:column;align-items:center;gap:30px">
    ${moldura(t)}${marca(true, 0.78)}</div>
  ${pedestal(70, 1010, 520)}
  <div style="position:absolute;left:80px;top:545px;width:500px;height:500px;display:flex;align-items:flex-end;justify-content:center">
    <img src="${foto}" style="max-width:100%;max-height:100%;object-fit:contain;filter:drop-shadow(0 26px 22px rgba(0,0,0,.35))"></div>
  <div style="position:absolute;left:610px;right:60px;top:560px">
    <div class="anton" style="font-size:${tn}px;line-height:1.02;color:#0b0b0b">${nome}</div>
    <div style="margin-top:14px;font-weight:800;font-size:20px;letter-spacing:1px;color:#2b2100">${t.cod} ${p.cod}${p.marca ? ` · ${t.para} ${p.marca}` : ""}${p.extra ? ` · ${p.extra}` : ""}</div>
    ${comPreco ? `<div style="margin-top:26px;display:flex;align-items:center;gap:14px">
      ${t.precoDe(p) ? `<span style="font-weight:800;font-size:28px;color:#3a2d00;text-decoration:line-through;text-decoration-thickness:3px">${t.precoDe(p)}</span>` : ""}
      ${p.preco.desconto ? `<span class="anton" style="background:#0b0b0b;color:#f9c80e;font-size:30px;padding:4px 14px;border-radius:10px">-${p.preco.desconto}%</span>` : ""}
    </div>
    <div style="margin-top:6px">${precoGrande(t, p, t.preco(p).length > 12 ? 108 : 132)}</div>
    <div style="margin-top:18px;font-weight:900;font-size:21px;line-height:1.25;color:#0b0b0b;max-width:390px">${t.oferta}</div>
    <div style="margin-top:8px;font-weight:700;font-size:15px;color:#3a2d00">${t.nota}</div>` : `
    <div style="margin-top:26px;display:inline-block;background:#0b0b0b;border-radius:22px;padding:14px 26px 18px">
      <div class="anton" style="font-size:150px;line-height:1;color:#f9c80e">${pct}</div>
      <div class="anton" style="font-size:30px;line-height:1.1;color:#fff;margin-top:4px">${t.descLabel}</div></div>
    <div style="margin-top:20px;font-weight:900;font-size:23px;line-height:1.25;color:#0b0b0b">${t.veja}</div>
    <div style="margin-top:10px;font-weight:800;font-size:19px;line-height:1.25;color:#2b2100;max-width:400px">${t.oferta}</div>`}
  </div>
  ${fitas(t, 1080, 1350)}
</div>`;
}

// ---------------------------------------------------------------- capa (4:5, 1:1 e 9:16)
function capa(t, w, h) {
  const k = Math.min(w / 1080, h / 1350, 1);
  const centro = h / 2;
  return `<div class="l preto" style="width:${w}px;height:${h}px">
  ${confete(w, h, 70, ["#f9c80e", "#ffe27a", "#b88400"], 3)}
  ${baloes(w)}
  <div style="position:absolute;left:0;right:0;top:${h * 0.13}px;text-align:center">
    <div class="anton" style="font-size:${190 * k}px;line-height:1;color:transparent;-webkit-text-stroke:${4 * k}px #fff">${t.pre}-BLACK</div>
    <div class="anton" style="font-size:${200 * k}px;line-height:1;color:#f9c80e;text-shadow:0 0 40px rgba(249,200,14,.35)">FRIDAY</div>
  </div>
  <div style="position:absolute;left:0;right:0;top:${centro - 30 * k}px;display:flex;justify-content:center">${marca(false, 1.15 * k + 0.1)}</div>
  <div style="position:absolute;left:0;right:0;top:${centro + 170 * k}px;text-align:center">
    <div style="display:inline-flex;align-items:center;gap:18px">
      <span class="anton" style="font-size:${120 * k}px;color:#f9c80e;line-height:1">${pct}</span>
      <span class="anton" style="font-size:${46 * k}px;line-height:1.05;color:#fff;text-align:left">${t.todo.replace(/ (EL|O) /, " $1<br>")}</span></div>
    <div style="margin-top:${22 * k}px;font-weight:800;font-size:${26 * k}px;letter-spacing:${4 * k}px;color:#e5e5e5">${t.comeca}</div>
  </div>
  ${fitas(t, w, h)}
</div>`;
}

// ---------------------------------------------------------------- gera
// ---------------------------------------------------------------- card em story (9:16)
// Zona segura: nada importante nos ~250 px de cima (perfil) e ~300 px de baixo (responder).
function storyCard(t, p, foto, comPreco) {
  const nome = t.nome(p).toUpperCase();
  const tn = nome.length > 34 ? 54 : nome.length > 20 ? 62 : 76;
  const meta = `${t.cod} ${p.cod}${p.marca ? ` · ${t.para} ${p.marca}` : ""}${p.extra ? ` · ${p.extra}` : ""}`;
  const valorPreco = () => {
    const v = t.preco(p).replace(/^(R\$|\$U)\s*/, "");
    const [int, cent] = v.split(",");
    return `<div style="display:inline-flex;align-items:flex-start;gap:8px;color:#0b0b0b">
      <span class="anton" style="font-size:40px;margin-top:14px">${t.moeda}</span>
      <span class="anton" style="font-size:140px;line-height:.92">${int}</span>
      ${cent ? `<span class="anton" style="font-size:40px;margin-top:86px">,${cent}</span>` : ""}</div>`;
  };
  return `<div class="l amarelo" style="width:1080px;height:1920px">
  ${confete(1080, 760, 34, ["#0b0b0b", "#fff3b0", "#b88400"], p.cod.length, [230, 230, 850, 640])}
  <div style="position:absolute;left:0;right:0;top:120px">${baloes(1080)}</div>
  <div style="position:absolute;left:0;right:0;top:250px;display:flex;flex-direction:column;align-items:center;gap:30px">
    ${moldura(t)}${marca(true, 0.8)}</div>
  ${pedestal(270, 985, 540)}
  <div style="position:absolute;left:260px;top:620px;width:560px;height:410px;display:flex;align-items:flex-end;justify-content:center">
    <img src="${foto}" style="max-width:100%;max-height:100%;object-fit:contain;filter:drop-shadow(0 30px 26px rgba(0,0,0,.35))"></div>
  <div style="position:absolute;left:70px;right:70px;top:1238px;text-align:center">
    <div class="anton" style="font-size:${tn}px;line-height:1.02;color:#0b0b0b">${nome}</div>
    <div style="margin-top:12px;font-weight:800;font-size:24px;letter-spacing:1px;color:#2b2100">${meta}</div>
    ${
      comPreco
        ? `<div style="margin-top:18px;display:flex;justify-content:center;align-items:center;gap:16px">
             ${t.precoDe(p) ? `<span style="font-weight:800;font-size:34px;color:#3a2d00;text-decoration:line-through;text-decoration-thickness:3px">${t.precoDe(p)}</span>` : ""}
             ${p.preco.desconto ? `<span class="anton" style="background:#0b0b0b;color:#f9c80e;font-size:36px;padding:4px 16px;border-radius:12px">-${p.preco.desconto}%</span>` : ""}</div>
           <div style="margin-top:4px">${valorPreco()}</div>
           <div style="margin-top:8px;font-weight:800;font-size:20px;color:#2b2100">${t.nota.replace(/ \(.*\)$/, "")} · ${t.oferta.toLowerCase().replace(/^¡/, "").replace(/!$/, "")}</div>`
        : `<div style="margin-top:18px;display:inline-flex;align-items:center;gap:22px;background:#0b0b0b;border-radius:26px;padding:10px 32px">
             <span class="anton" style="font-size:108px;line-height:1;color:#f9c80e">${pct}</span>
             <span class="anton" style="font-size:34px;line-height:1.1;color:#fff;text-align:left">${t.descLabel.replace(/ (NA|EN LA) /, "<br>$1 ")}</span></div>
           <div style="margin-top:20px;font-weight:900;font-size:28px;color:#0b0b0b">${t.veja}</div>`
    }
  </div>
  ${fitas(t, 1080, 1920, -70)}
</div>`;
}

const amostra = process.argv.includes("--amostra");
// --stories=pt (ou pt,es): só os cards em formato story, em saida/<idioma>/stories e stories-com-preco
const argStory = process.argv.find((a) => a.startsWith("--stories="));
const STORIES = argStory ? argStory.split("=")[1].split(",") : null;
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
await pg.setContent("<body></body>");
const render = async (html, arq, w, h) => {
  fs.mkdirSync(path.dirname(arq), { recursive: true });
  await pg.setViewportSize({ width: w, height: h });
  await pg.setContent(`<!doctype html><html><head><meta charset="utf-8">${CSS}</head><body>${html}</body></html>`, {
    waitUntil: "networkidle",
  });
  await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: arq, clip: { x: 0, y: 0, width: w, height: h } });
};

// Fotos recortadas
const recortes = [];
for (const p of amostra ? PECAS.slice(0, 17) : PECAS) recortes.push(dataUri(await recortar(pg, await baixar(p.img))));

// 20 peças que vão também em versão COM preço (todas abaixo de R$ 1.000 já com o desconto)
const COM_PRECO = ["3409713VV", "265150EA", "81321600EA", "LA3976", "LA5013", "223620", "1686458EA", "81644000", "81133600VV", "820100", "PSH211", "4224811", "RE509672", "PSC504", "836640772", "D5NN11654B", "204521EA", "887896VV", "048438ATF", "041053UNI"];
const valor = (s) => Number(s.replace(/[^\d,]/g, "").replace(",", "."));
for (const c of COM_PRECO) {
  const p = PECAS.find((x) => x.cod === c);
  if (!p) throw new Error(`peça com preço não encontrada: ${c}`);
  if (valor(p.preco.brl) >= 1000) throw new Error(`${c} custa ${p.preco.brl} (acima de R$ 1.000)`);
}
const nomeCard = (i, p, idioma) =>
  `${String(i + 1).padStart(3, "0")}_${slug(TXT[idioma].nome(p))}_${p.cod.toLowerCase()}.png`;
if (STORIES) {
  for (const idioma of STORIES) {
    const t = TXT[idioma];
    const dir = path.join(PASTA, "saida", idioma);
    if (!amostra) for (const d of ["stories", "stories-com-preco"]) fs.rmSync(path.join(dir, d), { recursive: true, force: true });
    const feitos = [];
    for (const [i, p] of PECAS.entries()) {
      if (i >= recortes.length) break;
      const arq = path.join(dir, "stories", nomeCard(i, p, idioma));
      await render(storyCard(t, p, recortes[i], false), arq, 1080, 1920);
      feitos.push(arq);
      if (COM_PRECO.includes(p.cod)) {
        const n = COM_PRECO.indexOf(p.cod) + 1;
        await render(storyCard(t, p, recortes[i], true), path.join(dir, "stories-com-preco", `${String(n).padStart(2, "0")}_${nomeCard(i, p, idioma).slice(4)}`), 1080, 1920);
      }
    }
    if (!amostra) {
      await pg.setViewportSize({ width: 1600, height: 1000 });
      // Página no disco (imagens lidas do arquivo): embutir 100 stories inteiros derruba o navegador
      const html = path.join(dir, "_mosaico.html");
      fs.writeFileSync(html, `<body style="margin:0;background:#18181b;padding:12px;display:grid;grid-template-columns:repeat(14,1fr);gap:6px">${feitos.map((a) => `<img src="${path.relative(dir, a).replace(/\\/g, "/")}" style="width:100%;border-radius:4px">`).join("")}</body>`);
      await pg.goto("file:///" + html.replace(/\\/g, "/"), { waitUntil: "load" });
      fs.rmSync(html);
      await pg.screenshot({ path: path.join(PASTA, "saida", `mosaico_stories_${idioma}.png`), fullPage: true });
    }
    const n2 = fs.existsSync(path.join(dir, "stories-com-preco")) ? fs.readdirSync(path.join(dir, "stories-com-preco")).length : 0;
    console.log(`✔ stories ${idioma}: ${feitos.length} sem preço + ${n2} com preço`);
  }
  await b.close();
  process.exit(0);
}
for (const idioma of amostra ? ["pt", "es"] : ["es", "pt"]) {
  const t = TXT[idioma];
  const dir = path.join(PASTA, "saida", idioma);
  if (!amostra) fs.rmSync(dir, { recursive: true, force: true });
  await render(capa(t, 1080, 1350), path.join(dir, "capa_feed_1080x1350.png"), 1080, 1350);
  await render(capa(t, 1080, 1080), path.join(dir, "capa_quadrada_1080x1080.png"), 1080, 1080);
  await render(capa(t, 1080, 1920), path.join(dir, "capa_story_1080x1920.png"), 1080, 1920);
  const feitos = [];
  for (const [i, p] of PECAS.entries()) {
    if (i >= recortes.length) break;
    const arq = path.join(dir, "cards", nomeCard(i, p, idioma));
    await render(card(t, p, recortes[i], false), arq, 1080, 1350);
    feitos.push(arq);
    if (COM_PRECO.includes(p.cod)) {
      const n = COM_PRECO.indexOf(p.cod) + 1;
      await render(card(t, p, recortes[i], true), path.join(dir, "com-preco", `${String(n).padStart(2, "0")}_${nomeCard(i, p, idioma).slice(4)}`), 1080, 1350);
    }
  }
  if (!amostra) {
    await pg.setViewportSize({ width: 1600, height: 1000 });
    await pg.setContent(
      `<body style="margin:0;background:#18181b;padding:12px;display:grid;grid-template-columns:repeat(10,1fr);gap:6px">${feitos
        .map((a) => `<img src="${dataUri(a)}" style="width:100%;border-radius:4px">`)
        .join("")}</body>`,
      { waitUntil: "load" },
    );
    await pg.screenshot({ path: path.join(PASTA, "saida", `mosaico_${idioma}.png`), fullPage: true });
  }
  console.log(`✔ ${idioma}: 3 capas + ${feitos.length} cards sem preço + ${fs.existsSync(path.join(dir, "com-preco")) ? fs.readdirSync(path.join(dir, "com-preco")).length : 0} com preço`);
}
await b.close();

// Carrosséis: capa + 9 cards (o Facebook aceita até 10 imagens por carrossel)
if (!amostra) {
  const md = [
    `# Carrosséis da pré-Black (preços de ${DADOS.data}, ${pct} no site todo)\n`,
    "Cada carrossel = `capa_feed_1080x1350.png` + 9 cards, nesta ordem. Servem para Instagram e Facebook (até 10 imagens).\n",
  ];
  for (let c = 0; c * 9 < PECAS.length; c++) {
    const grupo = PECAS.slice(c * 9, c * 9 + 9).map((p, k) => [c * 9 + k, p]);
    md.push(`## Carrossel ${c + 1}${grupo.length < 2 ? " (post avulso)" : ""}\n`);
    for (const idioma of ["es", "pt"])
      md.push(`**${idioma.toUpperCase()}:** capa → ${grupo.map(([i, p]) => `\`${nomeCard(i, p, idioma)}\``).join(", ")}\n`);
  }
  fs.writeFileSync(path.join(PASTA, "carrosseis.md"), md.join("\n"));
  console.log("✔ carrosseis.md");
}
