// Padrão AGRO PARTS para Instagram (1080x1080): ofertas do dia e do mês, posts de marca,
// estoque, datas comemorativas e chamadas para o cliente.
//
// Uso (raiz do projeto):  npx tsx marketing/redes/gerar.mjs
// Saída: marketing/redes/saida/  (PNGs, legendas.md, mosaico.png)
//
// Fundos em marketing/redes/fundos/:
//   campo.jpg (padrão), envios.jpg (envios) e, se existirem, uma foto por marca:
//   john-deere.jpg, massey-ferguson.jpg, new-holland.jpg, valtra.jpg, case-ih.jpg.
//   Sem a foto da marca, usa campo.jpg com a cor da marca por cima.
// Peças: CSV importado + fotos de public/catalogo, recortadas do fundo branco (cache em recortes/).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { nomeEs, categoriaEs } from "../../src/lib/pecas-es.ts";

const require = createRequire(import.meta.url);
const RAIZ = process.cwd();
const DIR = path.join(RAIZ, "marketing/redes");
const OUT = path.join(DIR, "saida");
const REC = path.join(DIR, "recortes");
const { chromium } = require(path.join(RAIZ, "node_modules/playwright"));
const { lerCsv } = require(path.join(RAIZ, "scripts/catalogo/importar_agrotrator.cjs"));
const C = JSON.parse(fs.readFileSync(path.join(DIR, "config.json"), "utf8"));
const SITE = C.site;
const url = (p) => pathToFileURL(p).href;
const LOGO = url(path.join(RAIZ, "public/logo.png"));
const fundo = (n) => {
  const f = path.join(DIR, "fundos", n);
  return fs.existsSync(f) ? url(f) : null;
};
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// ---------- Peças ----------
const cacheFotos = JSON.parse(fs.readFileSync(path.join(RAIZ, "marketing/estudio/cache_fotos.json"), "utf8"));
const RUIDO = /\b(trator|tractor|massey|ferguson|valtra|valmet|john|deere|new|holland|nh|ce|case|ih|ford|agrale|jd|mf|para|construction|contruction|ref)\b/gi;
const semAc = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");
function nomeCurto(p) {
  let n = nomeEs(p.nome);
  for (const t of [p.codigo_fabricante, p.sku]) if (t) n = n.replace(new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "gi"), "");
  const fab = semAc(p.fabricante || "").toUpperCase().split(/\s+/);
  n = n.split(" ").filter((w) => !fab.includes(semAc(w).toUpperCase())).join(" ");
  n = n.replace(RUIDO, "").replace(/\s{2,}/g, " ").trim().replace(/(\s+(y|e|de|del|con|para|la|el|-|\/))+$/i, "");
  return n.length > 40 ? n.slice(0, 38).replace(/\s+\S*$/, "") + "…" : n;
}
const pecas = lerCsv(path.join(RAIZ, "PRODUCTS"))
  .map((p) => ({ ...p, foto: p.fotos.find((f) => fs.existsSync(path.join(RAIZ, "public/catalogo", f.destino)))?.destino }))
  .filter((p) => p.foto && cacheFotos[p.foto] && cacheFotos[p.foto].massa >= 0.18 && cacheFotos[p.foto].forma >= 0.35)
  .map((p) => ({ ...p, curto: nomeCurto(p), cat: categoriaEs(p.categoria) }));
let semente = C.seed || 1;
const rnd = () => ((semente = (semente * 16807) % 2147483647) - 1) / 2147483646;
const usadas = new Set();
const pegar = (f, n) => {
  const r = pecas.filter((p) => f(p) && !usadas.has(p.sku)).map((p) => [rnd(), p]).sort((a, b) => a[0] - b[0]).slice(0, n).map((x) => x[1]);
  r.forEach((p) => usadas.add(p.sku));
  return r;
};

