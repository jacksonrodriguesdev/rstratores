// Construtor da Home (Admin → Construtor da Home): os 15 componentes novos da página inicial.
// Cada um tem nome, descrição, se ocupa a largura toda, configuração inicial e os campos do
// formulário (o admin monta o formulário sozinho a partir daqui). Código puro: roda no site e no admin.
// Textos com "bilingue" guardam espanhol em `k` e português em `k_pt` (vazio = usa o espanhol).

export type Campo =
  | {
      k: string;
      rotulo: string;
      tipo: "texto" | "textarea" | "link" | "imagem" | "datahora" | "numero";
      bilingue?: boolean;
      ajuda?: string;
    }
  | { k: string; rotulo: string; tipo: "cor"; ajuda?: string }
  | { k: string; rotulo: string; tipo: "bool"; ajuda?: string }
  | { k: string; rotulo: string; tipo: "select"; opcoes: Array<[string, string]>; ajuda?: string }
  | { k: string; rotulo: string; tipo: "lista"; campos: Campo[]; max: number; ajuda?: string };

export type TipoBloco = {
  id: string;
  nome: string;
  desc: string;
  icone: string; // nome do ícone (lucide) no admin
  largura: "total" | "container";
  padrao: Record<string, unknown>;
  campos: Campo[];
};

// Paleta da marca (atalhos no seletor de cor)
export const CORES_MARCA: Array<[string, string]> = [
  ["#0b7a3b", "Verde AGRO PARTS"],
  ["#06321b", "Verde escuro"],
  ["#f2c94c", "Amarelo"],
  ["#e0a800", "Ouro"],
  ["#dc2626", "Vermelho"],
  ["#ea580c", "Laranja"],
  ["#0284c7", "Azul"],
  ["#18181b", "Preto"],
  ["#ffffff", "Branco"],
  ["#f4f4f5", "Cinza claro"],
];

const FUNDO: Campo[] = [
  { k: "cor_fundo", rotulo: "Cor de fundo", tipo: "cor" },
  { k: "cor_texto", rotulo: "Cor do texto", tipo: "cor" },
];
const H1: Campo = {
  k: "h1",
  rotulo: "Usar o título como título principal da página (H1)",
  tipo: "bool",
  ajuda: "Só um bloco deve ter isto ligado. O Google lê o H1 como o assunto da página.",
};

