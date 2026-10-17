// Capas da pré-Black (espanhol e português) + capas dos destaques do perfil.
// Uso (raiz do projeto):  node marketing/produtos-50/capas.mjs   (depois de gerar.mjs)
// Saída: saida/capas/{es,pt}/*.png, saida/capas/destaques/*.png e carrosseis.md
//  - 00_capa_geral: abre a série das 50 peças
//  - capa por categoria: primeira imagem do carrossel daquela categoria (as peças vêm depois)
//  - destaques: 1080×1920, ícone no círculo central (o Instagram corta em círculo)
import fs from "fs";
import path from "path";
import { DESCONTO, LOGO, PASTA, PECAS, TXT, abrir, cab, ico, pct, selo, slug } from "./comum.mjs";
import { arquivoPeca } from "./nomes.mjs";

const OUT = path.join(PASTA, "saida/capas");
fs.rmSync(OUT, { recursive: true, force: true });

// Peças por categoria, na ordem da seleção
const grupos = new Map();
PECAS.forEach((p, i) => {
  if (!grupos.has(p.cat)) grupos.set(p.cat, []);
  grupos.get(p.cat).push(i);
});
const ICONE_CAT = {
  "Engrenagens e Transmissão": "Cog",
  "Outros Componentes": "Wrench",
  "Estrutura e Suspensão": "Tractor",
  "Rolamentos e Mancais": "CircleDot",
  Vedações: "CircleDashed",
  "Elementos de Fixação": "Bolt",
  "Hidráulica e Pneumática": "Droplets",
  Filtros: "Funnel",
  "Elétrica e Sensores": "Zap",
  "Freios e Embreagens": "Disc3",
};

const ladrilho = (p, h) =>
  `<div style="background:#fff;border-radius:28px;height:${h}px;overflow:hidden;box-shadow:0 20px 50px rgba(0,0,0,.35)"><img class="foto" src="${p.img}" style="padding:22px"></div>`;
const rodape = (t, n) =>
  `<div style="position:absolute;left:64px;right:64px;bottom:60px;display:flex;justify-content:space-between;align-items:center;font-size:20px;font-weight:800;letter-spacing:3px;color:var(--gris)"><span>AGROPARTSUY.COM${t === TXT.pt ? "/PT" : ""}</span><span>${n}</span><span style="color:var(--oro)">${t.desliza} →</span></div>`;
const desconto = (t, tam = 230) =>
  DESCONTO
    ? `<div style="display:flex;align-items:flex-end;gap:22px"><div class="t" style="font-size:${tam}px;color:var(--oro);line-height:.8;letter-spacing:-4px">${pct}</div><div class="t" style="font-size:${tam * 0.24}px;padding-bottom:10px">${t.todo.replace(" EL ", "<br>EL ").replace(" O ", "<br>O ")}</div></div>`
    : "";

// Capa geral: 6 fotos em grade
const geral = (t) => {
  const amostra = [1, 13, 25, 32, 45, 41].map((i) => PECAS[i]);
  return `<div class="l">${cab(t)}
  <div style="position:absolute;left:64px;top:170px"><div class="chip" style="position:static;display:inline-block;background:#fff">${t.ja}</div></div>
  <div class="t" style="position:absolute;left:64px;right:64px;top:240px;font-size:150px">${t === TXT.pt ? "Pré-Black" : "Pre Black"}<br><span style="color:transparent;-webkit-text-stroke:3px var(--oro)">Friday</span></div>
  <div style="position:absolute;left:64px;top:560px">${desconto(t, 190)}</div>
  <div style="position:absolute;left:64px;right:64px;top:790px;display:grid;grid-template-columns:repeat(3,1fr);gap:18px">${amostra.map((p) => ladrilho(p, 200)).join("")}</div>
  <div style="position:absolute;left:64px;top:1240px;display:flex;align-items:center;gap:10px;font-size:24px;font-weight:900;letter-spacing:3px;color:var(--oro)">${ico("CalendarDays", 26, 2.4)} ${t.comeca}</div>
  ${rodape(t, `${PECAS.length} ${t.pecas.toUpperCase()}`).replace("bottom:60px", "bottom:40px")}
</div>`;
};

