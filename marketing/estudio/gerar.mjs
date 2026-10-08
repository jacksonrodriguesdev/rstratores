// Estúdio de criativos para Instagram/Facebook: gera dezenas de imagens com as peças do site.
//
// Uso (raiz do projeto):
//   npx tsx marketing/estudio/gerar.mjs                 -> usa marketing/estudio/campanha.json
//   npx tsx marketing/estudio/gerar.mjs outra.json      -> outra campanha
// Saída: marketing/estudio/saida/<nome da campanha>/  (PNGs, legendas.md e mosaico.png)
//
// As peças vêm do CSV importado (PRODUCTS/agrotrator.csv) com as fotos de public/catalogo.
// Nomes em espanhol pelo mesmo glossário do site (src/lib/pecas-es.ts).
// O percentual e o texto da oferta ficam em campanha.json: confirme antes de publicar.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { nomeEs, categoriaEs } from "../../src/lib/pecas-es.ts";

const require = createRequire(import.meta.url);
const RAIZ = process.cwd();
const { chromium } = require(path.join(RAIZ, "node_modules/playwright"));
const { lerCsv } = require(path.join(RAIZ, "scripts/catalogo/importar_agrotrator.cjs"));

const arqCampanha = process.argv[2] || path.join(RAIZ, "marketing/estudio/campanha.json");
const C = JSON.parse(fs.readFileSync(arqCampanha, "utf8"));
const OUT = path.join(RAIZ, "marketing/estudio/saida", C.nome);
const SITE = C.site;
const OF = C.oferta;
const LOGO = pathToFileURL(path.join(RAIZ, "public/logo.png")).href;
const fotoUrl = (f) => pathToFileURL(path.join(RAIZ, "public/catalogo", f)).href;

// ---------- Peças ----------
const MONTADORAS_TXT = /\b(trator|tractor|massey|ferguson|valtra|valmet|john|deere|new|holland|nh|ce|case|ih|ford|agrale|jd|mf|para|construction|contruction|ref)\b/gi;
const semAcento = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
function nomeCurto(p) {
  // Compara sem acento: o fabricante vem "TECNOPECAS" no CSV e "Tecnopeças" no título
  let n = nomeEs(p.nome);
  const fab = semAcento(p.fabricante || "").toUpperCase();
  if (fab) n = n.split(" ").filter((w) => !fab.split(/s+/).includes(semAcento(w).toUpperCase())).join(" ");
  for (const t of [p.codigo_fabricante, p.sku, ...(p.fabricante || "").split(/\s+/)]) {
    if (t && t.length >= 2) n = n.replace(new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), "");
  }
  n = n.replace(MONTADORAS_TXT, "").replace(/\s{2,}/g, " ").replace(/\s+([,.])/g, "$1").trim();
  // Conectivo solto no fim ("Filtro Combustible y")
  n = n.replace(/(\s+(y|e|de|del|con|para|la|el|-|\/))+$/i, "").trim();
  return n.length > 46 ? n.slice(0, 44).replace(/\s+\S*$/, "") + "…" : n;
}

const comFoto = lerCsv(path.join(RAIZ, "PRODUCTS"))
  .map((p) => ({ ...p, foto: p.fotos.find((f) => fs.existsSync(path.join(RAIZ, "public/catalogo", f.destino)))?.destino }))
  .filter((p) => p.foto);

