// E-mails montados por blocos (Admin → E-mail marketing): tema de cores e 18 tipos de bloco que
// o admin empilha na ordem que quiser. Código puro: a prévia ao vivo do admin e o envio pelo
// servidor usam a mesma função. HTML em tabelas e estilos inline (Gmail, Outlook, celulares).
import type { Campo } from "./blocos-home";
import {
  anuncioHtml,
  linkAnuncio,
  comUtm,
  esc,
  formatarTexto,
  personalizar,
  trocarVariaveis,
  trocarEmTudo,
  urlAbsoluta,
  type ConteudoEmail,
  type DadosRender,
  type ProdutoEmail,
} from "./email-template";
import { fotoInvalida } from "./fotos";

export type BlocoEmail = {
  id: string;
  tipo: string;
  d: Record<string, any>;
  oculto?: boolean;
};

export type TemaEmail = {
  fundo: string; // fundo em volta do e-mail
  cartao: string; // fundo do e-mail
  topo: string; // faixa da logo
  topoTexto: string;
  titulo: string;
  texto: string;
  suave: string; // caixas e cartões
  destaque: string; // selos e detalhes
  cantos: number;
  fonte: "moderna" | "classica" | "impacto";
  idioma: "es" | "pt";
};

export const TEMAS: Array<{ id: string; nome: string; cor: string; tema: TemaEmail }> = [
  {
    id: "verde",
    nome: "Verde AGRO PARTS",
    cor: "#0b7a3b",
    tema: {
      fundo: "#eef1ea",
      cartao: "#ffffff",
      topo: "#06321b",
      topoTexto: "#ffffff",
      titulo: "#06321b",
      texto: "#3f3f46",
      suave: "#f4f7f2",
      destaque: "#fbbf24",
      cantos: 18,
      fonte: "moderna",
      idioma: "es",
    },
  },
  {
    id: "black",
    nome: "Black Friday",
    cor: "#f5c518",
    tema: {
      fundo: "#000000",
      cartao: "#0f0f10",
      topo: "#000000",
      topoTexto: "#f5c518",
      titulo: "#ffffff",
      texto: "#d4d4d8",
      suave: "#1c1c1f",
      destaque: "#f5c518",
      cantos: 18,
      fonte: "impacto",
      idioma: "es",
    },
  },
  {
    id: "ofertas",
    nome: "Ofertas (vermelho)",
    cor: "#dc2626",
    tema: {
      fundo: "#fef2f2",
      cartao: "#ffffff",
      topo: "#7f1d1d",
      topoTexto: "#ffffff",
      titulo: "#7f1d1d",
      texto: "#3f3f46",
      suave: "#fff1f2",
      destaque: "#fde047",
      cantos: 18,
      fonte: "impacto",
      idioma: "es",
    },
  },
  {
    id: "azul",
    nome: "Azul confiança",
    cor: "#0284c7",
    tema: {
      fundo: "#eff6ff",
      cartao: "#ffffff",
      topo: "#0c4a6e",
      topoTexto: "#ffffff",
      titulo: "#0c4a6e",
      texto: "#3f3f46",
      suave: "#f0f9ff",
      destaque: "#fbbf24",
      cantos: 18,
      fonte: "moderna",
      idioma: "es",
    },
  },
  {
    id: "campo",
    nome: "Campo (terra)",
    cor: "#b45309",
    tema: {
      fundo: "#f5efe6",
      cartao: "#fffdf8",
      topo: "#3f2a14",
      topoTexto: "#f5d48a",
      titulo: "#3f2a14",
      texto: "#57483a",
      suave: "#f3e9d8",
      destaque: "#e0a800",
      cantos: 14,
      fonte: "classica",
      idioma: "es",
    },
  },
  {
    id: "minimal",
    nome: "Minimalista",
    cor: "#18181b",
    tema: {
      fundo: "#f4f4f5",
      cartao: "#ffffff",
      topo: "#ffffff",
      topoTexto: "#18181b",
      titulo: "#18181b",
      texto: "#52525b",
      suave: "#f4f4f5",
      destaque: "#18181b",
      cantos: 6,
      fonte: "moderna",
      idioma: "es",
    },
  },
];
export const TEMA_PADRAO = TEMAS[0].tema;
export const temaDe = (c: Pick<ConteudoEmail, "tema">): TemaEmail => ({
  ...TEMA_PADRAO,
  ...c.tema,
});

// ---------------------------------------------------------------- tipos de bloco
export type TipoBlocoEmail = {
  id: string;
  nome: string;
  desc: string;
  icone: string; // ícone (lucide) no admin
  padrao: Record<string, any>;
  campos: Campo[];
};

const ALINHAR: Campo = {
  k: "alinhar",
  rotulo: "Alinhamento",
  tipo: "select",
  opcoes: [
    ["center", "Centro"],
    ["left", "Esquerda"],
  ],
};
const COR_OPCIONAL = (k: string, rotulo: string): Campo => ({
  k,
  rotulo,
  tipo: "cor",
  ajuda: "Vazio = cor do tema",
});

