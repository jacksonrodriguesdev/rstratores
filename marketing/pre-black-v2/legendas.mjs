// Legendas (uma por card, espanhol e português) e roteiro dos carrosséis por categoria.
// Uso: node marketing/pre-black-v2/legendas.mjs  -> legendas_es.md, legendas_pt.md, carrosseis.md
import fs from "fs";
import path from "path";
import { PASTA, PECAS, TXT, pct, slug } from "./comum.mjs";
import { arquivoCard } from "./nomes.mjs";

const tag = (m) => (m ? `#${m.replace(/\s+/g, "")}` : "");
const LEG = {
  es: (p) =>
    `🖤 PRE BLACK FRIDAY · ${p.es}${p.marca ? ` para ${p.marca}` : ""}\n\nCódigo: ${p.cod}${p.extra ? ` · ${p.extra}` : ""}\n🔥 ${pct} de pre Black en todo el sitio (la Black Friday empieza el 27/11)\n👉 Mirá el precio: agropartsuy.com/produto/${encodeURIComponent(p.sku)}\n\n🚚 Envíos por DAC a todo Uruguay\n💬 Cotizá por WhatsApp (link en la bio)\n\n#PreBlackFriday #RepuestosAgricolas ${tag(p.marca)} #Tractores #AgroUruguay`,
  pt: (p) =>
    `🖤 PRÉ-BLACK FRIDAY · ${p.pt}${p.marca ? ` para ${p.marca}` : ""}\n\nCódigo: ${p.cod}${p.extra ? ` · ${p.extra}` : ""}\n🔥 ${pct} de pré-Black em todo o site (a Black Friday começa em 27/11)\n👉 Veja o preço: agropartsuy.com/pt/produto/${encodeURIComponent(p.sku)}\n\n🚚 Envio para todo o RS\n💬 Peça pelo WhatsApp (link na bio)\n\n#PreBlackFriday #PecasAgricolas ${tag(p.marca)} #Tratores #AgroRS`,
};
const CAPA = {
  es: `🖤 YA EMPEZÓ LA PRE BLACK FRIDAY de AGRO PARTS\n\n${pct} en todo el sitio desde hoy. La Black Friday es del 27 al 30 de noviembre.\n\nDeslizá y mirá los repuestos 👉\n🚚 Envíos por DAC a todo Uruguay · 💬 Cotizá por WhatsApp (link en la bio)\n\n#PreBlackFriday #BlackFriday #RepuestosAgricolas #Tractores #AgroUruguay`,
  pt: `🖤 JÁ COMEÇOU A PRÉ-BLACK FRIDAY da AGRO PARTS\n\n${pct} em todo o site a partir de hoje. A Black Friday vai de 27 a 30 de novembro.\n\nArraste e veja as peças 👉\n🚚 Envio para todo o RS · 💬 Peça pelo WhatsApp (link na bio)\n\n#PreBlackFriday #BlackFriday #PecasAgricolas #Tratores #AgroRS`,
};

for (const idioma of ["es", "pt"]) {
  const md = [
    `# Legendas — ${idioma === "es" ? "espanhol (Uruguai)" : "português (RS)"}\n`,
    `## Capa geral / carrossel\n\nArte: \`saida/${idioma}/capas/00_capa_geral.png\`\n\n\`\`\`\n${CAPA[idioma]}\n\`\`\`\n`,
  ];
  PECAS.forEach((p, i) => {
    md.push(
      `## ${i + 1}. ${TXT[idioma].nome(p)}\n\nArte: \`saida/${idioma}/cards/${arquivoCard(i, p, idioma)}\`\n\n\`\`\`\n${LEG[idioma](p)}\n\`\`\`\n`,
    );
  });
  fs.writeFileSync(path.join(PASTA, `legendas_${idioma}.md`), md.join("\n"));
}

// Carrosséis: capa da categoria + os cards dela (até 20 imagens por carrossel no Instagram)
const grupos = new Map();
PECAS.forEach((p, i) => {
  if (!grupos.has(p.cat)) grupos.set(p.cat, []);
  grupos.get(p.cat).push(i);
});
const md = [
  "# Carrosséis por categoria\n",
  "Cada carrossel = capa da categoria + os cards das peças dela, nesta ordem. A capa geral abre a série (ou vai como post solo com a legenda «Capa geral»).\n",
];
let n = 1;
for (const [, idx] of grupos) {
  const p0 = PECAS[idx[0]];
  md.push(`## ${p0.cat_es} / ${p0.cat_pt}\n`);
  for (const idioma of ["es", "pt"]) {
    const capa = `saida/${idioma}/capas/${String(n).padStart(2, "0")}_capa_${slug(TXT[idioma].cat(p0))}.png`;
    if (!fs.existsSync(path.join(PASTA, capa))) throw new Error(`capa não encontrada: ${capa}`);
    const cards = idx.map((i) => `saida/${idioma}/cards/${arquivoCard(i, PECAS[i], idioma)}`);
    for (const c of cards) if (!fs.existsSync(path.join(PASTA, c))) throw new Error(`card não encontrado: ${c}`);
    md.push(`**${idioma.toUpperCase()}:** \`${capa}\` → ${cards.map((c) => `\`${path.basename(c)}\``).join(", ")}\n`);
  }
  n++;
}
fs.writeFileSync(path.join(PASTA, "carrosseis.md"), md.join("\n"));
console.log("✔ legendas_es.md, legendas_pt.md, carrosseis.md");
