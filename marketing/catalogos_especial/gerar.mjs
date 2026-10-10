// Campanha especial: catálogos de peças e manuais de manutenção de tratores para mecânicos e clientes.
// Espanhol e português. Capas desenhadas (sem material das montadoras) + telas reais do site.
//
// Uso (raiz do projeto):  node marketing/catalogos_especial/gerar.mjs
// Saída: marketing/catalogos_especial/saida/es/ e /pt/ (feed 1080x1350, stories 1080x1920,
// legendas.md e mosaico.png). Textos das linhas e marcas: config.json.
// Telas do celular: marketing/vitrine/telas/ (capturadas do site no ar).
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const RAIZ = process.cwd();
const DIR = path.join(RAIZ, "marketing/catalogos_especial");
const { chromium } = require(path.join(RAIZ, "node_modules/playwright"));
const C = JSON.parse(fs.readFileSync(path.join(DIR, "config.json"), "utf8"));
const SITE = C.site;
const LOGO = pathToFileURL(path.join(RAIZ, "public/logo.png")).href;
const tela = (n) => pathToFileURL(path.join(RAIZ, "marketing/vitrine/telas", n + ".png")).href;

const T = {
  es: {
    sub: "REPUESTOS AGRÍCOLAS",
    kicker: "Para mecánicos y clientes",
    titulo: (l) => `Catálogos de tractores <span class="oro">${l}</span>`,
    titulo2: "Piezas y mantenimiento, en PDF",
    lead: "Catálogos de piezas y manuales de mantenimiento para que encuentres el código exacto y cuides tu máquina.",
    gratis: "Gratis con tu cuenta",
    cta: "Creá tu cuenta gratis",
    disp: "Consultá los catálogos disponibles en el sitio.",
    piezas: "Catálogo de piezas",
    manual: "Manual de mantenimiento",
    piezasItens: ["Despiece con dibujos", "Código original de cada pieza", "Para pedir el repuesto exacto"],
    manualItens: ["Intervalos de service", "Ajustes y procedimientos", "Para mantener la máquina al día"],
    mec: "Para el mecánico",
    cli: "Para el productor",
    mecItens: ["El código exacto antes de desarmar", "Consultá en el taller, desde el celular", "Cotizá la pieza en el momento"],
    cliItens: ["Identificá la pieza de tu tractor", "Pedí el precio con el código", "Hacé el mantenimiento a tiempo"],
    passos: ["Creá tu cuenta gratis", "Elegí la marca de tu tractor", "Abrí el PDF y buscá la pieza"],
    passosTit: "Así de fácil",
    deslize: "Deslizá",
    lineas: "Líneas",
    toque: "Tocá el enlace",
    leg: (l) => [
      `📚 Catálogos de tractores ${l}, para mecánicos y clientes.\n\nCatálogos de piezas y manuales de mantenimiento en PDF. Creá tu cuenta gratis en ${SITE} y abrilos desde el celular o la PC.\n👉 ${SITE}/catalogos`,
      `🔧 Catálogo de piezas o manual de mantenimiento: ¿cuál necesitás?\n\n📋 Catálogo de piezas: despiece y código original de cada pieza.\n🛠️ Manual de mantenimiento: intervalos de service, ajustes y procedimientos.\n\nGratis con tu cuenta en ${SITE}/catalogos`,
      `👨‍🔧 Mecánicos y productores: los catálogos son para los dos.\nEl mecánico encuentra el código exacto; el productor identifica la pieza y pide el precio.\n👉 ${SITE}/catalogos`,
      `Así de fácil 👇\n1️⃣ Creá tu cuenta gratis\n2️⃣ Elegí la marca de tu tractor\n3️⃣ Abrí el PDF y buscá la pieza\n👉 ${SITE}/catalogos`,
    ],
    tags: "#AgroParts #Uruguay #CatalogosDeTractores #ManualDeTaller #Mecanicos #RepuestosAgricolas",
  },
  pt: {
    sub: "PEÇAS AGRÍCOLAS",
    kicker: "Para mecânicos e clientes",
    titulo: (l) => `Catálogos de tratores <span class="oro">${l}</span>`,
    titulo2: "Peças e manutenção, em PDF",
    lead: "Catálogos de peças e manuais de manutenção para você achar o código exato e cuidar da sua máquina.",
    gratis: "Grátis com sua conta",
    cta: "Crie sua conta grátis",
    disp: "Consulte os catálogos disponíveis no site.",
    piezas: "Catálogo de peças",
    manual: "Manual de manutenção",
    piezasItens: ["Vista explodida com desenhos", "Código original de cada peça", "Para pedir a peça exata"],
    manualItens: ["Intervalos de revisão", "Ajustes e procedimentos", "Para manter a máquina em dia"],
    mec: "Para o mecânico",
    cli: "Para o produtor",
    mecItens: ["O código exato antes de desmontar", "Consulte na oficina, pelo celular", "Cote a peça na hora"],
    cliItens: ["Identifique a peça do seu trator", "Peça o preço com o código", "Faça a manutenção em dia"],
    passos: ["Crie sua conta grátis", "Escolha a marca do seu trator", "Abra o PDF e encontre a peça"],
    passosTit: "Simples assim",
    deslize: "Deslize",
    lineas: "Linhas",
    toque: "Toque no link",
    leg: (l) => [
      `📚 Catálogos de tratores ${l}, para mecânicos e clientes.\n\nCatálogos de peças e manuais de manutenção em PDF. Crie sua conta grátis em ${SITE} e abra pelo celular ou PC.\n👉 ${SITE}/catalogos`,
      `🔧 Catálogo de peças ou manual de manutenção: qual você precisa?\n\n📋 Catálogo de peças: vista explodida e código original de cada peça.\n🛠️ Manual de manutenção: intervalos de revisão, ajustes e procedimentos.\n\nGrátis com sua conta em ${SITE}/catalogos`,
      `👨‍🔧 Mecânicos e produtores: os catálogos são para os dois.\nO mecânico encontra o código exato; o produtor identifica a peça e pede o preço.\n👉 ${SITE}/catalogos`,
      `Simples assim 👇\n1️⃣ Crie sua conta grátis\n2️⃣ Escolha a marca do seu trator\n3️⃣ Abra o PDF e encontre a peça\n👉 ${SITE}/catalogos`,
    ],
    tags: "#AgroParts #CatalogosDeTratores #ManualDeManutencao #Mecanicos #PecasAgricolas",
  },
};

