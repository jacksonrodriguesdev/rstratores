// Gera os criativos dos anúncios (Instagram, Facebook e Google) a partir das telas reais do site.
// Uso (raiz do projeto):
//   node marketing/gerar_criativos.cjs            -> marketing/criativos/*.png
// As telas vêm de marketing/telas (capturas do site); as fotos das peças, de public/catalogo.
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require(path.join(process.cwd(), "node_modules/playwright"));

const RAIZ = process.cwd();
const OUT = path.join(RAIZ, "marketing/criativos");
const tela = (n) => pathToFileURL(path.join(RAIZ, "marketing/telas", n)).href;
const foto = (n) => pathToFileURL(path.join(RAIZ, "public/catalogo", n)).href;
const LOGO = pathToFileURL(path.join(RAIZ, "public/logo.png")).href;
const SITE = "agropartsuy.com";

const BASE = `
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..100,500..900&display=swap" rel="stylesheet">
<style>
  :root { --verde-noche:#0a3320; --verde:#14532d; --verde-vivo:#1f8a46; --whats:#25D366; --oro:#f5b400; --papel:#f2f5ef; --tinta:#0f1a13; }
  * { box-sizing:border-box; margin:0; padding:0 }
  body { font-family:"Archivo",system-ui,sans-serif; color:var(--tinta); -webkit-font-smoothing:antialiased }
  .lienzo { position:relative; overflow:hidden }
  .oscuro { background: radial-gradient(120% 80% at 80% 0%, #1f6b3a 0%, var(--verde-noche) 55%, #06200f 100%); color:#fff }
  .surcos { position:absolute; inset:0; opacity:.09; background: repeating-linear-gradient(-28deg, #fff 0 2px, transparent 2px 46px) }
  .marca { display:flex; align-items:center; gap:18px }
  .marca img { width:76px; height:76px; background:#fff; border-radius:22px; padding:6px }
  .marca b { display:block; font-size:34px; font-weight:900; letter-spacing:.5px; font-stretch:90% }
  .marca span { display:block; font-size:15px; font-weight:700; letter-spacing:4px; color:var(--oro) }
  h1 { font-weight:900; font-stretch:80%; line-height:.95; letter-spacing:-1px; text-wrap:balance }
  .oro { color:var(--oro) }
  .chip { display:inline-flex; align-items:center; gap:10px; border-radius:999px; font-weight:800; }
  .tel { position:absolute; border-radius:70px; background:#0b0f0c; padding:16px; box-shadow: 0 40px 80px rgba(0,0,0,.45), 0 0 0 2px rgba(255,255,255,.08) inset }
  .tel img { display:block; width:100%; border-radius:56px }
  .cta { display:flex; align-items:center; gap:16px; background:var(--whats); color:#06381b; font-weight:900; border-radius:999px }
  .whatsico { width:1em; height:1em; flex:none }
</style>`;

const ICO_WHATS = `<svg class="whatsico" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg>`;

const marca = (escuro = true) => `<div class="marca"><img src="${LOGO}"><div><b style="color:${escuro ? "#fff" : "var(--verde-noche)"}">AGRO PARTS</b><span>REPUESTOS AGRÍCOLAS</span></div></div>`;

// Cada criativo: nome do arquivo, tamanho e HTML
const CRIATIVOS = [];
const add = (nome, w, h, html) => CRIATIVOS.push({ nome, w, h, html });

// ---------- FEED 4:5 (1080x1350) ----------
add("feed_01_catalogo", 1080, 1350, `
<div class="lienzo oscuro" style="width:1080px;height:1350px">
  <div class="surcos"></div>
  <div style="position:absolute;left:72px;top:64px;width:520px;height:1080px;display:flex;flex-direction:column;gap:34px">
    ${marca()}
    <h1 style="font-size:92px;margin-top:20px">Más de <span class="oro">29.000</span> repuestos para tu tractor</h1>
    <p style="font-size:30px;font-weight:600;line-height:1.3;color:#d9eadf">Massey Ferguson, Valtra, John Deere, New Holland, Case IH y más.</p>
    <div style="display:grid;gap:16px;font-size:30px;font-weight:700;margin-top:10px">
      <div>✓ Buscá por el código original</div><div>✓ Cotizá por WhatsApp</div><div>✓ Envíos a todo Uruguay por DAC</div>
    </div>
  </div>
  <div class="tel" style="left:620px;top:150px;width:410px"><img src="${tela("m_home.png")}"></div>
  <div class="cta" style="position:absolute;left:72px;bottom:72px;padding:26px 40px;font-size:36px">${ICO_WHATS} Cotizá en ${SITE}</div>
</div>`);

