// Tipos de automação de e-mail: textos padrão (em espanhol, para o cliente) e opções do gatilho.
// Código puro: usado no painel e no servidor.
import {
  CONTEUDO_PADRAO,
  PUBLICO_PADRAO,
  type ConteudoEmail,
  type Publico,
} from "./email-template";

export type TipoAutomacao =
  | "boas_vindas"
  | "cupom"
  | "promocao"
  | "preco_baixou"
  | "carrinho_baixou"
  | "carrinho_abandonado"
  | "reengajamento"
  | "catalogo_aberto"
  | "busca_sem_resultado"
  | "catalogo_novo"
  | "data_especial"
  | "aniversario"
  | "interesse_sem_pedido";

export type ConfigAutomacao = {
  atrasoHoras?: number; // boas-vindas: espera depois do cadastro
  gatilho?: "manual" | "cadastro"; // cupom: só quando clicar "Enviar agora" ou N dias após o cadastro
  dias?: number; // cupom (após cadastro), reengajamento (sem entrar há N dias), carrinho baixou (carrinhos dos últimos N dias)
  intervaloDias?: number; // promoção/preço baixou/reengajamento: no máximo 1 e-mail por cliente a cada N dias
  maxProdutos?: number;
  minimo?: number; // % mínimo de desconto/queda para avisar
  horas?: number; // carrinho abandonado: parado há N horas · catálogo aberto: espera N horas
  alvo?: "marca" | "todos"; // catálogo novo: só quem abriu catálogos da marca, ou todo o público
  data?: string; // data especial: AAAA-MM-DD (horário de Montevidéu)
  hora?: number; // data especial: a partir desta hora
  descontoPct?: number; // peças vistas: cupom exclusivo de N% para cada cliente (0 = sem cupom)
  validadeDias?: number; // peças vistas: validade do cupom exclusivo
};

export type DefTipo = {
  tipo: TipoAutomacao;
  nome: string; // nome no painel (português)
  descricao: string;
  gatilho: string; // explicação de quando dispara
  cor: string;
  emoji: string;
  produtos: boolean; // o e-mail recebe os produtos do evento
  enviarAgora: boolean; // tem o botão "Enviar agora para o público"
  variaveis?: Record<string, string>; // variáveis próprias do tipo, com o valor de exemplo da prévia
  config: ConfigAutomacao;
  assunto: string;
  preheader: string;
  conteudo: Partial<ConteudoEmail>;
  // Versão em português (clientes do Sul do Brasil), quando o tipo já sabe o idioma do cliente
  pt?: { assunto: string; preheader: string; conteudo: Partial<ConteudoEmail> };
};

const base = (c: Partial<ConteudoEmail>): Partial<ConteudoEmail> => ({
  produtosTitulo: "",
  produtos: [],
  fotos: true,
  whatsapp: true,
  ...c,
});

