// Conteúdo próprio de cada página de entrada (só em espanhol: é a versão que vai para o Google).
// Escrito para as buscas com intenção de compra: "repuestos Massey Ferguson Uruguay",
// "filtros para tractores Uruguay", "repuestos agrícolas Uruguay"... e as parecidas
// (repuestos MF, piezas, tractor, cosechadora). Sem promessas que não dá para provar
// (nada de "el mejor precio" ou "el más completo").
import { perguntasFrequentes } from "./seo-paginas";

export type Pergunta = { p: string; r: string };
export type GuiaSeo = { titulo: string; paragrafos: string[]; perguntas: Pergunta[] };

export const GUIAS_MARCA: Record<string, GuiaSeo> = {
  "massey-ferguson": {
    titulo: "Repuestos Massey Ferguson en Uruguay: cómo encontrar la pieza justa",
    paragrafos: [
      "Los tractores Massey Ferguson (MF) son de los más comunes en el campo uruguayo: muchos MF 265, 275, 283, 290 y 292 siguen trabajando todos los días en tambos, chacras y establecimientos ganaderos. Por eso armamos un catálogo de repuestos Massey Ferguson pensado para el productor y el taller: piezas de motor, transmisión, embrague, frenos, hidráulica, dirección, levante de tres puntos y filtros.",
      "Cada repuesto MF tiene su código original (por ejemplo, los terminados en M1, M91 o M92), así podés compararlo con la pieza que sacaste del tractor o con el catálogo de tu equipo. Si no encontrás el código, mandanos por WhatsApp una foto de la pieza, el modelo y el número de serie del tractor y te confirmamos la compatibilidad antes de comprar.",
      "Cotizá tus repuestos Massey Ferguson por WhatsApp: te respondemos con precio y disponibilidad antes de comprar.",
    ],
    perguntas: [
      {
        p: "¿Tienen repuestos para Massey Ferguson 265, 275 y 290?",
        r: "Sí. Gran parte del catálogo Massey Ferguson es para la línea 200 (265, 275, 283, 290, 292, 297) y las series 4200 y 5200. Buscá por el código original o consultanos por WhatsApp con el modelo y el número de serie.",
      },
      {
        p: "¿Los repuestos MF sirven para tractores con motor Perkins?",
        r: "Muchos Massey Ferguson usan motor Perkins. En cada repuesto de motor indicamos el código original; si tenés dudas, te confirmamos la compatibilidad por WhatsApp antes de la compra.",
      },
    ],
  },
  "john-deere": {
    titulo: "Repuestos John Deere en Uruguay: tractores, cosechadoras y sembradoras",
    paragrafos: [
      "Trabajamos repuestos John Deere para tractores de las series 5000, 6000 y 7000 (5705, 5725, 6110J, 6405, 6605, 7505), cosechadoras y sembradoras. En el catálogo vas a encontrar filtros, rodamientos, juntas, retenes, piezas de motor, hidráulica, transmisión y bujes, cada uno con el código original de John Deere (por ejemplo, los que empiezan con AL, AH, AR, RE o CQ).",
      "Buscar por código es la forma más segura de acertar: copiá el número grabado en la pieza o en el catálogo de tu máquina y escribilo en el buscador. Si el código no aparece, escribinos por WhatsApp: muchas veces conseguimos el repuesto aunque no esté publicado.",
      "Te pasamos el precio y la disponibilidad de los repuestos John Deere por WhatsApp antes de que confirmes la compra.",
    ],
    perguntas: [
      {
        p: "¿Tienen repuestos para cosechadoras y sembradoras John Deere?",
        r: "Sí, además de tractores tenemos repuestos para cosechadoras y sembradoras John Deere (por ejemplo, bujes de la serie 9200). Buscá por el código original o mandanos una foto de la pieza por WhatsApp.",
      },
      {
        p: "¿Cómo busco un repuesto John Deere por código?",
        r: "Escribí el código tal como aparece en la pieza o en el catálogo (por ejemplo AL225552 o RE272342) en el buscador de la tienda. Si no aparece, consultanos por WhatsApp.",
      },
    ],
  },
  agrale: {
    titulo: "Repuestos Agrale en Uruguay",
    paragrafos: [
      "Los tractores Agrale son muy usados en granjas, chacras, viñedos y quintas por su tamaño y su bajo consumo. Tenemos repuestos Agrale para los modelos 4100, 4118, 4230, 5075 y la serie BX: piezas de motor, transmisión, embrague, hidráulica, dirección y filtros.",
      "Como en todo el catálogo, cada repuesto Agrale lleva su código original. Si tenés la pieza vieja en la mano, buscá por el número grabado; si no, mandanos el modelo del tractor y una foto por WhatsApp y te decimos cuál es el repuesto correcto.",
      "Cotizá tus repuestos Agrale por WhatsApp con el código de la pieza.",
    ],
    perguntas: [
      {
        p: "¿Qué modelos de tractor Agrale atienden?",
        r: "Principalmente Agrale 4100, 4118, 4230, 5075 y la serie BX. Si tenés otro modelo, consultanos por WhatsApp con el número de serie.",
      },
    ],
  },
  valtra: {
    titulo: "Repuestos Valtra y Valmet en Uruguay",
    paragrafos: [
      "En Uruguay muchos todavía le dicen Valmet al tractor Valtra: es la misma marca. Tenemos repuestos Valtra y Valmet para los modelos 685, 785, 885, 985, BM, BH y la serie A, con motor Sisu / AGCO Power: kits de motor, juntas, bombas, filtros, rodamientos, piezas de transmisión y de levante.",
      "Buscá por el código original de la pieza o escribí «Valmet» o «Valtra» en el buscador: encontrás los mismos repuestos. Si tenés dudas, mandanos el modelo y el número de serie por WhatsApp.",
      "Cotizá tus repuestos Valtra por WhatsApp con el código de la pieza.",
    ],
    perguntas: [
      {
        p: "¿Valmet y Valtra usan los mismos repuestos?",
        r: "Valtra es el nombre actual de la marca Valmet y muchos repuestos son los mismos. En cada pieza indicamos el código original para que confirmes la compatibilidad con tu tractor.",
      },
    ],
  },
  "new-holland": {
    titulo: "Repuestos New Holland en Uruguay",
    paragrafos: [
      "Repuestos para tractores New Holland TL, TM, TS, TT, 7630, 8030 y la línea Ford New Holland, y para cosechadoras New Holland: filtros, juntas, rodamientos, piezas de motor, hidráulica, dirección, embrague y transmisión, cada una con su código original.",
      "Buscá por el código de la pieza o por el modelo del tractor; si no lo encontrás, consultanos por WhatsApp.",
    ],
    perguntas: [
      {
        p: "¿Los repuestos Ford sirven para New Holland?",
        r: "Varios modelos New Holland vienen de la línea Ford y comparten piezas. Fijate en el código original de cada repuesto o consultanos por WhatsApp con el modelo de tu tractor.",
      },
    ],
  },
  "case-ih": {
    titulo: "Repuestos Case IH en Uruguay",
    paragrafos: [
      "Repuestos para tractores Case IH Maxxum, Farmall, Puma y Magnum y para cosechadoras Axial-Flow: piezas de motor, transmisión, hidráulica, frenos y filtros, con el código original de cada pieza.",
      "Te confirmamos la compatibilidad por WhatsApp antes de comprar.",
    ],
    perguntas: [],
  },
  ford: {
    titulo: "Repuestos para tractores Ford en Uruguay",
    paragrafos: [
      "Los tractores Ford 4600, 5600, 6600, 6610, 7610 y 7630 siguen trabajando en muchos campos de Uruguay. Tenemos repuestos de motor, bomba hidráulica, embrague, frenos y transmisión para mantenerlos en marcha, con código original.",
      "Consultanos por WhatsApp con el modelo y una foto de la pieza y te respondemos con precio y disponibilidad.",
    ],
    perguntas: [],
  },
};

