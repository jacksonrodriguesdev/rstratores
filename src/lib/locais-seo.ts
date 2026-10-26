// Páginas de entrada por local para o Google: /repuestos-agricolas/rocha, /pt/repuestos-agricolas/pelotas...
// Cada local tem perfil agrícola, máquinas típicas e a categoria em foco (peças diferentes em cada
// página), para o texto não ser repetido. Uruguai (espanhol): sem falar de envio. Sul do Brasil (português,
// pais "RS" = RS, SC e PR): Correios ou transportadora, com nota fiscal da empresa brasileira.
import { slugify } from "./seo-paginas";

export type LocalSeo = {
  slug: string;
  nome: string;
  pais: "UY" | "RS";
  tipo: "pais" | "departamento" | "cidade" | "regiao" | "estado";
  dentro?: string; // departamento ou região a que pertence
  perfil: { es: string; pt: string };
  maquinas: { es: string; pt: string };
  foco: string; // categoria do banco com destaque na página
  marcas: string[];
  vizinhos: string[]; // slugs de locais próximos (links internos)
};

type Base = Omit<LocalSeo, "slug" | "vizinhos"> & { vizinhos: string[] };

// Perfis reaproveitados
const P = {
  arroz: { es: "arroz y ganadería", pt: "arroz e pecuária" },
  granos: {
    es: "agricultura de granos (soja, trigo, maíz, cebada)",
    pt: "lavoura de grãos (soja, trigo, milho, cevada)",
  },
  leche: { es: "lechería, agricultura y granja", pt: "leite, lavoura e granja" },
  ganaderia: { es: "ganadería y forestación", pt: "pecuária e silvicultura" },
  granja: { es: "granja, horticultura y lechería", pt: "granja, horticultura e leite" },
  talleres: {
    es: "talleres, repuesteras y empresas de servicios agrícolas",
    pt: "oficinas, revendas e prestadores de serviço agrícola",
  },
  citrus: {
    es: "citricultura, horticultura y ganadería",
    pt: "citricultura, horticultura e pecuária",
  },
};
const M = {
  arroz: {
    es: "cosechadoras arroceras, tractores medianos y grandes, niveladoras",
    pt: "colheitadeiras de arroz, tratores médios e grandes, plainas",
  },
  granos: {
    es: "cosechadoras, sembradoras, pulverizadoras y tractores de alta potencia",
    pt: "colheitadeiras, plantadeiras, pulverizadores e tratores de alta potência",
  },
  leche: {
    es: "tractores medianos, mixers, enfardadoras y segadoras",
    pt: "tratores médios, vagões misturadores, enfardadeiras e segadeiras",
  },
  ganaderia: {
    es: "tractores medianos, rotativas, enfardadoras y equipos forestales",
    pt: "tratores médios, roçadeiras, enfardadeiras e equipamentos florestais",
  },
  granja: {
    es: "tractores chicos y medianos, rotovadores e implementos",
    pt: "tratores pequenos e médios, enxadas rotativas e implementos",
  },
  talleres: {
    es: "toda la línea: tractores, cosechadoras e implementos",
    pt: "toda a linha: tratores, colheitadeiras e implementos",
  },
};
const MAR = ["Massey Ferguson", "John Deere", "Valtra", "New Holland"];
const UY = (
  nome: string,
  perfil: keyof typeof P,
  foco: string,
  marcas: string[],
  vizinhos: string[],
  tipo: LocalSeo["tipo"] = "departamento",
  dentro?: string,
): Base => ({
  nome,
  pais: "UY",
  tipo,
  dentro,
  perfil: P[perfil],
  maquinas: M[perfil === "citrus" ? "granja" : perfil],
  foco,
  marcas,
  vizinhos,
});
const RS = (
  nome: string,
  perfil: keyof typeof P,
  foco: string,
  marcas: string[],
  vizinhos: string[],
  tipo: LocalSeo["tipo"] = "cidade",
  dentro = "Rio Grande do Sul",
): Base => ({
  nome,
  pais: "RS",
  tipo,
  dentro,
  perfil: P[perfil],
  maquinas: M[perfil === "citrus" ? "granja" : perfil],
  foco,
  marcas,
  vizinhos,
});