// ---------- Estilo ----------
const BASE = `
<link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,800;1,900&display=swap" rel="stylesheet">
<style>
:root{--verde:#0b7a3b;--verde2:#08612e;--oscuro:#063d1e;--amarillo:#ffd200;--blanco:#fff}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Montserrat",sans-serif;color:#fff;-webkit-font-smoothing:antialiased}
.l{position:relative;width:1080px;height:1080px;overflow:hidden;background:var(--verde)}
.foto{position:absolute;inset:0;background-size:cover;background-position:center}
.recorte{position:absolute;object-fit:contain;filter:drop-shadow(0 26px 28px rgba(0,0,0,.35))}
.logo{position:absolute;display:flex;align-items:center;gap:14px}
.logo img{width:74px;height:74px;background:#fff;border-radius:20px;padding:6px}
.logo b{display:block;font-size:36px;font-weight:900;letter-spacing:.5px;line-height:1}
.logo span{display:block;font-size:13px;font-weight:700;letter-spacing:4px;margin-top:4px;color:var(--amarillo)}
.amar{color:var(--amarillo)}
.placa{position:absolute;border-radius:22px;padding:6px;background:linear-gradient(180deg,#f4f4f4,#9a9a9a 45%,#e9e9e9 55%,#777);box-shadow:0 18px 30px rgba(0,0,0,.35),0 0 30px rgba(120,255,160,.25)}
.placa>div{border-radius:16px;padding:22px 40px;background:radial-gradient(circle,#2c2c2c 1.6px,transparent 2px) 0 0/12px 12px,linear-gradient(180deg,#5a5a5a,#2b2b2b);text-align:center}
.placa h2{font-size:104px;font-weight:900;font-style:italic;line-height:.92;letter-spacing:-2px;background:linear-gradient(180deg,#fff 0%,#e9e9e9 45%,#9e9e9e 52%,#f5f5f5 100%);-webkit-background-clip:text;color:transparent;filter:drop-shadow(0 3px 0 #111)}
.estrella{position:absolute;display:grid;place-items:center;text-align:center;color:#063d1e}
.estrella svg{position:absolute;inset:0;filter:drop-shadow(0 12px 18px rgba(0,0,0,.3))}
.estrella div{position:relative;transform:rotate(-12deg);font-weight:900;line-height:.95}
.barra{position:absolute;left:0;right:0;bottom:0;height:86px;background:var(--verde2);display:flex;align-items:center;justify-content:center;gap:34px;font-size:24px;font-weight:800}
.chip{display:inline-flex;align-items:center;gap:12px;border-radius:999px;font-weight:800}
.ico{width:1em;height:1em;flex:none}
</style>`;
const WHATS = `<svg class="ico" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg>`;
const logo = (x, y, escuro = false) => `<div class="logo" style="left:${x}px;top:${y}px"><img src="${LOGO}"><div><b style="color:${escuro ? "var(--oscuro)" : "#fff"}">AGRO PARTS</b><span style="${escuro ? "color:#a77900" : ""}">REPUESTOS AGRÍCOLAS</span></div></div>`;
const estrelaSvg = (cor = "#ffd200") => {
  const pts = Array.from({ length: 40 }, (_, i) => { const r = i % 2 ? 44 : 50, a = (i / 40) * Math.PI * 2; return `${50 + r * Math.cos(a)},${50 + r * Math.sin(a)}`; }).join(" ");
  return `<svg viewBox="0 0 100 100"><polygon points="${pts}" fill="${cor}"/></svg>`;
};
const estrela = (x, y, tam, linhas) => `<div class="estrella" style="left:${x}px;top:${y}px;width:${tam}px;height:${tam}px">${estrelaSvg()}<div>${linhas}</div></div>`;
const contato = () => `<div class="barra"><span>${WHATS.replace('class="ico"', 'class="ico" style="font-size:30px;color:var(--amarillo)"')} ${C.whatsapp ? `WhatsApp: ${C.whatsapp}` : "Cotizá por WhatsApp"}</span><span class="amar">${SITE}</span><span>Envíos a todo Uruguay</span></div>`;
const CORES = { "John Deere": "#367c2b", "Massey Ferguson": "#c8102e", "New Holland": "#0a5bb5", Valtra: "#c8102e", "Case IH": "#b5121b" };

