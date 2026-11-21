// SEO programático de EXPORTAÇÃO para o Uruguai: páginas por tipo de máquina × cidade.
// Estrutura pilar + satélite (hub-and-spoke), 100% em espanhol (mercado uruguaio).
//   /exportacion                      → pilar geral (todas as máquinas + todas as cidades)
//   /exportacion/<maquina>            → pilar por máquina (todas as cidades)
//   /exportacion/<maquina>/<ciudad>   → página que rankeia ("repuestos para excavadoras en Salto")
// Reaproveita as cidades do Uruguai de locais-seo.ts e os pontos de fronteira da aduana.
import { LOCAIS_SEO, type LocalSeo } from "./locais-seo";
import { PONTOS_FRONTEIRA, type PontoFronteira } from "./aduana/aduana-comum";
import { slugify } from "./seo-paginas";

export type LinhaExport = "AGRICOLA" | "CAMINHOES" | "DIESEL";

// ---------------------------------------------------------------- tipos de máquina (5)
export type MaquinaExport = {
  slug: string;
  es: string; // nome exibido "Excavadoras y línea amarilla"
  plural: string; // minúsculo para frases "repuestos para excavadoras"
  linha: LinhaExport; // de qual catálogo vêm as peças
  categoria?: string; // filtro de categoria (valor do banco, em português)
  busca?: string; // termo de busca no catálogo
  intro: string; // parágrafo de apresentação (es)
  sistemas: string[]; // subsistemas/peças para long-tail
  marcas: string[]; // marcas da máquina
};

export const MAQUINAS_EXPORT: MaquinaExport[] = [
  {
    slug: "cosechadoras",
    es: "Cosechadoras",
    plural: "cosechadoras",
    linha: "AGRICOLA",
    busca: "colheitadeira",
    intro:
      "Repuestos para cosechadoras de grano y arroceras, con el código original de cada pieza y aplicación por modelo. Importamos directo desde Brasil con origen Mercosur.",
    sistemas: [
      "plataforma de corte",
      "cilindro trillador",
      "cóncavo",
      "sinfines",
      "zarandas",
      "correas",
      "cadenas",
      "rodamientos",
      "cuchillas",
      "filtros",
    ],
    marcas: ["John Deere", "New Holland", "Case IH", "Massey Ferguson", "Valtra"],
  },
  {
    slug: "tractores",
    es: "Tractores",
    plural: "tractores",
    linha: "AGRICOLA",
    intro:
      "Repuestos para tractores de todas las potencias: motor, transmisión, hidráulica, dirección, frenos y embrague, con código original y compatibilidad confirmada antes de comprar.",
    sistemas: [
      "motor",
      "embrague",
      "transmisión",
      "hidráulica",
      "dirección",
      "frenos",
      "toma de fuerza",
      "eje delantero",
      "rodamientos",
      "filtros",
    ],
    marcas: ["Massey Ferguson", "John Deere", "Valtra", "New Holland", "Case IH", "Ford", "Agrale"],
  },
  {
    slug: "excavadoras",
    es: "Excavadoras y línea amarilla",
    plural: "excavadoras",
    linha: "DIESEL",
    categoria: "Máquinas",
    intro:
      "Repuestos para excavadoras, retroexcavadoras, palas cargadoras y máquinas de la línea amarilla: motor diesel, sistema de inyección, hidráulica y tren de rodaje. Importación directa con despacho a todo Uruguay.",
    sistemas: [
      "motor diesel",
      "sistema de inyección",
      "bomba hidráulica",
      "cilindros hidráulicos",
      "mangueras",
      "tren de rodaje",
      "bombas",
      "turbo",
      "filtros",
    ],
    marcas: ["Caterpillar", "Komatsu", "JCB", "Case", "New Holland", "Hyundai", "Volvo", "Perkins"],
  },
  {
    slug: "camiones",
    es: "Camiones",
    plural: "camiones",
    linha: "CAMINHOES",
    intro:
      "Repuestos para camiones de línea pesada multimarca: motor, caja de cambios, frenos, diferencial, cabina y eléctrica, con código y aplicación por modelo. Origen Mercosur, 0% de arancel.",
    sistemas: [
      "motor",
      "caja de cambios",
      "frenos",
      "embrague",
      "diferencial",
      "eje delantero",
      "eje trasero",
      "dirección",
      "cabina",
      "eléctrica",
      "filtros",
    ],
    marcas: [
      "Mercedes-Benz",
      "Scania",
      "Volvo",
      "Volkswagen",
      "MAN",
      "Iveco",
      "Ford",
      "DAF",
      "Cummins",
    ],
  },
  {
    slug: "inyeccion",
    es: "Inyección diesel",
    plural: "sistemas de inyección diesel",
    linha: "DIESEL",
    intro:
      "Repuestos y componentes del sistema de inyección diesel para tractores, camiones, maquinaria y generación: bombas inyectoras, inyectores, toberas y piezas de common rail, con código original.",
    sistemas: [
      "bomba inyectora",
      "inyectores",
      "toberas",
      "porta-toberas",
      "common rail",
      "bomba de alta presión",
      "elementos y válvulas",
      "avance",
      "reparación",
    ],
    marcas: ["Bosch", "Delphi", "Denso", "Yanmar", "MWM", "Perkins", "Cummins", "FPT"],
  },
];

