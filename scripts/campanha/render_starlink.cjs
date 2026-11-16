// Banner de anúncio "Starlink" para o slot de anúncios da home (1920x400) + mobile (800x600).
// Fundo = foto da antena Starlink no campo ao anoitecer. Texto em ES e PT. Sobe em
// Admin -> Banners -> aba "Anúncios" (link apontando ao produto).
// Uso: node render_starlink.cjs
const fs = require("fs");
const path = require("path");
const { chromium } = require("C:/Users/USER/Desktop/site-rs/rstratorparts/node_modules/playwright");

const DIR = __dirname;
const OUT = path.join(DIR, "banners");
const LOGO = path.join(DIR, "assets", "logo.png");
const BG = path.join(DIR, "anuncios", "starlink-bg.webp");
const SITE = "agropartsuy.com";

const b64 = (f) => {
  const ext = path.extname(f).slice(1).toLowerCase();
  const mime = ext === "jpg" ? "jpeg" : ext;
  return `data:image/${mime};base64,` + fs.readFileSync(f).toString("base64");
};

const T = {
  es: {
    kicker: "Nuevo en AGRO PARTS · Conectividad rural",
    h1: "Ahora tenemos",
    h2: "Starlink",
    tag: "para vos que trabajás en el campo",
    sub: "Internet de alta velocidad donde no llega nadie más — en tu chacra, galpón o tambo.",
    cta: "Consultá precio",
  },
  pt: {
    kicker: "Novo na AGRO PARTS · Conexão no campo",
    h1: "Agora temos",
    h2: "Starlink",
    tag: "para você que trabalha no campo",
    sub: "Internet de alta velocidade onde ninguém mais chega — no sítio, galpão ou fazenda.",
    cta: "Consulte o preço",
  },
};

function html(lang, mode) {
  const t = T[lang];
  const bg = b64(BG);
  const logo = fs.existsSync(LOGO) ? b64(LOGO) : "";
  const W = mode === "mobile" ? 800 : 1920;
  const H = mode === "mobile" ? 600 : 400;
  const m = mode === "mobile";
  // No celular o texto fica embaixo (scrim de baixo); no desktop fica à direita (scrim lateral).
  const pos = m ? "32% 42%" : "28% 46%";
  const scrim = m
    ? "linear-gradient(0deg, rgba(5,10,20,.92) 0%, rgba(5,10,20,.55) 34%, rgba(5,10,20,.12) 60%, transparent 80%)"
    : "linear-gradient(90deg, transparent 0%, transparent 40%, rgba(5,10,20,.35) 58%, rgba(5,10,20,.78) 100%)";
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800;900&family=Barlow+Condensed:wght@600;700;800;900&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${W}px;height:${H}px}
  body{font-family:'Archivo',sans-serif;color:#fff;overflow:hidden;position:relative;background:#050a14}
  .bg{position:absolute;inset:0;background-image:url('${bg}');background-size:cover;background-position:${pos}}
  .scrim{position:absolute;inset:0;background:${scrim}}
  .acc{position:absolute;left:0;right:0;top:0;height:6px;background:linear-gradient(90deg,#f2c94c,#ff9a2e)}
  .wrap{position:absolute;inset:0;display:flex;${m ? "align-items:flex-end;justify-content:center;padding:0 40px 40px" : "align-items:center;justify-content:flex-end;padding:0 90px"};z-index:3}
  .box{${m ? "text-align:center;max-width:680px" : "text-align:right;max-width:820px"}}
  .kicker{display:inline-block;background:rgba(255,255,255,.14);border:1px solid rgba(255,255,255,.3);
    font-family:'Barlow Condensed';font-weight:700;letter-spacing:.18em;text-transform:uppercase;
    font-size:${m ? "16px" : "19px"};padding:5px 14px;border-radius:999px;backdrop-filter:blur(4px)}
  .head{font-family:'Barlow Condensed';font-weight:900;text-transform:uppercase;line-height:.9;
    margin-top:${m ? "14px" : "12px"};text-shadow:0 4px 20px rgba(0,0,0,.6)}
  .head .l1{display:block;font-size:${m ? "34px" : "44px"};color:#dbe6f5;font-weight:800}
  .head .l2{display:block;font-size:${m ? "84px" : "104px"};letter-spacing:.01em}
  .tag{font-family:'Barlow Condensed';font-weight:700;text-transform:uppercase;letter-spacing:.02em;
    color:#f2c94c;font-size:${m ? "24px" : "30px"};margin-top:${m ? "6px" : "4px"};text-shadow:0 2px 12px rgba(0,0,0,.7)}
  .sub{font-family:'Archivo';font-weight:600;font-size:${m ? "17px" : "19px"};color:#e9eef7;
    margin-top:${m ? "12px" : "14px"};line-height:1.3;${m ? "" : "margin-left:auto;max-width:620px"};text-shadow:0 2px 12px rgba(0,0,0,.8)}
  .row{display:flex;align-items:center;gap:18px;margin-top:${m ? "18px" : "22px"};${m ? "justify-content:center" : "justify-content:flex-end"}}
  .cta{display:inline-flex;align-items:center;gap:9px;background:#f2c94c;color:#141414;font-family:'Barlow Condensed';
    font-weight:900;text-transform:uppercase;letter-spacing:.03em;font-size:${m ? "26px" : "30px"};
    padding:${m ? "11px 26px" : "12px 30px"};border-radius:999px;box-shadow:0 8px 22px rgba(0,0,0,.4)}
  .site{display:flex;align-items:center;gap:10px}
  .site img{height:${m ? "30px" : "34px"}}
  .site b{font-family:'Barlow Condensed';font-weight:900;font-size:${m ? "22px" : "26px"};color:#fff;text-shadow:0 2px 8px rgba(0,0,0,.8)}
</style></head>
<body>
  <div class="bg"></div>
  <div class="scrim"></div>
  <div class="acc"></div>
  <div class="wrap"><div class="box">
    <div class="kicker">${t.kicker}</div>
    <div class="head"><span class="l1">${t.h1}</span><span class="l2">${t.h2}</span></div>
    <div class="tag">${t.tag}</div>
    <div class="sub">${t.sub}</div>
    <div class="row">
      <div class="cta">${t.cta} →</div>
      <div class="site">${logo ? `<img src="${logo}">` : ""}<b>${SITE}</b></div>
    </div>
  </div></div>
</body></html>`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ channel: "msedge" });
  let ok = 0;
  for (const mode of ["desktop", "mobile"]) {
    const W = mode === "mobile" ? 800 : 1920;
    const H = mode === "mobile" ? 600 : 400;
    const page = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    for (const lang of ["es", "pt"]) {
      await page.setContent(html(lang, mode), { waitUntil: "networkidle" });
      await page.waitForTimeout(150);
      const dst = path.join(OUT, `anuncio-starlink_${lang}_${mode}.jpg`);
      await page.screenshot({ path: dst, type: "jpeg", quality: 90 });
      ok++;
      console.log("banner", path.basename(dst));
    }
    await page.close();
  }
  await b.close();
  console.log("FIM. banners:", ok, "em", OUT);
})().catch((e) => { console.error("ERRO:", e.message); process.exit(1); });