export const GUIAS_CATEGORIA: Record<string, GuiaSeo> = {
  cosechadoras: {
    titulo: "Repuestos para cosechadoras en Uruguay",
    paragrafos: [
      "Tenemos repuestos para cosechadoras John Deere, New Holland, Case IH y Massey Ferguson: piezas de plataforma y cabezal, cilindro y cóncavo, sinfines, zarandas, correas, cadenas, rodamientos, juntas y filtros, cada uno con su código original.",
      "Antes de la zafra de soja, arroz o trigo, revisá rodamientos, correas y cadenas: son las piezas que más paran la cosechadora en plena cosecha. Buscá por el código grabado en la pieza o mandanos una foto por WhatsApp con el modelo de la máquina.",
      "Te respondemos por WhatsApp con precio y disponibilidad.",
    ],
    perguntas: [
      {
        p: "¿Tienen repuestos para cosechadoras John Deere y New Holland?",
        r: "Sí. La mayoría de los repuestos de cosechadora del catálogo son John Deere, New Holland y Case IH. Buscá por el código original o consultanos por WhatsApp con el modelo y el año de la máquina.",
      },
    ],
  },
  sembradoras: {
    titulo: "Repuestos para sembradoras en Uruguay",
    paragrafos: [
      "Repuestos para sembradoras y plantadoras: bujes, discos de corte, cuchillas, dosificadores, engranajes, cadenas y rodamientos, con el código original de cada pieza.",
      "Para no perder días de siembra, revisá la sembradora antes de la temporada y pedí los repuestos con tiempo.",
    ],
    perguntas: [],
  },
  pulverizadores: {
    titulo: "Repuestos para pulverizadores en Uruguay",
    paragrafos: [
      "Repuestos para pulverizadores Jacto y otras marcas: picos, filtros de línea, válvulas, bombas, membranas, mangueras y conexiones, con código original.",
      "Mandanos el modelo del pulverizador o una foto de la pieza por WhatsApp y te confirmamos el repuesto correcto.",
    ],
    perguntas: [],
  },
  filtros: {
    titulo: "Filtros para tractores en Uruguay: aceite, combustible, aire e hidráulico",
    paragrafos: [
      "Tenemos filtros para tractores y cosechadoras Massey Ferguson, Valtra, John Deere, New Holland, Case IH, Ford y Agrale: filtros de aceite de motor, de combustible (gasoil) y sedimentadores, de aire (primario y de seguridad), hidráulicos y de transmisión.",
      "Para elegir el filtro correcto, buscá por el código original del filtro o por el código del filtro que tenés puesto. Si preferís, mandanos por WhatsApp el modelo del tractor y te armamos el kit de filtros para el service (aceite, combustible, aire e hidráulico).",
      `Cambiar los filtros en los intervalos que indica el manual protege el motor, la bomba inyectora y el sistema hidráulico. Cotizá tus filtros por WhatsApp con el código original.`,
    ],
    perguntas: [
      {
        p: "¿Arman kits de filtros para el service del tractor?",
        r: "Sí. Mandanos por WhatsApp la marca, el modelo y el número de serie del tractor y te pasamos el kit de filtros (aceite, combustible, aire e hidráulico) con precio y costo de envío.",
      },
      {
        p: "¿Puedo buscar un filtro por el código de otra marca?",
        r: "Sí. Escribí el código del filtro que tenés en el buscador. Si no aparece, consultanos por WhatsApp y buscamos el equivalente.",
      },
    ],
  },
};