export const TIPOS_NOVOS: TipoBloco[] = [
  {
    id: "TICKER",
    nome: "Fita rolante (Ticker)",
    desc: "Faixa com frases passando, como nos canais de notícias. Ótima para avisos e ofertas.",
    icone: "MoveHorizontal",
    largura: "total",
    padrao: {
      itens: [
        {
          texto: "🚚 Envíos a todo Uruguay por DAC",
          texto_pt: "🚚 Envio para todo o Rio Grande do Sul",
        },
        {
          texto: "🔧 Más de 49.000 repuestos con código original",
          texto_pt: "🔧 Mais de 49.000 peças com código original",
        },
        {
          texto: "💬 Cotizá por WhatsApp en minutos",
          texto_pt: "💬 Orçamento pelo WhatsApp em minutos",
        },
      ],
      velocidade: "normal",
      cor_fundo: "#06321b",
      cor_texto: "#ffffff",
      separador: "•",
    },
    campos: [
      {
        k: "itens",
        rotulo: "Frases",
        tipo: "lista",
        max: 12,
        campos: [
          { k: "texto", rotulo: "Texto", tipo: "texto", bilingue: true },
          { k: "link", rotulo: "Link (opcional)", tipo: "link" },
        ],
      },
      {
        k: "velocidade",
        rotulo: "Velocidade",
        tipo: "select",
        opcoes: [
          ["lenta", "Lenta"],
          ["normal", "Normal"],
          ["rapida", "Rápida"],
        ],
      },
      { k: "separador", rotulo: "Separador entre frases", tipo: "texto" },
      ...FUNDO,
    ],
  },
  {
    id: "FITA_PROMO",
    nome: "Faixa de atenção / promoção",
    desc: "Barra chamativa com selo, texto, botão e contagem regressiva opcional.",
    icone: "Megaphone",
    largura: "total",
    padrao: {
      selo: "-15%",
      texto: "Semana del embrague: kits con descuento",
      texto_pt: "Semana da embreagem: kits com desconto",
      botao: "Ver ofertas",
      botao_pt: "Ver ofertas",
      link: "/loja",
      estilo: "gradiente",
      cor_fundo: "#dc2626",
      cor_texto: "#ffffff",
      cor_destaque: "#f2c94c",
    },
    campos: [
      { k: "selo", rotulo: "Selo (ex.: -15%, NUEVO)", tipo: "texto", bilingue: true },
      { k: "texto", rotulo: "Texto", tipo: "texto", bilingue: true },
      { k: "botao", rotulo: "Texto do botão", tipo: "texto", bilingue: true },
      { k: "link", rotulo: "Link do botão", tipo: "link" },
      {
        k: "ate",
        rotulo: "Contagem regressiva até (opcional)",
        tipo: "datahora",
        ajuda: "Depois dessa hora a faixa some sozinha.",
      },
      {
        k: "estilo",
        rotulo: "Estilo",
        tipo: "select",
        opcoes: [
          ["solida", "Cor sólida"],
          ["gradiente", "Degradê"],
          ["listrada", "Listrada (atenção)"],
        ],
      },
      ...FUNDO,
      { k: "cor_destaque", rotulo: "Cor do selo e do botão", tipo: "cor" },
    ],
  },
  {
    id: "HERO_DIVIDIDO",
    nome: "Hero dividido (texto + imagem)",
    desc: "Topo com título grande, texto, dois botões e uma imagem ao lado. Texto real (o Google lê).",
    icone: "PanelsLeftRight",
    largura: "total",
    padrao: {
      selo: "Distribuidor en Uruguay",
      selo_pt: "Envio para todo o RS",
      titulo: "Repuestos para tractores con el código original",
      titulo_pt: "Peças para tratores com o código original",
      texto:
        "Massey Ferguson, Valtra, John Deere, New Holland y más. Te confirmamos la pieza por WhatsApp y enviamos por DAC.",
      texto_pt:
        "Massey Ferguson, Valtra, John Deere, New Holland e mais. Confirmamos a peça pelo WhatsApp e enviamos para todo o RS.",
      botao1: "Ver catálogo",
      botao1_pt: "Ver catálogo",
      link1: "/loja",
      botao2: "Cotizar por WhatsApp",
      botao2_pt: "Orçamento pelo WhatsApp",
      link2: "/cotizar",
      imagem: "",
      lado: "direita",
      fundo: "gradiente",
      cor_fundo: "#06321b",
      cor_texto: "#ffffff",
      cor_destaque: "#f2c94c",
    },
    campos: [
      { k: "selo", rotulo: "Selo acima do título", tipo: "texto", bilingue: true },
      { k: "titulo", rotulo: "Título", tipo: "texto", bilingue: true },
      { k: "texto", rotulo: "Texto", tipo: "textarea", bilingue: true },
      { k: "botao1", rotulo: "Botão principal", tipo: "texto", bilingue: true },
      { k: "link1", rotulo: "Link do botão principal", tipo: "link" },
      { k: "botao2", rotulo: "Botão secundário", tipo: "texto", bilingue: true },
      { k: "link2", rotulo: "Link do botão secundário", tipo: "link" },
      { k: "imagem", rotulo: "Imagem (1000 × 800 px)", tipo: "imagem" },
      {
        k: "lado",
        rotulo: "Lado da imagem",
        tipo: "select",
        opcoes: [
          ["direita", "Direita"],
          ["esquerda", "Esquerda"],
        ],
      },
      {
        k: "fundo",
        rotulo: "Fundo",
        tipo: "select",
        opcoes: [
          ["solido", "Cor sólida"],
          ["gradiente", "Degradê"],
          ["padrao", "Com textura de linhas"],
        ],
      },
      ...FUNDO,
      { k: "cor_destaque", rotulo: "Cor de destaque (selo e botão)", tipo: "cor" },
      H1,
    ],
  },
  {
    id: "HERO_BUSCA",
    nome: "Hero de busca",
    desc: "Topo com uma busca grande por código ou nome e atalhos de buscas populares. Carrega instantâneo.",
    icone: "Search",
    largura: "total",
    padrao: {
      titulo: "¿Qué repuesto buscás?",
      titulo_pt: "Qual peça você procura?",
      texto: "Buscá por código original, nombre o modelo de tractor.",
      texto_pt: "Busque pelo código original, nome ou modelo do trator.",
      placeholder: "Ej.: AL81843, retén, MF 275",
      placeholder_pt: "Ex.: AL81843, retentor, MF 275",
      populares: [
        { texto: "Filtro" },
        { texto: "Rodamiento", texto_pt: "Rolamento" },
        { texto: "Retén", texto_pt: "Retentor" },
        { texto: "Bomba hidráulica" },
        { texto: "Embrague", texto_pt: "Embreagem" },
      ],
      cor_fundo: "#0b7a3b",
      cor_texto: "#ffffff",
    },
    campos: [
      { k: "titulo", rotulo: "Título", tipo: "texto", bilingue: true },
      { k: "texto", rotulo: "Texto", tipo: "texto", bilingue: true },
      { k: "placeholder", rotulo: "Exemplo dentro da busca", tipo: "texto", bilingue: true },
      {
        k: "populares",
        rotulo: "Buscas populares (atalhos)",
        tipo: "lista",
        max: 10,
        campos: [{ k: "texto", rotulo: "Termo", tipo: "texto", bilingue: true }],
      },
      { k: "imagem", rotulo: "Imagem de fundo (opcional)", tipo: "imagem" },
      ...FUNDO,
      H1,
    ],
  },
  {
    id: "HERO_NUMEROS",
    nome: "Hero com números",
    desc: "Topo com título, botão e números de confiança (ex.: +49.000 peças, 19 departamentos).",
    icone: "BarChart3",
    largura: "total",
    padrao: {
      titulo: "El catálogo de repuestos agrícolas más completo de la frontera",
      titulo_pt: "O catálogo de peças agrícolas mais completo da fronteira",
      texto: "Atención por WhatsApp, código original y envío con seguimiento.",
      texto_pt: "Atendimento pelo WhatsApp, código original e envio com rastreio.",
      botao: "Ver catálogo",
      botao_pt: "Ver catálogo",
      link: "/loja",
      numeros: [
        { numero: "49.000+", rotulo: "repuestos", rotulo_pt: "peças" },
        { numero: "19", rotulo: "departamentos con envío", rotulo_pt: "departamentos do Uruguai" },
        { numero: "8", rotulo: "marcas de tractores", rotulo_pt: "marcas de tratores" },
        { numero: "24 h", rotulo: "para despachar", rotulo_pt: "para despachar" },
      ],
      cor_fundo: "#18181b",
      cor_texto: "#ffffff",
      cor_destaque: "#f2c94c",
    },
    campos: [
      { k: "titulo", rotulo: "Título", tipo: "texto", bilingue: true },
      { k: "texto", rotulo: "Texto", tipo: "textarea", bilingue: true },
      { k: "botao", rotulo: "Botão", tipo: "texto", bilingue: true },
      { k: "link", rotulo: "Link do botão", tipo: "link" },
      {
        k: "numeros",
        rotulo: "Números",
        tipo: "lista",
        max: 4,
        campos: [
          { k: "numero", rotulo: "Número", tipo: "texto" },
          { k: "rotulo", rotulo: "Legenda", tipo: "texto", bilingue: true },
        ],
      },
      ...FUNDO,
      { k: "cor_destaque", rotulo: "Cor dos números", tipo: "cor" },
      H1,
    ],
  },
  {
    id: "SLIDE_CATEGORIAS",
    nome: "Slide de categorias",
    desc: "Carrossel das categorias de peças, com link para a página de cada uma (bom para o Google).",
    icone: "LayoutGrid",
    largura: "container",
    padrao: {
      titulo: "Comprá por categoría",
      titulo_pt: "Compre por categoria",
      estilo: "cartoes",
      cor_destaque: "#0b7a3b",
    },
    campos: [
      { k: "titulo", rotulo: "Título", tipo: "texto", bilingue: true },
      {
        k: "estilo",
        rotulo: "Estilo",
        tipo: "select",
        opcoes: [
          ["cartoes", "Cartões com ícone"],
          ["pilulas", "Pílulas"],
          ["circulos", "Círculos"],
        ],
      },
      { k: "cor_destaque", rotulo: "Cor de destaque", tipo: "cor" },
    ],
  },
  {
    id: "SLIDE_MARCAS",
    nome: "Slide de marcas",
    desc: "Marcas de tratores com link para a página de cada marca. Rolagem infinita ou com setas.",
    icone: "Tractor",
    largura: "container",
    padrao: {
      titulo: "Repuestos por marca",
      titulo_pt: "Peças por marca",
      modo: "infinito",
      cor_fundo: "#ffffff",
      cor_texto: "#18181b",
    },
    campos: [
      { k: "titulo", rotulo: "Título", tipo: "texto", bilingue: true },
      {
        k: "modo",
        rotulo: "Movimento",
        tipo: "select",
        opcoes: [
          ["infinito", "Rolagem infinita"],
          ["setas", "Com setas"],
        ],
      },
      {
        k: "logos",
        rotulo: "Logos (opcional: sem logo aparece o nome)",
        tipo: "lista",
        max: 12,
        campos: [
          { k: "marca", rotulo: "Marca (igual ao site)", tipo: "texto" },
          { k: "imagem", rotulo: "Logo", tipo: "imagem" },
        ],
      },
      ...FUNDO,
    ],
  },
  {
    id: "OFERTA_RELAMPAGO",
    nome: "Oferta relâmpago",
    desc: "Contagem regressiva grande + vitrine de peças (por marca ou categoria).",
    icone: "Timer",
    largura: "container",
    padrao: {
      titulo: "Oferta relámpago",
      titulo_pt: "Oferta relâmpago",
      texto: "Precios especiales por tiempo limitado.",
      texto_pt: "Preços especiais por tempo limitado.",
      ate: "",
      marca: "",
      categoria: "",
      limit: 10,
      cor_fundo: "#dc2626",
      cor_texto: "#ffffff",
    },
    campos: [
      { k: "titulo", rotulo: "Título", tipo: "texto", bilingue: true },
      { k: "texto", rotulo: "Texto", tipo: "texto", bilingue: true },
      {
        k: "ate",
        rotulo: "Termina em",
        tipo: "datahora",
        ajuda: "Depois dessa hora o bloco some sozinho.",
      },
      { k: "marca", rotulo: "Marca das peças (vazio = todas)", tipo: "texto" },
      { k: "categoria", rotulo: "Categoria das peças (vazio = todas)", tipo: "texto" },
      { k: "limit", rotulo: "Quantas peças", tipo: "numero" },
      ...FUNDO,
    ],
  },
  {
    id: "ABAS_PRODUTOS",
    nome: "Vitrine em abas",
    desc: "Peças separadas em abas (ex.: Massey · Valtra · John Deere). Uma vitrine, várias escolhas.",
    icone: "Rows3",
    largura: "container",
    padrao: {
      titulo: "Los más buscados por marca",
      titulo_pt: "Os mais procurados por marca",
      abas: [
        { rotulo: "Massey Ferguson", marca: "Massey Ferguson" },
        { rotulo: "Valtra", marca: "Valtra" },
        { rotulo: "John Deere", marca: "John Deere" },
        { rotulo: "New Holland", marca: "New Holland" },
      ],
      cor_destaque: "#0b7a3b",
    },
    campos: [
      { k: "titulo", rotulo: "Título", tipo: "texto", bilingue: true },
      {
        k: "abas",
        rotulo: "Abas",
        tipo: "lista",
        max: 6,
        campos: [
          { k: "rotulo", rotulo: "Nome da aba", tipo: "texto", bilingue: true },
          { k: "marca", rotulo: "Marca", tipo: "texto" },
          { k: "categoria", rotulo: "Categoria", tipo: "texto" },
        ],
      },
      { k: "cor_destaque", rotulo: "Cor da aba ativa", tipo: "cor" },
    ],
  },
  {
    id: "MOSAICO",
    nome: "Mosaico de destaques",
    desc: "Grade moderna de 3 ou 4 cartões coloridos com título, texto e link (com ou sem foto).",
    icone: "LayoutDashboard",
    largura: "container",
    padrao: {
      layout: "1+2",
      cartoes: [
        {
          titulo: "Kits de embrague",
          titulo_pt: "Kits de embreagem",
          texto: "Para MF, Valtra y John Deere",
          texto_pt: "Para MF, Valtra e John Deere",
          link: "/repuestos/frenos-y-embragues",
          cor: "#06321b",
        },
        {
          titulo: "Filtros",
          titulo_pt: "Filtros",
          texto: "Aire, aceite, combustible e hidráulico",
          texto_pt: "Ar, óleo, combustível e hidráulico",
          link: "/repuestos/filtros",
          cor: "#0b7a3b",
        },
        {
          titulo: "Rodamientos",
          titulo_pt: "Rolamentos",
          texto: "Medidas originales",
          texto_pt: "Medidas originais",
          link: "/repuestos/rodamientos-y-cojinetes",
          cor: "#e0a800",
        },
      ],
    },
    campos: [
      {
        k: "layout",
        rotulo: "Arrumação",
        tipo: "select",
        opcoes: [
          ["1+2", "1 grande + 2"],
          ["2+1", "2 + 1 grande"],
          ["3", "3 iguais"],
          ["4", "4 iguais"],
        ],
      },
      {
        k: "cartoes",
        rotulo: "Cartões",
        tipo: "lista",
        max: 4,
        campos: [
          { k: "titulo", rotulo: "Título", tipo: "texto", bilingue: true },
          { k: "texto", rotulo: "Texto", tipo: "texto", bilingue: true },
          { k: "link", rotulo: "Link", tipo: "link" },
          { k: "imagem", rotulo: "Foto (opcional)", tipo: "imagem" },
          { k: "cor", rotulo: "Cor", tipo: "cor" },
        ],
      },
    ],
  },
  {
    id: "COMO_COMPRAR",
    nome: "Como comprar (passos)",
    desc: "3 ou 4 passos numerados explicando como comprar. Passa confiança a quem chega pela primeira vez.",
    icone: "ListOrdered",
    largura: "container",
    padrao: {
      titulo: "Comprar es fácil",
      titulo_pt: "Comprar é fácil",
      passos: [
        {
          titulo: "Buscá tu repuesto",
          titulo_pt: "Busque sua peça",
          texto: "Por código original, nombre o modelo.",
          texto_pt: "Pelo código original, nome ou modelo.",
        },
        {
          titulo: "Pedí la cotización",
          titulo_pt: "Peça o orçamento",
          texto: "Te respondemos por WhatsApp con precio y envío.",
          texto_pt: "Respondemos pelo WhatsApp com preço e frete.",
        },
        {
          titulo: "Confirmá y pagá",
          titulo_pt: "Confirme e pague",
          texto: "Coordinamos el pago con vos, sin sorpresas.",
          texto_pt: "Combinamos o pagamento com você, sem surpresas.",
        },
        {
          titulo: "Recibí en tu campo",
          titulo_pt: "Receba na sua fazenda",
          texto: "Envío por DAC con seguimiento.",
          texto_pt: "Envio com código de rastreio.",
        },
      ],
      cor_destaque: "#0b7a3b",
    },
    campos: [
      { k: "titulo", rotulo: "Título", tipo: "texto", bilingue: true },
      {
        k: "passos",
        rotulo: "Passos",
        tipo: "lista",
        max: 4,
        campos: [
          { k: "titulo", rotulo: "Título", tipo: "texto", bilingue: true },
          { k: "texto", rotulo: "Texto", tipo: "texto", bilingue: true },
        ],
      },
      { k: "cor_destaque", rotulo: "Cor dos números", tipo: "cor" },
    ],
  },
  {
    id: "FAQ",
    nome: "Perguntas frequentes",
    desc: "Perguntas e respostas que abrem e fecham. Vai também para o Google como dados estruturados (FAQPage).",
    icone: "HelpCircle",
    largura: "container",
    padrao: {
      titulo: "Preguntas frecuentes",
      titulo_pt: "Perguntas frequentes",
      perguntas: [
        {
          p: "¿Hacen envíos a todo Uruguay?",
          p_pt: "Vocês enviam para todo o RS?",
          r: "Sí, enviamos por DAC a los 19 departamentos, con número de seguimiento.",
          r_pt: "Sim, enviamos para todo o Rio Grande do Sul por Correios ou transportadora, com rastreio.",
        },
        {
          p: "¿Cómo sé si el repuesto sirve para mi tractor?",
          p_pt: "Como sei se a peça serve no meu trator?",
          r: "Mandanos el código de la pieza o el modelo y número de serie del tractor por WhatsApp y lo confirmamos antes de enviar.",
          r_pt: "Mande o código da peça ou o modelo e número de série do trator pelo WhatsApp e confirmamos antes de enviar.",
        },
        {
          p: "¿Cómo pago?",
          p_pt: "Como pago?",
          r: "Cuando confirmamos el pedido por WhatsApp, coordinamos el pago y el envío con vos.",
          r_pt: "Quando confirmamos o pedido pelo WhatsApp, combinamos o pagamento e o envio com você.",
        },
      ],
    },
    campos: [
      { k: "titulo", rotulo: "Título", tipo: "texto", bilingue: true },
      {
        k: "perguntas",
        rotulo: "Perguntas",
        tipo: "lista",
        max: 12,
        campos: [
          { k: "p", rotulo: "Pergunta", tipo: "texto", bilingue: true },
          { k: "r", rotulo: "Resposta", tipo: "textarea", bilingue: true },
        ],
      },
    ],
  },
  {
    id: "TEXTO_SEO",
    nome: "Texto para o Google (SEO)",
    desc: "Título e texto sobre a loja, com negrito e links. Fica recolhido com “Leer más”, mas o Google lê tudo.",
    icone: "FileText",
    largura: "container",
    padrao: {
      titulo: "Repuestos agrícolas en Uruguay con envío a todo el país",
      titulo_pt: "Peças agrícolas com envio para todo o Rio Grande do Sul",
      texto:
        "En **AGRO PARTS** encontrás repuestos para tractores y cosechadoras [Massey Ferguson](/repuestos/massey-ferguson), [Valtra](/repuestos/valtra), [John Deere](/repuestos/john-deere) y [New Holland](/repuestos/new-holland).\n\nCada pieza tiene su código original para que compres sin equivocarte, y te confirmamos la compatibilidad por WhatsApp antes de enviar por DAC.",
      texto_pt:
        "Na **AGRO PARTS** você encontra peças para tratores e colheitadeiras [Massey Ferguson](/repuestos/massey-ferguson), [Valtra](/repuestos/valtra), [John Deere](/repuestos/john-deere) e [New Holland](/repuestos/new-holland).\n\nCada peça tem o código original para você comprar sem erro, e confirmamos a compatibilidade pelo WhatsApp antes de enviar.",
      recolher: true,
    },
    campos: [
      { k: "titulo", rotulo: "Título (H2)", tipo: "texto", bilingue: true },
      {
        k: "texto",
        rotulo: "Texto (**negrito**, [texto](link), linha em branco = novo parágrafo)",
        tipo: "textarea",
        bilingue: true,
      },
      { k: "recolher", rotulo: "Mostrar só o começo com “Leer más”", tipo: "bool" },
    ],
  },
  {
    id: "CTA_FAIXA",
    nome: "Chamada para ação",
    desc: "Faixa grande com título, texto e botão (WhatsApp, cotação ou qualquer link).",
    icone: "MousePointerClick",
    largura: "container",
    padrao: {
      titulo: "¿No encontrás la pieza?",
      titulo_pt: "Não encontrou a peça?",
      texto: "Mandanos el código o una foto y te la conseguimos.",
      texto_pt: "Mande o código ou uma foto e conseguimos para você.",
      botao: "Pedir por WhatsApp",
      botao_pt: "Pedir pelo WhatsApp",
      destino: "whatsapp",
      link: "",
      cor_fundo: "#0b7a3b",
      cor_texto: "#ffffff",
      cor_destaque: "#25D366",
    },
    campos: [
      { k: "titulo", rotulo: "Título", tipo: "texto", bilingue: true },
      { k: "texto", rotulo: "Texto", tipo: "texto", bilingue: true },
      { k: "botao", rotulo: "Botão", tipo: "texto", bilingue: true },
      {
        k: "destino",
        rotulo: "O botão leva para",
        tipo: "select",
        opcoes: [
          ["whatsapp", "WhatsApp (pede cadastro antes, como a cotação)"],
          ["link", "Um link"],
        ],
      },
      { k: "link", rotulo: "Link (se escolheu link)", tipo: "link" },
      { k: "imagem", rotulo: "Imagem de fundo (opcional)", tipo: "imagem" },
      ...FUNDO,
      { k: "cor_destaque", rotulo: "Cor do botão", tipo: "cor" },
    ],
  },
  {
    id: "MODELOS_TRATOR",
    nome: "Busca por modelo de trator",
    desc: "Atalhos com os modelos mais procurados (MF 275, Valtra 785…). Um toque e aparecem as peças.",
    icone: "Wrench",
    largura: "container",
    padrao: {
      titulo: "Buscá por modelo de tractor",
      titulo_pt: "Busque pelo modelo do trator",
      modelos: [
        { rotulo: "MF 275" },
        { rotulo: "MF 290" },
        { rotulo: "MF 4275" },
        { rotulo: "Valtra 785" },
        { rotulo: "Valtra BM 110" },
        { rotulo: "John Deere 5705" },
        { rotulo: "John Deere 6110J" },
        { rotulo: "New Holland TL75" },
        { rotulo: "Ford 6610" },
      ],
      cor_destaque: "#0b7a3b",
    },
    campos: [
      { k: "titulo", rotulo: "Título", tipo: "texto", bilingue: true },
      {
        k: "modelos",
        rotulo: "Modelos",
        tipo: "lista",
        max: 24,
        campos: [
          { k: "rotulo", rotulo: "Modelo", tipo: "texto" },
          { k: "busca", rotulo: "Termo da busca (vazio = o próprio modelo)", tipo: "texto" },
        ],
      },
      { k: "cor_destaque", rotulo: "Cor", tipo: "cor" },
    ],
  },
];