add("feed_02_cotizar_whatsapp", 1080, 1350, `
<div class="lienzo" style="width:1080px;height:1350px;background:var(--papel)">
  <div style="position:absolute;inset:0 0 auto 0;height:520px;background:var(--verde-noche)"><div class="surcos"></div></div>
  <div style="position:absolute;left:72px;top:64px">${marca()}</div>
  <h1 style="position:absolute;left:72px;top:180px;width:940px;font-size:96px;color:#fff">Encontrá la pieza. <span class="oro">Te pasamos el precio</span> por WhatsApp.</h1>
  <div class="tel" style="left:72px;top:500px;width:400px"><img src="${tela("m_produto.png")}"></div>
  <div style="position:absolute;left:540px;top:600px;width:470px;display:grid;gap:34px">
    ${[["1", "Buscá por código o nombre", "Filtros, rodamientos, retenes, engranajes…"], ["2", "Tocá «Consultar precio»", "Se abre WhatsApp con la pieza y el código listos."], ["3", "Recibí precio y envío", "Sin compromiso. Te confirmamos la compatibilidad."]]
      .map(([n, t, d]) => `<div style="display:flex;gap:22px"><div style="flex:none;width:64px;height:64px;border-radius:50%;background:var(--verde-vivo);color:#fff;font-size:34px;font-weight:900;display:grid;place-items:center">${n}</div><div><div style="font-size:34px;font-weight:900;line-height:1.1">${t}</div><div style="font-size:24px;font-weight:500;color:#3d4f43;margin-top:8px;line-height:1.3">${d}</div></div></div>`).join("")}
  </div>
  <div class="cta" style="position:absolute;left:540px;bottom:80px;padding:24px 36px;font-size:32px">${ICO_WHATS} ${SITE}</div>
</div>`);

add("feed_03_envios_dac", 1080, 1350, `
<div class="lienzo" style="width:1080px;height:1350px;background:linear-gradient(160deg,#0b5bb5 0%,#0a3d82 60%,#072a5c 100%);color:#fff">
  <div class="surcos" style="opacity:.06"></div>
  <div style="position:absolute;left:72px;top:64px;width:540px;display:flex;flex-direction:column;gap:30px">
    ${marca()}
    <div class="chip" style="align-self:flex-start;padding:12px 24px;background:rgba(255,255,255,.14);font-size:26px;margin-top:16px">Envíos a todo Uruguay</div>
    <h1 style="font-size:88px">Tu repuesto llega a <span class="oro">cualquier punto</span> del país</h1>
    <div style="display:grid;gap:20px;margin-top:20px">
      ${[["19", "departamentos"], ["DAC", "con número de seguimiento"], ["$5.000", "envío gratis desde (UYU)*"]].map(([a, b]) => `<div style="display:flex;align-items:baseline;gap:18px;border-top:2px solid rgba(255,255,255,.2);padding-top:16px"><b style="font-size:54px;font-weight:900;font-stretch:80%;min-width:170px">${a}</b><span style="font-size:27px;font-weight:600">${b}</span></div>`).join("")}
    </div>
  </div>
  <div class="tel" style="left:650px;top:150px;width:380px"><img src="${tela("m_loja.png")}"></div>
  <p style="position:absolute;left:72px;bottom:60px;font-size:20px;color:#bcd3f2">*Según condiciones vigentes en ${SITE}</p>
  <div class="cta" style="position:absolute;right:56px;bottom:52px;padding:22px 34px;font-size:30px">${ICO_WHATS} Consultá tu envío</div>
</div>`);

// ---------- STORIES 9:16 (1080x1920) ----------
add("story_01_pedido_rapido", 1080, 1920, `
<div class="lienzo oscuro" style="width:1080px;height:1920px">
  <div class="surcos"></div>
  <div style="position:absolute;left:80px;top:160px">${marca()}</div>
  <div class="chip" style="position:absolute;left:80px;top:300px;padding:12px 26px;background:var(--oro);color:var(--verde-noche);font-size:28px">PARA TALLERES Y REVENDEDORES</div>
  <h1 style="position:absolute;left:80px;top:380px;width:920px;font-size:118px">Pegá tu lista de códigos y <span class="oro">cotizá todo junto</span></h1>
  <div class="tel" style="left:250px;top:840px;width:580px"><img src="${tela("m_pedido.png")}"></div>
  <div style="position:absolute;left:0;right:0;bottom:0;height:520px;background:linear-gradient(transparent,#06200f 55%)"></div>
  <div class="cta" style="position:absolute;left:80px;right:80px;bottom:170px;justify-content:center;padding:30px;font-size:40px">${ICO_WHATS} Pedido rápido en ${SITE}</div>
</div>`);

