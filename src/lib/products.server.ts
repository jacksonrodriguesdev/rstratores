import type { Product, ProductImage, ListParams } from "./products";
import { prisma } from "./prisma";
import { AUTOMOTIVA_ATIVA } from "./linhas";
import { buscaParaPortugues } from "./pecas-es";
import { limparCacheCatalogo } from "./busca-catalogo.server";







export async function listProducts(params: ListParams) {
  // Com a linha automotiva desligada, toda listagem vem da tabela agrícola.
  const linha = AUTOMOTIVA_ATIVA ? params.linha : "AGRICOLA";
  const {
    search,
    categoria,
    marca,
    montadora,
    precoMin,
    precoMax,
    sort = "nome-asc",
    page = 1,
    pageSize = 36,
    cursor,
    hasImage,
    vitrine,
  } = params;

  // Linha agrícola: filtra e ordena em memória (src/lib/busca-catalogo.server.ts) e só busca
  // no banco as peças da página. Preço não entra: o catálogo agrícola não tem preços.
  if (linha === "AGRICOLA" && precoMin == null && precoMax == null) {
    const { buscarSkus } = await import("./busca-catalogo.server");
    const skus = await buscarSkus({ search, categoria, marca, montadora, sort, hasImage, vitrine });
    let inicio = 0;
    if (cursor) {
      const i = skus.indexOf(cursor);
      inicio = i === -1 ? skus.length : i + 1;
    } else if (page > 1) {
      inicio = (page - 1) * pageSize;
    }
    const pagina = skus.slice(inicio, inicio + pageSize);
    const encontrados = pagina.length
      ? await prisma.agricolas.findMany({
          where: { sku: { in: pagina } },
          include: { images: { orderBy: { sort_order: "asc" }, take: 1 } },
        })
      : [];
    const porSku = new Map(encontrados.map((r) => [r.sku, r]));
    const rows = pagina.map((s) => porSku.get(s)).filter(Boolean);
    const hasNextPage = inicio + pageSize < skus.length;
    return {
      rows: rows as any,
      hasNextPage,
      nextCursor: rows.length ? (rows[rows.length - 1] as any).sku : undefined,
      total: skus.length,
    };
  }

  const where: any = { AND: [] };

  // Versões de uma peça (duplicado_de) aparecem só na página do produto principal.
  if (linha === "AGRICOLA") {
    where.AND.push({ duplicado_de: null });
  }

  if (hasImage) {
    where.AND.push({
      imagem_principal: { not: null },
    });
    where.AND.push({
      imagem_principal: { not: "" },
    });
    // Ignore placeholder "redeparts" image
    where.AND.push({
      imagem_principal: { not: { contains: "redeparts" } },
    });
  }

  if (vitrine) {
    where.AND.push({ category_id: { not: null } });
  }

  if (search && search.trim()) {
    const terms = search.trim().split(/\s+/);
    for (const termo of terms) {
      // O catálogo está em português: "rodamiento" também procura "ROLAMENTO".
      const pt = buscaParaPortugues(termo);
      const variantes = pt.toUpperCase() === termo.toUpperCase() ? [termo] : [termo, pt];
      where.AND.push({
        OR: variantes.flatMap((s) => [
          { nome: { contains: s } },
          { sku: { contains: s } },
          { codigo_fabricante: { contains: s } },
          // `fabricante` e as versões só existem na tabela agricolas
          ...(linha === "AGRICOLA"
            ? [
                { fabricante: { contains: s } },
                {
                  variantes: {
                    some: {
                      OR: [{ codigo_fabricante: { contains: s } }, { fabricante: { contains: s } }],
                    },
                  },
                },
              ]
            : []),
          { categoria: { contains: s } },
          { marca: { contains: s } },
          { descricao: { contains: s } },
          { veiculos_compativeis: { contains: s } },
        ]),
      });
    }
  }
  // A linha é separada por tabela (AGRICOLA → agricolas, demais → products), não pela coluna
  // `linha`: todos os registros de `products` estão com linha = 'PELLEGRINO'.
  if (categoria) {
    if (Array.isArray(categoria) && categoria.length > 0) {
      where.AND.push({ OR: categoria.map((c) => ({ categoria: { contains: c } })) });
    } else if (typeof categoria === "string") {
      where.AND.push({ categoria: { contains: categoria } });
    }
  }

  if (marca) {
    if (Array.isArray(marca) && marca.length > 0) {
      where.AND.push({ marca: { in: marca } });
    } else if (typeof marca === "string") {
      where.AND.push({ marca: marca });
    }
  }

  if (montadora) {
    const montadorasArr = Array.isArray(montadora) ? montadora : [montadora];
    if (montadorasArr.length > 0) {
      if (linha === "AGRICOLA") {
        where.AND.push({
          OR: montadorasArr.map((m) => ({
            OR: [
              { nome: { contains: m } },
              { descricao: { contains: m } },
              { categoria: { contains: m } },
              { marca: { contains: m } },
            ],
          })),
        });
      } else {
        where.AND.push({
          OR: montadorasArr.map((m) => ({
            OR: [
              { nome: { contains: m } },
              { descricao: { contains: m } },
              { categoria: { contains: m } },
              { marca: { contains: m } },
              { aplicacoes: { some: { montadora: m } } }, 
            ],
          })),
        });
      }
    }
  }
  if (typeof precoMin === "number") {
    where.AND.push({ preco_brl: { gte: precoMin } });
  }
  if (typeof precoMax === "number") {
    where.AND.push({ preco_brl: { lte: precoMax } });
  }

  if (where.AND.length === 0) {
    delete where.AND;
  }

  const sortMap: Record<string, any> = {
    "nome-asc": [{ nome: "asc" }, { sku: "asc" }],
    "nome-desc": [{ nome: "desc" }, { sku: "asc" }],
    "preco-asc": { preco_brl: "asc" },
    "preco-desc": { preco_brl: "desc" },
    sku: { sku: "asc" },
    "created-desc": [{ created_at: "desc" }, { sku: "asc" }],
  };

  const orderBy = sortMap[sort] || { sku: "asc" };
  const take = pageSize + 1; // Pega 1 a mais para saber se tem próxima página

  const queryOptions: any = {
    where,
    orderBy,
    take,
    include: {
      images: { orderBy: { sort_order: "asc" }, take: 1 },
    },
  };

  if (cursor) {
    queryOptions.cursor = { sku: cursor };
    queryOptions.skip = 1; // Pula o próprio cursor
  } else if (page > 1) {
    queryOptions.skip = (page - 1) * pageSize; // Fallback para paginação clássica
  }

  const tabela: any = linha === "AGRICOLA" ? prisma.agricolas : prisma.products;
  const [data, total] = await Promise.all([
    tabela.findMany(queryOptions) as Promise<Product[]>,
    params.contar ? (tabela.count({ where }) as Promise<number>) : Promise.resolve(-1),
  ]);

  const hasNextPage = data.length > pageSize;
  let nextCursor: string | undefined = undefined;

  if (hasNextPage) {
    data.pop(); // Remove o último item extra
  }

  if (data.length > 0) {
    nextCursor = data[data.length - 1].sku;
  }

  return {
    rows: data as any,
    hasNextPage,
    nextCursor,
    // Só conta quando pedido (admin): na loja o count() em cada rolagem pesaria no banco.
    total,
  };
}

