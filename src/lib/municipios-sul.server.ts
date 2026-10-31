// Cidades do RS, SC e PR a partir dos dados do IBGE (src/lib/municipios-sul.json, gerado por
// scripts/seo/gerar_municipios_sul.cjs). As de maior área plantada ("p": 1) ganham página própria
// em /pt/pecas-agricolas/<cidade>, com as lavouras reais do município (o texto muda de uma para
// outra). Todas as 1.191 aparecem na página do seu estado. As cidades escritas à mão em
// src/lib/locais-seo.ts continuam valendo e só recebem os números do IBGE.
// Fica no servidor: o arquivo tem ~150 KB e não precisa ir para o navegador.
import dados from "./municipios-sul.json";
import { slugify } from "./seo-paginas";
import {
  LOCAIS_SEO,
  M,
  F,
  UF,
  type LocalSeo,
  type DadosIbge,
  type CidadeDaLista,
  type ExtrasLocal,
} from "./locais-seo";

type Municipio = {
  n: string;
  uf: "RS" | "SC" | "PR";
  mi: string;
  ha: number;
  c: Array<[string, number]>;
  p?: number;
};
const MUNICIPIOS = (dados as unknown as { municipios: Municipio[] }).municipios;
const ANO = (dados as { ano: string }).ano;
export const NOME_UF: Record<string, string> = {
  RS: "Rio Grande do Sul",
  SC: "Santa Catarina",
  PR: "Paraná",
};
const UF_DO_ESTADO: Record<string, string> = UF;

// Nome que existe em mais de um estado (Bom Jesus, Planalto...): endereço com a sigla
const repetidos = (() => {
  const n = new Map<string, number>();
  for (const m of MUNICIPIOS) n.set(m.n, (n.get(m.n) ?? 0) + 1);
  return new Set([...n].filter(([, q]) => q > 1).map(([k]) => k));
})();

// Página escrita à mão para este município (mesmo nome e mesmo estado)?
const fixos = new Map(
  LOCAIS_SEO.filter((l) => l.pais === "RS" && l.tipo === "cidade").map((l) => [
    `${l.nome}|${UF_DO_ESTADO[l.dentro ?? ""] ?? "RS"}`,
    l,
  ]),
);
const slugsOcupados = new Set(LOCAIS_SEO.map((l) => l.slug));

const slugDe = (m: Municipio) => {
  const fixo = fixos.get(`${m.n}|${m.uf}`);
  if (fixo) return fixo.slug;
  const base = slugify(m.n);
  return repetidos.has(m.n) || slugsOcupados.has(base) ? `${base}-${m.uf.toLowerCase()}` : base;
};

// Tipo de lavoura que mais pesa na cidade: escolhe máquinas, categoria em destaque e marcas
const GRAOS = /soja|milho|trigo|aveia|cevada|sorgo|canola|feijão|girassol|triticale|centeio/;
const FRUTAS =
  /uva|maçã|laranja|pêssego|tangerina|banana|limão|caqui|figo|ameixa|noz|erva-mate|pera/;
function classe(m: Municipio): "arroz" | "granos" | "granja" | "frutas" {
  const soma = (re: RegExp) => m.c.filter(([c]) => re.test(c)).reduce((t, [, h]) => t + h, 0);
  const arroz = soma(/^arroz/);
  const graos = soma(GRAOS);
  const frutas = soma(FRUTAS);
  if (arroz > 0 && arroz >= graos * 0.5) return "arroz";
  if (graos >= m.ha * 0.5) return "granos";
  if (frutas >= m.ha * 0.3) return "frutas";
  return "granja";
}
const POR_CLASSE = {
  arroz: { maquinas: M.arroz, foco: F.hi, marcas: ["John Deere", "Massey Ferguson", "Valtra"] },
  granos: {
    maquinas: M.granos,
    foco: F.tr,
    marcas: ["John Deere", "Massey Ferguson", "Case IH", "New Holland"],
  },
  granja: {
    maquinas: M.granja,
    foco: F.fi,
    marcas: ["Massey Ferguson", "Valtra", "Agrale", "New Holland"],
  },
  frutas: {
    maquinas: {
      es: "tractores fruteros y chicos, pulverizadores y rotativas",
      pt: "tratores fruteiros e pequenos, pulverizadores e roçadeiras",
    },
    foco: F.fi,
    marcas: ["Massey Ferguson", "Valtra", "Agrale", "New Holland"],
  },
} as const;

const lista = (itens: string[]) =>
  itens.length > 1 ? `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}` : itens[0];
const ibgeDe = (m: Municipio): DadosIbge | undefined =>
  m.ha > 0 ? { ha: m.ha, ano: ANO, culturas: m.c.slice(0, 4) } : undefined;

