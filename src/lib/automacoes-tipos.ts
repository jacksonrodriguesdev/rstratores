// Tipos de automação de e-mail: textos padrão (em espanhol, para o cliente) e opções do gatilho.
// Código puro: usado no painel e no servidor.
import { CONTEUDO_PADRAO, PUBLICO_PADRAO, type ConteudoEmail, type Publico } from "./email-template";

export type TipoAutomacao =
  | "boas_vindas"
  | "cupom"
  | "promocao"
  | "preco_baixou"
  | "carrinho_baixou"
  | "carrinho_abandonado"
  | "reengajamento";

export type ConfigAutomacao = {
  atrasoHoras?: number; // boas-vindas: espera depois do cadastro
  gatilho?: "manual" | "cadastro"; // cupom: só quando clicar "Enviar agora" ou N dias após o cadastro
  dias?: number; // cupom (após cadastro), reengajamento (sem entrar há N dias), carrinho baixou (carrinhos dos últimos N dias)
  intervaloDias?: number; // promoção/preço baixou/reengajamento: no máximo 1 e-mail por cliente a cada N dias
  maxProdutos?: number;
  minimo?: number; // % mínimo de desconto/queda para avisar
  horas?: number; // carrinho abandonado: parado há N horas
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
  config: ConfigAutomacao;
  assunto: string;
  preheader: string;
  conteudo: Partial<ConteudoEmail>;
};

const base = (c: Partial<ConteudoEmail>): Partial<ConteudoEmail> => ({ produtosTitulo: "", produtos: [], fotos: true, whatsapp: true, ...c });

export const TIPOS: DefTipo[] = [
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
    preheader: "Catálogos, repuestos y envíos a todo Uruguay.",
    conteudo: base({
      destaque: "BIENVENIDO",
      titulo: "¡Hola {{nombre}}, qué bueno tenerte en AGRO PARTS!",
      texto:
        "Ya tenés acceso a **todos nuestros catálogos de tractores** y a miles de repuestos agrícolas.\n\nBuscá por código o por modelo y pedí tu cotización por WhatsApp. Enviamos por DAC a todo Uruguay.",
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
      texto: "Usá tu cupón en tu próxima compra de repuestos. Pedí tu cotización por WhatsApp y mencioná el código.",
      cupom: { codigo: "AGRO10", texto: "10% de descuento en tu próxima compra", validade: "hasta fin de mes" },
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
      texto: "Precios especiales **por tiempo limitado**. Pedí el tuyo por WhatsApp y te lo enviamos por DAC.",
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
      texto: "Actualizamos precios y estos repuestos **bajaron**. Aprovechá y pedí tu cotización por WhatsApp.",
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
      texto: "Guardaste estos repuestos en tu lista y **bajaron de precio**. ¿Te los reservamos? Respondé por WhatsApp.",
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
    preheader: "Te ayudamos con precio y envío a todo Uruguay.",
    conteudo: base({
      destaque: "TU LISTA",
      titulo: "{{nombre}}, tus repuestos te esperan",
      texto: "Vimos que armaste una lista y no llegaste a pedirla. **Te ayudamos** con precio, disponibilidad y envío a todo Uruguay.",
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
      texto: "Sumamos repuestos y catálogos nuevos. Buscá por código o modelo, o mandanos la foto de la pieza por WhatsApp y te la conseguimos.",
      botaoTexto: "Ver novedades",
      botaoUrl: "/loja",
    }),
  },
];

export const defTipo = (t: string) => TIPOS.find((x) => x.tipo === t) ?? TIPOS[0];

export function conteudoPadrao(t: TipoAutomacao): ConteudoEmail {
  return { ...CONTEUDO_PADRAO, ...defTipo(t).conteudo } as ConteudoEmail;
}
export const publicoPadrao = (): Publico => ({ ...PUBLICO_PADRAO });

// Produtos de exemplo para a prévia dos tipos que mostram peças
export const PRODUTOS_EXEMPLO = [
  { sku: "82636800", nome: "Kit Motor Sisu Valtra", codigo: "82636800", imagem: null, preco: "$U 7.160", precoDe: "$U 8.750", selo: "-18%" },
  { sku: "3136019", nome: "Filtro de Aceite Motor Massey Ferguson", codigo: "3136019", imagem: null, preco: "$U 1.290", precoDe: "$U 1.490", selo: "-13%" },
];
