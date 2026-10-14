// Páginas de entrada para o Google: /repuestos/<marca>, /repuestos/<categoria> e
// /repuestos/<marca>/<categoria>. Cada uma tem título, texto e endereço em espanhol, porque é
// assim que o cliente uruguaio busca ("repuestos John Deere Uruguay", "filtros Massey Ferguson").
// Os valores do banco (marca e categoria em português) continuam os mesmos.

export const slugify = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

// texto_pt: versão em português (páginas /pt, cliente do Brasil)
export type MarcaSeo = { slug: string; marca: string; modelos: string; texto: string; texto_pt: string };
export type CategoriaSeo = { slug: string; categoria: string; nome: string; texto: string; texto_pt: string };

export const MARCAS_SEO: MarcaSeo[] = [
  {
    marca: "Massey Ferguson",
    modelos: "MF 265, 275, 283, 290, 292, 297, 4275, 4283, 4290, 4292, 5275, 5290, 5310 y 6360",
    texto: "Massey Ferguson es una de las marcas de tractores más usadas en el campo uruguayo. Tenemos repuestos de motor, transmisión, hidráulica, frenos y embragues para toda la línea, con el código original de cada pieza para que compres sin equivocarte.",
    texto_pt: "A Massey Ferguson é uma das marcas de trator mais usadas no campo. Temos peças de motor, transmissão, hidráulica, freios e embreagens para toda a linha, com o código original de cada peça para você comprar sem erro.",
  },
  {
    marca: "Valtra",
    modelos: "Valtra / Valmet 685, 785, 885, 985, BM 100, BM 110, BH 140, BH 160, BH 180 y serie A",
    texto: "Repuestos para tractores Valtra y Valmet con motor Sisu/AGCO Power: kits de motor, juntas, bombas, filtros, rodamientos y piezas de transmisión. Buscá por el código original y te confirmamos la compatibilidad con tu modelo.",
    texto_pt: "Peças para tratores Valtra e Valmet com motor Sisu/AGCO Power: kits de motor, juntas, bombas, filtros, rolamentos e peças de transmissão. Busque pelo código original e confirmamos a compatibilidade com o seu modelo.",
  },
  {
    marca: "New Holland",
    modelos: "New Holland TL, TM, TS, TT, 7630, 8030 y la línea Ford New Holland",
    texto: "Repuestos para tractores y cosechadoras New Holland: piezas de motor, hidráulica, dirección, embrague y transmisión. Te ayudamos a encontrar el repuesto correcto con el código del fabricante.",
    texto_pt: "Peças para tratores e colheitadeiras New Holland: motor, hidráulica, direção, embreagem e transmissão. Ajudamos a encontrar a peça certa pelo código do fabricante.",
  },
  {
    marca: "John Deere",
    modelos: "John Deere series 5000, 6000 y 7000 (5705, 5725, 6110J, 6405, 6605, 7505) y cosechadoras",
    texto: "Repuestos para tractores y cosechadoras John Deere: filtros, rodamientos, juntas, piezas de motor, hidráulica y transmisión. Consultá precio y disponibilidad por WhatsApp y recibí en todo Uruguay.",
    texto_pt: "Peças para tratores e colheitadeiras John Deere: filtros, rolamentos, juntas, peças de motor, hidráulica e transmissão. Consulte preço e disponibilidade pelo WhatsApp e receba em todo o Rio Grande do Sul.",
  },
  {
    marca: "Case IH",
    modelos: "Case IH Maxxum, Farmall, Puma y Magnum, y cosechadoras Axial-Flow",
    texto: "Repuestos para tractores y cosechadoras Case IH: piezas de motor, transmisión, hidráulica, frenos y filtros. Cada repuesto con su código original para confirmar la compatibilidad.",
    texto_pt: "Peças para tratores e colheitadeiras Case IH: motor, transmissão, hidráulica, freios e filtros. Cada peça com o código original para confirmar a compatibilidade.",
  },
  {
    marca: "Ford",
    modelos: "Ford 4600, 5600, 6600, 6610, 7610 y 7630",
    texto: "Repuestos para los clásicos tractores Ford que siguen trabajando en Uruguay: piezas de motor, bomba hidráulica, embrague, frenos y transmisión, con código original.",
    texto_pt: "Peças para os clássicos tratores Ford que continuam trabalhando: motor, bomba hidráulica, embreagem, freios e transmissão, com código original.",
  },
  {
    marca: "Agrale",
    modelos: "Agrale 4100, 4118, 4230, 5075 y serie BX",
    texto: "Repuestos para tractores Agrale: piezas de motor, transmisión, hidráulica y filtros. Buscá por código y pedí tu cotización por WhatsApp.",
    texto_pt: "Peças para tratores Agrale: motor, transmissão, hidráulica e filtros. Busque pelo código e peça seu orçamento pelo WhatsApp.",
  },
].map((m) => ({ ...m, slug: slugify(m.marca) }));