const F = {
  tr: "Engrenagens e Transmissão",
  hi: "Hidráulica e Pneumática",
  fi: "Filtros",
  ve: "Vedações",
  ro: "Rolamentos e Mancais",
  fr: "Freios e Embreagens",
  el: "Elétrica e Sensores",
  es: "Estrutura e Suspensão",
};

const BASE: Base[] = [
  // Uruguai (país e regiões)
  {
    ...UY(
      "Uruguay",
      "granos",
      F.fi,
      MAR,
      ["montevideo", "rocha", "soriano", "paysandu", "rivera", "treinta-y-tres"],
      "pais",
    ),
    perfil: {
      es: "agricultura de granos, arroz, lechería y ganadería en los 19 departamentos",
      pt: "grãos, arroz, leite e pecuária nos 19 departamentos",
    },
  },
  {
    ...UY(
      "Este de Uruguay",
      "arroz",
      F.ro,
      MAR,
      ["rocha", "treinta-y-tres", "cerro-largo", "lavalleja", "maldonado", "chuy"],
      "regiao",
    ),
    perfil: {
      es: "arroz y ganadería en Rocha, Treinta y Tres, Cerro Largo, Lavalleja y Maldonado",
      pt: "arroz e pecuária em Rocha, Treinta y Tres, Cerro Largo, Lavalleja e Maldonado",
    },
  },
  {
    ...UY(
      "Litoral oeste de Uruguay",
      "granos",
      F.tr,
      ["John Deere", "Case IH", "New Holland", "Massey Ferguson"],
      ["soriano", "rio-negro", "paysandu", "colonia", "salto", "young"],
      "regiao",
    ),
    perfil: {
      es: "el mayor polo agrícola del país: Soriano, Río Negro, Paysandú y Colonia",
      pt: "o maior polo agrícola do país: Soriano, Río Negro, Paysandú e Colonia",
    },
  },
  {
    ...UY(
      "Norte de Uruguay",
      "ganaderia",
      F.hi,
      MAR,
      ["rivera", "tacuarembo", "artigas", "salto"],
      "regiao",
    ),
    perfil: {
      es: "ganadería, forestación y arroz en Rivera, Tacuarembó, Artigas y Salto",
      pt: "pecuária, silvicultura e arroz em Rivera, Tacuarembó, Artigas e Salto",
    },
  },
  // 19 departamentos
  UY(
    "Artigas",
    "arroz",
    F.ro,
    ["John Deere", "New Holland", "Massey Ferguson"],
    ["salto", "rivera", "norte-de-uruguay"],
  ),
  UY(
    "Canelones",
    "granja",
    F.fi,
    ["Massey Ferguson", "Ford", "New Holland"],
    ["montevideo", "san-jose", "florida", "lavalleja", "maldonado"],
  ),
  UY(
    "Cerro Largo",
    "arroz",
    F.ro,
    ["John Deere", "Massey Ferguson", "Valtra"],
    ["treinta-y-tres", "rivera", "tacuarembo", "este-de-uruguay"],
  ),
  UY(
    "Colonia",
    "leche",
    F.hi,
    ["John Deere", "New Holland", "Massey Ferguson"],
    ["soriano", "san-jose", "flores", "litoral-oeste-de-uruguay"],
  ),
  UY(
    "Durazno",
    "ganaderia",
    F.fr,
    ["Massey Ferguson", "Valtra", "John Deere"],
    ["florida", "flores", "tacuarembo", "treinta-y-tres"],
  ),
  UY(
    "Flores",
    "granos",
    F.tr,
    ["John Deere", "Massey Ferguson", "New Holland"],
    ["soriano", "durazno", "florida", "colonia"],
  ),
  UY(
    "Florida",
    "leche",
    F.hi,
    ["Massey Ferguson", "New Holland", "Valtra"],
    ["durazno", "canelones", "lavalleja", "san-jose"],
  ),
  UY(
    "Lavalleja",
    "ganaderia",
    F.fr,
    ["Massey Ferguson", "Valtra", "Ford"],
    ["maldonado", "rocha", "treinta-y-tres", "florida"],
  ),
  UY(
    "Maldonado",
    "ganaderia",
    F.fi,
    ["Massey Ferguson", "New Holland", "Ford"],
    ["rocha", "lavalleja", "canelones", "este-de-uruguay"],
  ),
  {
    ...UY("Montevideo", "talleres", F.fi, MAR, ["canelones", "san-jose", "uruguay"]),
    maquinas: M.talleres,
  },
  UY(
    "Paysandú",
    "granos",
    F.tr,
    ["John Deere", "Case IH", "New Holland"],
    ["salto", "rio-negro", "tacuarembo", "litoral-oeste-de-uruguay"],
  ),
  UY(
    "Río Negro",
    "granos",
    F.tr,
    ["John Deere", "Case IH", "Massey Ferguson"],
    ["young", "soriano", "paysandu", "litoral-oeste-de-uruguay"],
  ),
  UY(
    "Rivera",
    "ganaderia",
    F.hi,
    ["Massey Ferguson", "Valtra", "John Deere"],
    ["tacuarembo", "artigas", "cerro-largo", "santana-do-livramento"],
  ),
  UY(
    "Rocha",
    "arroz",
    F.ro,
    ["John Deere", "Massey Ferguson", "Valtra", "New Holland"],
    ["chuy", "treinta-y-tres", "lavalleja", "maldonado", "chui"],
  ),
  UY(
    "Salto",
    "citrus",
    F.fi,
    ["Massey Ferguson", "John Deere", "New Holland"],
    ["paysandu", "artigas", "norte-de-uruguay"],
  ),
  UY(
    "San José",
    "leche",
    F.hi,
    ["Massey Ferguson", "John Deere", "New Holland"],
    ["colonia", "flores", "canelones", "montevideo"],
  ),
  UY(
    "Soriano",
    "granos",
    F.tr,
    ["John Deere", "Case IH", "New Holland", "Massey Ferguson"],
    ["rio-negro", "colonia", "flores", "litoral-oeste-de-uruguay"],
  ),
  UY(
    "Tacuarembó",
    "ganaderia",
    F.hi,
    ["Massey Ferguson", "Valtra", "John Deere"],
    ["rivera", "durazno", "paysandu", "cerro-largo"],
  ),
  UY(
    "Treinta y Tres",
    "arroz",
    F.ro,
    ["John Deere", "New Holland", "Massey Ferguson", "Valtra"],
    ["rocha", "cerro-largo", "lavalleja", "este-de-uruguay"],
  ),
  // Cidades do Uruguai
  UY(
    "Chuy",
    "arroz",
    F.ro,
    MAR,
    ["rocha", "chui", "santa-vitoria-do-palmar", "treinta-y-tres"],
    "cidade",
    "Rocha",
  ),
  UY(
    "Young",
    "granos",
    F.tr,
    ["John Deere", "Case IH", "New Holland"],
    ["rio-negro", "paysandu", "soriano"],
    "cidade",
    "Río Negro",
  ),
  UY(
    "Mercedes",
    "granos",
    F.tr,
    ["John Deere", "Case IH", "Massey Ferguson"],
    ["soriano", "rio-negro", "colonia"],
    "cidade",
    "Soriano",
  ),
  UY(
    "Melo",
    "arroz",
    F.ro,
    ["John Deere", "Massey Ferguson", "Valtra"],
    ["cerro-largo", "treinta-y-tres", "jaguarao"],
    "cidade",
    "Cerro Largo",
  ),
  // Rio Grande do Sul (estado e regiões)
  {
    ...RS(
      "Rio Grande do Sul",
      "granos",
      F.fi,
      ["Massey Ferguson", "John Deere", "Valtra", "New Holland"],
      ["extremo-sul", "pelotas", "porto-alegre", "passo-fundo", "campanha-gaucha"],
      "estado",
      "",
    ),
    perfil: {
      es: "soja, arroz, trigo, maíz y ganadería en todo el estado",
      pt: "soja, arroz, trigo, milho e pecuária em todo o estado",
    },
  },
  {
    ...RS(
      "Extremo Sul",
      "arroz",
      F.ro,
      ["John Deere", "Massey Ferguson", "Valtra", "New Holland"],
      ["chui", "santa-vitoria-do-palmar", "rio-grande", "pelotas", "jaguarao", "arroio-grande"],
      "regiao",
    ),
    perfil: {
      es: "arroz y ganadería en Chuí, Santa Vitória do Palmar, Rio Grande, Pelotas y Jaguarão",
      pt: "arroz irrigado e pecuária no Chuí, Santa Vitória do Palmar, Rio Grande, Pelotas e Jaguarão",
    },
  },
  {
    ...RS(
      "Zona Sul do RS",
      "arroz",
      F.hi,
      ["Massey Ferguson", "John Deere", "Valtra"],
      ["pelotas", "rio-grande", "camaqua", "jaguarao", "extremo-sul"],
      "regiao",
    ),
    perfil: {
      es: "arroz, soja y ganadería en Pelotas, Rio Grande, Camaquã y alrededores",
      pt: "arroz, soja e pecuária em Pelotas, Rio Grande, Camaquã e região",
    },
  },
  {
    ...RS(
      "Campanha Gaúcha",
      "arroz",
      F.tr,
      ["Massey Ferguson", "John Deere", "Valtra", "New Holland"],
      ["bage", "dom-pedrito", "santana-do-livramento", "sao-gabriel", "uruguaiana"],
      "regiao",
    ),
    perfil: {
      es: "arroz, soja y ganadería en Bagé, Dom Pedrito, Livramento, São Gabriel y la Frontera Oeste",
      pt: "arroz, soja e pecuária em Bagé, Dom Pedrito, Livramento, São Gabriel e Fronteira Oeste",
    },
  },
  // Cidades do RS
  RS("Chuí", "arroz", F.ro, MAR, ["santa-vitoria-do-palmar", "chuy", "extremo-sul", "rocha"]),
  RS(
    "Santa Vitória do Palmar",
    "arroz",
    F.ro,
    ["John Deere", "Massey Ferguson", "Valtra", "New Holland"],
    ["chui", "rio-grande", "extremo-sul", "chuy"],
  ),
  RS(
    "Rio Grande",
    "arroz",
    F.hi,
    ["Massey Ferguson", "John Deere", "New Holland"],
    ["pelotas", "santa-vitoria-do-palmar", "zona-sul-do-rs"],
  ),
  RS(
    "Pelotas",
    "arroz",
    F.hi,
    ["Massey Ferguson", "John Deere", "Valtra", "New Holland"],
    ["rio-grande", "camaqua", "jaguarao", "zona-sul-do-rs"],
  ),
  RS(
    "Jaguarão",
    "arroz",
    F.ro,
    ["John Deere", "Massey Ferguson", "Valtra"],
    ["arroio-grande", "pelotas", "melo", "extremo-sul"],
  ),
  RS(
    "Arroio Grande",
    "arroz",
    F.ro,
    ["John Deere", "Massey Ferguson", "Valtra"],
    ["jaguarao", "pelotas", "santa-vitoria-do-palmar"],
  ),
  RS(
    "Camaquã",
    "arroz",
    F.tr,
    ["Massey Ferguson", "John Deere", "Valtra"],
    ["pelotas", "porto-alegre", "zona-sul-do-rs"],
  ),
  RS(
    "Bagé",
    "ganaderia",
    F.fr,
    ["Massey Ferguson", "Valtra", "John Deere"],
    ["dom-pedrito", "santana-do-livramento", "campanha-gaucha"],
  ),
  RS(
    "Dom Pedrito",
    "arroz",
    F.ro,
    ["John Deere", "Massey Ferguson", "Valtra"],
    ["bage", "santana-do-livramento", "campanha-gaucha"],
  ),
  RS(
    "Santana do Livramento",
    "ganaderia",
    F.hi,
    ["Massey Ferguson", "Valtra", "John Deere"],
    ["rivera", "dom-pedrito", "bage", "campanha-gaucha"],
  ),
  RS(
    "São Gabriel",
    "arroz",
    F.tr,
    ["Massey Ferguson", "John Deere", "Valtra"],
    ["bage", "santa-maria", "campanha-gaucha"],
  ),
  RS(
    "Uruguaiana",
    "arroz",
    F.ro,
    ["John Deere", "New Holland", "Massey Ferguson"],
    ["alegrete", "campanha-gaucha", "artigas"],
  ),
  RS(
    "Alegrete",
    "arroz",
    F.ro,
    ["John Deere", "Massey Ferguson", "Valtra"],
    ["uruguaiana", "sao-gabriel", "campanha-gaucha"],
  ),
  RS(
    "Santa Maria",
    "granos",
    F.tr,
    ["Massey Ferguson", "John Deere", "Valtra", "New Holland"],
    ["sao-gabriel", "cruz-alta", "rio-grande-do-sul"],
  ),
  RS(
    "Cruz Alta",
    "granos",
    F.tr,
    ["John Deere", "Massey Ferguson", "Case IH"],
    ["passo-fundo", "santa-maria", "rio-grande-do-sul"],
  ),
  RS(
    "Passo Fundo",
    "granos",
    F.tr,
    ["John Deere", "Massey Ferguson", "Case IH", "New Holland"],
    ["cruz-alta", "rio-grande-do-sul"],
  ),
  {
    ...RS(
      "Porto Alegre",
      "talleres",
      F.fi,
      ["Massey Ferguson", "John Deere", "Valtra", "New Holland"],
      ["camaqua", "pelotas", "rio-grande-do-sul"],
    ),
    maquinas: M.talleres,
  },
  // Mais cidades do RS (planalto, missões, serra)
  RS(
    "Ijuí",
    "granos",
    F.tr,
    ["John Deere", "Massey Ferguson", "Valtra", "New Holland"],
    ["cruz-alta", "santo-angelo", "santa-rosa"],
  ),
  RS(
    "Santo Ângelo",
    "granos",
    F.tr,
    ["John Deere", "Massey Ferguson", "Valtra"],
    ["ijui", "santa-rosa", "cruz-alta"],
  ),
  RS(
    "Santa Rosa",
    "granos",
    F.hi,
    ["John Deere", "Massey Ferguson", "Valtra", "New Holland"],
    ["santo-angelo", "ijui", "palmeira-das-missoes"],
  ),
  RS(
    "Palmeira das Missões",
    "granos",
    F.tr,
    ["John Deere", "Massey Ferguson", "Case IH"],
    ["carazinho", "santa-rosa", "passo-fundo"],
  ),
  RS(
    "Carazinho",
    "granos",
    F.tr,
    ["John Deere", "Massey Ferguson", "Case IH", "New Holland"],
    ["passo-fundo", "palmeira-das-missoes", "cruz-alta"],
  ),
  RS(
    "Erechim",
    "leche",
    F.fi,
    ["Massey Ferguson", "Valtra", "John Deere", "Agrale"],
    ["passo-fundo", "chapeco", "concordia"],
  ),
  RS(
    "Vacaria",
    "granos",
    F.tr,
    ["John Deere", "Massey Ferguson", "Valtra"],
    ["lages", "passo-fundo", "caxias-do-sul"],
  ),
  RS(
    "Caxias do Sul",
    "granja",
    F.fi,
    ["Agrale", "Massey Ferguson", "Valtra", "New Holland"],
    ["vacaria", "lajeado", "porto-alegre"],
  ),
  RS(
    "Lajeado",
    "leche",
    F.fi,
    ["Massey Ferguson", "Valtra", "Agrale", "New Holland"],
    ["caxias-do-sul", "porto-alegre", "santa-maria"],
  ),
  // Santa Catarina
  {
    ...RS(
      "Santa Catarina",
      "leche",
      F.fi,
      ["Massey Ferguson", "Valtra", "John Deere", "Agrale", "New Holland"],
      ["chapeco", "xanxere", "concordia", "campos-novos", "lages", "sul-do-brasil"],
      "estado",
      "",
    ),
    perfil: {
      es: "leche, granos, cerdos y aves en el oeste y la sierra catarinense",
      pt: "leite, grãos, suínos e aves no oeste e na serra catarinense",
    },
  },
  RS(
    "Chapecó",
    "leche",
    F.fi,
    ["Massey Ferguson", "Valtra", "John Deere", "Agrale"],
    ["xanxere", "concordia", "erechim", "santa-catarina"],
    "cidade",
    "Santa Catarina",
  ),
  RS(
    "Xanxerê",
    "granos",
    F.tr,
    ["John Deere", "Massey Ferguson", "Valtra"],
    ["chapeco", "campos-novos", "santa-catarina"],
    "cidade",
    "Santa Catarina",
  ),
  RS(
    "Concórdia",
    "leche",
    F.fi,
    ["Massey Ferguson", "Valtra", "Agrale"],
    ["chapeco", "erechim", "santa-catarina"],
    "cidade",
    "Santa Catarina",
  ),
  RS(
    "Campos Novos",
    "granos",
    F.tr,
    ["John Deere", "Massey Ferguson", "Case IH"],
    ["xanxere", "lages", "santa-catarina"],
    "cidade",
    "Santa Catarina",
  ),
  RS(
    "Lages",
    "ganaderia",
    F.hi,
    ["Massey Ferguson", "Valtra", "John Deere"],
    ["campos-novos", "vacaria", "santa-catarina"],
    "cidade",
    "Santa Catarina",
  ),
  // Paraná
  {
    ...RS(
      "Paraná",
      "granos",
      F.tr,
      ["John Deere", "Massey Ferguson", "Case IH", "New Holland", "Valtra"],
      ["cascavel", "toledo", "guarapuava", "ponta-grossa", "londrina", "sul-do-brasil"],
      "estado",
      "",
    ),
    perfil: {
      es: "soja, maíz, trigo y leche en el oeste, los Campos Gerais y el norte paranaense",
      pt: "soja, milho, trigo e leite no oeste, nos Campos Gerais e no norte do Paraná",
    },
  },
  RS(
    "Cascavel",
    "granos",
    F.tr,
    ["John Deere", "Massey Ferguson", "Case IH", "New Holland"],
    ["toledo", "guarapuava", "parana"],
    "cidade",
    "Paraná",
  ),
  RS(
    "Toledo",
    "granos",
    F.hi,
    ["John Deere", "Massey Ferguson", "Valtra", "New Holland"],
    ["cascavel", "parana"],
    "cidade",
    "Paraná",
  ),
  RS(
    "Guarapuava",
    "granos",
    F.tr,
    ["John Deere", "Massey Ferguson", "Case IH"],
    ["cascavel", "ponta-grossa", "parana"],
    "cidade",
    "Paraná",
  ),
  RS(
    "Ponta Grossa",
    "granos",
    F.tr,
    ["John Deere", "Massey Ferguson", "New Holland", "Case IH"],
    ["castro", "guarapuava", "parana"],
    "cidade",
    "Paraná",
  ),
  RS(
    "Castro",
    "leche",
    F.fi,
    ["Massey Ferguson", "John Deere", "Valtra", "New Holland"],
    ["ponta-grossa", "parana"],
    "cidade",
    "Paraná",
  ),
  RS(
    "Londrina",
    "granos",
    F.tr,
    ["John Deere", "Massey Ferguson", "New Holland", "Case IH"],
    ["maringa", "parana"],
    "cidade",
    "Paraná",
  ),
  RS(
    "Maringá",
    "granos",
    F.tr,
    ["John Deere", "Massey Ferguson", "Case IH"],
    ["londrina", "parana"],
    "cidade",
    "Paraná",
  ),
  // Sul do Brasil (página dos três estados)
  {
    ...RS(
      "Sul do Brasil",
      "granos",
      F.fi,
      ["Massey Ferguson", "John Deere", "Valtra", "New Holland", "Case IH"],
      ["rio-grande-do-sul", "santa-catarina", "parana"],
      "regiao",
      "",
    ),
    perfil: {
      es: "granos, arroz, leche y ganadería en Rio Grande do Sul, Santa Catarina y Paraná",
      pt: "grãos, arroz, leite e pecuária no Rio Grande do Sul, em Santa Catarina e no Paraná",
    },
  },
];

