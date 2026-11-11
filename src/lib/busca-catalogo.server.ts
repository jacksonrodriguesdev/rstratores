// Busca da loja (linha agrícola) feita em memória.
//
// O MySQL precisava ordenar as ~29 mil peças a cada página (o nome é TEXT, sem índice) e a busca
// com LIKE em vários campos levava ~0,5 s. Aqui fica um índice leve do catálogo (só os campos de
// busca), recarregado a cada 5 minutos ou quando o admin altera algo; filtrar, ordenar por
// relevância e paginar leva poucos milissegundos. Do banco só vêm as peças da página atual.
import { prisma } from "./prisma";
import { buscaParaPortugues, prepararBusca, sinonimosBusca } from "./pecas-es";
import { fotoInvalida } from "./fotos";

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
  fotoPropria: boolean; // foto real da peça em public/catalogo (aparece primeiro)
  criado: number;
};

const VALIDADE = 30 * 60 * 1000;
// A cada 30 s confere se o catálogo mudou (quantidade e última alteração). Assim mudanças
// feitas direto no banco (importação pelo phpMyAdmin, scripts) aparecem na loja em até 30 s.
const CONFERIR = 30 * 1000;
// Índice guardado em globalThis: as rotas de API do admin e as funções da loja podem carregar
// este módulo separadamente; assim todas usam (e limpam) o mesmo índice.
type Indice = { itens: Item[]; em: number; assinatura: string; conferido: number };
const G = globalThis as unknown as {
  __indiceCatalogo?: { cache: Indice | null; carregando: Promise<Item[]> | null };
};
const estado = (G.__indiceCatalogo ??= { cache: null, carregando: null });

async function assinaturaCatalogo(): Promise<string> {
  const [r] = await prisma.$queryRawUnsafe<Array<{ n: bigint; u: Date | null }>>(
    "SELECT COUNT(*) AS n, MAX(updated_at) AS u FROM agricolas",
  );
  return `${r?.n ?? 0}|${r?.u ? new Date(r.u).getTime() : 0}`;
}

export const normalizar = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

const soCodigo = (s: string) => normalizar(s).replace(/[^A-Z0-9]/g, "");

// Chamada antes ou durante uma gravação do admin: limpa de novo alguns segundos depois para não
// guardar uma leitura feita antes da gravação terminar.
export function limparCacheCatalogo() {
  estado.cache = null;
  setTimeout(() => (estado.cache = null), 5000);
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
      const codigos = [l.sku, l.codigo_fabricante ?? "", ...ext]
        .map(soCodigo)
        .filter(Boolean)
        .join(" ");
      const img = l.imagem_principal ?? "";
      return {
        sku: l.sku,
        nome: l.nome,
        nomeN: normalizar(l.nome),
        codigos,
        texto: normalizar(
          [
            l.nome,
            l.nome_es,
            l.sku,
            l.codigo_fabricante,
            l.fabricante,
            l.marca,
            l.categoria,
            l.veiculos_compativeis,
            ...ext,
          ].join(" "),
        ),
        categoria: l.categoria,
        categoriaN: normalizar(l.categoria),
        temCategoria: l.category_id != null,
        marca: l.marca,
        comImagem: img !== "" && !fotoInvalida(img),
        fotoPropria: img.startsWith("/catalogo/"),
        criado: l.created_at.getTime(),
      };
    });
}

async function itens(): Promise<Item[]> {
  if (estado.cache && Date.now() - estado.cache.em < VALIDADE) {
    if (Date.now() - estado.cache.conferido < CONFERIR) return estado.cache.itens;
    estado.cache.conferido = Date.now();
    try {
      if ((await assinaturaCatalogo()) === estado.cache.assinatura) return estado.cache.itens;
    } catch {
      return estado.cache.itens; // banco indisponível: segue com o índice atual
    }
  }
  // Várias requisições juntas esperam a mesma carga
  estado.carregando ??= (async () => {
    const assinatura = await assinaturaCatalogo().catch(() => "");
    const lista = await carregar();
    estado.cache = { itens: lista, em: Date.now(), assinatura, conferido: Date.now() };
    return lista;
  })().finally(() => (estado.carregando = null));
  return estado.carregando;
}

// ---- Linha de caminhões: mesmo índice em memória, carregado sob demanda da tabela `products`
// (linha='CAMINHOES'). Ordenar/filtrar 68 mil peças no MySQL por nome (TEXT) levava ~3 s.
const Gc = globalThis as unknown as {
  __indiceCaminhoes?: { cache: Indice | null; carregando: Promise<Item[]> | null };
};
const estadoCam = (Gc.__indiceCaminhoes ??= { cache: null, carregando: null });

async function assinaturaCaminhoes(): Promise<string> {
  const [r] = await prisma.$queryRawUnsafe<Array<{ n: bigint; u: Date | null }>>(
    "SELECT COUNT(*) AS n, MAX(updated_at) AS u FROM products WHERE linha='CAMINHOES'",
  );
  return `${r?.n ?? 0}|${r?.u ? new Date(r.u).getTime() : 0}`;
}