export const maquinaPorSlug = (s: string) => MAQUINAS_EXPORT.find((m) => m.slug === s) ?? null;

// ---------------------------------------------------------------- cidades do Uruguai (expandido)
export type CiudadExport = {
  slug: string;
  nombre: string;
  departamento: string; // departamento a que pertence (ou ele mesmo)
  tipo: "departamento" | "cidade";
  frontera: string; // ponto de fronteira mais próximo (texto)
  perfil: string; // perfil produtivo (es), curto
};

// Departamento → ponto de fronteira de entrada mais próximo (das rotas desde o RS/Brasil)
const FRONTERA_DEP: Record<string, PontoFronteira> = {
  Rocha: "CHUI",
  Maldonado: "CHUI",
  "Treinta y Tres": "CHUI",
  "Cerro Largo": "JAGUARAO",
  Rivera: "LIVRAMENTO",
  Tacuarembó: "LIVRAMENTO",
  Artigas: "BARRA",
  Salto: "QUARAI",
  Paysandú: "QUARAI",
  Lavalleja: "ACEGUA",
  Durazno: "ACEGUA",
  Florida: "ACEGUA",
  Flores: "ACEGUA",
  Montevideo: "ACEGUA",
  Canelones: "ACEGUA",
  "San José": "ACEGUA",
  Colonia: "ACEGUA",
  Soriano: "ACEGUA",
  "Río Negro": "ACEGUA",
};
export const fronteraDe = (departamento: string): string =>
  PONTOS_FRONTEIRA[FRONTERA_DEP[departamento] ?? "ACEGUA"];

// Perfil curto por departamento (es) para o texto não se repetir
const PERFIL_DEP: Record<string, string> = {
  Artigas: "ganadería, arroz y caña de azúcar",
  Canelones: "granja, horticultura y lechería",
  "Cerro Largo": "arroz y ganadería",
  Colonia: "lechería y agricultura",
  Durazno: "ganadería y agricultura",
  Flores: "agricultura de granos y ganadería",
  Florida: "lechería y ganadería",
  Lavalleja: "ganadería y minería",
  Maldonado: "ganadería, turismo y construcción",
  Montevideo: "talleres, transporte y servicios",
  Paysandú: "agricultura, forestación y citrus",
  "Río Negro": "agricultura de granos y forestación",
  Rivera: "ganadería, forestación y arroz",
  Rocha: "arroz y ganadería",
  Salto: "citricultura, horticultura y ganadería",
  "San José": "lechería, agricultura y granja",
  Soriano: "agricultura de granos",
  Tacuarembó: "ganadería, forestación y arroz",
  "Treinta y Tres": "arroz y ganadería",
};
const perfilDe = (dep: string) => PERFIL_DEP[dep] ?? "agricultura, ganadería y transporte";