// Qualidade da foto para criativo: quanto da imagem a peça ocupa ("massa") e se é fina demais
// (cabos, juntas planas). Peças brancas/claras somem no fundo creme e peças finas viram um risco.
// Medido no navegador (canvas) e guardado em cache_fotos.json.
const CACHE = path.join(RAIZ, "marketing/estudio/cache_fotos.json");
const cache = fs.existsSync(CACHE) ? JSON.parse(fs.readFileSync(CACHE, "utf8")) : {};
const faltam = [...new Set(comFoto.map((p) => p.foto))].filter((f) => !cache[f]);
if (faltam.length) {
  const nav = await chromium.launch();
  const pag = await nav.newPage();
  for (let i = 0; i < faltam.length; i += 40) {
    const lote = faltam.slice(i, i + 40).map((f) => [f, "data:image/jpeg;base64," + fs.readFileSync(path.join(RAIZ, "public/catalogo", f)).toString("base64")]);
    const r = await pag.evaluate(async (lote) => {
      const out = {};
      for (const [nome, src] of lote) {
        const img = new Image();
        img.src = src;
        await img.decode();
        const c = document.createElement("canvas");
        c.width = c.height = 160;
        const g = c.getContext("2d");
        g.fillStyle = "#fff";
        g.fillRect(0, 0, 160, 160);
        g.drawImage(img, 0, 0, 160, 160);
        const d = g.getImageData(0, 0, 160, 160).data;
        let n = 0, x0 = 160, y0 = 160, x1 = 0, y1 = 0;
        for (let k = 0; k < d.length; k += 4) {
          if ((d[k] + d[k + 1] + d[k + 2]) / 3 < 215) {
            n++;
            const px = (k / 4) % 160, py = Math.floor(k / 4 / 160);
            if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
          }
        }
        const w = Math.max(1, x1 - x0), h = Math.max(1, y1 - y0);
        out[nome] = { massa: +(n / 25600).toFixed(3), forma: +(Math.min(w, h) / Math.max(w, h)).toFixed(2) };
      }
      return out;
    }, lote);
    Object.assign(cache, r);
  }
  await nav.close();
  fs.writeFileSync(CACHE, JSON.stringify(cache));
}
const boaFoto = (p) => cache[p.foto] && cache[p.foto].massa >= 0.15 && cache[p.foto].forma >= 0.3;

const todas = comFoto.filter(boaFoto).map((p) => ({ ...p, curto: nomeCurto(p), cat: categoriaEs(p.categoria) }));
console.log(`${todas.length} de ${comFoto.length} peças com foto boa para criativo`);

// Sorteio reprodutível (mesma seed = mesmas peças)
let semente = C.seed || 1;
const aleatorio = () => ((semente = (semente * 16807) % 2147483647) - 1) / 2147483646;
const embaralhar = (a) => a.map((x) => [aleatorio(), x]).sort((x, y) => x[0] - y[0]).map((x) => x[1]);
const usadas = new Set();
function pegar(filtro, n) {
  const lista = embaralhar(todas.filter((p) => filtro(p) && !usadas.has(p.sku)));
  const r = lista.slice(0, n);
  r.forEach((p) => usadas.add(p.sku));
  return r;
}

