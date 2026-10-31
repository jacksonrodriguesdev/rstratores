import { createServerFn } from "@tanstack/react-start";
import type { Product } from "./products";

// Dados das páginas de entrada /repuestos/... (marca, categoria ou marca + categoria)
export type PaginaRepuestos = {
  total: number; // peças da vitrine com esse filtro
  produtos: Product[]; // primeira página (com foto), já no HTML para o Google
  facetas: Array<{ chave: string; total: number }>; // categorias da marca, ou marcas da categoria
};

export const getPaginaRepuestosFn = createServerFn({ method: "GET" })
  .validator((d: { marca?: string | null; categoria?: string | null; busca?: string | null }) => ({
    marca: d?.marca ? String(d.marca).slice(0, 60) : null,
    categoria: d?.categoria ? String(d.categoria).slice(0, 80) : null,
    // Tipo de máquina: as peças vêm da busca por este termo
    busca: d?.busca ? String(d.busca).slice(0, 60) : null,
  }))
  .handler(async ({ data }): Promise<PaginaRepuestos> => {
    // Guardado por 10 min: contagens e lista mudam pouco e eram recalculadas a cada visita
    const { emCache } = await import("./cache.server");
    return emCache(
      `repuestos|${data.marca}|${data.categoria}|${data.busca}`,
      10 * 60_000,
      async () => {
        const { buscarSkus } = await import("./busca-catalogo.server");
        const { listProducts } = await import("./products.server");
        const { MARCAS_SEO, CATEGORIAS_SEO } = await import("./seo-paginas");
        const filtro = {
          marca: data.marca ?? undefined,
          categoria: data.categoria ?? undefined,
          search: data.busca ?? undefined,
          vitrine: true,
        };
        const [todos, pagina] = await Promise.all([
          buscarSkus(filtro),
          listProducts({
            linha: "AGRICOLA",
            ...filtro,
            hasImage: true,
            sort: "nome-asc",
            pageSize: 24,
          }),
        ]);
        // Na página da marca: quantas peças em cada categoria (e vice-versa)
        let facetas: PaginaRepuestos["facetas"] = [];
        if (data.marca && !data.categoria) {
          facetas = await Promise.all(
            CATEGORIAS_SEO.map(async (c) => ({
              chave: c.categoria,
              total: (
                await buscarSkus({ marca: data.marca!, categoria: c.categoria, vitrine: true })
              ).length,
            })),
          );
        } else if (data.busca && !data.marca) {
          // Tipo de máquina: quantas peças de cada marca
          facetas = await Promise.all(
            MARCAS_SEO.map(async (m) => ({
              chave: m.marca,
              total: (await buscarSkus({ marca: m.marca, search: data.busca!, vitrine: true }))
                .length,
            })),
          );
        } else if (data.categoria && !data.marca) {
          facetas = await Promise.all(
            MARCAS_SEO.map(async (m) => ({
              chave: m.marca,
              total: (
                await buscarSkus({ marca: m.marca, categoria: data.categoria!, vitrine: true })
              ).length,
            })),
          );
        }
        return {
          total: todos.length,
          produtos: pagina.rows as Product[],
          facetas: facetas.filter((f) => f.total > 0).sort((a, b) => b.total - a.total),
        };
      },
    );
  });

// Páginas por local (/repuestos-agricolas/<local>): total do catálogo + peças da categoria em foco
export const getPaginaLocalFn = createServerFn({ method: "GET" })
  .validator((d: { foco?: string | null }) => ({
    foco: d?.foco ? String(d.foco).slice(0, 80) : null,
  }))
  .handler(async ({ data }): Promise<{ total: number; produtos: Product[] }> => {
    const { emCache } = await import("./cache.server");
    return emCache(`local|${data.foco}`, 10 * 60_000, async () => {
      const { buscarSkus } = await import("./busca-catalogo.server");
      const { listProducts } = await import("./products.server");
      const [todos, pagina] = await Promise.all([
        buscarSkus({ vitrine: true }),
        listProducts({
          linha: "AGRICOLA",
          vitrine: true,
          categoria: data.foco ?? undefined,
          hasImage: true,
          sort: "nome-asc",
          pageSize: 18,
        }),
      ]);
      return { total: todos.length, produtos: pagina.rows as Product[] };
    });
  });

// Página de um local (/pt/pecas-agricolas/<cidade>): o local, se for uma cidade gerada do IBGE,
// e os extras (números do IBGE, vizinhos, lista de municípios do estado). Dados ficam no servidor.
export const getLocalFn = createServerFn({ method: "GET" })
  .validator((d: { slug: string }) => ({ slug: String(d?.slug ?? "").slice(0, 80) }))
  .handler(async ({ data }) => {
    const { localPorSlug } = await import("./locais-seo");
    const { localGerado, extrasDoLocal } = await import("./municipios-sul.server");
    const local = localPorSlug(data.slug) ?? localGerado(data.slug);
    if (!local) return null;
    return { local, extras: extrasDoLocal(local) };
  });

// Cidades geradas do IBGE para a página "Peças agrícolas no Sul do Brasil" (/pt/pecas-agricolas)
export const getCidadesGeradasFn = createServerFn({ method: "GET" }).handler(async () => {
  const { locaisGerados } = await import("./municipios-sul.server");
  return locaisGerados().map((l) => ({ slug: l.slug, nome: l.nome, dentro: l.dentro ?? "" }));
});
