// Legendas prontas das 100 artes (uma por peça, espanhol e português), com o link da peça.
// Uso: node marketing/produtos-50/legendas.cjs  -> marketing/produtos-50/legendas_es.md e legendas_pt.md
const fs = require("fs");
const sel = require("./selecao.json");
const slug = (s) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
const tagMarca = (m) => (m ? `#${m.replace(/\s+/g, "")}` : "");
const L = {
  es: (p) =>
    `🖤 PRE BLACK FRIDAY · ${p.es}${p.marca ? ` para ${p.marca}` : ""}\n\nCódigo: ${p.cod}${p.extra ? ` · ${p.extra}` : ""}\n👉 Mirá el precio de pre Black: agropartsuy.com/produto/${encodeURIComponent(p.sku)}\n\n🚚 Envíos por DAC a todo Uruguay\n💬 Cotizá por WhatsApp (link en la bio)\n\n#PreBlackFriday #RepuestosAgricolas ${tagMarca(p.marca)} #Tractores #AgroUruguay`,
  pt: (p) =>
    `🖤 PRÉ-BLACK FRIDAY · ${p.pt}${p.marca ? ` para ${p.marca}` : ""}\n\nCódigo: ${p.cod}${p.extra ? ` · ${p.extra}` : ""}\n👉 Veja o preço de pré-Black: agropartsuy.com/pt/produto/${encodeURIComponent(p.sku)}\n\n🚚 Envio para todo o RS\n💬 Peça pelo WhatsApp (link na bio)\n\n#PreBlackFriday #PecasAgricolas ${tagMarca(p.marca)} #Tratores #AgroRS`,
};
for (const idioma of ["es", "pt"]) {
  const md = [`# Legendas — ${idioma === "es" ? "espanhol (Uruguai)" : "português (RS)"}\n`];
  sel.forEach((p, i) => {
    const arq = `${String(i + 1).padStart(2, "0")}_${slug(idioma === "es" ? p.es : p.pt)}_${p.cod.toLowerCase()}.png`;
    md.push(`## ${i + 1}. ${idioma === "es" ? p.es : p.pt}\n\nArte: \`saida/${idioma}/${arq}\`\n\n\`\`\`\n${L[idioma](p)}\n\`\`\`\n`);
  });
  fs.writeFileSync(`${__dirname}/legendas_${idioma}.md`, md.join("\n"));
}
console.log("legendas_es.md e legendas_pt.md");