export const tipoNovo = (id: string) => TIPOS_NOVOS.find((t) => t.id === id) ?? null;
export const ehLarguraTotal = (id: string) =>
  id === "HERO_SLIDER" || tipoNovo(id)?.largura === "total";

// Texto no idioma da página: português em `${k}_pt`, senão o espanhol
export function txt(c: Record<string, any> | undefined, k: string, idioma: "es" | "pt"): string {
  if (!c) return "";
  const v = idioma === "pt" ? c[`${k}_pt`] || c[k] : c[k];
  return typeof v === "string" ? v : v == null ? "" : String(v);
}

// Cor segura (#rgb / #rrggbb), senão a padrão
export const cor = (v: unknown, padrao: string) =>
  typeof v === "string" && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v.trim()) ? v.trim() : padrao;

// Link interno ou https (nada de javascript:)
export const linkSeguro = (v: unknown) => {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return "";
  if (s.startsWith("/") && !s.startsWith("//")) return s;
  if (/^https?:\/\//i.test(s)) return s;
  return "";
};

// Blocos com H1 ligado: o H1 fixo (escondido) da home sai para não haver dois
export function temH1(blocos: Array<{ type: string; active: boolean; config: string | null }>) {
  return blocos.some((b) => {
    if (!b.active || !tipoNovo(b.type)) return false;
    try {
      return JSON.parse(b.config || "{}").h1 === true;
    } catch {
      return false;
    }
  });
}
