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

import { createServerFn } from "@tanstack/react-start";


export async function resolveImageUrl(ref: string | null | undefined): Promise<string | null> {
  if (!ref) return null;
  if (ref.startsWith("http://") || ref.startsWith("https://")) return ref;
  if (ref.startsWith("/")) return ref;
  return `/uploads/${ref}`;
}

export async function resolveImageUrls(
  refs: (string | null | undefined)[],
): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  for (const r of refs) {
    if (!r) continue;
    if (r.startsWith("http://") || r.startsWith("https://") || r.startsWith("/")) {
      map[r] = r;
    } else {
      map[r] = `/uploads/${r}`;
    }
  }
  return map;
}

const listProductsFn = createServerFn({ method: "GET" })
  .validator((d: ListParams) => d)
  .handler(async ({ data }) => {
    const server = await import("./products.server");
    return server.listProducts(data);
  });

export async function listProducts(params: ListParams) {
  return listProductsFn({ data: params });
}

const getProductFn = createServerFn({ method: "GET" })
  .validator((sku: string) => sku)
  .handler(async ({ data }) => {
    const server = await import("./products.server");
    return server.getProduct(data);
  });

export async function getProduct(sku: string) {
  return getProductFn({ data: sku });
}

const getProductImagesFn = createServerFn({ method: "GET" })
  .validator((sku: string) => sku)
  .handler(async ({ data }) => {
    const server = await import("./products.server");
    return server.getProductImages(data);
  });

export async function getProductImages(sku: string) {
  return getProductImagesFn({ data: sku });
}

const getRelatedProductsFn = createServerFn({ method: "GET" })
  .validator((d: { sku: string; category_id: number | null; limit: number }) => d)
  .handler(async ({ data }) => {
    const server = await import("./products.server");
    return server.getRelatedProducts(data.sku, data.category_id, data.limit);
  });

export async function getRelatedProducts(sku: string, category_id: number | null, limit = 8) {
  return getRelatedProductsFn({ data: { sku, category_id, limit } });
}

const getRelatedCategoriesFn = createServerFn({ method: "GET" })
  .validator((category_id: number | null) => category_id)
  .handler(async ({ data }) => {
    const server = await import("./products.server");
    return server.getRelatedCategories(data);
  });

export async function getRelatedCategories(category_id: number | null) {
  return getRelatedCategoriesFn({ data: category_id });
}

const getFacetsFn = createServerFn({ method: "GET" })
  .validator((linha?: string) => linha)
  .handler(async ({ data }) => {
    const server = await import("./products.server");
    return server.getFacets(data);
  });

export async function getFacets(linha?: string) {
  return getFacetsFn({ data: linha });
}

const getStatsFn = createServerFn({ method: "GET" }).handler(async () => {
  const server = await import("./products.server");
  return server.getStats();
});

export async function getStats() {
  return getStatsFn();
}

const getPellegrinoStatsFn = createServerFn({ method: "GET" }).handler(async () => {
  const server = await import("./products.server");
  return server.getPellegrinoStats();
});

export async function getPellegrinoStats() {
  return getPellegrinoStatsFn();
}

export function formatBRL(v: number | null | undefined) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