// Cada país na sua língua: os locais do Uruguai (pais "UY") só em espanhol (/repuestos-agricolas/...);
// os do Sul do Brasil (pais "RS" = RS, SC e PR) só em português (/pt/repuestos-agricolas/...).
// A rota $local leva o endereço na língua errada para a certa.
export const LOCAIS_SEO: LocalSeo[] = BASE.map((b) => ({ ...b, slug: slugify(b.nome) }));
export const idiomaDoLocal = (l: Pick<LocalSeo, "pais">): "es" | "pt" =>
  l.pais === "UY" ? "es" : "pt";
export const locaisDoIdioma = (idioma: "es" | "pt") =>
  LOCAIS_SEO.filter((l) => idiomaDoLocal(l) === idioma);
export const localPorSlug = (s: string) => LOCAIS_SEO.find((l) => l.slug === s) ?? null;
// Sigla do estado (Brasil) para títulos: "Peças agrícolas em Chapecó – SC"
export const UF: Record<string, string> = {
  "Rio Grande do Sul": "RS",
  "Santa Catarina": "SC",
  Paraná: "PR",
};
export const localPeloNome = (nome: string) => LOCAIS_SEO.find((l) => l.nome === nome) ?? null;

// Texto da página (gerado a partir do perfil: muda de um local para outro)
export function textoLocal(l: LocalSeo, idioma: "es" | "pt", totalPecas: number) {
  const n = totalPecas.toLocaleString(idioma === "pt" ? "pt-BR" : "es-UY");
  const marcas = l.marcas.join(", ");
  if (idioma === "pt") {
    const envio = l.pais === "RS" ? "por Correios ou transportadora" : "";
    const onde = l.tipo === "cidade" && l.dentro ? `${nomeLocal(l, idioma)} (${l.dentro})` : l.nome;
    return [
      `Loja online de peças agrícolas com mais de ${n} peças publicadas, preço visível e atendimento pelo WhatsApp. ${l.pais === "RS" ? `Enviamos para ${onde} ${envio}, com preço em R$.` : `Atendemos ${onde} pelo WhatsApp.`}`,
      `A região tem forte presença de ${l.perfil.pt}. Por isso as peças mais procuradas aqui são para ${l.maquinas.pt}, de marcas como ${marcas}.`,
      `Atendemos todo o RS, SC e PR. Mande o código original ou uma foto da peça e confirmamos a compatibilidade antes da compra.`,
    ];
  }
  const onde = l.tipo === "cidade" && l.dentro ? `${nomeLocal(l, idioma)} (${l.dentro})` : l.nome;
  return [
    `Tienda online de repuestos agrícolas con más de ${n} repuestos publicados, precio a la vista y atención por WhatsApp. Cotizá desde ${onde} por WhatsApp.`,
    `En la zona predomina ${l.perfil.es}. Por eso los repuestos más pedidos acá son para ${l.maquinas.es}, de marcas como ${marcas}.`,
    `Somos distribuidores de repuestos agrícolas en Uruguay, en Chuy, Rocha. Mandanos el código original o una foto de la pieza y te confirmamos la compatibilidad antes de comprar.`,
  ];
}