// Páginas gerais: início ("repuestos para tractores en Uruguay") e zonas ("repuestos agrícolas Uruguay")
export const GUIA_INICIO: GuiaSeo = {
  titulo: "Repuestos para tractores en Uruguay, con envío a todo el país",
  paragrafos: [
    "AGRO PARTS es una tienda online de repuestos para tractores, cosechadoras y maquinaria agrícola en Uruguay, con base en Chuy, Rocha. Tenemos más de 49.000 repuestos con código original para Massey Ferguson, John Deere, Valtra, New Holland, Case IH, Ford y Agrale: filtros, rodamientos, juntas y retenes, piezas de motor, transmisión, hidráulica, frenos, embragues y piezas eléctricas.",
    "Buscá por el código de la pieza, por la marca o por el tipo de repuesto, agregá lo que necesitás a tu cotización y envianos la lista por WhatsApp. Te respondemos con precio y disponibilidad.",
  ],
  perguntas: [
    {
      p: "¿Dónde comprar repuestos para tractores en Uruguay?",
      r: "En AGRO PARTS podés buscar entre más de 49.000 repuestos agrícolas, y cotizar por WhatsApp con el código de la pieza.",
    },
    {
      p: "¿Cómo pido un repuesto?",
      r: "Buscá la pieza en el sitio o mandanos el código por WhatsApp. Te respondemos con precio y disponibilidad, sin compromiso.",
    },
    {
      p: "¿Cómo sé si el repuesto es el correcto para mi tractor?",
      r: "Buscá por el código original de la pieza. Si tenés dudas, mandanos por WhatsApp el modelo, el número de serie y una foto de la pieza y te confirmamos la compatibilidad antes de comprar.",
    },
  ],
};