// Capa de categoria: até 4 fotos 2×2 e o selo do desconto
const categoria = (t, cat, idx) => {
  const ps = idx.map((i) => PECAS[i]);
  const nome = t === TXT.es ? ps[0].cat_es : ps[0].cat_pt;
  const fotos = ps.slice(0, 4);
  return `<div class="l">${cab(t)}
  <div style="position:absolute;left:64px;top:175px;display:flex;align-items:center;gap:20px">
    <div style="width:96px;height:96px;border-radius:28px;background:var(--oro);color:#000;display:flex;align-items:center;justify-content:center">${ico(ICONE_CAT[cat] ?? "Wrench", 54, 2)}</div>
    <div class="meta" style="color:var(--oro)">${t.ja}</div>
  </div>
  <div class="t" style="position:absolute;left:64px;right:64px;top:290px;font-size:${nome.length > 20 ? 104 : 118}px">${nome}</div>
  <div style="position:absolute;left:64px;right:64px;top:580px;display:grid;grid-template-columns:1fr 1fr;gap:20px">${fotos.map((p) => ladrilho(p, fotos.length > 2 ? 270 : 420)).join("")}</div>
  ${selo(t, `right:40px;top:500px`)}
  <div style="position:absolute;left:64px;bottom:120px;display:flex;align-items:center;gap:10px;font-size:22px;font-weight:900;letter-spacing:3px;color:var(--oro)">${ico("CalendarDays", 24, 2.4)} ${t.comeca}</div>
  ${rodape(t, `${ps.length} ${t.pecas.toUpperCase()}`)}
</div>`;
};

// Destaque do perfil: ícone grande no círculo central (zona segura ~ 900 px de diâmetro)
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
const destaque = (icone) => `<div style="position:relative;width:1080px;height:1920px;background:radial-gradient(60% 35% at 50% 50%, #2a2306, #060606 70%)">
  <div style="position:absolute;left:140px;top:500px;width:800px;height:800px;border-radius:50%;border:14px solid var(--oro);display:flex;align-items:center;justify-content:center;color:var(--oro)">${ico(icone, 380, 1.6)}</div>
</div>`;

const r = await abrir();
const feitos = { es: [], pt: [] };
for (const idioma of ["es", "pt"]) {
  const t = TXT[idioma];
  const dir = path.join(OUT, idioma);
  fs.mkdirSync(dir, { recursive: true });
  const g = path.join(dir, "00_capa_geral.png");
  await r.render(geral(t), g);
  feitos[idioma].push(g);
  let n = 1;
  for (const [cat, idx] of grupos) {
    const ps = idx.map((i) => PECAS[i]);
    const arq = path.join(dir, `${String(n++).padStart(2, "0")}_capa_${slug(idioma === "es" ? ps[0].cat_es : ps[0].cat_pt)}.png`);
    await r.render(categoria(t, cat, idx), arq);
    feitos[idioma].push(arq);
  }
  await r.mosaico(feitos[idioma], path.join(OUT, `mosaico_capas_${idioma}.png`), 5);
  console.log(`✔ capas ${idioma}: ${feitos[idioma].length}`);
}
const dd = path.join(OUT, "destaques");
fs.mkdirSync(dd, { recursive: true });
for (const [nome, icone] of DESTAQUES) await r.render(destaque(icone), path.join(dd, `${nome}.png`), 1080, 1920);
console.log(`✔ destaques: ${DESTAQUES.length}`);
await r.fechar();

// Roteiro dos carrosséis: capa da categoria + as peças dela, nos dois idiomas
const md = [
  "# Carrosséis por categoria\n",
  "Cada carrossel = a capa da categoria + as artes das peças, nesta ordem. Comece pela capa geral (post solo ou primeira imagem de um carrossel misto).\n",
];
let n = 1;
for (const [, idx] of grupos) {
  const ps = idx.map((i) => PECAS[i]);
  md.push(`## ${ps[0].cat_es} / ${ps[0].cat_pt}\n`);
  for (const idioma of ["es", "pt"]) {
    const capa = `saida/capas/${idioma}/${String(n).padStart(2, "0")}_capa_${slug(idioma === "es" ? ps[0].cat_es : ps[0].cat_pt)}.png`;
    md.push(`**${idioma.toUpperCase()}:** \`${capa}\` → ${idx.map((i) => `\`${arquivoPeca(i, PECAS[i], idioma)}\``).join(", ")}\n`);
  }
  n++;
}
md.push(
  "\n## Destaques do perfil\n\n`saida/capas/destaques/`: pre-black, filtros, embrague, hidraulica, rodamientos, transmision, envios, whatsapp, cupones (só ícone: servem para os dois idiomas; o nome do destaque é escrito no Instagram).\n",
);
fs.writeFileSync(path.join(PASTA, "carrosseis.md"), md.join("\n"));
console.log("✔ carrosseis.md");