export function tituloLocal(l: LocalSeo, idioma: "es" | "pt") {
  if (idioma === "pt")
    return l.pais === "RS"
      ? `Peças agrícolas em ${nomeLocal(l, idioma)}${l.tipo === "cidade" ? ` – ${UF[l.dentro ?? ""] ?? "RS"}` : ""}`
      : `Peças agrícolas em ${nomeLocal(l, idioma)}`;
  return l.tipo === "pais"
    ? "Repuestos agrícolas en Uruguay"
    : `Repuestos agrícolas en ${nomeLocal(l, idioma)}`;
}

export function descricaoLocal(l: LocalSeo, idioma: "es" | "pt", totalPecas: number) {
  const n = totalPecas.toLocaleString(idioma === "pt" ? "pt-BR" : "es-UY");
  if (idioma === "pt")
    return `Mais de ${n} peças para tratores e colheitadeiras ${l.marcas.slice(0, 3).join(", ")} com envio para ${nomeLocal(l, idioma)}${l.pais === "RS" ? " por Correios ou transportadora" : ""}. Orçamento pelo WhatsApp.`;
  return `Más de ${n} repuestos para tractores y cosechadoras ${l.marcas.slice(0, 3).join(", ")} en ${nomeLocal(l, idioma)}, con código original. Cotizá por WhatsApp.`;
}