export async function getProduct(sku: string) {
  // Linha automotiva desligada: produtos da tabela `products` não são exibidos.
  let data = !AUTOMOTIVA_ATIVA ? null : await prisma.products.findUnique({
    where: { sku },
    include: {
      aplicacoes: true,
      fichas_tecnicas: true,
      similares: true,
    },
  });

  if (!data) {
    data = (await prisma.agricolas.findUnique({
      where: { sku },
      include: {
        aplicacoes: true,
        fichas_tecnicas: true,
        similares: true,
        variantes: {
          select: { sku: true, codigo_fabricante: true, fabricante: true, nome: true },
          orderBy: { codigo_fabricante: "asc" },
        },
      },
    })) as any;
  }

  return data as unknown as Product | null;
}

export async function getProductImages(sku: string) {
  let data = !AUTOMOTIVA_ATIVA ? [] : await prisma.products_img.findMany({
    where: { sku },
    orderBy: { sort_order: "asc" },
  });

  if (!data || data.length === 0) {
    data = (await prisma.agricolas_img.findMany({
      where: { sku },
      orderBy: { sort_order: "asc" },
    })) as any;
  }

  return data as unknown as ProductImage[];
}

export async function getRelatedProducts(sku: string, category_id: number | null, limit = 8) {
  if (!category_id) return [];
  const table: any = AUTOMOTIVA_ATIVA ? prisma.products : prisma.agricolas;
  const data = await table.findMany({
    where: {
      category_id,
      sku: { not: sku },
      ...(AUTOMOTIVA_ATIVA ? {} : { duplicado_de: null }),
    },
    take: limit,
  });
  return data as unknown as Product[];
}

import fs from "fs";
import path from "path";

type FacetCount = { name: string; count: number };
let facetsCache: Record<
  string,
  {
    data: { categorias: FacetCount[]; marcas: FacetCount[]; montadoras?: FacetCount[] };
    timestamp: number;
  }
> = {};