const comPagina = MUNICIPIOS.filter((m) => m.p && !fixos.has(`${m.n}|${m.uf}`));
const porSlug = new Map(comPagina.map((m) => [slugDe(m), m]));
const temPagina = (m: Municipio) => !!m.p || fixos.has(`${m.n}|${m.uf}`);

function localDe(m: Municipio): LocalSeo {
  const k = POR_CLASSE[classe(m)];
  const culturas = lista(m.c.slice(0, 3).map(([c]) => c)) || "lavoura e pecuária";
  // Vizinhos: cidades com página na mesma microrregião (as de mais lavoura) e o estado
  const vizinhos = MUNICIPIOS.filter(
    (o) => o !== m && o.mi === m.mi && o.uf === m.uf && temPagina(o),
  )
    .sort((a, b) => b.ha - a.ha)
    .slice(0, 4)
    .map(slugDe);
  return {
    slug: slugDe(m),
    nome: m.n,
    pais: "RS",
    tipo: "cidade",
    dentro: NOME_UF[m.uf],
    regiao: m.mi,
    perfil: { es: culturas, pt: culturas },
    maquinas: k.maquinas,
    foco: k.foco,
    marcas: [...k.marcas],
    vizinhos: [...vizinhos, slugify(NOME_UF[m.uf])],
    ibge: ibgeDe(m),
  };
}

// Página de cidade gerada (null se o endereço não é de uma delas)
export function localGerado(slug: string): LocalSeo | null {
  const m = porSlug.get(slug);
  return m ? localDe(m) : null;
}

// Todas as cidades geradas (mapa do site e página "Peças agrícolas no Sul do Brasil")
export const locaisGerados = (): LocalSeo[] => comPagina.map(localDe);

// Números do IBGE de uma cidade escrita à mão (mesmo nome e estado)
export function ibgeDoLocal(l: LocalSeo): DadosIbge | undefined {
  if (l.ibge || l.tipo !== "cidade") return l.ibge;
  const uf = UF_DO_ESTADO[l.dentro ?? ""] ?? "RS";
  const m = MUNICIPIOS.find((x) => x.n === l.nome && x.uf === uf);
  return m && ibgeDe(m);
}

// Página do estado: todos os municípios, por microrregião (com link quando a cidade tem página)
export function cidadesDoEstado(
  nomeEstado: string,
): Array<{ regiao: string; cidades: CidadeDaLista[] }> | null {
  const uf = UF_DO_ESTADO[nomeEstado];
  if (!uf || !NOME_UF[uf]) return null;
  const grupos = new Map<string, CidadeDaLista[]>();
  for (const m of MUNICIPIOS.filter((x) => x.uf === uf)) {
    const g = grupos.get(m.mi) ?? [];
    g.push({ nome: m.n, slug: temPagina(m) ? slugDe(m) : null });
    grupos.set(m.mi, g);
  }
  return [...grupos]
    .map(([regiao, cidades]) => ({
      regiao,
      cidades: cidades.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR")),
    }))
    .sort((a, b) => a.regiao.localeCompare(b.regiao, "pt-BR"));
}

export const totalMunicipios = (uf?: string) =>
  uf ? MUNICIPIOS.filter((m) => m.uf === uf).length : MUNICIPIOS.length;

// O que a página de um local recebe do servidor: números do IBGE, vizinhos (escritos à mão e
// gerados, com mais cidades da mesma microrregião) e, na página do estado, a lista de municípios
export function extrasDoLocal(l: LocalSeo): ExtrasLocal {
  const uf = UF_DO_ESTADO[l.dentro ?? ""] ?? "RS";
  const m = l.tipo === "cidade" ? MUNICIPIOS.find((x) => x.n === l.nome && x.uf === uf) : undefined;
  const nomeDe = (slug: string) =>
    LOCAIS_SEO.find((x) => x.slug === slug)?.nome ?? porSlug.get(slug)?.n ?? null;
  const daRegiao = m
    ? MUNICIPIOS.filter((o) => o !== m && o.mi === m.mi && o.uf === m.uf && temPagina(o))
        .sort((a, b) => b.ha - a.ha)
        .slice(0, 6)
        .map(slugDe)
    : [];
  const vistos = new Set<string>([l.slug]);
  const vizinhos: Array<{ slug: string; nome: string }> = [];
  for (const slug of [...l.vizinhos, ...daRegiao]) {
    const nome = nomeDe(slug);
    if (!nome || vistos.has(slug)) continue;
    vistos.add(slug);
    vizinhos.push({ slug, nome });
  }
  return {
    ibge: ibgeDoLocal(l) ?? null,
    regiao: l.regiao ?? m?.mi ?? null,
    vizinhos: vizinhos.slice(0, 10),
    estado: l.tipo === "estado" ? cidadesDoEstado(l.nome) : null,
  };
}