// Fundo ilustrado quando não há foto: céu, colinas e campo dourado (desenhado em CSS)
const campo = (extra = "") => `<div class="foto" style="${extra};overflow:hidden">
  <div style="position:absolute;inset:0;background:radial-gradient(120% 40% at 70% 56%,rgba(255,214,140,.55),transparent 60%),linear-gradient(180deg,#0f3b2e 0%,#2b6b57 32%,#8fb79a 54%,#d9cf9a 60%)"></div>
  <div style="position:absolute;left:-5%;right:-5%;top:50%;height:12%;background:#2f5e3a;clip-path:polygon(0 70%,12% 35%,26% 55%,41% 20%,56% 48%,70% 25%,85% 52%,100% 30%,100% 100%,0 100%)"></div>
  <div style="position:absolute;left:-5%;right:-5%;top:54%;height:9%;background:#4c7d44;clip-path:polygon(0 60%,18% 30%,33% 55%,52% 25%,68% 50%,84% 28%,100% 45%,100% 100%,0 100%)"></div>
  <div style="position:absolute;left:0;right:0;top:60%;bottom:0;background:repeating-linear-gradient(96deg,rgba(110,70,15,.22) 0 3px,transparent 3px 11px),repeating-linear-gradient(84deg,rgba(255,236,170,.25) 0 2px,transparent 2px 14px),linear-gradient(180deg,#e0bd6a 0%,#c9963f 45%,#8f6224 100%)"></div>
</div>`;

// ---------- Recorte do fundo branco (no navegador, com cache) ----------
async function recortar(nav, lista) {
  fs.mkdirSync(REC, { recursive: true });
  const faltam = lista.filter((f) => !fs.existsSync(path.join(REC, f.replace(/\.jpg$/, ".png"))));
  if (!faltam.length) return;
  const pg = await nav.newPage();
  for (const f of faltam) {
    const src = "data:image/jpeg;base64," + fs.readFileSync(path.join(RAIZ, "public/catalogo", f)).toString("base64");
    const png = await pg.evaluate(async (src) => {
      const img = new Image(); img.src = src; await img.decode();
      const w = img.width, h = img.height, c = document.createElement("canvas"); c.width = w; c.height = h;
      const g = c.getContext("2d"); g.drawImage(img, 0, 0);
      const d = g.getImageData(0, 0, w, h), px = d.data;
      const claro = (i) => { const r = px[i], gg = px[i + 1], b = px[i + 2]; return Math.min(r, gg, b) > 228 && Math.max(r, gg, b) - Math.min(r, gg, b) < 22; };
      // Inunda a partir das bordas: só o branco ligado à borda vira transparente (o branco da peça fica)
      const fora = new Uint8Array(w * h), fila = [];
      for (let x = 0; x < w; x++) { fila.push(x, (h - 1) * w + x); }
      for (let y = 0; y < h; y++) { fila.push(y * w, y * w + w - 1); }
      while (fila.length) {
        const k = fila.pop(); if (fora[k] || !claro(k * 4)) continue; fora[k] = 1;
        const x = k % w, y = (k / w) | 0;
        if (x > 0) fila.push(k - 1); if (x < w - 1) fila.push(k + 1); if (y > 0) fila.push(k - w); if (y < h - 1) fila.push(k + w);
      }
      // Furos fechados (miolo de anel, retentor, rolamento): áreas grandes de branco puro do fundo
      // da foto, sem ligação com a borda. Branco com sombra (peça branca) não entra.
      const puro = (i) => { const r = px[i], gg = px[i + 1], b = px[i + 2]; return Math.min(r, gg, b) > 244 && Math.max(r, gg, b) - Math.min(r, gg, b) < 10; };
      const visto = new Uint8Array(w * h);
      for (let s0 = 0; s0 < w * h; s0++) {
        if (fora[s0] || visto[s0] || !puro(s0 * 4)) continue;
        const regiao = [], pilha = [s0];
        visto[s0] = 1;
        while (pilha.length) {
          const k = pilha.pop(); regiao.push(k);
          const x = k % w, y = (k / w) | 0;
          for (const v of [x > 0 ? k - 1 : -1, x < w - 1 ? k + 1 : -1, y > 0 ? k - w : -1, y < h - 1 ? k + w : -1]) {
            if (v >= 0 && !visto[v] && !fora[v] && puro(v * 4)) { visto[v] = 1; pilha.push(v); }
          }
        }
        if (regiao.length > w * h * 0.004) for (const k of regiao) fora[k] = 1;
      }
      for (let k = 0; k < w * h; k++) {
        if (fora[k]) { px[k * 4 + 3] = 0; continue; }
        // Borda suave: pixels claros encostados no fundo ficam semitransparentes
        const x = k % w, y = (k / w) | 0;
        const viz = (x > 0 && fora[k - 1]) || (x < w - 1 && fora[k + 1]) || (y > 0 && fora[k - w]) || (y < h - 1 && fora[k + w]);
        if (viz) { const m = (px[k * 4] + px[k * 4 + 1] + px[k * 4 + 2]) / 3; px[k * 4 + 3] = Math.max(60, Math.min(255, (255 - m) * 6)); }
      }
      g.putImageData(d, 0, 0);
      return c.toDataURL("image/png");
    }, src);
    fs.writeFileSync(path.join(REC, f.replace(/\.jpg$/, ".png")), Buffer.from(png.split(",")[1], "base64"));
  }
  await pg.close();
}
const rec = (p) => url(path.join(REC, p.foto.replace(/\.jpg$/, ".png")));