// ---------- Visual ----------
const GRAO = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E")`;
const BASE = `
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=IBM+Plex+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>
:root{--noche:#062016;--verde:#0f4d2e;--vivo:#1d8a4a;--oro:#ffc21a;--crema:#f3efe4;--tinta:#0b1510;--whats:#25D366}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Archivo",system-ui,sans-serif;color:var(--tinta);-webkit-font-smoothing:antialiased}
.l{position:relative;overflow:hidden}
.grano::after{content:"";position:absolute;inset:0;background-image:${GRAO};opacity:.12;mix-blend-mode:overlay;pointer-events:none}
.oscuro{background:radial-gradient(90% 70% at 85% 5%,#1f6e40 0%,transparent 60%),radial-gradient(70% 60% at 0% 100%,#0d3b24 0%,transparent 70%),var(--noche);color:#fff}
.crema{background:radial-gradient(80% 60% at 70% 35%,#fffdf6 0%,var(--crema) 70%)}
.d{font-weight:900;font-stretch:72%;line-height:.88;letter-spacing:-1px}
.mono{font-family:"IBM Plex Mono",monospace}
.oro{color:var(--oro)}
.marca{display:flex;align-items:center;gap:14px}
.marca img{width:64px;height:64px;background:#fff;border-radius:18px;padding:5px}
.marca b{display:block;font-size:28px;font-weight:900;font-stretch:90%}
.marca span{display:block;font-size:13px;font-weight:700;letter-spacing:3.5px;color:var(--oro)}
.prod{mix-blend-mode:multiply;object-fit:contain}
.sombra{position:absolute;border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.28),transparent);filter:blur(6px)}
.tile{background:#fff;border-radius:30px;display:grid;place-items:center;box-shadow:0 20px 45px rgba(0,0,0,.28)}
.tile img{width:84%;height:84%;object-fit:contain}
.cta{display:flex;align-items:center;gap:14px;border-radius:999px;font-weight:900}
.chip{display:inline-flex;align-items:center;gap:8px;border-radius:999px;font-weight:800}
.selo{position:absolute;border-radius:50%;background:var(--oro);color:var(--tinta);display:grid;place-items:center;text-align:center;box-shadow:0 18px 40px rgba(0,0,0,.25)}
.selo small{display:block;font-size:.22em;font-weight:900;letter-spacing:.12em}
.selo b{display:block;font-weight:900;font-stretch:70%;line-height:.85}
.selo i{display:block;font-style:normal;font-size:.26em;font-weight:900}
.ico{width:1em;height:1em;flex:none}
</style>`;
const WHATS = `<svg class="ico" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg>`;
const marca = (claro) => `<div class="marca"><img src="${LOGO}"><div><b style="color:${claro ? "var(--noche)" : "#fff"}">AGRO PARTS</b><span style="${claro ? "color:#a77900" : ""}">REPUESTOS AGRÍCOLAS</span></div></div>`;
const selo = (tam, x, y, rot = -8) =>
  OF.ativa
    ? `<div class="selo" style="width:${tam}px;height:${tam}px;left:${x}px;top:${y}px;font-size:${tam * 0.62}px;transform:rotate(${rot}deg)"><div><small>${OF.prefixo}</small><b>${OF.percentual}%</b><i>${OF.sufixo}</i></div></div>`
    : "";
const condicoes = (cor = "rgba(255,255,255,.6)", y = 30) =>
  OF.ativa ? `<p style="position:absolute;left:64px;right:64px;bottom:${y}px;font-size:17px;color:${cor}">${OF.condicoes}</p>` : "";
const ctaBarra = (texto, fundo = "var(--whats)", cor = "#06381b") =>
  `<div class="cta" style="background:${fundo};color:${cor};font-size:30px;padding:22px 34px">${WHATS} ${texto}</div>`;

const CORES_MARCA = { "Massey Ferguson": "#d0102b", Valtra: "#e1251b", "John Deere": "#ffde00", "New Holland": "#1660c7", "Case IH": "#d0102b", Ford: "#1a4fa3" };

// ---------- Modelos ----------
const criativos = [];
const add = (nome, w, h, html, legenda) => criativos.push({ nome, w, h, html, legenda });
const tags = (p) =>
  ["#RepuestosAgricolas", "#Uruguay", "#AgroParts", p?.marca && `#${p.marca.replace(/\s+/g, "")}`, p?.cat && `#${p.cat.split(" ")[0]}`, "#Tractores", "#CampoUruguayo"]
    .filter(Boolean)
    .join(" ");
const linhaOferta = OF.ativa ? `🔥 ${OF.titulo}: ${OF.prefixo.toLowerCase()} ${OF.percentual}% ${OF.sufixo}.\n` : "";

// 1. Oferta de produto (feed 4:5, fundo claro, produto recortado)
function ofertaProduto(p, i) {
  add(`oferta_${String(i + 1).padStart(2, "0")}_${p.sku}`, 1080, 1350, `
<div class="l crema grano" style="width:1080px;height:1350px">
  <div style="position:absolute;left:64px;top:56px">${marca(true)}</div>
  <div class="chip" style="position:absolute;right:64px;top:70px;padding:12px 22px;background:var(--noche);color:#fff;font-size:22px">${p.cat}</div>
  <div class="sombra" style="left:240px;top:880px;width:600px;height:70px"></div>
  <img class="prod" src="${fotoUrl(p.foto)}" style="position:absolute;left:170px;top:190px;width:740px;height:700px">
  ${selo(250, 770, 170)}
  <div style="position:absolute;left:64px;right:64px;top:960px">
    ${p.marca ? `<div style="font-size:24px;font-weight:800;letter-spacing:3px;color:var(--vivo)">${p.marca.toUpperCase()}</div>` : ""}
    <h1 class="d" style="font-size:78px;margin-top:8px;color:var(--noche)">${p.curto}</h1>
    <div class="mono" style="font-size:26px;margin-top:14px;color:#4b5a50">Cód. ${p.codigo_fabricante}${p.fabricante ? ` · ${p.fabricante}` : ""}</div>
  </div>
  <div style="position:absolute;left:64px;bottom:64px">${ctaBarra(`Consultá precio · ${SITE}`)}</div>
</div>`, `${linhaOferta}${p.curto}${p.marca ? ` para ${p.marca}` : ""} · Cód. ${p.codigo_fabricante}\nConsultá precio y disponibilidad por WhatsApp. Envíos a todo Uruguay por DAC 🚜\n👉 ${SITE}\n\n${tags(p)}`);
}