export const TIPOS: DefTipo[] = [
  {
    tipo: "interesse_sem_pedido",
    nome: "Peças vistas sem orçamento",
    descricao:
      "Quem viu peças no site e não pediu preço recebe essas mesmas peças, com fotos, um cupom exclusivo e o WhatsApp pronto para negociar.",
    gatilho:
      "N horas depois da última visita do cliente cadastrado, se ele viu peças e não mandou cotação, carrinho nem WhatsApp.",
    cor: "#b45309",
    emoji: "👀",
    produtos: true,
    enviarAgora: false,
    config: {
      horas: 24,
      dias: 7,
      intervaloDias: 14,
      maxProdutos: 6,
      descontoPct: 5,
      validadeDias: 7,
    },
    assunto: "{{nombre}}, preparamos una propuesta para tus repuestos",
    preheader: "Los repuestos que viste en AGRO PARTS, con un descuento exclusivo para vos.",
    conteudo: base({
      destaque: "PROPUESTA EXCLUSIVA",
      titulo: "{{nombre}}, queremos ayudarte a conseguir estos repuestos",
      texto:
        "Vimos que estuviste consultando estos repuestos en AGRO PARTS. Preparamos un **descuento exclusivo para vos** y estamos listos para negociar: escribinos por WhatsApp y te pasamos precio final, disponibilidad y la mejor condición que podamos ofrecerte.",
      produtosTitulo: "Los repuestos que consultaste",
      botaoTexto: "Ver los repuestos",
      botaoUrl: "/loja",
      cabecalho: "/email/automacoes/interesse_sem_pedido.jpg",
    }),
    pt: {
      assunto: "{{nombre}}, preparamos uma proposta para as suas peças",
      preheader: "As peças que você viu na AGRO PARTS, com um desconto exclusivo para você.",
      conteudo: {
        destaque: "PROPOSTA EXCLUSIVA",
        titulo: "{{nombre}}, queremos ajudar você a conseguir estas peças",
        texto:
          "Vimos que você consultou estas peças na AGRO PARTS. Preparamos um **desconto exclusivo para você** e estamos prontos para negociar: chame a gente no WhatsApp e passamos o preço final, a disponibilidade e a melhor condição que pudermos oferecer.",
        produtosTitulo: "As peças que você consultou",
        botaoTexto: "Ver as peças",
      },
    },
  },
  {
    tipo: "boas_vindas",
    nome: "Boas-vindas",
    descricao: "E-mail personalizado com imagem para cada cliente novo.",
    gatilho: "Quando o cliente cria a conta (com e-mail ou Google).",
    cor: "#0b7a3b",
    emoji: "👋",
    produtos: false,
    enviarAgora: true,
    config: { atrasoHoras: 0 },
    assunto: "¡Bienvenido a AGRO PARTS, {{nombre}}! 🚜",
    preheader: "Catálogos y repuestos con código original.",
    conteudo: base({
      destaque: "BIENVENIDO",
      titulo: "¡Hola {{nombre}}, qué bueno tenerte en AGRO PARTS!",
      texto:
        "Ya tenés acceso a **todos nuestros catálogos de tractores** y a miles de repuestos agrícolas.\n\nBuscá por código o por modelo y pedí tu cotización por WhatsApp.",
      // O código é trocado pelo cupom único de cada cliente (AGRO-XXXX) na hora do envio
      cupom: {
        codigo: "AGRO-XXXX",
        texto: "15% de descuento en tu primera compra",
        validade: "para tu primera compra",
      },
      botaoTexto: "Ver catálogos",
      botaoUrl: "/catalogos",
    }),
  },
  {
    tipo: "cupom",
    nome: "Cupom de desconto",
    descricao: "Cupom personalizável com imagem, código e validade.",
    gatilho: "Quando você clicar em “Enviar agora”, ou N dias depois do cadastro.",
    cor: "#e07b00",
    emoji: "🎟️",
    produtos: false,
    enviarAgora: true,
    config: { gatilho: "manual", dias: 7 },
    assunto: "{{nombre}}, tenés un cupón de descuento 🎁",
    preheader: "Usalo en tu próxima compra de repuestos.",
    conteudo: base({
      destaque: "CUPÓN EXCLUSIVO",
      titulo: "{{nombre}}, este regalo es para vos",
      texto:
        "Usá tu cupón en tu próxima compra de repuestos. Pedí tu cotización por WhatsApp y mencioná el código.",
      cupom: {
        codigo: "AGRO10",
        texto: "10% de descuento en tu próxima compra",
        validade: "hasta fin de mes",
      },
      botaoTexto: "Ver repuestos",
      botaoUrl: "/loja",
      cor: "#e07b00",
    }),
  },
  {
    tipo: "promocao",
    nome: "Produto em promoção",
    descricao: "Avisa quando uma peça entra em oferta.",
    gatilho: "Quando uma peça ganha preço promocional (até 6 peças por e-mail).",
    cor: "#c8102e",
    emoji: "🔥",
    produtos: true,
    enviarAgora: false,
    config: { intervaloDias: 3, maxProdutos: 6, minimo: 5 },
    assunto: "🔥 {{nombre}}, nuevas ofertas en repuestos",
    preheader: "Precios especiales por tiempo limitado.",
    conteudo: base({
      destaque: "OFERTA",
      titulo: "{{nombre}}, estos repuestos entraron en oferta",
      texto: "Precios especiales **por tiempo limitado**. Pedí el tuyo por WhatsApp.",
      produtosTitulo: "En oferta",
      botaoTexto: "Ver todas las ofertas",
      botaoUrl: "/loja",
      cor: "#c8102e",
    }),
  },
  {
    tipo: "preco_baixou",
    nome: "Preço baixou",
    descricao: "Avisa quando o preço de uma peça cai.",
    gatilho: "Quando o preço de venda de uma peça diminui (sem ser promoção).",
    cor: "#1f6fb5",
    emoji: "📉",
    produtos: true,
    enviarAgora: false,
    config: { intervaloDias: 3, maxProdutos: 6, minimo: 5 },
    assunto: "📉 Bajaron de precio: repuestos para tu tractor",
    preheader: "Nuevos precios más bajos en AGRO PARTS.",
    conteudo: base({
      destaque: "BAJÓ DE PRECIO",
      titulo: "{{nombre}}, estos repuestos ahora están más baratos",
      texto:
        "Actualizamos precios y estos repuestos **bajaron**. Aprovechá y pedí tu cotización por WhatsApp.",
      produtosTitulo: "Nuevos precios",
      botaoTexto: "Ver repuestos",
      botaoUrl: "/loja",
      cor: "#1f6fb5",
    }),
  },
  {
    tipo: "carrinho_baixou",
    nome: "Carrinho baixou de valor",
    descricao: "Avisa o cliente quando uma peça da lista dele baixa de preço.",
    gatilho: "Quando uma peça que está no carrinho do cliente entra em promoção ou baixa de preço.",
    cor: "#0b7a3b",
    emoji: "🛒",
    produtos: true,
    enviarAgora: false,
    config: { dias: 60, minimo: 1 },
    assunto: "{{nombre}}, bajó el precio de tu lista 🛒",
    preheader: "Un repuesto que guardaste ahora está más barato.",
    conteudo: base({
      destaque: "TU LISTA BAJÓ DE PRECIO",
      titulo: "{{nombre}}, un repuesto de tu lista está más barato",
      texto:
        "Guardaste estos repuestos en tu lista y **bajaron de precio**. ¿Te los reservamos? Respondé por WhatsApp.",
      produtosTitulo: "De tu lista",
      botaoTexto: "Ver más repuestos",
      botaoUrl: "/loja",
    }),
  },
  {
    tipo: "carrinho_abandonado",
    nome: "Carrinho abandonado",
    descricao: "Lembra o cliente que montou uma lista e não pediu.",
    gatilho: "Quando a lista de um cliente cadastrado fica parada há N horas sem pedido.",
    cor: "#0b7a3b",
    emoji: "⏰",
    produtos: true,
    enviarAgora: false,
    config: { horas: 24 },
    assunto: "{{nombre}}, tus repuestos te esperan",
    preheader: "Te ayudamos con precio y disponibilidad.",
    conteudo: base({
      destaque: "TU LISTA",
      titulo: "{{nombre}}, tus repuestos te esperan",
      texto:
        "Vimos que armaste una lista y no llegaste a pedirla. **Te ayudamos** con precio y disponibilidad.",
      produtosTitulo: "Tu lista",
      botaoTexto: "Ver más repuestos",
      botaoUrl: "/loja",
    }),
  },
  {
    tipo: "reengajamento",
    nome: "Cliente inativo",
    descricao: "Chama de volta quem não entra no site há um tempo.",
    gatilho: "Quando o cliente fica N dias sem entrar no site.",
    cor: "#7c4dbd",
    emoji: "💬",
    produtos: false,
    enviarAgora: true,
    config: { dias: 45, intervaloDias: 60 },
    assunto: "{{nombre}}, te extrañamos en AGRO PARTS",
    preheader: "Nuevos repuestos y catálogos para tu tractor.",
    conteudo: base({
      destaque: "TE EXTRAÑAMOS",
      titulo: "{{nombre}}, ¿necesitás repuestos para la zafra?",
      texto:
        "Sumamos repuestos y catálogos nuevos. Buscá por código o modelo, o mandanos la foto de la pieza por WhatsApp y te la conseguimos.",
      botaoTexto: "Ver novedades",
      botaoUrl: "/loja",
    }),
  },
  {
    tipo: "catalogo_aberto",
    nome: "Catálogo aberto",
    descricao: "Quem abriu o catálogo de uma marca recebe peças em oferta dessa marca.",
    gatilho: "N horas depois de o cliente abrir um catálogo (ex.: John Deere → peças John Deere).",
    cor: "#0b7a3b",
    emoji: "📖",
    produtos: true,
    enviarAgora: false,
    variaveis: { marca: "John Deere" },
    config: { horas: 20, intervaloDias: 30, maxProdutos: 6 },
    assunto: "{{nombre}}, repuestos {{marca}} para tu tractor",
    preheader: "Seleccionamos ofertas de la marca que estuviste mirando.",
    conteudo: base({
      destaque: "{{marca}}",
      titulo: "{{nombre}}, repuestos {{marca}} con precio especial",
      texto:
        "Vimos que consultaste el catálogo de **{{marca}}**. Te dejamos repuestos de esa marca con código original.",
      produtosTitulo: "Repuestos {{marca}}",
      botaoTexto: "Ver más de {{marca}}",
      botaoUrl: "/loja",
    }),
  },
  {
    tipo: "busca_sem_resultado",
    nome: "Busca sem resultado",
    descricao: "Avisa quando a peça que o cliente procurou passa a existir na loja.",
    gatilho: "Quando uma busca que não deu resultado (de cliente logado) passa a encontrar peças.",
    cor: "#1f6fb5",
    emoji: "🔎",
    produtos: true,
    enviarAgora: false,
    variaveis: { busqueda: "filtro 3136019" },
    config: { dias: 60, maxProdutos: 4 },
    assunto: "{{nombre}}, ya tenemos lo que buscabas 🔎",
    preheader: "La pieza que no encontraste ahora está en AGRO PARTS.",
    conteudo: base({
      destaque: "YA LO TENEMOS",
      titulo: "{{nombre}}, encontramos “{{busqueda}}”",
      texto:
        "Hace unos días buscaste **{{busqueda}}** y no lo teníamos. ¡Ahora sí! Pedilo por WhatsApp y te lo enviamos.",
      produtosTitulo: "Lo que buscabas",
      botaoTexto: "Ver resultados",
      botaoUrl: "/loja",
    }),
  },
  {
    tipo: "catalogo_novo",
    nome: "Catálogo novo publicado",
    descricao: "Avisa quando você publica um catálogo PDF novo.",
    gatilho: "Quando um catálogo é publicado em Catálogos (PDF).",
    cor: "#0b7a3b",
    emoji: "📚",
    produtos: false,
    enviarAgora: false,
    variaveis: { catalogo: "Manual de servicio Maxxum 135", marca: "Case IH" },
    config: { alvo: "marca" },
    assunto: "📚 Nuevo catálogo {{marca}}: {{catalogo}}",
    preheader: "Ya está disponible en tu cuenta de AGRO PARTS.",
    conteudo: base({
      destaque: "NUEVO CATÁLOGO",
      titulo: "{{nombre}}, sumamos el catálogo “{{catalogo}}”",
      texto:
        "Ya podés consultarlo gratis con tu cuenta. Buscá el código de la pieza y pedila por WhatsApp.",
      botaoTexto: "Ver catálogo",
      botaoUrl: "/catalogos",
    }),
  },
  {
    tipo: "data_especial",
    nome: "Data comercial",
    descricao: "Black Friday, CyberLunes, Navidad, fin de año… com cupom.",
    gatilho: "Na data e hora escolhidas (horário de Montevidéu), uma vez para o público.",
    cor: "#18181b",
    emoji: "🗓️",
    produtos: false,
    enviarAgora: true,
    config: { data: "", hora: 9 },
    assunto: "🖤 Black Friday en AGRO PARTS: {{cupon}}",
    preheader: "Solo por hoy: descuento en repuestos agrícolas.",
    conteudo: base({
      destaque: "BLACK FRIDAY",
      titulo: "{{nombre}}, llegó el Black Friday del campo",
      texto:
        "**Solo por tiempo limitado**: usá tu cupón en repuestos para tu tractor. Pedí por WhatsApp y mencioná el código.",
      cupom: {
        codigo: "BLACK15",
        texto: "15% de descuento en repuestos",
        validade: "solo hasta el domingo",
      },
      botaoTexto: "Ver repuestos",
      botaoUrl: "/loja",
      cor: "#18181b",
    }),
  },
  {
    tipo: "aniversario",
    nome: "Aniversário de cadastro",
    descricao: "Um presente quando a conta do cliente completa mais um ano.",
    gatilho: "No dia em que a conta completa 1, 2, 3… anos.",
    cor: "#c8102e",
    emoji: "🎂",
    produtos: false,
    enviarAgora: false,
    variaveis: { anos: "1", tiempo: "1 año" },
    config: {},
    assunto: "🎂 {{nombre}}, ¡cumplimos {{tiempo}} juntos!",
    preheader: "Tenemos un regalo para vos.",
    conteudo: base({
      destaque: "¡FELIZ ANIVERSARIO!",
      titulo: "{{nombre}}, hace {{tiempo}} que sos parte de AGRO PARTS",
      texto:
        "Gracias por confiar en nosotros. Para festejar, te regalamos un descuento en tu próxima compra.",
      cupom: { codigo: "GRACIAS10", texto: "10% de descuento de regalo", validade: "por 30 días" },
      botaoTexto: "Ver repuestos",
      botaoUrl: "/loja",
      cor: "#c8102e",
    }),
  },
];

