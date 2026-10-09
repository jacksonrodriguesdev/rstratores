// Textos do kit de anúncios (Google Ads e Meta). Espanhol rioplatense (voseo), público do Uruguai.
// Limites conferidos por marketing/gerar_kit.cjs antes de gerar a página.
const SITE = "https://agropartsuy.com";
const utm = (fonte, meio, campanha) => `utm_source=${fonte}&utm_medium=${meio}&utm_campaign=${campanha}`;
const url = (caminho, fonte, meio, campanha) =>
  `${SITE}${caminho}${caminho.includes("?") ? "&" : "?"}${utm(fonte, meio, campanha)}`;

const MARCAS = ["Massey Ferguson", "Valtra", "John Deere", "New Holland", "Case IH", "Ford"];

module.exports = {
  SITE,
  google: {
    titulos: [
      "Repuestos para Tractores",
      "AGRO PARTS Uruguay",
      "Más de 29.000 Repuestos",
      "Cotizá por WhatsApp",
      "Envíos a Todo Uruguay",
      "Envío por DAC con Rastreo",
      "Buscá por Código Original",
      "Massey, Valtra, John Deere",
      "New Holland y Case IH",
      "Cotización Sin Compromiso",
      "Repuestos Agrícolas",
      "Confirmamos Compatibilidad",
      "Pedido Rápido por Códigos",
      "Filtros, Rodamientos, Retenes",
      "Te Conseguimos la Pieza",
    ],
    descricoes: [
      "Más de 29.000 repuestos para tractores y cosechadoras. Cotizá por WhatsApp sin compromiso.",
      "Buscá por el código original, armá tu lista y recibí precio y envío a tu localidad.",
      "Massey Ferguson, Valtra, John Deere, New Holland y Case IH. Confirmamos compatibilidad.",
      "¿No encontrás la pieza? Mandanos el código o una foto por WhatsApp y te la conseguimos.",
    ],
    campanhas: [
      {
        nome: "Search · Marcas de tractor",
        porque: "Quem busca a marca do trator já sabe o que precisa: é o clique mais perto da compra.",
        grupos: MARCAS.map((m) => ({
          nome: m,
          titulosExtra: [`Repuestos ${m}`.slice(0, 30), `${m} en Uruguay`.slice(0, 30)],
          palavras: [`"repuestos ${m.toLowerCase()}"`, `"repuestos ${m.toLowerCase()} uruguay"`, `[repuestos tractor ${m.toLowerCase()}]`],
          destino: url(`/loja?marca=${encodeURIComponent(m)}`, "google", "cpc", "marcas"),
        })),
      },
      {
        nome: "Search · Tipo de repuesto",
        porque: "Peças de reposição frequente (filtros, rolamentos, retentores, embreagem).",
        grupos: [
          ["Filtros", "Filtros", ['"filtros para tractor"', '"filtro aceite tractor"', '"filtro hidraulico tractor"']],
          ["Rodamientos", "Rolamentos e Mancais", ['"rodamientos tractor"', '"rulemanes tractor"', '"rodamiento conico tractor"']],
          ["Retenes y juntas", "Vedações", ['"retenes tractor"', '"junta tapa de cilindros tractor"', '"kit de juntas tractor"']],
          ["Embrague y frenos", "Freios e Embreagens", ['"kit embrague tractor"', '"disco de embrague tractor"', '"plato de embrague tractor"']],
          ["Hidráulica", "Hidráulica e Pneumática", ['"bomba hidraulica tractor"', '"cilindro hidraulico tractor"', '"repuestos hidraulico tractor"']],
          ["Transmisión", "Engrenagens e Transmissão", ['"engranajes tractor"', '"repuestos caja de cambios tractor"', '"repuestos transmision tractor"']],
        ].map(([nome, categoria, palavras]) => ({
          nome,
          palavras,
          destino: url(`/loja?categoria=${encodeURIComponent(categoria)}`, "google", "cpc", "tipo_repuesto"),
        })),
      },
      {
        nome: "Search · Genéricas y por código",
        porque: "Busca ampla e quem pesquisa direto pelo código da peça (talleres).",
        grupos: [
          {
            nome: "Repuestos agrícolas",
            palavras: ['"repuestos para tractores"', '"repuestos agricolas uruguay"', '"repuestos tractores uruguay"', '"repuestos cosechadora"'],
            destino: url("/", "google", "cpc", "genericas"),
          },
          {
            nome: "Por código / talleres",
            palavras: ['"repuesto por codigo tractor"', '"codigo repuesto tractor"', '"distribuidor repuestos agricolas"'],
            destino: url("/pedido-rapido", "google", "cpc", "codigos"),
          },
        ],
      },
    ],
    negativas: ["auto", "autos", "moto", "motos", "camion", "camiones", "juguete", "juguetes", "maqueta", "gratis", "pdf", "manual", "empleo", "trabajo", "curso", "alquiler", "tractor nuevo", "venta de tractores", "precio tractor", "cortadora de pasto", "tractor de jardin"],
    sitelinks: [
      ["Catálogo con fotos", "Miles de repuestos con foto", url("/loja", "google", "cpc", "sitelink")],
      ["Pedido rápido", "Pegá tu lista y cotizá todo junto", url("/pedido-rapido", "google", "cpc", "sitelink")],
      ["Cómo comprar", "Cotización por WhatsApp en 4 pasos", url("/ayuda#como-comprar", "google", "cpc", "sitelink")],
      ["Envíos a Uruguay", "Por DAC a los 19 departamentos", url("/ayuda#envios", "google", "cpc", "sitelink")],
    ],
    destaques: ["Envíos a todo Uruguay", "Cotización sin compromiso", "Atención por WhatsApp", "+29.000 repuestos", "Seguimiento por DAC", "Buscá por código"],
    snippetMarcas: [...MARCAS, "Agrale"],
    pmax: {
      titulos: ["Repuestos para Tractores", "Cotizá por WhatsApp", "Envíos a Todo Uruguay", "Más de 29.000 Repuestos", "AGRO PARTS Uruguay"],
      titulosLongos: [
        "Repuestos para tractores Massey Ferguson, Valtra, John Deere y New Holland",
        "Más de 29.000 repuestos agrícolas con cotización rápida por WhatsApp",
        "Buscá por el código original y recibí tu repuesto en cualquier punto de Uruguay",
        "¿No encontrás la pieza? Mandanos el código o una foto y te la conseguimos",
        "Talleres y revendedores: pegá tu lista de códigos y cotizá todo junto",
      ],
      descricoes: [
        "Repuestos agrícolas con envío a todo Uruguay.",
        "Más de 29.000 repuestos para tractores y cosechadoras. Cotizá por WhatsApp.",
        "Buscá por código original, armá tu lista y recibí precio y envío a tu localidad.",
        "Massey Ferguson, Valtra, John Deere, New Holland y Case IH. Envíos por DAC.",
        "Atención personalizada: confirmamos la compatibilidad antes de enviar.",
      ],
      nomeEmpresa: "AGRO PARTS",
    },
  },
  meta: {
    campanhas: [
      {
        nome: "1 · Clic a WhatsApp (conversaciones)",
        objetivo: "Interacción → Mensajes → WhatsApp",
        porque: "O cliente fala direto com vocês, que é como a loja vende. Precisa do WhatsApp Business ligado à página do Facebook.",
        criativos: ["feed_02_cotizar_whatsapp", "story_02_te_lo_conseguimos", "carrusel (6 tarjetas)"],
      },
      {
        nome: "2 · Tráfico al catálogo",
        objetivo: "Tráfico → Visitas al sitio web",
        porque: "Leva quem ainda está pesquisando para ver as peças com foto. Com o Pixel ligado, alimenta o remarketing.",
        criativos: ["feed_01_catalogo", "feed_03_envios_dac", "carrusel (6 tarjetas)"],
        destino: url("/loja", "meta", "paid_social", "trafico_catalogo"),
      },
      {
        nome: "3 · Remarketing (visitantes 30 días)",
        objetivo: "Ventas o Interacción → WhatsApp",
        porque: "Quem visitou o site e não chamou no WhatsApp. Público pequeno e barato, costuma converter mais.",
        criativos: ["story_01_pedido_rapido", "feed_02_cotizar_whatsapp"],
      },
    ],
    publico: {
      local: "Uruguay (todo el país) · «Personas que viven o estuvieron recientemente en este lugar» (no «interesadas»)",
      idade: "25 a 65 años",
      interesses: ["Agricultura", "Tractores", "Maquinaria agrícola", "Ganadería", "Cosechadora", "Massey Ferguson", "John Deere", "New Holland Agriculture", "Valtra", "Agronegocios"],
      posicionamentos: "Advantage+ (automático); revise se Stories e Reels estão incluídos",
    },
    textos: [
      "¿Necesitás un repuesto para tu tractor? Tenemos más de 29.000 para Massey Ferguson, Valtra, John Deere, New Holland y más. Buscá por código y cotizá por WhatsApp. Envíos a todo Uruguay por DAC 🚜",
      "Encontrá la pieza en agropartsuy.com y tocá «Consultar precio»: se abre WhatsApp con el código listo. Te pasamos precio y envío sin compromiso.",
      "¿No encontrás el repuesto? Mandanos el código, el modelo del tractor o una foto. Muchas piezas que no están publicadas te las conseguimos igual.",
      "Talleres y revendedores: pegá tu lista de códigos en Pedido rápido y cotizá todo junto en un solo mensaje.",
    ],
    titulos: ["Repuestos para tu tractor", "Cotizá por WhatsApp", "Envíos a todo Uruguay", "Te conseguimos la pieza", "Pedido rápido por códigos"],
    descricao: "Más de 29.000 repuestos agrícolas",
    reels: [
      {
        nome: "Reel 1 · «Del código al precio en 15 segundos»",
        cenas: [
          ["0–3 s", "Mão segurando a peça gasta (ou foto do código gravado). Texto: «¿Se rompió?»"],
          ["3–7 s", "Gravação da tela do celular: digita o código na busca do site e aparece a peça com foto."],
          ["7–11 s", "Toca «Consultar precio» e abre o WhatsApp com a mensagem pronta. Texto: «Cotizá en segundos»"],
          ["11–15 s", "Logo AGRO PARTS + «Envíos a todo Uruguay · agropartsuy.com»"],
        ],
      },
      {
        nome: "Reel 2 · «Pedido rápido para talleres»",
        cenas: [
          ["0–3 s", "Bancada da oficina com uma lista de códigos no papel. Texto: «¿Tenés una lista larga?»"],
          ["3–9 s", "Tela: cola a lista em /pedido-rapido, toca «Buscar códigos» e aparecem os ✓ verdes."],
          ["9–13 s", "Toca «Pedir precio de toda la lista». Texto: «Todo en un solo mensaje»"],
          ["13–15 s", "Logo + agropartsuy.com"],
        ],
      },
      {
        nome: "Reel 3 · «Llega a todo Uruguay»",
        cenas: [
          ["0–4 s", "Embalando a peça na caixa (imagens reais do depósito)."],
          ["4–9 s", "Caixa com etiqueta da DAC sendo entregue / mapa do Uruguai com os 19 departamentos."],
          ["9–15 s", "Texto: «Recibí tu repuesto con seguimiento DAC» + botão WhatsApp + agropartsuy.com"],
        ],
      },
    ],
  },
  organico: [
    ["Semana 1", "Lunes", "Presentación", "Carrusel de categorías", "Somos AGRO PARTS: más de 29.000 repuestos para tractores y cosechadoras, con envíos a todo Uruguay. ¿Qué repuesto estás buscando? 👇"],
    ["Semana 1", "Miércoles", "Cómo comprar", "feed_02_cotizar_whatsapp", "Comprar es simple: buscá la pieza, tocá «Consultar precio» y te respondemos por WhatsApp con precio y envío."],
    ["Semana 1", "Viernes", "Envíos", "feed_03_envios_dac", "Llegamos a los 19 departamentos por DAC, con número de seguimiento. Tu repuesto, donde estés."],
    ["Semana 2", "Lunes", "Producto destacado", "Foto de un filtro", "Cambiar los filtros a tiempo protege el motor y el hidráulico. Tenemos filtros de aire, aceite, combustible e hidráulico para tu tractor."],
    ["Semana 2", "Miércoles", "Talleres", "story_01_pedido_rapido", "¿Tenés una lista de códigos? En Pedido rápido la pegás y cotizás todo junto. Ideal para talleres."],
    ["Semana 2", "Viernes", "Consejo", "Foto de rodamiento", "Un rodamiento que hace ruido avisa antes de romperse. Revisalo y, si lo necesitás, buscalo por código en agropartsuy.com."],
    ["Semana 3", "Lunes", "Marcas", "Imagen con logos de marcas (texto)", "Massey Ferguson, Valtra, John Deere, New Holland, Case IH, Ford y Agrale. ¿Cuál tenés en el campo?"],
    ["Semana 3", "Miércoles", "Búsqueda por código", "Reel 1", "El código original de la pieza es la forma más rápida de encontrarla. Escribilo en el buscador y listo."],
    ["Semana 3", "Viernes", "Te lo conseguimos", "story_02_te_lo_conseguimos", "¿No lo encontrás en el sitio? Mandanos una foto por WhatsApp: muchas piezas que no están publicadas las conseguimos igual."],
    ["Semana 4", "Lunes", "Producto destacado", "Foto de kit de embrague", "Kits de embrague, discos y platos para tractores. Consultá por el código de tu modelo."],
    ["Semana 4", "Miércoles", "Confianza", "Foto del equipo / depósito", "Detrás de cada envío hay un equipo que confirma la compatibilidad antes de despachar. Mostrá su cara: genera confianza."],
    ["Semana 4", "Viernes", "Llamado a la acción", "carrusel_06_cotiza", "Más de 29.000 repuestos. Cotizá en minutos en agropartsuy.com 🚜"],
  ],
  hashtags: "#RepuestosAgricolas #Uruguay #Tractores #RepuestosTractor #MasseyFerguson #JohnDeere #NewHolland #Valtra #CaseIH #CampoUruguayo #Agro #Maquinaria",
};