// 2. Grade da categoria (feed 4:5, fundo escuro, 4 peças em cartões)
function gradeCategoria(cat, ps, i) {
  const nomeCat = categoriaEs(cat);
  add(`grade_${String(i + 1).padStart(2, "0")}_${nomeCat.split(" ")[0].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}`, 1080, 1350, `
<div class="l oscuro grano" style="width:1080px;height:1350px">
  <div style="position:absolute;left:64px;top:56px">${marca()}</div>
  <div style="position:absolute;left:64px;top:170px;font-size:24px;font-weight:800;letter-spacing:4px;color:var(--oro)">LO MÁS PEDIDO EN</div>
  <h1 class="d" style="position:absolute;left:64px;top:210px;width:820px;font-size:110px">${nomeCat}</h1>
  ${selo(200, 820, 150, 10)}
  <div style="position:absolute;left:64px;right:64px;top:${nomeCat.length > 14 ? 450 : 360}px;display:grid;grid-template-columns:1fr 1fr;gap:24px">
    ${ps.map((p) => `<div style="background:#fff;border-radius:28px;padding:18px;color:var(--tinta)">
      <div style="height:250px;display:grid;place-items:center"><img src="${fotoUrl(p.foto)}" style="max-width:88%;max-height:240px;object-fit:contain"></div>
      <div style="font-size:24px;font-weight:800;line-height:1.1;height:54px;overflow:hidden">${p.curto}</div>
      <div class="mono" style="font-size:18px;color:#5b6b60;margin-top:6px">Cód. ${p.codigo_fabricante}</div></div>`).join("")}
  </div>
  <div style="position:absolute;left:64px;bottom:76px">${ctaBarra("Pedí tu cotización")}</div>
  ${condicoes("rgba(255,255,255,.55)", 30)}
</div>`, `${linhaOferta}Lo más pedido en ${nomeCat} 🔧\n${ps.map((p) => `• ${p.curto} (Cód. ${p.codigo_fabricante})`).join("\n")}\nCotizá por WhatsApp en ${SITE}. Envíos a todo Uruguay.\n\n${tags({ cat: nomeCat })}`);
}

// 3. Destaque de marca (feed 4:5, nome da marca gigante vazado + 3 peças)
function marcaDestaque(m, ps, i) {
  const cor = CORES_MARCA[m] || "#ffc21a";
  const linhas = m.split(" ");
  add(`marca_${String(i + 1).padStart(2, "0")}_${m.split(" ")[0].toLowerCase()}`, 1080, 1350, `
<div class="l oscuro grano" style="width:1080px;height:1350px">
  <div style="position:absolute;left:0;top:0;width:18px;height:100%;background:${cor}"></div>
  <div style="position:absolute;left:64px;top:56px">${marca()}</div>
  <div style="position:absolute;left:56px;top:170px">
    ${linhas.map((t, k) => `<div class="d" style="font-size:${linhas.length > 1 ? 190 : 230}px;${k ? `color:transparent;-webkit-text-stroke:3px ${cor}` : ""}">${t.toUpperCase()}</div>`).join("")}
  </div>
  <div style="position:absolute;left:64px;top:${linhas.length > 1 ? 560 : 430}px;font-size:40px;font-weight:700">Repuestos para tu tractor ${m}</div>
  <div style="position:absolute;left:64px;right:64px;top:${linhas.length > 1 ? 660 : 540}px;display:flex;gap:24px">
    ${ps.map((p) => `<div style="flex:1"><div class="tile" style="height:300px"><img src="${fotoUrl(p.foto)}"></div><div style="font-size:22px;font-weight:700;margin-top:14px;line-height:1.15">${p.curto}</div><div class="mono" style="font-size:17px;color:#a9c3b1;margin-top:4px">Cód. ${p.codigo_fabricante}</div></div>`).join("")}
  </div>
  <div style="position:absolute;left:64px;bottom:64px">${ctaBarra(`Buscá por código · ${SITE}`)}</div>
</div>`, `Repuestos para tu ${m} 🚜\n${ps.map((p) => `• ${p.curto} (Cód. ${p.codigo_fabricante})`).join("\n")}\nBuscá por el código original en ${SITE} y cotizá por WhatsApp.\n\n${tags({ marca: m })}`);
}

