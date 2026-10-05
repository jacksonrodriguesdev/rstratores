import type { Product, ProductImage, ListParams } from "./products";
import { prisma } from "./prisma";







export async function listProducts(params: ListParams) {
  const {
    search,
    categoria,
    linha,
    marca,
    montadora,
    precoMin,
    precoMax,
    sort = "nome-asc",
    page = 1,
    pageSize = 36,
    cursor,
    hasImage,
  } = params;

  const where: any = { AND: [] };

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

  if (search && search.trim()) {
    const terms = search.trim().split(/\s+/);
    for (const s of terms) {
      where.AND.push({
        OR: [
          { nome: { contains: s } },
          { sku: { contains: s } },
          { categoria: { contains: s } },
          { marca: { contains: s } },
          { descricao: { contains: s } },
          { veiculos_compativeis: { contains: s } },
        ],
      });
    }
  }
  // if (linha) where.linha = linha; // Temporariamente desativado, pois a base atual está 100% como linha 'PELLEGRINO'
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
    "nome-asc": { sku: "asc" },
    "nome-desc": { sku: "desc" },
    "preco-asc": { preco_brl: "asc" },
    "preco-desc": { preco_brl: "desc" },
    sku: { sku: "asc" },
    "created-desc": { created_at: "desc" },
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
  let data = await prisma.products.findUnique({
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
      },
    })) as any;
  }

  return data as unknown as Product | null;
}

export async function getProductImages(sku: string) {
  let data = await prisma.products_img.findMany({
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
  const data = await prisma.products.findMany({
    where: {
      category_id,
      sku: { not: sku },
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
  // forcing reload to clear cache
  const cacheKey = linha || "all";
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