// Descrições para o Instagram (e Facebook) da campanha amarela da pré-Black, em PT e ES:
// capa (lançamento), uma por carrossel (capa + 9 cards, mesma ordem do carrosseis.md),
// uma por card com preço e textos curtos para os stories.
// Uso: node marketing/pre-black-amarelo/legendas.mjs -> descricoes_pt.md e descricoes_es.md
import fs from "fs";
import path from "path";

const PASTA = path.join(process.cwd(), "marketing/pre-black-amarelo");
const D = JSON.parse(fs.readFileSync(path.join(PASTA, "pecas100.json"), "utf8"));
const PECAS = D.pecas;
const pct = `-${D.desconto}%`;
// Mesmas 20 peças com preço do gerar.mjs (abaixo de R$ 1.000 já com o desconto)
const COM_PRECO = ["3409713VV", "265150EA", "81321600EA", "LA3976", "LA5013", "223620", "1686458EA", "81644000", "81133600VV", "820100", "PSH211", "4224811", "RE509672", "PSC504", "836640772", "D5NN11654B", "204521EA", "887896VV", "048438ATF", "041053UNI"];

const L = {
  pt: {
    nome: (p) => p.pt,
    site: "agropartsuy.com/pt",
    preco: (p) => [p.preco.deBrl, p.preco.brl],
    envio: "🚚 Envio para todo o RS",
    zap: "💬 Peça pelo WhatsApp: link na bio",
    busca: "🔎 Procure pelo código no site",
    oferta: "Ofertas válidas enquanto durarem os estoques.",
    para: "para",
    capa: `🖤 COMEÇOU A PRÉ-BLACK FRIDAY DA AGRO PARTS! 🖤\n\n${pct} em TODO o site, já valendo.\nA Black Friday começa em 27 de novembro, mas quem adianta a compra já leva com desconto. 🔥\n\nPeças para Massey Ferguson, Valtra, John Deere, New Holland e muito mais: embreagem, motor, tração e transmissão, hidráulica, filtros e elétrica.`,
    fechamento: `${pct} em todo o site · a Black Friday começa em 27/11.`,
    precoTitulo: "💥 PREÇO DE PRÉ-BLACK",
    data: `Preço de ${D.data} em agropartsuy.com/pt.`,
    tags: "#PreBlackFriday #BlackFriday #AgroParts #PecasAgricolas #PecasParaTrator #Tratores #MasseyFerguson #Valtra #JohnDeere #NewHolland #Agro #AgroRS #RioGrandeDoSul #Safra #Agronegocio",
    stories: [
      ["Capa", "🖤 Começou a PRÉ-BLACK! -20% em todo o site 👆 toque no link"],
      ["Cards sem preço", "-20% nesta peça 👆 veja o preço no link"],
      ["Cards com preço", "Esse preço é de pré-Black 🔥 👆 link"],
      ["Enquete (sticker)", "Qual peça você precisa? 🅰️ Embreagem 🅱️ Filtros"],
      ["Caixa de perguntas", "Manda o código da peça que a gente procura pra você 👇"],
    ],
  },
  es: {
    nome: (p) => p.es,
    site: "agropartsuy.com",
    preco: (p) => [p.preco.deUyu, p.preco.uyu],
    envio: "🚚 Envíos por DAC a todo Uruguay",
    zap: "💬 Cotizá por WhatsApp: link en la bio",
    busca: "🔎 Buscá por el código en el sitio",
    oferta: "Ofertas válidas hasta agotar stock.",
    para: "para",
    capa: `🖤 ¡EMPEZÓ LA PRE BLACK FRIDAY DE AGRO PARTS! 🖤\n\n${pct} en TODO el sitio, desde ya.\nLa Black Friday empieza el 27 de noviembre, pero el que se adelanta ya compra con descuento. 🔥\n\nRepuestos para Massey Ferguson, Valtra, John Deere, New Holland y mucho más: embrague, motor, tracción y transmisión, hidráulica, filtros y eléctrica.`,
    fechamento: `${pct} en todo el sitio · la Black Friday empieza el 27/11.`,
    precoTitulo: "💥 PRECIO DE PRE BLACK",
    data: `Precio del ${D.data} en agropartsuy.com (cambia con la cotización del día).`,
    tags: "#PreBlackFriday #BlackFriday #AgroParts #RepuestosAgricolas #RepuestosParaTractor #Tractores #MasseyFerguson #Valtra #JohnDeere #NewHolland #Agro #AgroUruguay #Uruguay #Zafra #Campo",
    stories: [
      ["Portada", "🖤 ¡Empezó la PRE BLACK! -20% en todo el sitio 👆 tocá el link"],
      ["Cards sin precio", "-20% en esta pieza 👆 mirá el precio en el link"],
      ["Cards con precio", "Este precio es de pre Black 🔥 👆 link"],
      ["Encuesta (sticker)", "¿Qué pieza necesitás? 🅰️ Embrague 🅱️ Filtros"],
      ["Caja de preguntas", "Mandanos el código de la pieza y te la buscamos 👇"],
    ],
  },
};