async function carregarCaminhoes(): Promise<Item[]> {
  const linhas = await prisma.products.findMany({
    where: { linha: "CAMINHOES" },
    select: {
      sku: true,
      nome: true,
      categoria: true,
      marca: true,
      codigo_fabricante: true,
      imagem_principal: true,
      created_at: true,
      veiculos_compativeis: true,
    },
  });
  return linhas.map((l) => {
    const img = l.imagem_principal ?? "";
    const codigos = [l.sku, l.codigo_fabricante ?? ""].map(soCodigo).filter(Boolean).join(" ");
    return {
      sku: l.sku,
      nome: l.nome,
      nomeN: normalizar(l.nome),
      codigos,
      texto: normalizar(
        [l.nome, l.sku, l.codigo_fabricante, l.marca, l.categoria, l.veiculos_compativeis].join(
          " ",
        ),
      ),
      categoria: l.categoria,
      categoriaN: normalizar(l.categoria),
      temCategoria: true,
      marca: l.marca,
      comImagem: img !== "" && !fotoInvalida(img),
      fotoPropria: false,
      criado: l.created_at.getTime(),
    };
  });
}

async function itensCaminhoes(): Promise<Item[]> {
  if (estadoCam.cache && Date.now() - estadoCam.cache.em < VALIDADE) {
    if (Date.now() - estadoCam.cache.conferido < CONFERIR) return estadoCam.cache.itens;
    estadoCam.cache.conferido = Date.now();
    try {
      if ((await assinaturaCaminhoes()) === estadoCam.cache.assinatura)
        return estadoCam.cache.itens;
    } catch {
      return estadoCam.cache.itens;
    }
  }
  estadoCam.carregando ??= (async () => {
    const assinatura = await assinaturaCaminhoes().catch(() => "");
    const lista = await carregarCaminhoes();
    estadoCam.cache = { itens: lista, em: Date.now(), assinatura, conferido: Date.now() };
    return lista;
  })().finally(() => (estadoCam.carregando = null));
  return estadoCam.carregando;
}

// Filtros (categoria/marca) da linha de caminhões, contados do índice em memória.
export async function facetsCaminhoes() {
  const lista = await itensCaminhoes();
  const contar = (campo: "categoria" | "marca") => {
    const m = new Map<string, number>();
    for (const i of lista) {
      const v = i[campo];
      if (v) m.set(v, (m.get(v) ?? 0) + 1);
    }
    return [...m.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  };
  const marcas = contar("marca");
  return { categorias: contar("categoria"), marcas, montadoras: marcas };
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

const comoLista = (v?: string | string[]) =>
  (v == null ? [] : Array.isArray(v) ? v : [v]).filter(Boolean);
const fotoPeso = (i: Item) => (i.fotoPropria ? 2 : i.comImagem ? 1 : 0);
const compararNome = (a: Item, b: Item) =>
  a.nome < b.nome ? -1 : a.nome > b.nome ? 1 : a.sku < b.sku ? -1 : 1;

// Devolve os SKUs na ordem de exibição.
export async function buscarSkus(f: FiltrosBusca, linha = "AGRICOLA"): Promise<string[]> {
  let lista = linha === "CAMINHOES" ? await itensCaminhoes() : await itens();

  const termos = prepararBusca(f.search ?? "");
  const consultaCodigo = soCodigo(f.search ?? "");
  // Cada termo pode vir em espanhol: "rodamiento" também procura "ROLAMENTO"
  const variantes = termos.map((t) => {
    const pt = buscaParaPortugues(t);
    return [...new Set([normalizar(t), normalizar(pt), ...sinonimosBusca(t).map(normalizar)])];
  });

  if (f.vitrine) lista = lista.filter((i) => i.temCategoria);
  if (f.hasImage) lista = lista.filter((i) => i.comImagem);

  const categorias = comoLista(f.categoria).map(normalizar);
  if (categorias.length)
    lista = lista.filter((i) => categorias.some((c) => i.categoriaN.includes(c)));

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
      if (i.fotoPropria) p += 3;
      return p;
    };
    const comPontos = lista.map((i) => ({ i, p: pontos(i) }));
    comPontos.sort((a, b) => b.p - a.p || compararNome(a.i, b.i));
    return comPontos.map((x) => x.i.sku);
  }

  const ordenada = [...lista];
  if (f.sort === "nome-desc") ordenada.sort((a, b) => compararNome(b, a));
  else if (f.sort === "created-desc")
    ordenada.sort((a, b) => b.criado - a.criado || (a.sku < b.sku ? -1 : 1));
  else if (f.sort === "sku") ordenada.sort((a, b) => (a.sku < b.sku ? -1 : 1));
  // Ordem padrão: peças com foto própria primeiro, depois as com alguma foto, depois o resto
  else ordenada.sort((a, b) => fotoPeso(b) - fotoPeso(a) || compararNome(a, b));
  return ordenada.map((i) => i.sku);
}

// Pedido rápido: acha cada código digitado pelo cliente (SKU, código do fabricante ou de uma
// versão). Devolve, para cada código, o SKU da peça ou null.
export async function acharPorCodigos(
  codigos: string[],
): Promise<Array<{ codigo: string; sku: string | null }>> {
  const lista = await itens();
  const porCodigo = new Map<string, string>();
  for (const i of lista) {
    for (const c of i.codigos.split(" ")) if (c && !porCodigo.has(c)) porCodigo.set(c, i.sku);
  }
  return codigos.map((codigo) => ({ codigo, sku: porCodigo.get(soCodigo(codigo)) ?? null }));
}