add("story_02_te_lo_conseguimos", 1080, 1920, `
<div class="lienzo" style="width:1080px;height:1920px;background:#e9efe5">
  <div style="position:absolute;inset:0 0 auto 0;height:900px;background:var(--verde-noche)"><div class="surcos"></div></div>
  <div style="position:absolute;left:80px;top:160px">${marca()}</div>
  <h1 style="position:absolute;left:80px;top:330px;width:920px;font-size:122px;color:#fff">¿No encontrás el repuesto? <span class="oro">Te lo conseguimos.</span></h1>
  <div style="position:absolute;left:80px;right:80px;top:980px;background:#efeae2;border-radius:40px;padding:48px;box-shadow:0 30px 60px rgba(0,0,0,.18)">
    <div style="font-size:26px;font-weight:700;color:#54656f;margin-bottom:26px;display:flex;align-items:center;gap:14px"><span style="width:56px;height:56px;border-radius:50%;background:#fff;display:grid;place-items:center"><img src="${LOGO}" style="width:44px"></span>AGRO PARTS · WhatsApp</div>
    <div style="margin-left:auto;max-width:760px;background:#d9fdd3;border-radius:28px 6px 28px 28px;padding:30px 34px;font-size:34px;line-height:1.35;font-weight:500">¡Hola! Busco este repuesto:<br><b>Código 3785552M1</b><br>Tractor Massey Ferguson 290. Les mando una foto 📷</div>
  </div>
  <p style="position:absolute;left:80px;right:80px;top:1460px;font-size:40px;font-weight:700;line-height:1.3;color:var(--verde-noche)">Mandanos el código, el modelo del tractor o una foto. Muchas piezas que no están publicadas las conseguimos igual.</p>
  <div class="cta" style="position:absolute;left:80px;right:80px;bottom:170px;justify-content:center;padding:30px;font-size:42px">${ICO_WHATS} Escribinos por WhatsApp</div>
</div>`);

// ---------- CARROSSEL 1:1 (1080x1080) ----------
const CARDS = [
  ["Engranajes y Transmisión", "183040IMPBJ-1.jpg", "Engranajes, ejes, garfos y sincronizadores"],
  ["Rodamientos", "1851392AS1-1.jpg", "Cónicos, de rodillos y de esferas"],
  ["Embragues", "85026700LUK-1.jpg", "Kits, discos y platos"],
  ["Hidráulica", "41410603-1.jpg", "Bombas, reparaciones y cilindros"],
  ["Filtros", "055119DELPHI-1.jpg", "Aire, aceite, combustible e hidráulico"],
];
CARDS.forEach(([cat, img, desc], i) =>
  add(`carrusel_${String(i + 1).padStart(2, "0")}_${cat.split(" ")[0].toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")}`, 1080, 1080, `
<div class="lienzo" style="width:1080px;height:1080px;background:#fff">
  <div style="position:absolute;left:0;right:0;bottom:0;height:300px;background:var(--verde-noche)"><div class="surcos"></div></div>
  <div style="position:absolute;left:64px;top:56px;display:flex;align-items:center;gap:14px"><img src="${LOGO}" style="width:58px"><b style="font-size:26px;font-weight:900;color:var(--verde-noche)">AGRO PARTS</b></div>
  <div style="position:absolute;right:64px;top:64px;font-size:24px;font-weight:800;color:#6b7c70">${i + 1}/${CARDS.length + 1}</div>
  <img src="${foto(img)}" style="position:absolute;left:50%;top:140px;transform:translateX(-50%);width:600px;height:600px;object-fit:contain">
  <div style="position:absolute;left:64px;right:64px;bottom:62px;color:#fff">
    <h1 style="font-size:78px">${cat}</h1>
    <p style="font-size:30px;font-weight:600;color:#cfe5d6;margin-top:12px">${desc}</p>
  </div>
  <div class="chip" style="position:absolute;right:64px;bottom:250px;padding:14px 26px;background:var(--oro);color:var(--verde-noche);font-size:26px">Cotizá en ${SITE}</div>
</div>`),
);
add(`carrusel_${String(CARDS.length + 1).padStart(2, "0")}_cotiza`, 1080, 1080, `
<div class="lienzo oscuro" style="width:1080px;height:1080px">
  <div class="surcos"></div>
  <div style="position:absolute;left:72px;top:72px">${marca()}</div>
  <h1 style="position:absolute;left:72px;top:250px;width:930px;font-size:112px">Más de 29.000 repuestos. <span class="oro">Cotizá en minutos.</span></h1>
  <p style="position:absolute;left:72px;top:640px;width:900px;font-size:34px;font-weight:600;line-height:1.35;color:#d9eadf">Buscá por código, armá tu lista y pedí el precio por WhatsApp. Envíos a todo Uruguay por DAC.</p>
  <div class="cta" style="position:absolute;left:72px;bottom:80px;padding:28px 42px;font-size:40px">${ICO_WHATS} ${SITE}</div>
</div>`);

