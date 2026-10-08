// Banners do topo da home (Admin > Banners > Banner principal), 1200x600, versão web e celular.
// Uso: node marketing/gerar_banners_home.cjs   -> marketing/banners_home/*.png (+ simulações)
//
// Como a home mostra (src/components/home/HeroCarousel.tsx):
// - computador: largura total x 400px de altura, object-cover (por volta de 3,6:1). De uma arte
//   1200x600 aparece só a faixa do meio (y ~133 a ~467) e os cartões de atalho cobrem a parte
//   de baixo dessa faixa. Por isso a versão WEB põe tudo entre y 150 e 370.
// - celular: cartão de ~2,15:1, a arte 1200x600 aparece quase inteira. Texto bem grande, porque
//   a imagem fica com ~370px de largura na tela.
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require(path.join(process.cwd(), "node_modules/playwright"));

const RAIZ = process.cwd();
const OUT = path.join(RAIZ, "marketing/banners_home");
const foto = (n) => pathToFileURL(path.join(RAIZ, "public/catalogo", n)).href;
const LOGO = pathToFileURL(path.join(RAIZ, "public/logo.png")).href;

const BASE = `
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..100,500..900&display=swap" rel="stylesheet">
<style>
  :root { --noche:#0a3320; --verde-vivo:#1f8a46; --whats:#25D366; --oro:#f5b400 }
  * { box-sizing:border-box; margin:0; padding:0 }
  body { font-family:"Archivo",system-ui,sans-serif; -webkit-font-smoothing:antialiased }
  .lienzo { position:relative; width:1200px; height:600px; overflow:hidden; color:#fff }
  .verde { background: radial-gradient(110% 120% at 85% 10%, #22743f 0%, var(--noche) 55%, #06200f 100%) }
  .azul { background: radial-gradient(110% 120% at 85% 10%, #1a6fd0 0%, #0a3d82 55%, #062552 100%) }
  .surcos { position:absolute; inset:0; opacity:.08; background: repeating-linear-gradient(-28deg,#fff 0 2px,transparent 2px 40px) }
  h1 { font-weight:900; font-stretch:80%; line-height:.95; letter-spacing:-.5px }
  .oro { color:var(--oro) }
  .pieza { position:absolute; background:#fff; border-radius:28px; box-shadow:0 18px 40px rgba(0,0,0,.35); display:grid; place-items:center }
  .pieza img { width:86%; height:86%; object-fit:contain }
  .boton { display:inline-flex; align-items:center; gap:12px; border-radius:999px; font-weight:900 }
  .ico { width:1em; height:1em }
  .chip { display:inline-block; border-radius:999px; font-weight:800 }
</style>`;

const WHATS = `<svg class="ico" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm4.5 12.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg>`;

const B = [];
const add = (nome, html) => B.push({ nome, html });

// ---------- 1. Catálogo ----------
const pecas = (pos) =>
  pos.map(([img, x, y, s, r]) => `<div class="pieza" style="left:${x}px;top:${y}px;width:${s}px;height:${s}px;transform:rotate(${r}deg)"><img src="${foto(img)}"></div>`).join("");

add("01_catalogo_web", `
<div class="lienzo verde"><div class="surcos"></div>
  <div style="position:absolute;left:70px;top:138px;width:560px">
    <h1 style="font-size:64px">Más de <span class="oro">29.000 repuestos</span> para tu tractor</h1>
    <p style="font-size:22px;font-weight:600;margin-top:14px;color:#d6eadc">Massey Ferguson · Valtra · John Deere · New Holland · Case IH</p>
  </div>
  ${pecas([["183040IMPBJ-1.jpg", 690, 140, 190, -6], ["055119DELPHI-1.jpg", 900, 132, 190, 5], ["1851392AS1-1.jpg", 800, 228, 160, 3], ["85026700LUK-1.jpg", 990, 236, 160, -4]])}
</div>`);
add("01_catalogo_mobile", `
<div class="lienzo verde"><div class="surcos"></div>
  <div style="position:absolute;left:56px;top:60px;width:640px">
    <div class="chip" style="background:var(--oro);color:var(--noche);font-size:30px;padding:8px 22px">AGRO PARTS</div>
    <h1 style="font-size:96px;margin-top:22px">Más de <span class="oro">29.000</span> repuestos</h1>
    <div class="boton" style="margin-top:30px;background:#fff;color:var(--noche);font-size:38px;padding:18px 34px">Ver catálogo →</div>
  </div>
  ${pecas([["183040IMPBJ-1.jpg", 760, 70, 230, -6], ["055119DELPHI-1.jpg", 900, 300, 230, 6], ["1851392AS1-1.jpg", 720, 330, 190, 3]])}
</div>`);

// ---------- 2. Cotizá por WhatsApp ----------
const burbuja = (escala) => `
  <div style="background:#efeae2;border-radius:${26 * escala}px;padding:${22 * escala}px;box-shadow:0 20px 50px rgba(0,0,0,.35);width:${430 * escala}px">
    <div style="margin-left:auto;background:#d9fdd3;color:#111b21;border-radius:${20 * escala}px ${5 * escala}px ${20 * escala}px ${20 * escala}px;padding:${16 * escala}px ${20 * escala}px;font-size:${21 * escala}px;line-height:1.35;font-weight:500">
      ¡Hola! Quiero cotizar este repuesto:<br><b>Filtro Aire Externo Tractor Massey</b><br>Código: 055119
    </div>
  </div>`;