// ---------- Modelos ----------
const ITENS = [];
const add = (nome, html, legenda) => ITENS.push({ nome, html, legenda });
const TAGS = "#AgroParts #RepuestosAgricolas #Uruguay #Tractores #CampoUruguayo";
const fotoMarca = (m) => fundo(`${slug(m)}.jpg`);

// 1. Oferta del día
function ofertaDia(p, i) {
  const bg = fotoMarca(p.marca);
  add(`oferta_dia_${String(i + 1).padStart(2, "0")}_${p.sku}`, `<div class="l">
  ${bg ? `<div class="foto" style="background-image:url('${bg}');filter:grayscale(.2)"></div>` : campo()}
  <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(11,122,59,.94) 0%,rgba(11,122,59,.88) 52%,rgba(11,122,59,.4) 100%)"></div>
  <div style="position:absolute;right:-120px;top:0;bottom:0;width:560px;background:#fff;transform:skewX(-14deg)"></div>
  <div class="placa" style="left:50px;top:52px"><div><h2>OFERTA<br>DEL DÍA</h2></div></div>
  ${logo(660, 112, true)}
  <div style="position:absolute;left:60px;top:420px;width:430px">
    <div style="font-size:38px;font-weight:500;letter-spacing:1px">${p.codigo_fabricante}</div>
    <div style="font-size:40px;font-weight:900;line-height:1.1;margin-top:8px;text-transform:uppercase">${p.curto}</div>
    ${p.marca ? `<div style="font-size:24px;font-weight:700;margin-top:12px;color:#c9f0d6">Para ${p.marca}</div>` : ""}
  </div>
  <img class="recorte" src="${rec(p)}" style="left:500px;top:300px;width:560px;height:560px">
  ${estrela(80, 640, 240, '<div style="font-size:46px">PRECIO</div><div style="font-size:30px">IMBATIBLE</div>')}
  <div class="chip" style="position:absolute;left:60px;top:925px;font-size:23px">${WHATS.replace('class="ico"', 'class="ico" style="color:var(--amarillo);font-size:40px"')} ¡CONSULTÁ POR WHATSAPP!</div>
  ${contato()}
</div>`, `🔥 OFERTA DEL DÍA\n${p.curto}${p.marca ? ` para ${p.marca}` : ""} · Cód. ${p.codigo_fabricante}\nPrecio imbatible: consultá por WhatsApp en ${SITE}. Envíos a todo Uruguay.\n\n${TAGS}`);
}

