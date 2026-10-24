// Guias técnicos (/guias/<slug> em espanhol, /pt/guias/<slug> em português): respondem dúvidas que o
// produtor pesquisa antes de comprar e levam para as peças. Conteúdo geral e prático: intervalos e
// especificações variam por modelo, então os textos sempre mandam conferir o manual da máquina.
export type TextoBi = { es: string; pt: string };
export type Guia = {
  slug: string;
  titulo: TextoBi;
  resumo: TextoBi;
  secoes: Array<{ titulo: TextoBi; paragrafos: TextoBi[] }>;
  links: Array<{ href: string; texto: TextoBi }>;
  perguntas: Array<{ p: TextoBi; r: TextoBi }>;
};

export const GUIAS: Guia[] = [
  {
    slug: "como-encontrar-el-codigo-de-un-repuesto",
    titulo: {
      es: "Cómo encontrar el código original de un repuesto de tractor",
      pt: "Como achar o código original de uma peça de trator",
    },
    resumo: {
      es: "Dónde está grabado el código de la pieza, cómo leerlo y qué hacer si está borrado, para pedir el repuesto correcto sin equivocarte.",
      pt: "Onde fica gravado o código da peça, como ler e o que fazer se estiver apagado, para pedir a peça certa sem erro.",
    },
    secoes: [
      {
        titulo: { es: "Dónde buscar el código", pt: "Onde procurar o código" },
        paragrafos: [
          {
            es: "La mayoría de las piezas tiene el número del fabricante grabado o estampado: en el borde de rodamientos y retenes, en la etiqueta o el cuerpo de los filtros, en la carcasa de bombas y en una chapa en motores de arranque y alternadores. Limpiá bien la pieza antes de leerlo.",
            pt: "A maioria das peças tem o número do fabricante gravado ou estampado: na borda de rolamentos e retentores, na etiqueta ou no corpo dos filtros, na carcaça das bombas e numa plaqueta nos motores de partida e alternadores. Limpe bem a peça antes de ler.",
          },
          {
            es: "Los códigos originales suelen tener un formato propio de cada marca: Massey Ferguson usa números terminados en M1, M91 o M92; John Deere usa letras al inicio (AL, AH, AR, RE); New Holland y Case usan números largos de 8 a 9 dígitos.",
            pt: "Os códigos originais costumam ter um formato próprio de cada marca: a Massey Ferguson usa números terminados em M1, M91 ou M92; a John Deere usa letras no início (AL, AH, AR, RE); New Holland e Case usam números longos, de 8 a 9 dígitos.",
          },
        ],
      },
      {
        titulo: {
          es: "Si el código está borrado",
          pt: "Se o código estiver apagado",
        },
        paragrafos: [
          {
            es: "Anotá la marca, el modelo y el número de serie del tractor (está en la chapa de identificación, normalmente en el chasis o cerca del asiento), sacá fotos de la pieza desde varios ángulos con una regla al lado y medí diámetros, largos y cantidad de dientes o agujeros. Con eso es posible identificar la pieza en el catálogo del fabricante.",
            pt: "Anote a marca, o modelo e o número de série do trator (fica na plaqueta de identificação, normalmente no chassi ou perto do banco), tire fotos da peça de vários ângulos com uma régua ao lado e meça diâmetros, comprimentos e número de dentes ou furos. Com isso dá para identificar a peça no catálogo do fabricante.",
          },
        ],
      },
      {
        titulo: { es: "Cómo buscarlo en la tienda", pt: "Como buscar na loja" },
        paragrafos: [
          {
            es: "Escribí el código en el buscador tal como aparece, con o sin guiones: la búsqueda encuentra el original y los equivalentes de otras marcas. Si no aparece, mandanos el código o las fotos por WhatsApp.",
            pt: "Digite o código na busca do jeito que aparece, com ou sem traços: a busca encontra o original e os equivalentes de outras marcas. Se não aparecer, mande o código ou as fotos pelo WhatsApp.",
          },
        ],
      },
    ],
    links: [
      { href: "/loja", texto: { es: "Buscar por código", pt: "Buscar por código" } },
      {
        href: "/repuestos/massey-ferguson",
        texto: { es: "Repuestos Massey Ferguson", pt: "Peças Massey Ferguson" },
      },
      {
        href: "/repuestos/john-deere",
        texto: { es: "Repuestos John Deere", pt: "Peças John Deere" },
      },
    ],
    perguntas: [
      {
        p: {
          es: "¿Sirve un repuesto con otro código para mi tractor?",
          pt: "Uma peça com outro código serve no meu trator?",
        },
        r: {
          es: "Puede servir si es un equivalente (misma medida y función, de otra marca). En cada repuesto mostramos los códigos equivalentes; ante la duda, consultanos por WhatsApp antes de comprar.",
          pt: "Pode servir se for um equivalente (mesma medida e função, de outra marca). Em cada peça mostramos os códigos equivalentes; na dúvida, fale conosco pelo WhatsApp antes de comprar.",
        },
      },
    ],
  },
  {
    slug: "cada-cuanto-cambiar-los-filtros-del-tractor",
    titulo: {
      es: "Cada cuánto cambiar los filtros del tractor",
      pt: "De quanto em quanto tempo trocar os filtros do trator",
    },
    resumo: {
      es: "Aceite, combustible, aire e hidráulico: para qué sirve cada filtro, señales de que hay que cambiarlo y cómo armar el kit para el service.",
      pt: "Óleo, combustível, ar e hidráulico: para que serve cada filtro, sinais de que precisa trocar e como montar o kit para a revisão.",
    },
    secoes: [
      {
        titulo: { es: "Qué dice el manual", pt: "O que diz o manual" },
        paragrafos: [
          {
            es: "El intervalo de cambio lo define el fabricante y varía según el modelo y el uso. Muchos manuales indican cambiar el filtro de aceite junto con el aceite del motor y los filtros de combustible e hidráulico a intervalos más largos; en tierra seca y con mucho polvo, el filtro de aire se revisa más seguido. Siempre confirmá en el manual de tu tractor.",
            pt: "O intervalo de troca é definido pelo fabricante e varia conforme o modelo e o uso. Muitos manuais pedem trocar o filtro de óleo junto com o óleo do motor e os filtros de combustível e hidráulico em intervalos mais longos; em terra seca e com muita poeira, o filtro de ar é revisado com mais frequência. Sempre confira no manual do seu trator.",
          },
        ],
      },
      {
        titulo: { es: "Señales de filtro saturado", pt: "Sinais de filtro saturado" },
        paragrafos: [
          {
            es: "Pérdida de potencia, humo negro, el motor que tarda en arrancar o se apaga (combustible), el levante o la dirección más lentos (hidráulico) y el testigo de restricción del filtro de aire encendido son señales de que el filtro necesita cambio.",
            pt: "Perda de potência, fumaça preta, o motor que demora para pegar ou apaga (combustível), o levante ou a direção mais lentos (hidráulico) e a luz de restrição do filtro de ar acesa são sinais de que o filtro precisa ser trocado.",
          },
        ],
      },
      {
        titulo: { es: "Cómo armar el kit del service", pt: "Como montar o kit da revisão" },
        paragrafos: [
          {
            es: "Con la marca, el modelo y el número de serie del tractor se arma el kit completo: filtro de aceite, de combustible (y sedimentador), de aire primario y de seguridad, e hidráulico. Pedirlo junto ahorra viajes y envíos.",
            pt: "Com a marca, o modelo e o número de série do trator dá para montar o kit completo: filtro de óleo, de combustível (e sedimentador), de ar primário e de segurança, e hidráulico. Pedir junto economiza viagens e frete.",
          },
        ],
      },
    ],
    links: [
      {
        href: "/repuestos/filtros",
        texto: { es: "Filtros para tractores", pt: "Filtros para trator" },
      },
      {
        href: "/repuestos/valtra/filtros",
        texto: { es: "Filtros Valtra", pt: "Filtros Valtra" },
      },
      {
        href: "/repuestos/massey-ferguson/filtros",
        texto: { es: "Filtros Massey Ferguson", pt: "Filtros Massey Ferguson" },
      },
    ],
    perguntas: [
      {
        p: {
          es: "¿Puedo usar un filtro de otra marca en lugar del original?",
          pt: "Posso usar um filtro de outra marca no lugar do original?",
        },
        r: {
          es: "Sí, si es el equivalente correcto (misma rosca, medidas y especificación). En cada filtro indicamos el código original al que equivale.",
          pt: "Sim, se for o equivalente correto (mesma rosca, medidas e especificação). Em cada filtro indicamos o código original a que ele equivale.",
        },
      },
    ],
  },
  {
    slug: "valtra-o-valmet",
    titulo: {
      es: "Valtra o Valmet: ¿son la misma marca y usan los mismos repuestos?",
      pt: "Valtra ou Valmet: é a mesma marca e usam as mesmas peças?",
    },
    resumo: {
      es: "Por qué en el campo todavía se dice Valmet, qué cambió con el nombre Valtra y cómo encontrar los repuestos correctos.",
      pt: "Por que no campo ainda se fala Valmet, o que mudou com o nome Valtra e como achar as peças certas.",
    },
    secoes: [
      {
        titulo: { es: "La misma marca, otro nombre", pt: "A mesma marca, outro nome" },
        paragrafos: [
          {
            es: "Valtra es el nombre que adoptó la marca Valmet en la década de 1990. Por eso muchos tractores más viejos tienen el logo Valmet y los más nuevos el de Valtra, y en el campo los dos nombres se usan para lo mismo.",
            pt: "Valtra é o nome que a marca Valmet adotou nos anos 1990. Por isso muitos tratores mais antigos têm o logo Valmet e os mais novos o da Valtra, e no campo os dois nomes são usados para a mesma coisa.",
          },
        ],
      },
      {
        titulo: { es: "Los repuestos", pt: "As peças" },
        paragrafos: [
          {
            es: "Muchos repuestos son comunes entre modelos Valmet y Valtra de la misma línea, pero no todos: lo seguro es buscar por el código original de la pieza. En la tienda podés escribir «Valmet» o «Valtra» y aparecen los mismos repuestos.",
            pt: "Muitas peças são comuns entre modelos Valmet e Valtra da mesma linha, mas nem todas: o seguro é buscar pelo código original da peça. Na loja você pode digitar «Valmet» ou «Valtra» que aparecem as mesmas peças.",
          },
        ],
      },
    ],
    links: [
      {
        href: "/repuestos/valtra",
        texto: { es: "Repuestos Valtra / Valmet", pt: "Peças Valtra / Valmet" },
      },
      { href: "/repuestos/valtra/filtros", texto: { es: "Filtros Valtra", pt: "Filtros Valtra" } },
    ],
    perguntas: [
      {
        p: {
          es: "¿Un repuesto Valmet sirve en un Valtra?",
          pt: "Uma peça Valmet serve num Valtra?",
        },
        r: {
          es: "Muchas veces sí, cuando el código original es el mismo. Confirmá con el código de la pieza o mandanos el modelo y el número de serie por WhatsApp.",
          pt: "Muitas vezes sim, quando o código original é o mesmo. Confirme pelo código da peça ou mande o modelo e o número de série pelo WhatsApp.",
        },
      },
    ],
  },
  {
    slug: "revision-de-la-cosechadora-antes-de-la-zafra",
    titulo: {
      es: "Revisión de la cosechadora antes de la zafra: qué mirar",
      pt: "Revisão da colheitadeira antes da safra: o que olhar",
    },
    resumo: {
      es: "Las piezas que más paran la cosechadora en plena cosecha y cómo revisarlas con tiempo para no perder días.",
      pt: "As peças que mais param a colheitadeira no meio da colheita e como revisar com antecedência para não perder dias.",
    },
    secoes: [
      {
        titulo: { es: "Plataforma y alimentación", pt: "Plataforma e alimentação" },
        paragrafos: [
          {
            es: "Revisá cuchillas y guardas de la barra de corte, el sinfín de la plataforma, el embocador y sus cadenas, y el estado de las correas. Una cuchilla gastada o una cadena estirada bajan el rendimiento y terminan en rotura.",
            pt: "Revise facas e dedos da barra de corte, o caracol da plataforma, o canal alimentador e suas correntes, e o estado das correias. Uma faca gasta ou uma corrente esticada derrubam o rendimento e acabam em quebra.",
          },
        ],
      },
      {
        titulo: { es: "Trilla, limpieza y rodamientos", pt: "Trilha, limpeza e rolamentos" },
        paragrafos: [
          {
            es: "Mirá el cilindro y el cóncavo, las zarandas y el ventilador, y escuchá los rodamientos con la máquina en marcha: ruido o calor son señal de cambio. Tener a mano rodamientos, correas y retenes de repuesto evita días parados.",
            pt: "Olhe o cilindro e o côncavo, as peneiras e o ventilador, e escute os rolamentos com a máquina ligada: barulho ou calor são sinal de troca. Ter à mão rolamentos, correias e retentores de reposição evita dias parados.",
          },
        ],
      },
      {
        titulo: { es: "Motor e hidráulica", pt: "Motor e hidráulico" },
        paragrafos: [
          {
            es: "Cambiá filtros y aceite según el manual, limpiá el radiador y revisá mangueras y conexiones hidráulicas. En plena cosecha el polvo satura el filtro de aire más rápido.",
            pt: "Troque filtros e óleo conforme o manual, limpe o radiador e revise mangueiras e conexões hidráulicas. No meio da colheita a poeira satura o filtro de ar mais rápido.",
          },
        ],
      },
    ],
    links: [
      {
        href: "/repuestos/cosechadoras",
        texto: { es: "Repuestos para cosechadoras", pt: "Peças para colheitadeira" },
      },
      {
        href: "/repuestos/rodamientos-y-cojinetes",
        texto: { es: "Rodamientos", pt: "Rolamentos" },
      },
      { href: "/repuestos/filtros", texto: { es: "Filtros", pt: "Filtros" } },
    ],
    perguntas: [
      {
        p: {
          es: "¿Con cuánta anticipación conviene pedir los repuestos?",
          pt: "Com quanta antecedência vale pedir as peças?",
        },
        r: {
          es: "Lo ideal es revisar la máquina y pedir los repuestos algunas semanas antes de la zafra, para tener tiempo de envío y de cambiar lo que falte.",
          pt: "O ideal é revisar a máquina e pedir as peças algumas semanas antes da safra, para ter tempo de envio e de trocar o que faltar.",
        },
      },
    ],
  },
];

export const guiaPorSlug = (s: string) => GUIAS.find((g) => g.slug === s) ?? null;
