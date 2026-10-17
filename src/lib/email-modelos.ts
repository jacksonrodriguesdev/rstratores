// Modelos prontos de campanha de e-mail (Admin → E-mail marketing → Nova campanha).
// Cada modelo é um ponto de partida: tudo pode ser trocado no construtor por blocos.
// Regras: nada de "o melhor/o mais barato" sem prova; códigos de cupom precisam existir em
// Campanhas e cupons (o editor avisa); fotos dos produtos desligadas (fotos de terceiros).
import { datasBlackFriday } from "./campanha-comum";
import { novoBloco, TEMAS, type BlocoEmail, type TemaEmail } from "./email-blocos";
import type { ConteudoEmail, Publico } from "./email-template";
import { categoriaEs } from "./pecas-es";
import { urlRepuestos } from "./seo-paginas";

export type ModeloEmail = {
  id: string;
  nome: string;
  desc: string;
  emoji: string;
  tema: string; // id em TEMAS
  assunto: string;
  preheader: string;
  publico: Publico;
  blocos: () => BlocoEmail[];
};

const CATS = [
  ["🛢️", "Filtros"],
  ["⚙️", "Engrenagens e Transmissão"],
  ["💧", "Hidráulica e Pneumática"],
  ["🔩", "Rolamentos e Mancais"],
  ["🛑", "Freios e Embreagens"],
  ["⚡", "Elétrica e Sensores"],
] as const;
const categorias = (titulo = "Buscá por categoria") =>
  novoBloco("CATEGORIAS", {
    titulo,
    colunas: "3",
    itens: CATS.map(([emoji, c]) => ({
      emoji,
      nome: categoriaEs(c),
      link: urlRepuestos({ categoria: c }) ?? "/loja",
    })),
  });

// Black Friday do ano que vem pela frente (depois do fim, a do ano seguinte)
function bf() {
  const agora = new Date();
  let d = datasBlackFriday(agora.getUTCFullYear());
  if (d.fim.getTime() < agora.getTime()) d = datasBlackFriday(agora.getUTCFullYear() + 1);
  const dia = (x: Date) =>
    x.toLocaleDateString("es-UY", { timeZone: "America/Montevideo", day: "numeric" });
  const ultimo = new Date(d.fim.getTime() - 1000);
  return {
    ...d,
    ano: d.inicio.getUTCFullYear(),
    periodo: `del ${dia(d.inicio)} al ${dia(ultimo)} de noviembre`,
  };
}

const TODOS: Publico = { tipo: "todos", departamentos: [], dias: 30 };