// 4. Código gigante (feed 4:5, tipográfico)
function codigoGigante(p, i) {
  const cod = p.codigo_fabricante;
  add(`codigo_${String(i + 1).padStart(2, "0")}_${p.sku}`, 1080, 1350, `
<div class="l crema grano" style="width:1080px;height:1350px">
  <div style="position:absolute;left:64px;top:56px">${marca(true)}</div>
  <div class="mono" style="position:absolute;left:-10px;right:-10px;top:170px;text-align:center;font-size:${Math.min(250, Math.floor(1550 / cod.length))}px;font-weight:700;color:transparent;-webkit-text-stroke:3px var(--noche);letter-spacing:-4px;opacity:.9">${cod}</div>
  <img class="prod" src="${fotoUrl(p.foto)}" style="position:absolute;left:230px;top:330px;width:620px;height:560px">
  <div style="position:absolute;left:64px;right:64px;top:930px">
    <h1 class="d" style="font-size:96px;color:var(--noche)">¿Tenés este código? <span style="color:var(--vivo)">Lo tenemos.</span></h1>
    <div style="font-size:30px;font-weight:600;margin-top:18px;color:#3e4d43">${p.curto}${p.marca ? ` · ${p.marca}` : ""}</div>
  </div>
  <div style="position:absolute;left:64px;bottom:64px">${ctaBarra("Consultá precio por WhatsApp", "var(--noche)", "#fff")}</div>
</div>`, `¿Tenés el código ${cod}? Lo tenemos ✅\n${p.curto}${p.marca ? ` para ${p.marca}` : ""}.\nEscribí el código en el buscador de ${SITE} y pedí el precio por WhatsApp.\n\n${tags(p)}`);
}

// 5. Oferta da semana (feed 4:5, fundo ouro, faixa listrada, % gigante)
function ofertaSemana(ps, i) {
  if (!OF.ativa) return;
  add(`oferta_semana_${String(i + 1).padStart(2, "0")}`, 1080, 1350, `
<div class="l grano" style="width:1080px;height:1350px;background:var(--oro)">
  <div style="position:absolute;left:-40px;right:-40px;top:150px;height:86px;transform:rotate(-4deg);background:repeating-linear-gradient(-45deg,var(--noche) 0 28px,#1b1b1b 28px 56px);display:grid;place-items:center">
    <div style="font-size:42px;font-weight:900;letter-spacing:6px;color:var(--oro)">${OF.titulo.toUpperCase()}</div></div>
  <div style="position:absolute;left:64px;top:44px">${marca(true)}</div>
  <div style="position:absolute;left:56px;top:270px;color:var(--noche)">
    <div style="font-size:48px;font-weight:900;letter-spacing:4px">${OF.prefixo}</div>
    <div class="d" style="font-size:360px;line-height:.8">${OF.percentual}%</div>
    <div class="d" style="font-size:150px;margin-top:-10px">${OF.sufixo}</div>
  </div>
  <div style="position:absolute;left:64px;right:64px;top:840px;display:flex;gap:22px">
    ${ps.map((p) => `<div style="flex:1"><div class="tile" style="height:250px;box-shadow:0 14px 30px rgba(0,0,0,.18)"><img src="${fotoUrl(p.foto)}"></div><div style="font-size:21px;font-weight:800;margin-top:12px;line-height:1.15;color:var(--noche)">${p.curto}</div></div>`).join("")}
  </div>
  <div style="position:absolute;left:64px;bottom:84px">${ctaBarra(`Cotizá en ${SITE}`, "var(--noche)", "#fff")}</div>
  ${condicoes("rgba(0,0,0,.6)", 34)}
</div>`, `${OF.titulo.toUpperCase()} 🔥 ${OF.prefixo.toLowerCase()} ${OF.percentual}% ${OF.sufixo}\n${ps.map((p) => `• ${p.curto}`).join("\n")}\nPedí tu cotización por WhatsApp en ${SITE}.\n${OF.condicoes}\n\n${tags()}`);
}