export function perguntasLocal(l: LocalSeo, idioma: "es" | "pt") {
  if (idioma === "pt")
    return [
      {
        p: `Vocês enviam peças agrícolas para ${nomeLocal(l, idioma)}?`,
        r: `Sim. Enviamos para ${nomeLocal(l, idioma)} por Correios ou transportadora, com nota fiscal, código de rastreio e preço em R$. O frete é combinado pelo WhatsApp e pago pelo cliente.`,
      },
      {
        p: "Quanto tempo demora a entrega?",
        r: "Depende da cidade e da transportadora. Informamos o prazo junto com o orçamento, antes de você confirmar a compra.",
      },
      {
        p: "Como sei se a peça serve no meu trator?",
        r: "Mande pelo WhatsApp o código original da peça ou o modelo e número de série do trator. Confirmamos a compatibilidade antes da compra.",
      },
      {
        p: "Vocês têm loja física?",
        r: "Somos uma loja online de peças agrícolas para o Sul do Brasil. Todo o atendimento é pelo WhatsApp e enviamos para RS, SC e PR com nota fiscal.",
      },
    ];
  return [
    {
      p: `¿Cómo compro repuestos agrícolas desde ${nomeLocal(l, idioma)}?`,
      r: "Buscá la pieza en el sitio o mandanos el código por WhatsApp. Te respondemos con precio y disponibilidad, sin compromiso.",
    },
    {
      p: "¿Cuánto demoran en responder?",
      r: "Te respondemos por WhatsApp con precio y disponibilidad, antes de que confirmes la compra.",
    },
    {
      p: "¿Cómo sé si el repuesto sirve para mi tractor?",
      r: "Mandanos por WhatsApp el código original de la pieza o el modelo y número de serie del tractor. Te confirmamos la compatibilidad antes de comprar.",
    },
    {
      p: "¿Tienen local físico?",
      r: "Somos una tienda online en Chuy, Rocha. Atendemos por WhatsApp.",
    },
  ];
}

export const nomeLocal = (l: LocalSeo, idioma: "es" | "pt") =>
  idioma === "pt"
    ? l.nome.replace(/ de Uruguay$/, " do Uruguai").replace(/^Uruguay$/, "Uruguai")
    : l.nome;
