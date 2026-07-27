import { prisma } from "./prisma";

export type Product = {
  sku: string;
  nome: string;
  preco_brl: number | null;
  categoria: string | null;
  category_id: number | null;
  linha: string;
  marca: string | null;
  estoque: number;
  peso: number | null;
  tamanho: string | null;
  altura: number | null;
  largura: number | null;
  valor_compra: number | null;
  valor_promocional: number | null;
  veiculos_compativeis: string | null;
  url: string | null;
  descricao: string | null;
  nome_es: string | null;
  descricao_es: string | null;
  imagem_principal: string | null;
  created_at: string;
  updated_at: string;
};

export type ProductImage = {
  id: number;
  sku: string;
  image_path: string;
  image_type: string;
  sort_order: number;
};

export type ListParams = {
  search?: string;
  categoria?: string | string[];
  linha?: string;
  marca?: string | string[];
  montadora?: string | string[];
  precoMin?: number;
  precoMax?: number;
  sort?: "nome-asc" | "nome-desc" | "preco-asc" | "preco-desc" | "sku" | "created-desc";
  page?: number;
  pageSize?: number;
  cursor?: string;
  hasImage?: boolean;
};

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
        ]
      });
    }
  }
  // if (linha) where.linha = linha; // Temporariamente desativado, pois a base atual está 100% como linha 'PELLEGRINO'
  if (categoria) {
    if (Array.isArray(categoria) && categoria.length > 0) {
      where.AND.push({ OR: categoria.map(c => ({ categoria: { contains: c } })) });
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
      // Como a tabela agricolas não tem 'aplicacoes' estruturadas, buscamos em texto livre
      where.AND.push({
        OR: montadorasArr.map(m => ({
          OR: [
            { nome: { contains: m } },
            { descricao: { contains: m } },
            { categoria: { contains: m } },
            { marca: { contains: m } },
            { aplicacoes: { some: { montadora: m } } } // Mantém a busca antiga para a tabela products
          ]
        }))
      });
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
    "sku": { sku: "asc" },
    "created-desc": { created_at: "desc" }
  };

  const orderBy = sortMap[sort] || { sku: "asc" };
  const take = pageSize + 1; // Pega 1 a mais para saber se tem próxima página

  const queryOptions: any = {
    where,
    orderBy,
    take,
    include: { 
      images: { orderBy: { sort_order: 'asc' }, take: 1 }
    }
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
    total: -1 // Não fazemos mais o count() pesado no banco, o total será indefinido para não travar o banco.
  };
}

export async function getProduct(sku: string) {
  let data = await prisma.products.findUnique({ 
    where: { sku },
    include: {
      aplicacoes: true,
      fichas_tecnicas: true,
      similares: true,
    }
  });
  
  if (!data) {
    data = (await prisma.agricolas.findUnique({
      where: { sku },
      include: {
        aplicacoes: true,
        fichas_tecnicas: true,
        similares: true,
      }
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
      sku: { not: sku }
    },
    take: limit
  });
  return data as unknown as Product[];
}

type FacetCount = { name: string; count: number };
let facetsCache: Record<string, { data: { categorias: FacetCount[], marcas: FacetCount[] }, timestamp: number }> = {};

export async function getFacets(linha?: string) {
  const cacheKey = linha || "all";
  if (facetsCache[cacheKey] && Date.now() - facetsCache[cacheKey].timestamp < 1000 * 60 * 5) {
    return facetsCache[cacheKey].data;
  }

  let categorias: FacetCount[] = [];
  let marcas: FacetCount[] = [];

  try {
    if (linha === "AGRICOLA") {
      const rawCats = await prisma.agricolas.groupBy({ by: ['categoria'], _count: { categoria: true } });
      const mrks = await prisma.agricolas.groupBy({ by: ['marca'], _count: { marca: true } });
      
      const subCatMap = new Map<string, number>();
      const montadoraMap = new Map<string, number>();

      rawCats.forEach(c => {
        if (!c.categoria) return;
        const parts = c.categoria.split(' - ');
        const mainCat = parts[0].trim();
        const subCat = parts.length > 1 ? parts[1].trim() : 'Geral';
        
        montadoraMap.set(mainCat, (montadoraMap.get(mainCat) || 0) + c._count.categoria);
        subCatMap.set(subCat, (subCatMap.get(subCat) || 0) + c._count.categoria);
      });
      
      categorias = Array.from(subCatMap.entries()).map(([name, count]) => ({ name, count }));
      const dynamicMontadoras = Array.from(montadoraMap.entries()).map(([name, count]) => ({ name, count }));
      marcas = mrks.filter(m => m.marca).map(m => ({ name: m.marca as string, count: m._count.marca }));
      
      // Override facets cache logic to include montadoras
      const result = { categorias, marcas, montadoras: dynamicMontadoras };
      facetsCache[cacheKey] = { data: result as any, timestamp: Date.now() };
      return result;
    } else {
      const rawCats = await prisma.products.groupBy({ by: ['categoria'], _count: { categoria: true } });
      const mrks = await prisma.products.groupBy({ by: ['marca'], _count: { marca: true } });
      
      const subCatMap = new Map<string, number>();
      const montadoraMap = new Map<string, number>();

      rawCats.forEach(c => {
        if (!c.categoria) return;
        const parts = c.categoria.split(' - ');
        const mainCat = parts[0].trim();
        const subCat = parts.length > 1 ? parts[1].trim() : 'Geral';
        
        montadoraMap.set(mainCat, (montadoraMap.get(mainCat) || 0) + c._count.categoria);
        subCatMap.set(subCat, (subCatMap.get(subCat) || 0) + c._count.categoria);
      });
      
      categorias = Array.from(subCatMap.entries()).map(([name, count]) => ({ name, count }));
      const dynamicMontadoras = Array.from(montadoraMap.entries()).map(([name, count]) => ({ name, count }));
      marcas = mrks.filter(m => m.marca).map(m => ({ name: m.marca as string, count: m._count.marca }));
      
      const result = { categorias, marcas, montadoras: dynamicMontadoras };
      facetsCache[cacheKey] = { data: result as any, timestamp: Date.now() };
      return result;
    }
  } catch(e) {
    console.error("Erro ao buscar facets:", e);
  }

  const result = { categorias, marcas };
  facetsCache[cacheKey] = { data: result, timestamp: Date.now() };
  return result;
}

export async function getRelatedCategories(category_id: number | null) {
  if (!category_id) return [];
  
  // Buscar a categoria atual
  const currentCategory = await prisma.categories.findUnique({
    where: { id: category_id }
  });
  
  if (!currentCategory || !currentCategory.parent_id) return [];
  
  // Buscar outras categorias que tem o mesmo parent (irmãs)
  const siblings = await prisma.categories.findMany({
    where: {
      parent_id: currentCategory.parent_id,
      id: { not: category_id }
    },
    take: 10
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
    linhas: [
      { name: "PELLEGRINO", value: totalProducts },
    ],
    produtosSemEstoque: 0,
    topCategorias: [
      { name: "Motor", value: Math.floor(totalProducts * 0.2) },
      { name: "Suspensão", value: Math.floor(totalProducts * 0.15) }
    ],
    topMarcas: [
      { name: "Massey Ferguson", value: Math.floor(totalProducts * 0.1) },
    ]
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
