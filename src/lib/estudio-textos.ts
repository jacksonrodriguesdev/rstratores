// Textos do Estúdio (navegador e servidor): legendas em vários tons, hashtags por marca e
// categoria, dicas de manutenção, roteiros de Reels, respostas rápidas, bios, verificação de
// legenda e links. Sem promessas sem prova ("o melhor preço", "a maior loja") e sem "todo o
// Brasil": em português o alcance é "todo o RS"; anúncios pagos só no Uruguai.

export type Idioma = "es" | "pt";
export type Tom = "direto" | "tecnico" | "urgencia" | "amigavel" | "pergunta" | "zafra";
export const TONS: Array<[Tom, string]> = [
  ["direto", "Direto (preço e código)"],
  ["tecnico", "Técnico"],
  ["urgencia", "Pré-Black / urgência"],
  ["amigavel", "Próximo do produtor"],
  ["pergunta", "Pergunta (engaja)"],
  ["zafra", "Safra / não parar"],
];
export type PecaTexto = {
  nome: string; // espanhol
  nomePt: string;
  codigo: string;
  sku: string;
  marca: string | null;
  categoria?: string | null;
  preco: { uyu: string; brl: string | null; desconto: number } | null;
};

export const WHATSAPP = "5553991831101";
export const SITE = "https://agropartsuy.com";
export const linkPeca = (sku: string, idioma: Idioma) =>
  `${SITE}${idioma === "pt" ? "/pt" : ""}/produto/${encodeURIComponent(sku)}`;
export const linkWhatsApp = (texto: string) =>
  `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(texto)}`;
export function linkUtm(
  url: string,
  o: { fonte: string; meio: string; campanha: string; conteudo?: string },
) {
  const u = new URL(url.startsWith("http") ? url : SITE + (url.startsWith("/") ? url : "/" + url));
  u.searchParams.set("utm_source", o.fonte);
  u.searchParams.set("utm_medium", o.meio);
  u.searchParams.set("utm_campaign", o.campanha);
  if (o.conteudo) u.searchParams.set("utm_content", o.conteudo);
  return u.toString();
}

// Número estável a partir de um texto (para variar modelo/legenda sem sorteio)
export const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const tag = (s: string) =>
  "#" +
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1).toLowerCase())
    .join("");

// ---------------------------------------------------------------- hashtags
const BASE_TAGS: Record<Idioma, string[]> = {
  es: [
    "#AgroParts",
    "#RepuestosAgricolas",
    "#RepuestosParaTractor",
    "#Tractores",
    "#AgroUruguay",
    "#CampoUruguayo",
    "#Maquinaria",
  ],
  pt: [
    "#AgroParts",
    "#PecasAgricolas",
    "#PecasParaTrator",
    "#Tratores",
    "#AgroRS",
    "#AgroGaucho",
    "#MaquinasAgricolas",
  ],
};
const CAT_TAGS: Record<string, { es: string[]; pt: string[] }> = {
  Filtros: {
    es: ["#Filtros", "#FiltroDeAceite", "#Mantenimiento"],
    pt: ["#Filtros", "#FiltroDeOleo", "#Manutencao"],
  },
  "Rolamentos e Mancais": { es: ["#Rodamientos", "#Rulemanes"], pt: ["#Rolamentos", "#Mancais"] },
  "Engrenagens e Transmissão": {
    es: ["#Transmision", "#Engranajes"],
    pt: ["#Transmissao", "#Engrenagens"],
  },
  "Hidráulica e Pneumática": {
    es: ["#Hidraulica", "#BombaHidraulica"],
    pt: ["#Hidraulica", "#BombaHidraulica"],
  },
  "Freios e Embreagens": { es: ["#Embrague", "#Frenos"], pt: ["#Embreagem", "#Freios"] },
  "Elétrica e Sensores": { es: ["#Electrica", "#Sensores"], pt: ["#Eletrica", "#Sensores"] },
  Vedações: { es: ["#Retenes", "#Juntas"], pt: ["#Retentores", "#Juntas"] },
  "Estrutura e Suspensão": { es: ["#Suspension", "#Estructura"], pt: ["#Suspensao", "#Estrutura"] },
  "Elementos de Fixação": { es: ["#Bulones", "#Fijaciones"], pt: ["#Parafusos", "#Fixacao"] },
  Motor: { es: ["#Motor", "#RepuestosMotor"], pt: ["#Motor", "#PecasDeMotor"] },
};
export function hashtags(
  p: { marca?: string | null; categoria?: string | null },
  idioma: Idioma,
  campanha = true,
) {
  const out = [...BASE_TAGS[idioma]];
  if (p.marca)
    out.unshift(tag(p.marca), tag(`${p.marca} ${idioma === "pt" ? "Trator" : "Tractor"}`));
  const c = p.categoria && CAT_TAGS[p.categoria];
  if (c) out.push(...c[idioma]);
  if (campanha) out.unshift("#PreBlackFriday");
  return [...new Set(out)].slice(0, 15);
}

