// Gera os BANNERS horizontais do slider principal (hero) da home — linha de injeção diesel.
// Desktop 1920x520 e mobile 1080x470, em espanhol e português. Arte autoexplicativa: ao subir
// em Admin → Banners (linha = Inyección Diesel), deixe título/subtítulo em branco.
// Uso: node render_banner.cjs            (gera todos os slides, ES e PT, desktop e mobile)
const fs = require("fs");
const path = require("path");
const { chromium } = require("C:/Users/USER/Desktop/site-rs/rstratorparts/node_modules/playwright");

const DIR = __dirname;
const CUT = path.join(DIR, "cutouts");
const LOGO = path.join(DIR, "assets", "logo.png");
const OUT = path.join(DIR, "banners");
const BG = "C:/Users/USER/Desktop/site-rs";
const SITE = "agropartsuy.com";

const b64 = (f) => {
  const ext = path.extname(f).slice(1).toLowerCase();
  const mime = ext === "jpg" ? "jpeg" : ext;
  return `data:image/${mime};base64,` + fs.readFileSync(f).toString("base64");
};
const cutB64 = (cod) => {
  const f = path.join(CUT, String(cod).replace(/[^A-Za-z0-9._-]/g, "_") + ".png");
  return fs.existsSync(f) ? b64(f) : "";
};

const TEMAS = {
  GENERICO: { bg: null, col: "#c6761a", acc: "#ff9a2e", tint: "16,18,22" },
  "JOHN DEERE": { bg: "luzes-led-1366x768.jpg", pos: "70% 50%", col: "#3a8f1e", acc: "#ffde00", tint: "10,40,8" },
  "NEW HOLLAND": { bg: "trator-new-holland-modelo-t7swb-maquina-em-campo-aberto-em-aclive.jpg", pos: "60% 55%", col: "#1a5fd0", acc: "#4da3ff", tint: "6,22,54" },
  "MASSEY FERGUSON": { bg: "mf-4300-hero-1400x700.jpg", pos: "55% 50%", col: "#c8102e", acc: "#ff6a5a", tint: "40,8,8" },
  "CASE IH": { bg: "trator_magnum_em_campo_no_fim_de_tarde.webp", pos: "45% 50%", col: "#e22420", acc: "#ff6a3c", tint: "40,10,6" },
};

// Slides do slider. head/sub em ES e PT; cut = cutout do produto.
const SLIDES = [
  {
    id: "bombas",
    tema: "GENERICO",
    cut: "V3663F130G",
    es: { head: ["Bombas", "Inyectoras"], sub: "VE · VP · DPA · en línea — nuevas y reparadas" },
    pt: { head: ["Bombas", "Injetoras"], sub: "VE · VP · DPA · em linha — novas e recuperadas" },
  },
  {
    id: "common-rail",
    tema: "GENERICO",
    cut: "0445120212C",
    es: { head: ["Inyectores", "Common Rail"], sub: "Bosch · Denso · Delphi — nuevos y reparados" },
    pt: { head: ["Bicos", "Common Rail"], sub: "Bosch · Denso · Delphi — novos e recuperados" },
  },
  {
    id: "john-deere",
    tema: "JOHN DEERE",
    cut: "0445110189C",
    es: { head: ["Inyección para", "John Deere"], sub: "Bombas, inyectores y repuestos de inyección" },
    pt: { head: ["Injeção para", "John Deere"], sub: "Bombas, bicos e peças de injeção" },
  },
  {
    id: "new-holland",
    tema: "NEW HOLLAND",
    cut: "V8961A091W",
    es: { head: ["Inyección para", "New Holland"], sub: "Bombas, inyectores y repuestos de inyección" },
    pt: { head: ["Injeção para", "New Holland"], sub: "Bombas, bicos e peças de injeção" },
  },
  {
    id: "massey",
    tema: "MASSEY FERGUSON",
    cut: "V3663F130G",
    es: { head: ["Inyección para", "Massey Ferguson"], sub: "Bombas, inyectores y repuestos de inyección" },
    pt: { head: ["Injeção para", "Massey Ferguson"], sub: "Bombas, bicos e peças de injeção" },
  },
  {
    id: "case-ih",
    tema: "CASE IH",
    cut: "0445120212C",
    es: { head: ["Inyección para", "Case IH"], sub: "Bombas, inyectores y repuestos de inyección" },
    pt: { head: ["Injeção para", "Case IH"], sub: "Bombas, bicos e peças de injeção" },
  },
  {
    id: "motores",
    tema: "GENERICO",
    cut: "V6801089",
    es: { head: ["Inyección para", "Motores Diesel"], sub: "Cummins · Perkins · MWM · FPT — bombas y inyectores" },
    pt: { head: ["Injeção para", "Motores Diesel"], sub: "Cummins · Perkins · MWM · FPT — bombas e bicos" },
  },
];

