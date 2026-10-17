// Kit da PRÉ-BLACK v2 (espanhol e português): carrossel «como funciona» (6 slides), stories
// (já começou, contagem 30/15/7/amanhã, enquete, cupom misterioso) e capas dos destaques.
// Uso: node marketing/pre-black-v2/kit.mjs
import path from "path";
import { PASTA, PECAS, TXT, abrir, ico, marca, moeda, parede, pct, relevo } from "./comum.mjs";

const FOTOS = PECAS.map((p) => p.img);
const F = [1080, 1350];
const S = [1080, 1920];

// Textos do kit que não estão em comum.mjs
const K = {
  es: {
    como: "¿Cómo funciona?",
    passos: [
      ["Zap", "YA EMPEZÓ", "Pre Black", `${pct} en todo el sitio y cuenta regresiva para la Black.`],
      ["Flame", "27 AL 30 DE NOVIEMBRE", "Black Friday", "Los descuentos de la Black en repuestos para tractores y cosechadoras."],
      ["Bell", "PARA NO PERDERTE NADA", "Avisos", "Creá tu cuenta en el sitio y te avisamos por e-mail."],
    ],
    lista: "Armá tu lista para la zafra",
    itens: ["Filtros de aceite, aire y combustible", "Kit de embrague", "Correas", "Rodamientos", "Bomba hidráulica", "Motor de arranque"],
    guarda: "Guardá este post y buscá cada pieza por el código.",
    misterio: ["Cupón", "misterioso"],
    revela: "SE REVELA PRONTO",
    tuCodigo: "TU CÓDIGO",
    cupones: "agropartsuy.com/cupones",
    fin: ["Que no te", "agarre", "sin repuesto"],
    faltan: "FALTAN",
    dias: "días",
    manana: "MAÑANA",
    empieza: "LA BLACK EMPIEZA",
    aviso: "Activá el aviso",
    verOfertas: "Ver ofertas",
    pregunta: "¿Qué repuesto vas a necesitar en la Black?",
    sticker: "PONÉ ACÁ EL STICKER DE ENCUESTA",
    cats: "Filtros · Embrague · Hidráulica · Rodamientos",
    categorias: "en todas las categorías",
  },
  pt: {
    como: "Como funciona?",
    passos: [
      ["Zap", "JÁ COMEÇOU", "Pré-Black", `${pct} em todo o site e contagem regressiva para a Black.`],
      ["Flame", "27 A 30 DE NOVEMBRO", "Black Friday", "Os descontos da Black em peças para tratores e colheitadeiras."],
      ["Bell", "PARA NÃO PERDER NADA", "Avisos", "Crie sua conta no site e avisamos por e-mail."],
    ],
    lista: "Monte sua lista para a safra",
    itens: ["Filtros de óleo, ar e combustível", "Kit de embreagem", "Correias", "Rolamentos", "Bomba hidráulica", "Motor de partida"],
    guarda: "Salve este post e procure cada peça pelo código.",
    misterio: ["Cupom", "misterioso"],
    revela: "SERÁ REVELADO EM BREVE",
    tuCodigo: "SEU CÓDIGO",
    cupones: "agropartsuy.com/pt/cupones",
    fin: ["Não fique", "sem a", "peça certa"],
    faltan: "FALTAM",
    dias: "dias",
    manana: "AMANHÃ",
    empieza: "A BLACK COMEÇA",
    aviso: "Ative o aviso",
    verOfertas: "Ver ofertas",
    pregunta: "Que peça você vai precisar na Black?",
    sticker: "COLOQUE AQUI O STICKER DE ENQUETE",
    cats: "Filtros · Embreagem · Hidráulica · Rolamentos",
    categorias: "em todas as categorias",
  },
};