// ---------------------------------------------------------------- legendas
export function legenda(
  p: PecaTexto,
  idioma: Idioma,
  tom: Tom,
  o: { tags?: boolean; preco?: boolean } = {},
) {
  const pt = idioma === "pt";
  const nome = pt ? p.nomePt || p.nome : p.nome;
  const para = p.marca ? (pt ? ` para ${p.marca}` : ` para ${p.marca}`) : "";
  const desc = p.preco?.desconto
    ? pt
      ? ` com -${p.preco.desconto}%`
      : ` con -${p.preco.desconto}%`
    : "";
  const valor = o.preco === false ? null : pt ? p.preco?.brl : p.preco?.uyu;
  const link = linkPeca(p.sku, idioma).replace("https://", "");
  const envio = pt ? "🚚 Envio para todo o RS" : "🚚 Envíos por DAC a todo Uruguay";
  const zap = pt ? "💬 Peça pelo WhatsApp" : "💬 Cotizá por WhatsApp";
  let t = "";
  if (tom === "direto")
    t = `🔧 ${nome}${para}${desc}\n\n${pt ? "Código" : "Código"}: ${p.codigo}${valor ? `\n💰 ${valor}` : ""}\n👉 ${link}\n\n${envio} · ${zap}`;
  else if (tom === "tecnico")
    t = pt
      ? `${nome}\n\n▪️ Código: ${p.codigo}${p.marca ? `\n▪️ Aplicação: ${p.marca}` : ""}${p.categoria ? `\n▪️ Linha: ${p.categoria}` : ""}\n\nConfira o código no manual ou na peça antiga antes de pedir. Dúvidas? Mande a foto ou o número de série no WhatsApp.\n\n👉 ${link}`
      : `${nome}\n\n▪️ Código: ${p.codigo}${p.marca ? `\n▪️ Aplicación: ${p.marca}` : ""}\n\nVerificá el código en el manual o en la pieza vieja antes de pedir. ¿Dudas? Mandá la foto o el número de serie por WhatsApp.\n\n👉 ${link}`;
  else if (tom === "urgencia")
    t = pt
      ? `⚡ PRÉ BLACK FRIDAY ⚡\n\n${nome}${para}${desc}${valor ? `\n💰 ${valor}` : ""}\nCód. ${p.codigo}\n\nOfertas válidas enquanto durarem os estoques. A Black Friday começa dia 27/11!\n\n👉 ${link}`
      : `⚡ PRE BLACK FRIDAY ⚡\n\n${nome}${para}${desc}${valor ? `\n💰 ${valor}` : ""}\nCód. ${p.codigo}\n\nOfertas válidas hasta agotar stock. ¡La Black Friday arranca el 27/11!\n\n👉 ${link}`;
  else if (tom === "amigavel")
    t = pt
      ? `Bom dia, produtor! 🌾\n\nSe o seu ${p.marca ?? "trator"} está precisando de ${nome.toLowerCase()}, a gente tem${desc}. É só pedir pelo código ${p.codigo}.\n\n${envio}\n${zap}`
      : `¡Buen día, productor! 🌾\n\nSi tu ${p.marca ?? "tractor"} necesita ${nome.toLowerCase()}, la tenemos${desc}. Pedila con el código ${p.codigo}.\n\n${envio}\n${zap}`;
  else if (tom === "pergunta")
    t = pt
      ? `Quem aí já precisou trocar ${nome.toLowerCase()}${para}? 🤔\n\nConta pra gente nos comentários quantas horas o seu trator tem!\n\nTemos a peça${desc} · Cód. ${p.codigo}\n👉 ${link}`
      : `¿A quién le tocó cambiar ${nome.toLowerCase()}${para}? 🤔\n\n¡Contanos en los comentarios cuántas horas tiene tu tractor!\n\nTenemos la pieza${desc} · Cód. ${p.codigo}\n👉 ${link}`;
  else
    t = pt
      ? `Trator parado na safra é prejuízo 🚜\n\nTenha ${nome.toLowerCase()}${para} à mão${desc}.\nCód. ${p.codigo}${valor ? ` · ${valor}` : ""}\n\n${zap}, respondemos rápido.`
      : `Que no se te pare el tractor en plena zafra 🚜\n\nTené ${nome.toLowerCase()}${para} a mano${desc}.\nCód. ${p.codigo}${valor ? ` · ${valor}` : ""}\n\n${zap}, respondemos rápido.`;
  if (o.tags) t += "\n\n" + hashtags(p, idioma).join(" ");
  return t;
}
// Tom escolhido pela peça (varia sozinho no banco de posts)
export const tomDaPeca = (sku: string): Tom => TONS[hash(sku) % TONS.length][0];

