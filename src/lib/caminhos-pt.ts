// Endereços em português na versão /pt: o brasileiro busca "peças agrícolas", não "repuestos".
// As rotas continuam com os nomes em espanhol por dentro; aqui só se traduzem os pedaços do
// endereço público: "/repuestos/sellos-y-juntas" <-> "/pecas/vedacoes".
// Os endereços antigos em espanhol dentro de /pt levam ao novo com 301 (src/server.ts).
// A lista das categorias precisa acompanhar src/lib/seo-paginas.ts (scripts/ci/testar-caminhos-pt.ts confere).

// Primeiro pedaço do endereço
const TOPO: Record<string, string> = {
  repuestos: "pecas",
  "repuestos-agricolas": "pecas-agricolas",
  cotizar: "orcamento",
  ayuda: "ajuda",
  cupones: "cupons",
};

// Categorias, máquinas e tipos de peça (/repuestos/<x> e /repuestos/<marca>/<x>). Marcas não mudam.
export const CATEGORIAS_PT: Record<string, string> = {
  "engranajes-y-transmision": "engrenagens-e-transmissao",
  "hidraulica-y-neumatica": "hidraulica-e-pneumatica",
  "sellos-y-juntas": "vedacoes",
  "rodamientos-y-cojinetes": "rolamentos-e-mancais",
  "tornilleria-y-fijacion": "elementos-de-fixacao",
  "frenos-y-embragues": "freios-e-embreagens",
  "estructura-y-suspension": "estrutura-e-suspensao",
  "electrica-y-sensores": "eletrica-e-sensores",
  "otros-componentes": "outros-componentes",
  cosechadoras: "colheitadeiras",
  sembradoras: "plantadeiras",
  embragues: "embreagens",
  pistones: "pistoes",
  "bombas-de-agua": "bombas-d-agua",
  crucetas: "cruzetas",
  "juntas-de-tapa": "juntas-de-cabecote",
  "terminales-de-direccion": "terminais-de-direcao",
  "bombas-inyectoras": "bombas-injetoras",
};

const inverter = (m: Record<string, string>) =>
  Object.fromEntries(Object.entries(m).map(([es, pt]) => [pt, es]));
const TOPO_ES = inverter(TOPO);
const CATEGORIAS_ES = inverter(CATEGORIAS_PT);

function traduzir(endereco: string, topo: Record<string, string>, cats: Record<string, string>) {
  // "?..." e "#..." (links escritos à mão, ex.: "/ayuda#privacidad") ficam de fora da tradução
  const corte = endereco.search(/[?#]/);
  const caminho = corte < 0 ? endereco : endereco.slice(0, corte);
  const resto = corte < 0 ? "" : endereco.slice(corte);
  const partes = caminho.split("/");
  // partes[0] é "" (o caminho começa com "/")
  const primeiro = partes[1] ?? "";
  if (topo[primeiro]) partes[1] = topo[primeiro];
  // Só dentro de /repuestos (/pecas): /x/<categoria> e /x/<marca>/<categoria>
  if (primeiro === "repuestos" || primeiro === "pecas")
    for (const i of [2, 3]) if (partes[i] && cats[partes[i]]) partes[i] = cats[partes[i]];
  return partes.join("/") + resto;
}

// Caminho interno (rotas, em espanhol) -> endereço público em português (sem o "/pt")
export const paraPt = (caminho: string) => traduzir(caminho, TOPO, CATEGORIAS_PT);
// Endereço público em português (sem o "/pt") -> caminho interno. O que já está em espanhol passa igual.
export const paraEs = (caminho: string) => traduzir(caminho, TOPO_ES, CATEGORIAS_ES);

// Qualquer endereço do site ("/pt/pecas/vedacoes", "/repuestos/filtros") -> caminho interno sem "/pt".
// Para agrupar visitas e relatórios sem depender da língua.
export const caminhoInterno = (p: string) =>
  p === "/pt" || p.startsWith("/pt/") ? paraEs(p.slice(3) || "/") : p;
