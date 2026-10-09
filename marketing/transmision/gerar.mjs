// Propagandas de peças de TRANSMISSÃO do site, com a foto do trator da marca de cada peça.
// Fotos: Wikimedia Commons, licença CC BY 2.0 (crédito do autor obrigatório, vai na arte).
// Sem foto da peça (parte das fotos do catálogo veio de outra loja).
//
// Uso (raiz do projeto):  node marketing/transmision/gerar.mjs
// Saída: marketing/transmision/saida/  (PNGs 1080x1350, legendas.md, mosaico.png)
// Peças e textos: config.json
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const RAIZ = process.cwd();
const DIR = path.join(RAIZ, "marketing/transmision");
const OUT = path.join(DIR, "saida");
const { chromium } = require(path.join(RAIZ, "node_modules/playwright"));
const C = JSON.parse(fs.readFileSync(path.join(DIR, "config.json"), "utf8"));
const CRED = JSON.parse(fs.readFileSync(path.join(DIR, "fotos/creditos.json"), "utf8"));
const url = (p) => pathToFileURL(p).href;
const LOGO = url(path.join(RAIZ, "public/logo.png"));
const foto = (m) => url(path.join(DIR, "fotos", C.marcas[m].foto));
const credito = (m) => {
  const c = CRED[C.marcas[m].foto.replace(".jpg", "")];
  return `Foto: ${c.autor} · ${c.licenca} · Wikimedia Commons`;
};
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const ico = (d, s = 40, cor = "currentColor", w = 2.2) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="${cor}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const GEAR = '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>';
const TRUCK = '<path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2"/><path d="M15 18H9"/><path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14"/><circle cx="17" cy="18" r="2"/><circle cx="7" cy="18" r="2"/>';
const CHECK = '<circle cx="12" cy="12" r="10"/><path d="m8.5 12 2.5 2.5 4.5-5"/>';
const WA = (s = 40, cor = "currentColor") =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24"><path fill="${cor}" d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.07-.3-.15-1.25-.46-2.38-1.47-.88-.79-1.47-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.5a9.45 9.45 0 0 1-4.82-1.32l-.35-.2-3.58.94.96-3.49-.23-.36a9.43 9.43 0 0 1-1.45-5.03c0-5.22 4.25-9.46 9.48-9.46 2.53 0 4.9.99 6.69 2.78a9.4 9.4 0 0 1 2.77 6.69c0 5.22-4.25 9.46-9.46 9.46zm8.05-17.51A11.3 11.3 0 0 0 12.04.67C5.77.67.67 5.77.67 12.03c0 2 .52 3.96 1.52 5.68L.57 23.33l5.75-1.51a11.35 11.35 0 0 0 5.71 1.46c6.26 0 11.36-5.1 11.36-11.36 0-3.03-1.18-5.89-3.32-8.03z"/></svg>`;

const BASE = `
<link href="https://fonts.googleapis.com/css2?family=Montserrat:ital,wght@0,500;0,600;0,700;0,800;0,900;1,900&family=JetBrains+Mono:wght@800&display=swap" rel="stylesheet">
<style>
:root{--oscuro:#06321b;--verde:#0b7a3b;--amarillo:#ffd200}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Montserrat",sans-serif;color:#fff;-webkit-font-smoothing:antialiased}
.l{position:relative;width:1080px;height:1350px;overflow:hidden;background:var(--oscuro)}
.foto{position:absolute;background-size:cover;background-position:center}
.logo{position:absolute;left:56px;top:56px;display:flex;align-items:center;gap:16px;z-index:5}
.logo img{width:82px;height:82px;background:#fff;border-radius:22px;padding:7px;box-shadow:0 8px 20px rgba(0,0,0,.3)}
.logo b{display:block;font-size:38px;font-weight:900;line-height:1;text-shadow:0 2px 10px rgba(0,0,0,.4)}
.logo span{display:block;font-size:14px;font-weight:800;letter-spacing:4.5px;margin-top:5px;color:var(--amarillo)}
.kicker{display:inline-flex;align-items:center;gap:10px;background:var(--amarillo);color:var(--oscuro);font-weight:900;font-size:24px;letter-spacing:2px;text-transform:uppercase;padding:12px 22px;border-radius:999px}
h1{font-weight:900;letter-spacing:-1.5px;line-height:.98}
.cod{font-family:"JetBrains Mono",monospace;font-weight:800}
.barra{position:absolute;left:0;right:0;bottom:0;height:104px;background:var(--amarillo);color:var(--oscuro);display:flex;align-items:center;justify-content:space-between;padding:0 56px;font-weight:900;font-size:28px;z-index:6}
.barra .w{display:flex;align-items:center;gap:12px}
.cred{position:absolute;right:20px;z-index:7;font-size:14px;font-weight:600;color:rgba(255,255,255,.85);background:rgba(0,0,0,.45);padding:4px 10px;border-radius:8px}
.aviso{position:absolute;left:56px;bottom:112px;font-size:14px;font-weight:600;opacity:.7;z-index:6}
</style>`;
const logo = () => `<div class="logo"><img src="${LOGO}"><div><b>AGRO PARTS</b><span>REPUESTOS AGRÍCOLAS</span></div></div>`;
const barra = () =>
  `<div class="barra"><span class="w">${WA(36, "#06321b")} ${C.whatsapp ? `WhatsApp ${C.whatsapp}` : "Consultá precio por WhatsApp"}</span><span>${C.site}</span></div>`;
const AVISO = `<div class="aviso">Las marcas mencionadas pertenecen a sus respectivos dueños.</div>`;

const posts = [];
const add = (nome, html, legenda) => posts.push({ nome, html, legenda });
const HASH = "#AgroParts #Uruguay #RepuestosAgricolas #Transmision #Tractores #Cosechadoras #CampoUruguayo";

// ---------- 1. Visão geral: 4 marcas ----------
const marcas = Object.keys(C.marcas);
add(
  "00_transmision_todas",
  `<div class="l">
    ${marcas.map((m, i) => `<div class="foto" style="left:${(i % 2) * 540}px;top:${Math.floor(i / 2) * 420 + 430}px;width:540px;height:420px;background-image:url('${foto(m)}');background-position:${C.marcas[m].pos}"></div>
      <div style="position:absolute;left:${(i % 2) * 540}px;top:${Math.floor(i / 2) * 420 + 430}px;width:540px;height:420px;background:linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(0,0,0,.75));border:3px solid var(--oscuro)"></div>
      <div style="position:absolute;left:${(i % 2) * 540 + 28}px;top:${Math.floor(i / 2) * 420 + 430 + 300}px"><p style="font-size:34px;font-weight:900">${m}</p><p style="font-size:22px;font-weight:700;color:var(--amarillo)">${C.totais[m]} repuestos de transmisión</p></div>`).join("")}
    <div style="position:absolute;left:0;right:0;top:0;height:430px;background:linear-gradient(180deg,#06321b,#0b5a2c)"></div>
    <div style="position:absolute;right:-60px;top:40px;opacity:.12">${ico(GEAR, 360, "#fff", 1.4)}</div>
    ${logo()}
    <div style="position:absolute;left:56px;top:172px;right:56px">
      <span class="kicker">${ico(GEAR, 26, "#06321b", 2.6)} Transmisión</span>
      <h1 style="font-size:76px;margin-top:20px">+${C.totais.geral} REPUESTOS<br><span style="color:var(--amarillo)">PARA TU CAJA</span></h1>
    </div>
    <div class="cred" style="bottom:112px;max-width:1040px">Fotos: ${marcas.map((m) => CRED[C.marcas[m].foto.replace(".jpg", "")].autor).join(", ")} · CC BY 2.0 · Wikimedia Commons</div>
    ${barra()}
  </div>`,
  `⚙️ +${C.totais.geral} repuestos de transmisión para tu tractor y cosechadora\n\nEngranajes, sincronizados, ejes, horquillas, coronas, cardanes y más para Valtra (${C.totais.Valtra}), New Holland (${C.totais["New Holland"]}), Massey Ferguson (${C.totais["Massey Ferguson"]}) y John Deere (${C.totais["John Deere"]}).\n\n📦 Envíos a todo Uruguay por DAC.\n👉 Buscá por código en agropartsuy.com\n\n${HASH}`,
);

// ---------- 2. Destaque de uma peça ----------
for (const m of marcas) {
  const cfg = C.marcas[m];
  cfg.destaque.forEach((p, i) => {
    add(
      `${slug(m)}_${i + 1}_${slug(p.nome)}`,
      `<div class="l">
        <div class="foto" style="inset:0 0 560px 0;background-image:url('${foto(m)}');background-position:${cfg.pos}"></div>
        <div style="position:absolute;inset:0 0 560px 0;background:linear-gradient(180deg,rgba(0,0,0,.55) 0%,rgba(0,0,0,0) 35%)"></div>
        <div class="cred" style="top:752px">${credito(m)}</div>
        <div style="position:absolute;left:0;right:0;bottom:0;height:640px;background:${cfg.cor};clip-path:polygon(0 12%,100% 0,100% 100%,0 100%)"></div>
        <div style="position:absolute;left:0;right:0;bottom:0;height:640px;background:linear-gradient(180deg,rgba(0,0,0,0),rgba(0,0,0,.4));clip-path:polygon(0 12%,100% 0,100% 100%,0 100%)"></div>
        <div style="position:absolute;right:-90px;bottom:60px;opacity:.13">${ico(GEAR, 520, "#fff", 1.3)}</div>
        ${logo()}
        <div style="position:absolute;left:56px;right:56px;top:820px">
          <span class="kicker">${ico(GEAR, 26, "#06321b", 2.6)} Transmisión · ${m}</span>
          <h1 style="font-size:${p.nome.length > 22 ? 70 : 84}px;margin-top:22px">${p.nome.toUpperCase()}</h1>
          <div style="display:flex;align-items:center;gap:16px;margin-top:26px;flex-wrap:wrap">
            <span style="background:#fff;color:#111;border-radius:16px;padding:12px 22px;font-size:22px;font-weight:800">CÓD. <span class="cod" style="font-size:40px;letter-spacing:1px">${p.codigo}</span></span>
            <span style="font-size:26px;font-weight:700">Fabricante: <b>${p.fab}</b></span>
          </div>
          <p style="font-size:26px;font-weight:700;margin-top:18px;opacity:.95">Para ${p.maquina.toLowerCase()} ${m} · confirmamos la compatibilidad</p>
        </div>
        ${AVISO}
        ${barra()}
      </div>`,
      `⚙️ ${p.nome} para ${p.maquina.toLowerCase()} ${m}\n\n🔢 Código: ${p.codigo}\n🏭 Fabricante: ${p.fab}\n\nPasanos el modelo y año de tu ${m} y te confirmamos que sea la pieza correcta.\n📦 Envíos a todo Uruguay por DAC.\n\n👉 agropartsuy.com/produto/${p.sku}\n💬 Consultá precio por WhatsApp\n\n${HASH} #${m.replace(/\s+/g, "")}`,
    );
  });
}