export const TIPOS_EMAIL: TipoBlocoEmail[] = [
  {
    id: "AVISO",
    nome: "Faixa de aviso",
    desc: "Faixa fina com uma frase curta. Boa no topo: “ÚLTIMO DÍA”, “Envío gratis”…",
    icone: "Megaphone",
    padrao: { texto: "🚚 Envíos a todo Uruguay por DAC", link: "", cor_fundo: "", cor_texto: "" },
    campos: [
      { k: "texto", rotulo: "Texto", tipo: "texto" },
      { k: "link", rotulo: "Link (opcional)", tipo: "link" },
      COR_OPCIONAL("cor_fundo", "Cor de fundo"),
      COR_OPCIONAL("cor_texto", "Cor do texto"),
    ],
  },
  {
    id: "HERO",
    nome: "Destaque principal",
    desc: "Bloco grande com selo, título, texto e botão, sobre uma cor ou uma foto.",
    icone: "PanelTop",
    padrao: {
      selo: "OFERTAS",
      titulo: "¡Hola {{nombre}}! Repuestos para tu tractor",
      texto: "Pedí tu cotización por WhatsApp y te respondemos con precio y disponibilidad.",
      botao: "Ver ofertas",
      link: "/loja",
      imagem: "",
      cor_fundo: "",
      alinhar: "center",
      altura: "normal",
    },
    campos: [
      { k: "selo", rotulo: "Selo acima do título", tipo: "texto" },
      { k: "titulo", rotulo: "Título", tipo: "texto" },
      { k: "texto", rotulo: "Texto", tipo: "textarea" },
      { k: "botao", rotulo: "Texto do botão", tipo: "texto" },
      { k: "link", rotulo: "Link do botão", tipo: "link" },
      {
        k: "imagem",
        rotulo: "Foto de fundo (opcional, 1200 × 700)",
        tipo: "imagem",
        ajuda:
          "O texto fica por cima, com a foto escurecida. No Outlook do computador aparece a cor.",
      },
      COR_OPCIONAL("cor_fundo", "Cor de fundo"),
      ALINHAR,
      {
        k: "altura",
        rotulo: "Tamanho",
        tipo: "select",
        opcoes: [
          ["normal", "Normal"],
          ["alta", "Alto"],
        ],
      },
    ],
  },
  {
    id: "IMAGEM",
    nome: "Imagem / banner",
    desc: "Uma imagem na largura do e-mail, com link. JPG, PNG ou GIF animado.",
    icone: "Image",
    padrao: { imagem: "", link: "/loja", alt: "AGRO PARTS", margem: false, arredondar: false },
    campos: [
      { k: "imagem", rotulo: "Imagem (1200 px de largura)", tipo: "imagem" },
      { k: "link", rotulo: "Link ao clicar", tipo: "link" },
      {
        k: "alt",
        rotulo: "Texto alternativo",
        tipo: "texto",
        ajuda: "Aparece quando o e-mail bloqueia as imagens",
      },
      { k: "margem", rotulo: "Com margem nas laterais", tipo: "bool" },
      { k: "arredondar", rotulo: "Cantos arredondados", tipo: "bool" },
    ],
  },
  {
    id: "TITULO",
    nome: "Título",
    desc: "Título com selo opcional.",
    icone: "Heading",
    padrao: { selo: "", texto: "Título da seção", tamanho: "m", alinhar: "left" },
    campos: [
      { k: "selo", rotulo: "Selo (opcional)", tipo: "texto" },
      { k: "texto", rotulo: "Título", tipo: "texto" },
      {
        k: "tamanho",
        rotulo: "Tamanho",
        tipo: "select",
        opcoes: [
          ["g", "Grande"],
          ["m", "Médio"],
          ["p", "Pequeno"],
        ],
      },
      ALINHAR,
    ],
  },
  {
    id: "TEXTO",
    nome: "Texto",
    desc: "Parágrafos. **negrito** e [texto do link](/loja).",
    icone: "Type",
    padrao: { texto: "Escribí acá tu mensaje.", alinhar: "left", tamanho: "16" },
    campos: [
      {
        k: "texto",
        rotulo: "Texto",
        tipo: "textarea",
        ajuda: "Linha em branco = novo parágrafo · **negrito** · [texto](/loja)",
      },
      ALINHAR,
      {
        k: "tamanho",
        rotulo: "Tamanho da letra",
        tipo: "select",
        opcoes: [
          ["16", "Normal"],
          ["18", "Grande"],
          ["14", "Pequena"],
        ],
      },
    ],
  },
  {
    id: "BOTAO",
    nome: "Botão",
    desc: "Botão com link. Cheio, contorno ou na largura toda.",
    icone: "MousePointerClick",
    padrao: { texto: "Ver todos los repuestos", link: "/loja", estilo: "cheio", cor: "" },
    campos: [
      { k: "texto", rotulo: "Texto", tipo: "texto" },
      { k: "link", rotulo: "Link", tipo: "link" },
      {
        k: "estilo",
        rotulo: "Estilo",
        tipo: "select",
        opcoes: [
          ["cheio", "Cheio"],
          ["contorno", "Contorno"],
          ["largo", "Largura toda"],
        ],
      },
      COR_OPCIONAL("cor", "Cor do botão"),
    ],
  },
  {
    id: "CUPOM",
    nome: "Cupom",
    desc: "Caixa com o código do cupom. Pode usar o cupom de boas-vindas de cada cliente.",
    icone: "Ticket",
    padrao: {
      codigo: "",
      texto: "Usá este código en tu compra",
      validade: "",
      pessoal: false,
      estilo: "ticket",
      botao: "",
      link: "",
    },
    campos: [
      {
        k: "codigo",
        rotulo: "Código",
        tipo: "texto",
        ajuda: "Crie o cupom antes em Campanhas e cupons, senão a equipe não consegue aplicar",
      },
      { k: "texto", rotulo: "Texto acima do código", tipo: "texto" },
      { k: "validade", rotulo: "Validade (ex.: hasta el 30/11)", tipo: "texto" },
      {
        k: "pessoal",
        rotulo: "Usar o cupom de boas-vindas de cada cliente",
        tipo: "bool",
        ajuda:
          "Quem ganhou o cupom no pop-up “Entrá y ganá” vê o próprio código. Sem cupom pessoal: usa o código acima ou o bloco some.",
      },
      {
        k: "estilo",
        rotulo: "Estilo",
        tipo: "select",
        opcoes: [
          ["ticket", "Ticket tracejado"],
          ["escuro", "Escuro"],
        ],
      },
      { k: "botao", rotulo: "Botão abaixo (opcional)", tipo: "texto" },
      { k: "link", rotulo: "Link do botão", tipo: "link" },
    ],
  },
  {
    id: "CONTAGEM",
    nome: "Contagem regressiva",
    desc: "Dias, horas e minutos até uma data (calculados na hora em que o e-mail sai).",
    icone: "Timer",
    padrao: {
      titulo: "Faltan para la BLACK FRIDAY",
      alvo: "",
      depois: "¡Ya empezó!",
      cor_fundo: "",
    },
    campos: [
      { k: "titulo", rotulo: "Título", tipo: "texto" },
      { k: "alvo", rotulo: "Data e hora", tipo: "datahora" },
      { k: "depois", rotulo: "Texto se a data já passou", tipo: "texto" },
      COR_OPCIONAL("cor_fundo", "Cor de fundo"),
    ],
  },
  {
    id: "PRODUTOS",
    nome: "Produtos",
    desc: "Peças escolhidas à mão ou automáticas (ofertas, Black Friday, categoria, marca, novas), com o preço do dia.",
    icone: "Package",
    padrao: {
      titulo: "Destacados",
      fonte: "ofertas",
      alvo: "",
      produtos: [],
      limite: 6,
      colunas: "2",
      precos: true,
      fotos: false,
      botao: "",
    },
    campos: [], // formulário próprio no admin (busca de peças)
  },
  {
    id: "CATEGORIAS",
    nome: "Categorias",
    desc: "Atalhos para categorias ou marcas, em quadrados com emoji.",
    icone: "LayoutGrid",
    padrao: { titulo: "Buscá por categoria", colunas: "3", itens: [] },
    campos: [
      { k: "titulo", rotulo: "Título", tipo: "texto" },
      {
        k: "colunas",
        rotulo: "Por linha",
        tipo: "select",
        opcoes: [
          ["3", "3"],
          ["2", "2"],
        ],
      },
      {
        k: "itens",
        rotulo: "Itens",
        tipo: "lista",
        max: 9,
        campos: [
          { k: "emoji", rotulo: "Emoji", tipo: "texto" },
          { k: "nome", rotulo: "Nome", tipo: "texto" },
          { k: "link", rotulo: "Link", tipo: "link" },
        ],
      },
    ],
  },
  {
    id: "BENEFICIOS",
    nome: "Vantagens",
    desc: "Até 4 vantagens lado a lado (envio, WhatsApp, segurança…).",
    icone: "BadgeCheck",
    padrao: {
      itens: [
        { emoji: "🚚", titulo: "Envíos a todo Uruguay", texto: "Por DAC" },
        { emoji: "💬", titulo: "Cotizá por WhatsApp", texto: "Te respondemos rápido" },
        { emoji: "🔍", titulo: "Buscá por código", texto: "El del fabricante" },
      ],
    },
    campos: [
      {
        k: "itens",
        rotulo: "Vantagens",
        tipo: "lista",
        max: 4,
        campos: [
          { k: "emoji", rotulo: "Emoji", tipo: "texto" },
          { k: "titulo", rotulo: "Título", tipo: "texto" },
          { k: "texto", rotulo: "Texto", tipo: "texto" },
        ],
      },
    ],
  },
  {
    id: "DUAS_COLUNAS",
    nome: "Imagem + texto",
    desc: "Imagem de um lado e texto com botão do outro (no celular, uma embaixo da outra).",
    icone: "Columns2",
    padrao: {
      imagem: "",
      titulo: "Catálogos en PDF",
      texto: "Descargá los catálogos de las marcas y encontrá el código de la pieza.",
      botao: "Ver catálogos",
      link: "/catalogos",
      lado: "esq",
    },
    campos: [
      { k: "imagem", rotulo: "Imagem (600 × 600)", tipo: "imagem" },
      { k: "titulo", rotulo: "Título", tipo: "texto" },
      { k: "texto", rotulo: "Texto", tipo: "textarea" },
      { k: "botao", rotulo: "Botão", tipo: "texto" },
      { k: "link", rotulo: "Link", tipo: "link" },
      {
        k: "lado",
        rotulo: "Imagem",
        tipo: "select",
        opcoes: [
          ["esq", "À esquerda"],
          ["dir", "À direita"],
        ],
      },
    ],
  },
  {
    id: "PASSOS",
    nome: "Passo a passo",
    desc: "Etapas numeradas (como comprar, como usar o cupom).",
    icone: "ListOrdered",
    padrao: {
      titulo: "¿Cómo comprar?",
      itens: [
        { titulo: "Elegí", texto: "Buscá la pieza por nombre o código en el sitio." },
        { titulo: "Pedí", texto: "Mandanos tu pedido por WhatsApp o desde el carrito." },
        { titulo: "Recibí", texto: "Enviamos por DAC a todo Uruguay." },
      ],
    },
    campos: [
      { k: "titulo", rotulo: "Título", tipo: "texto" },
      {
        k: "itens",
        rotulo: "Passos",
        tipo: "lista",
        max: 5,
        campos: [
          { k: "titulo", rotulo: "Título", tipo: "texto" },
          { k: "texto", rotulo: "Texto", tipo: "texto" },
        ],
      },
    ],
  },
  {
    id: "DEPOIMENTO",
    nome: "Depoimento",
    desc: "Frase de um cliente, com estrelas. Use só depoimentos reais e autorizados.",
    icone: "Quote",
    padrao: { texto: "", autor: "", local: "", estrelas: 5 },
    campos: [
      { k: "texto", rotulo: "Depoimento", tipo: "textarea" },
      { k: "autor", rotulo: "Nome do cliente", tipo: "texto" },
      { k: "local", rotulo: "Cidade / departamento", tipo: "texto" },
      { k: "estrelas", rotulo: "Estrelas (0 a 5)", tipo: "numero" },
    ],
  },
  {
    id: "WHATSAPP",
    nome: "WhatsApp",
    desc: "Caixa com chamada e o botão verde do WhatsApp da loja.",
    icone: "MessageCircle",
    padrao: {
      titulo: "¿No encontrás la pieza?",
      texto: "Mandanos el código o una foto y te cotizamos.",
      botao: "Cotizar por WhatsApp",
    },
    campos: [
      { k: "titulo", rotulo: "Título", tipo: "texto" },
      { k: "texto", rotulo: "Texto", tipo: "texto" },
      { k: "botao", rotulo: "Botão", tipo: "texto" },
    ],
  },
  {
    id: "VIDEO",
    nome: "Vídeo",
    desc: "Capa do vídeo com botão “play”: abre o YouTube/Instagram.",
    icone: "PlaySquare",
    padrao: { imagem: "", link: "", titulo: "Mirá el video" },
    campos: [
      { k: "imagem", rotulo: "Capa (1200 × 675)", tipo: "imagem" },
      { k: "link", rotulo: "Link do vídeo", tipo: "link" },
      { k: "titulo", rotulo: "Texto do botão", tipo: "texto" },
    ],
  },
  {
    id: "REDES",
    nome: "Redes sociais",
    desc: "Links para Instagram, Facebook, YouTube…",
    icone: "Share2",
    padrao: { titulo: "Seguinos", itens: [] },
    campos: [
      { k: "titulo", rotulo: "Título", tipo: "texto" },
      {
        k: "itens",
        rotulo: "Redes",
        tipo: "lista",
        max: 6,
        campos: [
          { k: "nome", rotulo: "Nome (ex.: Instagram)", tipo: "texto" },
          { k: "link", rotulo: "Link", tipo: "link" },
        ],
      },
    ],
  },
  {
    id: "ESPACO",
    nome: "Espaço / linha",
    desc: "Respiro entre blocos, com ou sem linha.",
    icone: "SeparatorHorizontal",
    padrao: { altura: 24, linha: "nenhuma" },
    campos: [
      { k: "altura", rotulo: "Altura (px)", tipo: "numero" },
      {
        k: "linha",
        rotulo: "Linha",
        tipo: "select",
        opcoes: [
          ["nenhuma", "Sem linha"],
          ["linha", "Linha"],
          ["pontos", "Pontilhada"],
        ],
      },
    ],
  },
];
export const tipoEmail = (id: string) => TIPOS_EMAIL.find((t) => t.id === id);