// 2. Ofertas del mes
function ofertaMes(ps, i) {
  const o = C.ofertaMes;
  add(`oferta_mes_${String(i + 1).padStart(2, "0")}`, `<div class="l">
  ${campo()}
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,61,30,.92) 0%,rgba(11,122,59,.85) 45%,rgba(11,122,59,.35) 100%)"></div>
  ${logo(56, 50)}
  <div style="position:absolute;left:56px;top:170px">
    <div style="font-size:30px;font-weight:700;letter-spacing:6px" class="amar">OFERTAS DE</div>
    <div style="font-size:120px;font-weight:900;font-style:italic;line-height:.9;letter-spacing:-3px;text-transform:uppercase">${C.mes}</div>
  </div>
  ${estrela(760, 120, 260, `<div style="font-size:24px">${o.prefixo}</div><div style="font-size:84px;letter-spacing:-3px">${o.percentual}%</div><div style="font-size:30px">${o.sufixo}</div>`)}
  <div style="position:absolute;left:40px;right:40px;top:440px;height:470px;background:#fff;border-radius:28px;transform:skewY(-3deg)"></div>
  <div style="position:absolute;left:56px;right:56px;top:450px;display:grid;grid-template-columns:repeat(${ps.length},1fr);gap:16px">
    ${ps.map((p) => `<div style="text-align:center;color:var(--oscuro)"><img src="${rec(p)}" style="width:100%;height:270px;object-fit:contain;filter:drop-shadow(0 14px 14px rgba(0,0,0,.25))"><div style="font-size:21px;font-weight:800;line-height:1.15;margin-top:12px;text-transform:uppercase">${p.curto}</div><div style="font-size:17px;font-weight:600;margin-top:6px;color:#4a6b55">Cód. ${p.codigo_fabricante}</div></div>`).join("")}
  </div>
  <div style="position:absolute;left:56px;bottom:104px;font-size:17px;color:#e3f3e8">${o.condicoes}</div>
  ${contato()}
</div>`, `🗓️ OFERTAS DE ${C.mes.toUpperCase()}: ${o.prefixo.toLowerCase()} ${o.percentual}% ${o.sufixo}\n${ps.map((p) => `• ${p.curto} (Cód. ${p.codigo_fabricante})`).join("\n")}\nPedí tu precio por WhatsApp en ${SITE}.\n${o.condicoes}\n\n${TAGS}`);
}

// 3. Marca: "el lugar indicado para repuestos de tu …"
function marca(m, i) {
  const foto = fotoMarca(m);
  const cor = CORES[m] || "#0b7a3b";
  const [p1, p2] = pegar((p) => p.marca === m, 2);
  add(`marca_${String(i + 1).padStart(2, "0")}_${slug(m)}`, `<div class="l" style="background:#fff">
  ${foto ? `<div class="foto" style="background-image:url('${foto}')"></div>` : campo()}
  <div style="position:absolute;right:-180px;top:-40px;width:760px;height:700px;background:linear-gradient(160deg,var(--verde) 0%,var(--oscuro) 100%);transform:skewX(-12deg);opacity:.97"></div>
  ${logo(640, 70)}
  <div style="position:absolute;right:60px;top:220px;width:430px;text-align:right">
    <div style="font-size:42px;font-weight:800;line-height:1.18">AGRO PARTS es el lugar indicado para encontrar repuestos para <span class="amar">${m}</span>.</div>
    <div style="font-size:26px;font-weight:800;margin-top:26px" class="amar">¡Escribinos por WhatsApp!</div>
  </div>
  ${[p1, p2].filter(Boolean).map((p, k) => `<img class="recorte" src="${rec(p)}" style="left:${60 + k * 300}px;top:${620 - k * 40}px;width:${330 - k * 40}px;height:${330 - k * 40}px">`).join("")}
  <div class="chip" style="position:absolute;left:60px;top:960px;background:#fff;color:var(--oscuro);font-size:26px;padding:16px 28px;box-shadow:0 10px 24px rgba(0,0,0,.2)">${SITE}</div>
</div>`, `🚜 ¿Tenés un ${m}? En AGRO PARTS encontrás los repuestos que tu máquina necesita.\nBuscá por código en ${SITE} y escribinos por WhatsApp. Envíos a todo Uruguay.\n\n${TAGS} #${m.replace(/\s+/g, "")}`);
}