const GRAO = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E")`;
const BASE = `
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=IBM+Plex+Mono:wght@500;700&display=swap" rel="stylesheet">
<style>
:root{--noche:#062016;--verde:#0f4d2e;--vivo:#1d8a4a;--oro:#ffc21a;--crema:#f3efe4;--whats:#25D366}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Archivo",system-ui,sans-serif;-webkit-font-smoothing:antialiased;color:#fff}
.l{position:relative;overflow:hidden;width:1080px;height:1350px}
.s{height:1920px}
.grano::after{content:"";position:absolute;inset:0;background-image:${GRAO};opacity:.12;mix-blend-mode:overlay;pointer-events:none;z-index:50}
.oscuro{background:radial-gradient(70% 55% at 80% 30%,#1f7a46 0%,transparent 60%),radial-gradient(60% 50% at 0% 100%,#0f4d2e 0%,transparent 70%),var(--noche)}
.crema{background:radial-gradient(80% 60% at 70% 35%,#fffdf6 0%,var(--crema) 70%);color:var(--noche)}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px);background-size:60px 60px;mask-image:radial-gradient(70% 60% at 60% 40%,#000,transparent)}
.d{font-weight:900;font-stretch:72%;line-height:.92;letter-spacing:-1px}
.oro{color:var(--oro)}
.marca{display:flex;align-items:center;gap:14px}
.marca img{width:64px;height:64px;background:#fff;border-radius:18px;padding:5px}
.marca b{display:block;font-size:28px;font-weight:900;font-stretch:90%}
.marca span{display:block;font-size:13px;font-weight:700;letter-spacing:3.5px;color:var(--oro)}
.kick{display:inline-flex;align-items:center;gap:10px;background:var(--oro);color:var(--noche);font-weight:900;font-size:22px;letter-spacing:2px;text-transform:uppercase;padding:12px 22px;border-radius:999px}
.capa{position:absolute;width:250px;background:#fff;color:#18181b;border-radius:22px;box-shadow:0 30px 60px rgba(0,0,0,.35);overflow:hidden}
.capa .faixa{height:16px}
.capa .c{padding:20px 22px}
.capa .m{font-size:15px;font-weight:900;letter-spacing:1.5px}
.capa .t{font-size:24px;font-weight:900;line-height:1.05;margin-top:6px}
.capa .ln{height:9px;border-radius:9px;background:#eee;margin-top:12px}
.pdf{display:inline-block;margin-top:16px;font-weight:900;font-size:15px;color:#dc2626;background:#fef2f2;border:2px solid #fecaca;border-radius:8px;padding:4px 9px}
.phone{position:absolute;width:430px;height:930px;border-radius:66px;background:linear-gradient(145deg,#2a2f2c,#090b0a);padding:13px;box-shadow:0 60px 120px rgba(0,0,0,.55)}
.phone .tela{width:100%;height:100%;border-radius:54px;overflow:hidden;background:#fff}
.phone img{width:100%;height:100%;object-fit:cover;object-position:top}
.phone .ilha{position:absolute;left:50%;top:26px;width:120px;height:34px;border-radius:20px;background:#000;transform:translateX(-50%)}
.glass{background:rgba(255,255,255,.11);border:1.5px solid rgba(255,255,255,.2);border-radius:28px;padding:28px 30px}
.card{background:#fff;color:var(--noche);border-radius:28px;padding:28px 30px;box-shadow:0 24px 60px rgba(0,0,0,.18)}
.num{display:inline-grid;place-items:center;width:56px;height:56px;border-radius:50%;background:var(--oro);color:var(--noche);font-weight:900;font-size:28px;flex:none}
.chk{display:flex;gap:14px;align-items:flex-start;font-size:27px;font-weight:700;margin-top:16px;line-height:1.2}
.chk:before{content:"✓";flex:none;width:36px;height:36px;border-radius:50%;background:var(--vivo);color:#fff;display:grid;place-items:center;font-size:20px;font-weight:900}
.url{position:absolute;left:64px;bottom:60px;display:inline-flex;align-items:center;gap:12px;border-radius:999px;font-family:"IBM Plex Mono",monospace;font-weight:700;font-size:28px;padding:18px 28px}
</style>`;