export const FONTES_PRODUTOS: Array<[string, string]> = [
  ["ofertas", "Em oferta (promoção ou campanha)"],
  ["campanha", "Destaques da Black Friday / campanha no ar"],
  ["categoria", "De uma categoria"],
  ["marca", "De uma marca"],
  ["novos", "Recém-precificadas"],
  ["manual", "Escolhidas à mão"],
];

let seq = 0;
export const novoIdBloco = () =>
  `b${Date.now().toString(36)}${(seq++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
export const novoBloco = (tipo: string, d: Record<string, any> = {}): BlocoEmail => ({
  id: novoIdBloco(),
  tipo,
  d: { ...structuredClone(tipoEmail(tipo)?.padrao ?? {}), ...d },
});

// ---------------------------------------------------------------- textos fixos
const L = {
  es: {
    lema: "Repuestos agrícolas · Uruguay",
    codigo: "TU CÓDIGO",
    valido: "Válido",
    dias: "DÍAS",
    horas: "HORAS",
    min: "MIN",
    pedir: "Pedir ahora",
    cotizar: "Cotizar",
    cod: "Cód",
    rodape: "Recibís este e-mail porque tenés una cuenta en",
    baixa: "Darme de baja de estos e-mails",
    zap: "Cotizar por WhatsApp",
    empieza: "Empieza",
    exemplo: "Las piezas se eligen solas al enviar el e-mail",
  },
  pt: {
    lema: "Peças agrícolas · Uruguai e RS",
    codigo: "SEU CÓDIGO",
    valido: "Válido",
    dias: "DIAS",
    horas: "HORAS",
    min: "MIN",
    pedir: "Pedir agora",
    cotizar: "Orçar",
    cod: "Cód",
    rodape: "Você recebe este e-mail porque tem uma conta na",
    baixa: "Cancelar o recebimento destes e-mails",
    zap: "Orçar pelo WhatsApp",
    empieza: "Começa",
    exemplo: "As peças são escolhidas sozinhas no envio",
  },
};

// ---------------------------------------------------------------- utilidades de cor
const hex6 = (v: unknown, padrao: string) =>
  typeof v === "string" && /^#[0-9a-f]{6}$/i.test(v) ? v : padrao;
export function luz(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
// Texto legível sobre uma cor
export const sobre = (hex: string) => (luz(hex) > 0.45 ? "#111111" : "#ffffff");

const FONTES = {
  moderna: "'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
  classica: "Georgia,'Times New Roman',serif",
  impacto: "'Arial Black','Segoe UI Black',Impact,Helvetica,Arial,sans-serif",
};
const CORPO = "font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

type Ctx = {
  c: ConteudoEmail;
  d: DadosRender;
  t: TemaEmail;
  cor: string; // cor principal (botões, links)
  l: (typeof L)["es"];
  escuro: boolean;
  ft: string; // font-family dos títulos
};

const linha = (conteudo: string, pad = "0 30px") =>
  `<tr><td style="padding:${pad}">${conteudo}</td></tr>`;
const tabela = (miolo: string, estilo = "") =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="${estilo}">${miolo}</table>`;