export const GUIA_ZONAS: GuiaSeo = {
  titulo: "Repuestos agrícolas en Uruguay: qué encontrás y cómo comprar",
  paragrafos: [
    "Somos una tienda de repuestos agrícolas en Uruguay para productores, contratistas y talleres: repuestos para tractores, cosechadoras, sembradoras y equipos de forraje de las marcas más usadas en el país, con el código original de cada pieza.",
    "Los repuestos agrícolas más pedidos son filtros (aceite, combustible, aire e hidráulico), rodamientos, retenes y juntas, piezas de transmisión y embrague, bombas y componentes hidráulicos, y piezas de motor. Elegí tu departamento o tu ciudad para ver las marcas más comunes de tu zona, o buscá directamente por código.",
    "Te confirmamos el precio y la disponibilidad por WhatsApp antes de la compra.",
  ],
  perguntas: [
    {
      p: "¿Cómo compro repuestos agrícolas?",
      r: "Buscá por código en el sitio o mandanos tu lista por WhatsApp y te respondemos con precio y disponibilidad.",
    },
    {
      p: "¿Qué marcas de maquinaria agrícola atienden?",
      r: "Massey Ferguson, John Deere, Valtra (Valmet), New Holland, Case IH, Ford y Agrale, entre otras. Buscá por el código original de la pieza o consultanos por WhatsApp.",
    },
    {
      p: "¿Cómo pido una cotización de repuestos agrícolas?",
      r: "Agregá los repuestos a tu cotización y envianos la lista por WhatsApp, o mandanos el código o una foto de la pieza. Te respondemos con precio, disponibilidad y costo del envío.",
    },
  ],
};

// Perguntas da página de marca/categoria: as próprias primeiro, depois as gerais
export function perguntasDaPagina(
  marca: { slug: string } | null | undefined,
  categoria: { slug: string } | null | undefined,
  alvo: string,
  idioma: "es" | "pt" = "es",
): Pergunta[] {
  const guia = guiaDaPagina(marca, categoria, idioma);
  return [...(guia?.perguntas ?? []), ...perguntasFrequentes(alvo, idioma)];
}