const fundoParede = (h, o = {}) => `
  ${parede(FOTOS, { cols: 8, linhas: h > 1400 ? 11 : 8, x: -760, y: -360, w: 2600, rx: 62, rz: -26, opac: 0.7, ...o })}
  <div class="veu" style="background:linear-gradient(180deg, rgba(5,5,5,.9), rgba(5,5,5,.55) 30%, rgba(5,5,5,.8) 55%, #050505 80%)"></div>
  <div class="luz" style="width:900px;height:600px;left:-200px;top:${h * 0.4}px;background:rgba(245,197,24,.24)"></div>`;
const fundoLiso = (h) => `
  <div class="luz" style="width:900px;height:700px;right:-300px;top:-200px;background:rgba(245,197,24,.22)"></div>
  <div class="luz" style="width:800px;height:600px;left:-300px;top:${h - 500}px;background:rgba(245,197,24,.16)"></div>`;
const topo = (t, n, total) =>
  `<div style="position:absolute;left:64px;right:64px;top:56px;display:flex;justify-content:space-between;align-items:center">${marca(t)}<span class="pill pill-vidro" style="padding:10px 20px;font-size:18px;letter-spacing:2px;color:#e4e4e7">${n}/${total}</span></div>`;
const pe = (t, ultimo) =>
  `<div style="position:absolute;left:64px;right:64px;bottom:52px;display:flex;justify-content:space-between;font-weight:800;font-size:20px;letter-spacing:2px;color:#d4d4d8"><span>${t.site.toUpperCase()}</span><span style="color:var(--oro)">${ultimo ? "LINK NA BIO".replace("NA", t === TXT.es ? "EN LA" : "NA") : `${t.desliza.toUpperCase()} →`}</span></div>`;
const titulo = (txt, tam, cor = "#fff") =>
  `<div class="d" style="font-size:${tam}px;color:${cor};text-shadow:${relevo(cor === "#fff" ? "#9a9a9a" : "#c99a06", cor === "#fff" ? "#1c1c1c" : "#3d2d00", 12)}">${txt}</div>`;