// Máquina típica de cada departamento (es): diferencia o texto por zona (fuga de "doorway").
const MAQUINA_TIPICA_DEP: Record<string, string> = {
  Artigas: "cosechadoras arroceras, tractores y equipos de caña",
  Canelones: "tractores chicos y medianos e implementos de granja",
  "Cerro Largo": "cosechadoras arroceras y tractores",
  Colonia: "tractores medianos, mixers y enfardadoras de la cuenca lechera",
  Durazno: "tractores de potencia media y pulverizadoras",
  Flores: "cosechadoras, sembradoras y tractores de alta potencia",
  Florida: "tractores medianos, mixers y enfardadoras",
  Lavalleja: "tractores y equipos de carga y movimiento de suelo",
  Maldonado: "tractores y máquinas de línea amarilla para obra",
  Montevideo: "camiones, tractores y toda la línea para talleres y transporte",
  Paysandú: "cosechadoras, pulverizadoras y equipos forestales",
  "Río Negro": "cosechadoras, sembradoras y tractores de alta potencia",
  Rivera: "tractores y equipos forestales",
  Rocha: "cosechadoras arroceras y niveladoras",
  Salto: "tractores, pulverizadoras y equipos de citrus y horticultura",
  "San José": "tractores medianos, mixers y sembradoras",
  Soriano: "cosechadoras, sembradoras y tractores de alta potencia",
  Tacuarembó: "tractores y equipos forestales",
  "Treinta y Tres": "cosechadoras arroceras y niveladoras",
};
export const maquinaTipicaDe = (dep: string) =>
  MAQUINA_TIPICA_DEP[dep] ?? "tractores, cosechadoras y equipos agrícolas";

// Cidades extras do Uruguai (além dos 19 departamentos e das poucas cidades já em locais-seo.ts).
// nombre + departamento; o slug é gerado. Localidades reais (capitais departamentais, polos
// agrícolas, industriais e de fronteira). Cobertura de todo o país.
const CIUDADES_EXTRA: Array<{ nombre: string; departamento: string }> = [
  // Artigas
  { nombre: "Bella Unión", departamento: "Artigas" },
  { nombre: "Tomás Gomensoro", departamento: "Artigas" },
  { nombre: "Baltasar Brum", departamento: "Artigas" },
  // Canelones
  { nombre: "Canelones", departamento: "Canelones" },
  { nombre: "Las Piedras", departamento: "Canelones" },
  { nombre: "Pando", departamento: "Canelones" },
  { nombre: "Ciudad de la Costa", departamento: "Canelones" },
  { nombre: "Santa Lucía", departamento: "Canelones" },
  { nombre: "Progreso", departamento: "Canelones" },
  { nombre: "San Ramón", departamento: "Canelones" },
  { nombre: "Sauce", departamento: "Canelones" },
  { nombre: "Tala", departamento: "Canelones" },
  { nombre: "Atlántida", departamento: "Canelones" },
  // Cerro Largo
  { nombre: "Melo", departamento: "Cerro Largo" },
  { nombre: "Río Branco", departamento: "Cerro Largo" },
  { nombre: "Fraile Muerto", departamento: "Cerro Largo" },
  // Colonia
  { nombre: "Colonia del Sacramento", departamento: "Colonia" },
  { nombre: "Carmelo", departamento: "Colonia" },
  { nombre: "Juan Lacaze", departamento: "Colonia" },
  { nombre: "Nueva Helvecia", departamento: "Colonia" },
  { nombre: "Rosario", departamento: "Colonia" },
  { nombre: "Nueva Palmira", departamento: "Colonia" },
  { nombre: "Tarariras", departamento: "Colonia" },
  { nombre: "Ombúes de Lavalle", departamento: "Colonia" },
  // Durazno
  { nombre: "Durazno", departamento: "Durazno" },
  { nombre: "Sarandí del Yí", departamento: "Durazno" },
  { nombre: "Villa del Carmen", departamento: "Durazno" },
  // Flores
  { nombre: "Trinidad", departamento: "Flores" },
  { nombre: "Ismael Cortinas", departamento: "Flores" },
  // Florida
  { nombre: "Florida", departamento: "Florida" },
  { nombre: "Sarandí Grande", departamento: "Florida" },
  { nombre: "Casupá", departamento: "Florida" },
  // Lavalleja
  { nombre: "Minas", departamento: "Lavalleja" },
  { nombre: "José Pedro Varela", departamento: "Lavalleja" },
  { nombre: "Solís de Mataojo", departamento: "Lavalleja" },
  // Maldonado
  { nombre: "Maldonado", departamento: "Maldonado" },
  { nombre: "San Carlos", departamento: "Maldonado" },
  { nombre: "Punta del Este", departamento: "Maldonado" },
  { nombre: "Pan de Azúcar", departamento: "Maldonado" },
  { nombre: "Aiguá", departamento: "Maldonado" },
  // Montevideo
  { nombre: "Montevideo", departamento: "Montevideo" },
  // Paysandú
  { nombre: "Paysandú", departamento: "Paysandú" },
  { nombre: "Guichón", departamento: "Paysandú" },
  { nombre: "Quebracho", departamento: "Paysandú" },
  // Río Negro
  { nombre: "Fray Bentos", departamento: "Río Negro" },
  { nombre: "Young", departamento: "Río Negro" },
  { nombre: "Nuevo Berlín", departamento: "Río Negro" },
  { nombre: "San Javier", departamento: "Río Negro" },
  // Rivera
  { nombre: "Rivera", departamento: "Rivera" },
  { nombre: "Tranqueras", departamento: "Rivera" },
  { nombre: "Minas de Corrales", departamento: "Rivera" },
  { nombre: "Vichadero", departamento: "Rivera" },
  // Rocha
  { nombre: "Rocha", departamento: "Rocha" },
  { nombre: "Chuy", departamento: "Rocha" },
  { nombre: "Castillos", departamento: "Rocha" },
  { nombre: "La Paloma", departamento: "Rocha" },
  { nombre: "Lascano", departamento: "Rocha" },
  { nombre: "Velázquez", departamento: "Rocha" },
  // Salto
  { nombre: "Salto", departamento: "Salto" },
  { nombre: "Constitución", departamento: "Salto" },
  { nombre: "Belén", departamento: "Salto" },
  // San José
  { nombre: "San José de Mayo", departamento: "San José" },
  { nombre: "Ciudad del Plata", departamento: "San José" },
  { nombre: "Libertad", departamento: "San José" },
  { nombre: "Rodríguez", departamento: "San José" },
  // Soriano
  { nombre: "Mercedes", departamento: "Soriano" },
  { nombre: "Dolores", departamento: "Soriano" },
  { nombre: "Cardona", departamento: "Soriano" },
  { nombre: "Palmitas", departamento: "Soriano" },
  // Tacuarembó
  { nombre: "Tacuarembó", departamento: "Tacuarembó" },
  { nombre: "Paso de los Toros", departamento: "Tacuarembó" },
  { nombre: "San Gregorio de Polanco", departamento: "Tacuarembó" },
  // Treinta y Tres
  { nombre: "Treinta y Tres", departamento: "Treinta y Tres" },
  { nombre: "Vergara", departamento: "Treinta y Tres" },
  { nombre: "Santa Clara de Olimar", departamento: "Treinta y Tres" },
];