// Nome e texto das categorias em espanhol (a chave é o valor do banco, em português)
const CATS: Array<{ categoria: string; nome: string; texto: string; texto_pt: string }> = [
  { categoria: "Engrenagens e Transmissão", nome: "Engranajes y Transmisión", texto: "Engranajes, piñones, coronas, ejes, crucetas y piezas de caja y diferencial: todo lo que lleva la fuerza del motor a las ruedas y a la toma de fuerza.", texto_pt: "Engrenagens, pinhões, coroas, eixos, cruzetas e peças de câmbio e diferencial: tudo o que leva a força do motor às rodas e à tomada de potência." },
  { categoria: "Hidráulica e Pneumática", nome: "Hidráulica y Neumática", texto: "Bombas hidráulicas, válvulas, cilindros, mangueras y conexiones para el sistema hidráulico, el levante de tres puntos y la dirección.", texto_pt: "Bombas hidráulicas, válvulas, cilindros, mangueiras e conexões para o sistema hidráulico, o levante de três pontos e a direção." },
  { categoria: "Filtros", nome: "Filtros", texto: "Filtros de aceite, combustible, aire e hidráulico. Cambiarlos a tiempo protege el motor y los sistemas hidráulicos de tu tractor.", texto_pt: "Filtros de óleo, combustível, ar e hidráulico. Trocar no prazo protege o motor e os sistemas hidráulicos do seu trator." },
  { categoria: "Vedações", nome: "Sellos y Juntas", texto: "Retenes, juntas, o-rings y kits de juntas de motor y transmisión para evitar pérdidas de aceite y la entrada de polvo y agua.", texto_pt: "Retentores, juntas, o-rings e jogos de juntas de motor e transmissão para evitar vazamentos de óleo e a entrada de poeira e água." },
  { categoria: "Rolamentos e Mancais", nome: "Rodamientos y Cojinetes", texto: "Rodamientos, cojinetes y bujes para ruedas, transmisión, embrague y ejes, de las principales medidas usadas en maquinaria agrícola.", texto_pt: "Rolamentos, mancais e buchas para rodas, transmissão, embreagem e eixos, nas principais medidas usadas em máquinas agrícolas." },
  { categoria: "Elementos de Fixação", nome: "Tornillería y Fijación", texto: "Tornillos, tuercas, bulones, pernos y elementos de fijación para el montaje y el mantenimiento de tu equipo.", texto_pt: "Parafusos, porcas, pinos e elementos de fixação para a montagem e a manutenção do seu equipamento." },
  { categoria: "Freios e Embreagens", nome: "Frenos y Embragues", texto: "Discos y platos de embrague, rulemanes de empuje, pastillas, cintas y piezas de freno para un manejo seguro.", texto_pt: "Discos e platôs de embreagem, rolamentos de embreagem, pastilhas, lonas e peças de freio para uma condução segura." },
  { categoria: "Estrutura e Suspensão", nome: "Estructura y Suspensión", texto: "Soportes, ejes delanteros, brazos, pernos y piezas estructurales del tractor y sus implementos.", texto_pt: "Suportes, eixos dianteiros, braços, pinos e peças estruturais do trator e dos implementos." },
  { categoria: "Elétrica e Sensores", nome: "Eléctrica y Sensores", texto: "Motores de arranque, alternadores, solenoides, sensores, interruptores y piezas del sistema eléctrico.", texto_pt: "Motores de partida, alternadores, solenoides, sensores, interruptores e peças do sistema elétrico." },
  { categoria: "Outros Componentes", nome: "Otros Componentes", texto: "Otros repuestos para tractores y cosechadoras. Si no encontrás lo que buscás, mandanos el código por WhatsApp.", texto_pt: "Outras peças para tratores e colheitadeiras. Se não encontrar o que procura, mande o código pelo WhatsApp." },
];
export const CATEGORIAS_SEO: CategoriaSeo[] = CATS.map((c) => ({ ...c, slug: slugify(c.nome) }));

