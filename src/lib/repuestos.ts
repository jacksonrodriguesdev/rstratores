import { createServerFn } from "@tanstack/react-start";
import type { Product } from "./products";

// Dados das páginas de entrada /repuestos/... (marca, categoria ou marca + categoria)
export type PaginaRepuestos = {
  total: number; // peças da vitrine com esse filtro
  produtos: Product[]; // primeira página (com foto), já no HTML para o Google
  facetas: Array<{ chave: string; total: number }>; // categorias da marca, ou marcas da categoria
};

export const getPaginaRepuestosFn = createServerFn({ method: "GET" })
  .validator((d: { marca?: string | null; categoria?: string | null }) => ({
    marca: d?.marca ? String(d.marca).slice(0, 60) : null,
    categoria: d?.categoria ? String(d.categoria).slice(0, 80) : null,
  }))
  .handler(async ({ data }): Promise<PaginaRepuestos> => {
    const { buscarSkus } = await import("./busca-catalogo.server");
    const { listProducts } = await import("./products.server");
    const { MARCAS_SEO, CATEGORIAS_SEO } = await import("./seo-paginas");
    const filtro = { marca: data.marca ?? undefined, categoria: data.categoria ?? undefined, vitrine: true };
    const [todos, pagina] = await Promise.all([
      buscarSkus(filtro),
      listProducts({ linha: "AGRICOLA", ...filtro, hasImage: true, sort: "nome-asc", pageSize: 24 }),
    ]);
    // Na página da marca: quantas peças em cada categoria (e vice-versa)
    let facetas: PaginaRepuestos["facetas"] = [];
    if (data.marca && !data.categoria) {
      facetas = await Promise.all(CATEGORIAS_SEO.map(async (c) => ({ chave: c.categoria, total: (await buscarSkus({ marca: data.marca!, categoria: c.categoria, vitrine: true })).length })));
    } else if (data.categoria && !data.marca) {
      facetas = await Promise.all(MARCAS_SEO.map(async (m) => ({ chave: m.marca, total: (await buscarSkus({ marca: m.marca, categoria: data.categoria!, vitrine: true })).length })));
    }
    return { total: todos.length, produtos: pagina.rows as Product[], facetas: facetas.filter((f) => f.total > 0).sort((a, b) => b.total - a.total) };
  });