function slides(t, k) {
  const total = 6;
  return [
    [
      "A1_capa",
      `${fundoParede(1350)}${topo(t, 1, total)}
      <div style="position:absolute;left:64px;top:420px">
        <span class="pill pill-oro" style="padding:12px 24px;font-size:22px;letter-spacing:3px">${ico("Zap", 22, 2.6)} ${t.jaComecou}</span>
        <div style="margin-top:40px">${titulo(t.preBlack.replace("-", "-<br>").replace(" ", "<br>"), 240)}</div>
      </div>
      ${moeda(t, 320, "right:60px;top:500px;transform:rotate(-12deg)")}
      <div class="vidro" style="position:absolute;left:64px;right:64px;bottom:120px;padding:26px 34px">
        <div class="d" style="font-size:62px;color:var(--oro)">${t.todo}</div>
        <div style="font-size:24px;font-weight:700;color:#e4e4e7;margin-top:6px">${t.periodo}</div></div>
      ${pe(t)}`,
    ],
    [
      "A2_como_funciona",
      `${fundoLiso(1350)}${topo(t, 2, total)}
      <div style="position:absolute;left:64px;top:180px">${titulo(k.como, 120)}</div>
      <div style="position:absolute;left:64px;right:64px;top:430px;display:grid;gap:24px;perspective:1400px">${k.passos
        .map(
          ([i, q, ti, tx], n) => `<div class="vidro" style="display:flex;gap:28px;align-items:center;padding:30px 34px;transform:rotateY(${n === 1 ? 0 : n === 0 ? 6 : -6}deg)">
          <div style="flex:none;width:100px;height:100px;border-radius:30px;display:flex;align-items:center;justify-content:center;${n === 1 ? "background:linear-gradient(180deg,#ffe27a,#f5c518 55%,#d9a90a);color:#1a1300;box-shadow:6px 6px 0 #8a6500" : "background:rgba(245,197,24,.12);color:var(--oro)"}">${ico(i, 52, 1.8)}</div>
          <div><div style="font-size:17px;font-weight:800;letter-spacing:3px;color:var(--oro)">${q}</div>
          <div class="d" style="font-size:54px;margin-top:6px">${ti}</div>
          <div style="font-size:23px;color:#d4d4d8;margin-top:6px;line-height:1.35">${tx}</div></div></div>`,
        )
        .join("")}</div>
      ${pe(t)}`,
    ],
    [
      "A3_categorias",
      `${fundoParede(1350, { opac: 0.45, blur: 2 })}${topo(t, 3, total)}
      <div style="position:absolute;left:64px;top:180px"><div class="d" style="font-size:150px;color:var(--oro);text-shadow:${relevo("#c99a06", "#3d2d00", 12)}">${pct}</div>${titulo(k.categorias, 70)}</div>
      <div style="position:absolute;left:64px;right:64px;top:560px;display:grid;grid-template-columns:repeat(3,1fr);gap:22px;perspective:1400px">${[...new Map(PECAS.map((p) => [p.cat, p])).values()]
        .slice(0, 9)
        .map(
          (p, i) => `<div style="transform:rotateX(${8}deg) rotateY(${(i % 3) * 8 - 8}deg)"><div style="height:170px;background:#fff;border-radius:26px;box-shadow:6px 6px 0 #d9a90a,12px 12px 0 #8a6500,20px 40px 50px rgba(0,0,0,.6)"><img src="${p.img}" style="width:100%;height:100%;object-fit:contain;padding:18px"></div>
          <div style="margin-top:20px;font-size:20px;font-weight:800;letter-spacing:1px;text-transform:uppercase">${t.cat(p)}</div></div>`,
        )
        .join("")}</div>
      ${pe(t)}`,
    ],
    [
      "A4_lista_zafra",
      `${fundoLiso(1350)}${topo(t, 4, total)}
      <div style="position:absolute;left:64px;right:64px;top:180px">${titulo(k.lista, 110)}</div>
      <div class="vidro" style="position:absolute;left:64px;right:64px;top:560px;padding:40px 44px;display:grid;gap:22px">${k.itens
        .map(
          (x, n) => `<div style="display:flex;align-items:center;gap:22px;font-size:34px;font-weight:700"><span style="width:48px;height:48px;border-radius:14px;flex:none;display:flex;align-items:center;justify-content:center;${n < 3 ? "background:linear-gradient(180deg,#ffe27a,#f5c518);color:#1a1300" : "border:3px solid rgba(255,255,255,.3)"}">${n < 3 ? ico("Check", 30, 3.2) : ""}</span>${x}</div>`,
        )
        .join("")}</div>
      <div style="position:absolute;left:64px;bottom:120px;font-size:26px;color:#d4d4d8">${k.guarda}</div>
      ${pe(t)}`,
    ],
    [
      "A5_cupon_misterioso",
      `${fundoLiso(1350)}${topo(t, 5, total)}
      <div style="position:absolute;left:64px;top:180px">${titulo(k.misterio[0], 140)}${titulo(k.misterio[1], 140, "var(--oro)").replace("var(--oro)", "#f5c518")}</div>
      <div style="position:absolute;left:64px;right:64px;top:560px;perspective:1400px"><div style="height:420px;border-radius:44px;border:4px dashed #f5c518;background:linear-gradient(150deg, rgba(245,197,24,.16), rgba(245,197,24,.03));display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotateX(14deg);box-shadow:0 40px 80px rgba(0,0,0,.6)">
        <div style="font-size:22px;font-weight:800;letter-spacing:5px;color:var(--gris)">${k.tuCodigo}</div>
        <div class="mono" style="font-size:150px;letter-spacing:22px;color:#f5c518;filter:blur(2px);margin-top:10px">????</div>
        <span class="pill pill-oro" style="padding:12px 24px;font-size:22px;margin-top:22px">${ico("Lock", 22, 2.6)} ${k.revela}</span></div></div>
      <div style="position:absolute;left:64px;right:64px;top:1060px;font-size:28px;color:#d4d4d8">${ico("Ticket", 26, 2)} ${k.cupones}</div>
      ${pe(t)}`,
    ],
    [
      "A6_cta",
      `${fundoParede(1350, { rz: 24 })}${topo(t, 6, total)}
      <div style="position:absolute;left:64px;top:340px">${titulo(k.fin[0], 150)}${titulo(k.fin[1], 150, "#f5c518")}${titulo(k.fin[2], 150)}</div>
      ${moeda(t, 260, "right:60px;top:300px;transform:rotate(12deg)")}
      <div style="position:absolute;left:64px;bottom:140px;display:grid;gap:18px">
        <span class="pill pill-oro" style="padding:24px 36px;font-size:34px">${ico("ArrowUpRight", 34, 2.6)} ${t.site}/black-friday</span>
        <span class="pill" style="padding:22px 34px;font-size:30px;background:#25D366;color:#063b1b">${ico("MessageCircle", 32, 2.4)} ${t.zap}</span></div>
      ${pe(t, true)}`,
    ],
  ];
}

function stories(t, k) {
  const conta = (n, rot, sub) => `${fundoParede(1920, { opac: 0.5 })}
    <div style="position:absolute;left:64px;top:240px">${marca(t)}</div>
    <div style="position:absolute;left:0;right:0;top:${typeof n === "number" ? 560 : 680}px;text-align:center">
      <div style="font-size:30px;font-weight:800;letter-spacing:8px;color:#e4e4e7">${rot}</div>
      <div class="d" style="font-size:${typeof n === "number" ? 560 : 250}px;margin-top:${typeof n === "number" ? 10 : 70}px;color:#f5c518;text-shadow:${relevo("#c99a06", "#3d2d00", 18)}">${n}</div>
      <div class="d" style="font-size:120px;color:#fff;margin-top:20px;text-shadow:${relevo("#9a9a9a", "#1c1c1c", 10)}">${sub}</div>
      <div style="font-size:32px;font-weight:700;color:#e4e4e7;margin-top:34px">${t.periodo}</div>
    </div>
    <div style="position:absolute;left:0;right:0;bottom:360px;text-align:center"><span class="pill pill-oro" style="padding:26px 44px;font-size:32px">${ico("Bell", 32, 2.4)} ${k.aviso}</span></div>`;
  return [
    [
      "S1_story_ya_empezo",
      `${fundoParede(1920)}
      <div style="position:absolute;left:64px;top:240px">${marca(t)}</div>
      <div style="position:absolute;left:64px;top:860px"><span class="pill pill-oro" style="padding:14px 26px;font-size:26px;letter-spacing:3px">${ico("Zap", 26, 2.6)} ${t.jaComecou}</span>
        <div style="margin-top:40px">${titulo(t.preBlack.replace("-", "-<br>").replace(" ", "<br>"), 260)}</div></div>
      ${moeda(t, 320, "right:60px;top:900px;transform:rotate(-12deg)")}
      <div style="position:absolute;left:0;right:0;top:1480px;text-align:center"><div class="d" style="font-size:70px;color:#f5c518">${t.todo}</div><div style="font-size:30px;font-weight:700;color:#e4e4e7;margin-top:10px">${t.comeca}</div></div>`,
    ],
    ["S2_story_faltan_30", conta(30, k.faltan, k.dias)],
    ["S3_story_faltan_15", conta(15, k.faltan, k.dias)],
    ["S4_story_faltan_7", conta(7, k.faltan, k.dias)],
    ["S5_story_manana", conta(k.manana, k.empieza, "00:00 h")],
    [
      "S6_story_encuesta",
      `${fundoLiso(1920)}
      <div style="position:absolute;left:64px;top:240px">${marca(t)}</div>
      <div style="position:absolute;left:64px;right:64px;top:420px">${titulo(k.pregunta, 140)}</div>
      <div style="position:absolute;left:90px;right:90px;top:1140px;height:300px;border:3px dashed rgba(245,197,24,.45);border-radius:36px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:rgba(255,255,255,.35);letter-spacing:3px">${k.sticker}</div>
      <div style="position:absolute;left:0;right:0;bottom:380px;text-align:center;font-size:30px;color:#d4d4d8">${k.cats}</div>`,
    ],
    [
      "S7_story_cupon_misterioso",
      `${fundoLiso(1920)}
      <div style="position:absolute;left:64px;top:240px">${marca(t)}</div>
      <div style="position:absolute;left:64px;top:420px">${titulo(k.misterio[0], 170)}${titulo(k.misterio[1], 170, "#f5c518")}</div>
      <div style="position:absolute;left:64px;right:64px;top:880px;perspective:1400px"><div style="height:460px;border-radius:44px;border:5px dashed #f5c518;background:linear-gradient(150deg, rgba(245,197,24,.16), rgba(245,197,24,.03));display:flex;flex-direction:column;align-items:center;justify-content:center;transform:rotateX(14deg)">
        <div style="font-size:26px;font-weight:800;letter-spacing:6px;color:var(--gris)">${k.tuCodigo}</div>
        <div class="mono" style="font-size:170px;letter-spacing:24px;color:#f5c518;filter:blur(2px)">????</div>
        <span class="pill pill-oro" style="padding:14px 28px;font-size:26px;margin-top:20px">${ico("Lock", 26, 2.6)} ${k.revela}</span></div></div>
      <div style="position:absolute;left:0;right:0;bottom:360px;text-align:center"><span class="pill pill-oro" style="padding:26px 44px;font-size:30px">${ico("Ticket", 30, 2.4)} ${k.cupones}</span></div>`,
    ],
  ];
}

// Destaques do perfil: moeda/ícone 3D no centro (o Instagram mostra só o círculo central)
const DESTAQUES = [
  ["pre-black", "Percent"],
  ["filtros", "Funnel"],
  ["embrague", "Disc3"],
  ["hidraulica", "Droplets"],
  ["rodamientos", "CircleDot"],
  ["transmision", "Cog"],
  ["envios", "Truck"],
  ["whatsapp", "MessageCircle"],
  ["cupones", "Ticket"],
];
const destaque = (icone) => `
  <div class="luz" style="width:900px;height:900px;left:90px;top:510px;background:rgba(245,197,24,.25)"></div>
  <div class="moeda" style="width:760px;height:760px;left:160px;top:580px;color:#2b1f00">${ico(icone, 380, 1.8)}</div>`;

const r = await abrir();
for (const idioma of ["es", "pt"]) {
  const t = TXT[idioma];
  const k = K[idioma];
  const dir = path.join(PASTA, "saida", idioma, "kit");
  const feitos = [];
  for (const [nome, html] of slides(t, k)) {
    const arq = path.join(dir, `${nome}.png`);
    await r.render(html, arq, ...F);
    feitos.push(arq);
  }
  for (const [nome, html] of stories(t, k)) {
    const arq = path.join(dir, `${nome}.png`);
    await r.render(html, arq, ...S);
    feitos.push(arq);
  }
  await r.mosaico(feitos, path.join(PASTA, "saida", `mosaico_kit_${idioma}.png`), 7);
  console.log(`✔ kit ${idioma}: ${feitos.length}`);
}
for (const [nome, icone] of DESTAQUES)
  await r.render(destaque(icone), path.join(PASTA, "saida", "destaques", `${nome}.png`), ...S);
console.log(`✔ destaques: ${DESTAQUES.length}`);
await r.fechar();
if (r.falhas.length) console.log("⚠ foto não carregou:", r.falhas.join(", "));