export const marcaPorSlug = (s: string) => MARCAS_SEO.find((m) => m.slug === s) ?? null;
export const categoriaPorSlug = (s: string) => CATEGORIAS_SEO.find((c) => c.slug === s) ?? null;
export const slugDaMarca = (marca: string) => MARCAS_SEO.find((m) => m.marca === marca)?.slug ?? null;
export const slugDaCategoria = (categoria: string) => CATEGORIAS_SEO.find((c) => c.categoria === categoria)?.slug ?? null;

// Endereço da página de entrada para uma marca e/ou categoria do banco (ou null se não existir)
export function urlRepuestos(o: { marca?: string | null; categoria?: string | null }): string | null {
  const m = o.marca ? slugDaMarca(o.marca) : null;
  const c = o.categoria ? slugDaCategoria(o.categoria) : null;
  if (o.marca && !m) return null;
  if (o.categoria && !c) return null;
  if (m && c) return `/repuestos/${m}/${c}`;
  if (m) return `/repuestos/${m}`;
  if (c) return `/repuestos/${c}`;
  return null;
}

// Perguntas frequentes das páginas (também vão como dados estruturados FAQPage)
export function perguntasFrequentes(alvo: string, idioma: "es" | "pt" = "es") {
  if (idioma === "pt")
    return [
      {
        p: "Vocês enviam para todo o Rio Grande do Sul?",
        r: "Sim. Enviamos para qualquer cidade do Rio Grande do Sul por Correios ou transportadora, com código de rastreio. Estamos na fronteira Chuí / Chuy. O frete é combinado pelo WhatsApp e pago pelo cliente.",
      },
      {
        p: `Como sei se a peça ${alvo} é a certa para o meu trator?`,
        r: "Busque pelo código original da peça (gravado na peça ou no catálogo do seu equipamento). Se tiver dúvida, mande pelo WhatsApp o modelo e o número de série e confirmamos a compatibilidade antes da compra.",
      },
      {
        p: "Como eu compro?",
        r: "Adicione as peças ao seu orçamento e mande a lista pelo WhatsApp. Respondemos com preço, disponibilidade e frete.",
      },
      {
        p: "Aceitam trocas ou devoluções?",
        r: "Sim, você tem 7 dias a partir do recebimento para trocar ou devolver uma peça sem uso e na embalagem original. O envio da devolução é por conta do cliente.",
      },
    ];
  return [
    {
      p: "¿Hacen envíos a todo Uruguay?",
      r: "Sí. Enviamos a los 19 departamentos por DAC, con número de rastreo. El costo del envío lo paga el cliente al recibir o retirar en la agencia DAC.",
    },
    {
      p: `¿Cómo sé si el repuesto ${alvo} es el correcto para mi tractor?`,
      r: "Buscá por el código original de la pieza (está grabado en la pieza o en el catálogo de tu equipo). Si tenés dudas, mandanos por WhatsApp el modelo y el número de serie y te confirmamos la compatibilidad antes de comprar.",
    },
    {
      p: "¿Cómo compro?",
      r: "Agregá los repuestos a tu cotización y envianos la lista por WhatsApp. Te respondemos con precio, disponibilidad y el costo del envío.",
    },
    {
      p: "¿Aceptan cambios o devoluciones?",
      r: "Sí, tenés 7 días desde que recibís el pedido para cambiar o devolver un repuesto sin uso y en su embalaje original. El envío de la devolución corre por cuenta del cliente.",
    },
  ];
}