const TXT = {
  es: { kicker: "Nueva línea · Inyección Diesel", cta: "Consultá precio", disp: "Disponible ahora", uy: "URUGUAY" },
  pt: { kicker: "Nova linha · Injeção Diesel", cta: "Consulte o preço", disp: "Disponível agora", uy: "BRASIL · RS" },
};

function html(slide, lang, mode) {
  const tema = TEMAS[slide.tema] || TEMAS.GENERICO;
  const t = TXT[lang];
  const c = slide[lang];
  const bgImg = tema.bg ? b64(path.join(BG, tema.bg)) : "";
  const cut = cutB64(slide.cut);
  const logo = fs.existsSync(LOGO) ? b64(LOGO) : "";
  const W = mode === "mobile" ? 1080 : 1920;
  const H = mode === "mobile" ? 470 : 520;
  const m = mode === "mobile";
  return `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800;900&family=Barlow+Condensed:wght@600;700;800;900&display=swap" rel="stylesheet">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  :root{--col:${tema.col};--acc:${tema.acc};--tint:${tema.tint}}
  html,body{width:${W}px;height:${H}px}
  body{font-family:'Archivo',sans-serif;color:#fff;overflow:hidden;position:relative;background:#000}
  .bg{position:absolute;inset:0;background-size:cover;background-position:${tema.pos || "50% 50%"}}
  .bg.gen{background:radial-gradient(90% 150% at 72% 40%, #1b1f26 0%, #0f1319 46%, #05070a 100%)}
  .gridtec{position:absolute;inset:0;opacity:.5;
    background-image:linear-gradient(rgba(255,154,46,.10) 1px,transparent 1px),linear-gradient(90deg,rgba(255,154,46,.10) 1px,transparent 1px);
    background-size:64px 64px;-webkit-mask-image:radial-gradient(70% 120% at 70% 50%, #000 0%, transparent 85%)}
  .scrim{position:absolute;inset:0;background:
      linear-gradient(90deg, rgba(0,0,0,.84) 0%, rgba(0,0,0,.55) 34%, rgba(0,0,0,.20) 60%, rgba(0,0,0,.42) 100%),
      linear-gradient(0deg, rgba(var(--tint),.5), rgba(var(--tint),.1) 55%, transparent)}
  .acc-top{position:absolute;left:0;right:0;top:0;height:7px;background:var(--col)}
  .wrap{position:absolute;inset:0;display:flex;align-items:center;${m ? "padding:0 46px" : "padding:0 200px"};z-index:3}
  .safe{width:100%;${m ? "" : "max-width:1520px;"}margin:0 auto;display:flex;align-items:center;gap:${m ? "20px" : "56px"}}
  .prod{flex:0 0 ${m ? "300px" : "560px"};display:flex;align-items:center;justify-content:center;
    filter:drop-shadow(0 20px 30px rgba(0,0,0,.8))}
  .prod::before{content:'';position:absolute;width:${m ? "340px" : "560px"};height:${m ? "340px" : "560px"};border-radius:50%;z-index:-1;
    background:radial-gradient(circle, rgba(255,255,255,.16) 0%, transparent 60%);filter:blur(6px)}
  .prod img{width:100%;max-height:${m ? "360px" : "430px"};object-fit:contain}
  .txt{flex:1;min-width:0}
  .kicker{display:inline-block;background:var(--col);color:#fff;font-family:'Barlow Condensed';font-weight:800;
    letter-spacing:.2em;text-transform:uppercase;font-size:${m ? "18px" : "24px"};padding:5px 16px;border-radius:5px;
    box-shadow:0 4px 14px rgba(0,0,0,.5)}
  .head{font-family:'Barlow Condensed';font-weight:900;text-transform:uppercase;line-height:.86;margin-top:${m ? "12px" : "16px"};
    font-size:${m ? "60px" : "92px"};text-shadow:0 5px 22px rgba(0,0,0,.85)}
  .head .l2{color:var(--acc);display:block}
  .sub{font-family:'Barlow Condensed';font-weight:700;text-transform:uppercase;letter-spacing:.03em;
    font-size:${m ? "22px" : "30px"};margin-top:${m ? "10px" : "14px"};color:#fff;text-shadow:0 2px 10px rgba(0,0,0,.8)}
  .row{display:flex;align-items:center;gap:${m ? "16px" : "26px"};margin-top:${m ? "16px" : "26px"}}
  .cta{display:inline-flex;align-items:center;gap:10px;background:var(--acc);color:#141414;font-family:'Barlow Condensed';
    font-weight:900;text-transform:uppercase;letter-spacing:.04em;font-size:${m ? "26px" : "34px"};
    padding:${m ? "10px 24px" : "14px 34px"};border-radius:999px;box-shadow:0 8px 22px rgba(0,0,0,.45)}
  .disp{font-family:'Barlow Condensed';font-weight:700;text-transform:uppercase;letter-spacing:.1em;
    font-size:${m ? "18px" : "22px"};color:#fff;opacity:.9}
  .bar{position:absolute;right:${m ? "20px" : "48px"};bottom:${m ? "16px" : "22px"};display:flex;align-items:center;gap:${m ? "14px" : "22px"};z-index:5}
  .bar img{height:${m ? "34px" : "44px"}}
  .site{font-family:'Barlow Condensed';font-weight:900;font-size:${m ? "22px" : "30px"};color:#fff;letter-spacing:.02em;
    text-shadow:0 2px 8px rgba(0,0,0,.8)}
  .uy{font-family:'Barlow Condensed';font-weight:800;font-size:${m ? "15px" : "19px"};letter-spacing:.18em;color:var(--acc)}
</style></head>
<body>
  ${tema.bg ? `<div class="bg" style="background-image:url('${bgImg}')"></div>` : `<div class="bg gen"></div><div class="gridtec"></div>`}
  <div class="scrim"></div>
  <div class="acc-top"></div>
  <div class="wrap"><div class="safe">
    <div class="prod">${cut ? `<img src="${cut}">` : ""}</div>
    <div class="txt">
      <div class="kicker">${t.kicker}</div>
      <div class="head">${c.head[0]}<span class="l2">${c.head[1]}</span></div>
      <div class="sub">${c.sub}</div>
      <div class="row">
        <div class="cta">${t.cta} →</div>
        <div class="disp">${t.disp}</div>
      </div>
    </div>
  </div></div>
  <div class="bar">${logo ? `<img src="${logo}">` : ""}<div class="site">${SITE}</div><div class="uy">${t.uy}</div></div>
</body></html>`;
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch({ channel: "msedge" });
  let ok = 0;
  for (const mode of ["desktop", "mobile"]) {
    const W = mode === "mobile" ? 1080 : 1920;
    const H = mode === "mobile" ? 470 : 520;
    const page = await b.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    for (const slide of SLIDES) {
      for (const lang of ["es", "pt"]) {
        await page.setContent(html(slide, lang, mode), { waitUntil: "networkidle" });
        await page.waitForTimeout(150);
        const dst = path.join(OUT, `${slide.id}_${lang}_${mode}.jpg`);
        await page.screenshot({ path: dst, type: "jpeg", quality: 90 });
        ok++;
        console.log("banner", dst.replace(OUT + path.sep, ""));
      }
    }
    await page.close();
  }
  await b.close();
  console.log("FIM. banners:", ok, "em", OUT);
})().catch((e) => { console.error("ERRO:", e.message); process.exit(1); });