export const MODELOS_EMAIL: ModeloEmail[] = [
  {
    id: "pre-black",
    nome: "Pré-Black Friday",
    desc: "Aviso de que a Black está chegando, com contagem regressiva e as peças já com preço de pré-Black.",
    emoji: "🖤",
    tema: "black",
    assunto: "{{nombre}}, se viene la Black Friday de AGRO PARTS 🖤",
    preheader: "Empezó la cuenta regresiva. Ya hay precios de pre Black en el sitio.",
    publico: TODOS,
    blocos: () => {
      const d = bf();
      return [
        novoBloco("AVISO", { texto: `🖤 PRE BLACK FRIDAY ${d.ano} · ${d.periodo.toUpperCase()}` }),
        novoBloco("HERO", {
          selo: "PRE BLACK FRIDAY",
          titulo: "{{nombre}}, se viene la Black Friday de AGRO PARTS",
          texto: `La Black Friday es ${d.periodo}: descuentos en repuestos para tu tractor y tu maquinaria. Mientras tanto, ya hay piezas con precio de pre Black.`,
          botao: "Ver ofertas de pre Black",
          link: "/black-friday",
          altura: "alta",
        }),
        novoBloco("CONTAGEM", {
          titulo: "Faltan para la BLACK FRIDAY",
          alvo: d.inicio.toISOString(),
          depois: "¡La Black Friday ya empezó!",
        }),
        novoBloco("TEXTO", {
          texto:
            "Armá tu lista de los repuestos que vas a necesitar para la zafra y **aprovechá los precios de la Black**.\n\nSi no encontrás una pieza, mandanos el código por WhatsApp y te la cotizamos.",
          alinhar: "center",
        }),
        novoBloco("PRODUTOS", {
          titulo: "Ya con precio de pre Black",
          fonte: "campanha",
          limite: 6,
          colunas: "2",
        }),
        novoBloco("BOTAO", { texto: "Ver todas las ofertas", link: "/black-friday" }),
        novoBloco("BENEFICIOS"),
        novoBloco("PASSOS"),
        novoBloco("WHATSAPP"),
      ];
    },
  },
  {
    id: "black",
    nome: "Black Friday começou",
    desc: "Disparo do dia: contagem até o fim, ofertas da campanha, categorias e cupom.",
    emoji: "🔥",
    tema: "black",
    assunto: "🔥 Empezó la Black Friday de AGRO PARTS",
    preheader: "Descuentos en repuestos agrícolas hasta el lunes. Envíos a todo Uruguay.",
    publico: TODOS,
    blocos: () => {
      const d = bf();
      return [
        novoBloco("AVISO", { texto: "🔥 HOY EMPIEZA · HASTA EL CYBER MONDAY" }),
        novoBloco("HERO", {
          selo: `BLACK FRIDAY ${d.ano}`,
          titulo: "¡Empezó la Black Friday!",
          texto: "Descuentos en repuestos para tractores, cosechadoras y maquinaria agrícola.",
          botao: "Ver las ofertas",
          link: "/black-friday",
          altura: "alta",
        }),
        novoBloco("CONTAGEM", {
          titulo: "La Black Friday termina en",
          alvo: d.fim.toISOString(),
          depois: "La Black Friday terminó. ¡Gracias!",
        }),
        novoBloco("PRODUTOS", {
          titulo: "Ofertas de la Black",
          fonte: "campanha",
          limite: 6,
          colunas: "2",
        }),
        novoBloco("CUPOM", {
          codigo: "BLACK10",
          texto: "Y un descuento extra en tu pedido",
          validade: "hasta el Cyber Monday",
          estilo: "escuro",
        }),
        categorias("Descuentos por categoría"),
        novoBloco("WHATSAPP", {
          titulo: "¿Buscás una pieza que no está acá?",
          texto: "Mandanos el código y te cotizamos con el precio de la Black.",
        }),
      ];
    },
  },
  {
    id: "cyber",
    nome: "Último dia (Cyber Monday)",
    desc: "Lembrete de urgência para o último dia da campanha.",
    emoji: "⏰",
    tema: "black",
    assunto: "⏰ {{nombre}}, último día de Black Friday",
    preheader: "Hoy a la medianoche terminan los descuentos.",
    publico: TODOS,
    blocos: () => {
      const d = bf();
      return [
        novoBloco("AVISO", { texto: "⏰ ÚLTIMO DÍA" }),
        novoBloco("HERO", {
          selo: "CYBER MONDAY",
          titulo: "Último día de descuentos",
          texto: "Hoy a la medianoche termina la Black Friday de AGRO PARTS.",
          botao: "Aprovechar ahora",
          link: "/black-friday",
        }),
        novoBloco("CONTAGEM", {
          titulo: "Termina en",
          alvo: d.fim.toISOString(),
          depois: "La Black Friday terminó. ¡Gracias!",
        }),
        novoBloco("PRODUTOS", {
          titulo: "Todavía con precio de Black",
          fonte: "campanha",
          limite: 4,
          colunas: "2",
        }),
        novoBloco("BOTAO", {
          texto: "Ver todas las ofertas",
          link: "/black-friday",
          estilo: "largo",
        }),
        novoBloco("WHATSAPP"),
      ];
    },
  },
  {
    id: "ofertas",
    nome: "Ofertas do mês",
    desc: "Peças em oferta escolhidas sozinhas no envio, categorias e vantagens.",
    emoji: "🏷️",
    tema: "verde",
    assunto: "{{nombre}}, ofertas del mes en repuestos agrícolas 🚜",
    preheader: "Precios especiales este mes. Envíos a todo Uruguay por DAC.",
    publico: TODOS,
    blocos: () => [
      novoBloco("HERO", {
        selo: "OFERTAS DEL MES",
        titulo: "¡Hola {{nombre}}! Repuestos con precio especial",
        texto: "Seleccionamos piezas con descuento este mes. Pedí por WhatsApp o desde el sitio.",
        botao: "Ver ofertas",
        link: "/loja",
      }),
      novoBloco("PRODUTOS", { titulo: "En oferta", fonte: "ofertas", limite: 6, colunas: "2" }),
      categorias(),
      novoBloco("BENEFICIOS"),
      novoBloco("WHATSAPP"),
    ],
  },
  {
    id: "boas-vindas",
    nome: "Boas-vindas",
    desc: "Para quem se cadastrou nos últimos 30 dias: cupom pessoal, como comprar e categorias.",
    emoji: "👋",
    tema: "verde",
    assunto: "{{nombre}}, te damos la bienvenida a AGRO PARTS 👋",
    preheader: "Así de fácil es cotizar y comprar repuestos con nosotros.",
    publico: { tipo: "recentes", departamentos: [], dias: 30 },
    blocos: () => [
      novoBloco("HERO", {
        selo: "BIENVENIDA",
        titulo: "¡Hola {{nombre}}! Gracias por crear tu cuenta",
        texto:
          "Somos AGRO PARTS: repuestos para tractores, cosechadoras y maquinaria agrícola, con envíos a todo Uruguay.",
        botao: "Explorar repuestos",
        link: "/loja",
      }),
      novoBloco("CUPOM", {
        pessoal: true,
        codigo: "",
        texto: "Tu cupón de bienvenida",
        validade: "",
      }),
      novoBloco("PASSOS"),
      categorias(),
      novoBloco("DUAS_COLUNAS"),
      novoBloco("WHATSAPP"),
    ],
  },
  {
    id: "volta",
    nome: "Sentimos sua falta",
    desc: "Para clientes que não entram no site há mais de 60 dias.",
    emoji: "💚",
    tema: "campo",
    assunto: "{{nombre}}, ¿necesitás repuestos para la zafra?",
    preheader: "Tenemos piezas nuevas con precio en el sitio.",
    publico: { tipo: "inativos", departamentos: [], dias: 60 },
    blocos: () => [
      novoBloco("TITULO", {
        selo: "TE EXTRAÑAMOS",
        texto: "{{nombre}}, ¿necesitás repuestos para la zafra?",
        tamanho: "g",
      }),
      novoBloco("TEXTO", {
        texto:
          "Sumamos piezas con precio en el sitio. Buscá por nombre o por el **código del fabricante** y pedí por WhatsApp.",
      }),
      novoBloco("PRODUTOS", {
        titulo: "Recién llegadas al sitio",
        fonte: "novos",
        limite: 4,
        colunas: "2",
      }),
      novoBloco("BOTAO", { texto: "Ver repuestos", link: "/loja" }),
      novoBloco("WHATSAPP"),
    ],
  },
  {
    id: "categoria",
    nome: "Lançamento de categoria",
    desc: "Uma categoria em destaque (ex.: Filtros) com as peças dela.",
    emoji: "🛢️",
    tema: "azul",
    assunto: "Filtros para tu tractor: aceite, aire, combustible e hidráulico",
    preheader: "Buscá por código del fabricante y cotizá por WhatsApp.",
    publico: TODOS,
    blocos: () => [
      novoBloco("HERO", {
        selo: "FILTROS",
        titulo: "El filtro justo para tu tractor",
        texto: "Aceite, aire, combustible e hidráulico para las principales marcas.",
        botao: "Ver filtros",
        link: urlRepuestos({ categoria: "Filtros" }) ?? "/loja",
      }),
      novoBloco("PRODUTOS", {
        titulo: "Filtros con precio",
        fonte: "categoria",
        alvo: "Filtros",
        limite: 6,
        colunas: "3",
      }),
      novoBloco("PASSOS"),
      novoBloco("WHATSAPP", {
        titulo: "¿No sabés cuál es tu filtro?",
        texto: "Mandanos la marca y el modelo del tractor y te ayudamos.",
      }),
    ],
  },
  {
    id: "branco",
    nome: "Em branco",
    desc: "Começa com título, texto e botão.",
    emoji: "✏️",
    tema: "verde",
    assunto: "Novedades de AGRO PARTS",
    preheader: "",
    publico: TODOS,
    blocos: () => [
      novoBloco("TITULO", { texto: "¡Hola {{nombre}}!", tamanho: "g" }),
      novoBloco("TEXTO"),
      novoBloco("BOTAO"),
    ],
  },
];

export function conteudoDoModelo(m: ModeloEmail): ConteudoEmail {
  const tema = TEMAS.find((t) => t.id === m.tema) ?? TEMAS[0];
  return {
    titulo: "",
    texto: "",
    produtos: [],
    cor: tema.cor,
    tema: { ...tema.tema } as TemaEmail,
    blocos: m.blocos(),
  };
}
export const modeloEmail = (id: string) => MODELOS_EMAIL.find((m) => m.id === id);
