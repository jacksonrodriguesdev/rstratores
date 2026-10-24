// Conteúdo próprio de cada página de entrada (só em espanhol: é a versão que vai para o Google).
// Escrito para as buscas com intenção de compra: "repuestos Massey Ferguson Uruguay",
// "filtros para tractores Uruguay", "repuestos agrícolas Uruguay"... e as parecidas
// (repuestos MF, piezas, tractor, cosechadora). Sem promessas que não dá para provar
// (nada de "el mejor precio" ou "el más completo").
import { perguntasFrequentes } from "./seo-paginas";

export type Pergunta = { p: string; r: string };
export type GuiaSeo = { titulo: string; paragrafos: string[]; perguntas: Pergunta[] };

const DEPARTAMENTOS =
  "Montevideo, Canelones, Colonia, Soriano, Paysandú, Salto, Tacuarembó, Rivera, Cerro Largo, Treinta y Tres, Rocha, Maldonado, Lavalleja, Florida, Durazno, Flores, San José, Río Negro y Artigas";

export const GUIAS_MARCA: Record<string, GuiaSeo> = {
  "massey-ferguson": {
    titulo: "Repuestos Massey Ferguson en Uruguay: cómo encontrar la pieza justa",
    paragrafos: [
      "Los tractores Massey Ferguson (MF) son de los más comunes en el campo uruguayo: muchos MF 265, 275, 283, 290 y 292 siguen trabajando todos los días en tambos, chacras y establecimientos ganaderos. Por eso armamos un catálogo de repuestos Massey Ferguson pensado para el productor y el taller: piezas de motor, transmisión, embrague, frenos, hidráulica, dirección, levante de tres puntos y filtros.",
      "Cada repuesto MF tiene su código original (por ejemplo, los terminados en M1, M91 o M92), así podés compararlo con la pieza que sacaste del tractor o con el catálogo de tu equipo. Si no encontrás el código, mandanos por WhatsApp una foto de la pieza, el modelo y el número de serie del tractor y te confirmamos la compatibilidad antes de comprar.",
      `Enviamos repuestos Massey Ferguson a los 19 departamentos por DAC, con número de rastreo: ${DEPARTAMENTOS}.`,
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
      "Enviamos repuestos John Deere a todo Uruguay por DAC, con número de rastreo, y te pasamos el precio, la disponibilidad y el costo del envío antes de que confirmes la compra.",
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
      `Hacemos envíos de repuestos Agrale a los 19 departamentos por DAC, con número de rastreo: ${DEPARTAMENTOS}.`,
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
      "Enviamos repuestos Valtra a todo Uruguay por DAC, con número de rastreo.",
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
      "Buscá por el código de la pieza o por el modelo del tractor; si no lo encontrás, consultanos por WhatsApp. Enviamos a los 19 departamentos de Uruguay por DAC, con número de rastreo.",
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
      "Te confirmamos la compatibilidad por WhatsApp antes de comprar y enviamos a todo Uruguay por DAC, con número de rastreo.",
    ],
    perguntas: [],
  },
  ford: {
    titulo: "Repuestos para tractores Ford en Uruguay",
    paragrafos: [
      "Los tractores Ford 4600, 5600, 6600, 6610, 7610 y 7630 siguen trabajando en muchos campos de Uruguay. Tenemos repuestos de motor, bomba hidráulica, embrague, frenos y transmisión para mantenerlos en marcha, con código original.",
      "Consultanos por WhatsApp con el modelo y una foto de la pieza. Enviamos a todo Uruguay por DAC.",
    ],
    perguntas: [],
  },
};

export const GUIAS_CATEGORIA: Record<string, GuiaSeo> = {
  filtros: {
    titulo: "Filtros para tractores en Uruguay: aceite, combustible, aire e hidráulico",
    paragrafos: [
      "Tenemos filtros para tractores y cosechadoras Massey Ferguson, Valtra, John Deere, New Holland, Case IH, Ford y Agrale: filtros de aceite de motor, de combustible (gasoil) y sedimentadores, de aire (primario y de seguridad), hidráulicos y de transmisión.",
      "Para elegir el filtro correcto, buscá por el código original del filtro o por el código del filtro que tenés puesto. Si preferís, mandanos por WhatsApp el modelo del tractor y te armamos el kit de filtros para el service (aceite, combustible, aire e hidráulico).",
      `Cambiar los filtros en los intervalos que indica el manual protege el motor, la bomba inyectora y el sistema hidráulico. Enviamos filtros a los 19 departamentos de Uruguay por DAC, con número de rastreo: ${DEPARTAMENTOS}.`,
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
    "Buscá por el código de la pieza, por la marca o por el tipo de repuesto, agregá lo que necesitás a tu cotización y envianos la lista por WhatsApp. Te respondemos con precio, disponibilidad y costo del envío, y despachamos por DAC a los 19 departamentos, con número de rastreo.",
  ],
  perguntas: [
    {
      p: "¿Dónde comprar repuestos para tractores en Uruguay?",
      r: "En AGRO PARTS podés buscar entre más de 49.000 repuestos agrícolas, cotizar por WhatsApp y recibir el pedido por DAC en cualquier departamento de Uruguay.",
    },
    {
      p: "¿Hacen envíos a todo Uruguay?",
      r: "Sí. Enviamos a los 19 departamentos por DAC, con número de rastreo. El costo del envío lo paga el cliente al recibir o al retirar en la agencia DAC.",
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
    `Despachamos por DAC a ${DEPARTAMENTOS}, con número de rastreo, y te confirmamos el precio, la disponibilidad y el envío por WhatsApp antes de la compra.`,
  ],
  perguntas: [
    {
      p: "¿Venden repuestos agrícolas para todo Uruguay?",
      r: "Sí. Enviamos repuestos agrícolas a los 19 departamentos por DAC, con número de rastreo.",
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