// 4. Estoque
function estoque(ps) {
  add("institucional_stock", `<div class="l" style="background:#fff">
  ${campo("right:380px")}
  <div style="position:absolute;inset:0 380px 0 0;background:linear-gradient(0deg,rgba(255,255,255,.95) 0%,rgba(255,255,255,0) 45%)"></div>
  <div style="position:absolute;right:-140px;top:0;bottom:0;width:620px;background:var(--verde);transform:skewX(-12deg)"></div>
  <div style="position:absolute;right:60px;top:300px;width:400px;text-align:right">
    <div style="font-size:48px;font-weight:900;line-height:1.08">Más de 29.000 repuestos para tu tractor</div>
    <div style="font-size:27px;font-weight:500;line-height:1.4;margin-top:24px">Variedad, código original y atención rápida, todo en un solo lugar.</div>
  </div>
  ${ps.map((p, k) => { const pos = [[40, 520, 330], [300, 560, 300], [120, 760, 260], [430, 760, 250], [560, 620, 230]][k]; return `<img class="recorte" src="${rec(p)}" style="left:${pos[0]}px;top:${pos[1]}px;width:${pos[2]}px;height:${pos[2]}px">`; }).join("")}
  <div style="position:absolute;left:40px;bottom:30px;font-size:13px;color:#555;letter-spacing:1px">IMÁGENES ILUSTRATIVAS</div>
  ${logo(700, 950)}
</div>`, `📦 Más de 29.000 repuestos para tractores y cosechadoras: transmisión, hidráulica, filtros, rodamientos, embragues y más.\nBuscá por código en ${SITE} y pedí tu precio por WhatsApp.\n\n${TAGS}`);
}

// 5. Datas comemorativas
function fecha(f, i) {
  add(`institucional_fecha_${String(i + 1).padStart(2, "0")}_${slug(f.titulo).slice(0, 28)}`, `<div class="l">
  ${campo()}
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,61,30,.95) 0%,rgba(8,97,46,.75) 38%,rgba(0,0,0,0) 62%)"></div>
  <div style="position:absolute;left:70px;top:110px;width:880px">
    ${f.dia ? `<div style="font-size:32px;font-weight:500;letter-spacing:1px;text-transform:uppercase">${f.dia}</div>` : ""}
    <div style="font-size:78px;font-weight:800;line-height:1.05;margin-top:12px">${f.titulo}</div>
  </div>
  <div style="position:absolute;left:0;bottom:0;width:620px;height:400px;background:var(--verde2);clip-path:polygon(0 0,100% 0,82% 100%,0 100%)"></div>
  <div style="position:absolute;left:70px;bottom:80px;width:440px;font-size:34px;font-weight:500;line-height:1.35">${f.texto}</div>
  ${logo(700, 950)}
</div>`, `${f.dia ? `🌾 ${f.dia} · ` : "🌾 "}${f.titulo}\n${f.texto}\n\n${TAGS}`);
}