function botao(
  x: Ctx,
  texto: string,
  href: string,
  o: { cor?: string; estilo?: string; alinhar?: string } = {},
) {
  if (!texto) return "";
  const fundo = hex6(o.cor, x.cor);
  const contorno = o.estilo === "contorno";
  const largo = o.estilo === "largo";
  const corTexto = contorno ? fundo : sobre(fundo);
  const r = Math.min(x.t.cantos, 14);
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" ${largo ? 'width="100%"' : ""} style="margin:0 ${o.alinhar === "left" ? "auto 0 0" : "auto"}"><tr><td align="center" style="border-radius:${r}px;${contorno ? `border:2px solid ${fundo}` : `background:${fundo}`}">
<a href="${esc(href)}" style="display:${largo ? "block" : "inline-block"};padding:15px 30px;${CORPO};font-size:16px;font-weight:800;color:${corTexto};text-decoration:none;border-radius:${r}px">${esc(texto)}</a>
</td></tr></table>`;
}

const selo = (x: Ctx, s: string, fundo?: string) => {
  const bg = fundo ?? x.t.destaque;
  return s
    ? `<span style="display:inline-block;background:${bg};color:${sobre(bg)};${CORPO};font-size:12px;font-weight:800;letter-spacing:1.5px;padding:6px 12px;border-radius:999px;text-transform:uppercase">${esc(s)}</span>`
    : "";
};

const link = (x: Ctx, u: string) => (u ? comUtm(u, x.d) : "");

function img(x: Ctx, src: string, alt: string, estilo = "") {
  const u = urlAbsoluta(src, x.d.origem);
  return `<img src="${esc(u)}" alt="${esc(alt)}" width="600" style="display:block;width:100%;height:auto;border:0;${estilo}">`;
}

function quando(iso: string, idioma: "es" | "pt") {
  const dt = new Date(iso);
  if (!Number.isFinite(dt.getTime())) return "";
  try {
    return dt.toLocaleString(idioma === "pt" ? "pt-BR" : "es-UY", {
      timeZone: "America/Montevideo",
      weekday: "long",
      day: "numeric",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dt.toISOString().slice(0, 16).replace("T", " ");
  }
}

// ---------------------------------------------------------------- cada bloco
function cartaoProduto(x: Ctx, p: ProdutoEmail, b: BlocoEmail, larg: string, cols: number) {
  const href = link(x, `/produto/${encodeURIComponent(p.sku)}`);
  const fotos = !!b.d.fotos;
  const imgUrl =
    fotos && p.imagem && !fotoInvalida(p.imagem) ? urlAbsoluta(p.imagem, x.d.origem) : "";
  const fundo = x.escuro ? x.t.suave : "#ffffff";
  const borda = x.escuro ? x.t.suave : "#e4e4e7";
  const altura = cols === 3 ? 110 : 150;
  const mostraPreco = b.d.precos !== false && p.preco;
  const vermelho = x.escuro ? "#f87171" : "#dc2626";
  const r = Math.min(x.t.cantos, 16);
  return `<td ${cols === 3 ? 'class="col" ' : ""}width="${larg}" valign="top" style="padding:6px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${fundo};border:1px solid ${borda};border-radius:${r}px">
<tr><td align="center" style="padding:12px 12px 0"><a href="${esc(href)}" style="text-decoration:none">${
    imgUrl
      ? `<img src="${esc(imgUrl)}" alt="${esc(p.nome)}" width="200" style="display:block;width:100%;max-width:200px;height:${altura}px;object-fit:contain;border:0">`
      : tabela(
          `<tr><td align="center" style="height:${altura - 30}px;background:${x.escuro ? "#000000" : x.t.suave};border-radius:${Math.max(r - 4, 0)}px;${CORPO}"><p style="margin:0;font-size:10px;font-weight:700;letter-spacing:1.5px;color:${x.escuro ? "#a1a1aa" : "#71717a"}">${x.l.cod.toUpperCase()}</p><p style="margin:4px 0 0;font-size:${cols === 3 ? 15 : 18}px;font-weight:800;word-break:break-all;color:${x.escuro ? x.t.destaque : x.cor}">${esc(p.codigo || p.sku)}</p></td></tr>`,
        )
  }</a></td></tr>
<tr><td style="padding:10px 12px 14px;${CORPO}">
<p style="margin:0;font-size:${cols === 3 ? 13 : 14}px;font-weight:700;line-height:1.35;color:${x.t.titulo}">${esc(p.nome)}</p>
${imgUrl && p.codigo ? `<p style="margin:4px 0 0;font-size:12px;color:#a1a1aa">${x.l.cod}: ${esc(p.codigo)}</p>` : ""}
${
  mostraPreco
    ? `<p style="margin:8px 0 0">${p.precoDe ? `<span style="font-size:12px;color:#a1a1aa;text-decoration:line-through">${esc(p.precoDe)}</span> ` : ""}${p.selo ? `<span style="display:inline-block;background:${x.escuro ? x.t.destaque : "#dc2626"};color:${x.escuro ? "#000000" : "#ffffff"};font-size:11px;font-weight:800;padding:2px 6px;border-radius:6px">${esc(p.selo)}</span>` : ""}</p>
<p style="margin:2px 0 0;font-size:${cols === 3 ? 18 : 22}px;font-weight:800;color:${p.precoDe ? vermelho : x.t.titulo}">${esc(p.preco!)}</p>`
    : ""
}
<p style="margin:10px 0 0"><a href="${esc(href)}" style="font-size:13px;font-weight:800;color:${x.escuro ? x.t.destaque : x.cor};text-decoration:none">${esc(b.d.botao || (mostraPreco ? x.l.pedir : x.l.cotizar))} &rarr;</a></p>
</td></tr></table></td>`;
}

function produtos(x: Ctx, b: BlocoEmail) {
  const resolvidos = x.d.produtosBloco?.[b.id];
  const lista: ProdutoEmail[] = (resolvidos ?? (b.d.fonte === "manual" ? b.d.produtos : []) ?? [])
    .filter(Boolean)
    .slice(0, Math.min(12, Math.max(1, Number(b.d.limite) || 6)));
  const titulo = b.d.titulo
    ? `<p style="margin:0 6px 10px;${CORPO};font-size:13px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:${x.escuro ? x.t.destaque : x.cor}">${esc(b.d.titulo)}</p>`
    : "";
  if (!lista.length) {
    // Prévia antes de buscar as peças; no envio, sem peças o bloco não aparece
    if (resolvidos || !x.d.campanha || x.d.campanha !== "previa") return "";
    return linha(
      titulo +
        tabela(
          `<tr><td align="center" style="padding:26px;border:2px dashed ${x.t.suave};border-radius:12px;${CORPO};font-size:13px;color:#a1a1aa">${x.l.exemplo}</td></tr>`,
        ),
      "8px 24px",
    );
  }
  const cols = lista.length === 1 ? 1 : Math.min(3, Math.max(1, Number(b.d.colunas) || 2));
  const larg = cols === 1 ? "100%" : cols === 2 ? "50%" : "33.33%";
  const linhas: string[] = [];
  for (let i = 0; i < lista.length; i += cols) {
    const grupo = lista.slice(i, i + cols);
    const vazios = cols - grupo.length;
    linhas.push(
      `<tr>${grupo.map((p) => cartaoProduto(x, p, b, larg, cols)).join("")}${vazios ? `<td class="col" width="${larg}"></td>`.repeat(vazios) : ""}</tr>`,
    );
  }
  return linha(titulo + tabela(linhas.join("")), "8px 24px");
}

function contagem(x: Ctx, b: BlocoEmail) {
  const alvo = new Date(b.d.alvo || "").getTime();
  if (!Number.isFinite(alvo)) return "";
  const fundo = hex6(b.d.cor_fundo, x.escuro ? "#000000" : x.t.topo);
  const corTxt = sobre(fundo);
  const ouro = luz(fundo) < 0.2 ? x.t.destaque : corTxt;
  const falta = alvo - (x.d.agora ?? Date.now());
  const r = Math.min(x.t.cantos, 16);
  let miolo: string;
  if (falta <= 0) {
    miolo = `<p style="margin:0;font-family:${x.ft};font-size:28px;font-weight:900;color:${ouro}">${esc(b.d.depois || "")}</p>`;
  } else {
    const dias = Math.floor(falta / 86400000);
    const horas = Math.floor((falta % 86400000) / 3600000);
    const min = Math.floor((falta % 3600000) / 60000);
    const caixa = (n: number, rot: string) =>
      `<td align="center" width="33%" style="padding:0 5px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="background:${luz(fundo) < 0.2 ? "#1c1c1f" : "rgba(255,255,255,0.14)"};border-radius:${Math.max(r - 4, 4)}px;padding:14px 4px"><p style="margin:0;font-family:${x.ft};font-size:40px;line-height:1;font-weight:900;color:${ouro}">${String(n).padStart(2, "0")}</p><p style="margin:6px 0 0;${CORPO};font-size:11px;font-weight:800;letter-spacing:2px;color:${corTxt};opacity:.8">${rot}</p></td></tr></table></td>`;
    miolo = `${tabela(`<tr>${caixa(dias, x.l.dias)}${caixa(horas, x.l.horas)}${caixa(min, x.l.min)}</tr>`)}
<p style="margin:12px 0 0;${CORPO};font-size:13px;color:${corTxt};opacity:.85">${x.l.empieza}: ${esc(quando(b.d.alvo, x.t.idioma))}</p>`;
  }
  return linha(
    tabela(
      `<tr><td align="center" style="padding:24px 18px">${b.d.titulo ? `<p style="margin:0 0 14px;${CORPO};font-size:13px;font-weight:800;letter-spacing:2px;text-transform:uppercase;color:${corTxt}">${esc(b.d.titulo)}</p>` : ""}${miolo}</td></tr>`,
      `background:${fundo};border-radius:${r}px`,
    ),
    "12px 24px",
  );
}

function cupom(x: Ctx, b: BlocoEmail) {
  const pessoal = b.d.pessoal ? x.d.vars?.mi_cupon : "";
  const codigo = String(pessoal || b.d.codigo || "").trim();
  if (!codigo) return "";
  const escuro = b.d.estilo === "escuro";
  const fundo = escuro ? "#0f0f10" : x.escuro ? x.t.suave : "#fffbeb";
  const corCod = escuro || x.escuro ? x.t.destaque : x.cor;
  const corTxt = escuro || x.escuro ? "#e4e4e7" : "#3f3f46";
  const borda = escuro ? `2px solid ${x.t.destaque}` : `2px dashed ${corCod}`;
  return linha(
    tabela(
      `<tr><td align="center" style="padding:22px 16px;${CORPO}">
${b.d.texto ? `<p style="margin:0 0 8px;font-size:15px;font-weight:700;color:${corTxt}">${esc(b.d.texto)}</p>` : ""}
<p style="margin:0;font-size:12px;font-weight:800;letter-spacing:2px;color:#a1a1aa">${x.l.codigo}</p>
<p style="margin:6px 0 0;font-family:'Courier New',monospace;font-size:34px;font-weight:800;letter-spacing:4px;color:${corCod}">${esc(codigo)}</p>
${b.d.validade ? `<p style="margin:8px 0 0;font-size:12px;color:#a1a1aa">${x.l.valido} ${esc(b.d.validade)}</p>` : ""}
${b.d.botao && b.d.link ? `<div style="margin-top:14px">${botao(x, b.d.botao, link(x, b.d.link))}</div>` : ""}
</td></tr>`,
      `border:${borda};border-radius:${Math.min(x.t.cantos, 16)}px;background:${fundo}`,
    ),
    "10px 30px",
  );
}

function hero(x: Ctx, b: BlocoEmail) {
  const fundo = hex6(b.d.cor_fundo, x.t.topo === x.t.cartao ? x.cor : x.t.topo);
  const foto = b.d.imagem ? urlAbsoluta(b.d.imagem, x.d.origem) : "";
  const corTxt = foto ? "#ffffff" : sobre(fundo);
  const al = b.d.alinhar === "left" ? "left" : "center";
  const pad = b.d.altura === "alta" ? "64px 34px" : "40px 30px";
  const bg = foto
    ? `background-color:${fundo};background-image:linear-gradient(rgba(0,0,0,.55),rgba(0,0,0,.55)),url('${esc(foto)}');background-size:cover;background-position:center`
    : `background:${fundo}`;
  const destaqueTitulo = luz(fundo) < 0.2 && !foto ? x.t.destaque : corTxt;
  return `<tr><td align="${al}" ${foto ? `background="${esc(foto)}"` : ""} bgcolor="${fundo}" style="${bg};padding:${pad};text-align:${al}">
${selo(x, b.d.selo)}
<h1 style="margin:${b.d.selo ? "16px" : "0"} 0 12px;font-family:${x.ft};font-size:${b.d.altura === "alta" ? 38 : 32}px;line-height:1.15;font-weight:900;color:${destaqueTitulo}">${esc(b.d.titulo || "")}</h1>
${b.d.texto ? `<p style="margin:0 0 22px;${CORPO};font-size:17px;line-height:1.55;color:${corTxt};opacity:.92">${esc(b.d.texto).replace(/\n/g, "<br>")}</p>` : ""}
${b.d.botao && b.d.link ? botao(x, b.d.botao, link(x, b.d.link), { alinhar: al, cor: luz(fundo) < 0.2 ? x.t.destaque : x.cor === fundo ? "#ffffff" : x.cor }) : ""}
</td></tr>`;
}

function blocoHtml(x: Ctx, b: BlocoEmail): string {
  const d = b.d;
  switch (b.tipo) {
    case "AVISO": {
      if (!d.texto) return "";
      const bg = hex6(d.cor_fundo, x.t.destaque);
      const cor = hex6(d.cor_texto, sobre(bg));
      const t = `<span style="${CORPO};font-size:13px;font-weight:800;letter-spacing:1px;color:${cor};text-decoration:none">${esc(d.texto)}</span>`;
      return `<tr><td align="center" bgcolor="${bg}" style="background:${bg};padding:10px 16px">${d.link ? `<a href="${esc(link(x, d.link))}" style="text-decoration:none">${t}</a>` : t}</td></tr>`;
    }
    case "HERO":
      return hero(x, b);
    case "IMAGEM": {
      if (!d.imagem) return "";
      const r = d.arredondar ? `border-radius:${x.t.cantos}px` : "";
      const im = img(x, d.imagem, d.alt || "AGRO PARTS", r);
      return `<tr><td style="padding:${d.margem ? "12px 24px" : "0"}">${d.link ? `<a href="${esc(link(x, d.link))}">${im}</a>` : im}</td></tr>`;
    }
    case "TITULO": {
      const tam = d.tamanho === "g" ? 32 : d.tamanho === "p" ? 20 : 26;
      const al = d.alinhar === "center" ? "center" : "left";
      return linha(
        `<div style="text-align:${al}">${selo(x, d.selo)}<h2 style="margin:${d.selo ? "12px" : "0"} 0 0;font-family:${x.ft};font-size:${tam}px;line-height:1.2;font-weight:900;color:${x.t.titulo}">${esc(d.texto || "")}</h2></div>`,
        "26px 30px 12px",
      );
    }
    case "TEXTO": {
      if (!d.texto) return "";
      const tam = Number(d.tamanho) || 16;
      return linha(
        `<div style="text-align:${d.alinhar === "center" ? "center" : "left"}">${formatarTexto(d.texto, x.d, x.escuro ? x.t.destaque : x.cor, `${CORPO};font-size:${tam}px;line-height:1.65;color:${x.t.texto}`)}</div>`,
        "6px 30px 2px",
      );
    }
    case "BOTAO":
      return d.texto && d.link
        ? linha(
            botao(x, d.texto, link(x, d.link), {
              cor: d.cor || (x.escuro ? x.t.destaque : undefined),
              estilo: d.estilo,
            }),
            "14px 30px",
          )
        : "";
    case "CUPOM":
      return cupom(x, b);
    case "CONTAGEM":
      return contagem(x, b);
    case "PRODUTOS":
      return produtos(x, b);
    case "CATEGORIAS": {
      const itens = (d.itens ?? []).filter((i: any) => i?.nome);
      if (!itens.length) return "";
      const cols = Number(d.colunas) === 2 ? 2 : 3;
      const larg = cols === 2 ? "50%" : "33.33%";
      const rows: string[] = [];
      for (let i = 0; i < itens.length; i += cols) {
        const g = itens.slice(i, i + cols);
        rows.push(
          `<tr>${g
            .map(
              (it: any) =>
                `<td width="${larg}" style="padding:5px"><a href="${esc(link(x, it.link || "/loja"))}" style="display:block;text-decoration:none;background:${x.t.suave};border-radius:${Math.min(x.t.cantos, 14)}px;padding:16px 8px;text-align:center;${CORPO}"><span style="display:block;font-size:28px;line-height:1">${esc(it.emoji || "🔧")}</span><span style="display:block;margin-top:8px;font-size:13px;font-weight:800;color:${x.t.titulo}">${esc(it.nome)}</span></a></td>`,
            )
            .join("")}${`<td width="${larg}"></td>`.repeat(cols - g.length)}</tr>`,
        );
      }
      return linha(
        (d.titulo
          ? `<p style="margin:0 5px 10px;${CORPO};font-size:13px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:${x.escuro ? x.t.destaque : x.cor}">${esc(d.titulo)}</p>`
          : "") + tabela(rows.join("")),
        "12px 25px",
      );
    }
    case "BENEFICIOS": {
      const itens = (d.itens ?? []).filter((i: any) => i?.titulo).slice(0, 4);
      if (!itens.length) return "";
      const larg = `${(100 / itens.length).toFixed(2)}%`;
      return linha(
        tabela(
          `<tr>${itens
            .map(
              (it: any) =>
                `<td class="col" width="${larg}" align="center" valign="top" style="padding:14px 6px;${CORPO}"><p style="margin:0;font-size:26px;line-height:1">${esc(it.emoji || "✅")}</p><p style="margin:8px 0 0;font-size:14px;font-weight:800;color:${x.t.titulo}">${esc(it.titulo)}</p>${it.texto ? `<p style="margin:3px 0 0;font-size:12px;color:${x.t.texto};opacity:.85">${esc(it.texto)}</p>` : ""}</td>`,
            )
            .join("")}</tr>`,
          `background:${x.t.suave};border-radius:${Math.min(x.t.cantos, 16)}px`,
        ),
        "12px 24px",
      );
    }
    case "DUAS_COLUNAS": {
      const foto = d.imagem
        ? `<td class="col" width="46%" valign="middle" style="padding:6px">${img(x, d.imagem, d.titulo || "", `border-radius:${Math.min(x.t.cantos, 16)}px`)}</td>`
        : "";
      const texto = `<td class="col" valign="middle" style="padding:6px 12px;${CORPO}"><h3 style="margin:0 0 8px;font-family:${x.ft};font-size:21px;line-height:1.25;font-weight:900;color:${x.t.titulo}">${esc(d.titulo || "")}</h3>${d.texto ? `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:${x.t.texto}">${esc(d.texto).replace(/\n/g, "<br>")}</p>` : ""}${d.botao && d.link ? botao(x, d.botao, link(x, d.link), { alinhar: "left", cor: x.escuro ? x.t.destaque : undefined }) : ""}</td>`;
      return linha(
        tabela(`<tr>${d.lado === "dir" ? texto + foto : foto + texto}</tr>`),
        "14px 24px",
      );
    }
    case "PASSOS": {
      const itens = (d.itens ?? []).filter((i: any) => i?.titulo);
      if (!itens.length) return "";
      const bola = x.escuro ? x.t.destaque : x.cor;
      return linha(
        (d.titulo
          ? `<h3 style="margin:0 0 12px;font-family:${x.ft};font-size:21px;font-weight:900;color:${x.t.titulo}">${esc(d.titulo)}</h3>`
          : "") +
          tabela(
            itens
              .map(
                (it: any, i: number) =>
                  `<tr><td width="44" valign="top" style="padding:6px 0"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" width="34" height="34" style="width:34px;height:34px;border-radius:17px;background:${bola};${CORPO};font-size:16px;font-weight:900;color:${sobre(bola)}">${i + 1}</td></tr></table></td><td valign="top" style="padding:6px 0;${CORPO}"><p style="margin:5px 0 0;font-size:15px;font-weight:800;color:${x.t.titulo}">${esc(it.titulo)}</p>${it.texto ? `<p style="margin:2px 0 0;font-size:14px;line-height:1.5;color:${x.t.texto}">${esc(it.texto)}</p>` : ""}</td></tr>`,
              )
              .join(""),
          ),
        "16px 30px",
      );
    }
    case "DEPOIMENTO": {
      if (!d.texto) return "";
      const n = Math.max(0, Math.min(5, Math.round(Number(d.estrelas) || 0)));
      return linha(
        tabela(
          `<tr><td style="padding:22px;${CORPO}">${n ? `<p style="margin:0 0 8px;font-size:18px;letter-spacing:2px;color:${x.t.destaque === "#18181b" ? "#f59e0b" : x.t.destaque}">${"★".repeat(n)}</p>` : ""}<p style="margin:0;font-family:Georgia,serif;font-size:17px;font-style:italic;line-height:1.55;color:${x.t.titulo}">“${esc(d.texto)}”</p>${d.autor ? `<p style="margin:10px 0 0;font-size:13px;font-weight:800;color:${x.t.texto}">${esc(d.autor)}${d.local ? ` · <span style="font-weight:400">${esc(d.local)}</span>` : ""}</p>` : ""}</td></tr>`,
          `background:${x.t.suave};border-left:4px solid ${x.escuro ? x.t.destaque : x.cor};border-radius:${Math.min(x.t.cantos, 12)}px`,
        ),
        "12px 30px",
      );
    }
    case "WHATSAPP": {
      if (!x.d.whatsappUrl) return "";
      return linha(
        tabela(
          `<tr><td align="center" style="padding:22px 18px;${CORPO}">${d.titulo ? `<p style="margin:0;font-size:18px;font-weight:900;color:${x.t.titulo}">${esc(d.titulo)}</p>` : ""}${d.texto ? `<p style="margin:6px 0 14px;font-size:14px;color:${x.t.texto}">${esc(d.texto)}</p>` : ""}${botao(x, d.botao || x.l.zap, x.d.whatsappUrl, { cor: "#25D366" })}</td></tr>`,
          `background:${x.escuro ? x.t.suave : "#ecfdf3"};border-radius:${Math.min(x.t.cantos, 16)}px`,
        ),
        "12px 24px",
      );
    }
    case "VIDEO": {
      if (!d.imagem || !d.link) return "";
      const href = link(x, d.link);
      return linha(
        `<a href="${esc(href)}" style="text-decoration:none">${img(x, d.imagem, d.titulo || "Video", `border-radius:${Math.min(x.t.cantos, 16)}px`)}</a><div style="margin-top:12px">${botao(x, `▶  ${d.titulo || "Video"}`, href, { cor: x.escuro ? x.t.destaque : undefined })}</div>`,
        "12px 24px",
      );
    }
    case "REDES": {
      const itens = (d.itens ?? []).filter((i: any) => i?.nome && i?.link);
      if (!itens.length) return "";
      return linha(
        `<div style="text-align:center;${CORPO}">${d.titulo ? `<p style="margin:0 0 10px;font-size:13px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;color:${x.t.texto}">${esc(d.titulo)}</p>` : ""}${itens
          .map(
            (it: any) =>
              `<a href="${esc(link(x, it.link))}" style="display:inline-block;margin:3px;padding:8px 14px;border-radius:999px;background:${x.t.suave};font-size:13px;font-weight:800;color:${x.t.titulo};text-decoration:none">${esc(it.nome)}</a>`,
          )
          .join("")}</div>`,
        "14px 30px",
      );
    }
    case "ESPACO": {
      const h = Math.max(4, Math.min(120, Number(d.altura) || 24));
      const borda =
        d.linha === "linha"
          ? `border-top:1px solid ${x.escuro ? "#27272a" : "#e4e4e7"}`
          : d.linha === "pontos"
            ? `border-top:2px dotted ${x.escuro ? "#3f3f46" : "#d4d4d8"}`
            : "";
      return `<tr><td style="padding:${Math.floor(h / 2)}px 30px"><div style="${borda};font-size:0;line-height:0">&nbsp;</div></td></tr>`;
    }
  }
  return "";
}

// Troca {{nombre}}, {{departamento}}, {{mi_cupon}}… em todos os textos dos blocos
export function blocosDoCliente(blocos: BlocoEmail[], d: DadosRender) {
  return blocos
    .filter((b) => !b.oculto)
    .map((b) => ({
      ...b,
      d: trocarEmTudo(b.d, (s) => trocarVariaveis(personalizar(s, d.nome), d.vars ?? {})),
    }));
}

export function renderBlocos(c: ConteudoEmail, d: DadosRender): string {
  const t = temaDe(c);
  const cor = hex6(c.cor, TEMA_PADRAO.topo);
  const x: Ctx = {
    c,
    d,
    t,
    cor,
    l: L[t.idioma === "pt" ? "pt" : "es"],
    escuro: luz(hex6(t.cartao, "#ffffff")) < 0.2,
    ft: FONTES[t.fonte] ?? FONTES.moderna,
  };
  const blocos = blocosDoCliente(c.blocos ?? [], d);
  const preheader = personalizar(d.preheader || "", d.nome);
  const titulo =
    blocos.find((b) => b.tipo === "HERO" || b.tipo === "TITULO")?.d?.[
      blocos.find((b) => b.tipo === "HERO") ? "titulo" : "texto"
    ] ?? "AGRO PARTS";
  const corpo = blocos.map((b) => blocoHtml(x, b)).join("\n");
  const topoBorda = luz(t.topo) > 0.9 ? `border-bottom:1px solid #e4e4e7;` : "";
  return `<!doctype html>
<html lang="${t.idioma}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="${x.escuro ? "dark" : "light"}">
<title>${esc(String(titulo))}</title>
<style>@media (max-width:620px){.col{display:block!important;width:100%!important;box-sizing:border-box}.sem-cel{display:none!important}h1{font-size:28px!important}}</style></head>
<body style="margin:0;padding:0;background:${t.fundo}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${t.fundo}" style="background:${t.fundo}"><tr><td align="center" style="padding:20px 10px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${t.cartao}" style="max-width:600px;background:${t.cartao};border-radius:${t.cantos}px;overflow:hidden">
<tr><td bgcolor="${t.topo}" style="background:${t.topo};padding:16px 22px;${topoBorda}">
${tabela(`<tr>
<td style="white-space:nowrap"><a href="${esc(comUtm("/", d))}" style="text-decoration:none"><img src="${esc(d.origem)}/logo.png" alt="AGRO PARTS" width="40" height="40" style="display:inline-block;vertical-align:middle;border:0;border-radius:8px">
<span style="font-family:${x.ft};font-size:19px;font-weight:900;color:${t.topoTexto};vertical-align:middle;margin-left:8px">AGRO PARTS</span></a></td>
<td class="sem-cel" align="right" style="${CORPO};font-size:12px;color:${t.topoTexto};opacity:.75">${x.l.lema}</td>
</tr>`)}</td></tr>
${corpo}
${
  d.anuncio && !c.semAnuncio
    ? anuncioHtml(d.anuncio, d, {
        cor: x.escuro ? t.destaque : cor,
        fundo: t.suave,
        titulo: t.titulo,
        texto: t.texto,
        rotulo: t.idioma === "pt" ? "Destaque" : "Destacado",
      })
    : ""
}
<tr><td style="height:26px;font-size:0;line-height:0">&nbsp;</td></tr>
</table>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px"><tr><td style="padding:18px 20px;${CORPO};font-size:12px;line-height:1.6;color:${x.escuro ? "#a1a1aa" : "#71717a"};text-align:center">
${x.l.rodape} <a href="${esc(comUtm("/", d))}" style="color:inherit">AGRO PARTS</a>.${d.enderecoRodape ? `<br>${esc(d.enderecoRodape)}` : ""}
${d.urlBaixa ? `<br><a href="${esc(d.urlBaixa)}" style="color:inherit;text-decoration:underline">${x.l.baixa}</a>` : ""}
</td></tr></table>
</td></tr></table>
</body></html>`;
}

// Versão em texto puro
export function textoBlocos(c: ConteudoEmail, d: DadosRender): string {
  const t = temaDe(c);
  const l = L[t.idioma === "pt" ? "pt" : "es"];
  const limpo = (s: string) =>
    String(s ?? "")
      .replace(/\*\*(.+?)\*\*/g, "$1")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, a, u) => `${a} (${comUtm(u, d)})`);
  const partes: string[] = [];
  for (const b of blocosDoCliente(c.blocos ?? [], d)) {
    const x = b.d;
    switch (b.tipo) {
      case "AVISO":
        partes.push(x.texto);
        break;
      case "HERO":
        partes.push(
          [x.selo, x.titulo, x.texto, x.botao && x.link ? `${x.botao}: ${comUtm(x.link, d)}` : ""]
            .filter(Boolean)
            .join("\n"),
        );
        break;
      case "TITULO":
        partes.push(x.texto);
        break;
      case "TEXTO":
        partes.push(limpo(x.texto));
        break;
      case "BOTAO":
      case "VIDEO":
        if (x.link) partes.push(`${x.texto || x.titulo}: ${comUtm(x.link, d)}`);
        break;
      case "CUPOM": {
        const cod = (x.pessoal && d.vars?.mi_cupon) || x.codigo;
        if (cod)
          partes.push(
            [x.texto, `${l.codigo}: ${cod}`, x.validade ? `${l.valido} ${x.validade}` : ""]
              .filter(Boolean)
              .join("\n"),
          );
        break;
      }
      case "CONTAGEM":
        if (x.alvo) partes.push(`${x.titulo}: ${quando(x.alvo, t.idioma)}`);
        break;
      case "PRODUTOS": {
        const lista: ProdutoEmail[] =
          d.produtosBloco?.[b.id] ?? (x.fonte === "manual" ? x.produtos : []) ?? [];
        if (lista.length)
          partes.push(
            [
              x.titulo,
              ...lista
                .slice(0, 12)
                .map(
                  (p) =>
                    `- ${p.nome}${p.codigo ? ` (${l.cod}: ${p.codigo})` : ""}${x.precos !== false && p.preco ? ` · ${p.preco}` : ""}: ${comUtm(`/produto/${encodeURIComponent(p.sku)}`, d)}`,
                ),
            ]
              .filter(Boolean)
              .join("\n"),
          );
        break;
      }
      case "CATEGORIAS":
        partes.push(
          [
            x.titulo,
            ...(x.itens ?? []).map((i: any) => `- ${i.nome}: ${comUtm(i.link || "/loja", d)}`),
          ]
            .filter(Boolean)
            .join("\n"),
        );
        break;
      case "BENEFICIOS":
        partes.push((x.itens ?? []).map((i: any) => `${i.emoji ?? ""} ${i.titulo}`).join(" · "));
        break;
      case "DUAS_COLUNAS":
        partes.push(
          [x.titulo, x.texto, x.botao && x.link ? `${x.botao}: ${comUtm(x.link, d)}` : ""]
            .filter(Boolean)
            .join("\n"),
        );
        break;
      case "PASSOS":
        partes.push(
          [
            x.titulo,
            ...(x.itens ?? []).map(
              (i: any, k: number) => `${k + 1}. ${i.titulo}: ${i.texto ?? ""}`,
            ),
          ]
            .filter(Boolean)
            .join("\n"),
        );
        break;
      case "DEPOIMENTO":
        if (x.texto) partes.push(`“${x.texto}” ${x.autor ? `— ${x.autor}` : ""}`);
        break;
      case "WHATSAPP":
        if (d.whatsappUrl) partes.push(`${x.titulo ?? ""}\n${x.botao || l.zap}: ${d.whatsappUrl}`);
        break;
      case "REDES":
        partes.push((x.itens ?? []).map((i: any) => `${i.nome}: ${i.link}`).join("\n"));
        break;
    }
  }
  if (d.anuncio && !c.semAnuncio)
    partes.push(
      `${d.anuncio.titulo}${d.anuncio.texto ? `\n${d.anuncio.texto}` : ""}\n${linkAnuncio(d.anuncio, d)}`,
    );
  partes.push(`AGRO PARTS · ${l.lema}`);
  if (d.urlBaixa) partes.push(`${l.baixa}: ${d.urlBaixa}`);
  return partes.filter((p) => p && String(p).trim()).join("\n\n");
}