// ---------- GOOGLE (Display / Performance Max) ----------
add("google_paisagem_1200x628", 1200, 628, `
<div class="lienzo oscuro" style="width:1200px;height:628px">
  <div class="surcos"></div>
  <div style="position:absolute;left:56px;top:48px;transform:scale(.85);transform-origin:left top">${marca()}</div>
  <h1 style="position:absolute;left:56px;top:150px;width:520px;font-size:66px">Repuestos para tractores en <span class="oro">Uruguay</span></h1>
  <p style="position:absolute;left:56px;top:390px;width:480px;font-size:24px;font-weight:600;line-height:1.35;color:#d9eadf">+29.000 piezas · Cotizá por WhatsApp · Envíos por DAC</p>
  <div class="cta" style="position:absolute;left:56px;bottom:48px;padding:18px 30px;font-size:26px">${ICO_WHATS} ${SITE}</div>
  <img src="${tela("d_home.png")}" style="position:absolute;left:620px;top:70px;width:760px;border-radius:18px;box-shadow:0 30px 60px rgba(0,0,0,.5)">
</div>`);
add("google_quadrado_1200x1200", 1200, 1200, `
<div class="lienzo oscuro" style="width:1200px;height:1200px">
  <div class="surcos"></div>
  <div style="position:absolute;left:80px;top:72px">${marca()}</div>
  <h1 style="position:absolute;left:80px;top:200px;width:1040px;font-size:100px">Repuestos agrícolas con <span class="oro">cotización por WhatsApp</span></h1>
  <img src="${tela("d_home_novedades.png")}" style="position:absolute;left:80px;top:560px;width:1040px;height:430px;object-fit:cover;object-position:top;border-radius:24px;box-shadow:0 30px 60px rgba(0,0,0,.45)">
  <div class="cta" style="position:absolute;left:80px;bottom:64px;padding:24px 38px;font-size:34px">${ICO_WHATS} ${SITE}</div>
</div>`);
add("logo_quadrado_1200x1200", 1200, 1200, `
<div class="lienzo" style="width:1200px;height:1200px;background:#fff;display:grid;place-items:center"><img src="${LOGO}" style="width:880px;height:880px"></div>`);
add("logo_paisagem_1200x300", 1200, 300, `
<div class="lienzo" style="width:1200px;height:300px;background:#fff;display:flex;align-items:center;gap:36px;padding-left:60px">
  <img src="${LOGO}" style="width:220px;height:220px">
  <div><b style="display:block;font-size:104px;font-weight:900;font-stretch:85%;color:var(--verde-noche);line-height:1">AGRO PARTS</b><span style="display:block;font-size:30px;font-weight:800;letter-spacing:9px;color:#b98a00;margin-top:8px">REPUESTOS AGRÍCOLAS</span></div>
</div>`);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage();
  const so = process.argv[2];
  for (const c of CRIATIVOS) {
    if (so && !c.nome.includes(so)) continue;
    await p.setViewportSize({ width: c.w, height: c.h });
    const arquivo = path.join(OUT, "_tmp.html");
    fs.writeFileSync(arquivo, `<!doctype html><meta charset="utf-8">${BASE}<body>${c.html}</body>`);
    await p.goto(pathToFileURL(arquivo).href, { waitUntil: "networkidle" });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(OUT, `${c.nome}.png`), clip: { x: 0, y: 0, width: c.w, height: c.h } });
    console.log("✓", c.nome, `${c.w}x${c.h}`);
  }
  fs.rmSync(path.join(OUT, "_tmp.html"), { force: true });
  await b.close();
})();