// 6. Chamadas para o cliente
function chamadas(ps) {
  add("chamada_01_envios", `<div class="l">
  <div class="foto" style="background-image:url('${fundo("envios.jpg")}');background-position:center 70%"></div>
  <div style="position:absolute;left:-200px;top:0;bottom:0;width:760px;background:var(--verde);transform:skewX(-12deg);opacity:.96"></div>
  ${logo(56, 60)}
  <div style="position:absolute;left:60px;top:300px;width:470px">
    <div style="font-size:66px;font-weight:900;line-height:1.02">Enviamos a <span class="amar">todo Uruguay</span></div>
    <div style="font-size:28px;font-weight:500;line-height:1.4;margin-top:26px">Despachamos por DAC a los 19 departamentos, con número de seguimiento.</div>
  </div>
  ${contato()}
</div>`, `📦 Enviamos a todo Uruguay por DAC, con número de seguimiento. Pedí tu repuesto en ${SITE}.\n\n${TAGS}`);

  add("chamada_02_hablanos", `<div class="l">
  <div class="foto" style="background-image:url('${fundo("campo.jpg")}');background-position:92% 65%;background-size:260%"></div>
  <div style="position:absolute;inset:0;background:linear-gradient(90deg,rgba(6,61,30,.95) 0%,rgba(11,122,59,.85) 55%,rgba(11,122,59,.2) 100%)"></div>
  ${logo(56, 60)}
  <div style="position:absolute;left:60px;top:260px;width:620px">
    <div style="font-size:72px;font-weight:900;line-height:1.02">¿Tu tractor necesita un repuesto?</div>
    <div style="font-size:30px;font-weight:500;line-height:1.4;margin-top:26px">Mandanos el código, el modelo o una foto de la pieza y te pasamos precio y envío.</div>
    <div class="chip" style="margin-top:40px;background:#25D366;color:#06381b;font-size:34px;padding:22px 36px">${WHATS} ¡Hablá con nosotros!</div>
  </div>
  ${contato()}
</div>`, `🔧 ¿Tu tractor necesita un repuesto? Mandanos el código, el modelo o una foto por WhatsApp y te pasamos precio y envío. 👉 ${SITE}\n\n${TAGS}`);

  add("chamada_03_codigo", `<div class="l" style="background:#fff">
  <div style="position:absolute;left:-160px;top:0;bottom:0;width:700px;background:var(--verde);transform:skewX(-12deg)"></div>
  ${logo(56, 60)}
  <div style="position:absolute;left:60px;top:250px;width:440px">
    <div style="font-size:30px;font-weight:700;letter-spacing:4px" class="amar">BUSCÁ POR CÓDIGO</div>
    <div style="font-size:60px;font-weight:900;line-height:1.05;margin-top:14px">Escribí el código y encontrá tu pieza</div>
    <div style="margin-top:40px;background:#fff;color:#333;border-radius:999px;padding:22px 30px;font-size:30px;font-weight:600;box-shadow:0 14px 30px rgba(0,0,0,.25);display:flex;gap:16px;align-items:center"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="#0b7a3b" stroke-width="2.6"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>${ps[0].codigo_fabricante}</div>
  </div>
  <img class="recorte" src="${rec(ps[0])}" style="left:560px;top:250px;width:480px;height:480px">
  <div style="position:absolute;left:560px;right:40px;top:760px;color:var(--oscuro);text-align:center"><div style="font-size:30px;font-weight:900;text-transform:uppercase">${ps[0].curto}</div><div style="font-size:22px;font-weight:600;margin-top:8px;color:#4a6b55">Cód. ${ps[0].codigo_fabricante}</div></div>
  ${contato()}
</div>`, `🔎 ¿Tenés el código de la pieza? Escribilo en ${SITE} y la encontrás al instante. También podés buscar por nombre.\n\n${TAGS}`);

  add("chamada_04_talleres", `<div class="l">
  ${campo()}
  <div style="position:absolute;inset:0;background:rgba(6,61,30,.86)"></div>
  ${logo(56, 60)}
  <div style="position:absolute;left:60px;top:230px;width:960px">
    <div class="chip" style="background:var(--amarillo);color:var(--oscuro);font-size:26px;padding:12px 26px">PARA TALLERES Y REVENDEDORES</div>
    <div style="font-size:78px;font-weight:900;line-height:1.02;margin-top:30px">Cotizá toda tu lista <span class="amar">de una vez</span></div>
    <div style="font-size:30px;font-weight:500;line-height:1.4;margin-top:26px;width:760px">En Pedido rápido pegás los códigos con cantidades y recibís la cotización completa por WhatsApp.</div>
  </div>
  <div style="position:absolute;left:60px;right:60px;top:700px;display:flex;gap:20px">${ps.slice(1, 5).map((p) => `<div style="flex:1;background:#fff;border-radius:22px;height:170px;display:grid;place-items:center"><img src="${rec(p)}" style="width:80%;height:80%;object-fit:contain"></div>`).join("")}</div>
  ${contato()}
</div>`, `🛠️ Talleres y revendedores: en Pedido rápido (${SITE}/pedido-rapido) pegás tu lista de códigos y cotizás todo junto por WhatsApp.\n\n${TAGS}`);
}