const MARCAS = C.marcas;
const capa = (m, cor, tipo, est) =>
  `<div class="capa" style="${est}"><div class="faixa" style="background:${cor}"></div><div class="c"><div class="m" style="color:${cor}">${m.toUpperCase()}</div><div class="t">${tipo}</div>${[100, 80, 92, 70].map((w) => `<div class="ln" style="width:${w}%"></div>`).join("")}<span class="pdf">PDF</span></div></div>`;

function gerarPosts(lang) {
  const t = T[lang];
  const lin = C[`linhas_${lang}`];
  const marca = (claro) => `<div class="marca"><img src="${LOGO}"><div><b style="color:${claro ? "var(--noche)" : "#fff"}">AGRO PARTS</b><span style="${claro ? "color:#a77900" : ""}">${t.sub}</span></div></div>`;
  const url = (claro) => `<div class="url" style="background:${claro ? "var(--noche)" : "#fff"};color:${claro ? "#fff" : "var(--noche)"}">🌐 ${SITE}/catalogos</div>`;
  const chips = (claro) => `<div style="display:flex;flex-wrap:wrap;gap:10px">${MARCAS.map(([m, c]) => `<span style="display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:10px 18px;font-size:22px;font-weight:800;${claro ? "background:#fff;color:var(--noche);box-shadow:0 6px 16px rgba(0,0,0,.06)" : "background:rgba(255,255,255,.1);border:1.5px solid rgba(255,255,255,.2)"}"><i style="width:12px;height:12px;border-radius:50%;background:${c}"></i>${m}</span>`).join("")}</div>`;
  const leque = (x, y, esc = 1) =>
    `<div style="position:absolute;left:${x}px;top:${y}px;width:620px;height:520px;transform:scale(${esc});transform-origin:top left">${MARCAS.slice(0, 5)
      .map(([m, c], k) => capa(m, c, k % 2 ? t.manual : t.piezas, `left:${k * 85}px;top:${Math.abs(k - 2) * 40}px;transform:rotate(${(k - 2) * 7}deg);z-index:${5 - Math.abs(k - 2)}`))
      .join("")}</div>`;
  const posts = [];
  const add = (nome, html, legenda, story = false) => posts.push({ nome, html, legenda, story });
  const L = t.leg(lin);

  // 1. Capa / herói
  add("01_catalogos_tractores", `<div class="l oscuro grano"><div class="grid"></div>
    <div style="position:absolute;left:64px;top:56px">${marca()}</div>
    <div style="position:absolute;left:64px;top:170px;width:950px">
      <span class="kick">🔧 ${t.kicker}</span>
      <h1 class="d" style="font-size:104px;margin-top:24px">${t.titulo(lin)}</h1>
      <p style="font-size:30px;line-height:1.35;margin-top:22px;color:#cfe6d7;width:880px">${t.lead}</p>
    </div>
    ${leque(230, 690)}
    <div style="position:absolute;left:64px;right:64px;top:1150px;display:flex;justify-content:space-between;align-items:center">
      <span style="font-size:30px;font-weight:900" class="oro">${t.gratis} →</span>
    </div>
    ${url()}
  </div>`, `${L[0]}\n\n${t.tags}`);

  // 2. Peças x manutenção
  const coluna = (titulo, ico, itens, x, cor) =>
    `<div class="card" style="position:absolute;left:${x}px;top:520px;width:460px;height:600px">
      <div style="width:76px;height:76px;border-radius:22px;background:${cor};display:grid;place-items:center;font-size:40px">${ico}</div>
      <h2 class="d" style="font-size:58px;margin-top:22px">${titulo}</h2>
      ${itens.map((i) => `<div class="chk">${i}</div>`).join("")}
      <span class="pdf" style="margin-top:28px;font-size:18px">PDF</span>
    </div>`;
  add("02_piezas_y_mantenimiento", `<div class="l crema grano">
    <div style="position:absolute;left:64px;top:56px">${marca(true)}</div>
    <div style="position:absolute;left:64px;top:175px;width:950px">
      <div style="font-size:24px;font-weight:800;letter-spacing:4px;color:var(--vivo)">${t.kicker.toUpperCase()}</div>
      <h1 class="d" style="font-size:100px;margin-top:14px;color:var(--noche)">${t.titulo2}</h1>
    </div>
    ${coluna(t.piezas, "📋", t.piezasItens, 64, "#e8f3ec")}
    ${coluna(t.manual, "🛠️", t.manualItens, 556, "#fff3cf")}
    ${url(true)}
  </div>`, `${L[1]}\n\n${t.tags}`);

  // 3. Mecânico x produtor
  add("03_mecanicos_y_productores", `<div class="l oscuro grano"><div class="grid"></div>
    <div style="position:absolute;left:64px;top:56px">${marca()}</div>
    <h1 class="d" style="position:absolute;left:64px;top:170px;width:950px;font-size:96px">${lang === "es" ? "Para mecánicos <span class=\"oro\">y productores</span>" : "Para mecânicos <span class=\"oro\">e produtores</span>"}</h1>
    ${[[t.mec, "👨‍🔧", t.mecItens, 64], [t.cli, "🚜", t.cliItens, 556]]
      .map(([tit, ico, itens, x]) => `<div class="glass" style="position:absolute;left:${x}px;top:440px;width:460px;min-height:470px">
        <div style="font-size:64px">${ico}</div>
        <h2 class="d oro" style="font-size:54px;margin-top:16px">${tit}</h2>
        ${itens.map((i) => `<div class="chk" style="color:#eaf5ee">${i}</div>`).join("")}</div>`)
      .join("")}
    <div style="position:absolute;left:64px;top:990px;display:inline-flex;align-items:center;gap:14px;background:var(--oro);color:var(--noche);font-size:36px;font-weight:900;border-radius:999px;padding:24px 38px">${t.cta} →</div>
    ${url()}
  </div>`, `${L[2]}\n\n${t.tags}`);

  // 4. Como acessar (celular real)
  add("04_asi_de_facil", `<div class="l crema grano">
    <div style="position:absolute;left:64px;top:56px">${marca(true)}</div>
    <div class="phone" style="left:590px;top:200px;transform:rotate(6deg)"><div class="ilha"></div><div class="tela"><img src="${tela("m_catalogos")}"></div></div>
    <div style="position:absolute;left:64px;top:190px;width:500px">
      <h1 class="d" style="font-size:112px;color:var(--noche)">${t.passosTit}</h1>
      ${t.passos.map((p, k) => `<div class="card" style="margin-top:${k ? 22 : 44}px;display:flex;gap:18px;align-items:center;padding:22px 24px"><span class="num">${k + 1}</span><span style="font-size:29px;font-weight:900;line-height:1.15">${p}</span></div>`).join("")}
      <div style="margin-top:40px">${chips(true)}</div>
      <p style="font-size:18px;color:#6b7a70;margin-top:16px">${t.disp}</p>
    </div>
    ${url(true)}
  </div>`, `${L[3]}\n\n${t.tags}`);

  // 5. Carrossel (5 slides)
  const sl = (k, corpo, claro = false) => `<div class="l ${claro ? "crema" : "oscuro"} grano">${claro ? "" : '<div class="grid"></div>'}
    <div style="position:absolute;left:64px;top:56px">${marca(claro)}</div>
    <div style="position:absolute;right:64px;top:74px;font-size:24px;font-weight:800;opacity:.6">${k}/5</div>
    ${corpo}
    ${k < 5 ? `<div style="position:absolute;right:64px;bottom:70px;font-size:30px;font-weight:900;color:${claro ? "var(--vivo)" : "var(--oro)"}">${t.deslize} →</div>` : ""}</div>`;
  add("05_carrusel_1", sl(1, `<div style="position:absolute;left:64px;top:200px;width:950px"><span class="kick">📚 ${t.kicker}</span><h1 class="d" style="font-size:118px;margin-top:26px">${t.titulo(lin)}</h1></div>${leque(230, 760, 0.95)}`), `${L[0]}\n\n${t.tags}`);
  add("05_carrusel_2", sl(2, `<div style="position:absolute;left:64px;top:200px;width:950px"><div style="font-size:26px;font-weight:800;letter-spacing:4px" class="oro">${t.lineas.toUpperCase()}</div><h1 class="d" style="font-size:110px;margin-top:16px">${lang === "es" ? "Para tu marca de tractor" : "Para a marca do seu trator"}</h1><div style="margin-top:50px">${chips()}</div><p style="font-size:24px;margin-top:30px;color:#cfe6d7">${t.disp}</p></div>`), "");
  add("05_carrusel_3", sl(3, `${capa(MARCAS[0][0], MARCAS[0][1], t.piezas, "left:620px;top:260px;transform:rotate(8deg) scale(1.3)")}<div style="position:absolute;left:64px;top:220px;width:540px"><div style="font-size:90px">📋</div><h1 class="d" style="font-size:100px;margin-top:10px;color:var(--noche)">${t.piezas}</h1>${t.piezasItens.map((i) => `<div class="chk" style="color:var(--noche)">${i}</div>`).join("")}</div>`, true), "");
  add("05_carrusel_4", sl(4, `${capa(MARCAS[2][0], MARCAS[2][1], t.manual, "left:620px;top:260px;transform:rotate(-8deg) scale(1.3)")}<div style="position:absolute;left:64px;top:220px;width:540px"><div style="font-size:90px">🛠️</div><h1 class="d" style="font-size:100px;margin-top:10px;color:var(--noche)">${t.manual}</h1>${t.manualItens.map((i) => `<div class="chk" style="color:var(--noche)">${i}</div>`).join("")}</div>`, true), "");
  add("05_carrusel_5", sl(5, `<div style="position:absolute;left:64px;top:220px;width:950px"><h1 class="d" style="font-size:120px">${t.gratis}</h1>${t.passos.map((p, k) => `<div class="glass" style="margin-top:${k ? 20 : 50}px;display:flex;gap:18px;align-items:center;padding:22px 26px"><span class="num">${k + 1}</span><span style="font-size:32px;font-weight:900">${p}</span></div>`).join("")}<div style="margin-top:50px;display:inline-flex;align-items:center;gap:14px;background:var(--oro);color:var(--noche);font-size:40px;font-weight:900;border-radius:999px;padding:26px 40px">${t.cta} →</div></div>${url()}`), "");

  // 6. Stories
  const story = (nome, corpo, leg) => add(nome, `<div class="l s oscuro grano"><div class="grid"></div><div style="position:absolute;left:72px;top:140px">${marca()}</div>${corpo}
    <div style="position:absolute;left:50%;bottom:150px;transform:translateX(-50%);background:var(--oro);color:var(--noche);font-size:38px;font-weight:900;border-radius:999px;padding:26px 44px;white-space:nowrap">${t.toque} 👆</div></div>`, leg, true);
  story("06_story_catalogos", `<div style="position:absolute;left:72px;right:72px;top:290px"><span class="kick">🔧 ${t.kicker}</span><h1 class="d" style="font-size:124px;margin-top:26px">${t.titulo(lin)}</h1><p style="font-size:36px;margin-top:24px;color:#cfe6d7">${t.titulo2}. ${t.gratis}.</p></div>${leque(230, 1080, 1.05)}`, lang === "es" ? "Story: sticker de enlace a agropartsuy.com/catalogos sobre el botón." : "Story: sticker de link para agropartsuy.com/catalogos sobre o botão.");
  story("07_story_como", `<div style="position:absolute;left:72px;right:72px;top:290px"><h1 class="d" style="font-size:130px">${t.passosTit}</h1>${t.passos.map((p, k) => `<div class="glass" style="margin-top:${k ? 22 : 40}px;display:flex;gap:18px;align-items:center;padding:24px 28px"><span class="num">${k + 1}</span><span style="font-size:36px;font-weight:900">${p}</span></div>`).join("")}</div>
    <div class="phone" style="left:325px;top:1000px;transform:rotate(4deg) scale(.72);transform-origin:top center"><div class="ilha"></div><div class="tela"><img src="${tela("m_catalogos")}"></div></div>`, lang === "es" ? "Story: sticker de enlace a agropartsuy.com/catalogos." : "Story: sticker de link para agropartsuy.com/catalogos.");
  // ---------- Tratores (fotos enviadas pelo cliente, recortadas em tratores/) ----------
  const TR = (n) => pathToFileURL(path.join(DIR, "tratores", n)).href;
  const temCat = (m) => (C.com_catalogo || []).includes(m);
  const corDe = (m) => (MARCAS.find(([x]) => x === m) || [m, "#0b7a3b"])[1];
  const tx = lang === "es"
    ? { linhas: "Catálogos para tu tractor", disp: "Catálogo disponible", pedir: "¿Buscás el catálogo de tu modelo?", pedirSub: "Pedilo por WhatsApp y te ayudamos.", para: (m) => `Para tu ${m}`, mais: "Y vamos sumando más marcas y modelos." }
    : { linhas: "Catálogos para o seu trator", disp: "Catálogo disponível", pedir: "Procurando o catálogo do seu modelo?", pedirSub: "Peça pelo WhatsApp e ajudamos você.", para: (m) => `Para o seu ${m}`, mais: "E estamos adicionando mais marcas e modelos." };
  // Trator recortado sobre "palco" claro (a sombra original some no fundo claro)
  const recorte = (img, est) => `<img src="${TR(img)}" style="position:absolute;object-fit:contain;filter:drop-shadow(0 30px 30px rgba(0,0,0,.25));${est}">`;
  const fotoCase = (est) => `<div style="position:absolute;overflow:hidden;border-radius:34px;box-shadow:0 40px 80px rgba(0,0,0,.35);${est}"><img src="${TR("case-ih-foto.png")}" style="width:100%;height:100%;object-fit:cover;object-position:50% 40%;transform:scale(1.04)"></div>`;

  // 8. Linhas: três tratores com a capa da marca
  add("08_lineas_tractores", `<div class="l crema grano">
    <div style="position:absolute;left:64px;top:56px">${marca(true)}</div>
    <div style="position:absolute;left:64px;top:175px;width:950px">
      <div style="font-size:24px;font-weight:800;letter-spacing:4px;color:var(--vivo)">${t.kicker.toUpperCase()}</div>
      <h1 class="d" style="font-size:104px;margin-top:14px;color:var(--noche)">${tx.linhas}</h1>
    </div>
    ${fotoCase("left:520px;top:440px;width:500px;height:360px")}
    ${capa("Case IH", corDe("Case IH"), t.manual, "left:830px;top:700px;transform:rotate(8deg) scale(.82)")}
    ${recorte("john-deere.png", "left:40px;top:430px;width:470px")}
    ${capa("John Deere", corDe("John Deere"), t.piezas, "left:300px;top:690px;transform:rotate(-7deg) scale(.78)")}
    ${recorte("new-holland.png", "left:300px;top:800px;width:480px")}
    <div style="position:absolute;left:64px;right:64px;top:1150px;font-size:22px;color:#6b7a70;text-align:center;background:var(--crema);padding:6px 0">${t.disp} ${tx.mais}</div>
    ${url(true)}
  </div>`, `${L[0]}\n\n${t.tags}`);

  // 9-11. Uma marca por post
  const marcaPost = (k, m, visual) => {
    const cor = corDe(m);
    const ok = temCat(m);
    add(`${k}_${m.toLowerCase().replace(/\s+/g, "-")}`, `<div class="l crema grano">
      <div style="position:absolute;left:0;top:0;width:100%;height:16px;background:${cor}"></div>
      <div style="position:absolute;left:64px;top:56px">${marca(true)}</div>
      <div style="position:absolute;right:64px;top:70px;display:inline-flex;align-items:center;gap:10px;border-radius:999px;padding:12px 22px;font-size:22px;font-weight:900;color:#fff;background:${ok ? "var(--vivo)" : "var(--noche)"}">${ok ? `✓ ${tx.disp}` : "💬 WhatsApp"}</div>
      <div style="position:absolute;left:64px;top:170px;width:950px">
        <div style="font-size:26px;font-weight:800;letter-spacing:4px;color:${cor}">${t.kicker.toUpperCase()}</div>
        <h1 class="d" style="font-size:${m.length > 10 ? 120 : 140}px;margin-top:10px;color:var(--noche)">${m}</h1>
      </div>
      ${visual}
      ${capa(m, cor, ok ? t.manual : t.piezas, "left:700px;top:820px;transform:rotate(9deg) scale(1.05)")}
      <div style="position:absolute;left:64px;top:1030px;width:600px">
        <div class="d" style="font-size:54px;color:var(--noche)">${ok ? t.titulo2 : tx.pedir}</div>
        <div style="font-size:26px;margin-top:12px;color:#4b5a50">${ok ? t.gratis : tx.pedirSub}</div>
      </div>
      ${url(true)}
    </div>`, ok
      ? `📚 ${m}: ${lang === "es" ? "catálogo disponible en" : "catálogo disponível em"} ${SITE}/catalogos\n${t.titulo2}. ${t.gratis}.\n\n${t.tags} #${m.replace(/\s+/g, "")}`
      : `🚜 ${tx.pedir} ${m}\n${tx.pedirSub}\n👉 ${SITE}\n\n${t.tags} #${m.replace(/\s+/g, "")}`);
  };
  marcaPost("09", "Case IH", fotoCase("left:64px;top:420px;width:760px;height:560px"));
  marcaPost("10", "John Deere", `<div style="position:absolute;left:90px;top:440px;width:900px;height:560px;border-radius:50%;background:radial-gradient(closest-side,#fff 0%,rgba(255,255,255,0) 100%)"></div>${recorte("john-deere.png", "left:110px;top:420px;width:760px")}`);
  marcaPost("11", "New Holland", `<div style="position:absolute;left:90px;top:440px;width:900px;height:560px;border-radius:50%;background:radial-gradient(closest-side,#fff 0%,rgba(255,255,255,0) 100%)"></div>${recorte("new-holland.png", "left:60px;top:450px;width:880px")}`);

  // 12. Story com os tratores
  add("12_story_tractores", `<div class="l s crema grano">
    <div style="position:absolute;left:72px;top:140px">${marca(true)}</div>
    <div style="position:absolute;left:72px;right:72px;top:290px"><div style="font-size:30px;font-weight:800;letter-spacing:4px;color:var(--vivo)">${t.kicker.toUpperCase()}</div>
      <h1 class="d" style="font-size:124px;margin-top:16px;color:var(--noche)">${tx.linhas}</h1></div>
    ${fotoCase("left:72px;top:700px;width:936px;height:520px")}
    ${recorte("john-deere.png", "left:40px;top:1150px;width:560px")}
    ${recorte("new-holland.png", "left:480px;top:1240px;width:580px")}
    <div style="position:absolute;left:50%;bottom:150px;transform:translateX(-50%);background:var(--noche);color:#fff;font-size:38px;font-weight:900;border-radius:999px;padding:26px 44px;white-space:nowrap">${t.toque} 👆</div>
  </div>`, lang === "es" ? "Story: sticker de enlace a agropartsuy.com/catalogos." : "Story: sticker de link para agropartsuy.com/catalogos.", true);

  return posts;
}