// Campanha antiga (formulário fixo) → blocos, para continuar editando no construtor
export function paraBlocos(c: ConteudoEmail): BlocoEmail[] {
  const b: BlocoEmail[] = [];
  if (c.cabecalho)
    b.push(novoBloco("IMAGEM", { imagem: c.cabecalho, link: c.cabecalhoLink ?? "" }));
  b.push(novoBloco("TITULO", { selo: c.destaque ?? "", texto: c.titulo, tamanho: "m" }));
  if (c.texto) b.push(novoBloco("TEXTO", { texto: c.texto }));
  if (c.cupom?.codigo)
    b.push(
      novoBloco("CUPOM", {
        codigo: c.cupom.codigo,
        texto: c.cupom.texto ?? "",
        validade: c.cupom.validade ?? "",
      }),
    );
  if (c.produtos.length)
    b.push(
      novoBloco("PRODUTOS", {
        titulo: c.produtosTitulo ?? "",
        fonte: "manual",
        produtos: c.produtos,
        limite: c.produtos.length,
        fotos: !!c.fotos,
      }),
    );
  if (c.botaoTexto && c.botaoUrl)
    b.push(novoBloco("BOTAO", { texto: c.botaoTexto, link: c.botaoUrl }));
  if (c.whatsapp) b.push(novoBloco("WHATSAPP"));
  return b;
}

// Códigos de cupom fixos usados nos blocos (para conferir se existem antes do envio)
export const cuponsDosBlocos = (blocos: BlocoEmail[] = []) =>
  blocos
    .filter((b) => b.tipo === "CUPOM" && !b.oculto)
    .map((b) => String(b.d.codigo ?? "").trim())
    .filter((c) => c && !c.includes("{{"));