// ---------- Montagem ----------
const dia = pegar(() => true, C.ofertasDoDia);
const mes = [pegar(() => true, 4), pegar(() => true, 4), pegar(() => true, 3)];
const est = pegar(() => true, 5);
const cham = pegar(() => true, 5);
const marcas = C.marcas;

(async () => {
  const nav = await chromium.launch();
  const todasPecas = [...dia, ...mes.flat(), ...est, ...cham];
  dia.forEach(ofertaDia);
  mes.forEach(ofertaMes);
  marcas.forEach(marca);
  estoque(est);
  C.fechas.forEach(fecha);
  chamadas(cham);
  await recortar(nav, [...new Set([...todasPecas, ...pecas.filter((p) => usadas.has(p.sku))].map((p) => p.foto))]);

  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const pg = await nav.newPage({ viewport: { width: 1080, height: 1080 } });
  const tmp = path.join(OUT, "_tmp.html");
  for (const it of ITENS) {
    fs.writeFileSync(tmp, `<!doctype html><meta charset="utf-8">${BASE}<body>${it.html}</body>`);
    await pg.goto(pathToFileURL(tmp).href, { waitUntil: "networkidle" });
    await pg.evaluate(() => document.fonts.ready);
    await pg.screenshot({ path: path.join(OUT, it.nome + ".png"), clip: { x: 0, y: 0, width: 1080, height: 1080 } });
  }
  fs.writeFileSync(path.join(OUT, "legendas.md"), "# Legendas · padrão AGRO PARTS\n\n" + ITENS.map((i) => `## ${i.nome}.png\n\n${i.legenda}\n`).join("\n"));
  const mini = ITENS.map((i) => `<figure style="margin:0"><img src="${pathToFileURL(path.join(OUT, i.nome + ".png")).href}" style="width:100%;display:block"><figcaption style="font:12px system-ui;color:#555;margin-top:4px">${i.nome}</figcaption></figure>`).join("");
  fs.writeFileSync(tmp, `<!doctype html><body style="margin:0;padding:20px;background:#e9ebe5"><div style="display:grid;grid-template-columns:repeat(6,1fr);gap:14px">${mini}</div></body>`);
  await pg.setViewportSize({ width: 2000, height: 800 });
  await pg.goto(pathToFileURL(tmp).href, { waitUntil: "load" });
  await pg.waitForTimeout(400);
  await pg.screenshot({ path: path.join(OUT, "mosaico.png"), fullPage: true });
  fs.rmSync(tmp, { force: true });
  await nav.close();
  console.log(`${ITENS.length} criativos em ${path.relative(RAIZ, OUT)}`);
})();