// Imagem de topo de cada tipo (public/email/automacoes, gerada por marketing/email-automacoes)
export const imagemAutomacao = (tipo: TipoAutomacao) => `/email/automacoes/${tipo}.jpg`;
for (const t of TIPOS) t.conteudo.cabecalho ??= imagemAutomacao(t.tipo);

export const defTipo = (t: string) => TIPOS.find((x) => x.tipo === t) ?? TIPOS[0];

export function conteudoPadrao(t: TipoAutomacao): ConteudoEmail {
  return { ...CONTEUDO_PADRAO, ...defTipo(t).conteudo } as ConteudoEmail;
}
export const publicoPadrao = (): Publico => ({ ...PUBLICO_PADRAO });

// Black Friday: a sexta-feira depois do quarta quinta-feira de novembro
export function blackFriday(ano: number) {
  const d = new Date(Date.UTC(ano, 10, 1));
  const primeiraQuinta = ((4 - d.getUTCDay() + 7) % 7) + 1;
  return `${ano}-11-${String(primeiraQuinta + 21 + 1).padStart(2, "0")}`;
}

// Produtos de exemplo para a prévia dos tipos que mostram peças
export const PRODUTOS_EXEMPLO = [
  {
    sku: "82636800",
    nome: "Kit Motor Sisu Valtra",
    codigo: "82636800",
    imagem: null,
    preco: "$U 7.160",
    precoDe: "$U 8.750",
    selo: "-18%",
  },
  {
    sku: "3136019",
    nome: "Filtro de Aceite Motor Massey Ferguson",
    codigo: "3136019",
    imagem: null,
    preco: "$U 1.290",
    precoDe: "$U 1.490",
    selo: "-13%",
  },
];