// Nome curto da categoria: a abertura de cada carrossel cita o que ele realmente tem
const CAT = {
  "Engrenagens e Transmissão": ["transmissão", "transmisión"],
  "Outros Componentes": ["componentes", "componentes"],
  "Estrutura e Suspensão": ["estrutura", "estructura"],
  "Rolamentos e Mancais": ["rolamentos", "rodamientos"],
  Vedações: ["retentores", "retenes"],
  "Elementos de Fixação": ["fixação", "tornillería"],
  "Hidráulica e Pneumática": ["hidráulica", "hidráulica"],
  Filtros: ["filtros", "filtros"],
  "Elétrica e Sensores": ["elétrica", "eléctrica"],
  "Freios e Embreagens": ["embreagem", "embrague"],
};
const ICONES = ["🔥", "⚙️", "🔩", "🛠️", "💧", "🧰", "🚜", "⚡", "🛞", "🔧", "⚙️", "🖤"];
function abertura(idioma, grupo, c) {
  const n = new Map();
  for (const p of grupo) n.set(p.cat, (n.get(p.cat) ?? 0) + 1);
  const top = [...n]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([cat]) => (CAT[cat] ?? [cat, cat])[idioma === "pt" ? 0 : 1]);
  const lista = top.join(idioma === "pt" ? " e " : " y ");
  const ic = ICONES[c % ICONES.length];
  if (grupo.length === 1)
    return idioma === "pt" ? `${ic} Mais uma na pré-Black: confere 👉` : `${ic} Una más en la pre Black: mirá 👉`;
  return idioma === "pt"
    ? `${ic} Pré-Black AGRO PARTS: ${lista} com ${pct}. Arraste e veja 👉`
    : `${ic} Pre Black AGRO PARTS: ${lista} con ${pct}. Deslizá y mirá 👉`;
}

const linhaPeca = (t, p) =>
  `🔧 ${t.nome(p)}${p.marca ? ` ${t.para} ${p.marca}` : ""} · Cód. ${p.cod}`;

for (const idioma of ["pt", "es"]) {
  const t = L[idioma];
  const bloco = (txt) => "```\n" + txt + "\n```\n";
  const md = [
    `# Descrições do Instagram — ${idioma === "pt" ? "português (RS)" : "espanhol (Uruguai)"}\n`,
    "Copie o texto de cada bloco. As **hashtags** vão no fim da descrição ou no primeiro comentário (fica mais limpo).\n",
    `## Hashtags\n`,
    bloco(t.tags),
    `## 1. Capa — post de lançamento\n\nArte: \`saida/${idioma}/capa_feed_1080x1350.png\`\n`,
    bloco(`${t.capa}\n\n${t.busca} · ${t.site}\n${t.zap}\n${t.envio}\n\n${t.oferta}`),
    `## 2. Carrosséis (capa + 9 cards, ordem do carrosseis.md)\n`,
  ];
  for (let c = 0; c * 9 < PECAS.length; c++) {
    const grupo = PECAS.slice(c * 9, c * 9 + 9);
    md.push(`### Carrossel ${c + 1}\n`);
    md.push(
      bloco(
        `${abertura(idioma, grupo, c)}\n\n${grupo.map((p) => linhaPeca(t, p)).join("\n")}\n\n${t.fechamento}\n${t.busca} · ${t.site}\n${t.zap}\n${t.envio}\n\n${t.oferta}`,
      ),
    );
  }
  md.push(`## 3. Posts com preço (20 peças abaixo de R$ 1.000)\n`);
  COM_PRECO.forEach((cod, k) => {
    const p = PECAS.find((x) => x.cod === cod);
    const [de, por] = t.preco(p);
    md.push(`### ${String(k + 1).padStart(2, "0")}. ${t.nome(p)}\n`);
    md.push(
      bloco(
        `${t.precoTitulo}\n\n${linhaPeca(t, p)}${p.extra ? ` · ${p.extra}` : ""}\n${de ? `De ${de} ` : ""}por ${por} (${pct})\n\n${t.data}\n${t.zap}\n${t.envio}\n\n${t.oferta}`,
      ),
    );
  });
  md.push(`## 4. Stories — texto curto para escrever por cima\n`);
  for (const [onde, txt] of t.stories) md.push(`- **${onde}:** ${txt}`);
  md.push(
    `\nNo story, use o **adesivo de link** (${t.site}) na faixa amarela vazia acima das fitas.\n`,
  );
  fs.writeFileSync(path.join(PASTA, `descricoes_${idioma}.md`), md.join("\n"));
}
// O resumo antigo (legendas.md) foi substituído pelos arquivos completos
fs.rmSync(path.join(PASTA, "legendas.md"), { force: true });
console.log("✔ descricoes_pt.md e descricoes_es.md");