// Monta a lista única de cidades: departamentos e cidades do Uruguai de locais-seo.ts + as extras.
function montarCiudades(): CiudadExport[] {
  const mapa = new Map<string, CiudadExport>();
  for (const l of LOCAIS_SEO) {
    if (l.pais !== "UY") continue;
    if (l.tipo !== "departamento" && l.tipo !== "cidade") continue;
    const dep = l.tipo === "departamento" ? l.nome : (l.dentro ?? l.nome);
    mapa.set(l.slug, {
      slug: l.slug,
      nombre: l.nome,
      departamento: dep,
      tipo: l.tipo === "departamento" ? "departamento" : "cidade",
      frontera: fronteraDe(dep),
      perfil: l.perfil.es,
    });
  }
  for (const c of CIUDADES_EXTRA) {
    const slug = slugify(c.nombre);
    if (mapa.has(slug)) continue;
    mapa.set(slug, {
      slug,
      nombre: c.nombre,
      departamento: c.departamento,
      tipo: "cidade",
      frontera: fronteraDe(c.departamento),
      perfil: perfilDe(c.departamento),
    });
  }
  return [...mapa.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export const CIUDADES_EXPORT: CiudadExport[] = montarCiudades();
export const ciudadPorSlug = (s: string) => CIUDADES_EXPORT.find((c) => c.slug === s) ?? null;

// Cidades vizinhas de uma cidade (mesmo departamento primeiro) para links internos em silo.
export function ciudadesVecinas(c: CiudadExport, limite = 10): CiudadExport[] {
  const mesmoDep = CIUDADES_EXPORT.filter(
    (o) => o.slug !== c.slug && o.departamento === c.departamento,
  );
  const resto = CIUDADES_EXPORT.filter(
    (o) => o.slug !== c.slug && o.departamento !== c.departamento,
  );
  return [...mesmoDep, ...resto].slice(0, limite);
}

// ---------------------------------------------------------------- textos (es)
const fmt = (n: number) => n.toLocaleString("es-UY");

export function tituloExport(m: MaquinaExport, c?: CiudadExport): string {
  return c
    ? `Repuestos para ${m.plural} en ${c.nombre}, Uruguay`
    : `Repuestos para ${m.plural} — exportación a Uruguay`;
}

export function descripcionExport(m: MaquinaExport, total: number, c?: CiudadExport): string {
  const marcas = m.marcas.slice(0, 4).join(", ");
  const base =
    total > 0 ? `Más de ${fmt(total)} repuestos para ${m.plural}` : `Repuestos para ${m.plural}`;
  return c
    ? `${base} con despacho a ${c.nombre} y todo Uruguay: ${m.sistemas.slice(0, 4).join(", ")} para ${marcas}. Origen Mercosur, 0% de arancel. Cotizá por WhatsApp.`
    : `${base} de ${marcas}, con origen Mercosur y despacho a todo Uruguay. ${m.sistemas.slice(0, 5).join(", ")} y más. Importación directa desde Brasil.`;
}

// Parágrafos únicos por máquina + cidade
export function textoExport(m: MaquinaExport, c: CiudadExport, total: number): string[] {
  const tipica = maquinaTipicaDe(c.departamento);
  return [
    `En ${c.nombre} (${c.departamento}), zona de ${c.perfil} donde trabajan ${tipica}, AGRO PARTS exporta ${m.plural} directo desde Brasil${total > 0 ? `, con más de ${fmt(total)} ítems disponibles` : ""}. Importación con origen Mercosur (ACE 02/18): 0% de arancel en las piezas con origen comprobado, y precios cotizados en USD (FOB).`,
    `${m.intro}`,
    `Entramos por la frontera de ${c.frontera}, la más cercana a ${c.nombre}: es el paso que usamos para que tu pedido llegue antes y con menos flete. Te damos la factura proforma, la clasificación NCM y el packing list listos para tu despachante. La cotización del flete interno la calculamos según el peso cubicado de tu pedido, antes de que confirmes.`,
  ];
}

export function preguntasExport(m: MaquinaExport, c: CiudadExport) {
  return [
    {
      p: `¿Cómo importo repuestos para ${m.plural} a ${c.nombre}?`,
      r: `Elegí las piezas en nuestro catálogo o mandanos los códigos por WhatsApp. Armamos la proforma con NCM y origen, coordinamos el despacho por la frontera de ${c.frontera} y la entrega a ${c.nombre}.`,
    },
    {
      p: "¿Pago aranceles de importación?",
      r: "Las piezas con origen Mercosur comprobado entran con 0% de arancel (ACE 02 y ACE 18). Pagás el IVA y los gastos de despacho habituales. Te mostramos el costo estimado antes de cerrar.",
    },
    {
      p: "¿Cómo se calcula el flete?",
      r: `El flete es interno: lo calculamos según el peso cubicado de tu pedido y la distancia hasta ${c.nombre}, y te lo informamos junto con la cotización, antes de que confirmes.`,
    },
    {
      p: `¿Cómo sé si el repuesto sirve para mi ${m.plural.replace(/s$/, "")}?`,
      r: "Mandanos el código original de la pieza o el modelo y número de serie del equipo. Te confirmamos la compatibilidad antes de comprar.",
    },
  ];
}

// Frases-chave long-tail (máquina × sistema × marca × cidade) para densidade de palavras-chave
export function frasesExport(m: MaquinaExport, nombre: string): string[] {
  const f: string[] = [
    `repuestos para ${m.plural} en ${nombre}`,
    `repuestos de ${m.plural} ${nombre}`,
    `importar repuestos para ${m.plural} en ${nombre}`,
    `autopartes para ${m.plural} en ${nombre}`,
  ];
  for (const s of m.sistemas) f.push(`${s} para ${m.plural} en ${nombre}`);
  for (const mar of m.marcas) f.push(`repuestos ${mar} para ${m.plural} en ${nombre}`);
  return f;
}

// Total de frases-chave que o projeto cobre (máquinas × cidades)
export function totalFrasesExport(): number {
  return MAQUINAS_EXPORT.reduce(
    (s, m) => s + CIUDADES_EXPORT.reduce((t, c) => t + frasesExport(m, c.nombre).length, 0),
    0,
  );
}

// Link para o catálogo/portal já filtrado pela linha da máquina.
export function urlCatalogoExport(m: MaquinaExport): string {
  if (m.linha === "AGRICOLA") {
    const qs = new URLSearchParams();
    if (m.busca) qs.set("q", m.busca);
    return qs.toString() ? `/loja?${qs}` : "/loja";
  }
  const qs = new URLSearchParams({ linha: m.linha });
  if (m.categoria) qs.set("categoria", m.categoria);
  return `/loja?${qs}`;
}

// ---------------------------------------------------------------- tipos de peça (todas as linhas)
// Para a vitrine "exportamos todo tipo de repuesto". `categoria` casa com os valores do banco (pt);
// `busca` quando é por termo. O link cai no catálogo já filtrado.
export type TipoPieza = {
  slug: string;
  es: string; // nome exibido
  plural: string; // minúsculo p/ frases ("filtros para…")
  categoria?: string; // valor de categoria no banco (pt)
  busca?: string; // termo de busca
  linha?: LinhaExport; // força a linha (senão, todas)
  intro: string; // parágrafo (es)
  incluye: string[]; // exemplos de peças do tipo (long-tail)
  maquinas: string[]; // máquinas em que esse tipo é usado
};
export const TIPOS_PIEZA: TipoPieza[] = [
  {
    slug: "filtros",
    es: "Filtros",
    plural: "filtros",
    categoria: "Filtros",
    intro:
      "Filtros originales y equivalentes para tractores, cosechadoras, camiones y motores diesel: la reposición que más rota en cualquier taller.",
    incluye: [
      "filtro de aceite",
      "filtro de combustible",
      "filtro de aire",
      "filtro hidráulico",
      "filtro separador de agua",
      "filtro de cabina",
    ],
    maquinas: ["tractores", "cosechadoras", "camiones", "excavadoras"],
  },
  {
    slug: "rodamientos",
    es: "Rodamientos y soportes",
    plural: "rodamientos",
    categoria: "Rolamentos e Mancais",
    intro:
      "Rodamientos, soportes y mazas para toda la línea agrícola y pesada, de marcas líderes, con la medida y el código exactos.",
    incluye: [
      "rodamiento de rueda",
      "rodamiento cónico",
      "soporte con rodamiento",
      "maza",
      "rodamiento de embrague",
    ],
    maquinas: ["tractores", "cosechadoras", "camiones"],
  },
  {
    slug: "transmision",
    es: "Engranajes y transmisión",
    plural: "repuestos de transmisión",
    categoria: "Engrenagens e Transmissão",
    intro:
      "Engranajes, ejes, sincronizados y piezas de caja y diferencial para tractores y camiones, con aplicación por modelo.",
    incluye: ["engranaje", "eje", "piñón", "corona", "sincronizado", "cardán"],
    maquinas: ["tractores", "camiones", "cosechadoras"],
  },
  {
    slug: "hidraulica",
    es: "Hidráulica y bombas",
    plural: "repuestos hidráulicos",
    categoria: "Hidráulica e Pneumática",
    intro:
      "Bombas, cilindros, válvulas, mangueras y sellos hidráulicos para tractores, cosechadoras y línea amarilla.",
    incluye: [
      "bomba hidráulica",
      "cilindro hidráulico",
      "válvula de control",
      "manguera hidráulica",
      "kit de sellos",
    ],
    maquinas: ["tractores", "excavadoras", "cosechadoras"],
  },
  {
    slug: "juntas-y-retenes",
    es: "Juntas y retenes",
    plural: "juntas y retenes",
    categoria: "Vedações",
    intro:
      "Juntas, retenes, o-rings y empaquetaduras para motor, transmisión e hidráulica, con la medida exacta.",
    incluye: ["retén", "junta de tapa", "o-ring", "empaquetadura", "junta de culata"],
    maquinas: ["tractores", "camiones", "cosechadoras"],
  },
  {
    slug: "frenos-y-embragues",
    es: "Frenos y embragues",
    plural: "repuestos de frenos y embrague",
    categoria: "Freios e Embreagens",
    intro:
      "Discos, platos, balatas y kits de freno y embrague para tractores y camiones, originales y equivalentes.",
    incluye: [
      "disco de embrague",
      "plato de presión",
      "balatas",
      "kit de embrague",
      "cilindro de freno",
    ],
    maquinas: ["tractores", "camiones"],
  },
  {
    slug: "electrica-y-sensores",
    es: "Eléctrica y sensores",
    plural: "repuestos eléctricos",
    categoria: "Elétrica e Sensores",
    intro:
      "Alternadores, motores de arranque, sensores y módulos para toda la línea agrícola, de camiones y diesel.",
    incluye: ["alternador", "motor de arranque", "sensor", "solenoide", "módulo", "faro"],
    maquinas: ["tractores", "cosechadoras", "camiones"],
  },
  {
    slug: "estructura-y-rodados",
    es: "Estructura y rodados",
    plural: "piezas de estructura y rodados",
    categoria: "Estrutura e Suspensão",
    intro:
      "Piezas de estructura, suspensión y tren de rodaje para tractores, cosechadoras y máquinas de línea amarilla.",
    incluye: ["rueda guía", "rodillo", "cadena de oruga", "resorte", "soporte de chasis"],
    maquinas: ["tractores", "excavadoras", "cosechadoras"],
  },
  {
    slug: "inyeccion-diesel",
    es: "Inyección diesel",
    plural: "repuestos de inyección diesel",
    busca: "injetora",
    linha: "DIESEL",
    intro:
      "Bombas inyectoras, inyectores, toberas y piezas de common rail para tractores, camiones, maquinaria y generación.",
    incluye: ["bomba inyectora", "inyector", "tobera", "porta-tobera", "elemento", "válvula"],
    maquinas: ["tractores", "camiones", "excavadoras"],
  },
  {
    slug: "motor",
    es: "Motor",
    plural: "repuestos de motor",
    busca: "pistao",
    intro:
      "Pistones, bielas, camisas, cigüeñales, válvulas y juntas de motor diesel, con medida estándar y de rectificación.",
    incluye: ["pistón", "biela", "camisa", "cigüeñal", "válvula", "kit de junta de motor"],
    maquinas: ["tractores", "camiones", "excavadoras"],
  },
  {
    slug: "cosecha",
    es: "Cosecha (cóncavos, zarandas)",
    plural: "repuestos de cosecha",
    busca: "concavo",
    linha: "AGRICOLA",
    intro:
      "Cóncavos, zarandas, sinfines, cuchillas y piezas de plataforma y trilla para cosechadoras de grano y arroceras.",
    incluye: ["cóncavo", "zaranda", "sinfín", "cuchilla", "peine", "lona de plataforma"],
    maquinas: ["cosechadoras"],
  },
  {
    slug: "correas-y-cadenas",
    es: "Correas y cadenas",
    plural: "correas y cadenas",
    busca: "correia",
    intro:
      "Correas, cadenas, poleas y tensores para la transmisión de cosechadoras, tractores e implementos.",
    incluye: ["correa en V", "correa dentada", "cadena de rodillos", "polea", "tensor"],
    maquinas: ["cosechadoras", "tractores"],
  },
];
export const tipoPorSlug = (s: string) => TIPOS_PIEZA.find((t) => t.slug === s) ?? null;

export function tituloTipo(t: TipoPieza, c?: CiudadExport): string {
  return c ? `${t.es} para exportación a ${c.nombre}, Uruguay` : `${t.es} — exportación a Uruguay`;
}
export function descripcionTipo(t: TipoPieza, total: number): string {
  const base = total > 0 ? `Más de ${fmt(total)} ${t.plural}` : t.es;
  return `${base} para exportación a Uruguay: ${t.incluye.slice(0, 4).join(", ")} y más. Origen Mercosur (0% de arancel), precios en USD (FOB) y despacho a todo Uruguay.`;
}
export function urlCatalogoTipo(t: TipoPieza): string {
  const qs = new URLSearchParams();
  if (t.linha) qs.set("linha", t.linha);
  if (t.categoria) qs.set("categoria", t.categoria);
  if (t.busca) qs.set("q", t.busca);
  return `/loja?${qs}`;
}

// ---------------------------------------------------------------- pilares da estrutura (startup)
// O que diferencia o AGRO PARTS de um simples catálogo: a operação logística/aduaneira completa.
export const PILARES_ESTRUCTURA = [
  {
    icon: "Factory",
    t: "Stock directo en Brasil",
    d: "Más de 60.000 repuestos de fábrica, con código original y aplicación por modelo. Compramos directo, sin intermediarios, y exportamos a precio de distribuidor.",
  },
  {
    icon: "FileCheck2",
    t: "Aduana y origen resueltos",
    d: "Clasificamos la NCM de cada pieza, armamos la prueba de origen Mercosur (ACE 02/18) y te entregamos la proforma y el packing list listos para tu despachante.",
  },
  {
    icon: "MapPin",
    t: "Estructura propia en la frontera",
    d: "Operamos por los 6 pasos entre Brasil y Uruguay. Despachante aliado de cada lado, consolidación de carga y seguimiento del trámite hasta la salida.",
  },
  {
    icon: "Truck",
    t: "Despacho a todo el país",
    d: "Transporte internacional con CRT y MIC/DTA, y entrega hasta tu local o taller en cualquier departamento. Flete interno calculado por peso cubicado.",
  },
  {
    icon: "ShieldCheck",
    t: "Acompañamiento total",
    d: "Un asesor te sigue de la cotización a la entrega: compatibilidad confirmada antes de comprar, estado del trámite en tiempo real y soporte post-venta.",
  },
  {
    icon: "Boxes",
    t: "Pensado para quien revende",
    d: "Ideal para repuesteras, talleres y logistas: pedidos grandes y chicos, reposición recurrente y condiciones de mayorista para tu empresa.",
  },
] as const;

// Passos resumidos de "cómo importar" para a landing (o guia completo fica em /exportacion/como-importar).
export const PASOS_IMPORTAR = [
  {
    n: 1,
    t: "Elegís las piezas",
    d: "Del catálogo o mandándonos los códigos por WhatsApp. Confirmamos compatibilidad y precio.",
  },
  {
    n: 2,
    t: "Armamos la proforma",
    d: "Con NCM, origen Mercosur, Incoterm y el costo estimado de importación a tu departamento.",
  },
  {
    n: 3,
    t: "Documentación y origen",
    d: "NF-e de exportación, DU-E, certificado/declaración de origen, factura y packing list.",
  },
  {
    n: 4,
    t: "Frontera y despacho",
    d: "Entramos por el paso más cercano, con CRT y MIC/DTA. Tu despachante registra el DUA en Uruguay.",
  },
  {
    n: 5,
    t: "Entrega y post-venta",
    d: "Despacho hasta tu local y seguimiento. Soporte si necesitás otra pieza o un reclamo.",
  },
] as const;

// ---------------------------------------------------------------- estatísticas para o hero
export function statsExport(total: number) {
  const departamentos = new Set(CIUDADES_EXPORT.map((c) => c.departamento)).size;
  return {
    repuestos: total,
    ciudades: CIUDADES_EXPORT.length,
    departamentos,
    pasos: Object.keys(PONTOS_FRONTEIRA).length,
    maquinas: MAQUINAS_EXPORT.length,
    tipos: TIPOS_PIEZA.length,
    frases: totalFrasesExport(),
  };
}

// Cidades agrupadas por departamento (para o silo de navegação da landing/guia).
export function ciudadesPorDepartamento(): Array<{
  departamento: string;
  ciudades: CiudadExport[];
}> {
  const mapa = new Map<string, CiudadExport[]>();
  for (const c of CIUDADES_EXPORT) {
    const arr = mapa.get(c.departamento) ?? [];
    arr.push(c);
    mapa.set(c.departamento, arr);
  }
  return [...mapa.entries()]
    .map(([departamento, ciudades]) => ({
      departamento,
      ciudades: ciudades.sort((a, b) => a.nombre.localeCompare(b.nombre, "es")),
    }))
    .sort((a, b) => a.departamento.localeCompare(b.departamento, "es"));
}