// 6. Dica técnica (feed 4:5) — textos genéricos, sem prometer nada
const DICAS = {
  Filtros: ["Cambiá los filtros en cada service", "Seguí los intervalos del manual de tu tractor. Un filtro saturado hace trabajar de más al motor y al hidráulico."],
  "Rolamentos e Mancais": ["Un rodamiento con ruido avisa", "Ruido, juego o calor en la zona son señales para revisarlo antes de que se rompa y dañe otras piezas."],
  "Vedações": ["¿Pérdida de aceite? Revisá los retenes", "Un retén gastado deja salir aceite y entrar polvo. Cambiarlo a tiempo cuida todo el conjunto."],
  "Freios e Embreagens": ["¿El embrague patina?", "Si el tractor pierde fuerza al cargar o cuesta pasar los cambios, revisá el embrague."],
};
function dica(cat, p, i) {
  const [titulo, texto] = DICAS[cat];
  add(`dica_${String(i + 1).padStart(2, "0")}_${categoriaEs(cat).split(" ")[0].toLowerCase()}`, 1080, 1350, `
<div class="l oscuro grano" style="width:1080px;height:1350px">
  <div style="position:absolute;left:64px;top:56px">${marca()}</div>
  <div class="chip" style="position:absolute;left:64px;top:180px;padding:12px 22px;background:rgba(255,255,255,.12);font-size:24px">💡 Consejo de taller</div>
  <h1 class="d" style="position:absolute;left:64px;top:260px;width:950px;font-size:112px">${titulo}</h1>
  <p style="position:absolute;left:64px;top:560px;width:520px;font-size:34px;line-height:1.35;font-weight:500;color:#d4e6da">${texto}</p>
  <div class="tile" style="position:absolute;left:620px;top:560px;width:400px;height:400px;transform:rotate(4deg)"><img src="${fotoUrl(p.foto)}"></div>
  <div style="position:absolute;left:64px;top:1010px;font-size:28px;font-weight:700">${p.curto} · <span class="mono" style="font-weight:500">Cód. ${p.codigo_fabricante}</span></div>
  <div style="position:absolute;left:64px;bottom:64px">${ctaBarra(`${categoriaEs(cat)} en ${SITE}`)}</div>
</div>`, `💡 ${titulo}\n${texto}\nEncontrá ${categoriaEs(cat).toLowerCase()} para tu tractor en ${SITE} y cotizá por WhatsApp.\n\n${tags({ cat: categoriaEs(cat) })}`);
}