// Chamado quando categorias mudam no admin, para a loja refletir na hora.
// Limpa os caches da loja (filtros e índice de busca) depois de mudanças no catálogo
export function limparCacheFacets() {
  facetsCache = {};
  limparCacheCatalogo();
}

export async function getFacets(linha?: string) {
  const cacheKey = (AUTOMOTIVA_ATIVA ? linha : "AGRICOLA") || "all";
  if (facetsCache[cacheKey] && Date.now() - facetsCache[cacheKey].timestamp < 1000 * 60 * 5) {
    return facetsCache[cacheKey].data;
  }

  // Linha agrícola: contagens vindas do banco (antes, de um facets.json gerado à mão, que
  // ficava desatualizado ao criar/renomear/excluir categorias no admin). Mesmo critério da
  // vitrine da loja: só peças principais e com categoria.
  if (cacheKey === "AGRICOLA") {
    const where = { duplicado_de: null, category_id: { not: null } };
    const [cats, marcas] = await Promise.all([
      prisma.agricolas.groupBy({ by: ["categoria"], where, _count: { _all: true } }),
      prisma.agricolas.groupBy({ by: ["marca"], where: { ...where, marca: { not: null } }, _count: { _all: true } }),
    ]);
    const lista = (rows: any[], campo: string) =>
      rows
        .filter((r) => r[campo])
        .map((r) => ({ name: r[campo] as string, count: r._count._all as number }))
        .sort((a, b) => b.count - a.count);
    const data = {
      categorias: lista(cats, "categoria"),
      marcas: lista(marcas, "marca"),
      montadoras: lista(marcas, "marca"),
    };
    facetsCache[cacheKey] = { data, timestamp: Date.now() };
    return data;
  }

  try {
    const facetsPath = path.resolve(process.cwd(), "facets.json");
    if (fs.existsSync(facetsPath)) {
      const fileData = JSON.parse(fs.readFileSync(facetsPath, "utf-8"));
      if (fileData[cacheKey]) {
        facetsCache[cacheKey] = { data: fileData[cacheKey], timestamp: Date.now() };
        return fileData[cacheKey];
      }
    }
  } catch (e) {
    console.error("Erro lendo facets.json", e);
  }

  // Fallback rápido para não travar o servidor
  const result = { categorias: [], marcas: [], montadoras: [] };
  facetsCache[cacheKey] = { data: result, timestamp: Date.now() };
  return result;
}

export async function getRelatedCategories(category_id: number | null) {
  if (!category_id) return [];

  // Buscar a categoria atual
  const currentCategory = await prisma.categories.findUnique({
    where: { id: category_id },
  });

  if (!currentCategory || !currentCategory.parent_id) return [];

  // Buscar outras categorias que tem o mesmo parent (irmãs)
  const siblings = await prisma.categories.findMany({
    where: {
      parent_id: currentCategory.parent_id,
      id: { not: category_id },
    },
    take: 10,
  });

  return siblings;
}

// Números do Dashboard do admin, da linha agrícola (antes contava a tabela automotiva
// e devolvia valores fixos: "200 categorias", estoque = produtos × 10...).
export async function getStats() {
  const visiveis = { duplicado_de: null };
  const semFoto = {
    OR: [
      { imagem_principal: null },
      { imagem_principal: "" },
      { imagem_principal: { contains: "redeparts" } },
    ],
  };
  const [pecas, semFotoN, semCategoria, marcasConfirmadas, categorias, cotacoesNovas, bannersAtivos] =
    await Promise.all([
      prisma.agricolas.count({ where: visiveis }),
      prisma.agricolas.count({ where: { ...visiveis, ...semFoto } }),
      prisma.agricolas.count({ where: { ...visiveis, category_id: null } }),
      prisma.agricolas.count({ where: { ...visiveis, marca_confirmada: true, marca: { not: null } } }),
      prisma.categories.count({ where: { linha: "AGRICOLA", agricolas: { some: {} } } }),
      prisma.quotes.count({ where: { status: "NOVA" } }),
      prisma.site_banners.count({ where: { active: true, linha: "AGRICOLA" } }),
    ]);
  return {
    pecas,
    comFoto: pecas - semFotoN,
    semCategoria,
    marcasConfirmadas,
    categorias,
    cotacoesNovas,
    bannersAtivos,
  };
}

export async function getPellegrinoStats() {
  const [totalProducts, totalImages] = await Promise.all([
    prisma.products.count({ where: { linha: "PELLEGRINO" } }),
    prisma.products_img.count({ where: { product: { linha: "PELLEGRINO" } } }),
  ]);
  return { totalProducts, totalImages };
}

export function formatBRL(v: number | null | undefined) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}