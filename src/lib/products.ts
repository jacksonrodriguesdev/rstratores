import { supabase } from "@/integrations/supabase/client";

export type Product = {
  sku: string;
  nome: string;
  preco_brl: number | null;
  categoria: string | null;
  marca: string | null;
  estoque: number;
  peso: number | null;
  url: string | null;
  descricao: string | null;
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

const BUCKET = "product-images";

/**
 * Resolve an image reference to a displayable URL.
 * - If it's already an http(s) URL, return as-is.
 * - Otherwise treat as a storage path in the product-images bucket and
 *   generate a signed URL (1 hour).
 */
export async function resolveImageUrl(ref: string | null | undefined): Promise<string | null> {
  if (!ref) return null;
  if (ref.startsWith("http://") || ref.startsWith("https://")) return ref;
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(ref, 60 * 60);
  return data?.signedUrl ?? null;
}

/**
 * Batch-resolve many storage paths at once (public http URLs are passed through).
 * Returns a map keyed by input string.
 */
export async function resolveImageUrls(refs: (string | null | undefined)[]): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  const toSign: string[] = [];
  for (const r of refs) {
    if (!r) continue;
    if (r.startsWith("http")) map[r] = r;
    else toSign.push(r);
  }
  if (toSign.length > 0) {
    const { data } = await supabase.storage.from(BUCKET).createSignedUrls(toSign, 60 * 60);
    data?.forEach((d, i) => {
      if (d.signedUrl) map[toSign[i]] = d.signedUrl;
    });
  }
  return map;
}

export type ListParams = {
  search?: string;
  categoria?: string;
  marca?: string;
  precoMin?: number;
  precoMax?: number;
  sort?: "nome-asc" | "nome-desc" | "preco-asc" | "preco-desc" | "sku";
  page?: number;
  pageSize?: number;
};

export async function listProducts(params: ListParams) {
  const {
    search,
    categoria,
    marca,
    precoMin,
    precoMax,
    sort = "nome-asc",
    page = 1,
    pageSize = 36,
  } = params;

  let q = supabase.from("products").select("*", { count: "exact" });

  if (search && search.trim()) {
    const s = search.trim();
    q = q.or(`nome.ilike.%${s}%,sku.ilike.%${s}%`);
  }
  if (categoria) q = q.eq("categoria", categoria);
  if (marca) q = q.eq("marca", marca);
  if (typeof precoMin === "number") q = q.gte("preco_brl", precoMin);
  if (typeof precoMax === "number") q = q.lte("preco_brl", precoMax);

  const sortMap = {
    "nome-asc": ["nome", true] as const,
    "nome-desc": ["nome", false] as const,
    "preco-asc": ["preco_brl", true] as const,
    "preco-desc": ["preco_brl", false] as const,
    "sku": ["sku", true] as const,
  };
  const [col, asc] = sortMap[sort];
  q = q.order(col, { ascending: asc, nullsFirst: false });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  q = q.range(from, to);

  const { data, count, error } = await q;
  if (error) throw error;
  return { rows: (data ?? []) as Product[], total: count ?? 0 };
}

export async function getProduct(sku: string) {
  const { data, error } = await supabase.from("products").select("*").eq("sku", sku).maybeSingle();
  if (error) throw error;
  return data as Product | null;
}

export async function getProductImages(sku: string) {
  const { data, error } = await supabase
    .from("product_images")
    .select("*")
    .eq("sku", sku)
    .order("sort_order");
  if (error) throw error;
  return (data ?? []) as ProductImage[];
}

export async function getRelatedProducts(sku: string, categoria: string | null, limit = 4) {
  if (!categoria) return [];
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("categoria", categoria)
    .neq("sku", sku)
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as Product[];
}

export async function getFacets() {
  const { data: cats } = await supabase.from("products").select("categoria").not("categoria", "is", null);
  const { data: brands } = await supabase.from("products").select("marca").not("marca", "is", null);
  const categorias = Array.from(new Set((cats ?? []).map((c: { categoria: string | null }) => c.categoria).filter(Boolean) as string[])).sort();
  const marcas = Array.from(new Set((brands ?? []).map((b: { marca: string | null }) => b.marca).filter(Boolean) as string[])).sort();
  return { categorias, marcas };
}

export async function getStats() {
  const [{ count: totalProducts }, { data: sample }] = await Promise.all([
    supabase.from("products").select("*", { count: "exact", head: true }),
    supabase.from("products").select("categoria, marca, estoque, preco_brl, imagem_principal"),
  ]);
  const catCount = new Map<string, number>();
  const marcaCount = new Map<string, number>();
  let estoqueTotal = 0;
  let valorEstoque = 0;
  let comPreco = 0;
  let semPreco = 0;
  let semImagem = 0;
  let semEstoque = 0;
  const precos: number[] = [];
  (sample ?? []).forEach((r: { categoria: string | null; marca: string | null; estoque: number; preco_brl: number | null; imagem_principal: string | null }) => {
    if (r.categoria) catCount.set(r.categoria, (catCount.get(r.categoria) ?? 0) + 1);
    if (r.marca) marcaCount.set(r.marca, (marcaCount.get(r.marca) ?? 0) + 1);
    const est = r.estoque ?? 0;
    estoqueTotal += est;
    if (est === 0) semEstoque += 1;
    if (r.preco_brl != null) {
      comPreco += 1;
      precos.push(Number(r.preco_brl));
      valorEstoque += Number(r.preco_brl) * est;
    } else {
      semPreco += 1;
    }
    if (!r.imagem_principal) semImagem += 1;
  });
  const toArr = (m: Map<string, number>) =>
    Array.from(m, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

  // Faixas de preço
  const buckets = [
    { name: "0–50", min: 0, max: 50 },
    { name: "50–100", min: 50, max: 100 },
    { name: "100–250", min: 100, max: 250 },
    { name: "250–500", min: 250, max: 500 },
    { name: "500–1k", min: 500, max: 1000 },
    { name: "1k–2.5k", min: 1000, max: 2500 },
    { name: "2.5k+", min: 2500, max: Infinity },
  ].map((b) => ({ name: b.name, value: precos.filter((p) => p >= b.min && p < b.max).length }));

  const avgPreco = precos.length ? precos.reduce((a, b) => a + b, 0) / precos.length : 0;

  return {
    totalProducts: totalProducts ?? 0,
    totalCategorias: catCount.size,
    totalMarcas: marcaCount.size,
    estoqueTotal,
    valorEstoque,
    comPreco,
    semPreco,
    semImagem,
    semEstoque,
    avgPreco,
    porCategoria: toArr(catCount),
    porMarca: toArr(marcaCount).slice(0, 10),
    precoBuckets: buckets,
  };
}


export function formatBRL(v: number | null | undefined) {
  if (v == null) return "—";
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);
}