// 7. Story de oferta (9:16)
function storyOferta(p, i) {
  add(`story_${String(i + 1).padStart(2, "0")}_${p.sku}`, 1080, 1920, `
<div class="l oscuro grano" style="width:1080px;height:1920px">
  <div style="position:absolute;left:72px;top:150px">${marca()}</div>
  ${OF.ativa ? `<div style="position:absolute;left:72px;top:280px;font-size:30px;font-weight:900;letter-spacing:5px;color:var(--oro)">${OF.titulo.toUpperCase()}</div>` : ""}
  <h1 class="d" style="position:absolute;left:72px;top:330px;width:940px;font-size:${p.curto.length > 24 ? 98 : 126}px">${p.curto}</h1>
  <div style="position:absolute;left:140px;top:740px;width:800px;height:800px;border-radius:50%;background:radial-gradient(closest-side,#ffffff 0%,#f2f2ea 70%,rgba(242,242,234,0) 71%)"></div>
  <img src="${fotoUrl(p.foto)}" style="position:absolute;left:220px;top:820px;width:640px;height:640px;object-fit:contain;mix-blend-mode:multiply">
  ${selo(280, 720, 640, 8)}
  <div class="mono" style="position:absolute;left:72px;top:1590px;font-size:34px;color:#b9d3c1">Cód. ${p.codigo_fabricante}${p.marca ? ` · ${p.marca}` : ""}</div>
  <div style="position:absolute;left:72px;right:72px;bottom:170px">${ctaBarra(`Consultá precio · ${SITE}`).replace("font-size:30px", "font-size:38px;justify-content:center")}</div>
</div>`, `${linhaOferta}${p.curto} · Cód. ${p.codigo_fabricante}\nTocá el link y pedí el precio por WhatsApp 👆\n${SITE}`);
}

// 8. Carrossel (capa + 5 peças + fechamento), 4:5
function carrossel(cat, ps) {
  const nomeCat = categoriaEs(cat);
  const total = ps.length + 2;
  const num = (k) => `<div style="position:absolute;right:64px;top:72px;font-size:24px;font-weight:800;opacity:.6">${k}/${total}</div>`;
  add(`carrusel_01_capa`, 1080, 1350, `
<div class="l oscuro grano" style="width:1080px;height:1350px">
  <div style="position:absolute;left:64px;top:56px">${marca()}</div>${num(1)}
  <div class="d" style="position:absolute;left:56px;top:230px;font-size:300px;color:var(--oro)">TOP ${ps.length}</div>
  <h1 class="d" style="position:absolute;left:64px;top:520px;width:950px;font-size:120px">${nomeCat} para tu tractor</h1>
  <div style="position:absolute;left:64px;right:64px;top:930px;display:flex;gap:16px">${ps.slice(0, 4).map((p) => `<div class="tile" style="flex:1;height:200px"><img src="${fotoUrl(p.foto)}"></div>`).join("")}</div>
  <div style="position:absolute;left:64px;bottom:72px;font-size:34px;font-weight:800">Deslizá →</div>
</div>`, `TOP ${ps.length} en ${nomeCat} 🔧 Deslizá para ver los repuestos y pedí el precio por WhatsApp en ${SITE}.\n\n${tags({ cat: nomeCat })}`);
  ps.forEach((p, k) =>
    add(`carrusel_${String(k + 2).padStart(2, "0")}_${p.sku}`, 1080, 1350, `
<div class="l crema grano" style="width:1080px;height:1350px">
  <div style="position:absolute;left:64px;top:56px">${marca(true)}</div>${num(k + 2)}
  <div class="d" style="position:absolute;left:52px;top:150px;font-size:260px;color:rgba(6,32,22,.08)">${String(k + 1).padStart(2, "0")}</div>
  <div class="sombra" style="left:250px;top:860px;width:580px;height:60px"></div>
  <img class="prod" src="${fotoUrl(p.foto)}" style="position:absolute;left:190px;top:220px;width:700px;height:660px">
  <div style="position:absolute;left:64px;right:64px;top:950px">
    ${p.marca ? `<div style="font-size:24px;font-weight:800;letter-spacing:3px;color:var(--vivo)">${p.marca.toUpperCase()}</div>` : ""}
    <h1 class="d" style="font-size:80px;margin-top:8px;color:var(--noche)">${p.curto}</h1>
    <div class="mono" style="font-size:26px;margin-top:14px;color:#4b5a50">Cód. ${p.codigo_fabricante}</div>
  </div>
</div>`, ""),
  );
  add(`carrusel_${String(total).padStart(2, "0")}_cierre`, 1080, 1350, `
<div class="l oscuro grano" style="width:1080px;height:1350px">
  <div style="position:absolute;left:64px;top:56px">${marca()}</div>${num(total)}
  <h1 class="d" style="position:absolute;left:64px;top:260px;width:950px;font-size:130px">¿Cuál necesitás? <span class="oro">Te pasamos el precio.</span></h1>
  <p style="position:absolute;left:64px;top:700px;width:900px;font-size:38px;line-height:1.35;font-weight:600;color:#d4e6da">Buscá por código en ${SITE}, tocá «Consultar precio» y te respondemos por WhatsApp. Envíos a todo Uruguay por DAC.</p>
  <div style="position:absolute;left:64px;bottom:96px">${ctaBarra(`Cotizá en ${SITE}`).replace("font-size:30px", "font-size:40px")}</div>
</div>`, "");
}