export function guiaDaPagina(
  marca: { slug: string } | null | undefined,
  categoria: { slug: string } | null | undefined,
  idioma: "es" | "pt" = "es",
): GuiaSeo | null {
  if (marca && categoria) return null;
  const pt = idioma === "pt";
  if (marca) return (pt ? GUIAS_MARCA_PT : GUIAS_MARCA)[marca.slug] ?? null;
  if (categoria) return (pt ? GUIAS_CATEGORIA_PT : GUIAS_CATEGORIA)[categoria.slug] ?? null;
  return null;
}

// Dados estruturados FAQPage de uma lista de perguntas
export const ldPerguntas = (perguntas: Pergunta[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: perguntas.map((q) => ({
    "@type": "Question",
    name: q.p,
    acceptedAnswer: { "@type": "Answer", text: q.r },
  })),
});

// ---------------------------------------------------------------- Português (Sul do Brasil)
// Mesmas páginas na versão /pt, escritas para quem busca no RS, SC e PR ("peças para trator RS",
// "peças Massey Ferguson Rio Grande do Sul"...). Venda e nota fiscal pela empresa brasileira.
const ESTADOS = "Rio Grande do Sul, Santa Catarina e Paraná";

export const GUIAS_MARCA_PT: Record<string, GuiaSeo> = {
  "massey-ferguson": {
    titulo: "Peças Massey Ferguson no RS, SC e PR",
    paragrafos: [
      "Os tratores Massey Ferguson são dos mais comuns nas lavouras e propriedades do Sul do Brasil: MF 265, 275, 283, 290, 292 e as séries 4200 e 5200 seguem trabalhando todos os dias. Temos peças Massey Ferguson de motor, transmissão, embreagem, freios, hidráulico, direção, levante e filtros, cada uma com o código original.",
      "Compare o código da peça que você tirou do trator (os terminados em M1, M91, M92) ou mande pelo WhatsApp uma foto, o modelo e o número de série: confirmamos a compatibilidade antes da compra.",
      `Enviamos peças Massey Ferguson para ${ESTADOS} por Correios ou transportadora, com nota fiscal e código de rastreio.`,
    ],
    perguntas: [
      {
        p: "Vocês têm peças para Massey Ferguson 265, 275 e 290?",
        r: "Sim. Boa parte do catálogo Massey Ferguson é para a linha 200 (265, 275, 283, 290, 292, 297) e para as séries 4200 e 5200. Busque pelo código original ou fale conosco pelo WhatsApp com o modelo e o número de série.",
      },
    ],
  },
  "john-deere": {
    titulo: "Peças John Deere no RS, SC e PR: tratores, colheitadeiras e plantadeiras",
    paragrafos: [
      "Trabalhamos peças John Deere para tratores das séries 5000, 6000 e 7000, colheitadeiras e plantadeiras: filtros, rolamentos, juntas, retentores, peças de motor, hidráulico, transmissão e buchas, cada uma com o código original John Deere (AL, AH, AR, RE, CQ…).",
      "Buscar pelo código é a forma mais segura de acertar a peça. Se o código não aparecer, fale conosco pelo WhatsApp: muitas vezes conseguimos a peça mesmo que não esteja publicada.",
      `Enviamos para ${ESTADOS} por Correios ou transportadora, com nota fiscal e rastreio.`,
    ],
    perguntas: [
      {
        p: "Vocês têm peças para colheitadeiras e plantadeiras John Deere?",
        r: "Sim, além de tratores temos peças para colheitadeiras e plantadeiras John Deere. Busque pelo código original ou mande uma foto da peça pelo WhatsApp.",
      },
    ],
  },
  valtra: {
    titulo: "Peças Valtra e Valmet no Sul do Brasil",
    paragrafos: [
      "Peças para tratores Valtra e Valmet (685, 785, 885, 985, BM, BH e série A): kits de motor, juntas, bombas, filtros, rolamentos e peças de transmissão e levante, com o código original.",
      `Busque por "Valtra" ou "Valmet": aparecem as mesmas peças. Enviamos para ${ESTADOS} por Correios ou transportadora, com nota fiscal.`,
    ],
    perguntas: [],
  },
  "new-holland": {
    titulo: "Peças New Holland no RS, SC e PR",
    paragrafos: [
      "Peças para tratores New Holland TL, TM, TS, TT, 7630, 8030 e a linha Ford New Holland, e para colheitadeiras New Holland: filtros, juntas, rolamentos, motor, hidráulico, direção, embreagem e transmissão, com código original.",
      `Enviamos para ${ESTADOS} por Correios ou transportadora, com nota fiscal e rastreio.`,
    ],
    perguntas: [],
  },
  agrale: {
    titulo: "Peças Agrale no RS, SC e PR",
    paragrafos: [
      "Os tratores Agrale são muito usados em propriedades familiares, na fruticultura e nas serras gaúcha e catarinense. Temos peças Agrale para os modelos 4100, 4118, 4230, 5075 e série BX: motor, transmissão, embreagem, hidráulico, direção e filtros, com código original.",
      `Enviamos para ${ESTADOS} por Correios ou transportadora, com nota fiscal.`,
    ],
    perguntas: [],
  },
};

