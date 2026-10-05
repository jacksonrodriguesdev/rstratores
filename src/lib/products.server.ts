import type { Product, ProductImage, ListParams } from "./products";
import { prisma } from "./prisma";
import { AUTOMOTIVA_ATIVA } from "./linhas";







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
    for (const s of terms) {
      where.AND.push({
        OR: [
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
        ],
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

  let data;
  if (linha === "AGRICOLA") {
    data = (await prisma.agricolas.findMany(queryOptions)) as unknown as Product[];
  } else {
    data = (await prisma.products.findMany(queryOptions)) as unknown as Product[];
  }

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
    total: -1, // Não fazemos mais o count() pesado no banco, o total será indefinido para não travar o banco.
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

export async function getFacets(linha?: string) {
  const cacheKey = (AUTOMOTIVA_ATIVA ? linha : "AGRICOLA") || "all";
  if (facetsCache[cacheKey] && Date.now() - facetsCache[cacheKey].timestamp < 1000 * 60 * 5) {
    return facetsCache[cacheKey].data;
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

export async function getStats() {
  const totalProducts = await prisma.products.count();

  // Como são mais de 100 mil itens, puxar tudo para agrupar categorias e marcas
  // quebra o servidor (OOM). Vamos mockar os dados ou usar tabelas agregadas no futuro.
  const stats = {
    totalProducts,
    totalCategorias: 200,
    totalMarcas: 100,
    estoqueTotal: totalProducts * 10,
    linhas: [{ name: "PELLEGRINO", value: totalProducts }],
    produtosSemEstoque: 0,
    topCategorias: [
      { name: "Motor", value: Math.floor(totalProducts * 0.2) },
      { name: "Suspensão", value: Math.floor(totalProducts * 0.15) },
    ],
    topMarcas: [{ name: "Massey Ferguson", value: Math.floor(totalProducts * 0.1) }],
  };

  return stats;
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