// ---------- Montagem da campanha ----------
const Q = C.quantidade;
pegar((p) => C.categorias.includes(p.categoria), Q.ofertaProduto).forEach(ofertaProduto);
C.categorias.slice(0, 4).forEach((cat, i) => gradeCategoria(cat, pegar((p) => p.categoria === cat, 4), i));
C.marcas.forEach((m, i) => {
  const ps = pegar((p) => p.marca === m && C.categorias.includes(p.categoria), 3);
  if (ps.length === 3) marcaDestaque(m, ps, i);
});
pegar((p) => p.codigo_fabricante.length >= 5 && p.codigo_fabricante.length <= 9 && /\d/.test(p.codigo_fabricante), Q.codigoGigante).forEach(codigoGigante);
[0, 1].forEach((i) => ofertaSemana(pegar((p) => C.categorias.includes(p.categoria), 3), i));
Object.keys(DICAS).forEach((cat, i) => {
  const [p] = pegar((x) => x.categoria === cat, 1);
  if (p) dica(cat, p, i);
});
pegar((p) => C.categorias.includes(p.categoria), Q.stories).forEach(storyOferta);
carrossel(C.categorias[0], pegar((p) => p.categoria === C.categorias[0], 5));

// ---------- Render ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const pg = await b.newPage();
const tmp = path.join(OUT, "_tmp.html");
for (const c of criativos) {
  await pg.setViewportSize({ width: c.w, height: c.h });
  fs.writeFileSync(tmp, `<!doctype html><meta charset="utf-8">${BASE}<body>${c.html}</body>`);
  await pg.goto(pathToFileURL(tmp).href, { waitUntil: "networkidle" });
  await pg.evaluate(() => document.fonts.ready);
  await pg.screenshot({ path: path.join(OUT, `${c.nome}.png`), clip: { x: 0, y: 0, width: c.w, height: c.h } });
}
fs.rmSync(tmp, { force: true });

// Legendas e mosaico de conferência
fs.writeFileSync(
  path.join(OUT, "legendas.md"),
  `# Legendas · ${C.nome}\n\n${OF.ativa ? `> Oferta configurada: ${OF.prefixo} ${OF.percentual}% ${OF.sufixo}. Confirme antes de publicar.\n\n` : ""}` +
    criativos.filter((c) => c.legenda).map((c) => `## ${c.nome}.png\n\n${c.legenda}\n`).join("\n"),
);
const mini = criativos.map((c) => `<figure style="margin:0"><img src="${pathToFileURL(path.join(OUT, c.nome + ".png")).href}" style="width:100%;border-radius:8px;display:block"><figcaption style="font:12px system-ui;color:#555;margin-top:4px">${c.nome}</figcaption></figure>`).join("");
fs.writeFileSync(tmp, `<!doctype html><body style="margin:0;padding:20px;background:#eceee8"><div style="display:grid;grid-template-columns:repeat(8,1fr);gap:14px;align-items:start">${mini}</div></body>`);
await pg.setViewportSize({ width: 2000, height: 800 });
await pg.goto(pathToFileURL(tmp).href, { waitUntil: "load" });
await pg.waitForTimeout(500);
await pg.screenshot({ path: path.join(OUT, "mosaico.png"), fullPage: true });
fs.rmSync(tmp, { force: true });
await b.close();
console.log(`${criativos.length} criativos em ${path.relative(RAIZ, OUT)} (+ legendas.md e mosaico.png)`);