export const GUIAS_CATEGORIA_PT: Record<string, GuiaSeo> = {
  cosechadoras: {
    titulo: "Peças para colheitadeira no RS, SC e PR",
    paragrafos: [
      "Temos peças para colheitadeiras John Deere, New Holland, Case IH e Massey Ferguson: plataforma, cilindro e côncavo, caracóis, peneiras, correias, correntes, rolamentos, juntas e filtros, cada uma com o código original.",
      "Antes da colheita de soja, milho, trigo ou arroz, revise rolamentos, correias e correntes: são as peças que mais param a colheitadeira no meio da safra. Busque pelo código gravado na peça ou mande uma foto pelo WhatsApp com o modelo da máquina.",
      `Enviamos para ${ESTADOS} por Correios ou transportadora, com nota fiscal e rastreio.`,
    ],
    perguntas: [
      {
        p: "Vocês têm peças para colheitadeira John Deere e New Holland?",
        r: "Sim. A maior parte das peças de colheitadeira do catálogo é John Deere, New Holland e Case IH. Busque pelo código original ou fale conosco pelo WhatsApp com o modelo e o ano da máquina.",
      },
    ],
  },
  sembradoras: {
    titulo: "Peças para plantadeira no RS, SC e PR",
    paragrafos: [
      "Peças para plantadeiras e semeadoras: buchas, discos de corte, facões, dosadores, engrenagens, correntes e rolamentos, com o código original de cada peça.",
      `Para não perder dias de plantio, revise a plantadeira antes da safra e peça as peças com antecedência. Enviamos para ${ESTADOS} com nota fiscal.`,
    ],
    perguntas: [],
  },
  pulverizadores: {
    titulo: "Peças para pulverizador Jacto e outras marcas no RS, SC e PR",
    paragrafos: [
      "Peças para pulverizadores Jacto e outras marcas: bicos, filtros de linha, válvulas, bombas, membranas, mangueiras e conexões, com código original.",
      `Mande o modelo do pulverizador ou uma foto da peça pelo WhatsApp e confirmamos a peça certa. Enviamos para ${ESTADOS} por Correios ou transportadora.`,
    ],
    perguntas: [],
  },
  filtros: {
    titulo: "Filtros para trator no RS, SC e PR: óleo, combustível, ar e hidráulico",
    paragrafos: [
      "Filtros para tratores e colheitadeiras Massey Ferguson, Valtra, John Deere, New Holland, Case IH, Ford e Agrale: óleo do motor, combustível (diesel) e sedimentadores, ar (primário e de segurança), hidráulico e de transmissão.",
      "Busque pelo código original do filtro ou pelo código do filtro que está no trator. Se preferir, mande pelo WhatsApp o modelo do trator e montamos o kit de filtros para a revisão.",
      `Enviamos filtros para ${ESTADOS} por Correios ou transportadora, com nota fiscal e rastreio.`,
    ],
    perguntas: [
      {
        p: "Vocês montam kit de filtros para a revisão do trator?",
        r: "Sim. Mande pelo WhatsApp a marca, o modelo e o número de série do trator e passamos o kit de filtros (óleo, combustível, ar e hidráulico) com preço e frete.",
      },
    ],
  },
};

