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

// Cidades extras do Uruguai (além dos 19 departamentos e das poucas cidades já em locais-seo.ts).
// nombre + departamento; o slug é gerado. Polos agrícolas/industriais reais.
const CIUDADES_EXTRA: Array<{ nombre: string; departamento: string }> = [
  { nombre: "Las Piedras", departamento: "Canelones" },
  { nombre: "Pando", departamento: "Canelones" },
  { nombre: "Ciudad de la Costa", departamento: "Canelones" },
  { nombre: "Santa Lucía", departamento: "Canelones" },
  { nombre: "San Carlos", departamento: "Maldonado" },
  { nombre: "Punta del Este", departamento: "Maldonado" },
  { nombre: "Minas", departamento: "Lavalleja" },
  { nombre: "San José de Mayo", departamento: "San José" },
  { nombre: "Ciudad del Plata", departamento: "San José" },
  { nombre: "Colonia del Sacramento", departamento: "Colonia" },
  { nombre: "Carmelo", departamento: "Colonia" },
  { nombre: "Juan Lacaze", departamento: "Colonia" },
  { nombre: "Nueva Helvecia", departamento: "Colonia" },
  { nombre: "Rosario", departamento: "Colonia" },
  { nombre: "Nueva Palmira", departamento: "Colonia" },
  { nombre: "Dolores", departamento: "Soriano" },
  { nombre: "Cardona", departamento: "Soriano" },
  { nombre: "Trinidad", departamento: "Flores" },
  { nombre: "Fray Bentos", departamento: "Río Negro" },
  { nombre: "Bella Unión", departamento: "Artigas" },
  { nombre: "Río Branco", departamento: "Cerro Largo" },
  { nombre: "Vergara", departamento: "Treinta y Tres" },
  { nombre: "Castillos", departamento: "Rocha" },
  { nombre: "La Paloma", departamento: "Rocha" },
  { nombre: "Sarandí del Yí", departamento: "Durazno" },
  { nombre: "Paso de los Toros", departamento: "Tacuarembó" },
  { nombre: "Guichón", departamento: "Paysandú" },
  { nombre: "Tranqueras", departamento: "Rivera" },
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
  return [
    `En ${c.nombre} (${c.departamento}), zona de ${c.perfil}, AGRO PARTS exporta ${m.plural} directo desde Brasil${total > 0 ? `, con más de ${fmt(total)} ítems disponibles` : ""}. Importación con origen Mercosur (ACE 02/18): 0% de arancel en las piezas con origen comprobado.`,
    `${m.intro}`,
    `Entramos por la frontera de ${c.frontera}, la más cercana a ${c.nombre}, y despachamos hasta tu local o taller. Te damos la factura proforma, la clasificación NCM y el packing list listos para tu despachante. Cotización de flete interna, calculada después del pedido.`,
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