add("02_whatsapp_web", `
<div class="lienzo verde"><div class="surcos"></div>
  <div style="position:absolute;left:70px;top:150px;width:600px">
    <h1 style="font-size:64px">Encontrá la pieza y <span class="oro">cotizá por WhatsApp</span></h1>
    <div class="boton" style="margin-top:22px;background:var(--whats);color:#06381b;font-size:26px;padding:14px 26px">${WHATS} Tocá «Consultar precio»</div>
  </div>
  <div style="position:absolute;left:720px;top:160px">${burbuja(0.95)}</div>
</div>`);
add("02_whatsapp_mobile", `
<div class="lienzo verde"><div class="surcos"></div>
  <div style="position:absolute;left:56px;top:60px;width:700px">
    <h1 style="font-size:92px">Cotizá por <span class="oro">WhatsApp</span> en minutos</h1>
    <div class="boton" style="margin-top:34px;background:var(--whats);color:#06381b;font-size:40px;padding:20px 36px">${WHATS} Consultar precio</div>
  </div>
  <div class="pieza" style="left:800px;top:120px;width:330px;height:330px;transform:rotate(4deg)"><img src="${foto("055119DELPHI-1.jpg")}"></div>
</div>`);

// ---------- 3. Envíos a todo Uruguay ----------
const caixa = (s) => `<svg viewBox="0 0 64 64" style="width:${s}px;height:${s}px" fill="none" stroke="#fff" stroke-width="2.4" stroke-linejoin="round"><path d="M32 6 56 18v28L32 58 8 46V18Z" fill="rgba(255,255,255,.08)"/><path d="M8 18l24 12 24-12M32 30v28M20 12l24 12"/></svg>`;
add("03_envios_web", `
<div class="lienzo azul"><div class="surcos" style="opacity:.06"></div>
  <div style="position:absolute;left:70px;top:150px;width:640px">
    <h1 style="font-size:64px">Tu repuesto llega a <span class="oro">todo Uruguay</span></h1>
    <p style="font-size:24px;font-weight:600;margin-top:16px;color:#cfe0f7">Despachamos por DAC con número de seguimiento</p>
  </div>
  <div style="position:absolute;left:800px;top:150px;display:flex;gap:26px;align-items:center">
    ${caixa(170)}
    <div><b style="display:block;font-size:110px;font-weight:900;font-stretch:80%;line-height:.9">19</b><span style="font-size:24px;font-weight:700">departamentos</span></div>
  </div>
</div>`);
add("03_envios_mobile", `
<div class="lienzo azul"><div class="surcos" style="opacity:.06"></div>
  <div style="position:absolute;left:56px;top:60px;width:720px">
    <h1 style="font-size:96px">Envíos a <span class="oro">todo Uruguay</span></h1>
    <p style="font-size:38px;font-weight:700;margin-top:24px;color:#cfe0f7">Por DAC, con seguimiento</p>
  </div>
  <div style="position:absolute;left:820px;top:150px;text-align:center">${caixa(230)}<b style="display:block;font-size:46px;font-weight:900">19 deptos.</b></div>
</div>`);

(async () => {
  fs.mkdirSync(path.join(OUT, "simulacao"), { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1200, height: 600 } });
  for (const x of B) {
    const tmp = path.join(OUT, "_tmp.html");
    fs.writeFileSync(tmp, `<!doctype html><meta charset="utf-8">${BASE}<body>${x.html}</body>`);
    await p.goto(pathToFileURL(tmp).href, { waitUntil: "networkidle" });
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(OUT, `banner_${x.nome}.png`), clip: { x: 0, y: 0, width: 1200, height: 600 } });
    console.log("✓ banner_" + x.nome + ".png");
  }
  fs.rmSync(path.join(OUT, "_tmp.html"), { force: true });

  // Simulação: como cada arte aparece na home (mesmas regras do HeroCarousel)
  const sim = (img, w, h, cartoes) => `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#f4f4f5">
    <div style="position:relative;width:${w}px;height:${h}px;overflow:hidden;${cartoes ? "" : "border-radius:16px"}">
      <img src="${pathToFileURL(path.join(OUT, img)).href}" style="width:100%;height:100%;object-fit:cover">
      ${cartoes ? `<div style="position:absolute;left:${(w - 1240) / 2}px;width:1240px;bottom:0;height:80px;display:flex;gap:12px">${'<div style="flex:1;background:#fff;border-radius:16px 16px 0 0;box-shadow:0 4px 12px rgba(0,0,0,.15)"></div>'.repeat(6)}</div>` : ""}
    </div></body>`;
  for (const n of ["01_catalogo", "02_whatsapp", "03_envios"]) {
    for (const [tipo, w, h, cartoes] of [["web", 1440, 400, true], ["mobile", 366, 170, false]]) {
      await p.setViewportSize({ width: w, height: h });
      const tmp = path.join(OUT, "_sim.html");
      fs.writeFileSync(tmp, sim(`banner_${n}_${tipo}.png`, w, h, cartoes));
      await p.goto(pathToFileURL(tmp).href);
      await p.waitForTimeout(150);
      await p.screenshot({ path: path.join(OUT, "simulacao", `como_aparece_${n}_${tipo}.png`) });
    }
  }
  fs.rmSync(path.join(OUT, "_sim.html"), { force: true });
  await b.close();
})();