// ---------- 3. Lista de códigos por marca ----------
for (const m of marcas) {
  const cfg = C.marcas[m];
  add(
    `${slug(m)}_lista_codigos`,
    `<div class="l">
      <div class="foto" style="inset:0 0 820px 0;background-image:url('${foto(m)}');background-position:${cfg.pos}"></div>
      <div style="position:absolute;inset:0 0 820px 0;background:linear-gradient(180deg,rgba(0,0,0,.6),rgba(0,0,0,.15) 45%,rgba(0,0,0,.7))"></div>
      <div class="cred" style="top:450px">${credito(m)}</div>
      ${logo()}
      <div style="position:absolute;left:56px;top:290px">
        <h1 style="font-size:70px;text-shadow:0 4px 18px rgba(0,0,0,.5)">TRANSMISIÓN<br><span style="color:var(--amarillo)">${m.toUpperCase()}</span></h1>
      </div>
      <div style="position:absolute;left:0;right:0;top:530px;bottom:0;background:${cfg.cor}"></div>
      <div style="position:absolute;left:40px;right:40px;top:500px;background:#fff;color:#18181b;border-radius:30px;box-shadow:0 24px 50px rgba(0,0,0,.3);padding:22px 34px">
        ${cfg.lista.map(([cod, nome]) => `<div style="display:flex;align-items:center;gap:22px;padding:15px 0;border-bottom:2px solid #f0f0f0">${ico(CHECK, 34, cfg.cor, 2.4)}<span class="cod" style="font-size:30px;min-width:220px;color:${cfg.cor}">${cod}</span><span style="font-size:27px;font-weight:800">${nome}</span></div>`).join("")}
        <p style="font-size:22px;font-weight:700;color:#52525b;padding-top:16px">y ${C.totais[m] - cfg.lista.length} repuestos de transmisión más para ${m}.</p>
      </div>
      <div style="position:absolute;left:56px;right:56px;bottom:150px;display:flex;align-items:center;gap:14px;font-size:27px;font-weight:800">${ico(TRUCK, 40, "#ffd200")} Buscá el código en ${C.site} · envíos a todo Uruguay</div>
      ${AVISO}
      ${barra()}
    </div>`,
    `⚙️ Transmisión ${m}: estos son algunos de los códigos que tenemos\n\n${cfg.lista.map(([c, n]) => `• ${c} — ${n}`).join("\n")}\n\n…y ${C.totais[m] - cfg.lista.length} repuestos de transmisión más para ${m}.\n\n🔎 Buscá tu código en agropartsuy.com o mandalo por WhatsApp.\n📦 Envíos a todo Uruguay por DAC.\n\n${HASH} #${m.replace(/\s+/g, "")}`,
  );
}