// ---------------------------------------------------------------- verificação
const PROIBIDAS: Array<[RegExp, string]> = [
  [
    /todo o brasil|todo brasil|para o brasil inteiro/i,
    "Diga «todo o RS» (não enviamos para todo o Brasil)",
  ],
  [
    /o melhor preço|el mejor precio|menor preço do|más barato del/i,
    "Promessa de «melhor/menor preço» sem prova",
  ],
  [/a maior loja|la tienda más grande|líder/i, "«Maior loja/líder» sem prova"],
  [/garantia vitalícia|garantía de por vida/i, "Garantia que não oferecemos"],
  [/frete grátis|envío gratis/i, "Confira se o frete grátis vale de verdade antes de publicar"],
];
export function verificarLegenda(t: string) {
  const tags = t.match(/#[\p{L}\p{N}_]+/gu) ?? [];
  const mencoes = t.match(/@[\w.]+/g) ?? [];
  const avisos: Array<{ ok: boolean; texto: string }> = [
    { ok: t.length <= 2200, texto: `${t.length}/2200 caracteres` },
    { ok: tags.length <= 30, texto: `${tags.length}/30 hashtags` },
    { ok: mencoes.length <= 20, texto: `${mencoes.length}/20 menções` },
    { ok: t.split("\n")[0].length <= 125, texto: "Primeira linha curta (aparece antes do «mais»)" },
    { ok: /whatsapp|link|agropartsuy/i.test(t), texto: "Tem chamada (WhatsApp, link ou site)" },
    {
      ok: new Set(tags.map((x) => x.toLowerCase())).size === tags.length,
      texto: "Sem hashtag repetida",
    },
  ];
  for (const [re, msg] of PROIBIDAS) if (re.test(t)) avisos.push({ ok: false, texto: msg });
  return avisos;
}

// ---------------------------------------------------------------- dicas
export const DICAS: Array<{ es: [string, string]; pt: [string, string] }> = [
  {
    es: [
      "Filtro de aceite",
      "Cambialo junto con el aceite, en el intervalo que indica el manual del tractor.",
    ],
    pt: ["Filtro de óleo", "Troque junto com o óleo, no intervalo indicado no manual do trator."],
  },
  {
    es: [
      "Filtro de aire",
      "En días de mucho polvo revisalo más seguido: un filtro tapado le quita fuerza al motor.",
    ],
    pt: [
      "Filtro de ar",
      "Em dias de muita poeira, confira com mais frequência: filtro entupido tira força do motor.",
    ],
  },
  {
    es: [
      "Filtro de combustible",
      "Purgá el agua del decantador y cambiá el filtro según el manual.",
    ],
    pt: [
      "Filtro de combustível",
      "Drene a água do decantador e troque o filtro conforme o manual.",
    ],
  },
  {
    es: ["Engrase", "Engrasá los alemites antes de la jornada: es barato y evita desgaste."],
    pt: ["Lubrificação", "Engraxe as graxeiras antes do serviço: é barato e evita desgaste."],
  },
  {
    es: ["Correas", "Revisá tensión y rajaduras. Una correa floja recalienta el motor."],
    pt: ["Correias", "Confira tensão e rachaduras. Correia frouxa esquenta o motor."],
  },
  {
    es: ["Radiador", "Limpiá el panal de pajas y polvo. El recalentamiento empieza por ahí."],
    pt: ["Radiador", "Limpe a colmeia de palha e poeira. O superaquecimento começa por aí."],
  },
  {
    es: ["Embrague", "Si patina o hace ruido, no esperes: puede dañar el volante y el plato."],
    pt: ["Embreagem", "Se patina ou faz barulho, não espere: pode danificar o volante e o platô."],
  },
  {
    es: ["Hidráulico", "Controlá nivel y color del aceite. Aceite lechoso puede indicar agua."],
    pt: ["Hidráulico", "Confira nível e cor do óleo. Óleo leitoso pode indicar água."],
  },
  {
    es: ["Neumáticos", "Presión correcta = menos patinaje y menos consumo."],
    pt: ["Pneus", "Calibragem certa = menos patinagem e menos consumo."],
  },
  {
    es: ["Batería", "Bornes limpios y ajustados. Sulfato blanco = mal contacto."],
    pt: ["Bateria", "Bornes limpos e apertados. Zinabre branco = mau contato."],
  },
  {
    es: [
      "Rodamientos",
      "Ruido o calor en una rueda o eje: revisá el rodamiento antes de que se trabe.",
    ],
    pt: ["Rolamentos", "Barulho ou calor numa roda ou eixo: confira o rolamento antes que trave."],
  },
  {
    es: ["Retenes", "Una pérdida de aceite chica hoy es un problema grande mañana."],
    pt: ["Retentores", "Um vazamento pequeno hoje vira um problema grande amanhã."],
  },
  {
    es: [
      "Antes de la zafra",
      "Hacé el service completo antes de arrancar: filtros, aceites y engrase.",
    ],
    pt: [
      "Antes da safra",
      "Faça a revisão completa antes de começar: filtros, óleos e lubrificação.",
    ],
  },
  {
    es: [
      "Código de la pieza",
      "Antes de pedir, buscá el código en la pieza vieja o en el manual. Así acertás seguro.",
    ],
    pt: [
      "Código da peça",
      "Antes de pedir, procure o código na peça antiga ou no manual. Assim não tem erro.",
    ],
  },
  {
    es: [
      "Número de serie",
      "Con el número de serie del tractor te ayudamos a encontrar la pieza justa.",
    ],
    pt: ["Número de série", "Com o número de série do trator ajudamos a achar a peça certa."],
  },
  {
    es: ["Inyectores", "Humo negro y falta de fuerza pueden ser inyectores: hacelos revisar."],
    pt: ["Bicos injetores", "Fumaça preta e falta de força podem ser os bicos: mande revisar."],
  },
  {
    es: ["Frenos", "Regulá los frenos parejos: un lado más duro desvía el tractor."],
    pt: ["Freios", "Regule os freios por igual: um lado mais duro desvia o trator."],
  },
  {
    es: [
      "Guardado",
      "Al terminar la zafra, guardá el tractor limpio, engrasado y con el tanque lleno.",
    ],
    pt: ["Guardando", "No fim da safra, guarde o trator limpo, lubrificado e com o tanque cheio."],
  },
];

// ---------------------------------------------------------------- reels
export function roteiroReels(tema: string, idioma: Idioma) {
  const pt = idioma === "pt";
  return pt
    ? [
        `GANCHO (0–3 s): «Seu ${tema} está dando sinal? Olha isso.» — close na peça`,
        `PROBLEMA (3–8 s): mostre a peça gasta ou o sintoma (barulho, vazamento, fumaça)`,
        `SOLUÇÃO (8–15 s): a peça nova na mão, girando devagar, com o código aparecendo`,
        `PROVA (15–22 s): a embalagem e a etiqueta com o código; estoque na prateleira`,
        `CHAMADA (22–30 s): «Peça pelo WhatsApp com o código. Enviamos para todo o RS.»`,
        `Texto na tela: o código grande · Música: em alta no Reels · Duração: até 30 s`,
      ]
    : [
        `GANCHO (0–3 s): «¿Tu ${tema} está avisando? Mirá esto.» — primer plano de la pieza`,
        `PROBLEMA (3–8 s): mostrá la pieza gastada o el síntoma (ruido, pérdida, humo)`,
        `SOLUCIÓN (8–15 s): la pieza nueva en la mano, girando despacio, con el código a la vista`,
        `PRUEBA (15–22 s): el empaque y la etiqueta con el código; stock en la estantería`,
        `LLAMADA (22–30 s): «Pedila por WhatsApp con el código. Envíos por DAC a todo Uruguay.»`,
        `Texto en pantalla: el código grande · Música: tendencia en Reels · Duración: hasta 30 s`,
      ];
}

// ---------------------------------------------------------------- respostas e bios
export const RESPOSTAS: Array<{ k: string; es: string; pt: string }> = [
  {
    k: "Preço",
    es: "¡Hola! 👋 Te pasamos el precio por WhatsApp: escribinos al +55 53 99183-1101 con el código de la pieza.",
    pt: "Olá! 👋 Passamos o preço pelo WhatsApp: chame no +55 53 99183-1101 com o código da peça.",
  },
  {
    k: "Tem/hay?",
    es: "¡Sí! Para confirmar stock y modelo, mandanos el código o el número de serie del tractor por WhatsApp. 🚜",
    pt: "Temos! Para confirmar estoque e modelo, mande o código ou o número de série do trator no WhatsApp. 🚜",
  },
  {
    k: "Envio",
    es: "Enviamos por DAC a todo Uruguay. Escribinos por WhatsApp y te decimos el plazo. 📦",
    pt: "Enviamos para todo o RS. Chame no WhatsApp que informamos o prazo. 📦",
  },
  {
    k: "Pagamento",
    es: "Podés pagar con link de pago (tarjeta) o transferencia. Te lo enviamos por WhatsApp. 💳",
    pt: "Pode pagar por link de pagamento (cartão) ou transferência. Enviamos pelo WhatsApp. 💳",
  },
  {
    k: "Obrigado",
    es: "¡Gracias por seguirnos! 🙌 Cualquier pieza que necesites, estamos por WhatsApp.",
    pt: "Obrigado por acompanhar! 🙌 Qualquer peça que precisar, estamos no WhatsApp.",
  },
  {
    k: "Elogio",
    es: "¡Gracias! 💛 Contá con nosotros para lo que necesite tu tractor.",
    pt: "Valeu! 💛 Conte com a gente para o que o seu trator precisar.",
  },
  {
    k: "Reclamação",
    es: "Lamentamos lo ocurrido. Escribinos por WhatsApp con tu número de pedido y lo resolvemos. 🙏",
    pt: "Sentimos muito. Chame no WhatsApp com o número do pedido que resolvemos. 🙏",
  },
  {
    k: "Black Friday",
    es: "¡La Black Friday arranca el 27/11! Ya hay precios de Pre Black en agropartsuy.com 🖤💛",
    pt: "A Black Friday começa dia 27/11! Já tem preço de Pré-Black em agropartsuy.com/pt 🖤💛",
  },
];
export const BIOS = {
  es: [
    "🚜 Repuestos agrícolas · Valtra · Massey · John Deere · New Holland\n📦 Envíos por DAC a todo Uruguay\n💬 Cotizá por WhatsApp 👇",
    "Repuestos para tu tractor 🔧\nBuscá por código en la web\n🚚 Todo Uruguay · 💬 WhatsApp 👇",
    "AGRO PARTS · Repuestos agrícolas\n⚙️ Miles de códigos en stock\n💛🖤 Pre Black Friday ya empezó 👇",
  ],
  pt: [
    "🚜 Peças agrícolas · Valtra · Massey · John Deere · New Holland\n📦 Envio para todo o RS\n💬 Peça pelo WhatsApp 👇",
    "Peças para o seu trator 🔧\nBusque pelo código no site\n🚚 Todo o RS · 💬 WhatsApp 👇",
    "AGRO PARTS · Peças agrícolas\n⚙️ Milhares de códigos\n💛🖤 A Pré-Black já começou 👇",
  ],
};

// ---------------------------------------------------------------- datas
export function datas(hoje = new Date()) {
  const ano = hoje.getFullYear();
  const d = (m: number, dia: number) => new Date(ano, m - 1, dia);
  const lista = [
    {
      quando: d(11, 27),
      nome: "Black Friday",
      ideia: "Contagem regressiva nos stories e carrossel das ofertas",
    },
    { quando: d(11, 30), nome: "Cyber Monday", ideia: "Última chamada das ofertas" },
    {
      quando: d(12, 25),
      nome: "Natal / Navidad",
      ideia: "Post de agradecimento + horário de atendimento",
    },
    {
      quando: d(12, 31),
      nome: "Ano Novo / Año Nuevo",
      ideia: "Resumo do ano e «prepare o trator para a safra»",
    },
  ];
  return lista
    .map((x) => ({ ...x, dias: Math.ceil((x.quando.getTime() - hoje.getTime()) / 86_400_000) }))
    .filter((x) => x.dias >= -1)
    .sort((a, b) => a.dias - b.dias);
}

// Nome da peça para anúncio/arte: sem o código e sem a marca repetida no fim
// («Kit Reparación Motor Tractor Valtra 82636800 AGCO» → «Kit Reparación Motor Tractor»)
const escapar = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export function nomeLimpo(p: { nome: string; codigo: string; sku: string; marca: string | null }) {
  let n = ` ${p.nome} `;
  for (const c of [p.codigo, p.sku])
    if (c && c.length >= 3) n = n.replace(new RegExp(`\\s${escapar(c)}(?=\\s)`, "gi"), " ");
  const fim = ["AGCO", "CNH", "JD", ...(p.marca ? [p.marca, ...p.marca.split(/\s+/)] : [])];
  let antes = "";
  while (antes !== n) {
    antes = n;
    for (const f of fim) n = n.replace(new RegExp(`\\s${escapar(f)}\\s*$`, "i"), " ");
  }
  n = n
    .replace(/(^|\s)(\p{L}+)(\s+\2)+(?=\s|$)/giu, "$1$2") // «Jacto Jacto» → «Jacto»
    .replace(/\s+/g, " ")
    .trim();
  return n.length >= 4 ? n : p.nome;
}