const b = await chromium.launch();
const pg = await b.newPage();
for (const lang of ["es", "pt"]) {
  const OUT = path.join(DIR, "saida", lang);
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const tmp = path.join(OUT, "_tmp.html");
  const posts = gerarPosts(lang);
  for (const p of posts) {
    const h = p.story ? 1920 : 1350;
    await pg.setViewportSize({ width: 1080, height: h });
    fs.writeFileSync(tmp, `<!doctype html><meta charset="utf-8">${BASE}<body>${p.html}</body>`);
    await pg.goto(pathToFileURL(tmp).href, { waitUntil: "networkidle" });
    await pg.evaluate(() => document.fonts.ready);
    await pg.screenshot({ path: path.join(OUT, p.nome + ".png"), clip: { x: 0, y: 0, width: 1080, height: h } });
  }
  fs.writeFileSync(path.join(OUT, "legendas.md"), [`# ${lang === "es" ? "Leyendas" : "Legendas"} · Catálogos`, "", ...posts.filter((p) => p.legenda).flatMap((p) => [`## ${p.nome}.png`, "", p.legenda, ""])].join("\n"));
  fs.writeFileSync(tmp, `<!doctype html><body style="margin:0;background:#111"><div style="display:grid;grid-template-columns:repeat(6,250px);gap:6px;padding:6px;align-items:start">${posts.map((p) => `<img src="${pathToFileURL(path.join(OUT, p.nome + ".png")).href}" style="width:250px">`).join("")}</div>`);
  await pg.setViewportSize({ width: 1550, height: 800 });
  await pg.goto(pathToFileURL(tmp).href, { waitUntil: "load" });
  await pg.waitForTimeout(600);
  await pg.screenshot({ path: path.join(OUT, "mosaico.png"), fullPage: true });
  fs.rmSync(tmp, { force: true });
  console.log(lang, posts.length, "artes");
}
await b.close();