// ---------- Render ----------
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) if (f.endsWith(".png")) fs.unlinkSync(path.join(OUT, f));
const b = await chromium.launch();
const pg = await b.newPage({ viewport: { width: 1080, height: 1350 } });
const tmp = path.join(DIR, ".tmp.html");
for (const p of posts) {
  fs.writeFileSync(tmp, `<!doctype html><html><head><meta charset="utf-8">${BASE}</head><body>${p.html}</body></html>`);
  await pg.goto(url(tmp), { waitUntil: "networkidle" });
  await pg.evaluate(() => document.fonts.ready);
  await pg.waitForTimeout(250);
  await (await pg.$(".l")).screenshot({ path: path.join(OUT, p.nome + ".png") });
  console.log("ok", p.nome);
}
const md = ["# Legendas — Transmisión", ""];
for (const p of posts) md.push(`## ${p.nome}`, "", p.legenda, "");
md.push("---", "", "Créditos das fotos (CC BY 2.0, Wikimedia Commons):", "", ...Object.values(CRED).map((c) => `- ${c.autor}: ${c.pagina}`));
fs.writeFileSync(path.join(OUT, "legendas.md"), md.join("\n"));
fs.writeFileSync(tmp, `<!doctype html><body style="margin:0;background:#111"><div style="display:grid;grid-template-columns:repeat(4,270px);gap:6px;padding:6px">${posts.map((p) => `<img src="${url(path.join(OUT, p.nome + ".png"))}" style="width:270px;height:337px">`).join("")}</div>`);
await pg.setViewportSize({ width: 1110, height: 800 });
await pg.goto(url(tmp), { waitUntil: "load" });
await pg.screenshot({ path: path.join(OUT, "mosaico.png"), fullPage: true });
fs.unlinkSync(tmp);
await b.close();
console.log(`\n${posts.length} imagens em ${OUT}`);
