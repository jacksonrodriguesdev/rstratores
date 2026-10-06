// Busca da loja (linha agrícola) feita em memória.
//
// O MySQL precisava ordenar as ~29 mil peças a cada página (o nome é TEXT, sem índice) e a busca
// com LIKE em vários campos levava ~0,5 s. Aqui fica um índice leve do catálogo (só os campos de
// busca), recarregado a cada 5 minutos ou quando o admin altera algo; filtrar, ordenar por
// relevância e paginar leva poucos milissegundos. Do banco só vêm as peças da página atual.
import { prisma } from "./prisma";
import { buscaParaPortugues, prepararBusca } from "./pecas-es";

type Item = {
  sku: string;
  nome: string;
  nomeN: string; // nome normalizado (maiúsculas, sem acento)
  codigos: string; // sku, código do fabricante e códigos das versões, normalizados e sem espaços
  texto: string; // tudo que a busca procura, normalizado
  categoria: string | null;
  categoriaN: string;
  temCategoria: boolean;
  marca: string | null;
  comImagem: boolean;
  criado: number;
};

const VALIDADE = 5 * 60 * 1000;
let cache: { itens: Item[]; em: number } | null = null;
let carregando: Promise<Item[]> | null = null;

export const normalizar = (s: string | null | undefined) =>
  (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase();

const soCodigo = (s: string) => normalizar(s).replace(/[^A-Z0-9]/g, "");

// Chamada antes ou durante uma gravação do admin: limpa de novo alguns segundos depois para não
// guardar uma leitura feita antes da gravação terminar.
export function limparCacheCatalogo() {
  cache = null;
  setTimeout(() => (cache = null), 5000);
}

async function carregar(): Promise<Item[]> {
  const linhas = await prisma.agricolas.findMany({
    select: {
      sku: true,
      nome: true,
      nome_es: true,
      categoria: true,
      category_id: true,
      marca: true,
      codigo_fabricante: true,
      fabricante: true,
      imagem_principal: true,
      created_at: true,
      duplicado_de: true,
      veiculos_compativeis: true,
    },
  });

  // Versões (duplicado_de) não aparecem na loja, mas seus códigos acham a peça principal
  const extras = new Map<string, string[]>();
  for (const l of linhas) {
    if (!l.duplicado_de) continue;
    const lista = extras.get(l.duplicado_de) ?? [];
    lista.push(l.sku, l.codigo_fabricante ?? "", l.fabricante ?? "");
    extras.set(l.duplicado_de, lista);
  }

  return linhas
    .filter((l) => !l.duplicado_de)
    .map((l) => {
      const ext = extras.get(l.sku) ?? [];
      const codigos = [l.sku, l.codigo_fabricante ?? "", ...ext].map(soCodigo).filter(Boolean).join(" ");
      const img = l.imagem_principal ?? "";
      return {
        sku: l.sku,
        nome: l.nome,
        nomeN: normalizar(l.nome),
        codigos,
        texto: normalizar(
          [l.nome, l.nome_es, l.sku, l.codigo_fabricante, l.fabricante, l.marca, l.categoria, l.veiculos_compativeis, ...ext].join(" "),
        ),
        categoria: l.categoria,
        categoriaN: normalizar(l.categoria),
        temCategoria: l.category_id != null,
        marca: l.marca,
        comImagem: img !== "" && !img.includes("redeparts"),
        criado: l.created_at.getTime(),
      };
    });
}

async function itens(): Promise<Item[]> {
  if (cache && Date.now() - cache.em < VALIDADE) return cache.itens;
  // Várias requisições juntas esperam a mesma carga
  carregando ??= carregar().finally(() => (carregando = null));
  const lista = await carregando;
  cache = { itens: lista, em: Date.now() };
  return lista;
}

export type FiltrosBusca = {
  search?: string;
  categoria?: string | string[];
  marca?: string | string[];
  montadora?: string | string[];
  sort?: string;
  hasImage?: boolean;
  vitrine?: boolean;
};

const comoLista = (v?: string | string[]) => (v == null ? [] : Array.isArray(v) ? v : [v]).filter(Boolean);
const compararNome = (a: Item, b: Item) => (a.nome < b.nome ? -1 : a.nome > b.nome ? 1 : a.sku < b.sku ? -1 : 1);

// Devolve os SKUs na ordem de exibição.
export async function buscarSkus(f: FiltrosBusca): Promise<string[]> {
  let lista = await itens();

  const termos = prepararBusca(f.search ?? "");
  const consultaCodigo = soCodigo(f.search ?? "");
  // Cada termo pode vir em espanhol: "rodamiento" também procura "ROLAMENTO"
  const variantes = termos.map((t) => {
    const pt = buscaParaPortugues(t);
    return [...new Set([normalizar(t), normalizar(pt)])];
  });

  if (f.vitrine) lista = lista.filter((i) => i.temCategoria);
  if (f.hasImage) lista = lista.filter((i) => i.comImagem);

  const categorias = comoLista(f.categoria).map(normalizar);
  if (categorias.length) lista = lista.filter((i) => categorias.some((c) => i.categoriaN.includes(c)));

  const marcas = comoLista(f.marca);
  if (marcas.length) lista = lista.filter((i) => i.marca != null && marcas.includes(i.marca));

  const montadoras = comoLista(f.montadora).map(normalizar);
  if (montadoras.length) lista = lista.filter((i) => montadoras.some((m) => i.texto.includes(m)));

  if (variantes.length) {
    lista = lista.filter((i) => variantes.every((vs) => vs.some((v) => i.texto.includes(v))));
  }

  // Ordem: com busca e ordem padrão, os mais relevantes primeiro (código exato no topo)
  if (termos.length && (!f.sort || f.sort === "nome-asc")) {
    const primeiro = variantes[0];
    const pontos = (i: Item) => {
      let p = 0;
      if (consultaCodigo.length >= 3) {
        const cods = i.codigos.split(" ");
        if (cods.includes(consultaCodigo)) p += 100;
        else if (cods.some((c) => c.startsWith(consultaCodigo))) p += 50;
      }
      if (primeiro.some((v) => i.nomeN.startsWith(v))) p += 20;
      else if (primeiro.some((v) => i.nomeN.includes(` ${v}`))) p += 5;
      if (i.temCategoria) p += 2;
      if (i.comImagem) p += 1;
      return p;
    };
    const comPontos = lista.map((i) => ({ i, p: pontos(i) }));
    comPontos.sort((a, b) => b.p - a.p || compararNome(a.i, b.i));
    return comPontos.map((x) => x.i.sku);
  }

  const ordenada = [...lista];
  if (f.sort === "nome-desc") ordenada.sort((a, b) => compararNome(b, a));
  else if (f.sort === "created-desc") ordenada.sort((a, b) => b.criado - a.criado || (a.sku < b.sku ? -1 : 1));
  else if (f.sort === "sku") ordenada.sort((a, b) => (a.sku < b.sku ? -1 : 1));
  else ordenada.sort(compararNome);
  return ordenada.map((i) => i.sku);
}

// Pedido rápido: acha cada código digitado pelo cliente (SKU, código do fabricante ou de uma
// versão). Devolve, para cada código, o SKU da peça ou null.
export async function acharPorCodigos(codigos: string[]): Promise<Array<{ codigo: string; sku: string | null }>> {
  const lista = await itens();
  const porCodigo = new Map<string, string>();
  for (const i of lista) {
    for (const c of i.codigos.split(" ")) if (c && !porCodigo.has(c)) porCodigo.set(c, i.sku);
  }
  return codigos.map((codigo) => ({ codigo, sku: porCodigo.get(soCodigo(codigo)) ?? null }));
}
