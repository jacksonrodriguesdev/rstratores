// Legendas (Instagram e Facebook) da campanha amarela da pré-Black, em espanhol e português.
// Uso (depois do gerar.mjs): node marketing/pre-black-amarelo/legendas.mjs -> legendas.md
import fs from "fs";
import path from "path";

const PASTA = path.join(process.cwd(), "marketing/pre-black-amarelo");
const D = JSON.parse(fs.readFileSync(path.join(PASTA, "pecas100.json"), "utf8"));
const pct = `-${D.desconto}%`;
const lista = (idioma, pasta) => fs.readdirSync(path.join(PASTA, "saida", idioma, pasta)).sort();

const md = [
  `# Legendas — Pré-Black Friday (${pct} em todo o site · preços de ${D.data})\n`,
  "Formato 4:5 (1080×1350): serve para o feed do Instagram e do Facebook. Capa quadrada (1:1) e de story (9:16) em `saida/{es,pt}/`.\n",
  "## Carrosséis SEM preço (capa + 9 cards; ordem em `carrosseis.md`)\n",
  "**ES**\n```",
  `🖤 PRE BLACK FRIDAY en AGRO PARTS\n\n${pct} en todo el sitio · la Black Friday empieza el 27/11.\nDeslizá y mirá los repuestos para tu tractor 👉\n\n🔎 Buscá por el código en agropartsuy.com\n💬 Cotizá por WhatsApp (link en la bio)\n🚚 Envíos por DAC a todo Uruguay\n¡Ofertas válidas hasta agotar stock!\n\n#PreBlackFriday #BlackFriday #RepuestosAgricolas #Tractores #MasseyFerguson #Valtra #JohnDeere #NewHolland #AgroUruguay`,
  "```\n\n**PT**\n```",
  `🖤 PRÉ-BLACK FRIDAY na AGRO PARTS\n\n${pct} em todo o site · a Black Friday começa em 27/11.\nArraste e veja as peças para o seu trator 👉\n\n🔎 Procure pelo código em agropartsuy.com/pt\n💬 Peça pelo WhatsApp (link na bio)\n🚚 Envio para todo o RS\nOfertas válidas enquanto durarem os estoques!\n\n#PreBlackFriday #BlackFriday #PecasAgricolas #Tratores #MasseyFerguson #Valtra #JohnDeere #NewHolland #AgroRS`,
  "```\n",
  "## Cards COM preço (20 peças abaixo de R$ 1.000)\n",
  `Carrosséis sugeridos: capa + cards 01–07, capa + 08–14, capa + 15–20. Preços de ${D.data}: em $U mudam com a cotação do dia, então publique logo ou gere de novo (montar.ts + gerar.mjs).\n`,
  "**ES**\n```",
  `💥 PRECIOS DE PRE BLACK en AGRO PARTS\n\nRepuestos con ${pct} y precio final 👉 deslizá.\nPrecios del ${D.data} en agropartsuy.com (cambio del día).\n\n💬 Cotizá por WhatsApp (link en la bio) · 🚚 Envíos por DAC a todo Uruguay\n¡Ofertas válidas hasta agotar stock!\n\n#PreBlackFriday #RepuestosAgricolas #Tractores #AgroUruguay`,
  "```\n\n**PT**\n```",
  `💥 PREÇOS DE PRÉ-BLACK na AGRO PARTS\n\nPeças com ${pct} e preço final 👉 arraste.\nPreços de ${D.data} em agropartsuy.com/pt.\n\n💬 Peça pelo WhatsApp (link na bio) · 🚚 Envio para todo o RS\nOfertas válidas enquanto durarem os estoques!\n\n#PreBlackFriday #PecasAgricolas #Tratores #AgroRS`,
  "```\n",
];
for (const idioma of ["es", "pt"]) {
  const arqs = lista(idioma, "com-preco");
  md.push(`**${idioma.toUpperCase()} — cards com preço:** ${arqs.map((a) => `\`${a}\``).join(", ")}\n`);
}
fs.writeFileSync(path.join(PASTA, "legendas.md"), md.join("\n"));
console.log("✔ legendas.md");