export const GUIA_INICIO_PT: GuiaSeo = {
  titulo: "Peças para tratores no Rio Grande do Sul, Santa Catarina e Paraná",
  paragrafos: [
    "A AGRO PARTS é uma loja online de peças para tratores, colheitadeiras e máquinas agrícolas, com mais de 49.000 peças com código original para Massey Ferguson, John Deere, Valtra, New Holland, Case IH, Ford e Agrale: filtros, rolamentos, juntas e retentores, motor, transmissão, hidráulico, freios, embreagens e elétrica.",
    `Busque pelo código da peça, pela marca ou pelo tipo, monte o seu orçamento e mande pelo WhatsApp. Respondemos com preço, disponibilidade e frete, e enviamos para ${ESTADOS} por Correios ou transportadora, com nota fiscal e código de rastreio.`,
  ],
  perguntas: [
    {
      p: "Onde comprar peças para trator no RS, SC e PR?",
      r: "Na AGRO PARTS você busca entre mais de 49.000 peças agrícolas, faz o orçamento pelo WhatsApp e recebe por Correios ou transportadora em qualquer cidade do Rio Grande do Sul, de Santa Catarina e do Paraná.",
    },
    {
      p: "Vocês emitem nota fiscal?",
      r: "Sim. As vendas para o Brasil são feitas pela nossa empresa brasileira, com nota fiscal.",
    },
    {
      p: "Como sei se a peça serve no meu trator?",
      r: "Busque pelo código original da peça. Se tiver dúvida, mande pelo WhatsApp o modelo, o número de série e uma foto da peça e confirmamos antes da compra.",
    },
  ],
};

export const GUIA_ZONAS_PT: GuiaSeo = {
  titulo: "Peças agrícolas no Sul do Brasil: o que você encontra e como comprar",
  paragrafos: [
    "Atendemos produtores, prestadores de serviço e oficinas do Rio Grande do Sul, de Santa Catarina e do Paraná com peças para tratores, colheitadeiras, plantadeiras e máquinas de forragem, sempre com o código original da peça.",
    "As peças mais pedidas são filtros, rolamentos, retentores e juntas, peças de transmissão e embreagem, bombas e componentes hidráulicos e peças de motor. Escolha a sua região ou cidade para ver as marcas mais comuns, ou busque direto pelo código.",
    "Enviamos por Correios ou transportadora, com nota fiscal e código de rastreio, e confirmamos preço, disponibilidade e frete pelo WhatsApp antes da compra.",
  ],
  perguntas: [
    {
      p: "Vocês enviam peças agrícolas para todo o Sul do Brasil?",
      r: "Sim. Enviamos para qualquer cidade do Rio Grande do Sul, de Santa Catarina e do Paraná por Correios ou transportadora, com nota fiscal e rastreio.",
    },
    {
      p: "Quais formas de pagamento vocês aceitam?",
      r: "Mandamos um link de pagamento seguro, com PIX ou cartão. O valor e o frete são confirmados antes pelo WhatsApp.",
    },
  ],
};

export const guiaInicio = (idioma: "es" | "pt") => (idioma === "pt" ? GUIA_INICIO_PT : GUIA_INICIO);
export const guiaZonas = (idioma: "es" | "pt") => (idioma === "pt" ? GUIA_ZONAS_PT : GUIA_ZONAS);
