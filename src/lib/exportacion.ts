import { createServerFn } from "@tanstack/react-start";
import type { Product } from "./products";

// Dados da página de exportação por máquina: total de peças da linha/filtro + 1ª página com foto
// (já no HTML, para o Google). Reaproveita a busca/listagem do catálogo (3 linhas).
export type PaginaExport = { total: number; produtos: Product[] };

export const getPaginaExportFn = createServerFn({ method: "GET" })
  .validator((d: { maquina: string }) => ({ maquina: String(d?.maquina ?? "").slice(0, 40) }))
  .handler(async ({ data }): Promise<PaginaExport> => {
    const { emCache } = await import("./cache.server");
    return emCache(`export|${data.maquina}`, 10 * 60_000, async () => {
      const { maquinaPorSlug } = await import("./seo-exportacion");
      const m = maquinaPorSlug(data.maquina);
      if (!m) return { total: 0, produtos: [] };
      const { buscarSkus } = await import("./busca-catalogo.server");
      const { listProducts } = await import("./products.server");
      const filtro = {
        categoria: m.categoria ?? undefined,
        search: m.busca ?? undefined,
        hasImage: true,
        vitrine: true,
      };
      const [todos, pagina] = await Promise.all([
        buscarSkus(filtro, m.linha).catch(() => []),
        listProducts({ linha: m.linha, ...filtro, sort: "nome-asc", pageSize: 18 }).catch(() => ({
          rows: [] as Product[],
        })),
      ]);
      return { total: todos.length, produtos: pagina.rows as Product[] };
    });
  });

// Dados da página por TIPO de peça (pilar): total + 1ª página com foto.
export const getPaginaTipoFn = createServerFn({ method: "GET" })
  .validator((d: { tipo: string }) => ({ tipo: String(d?.tipo ?? "").slice(0, 40) }))
  .handler(async ({ data }): Promise<PaginaExport> => {
    const { emCache } = await import("./cache.server");
    return emCache(`export-tipo|${data.tipo}`, 10 * 60_000, async () => {
      const { tipoPorSlug } = await import("./seo-exportacion");
      const t = tipoPorSlug(data.tipo);
      if (!t) return { total: 0, produtos: [] };
      const { buscarSkus } = await import("./busca-catalogo.server");
      const { listProducts } = await import("./products.server");
      const linha = t.linha ?? "AGRICOLA";
      const filtro = {
        categoria: t.categoria ?? undefined,
        search: t.busca ?? undefined,
        hasImage: true,
        vitrine: true,
      };
      const [todos, pagina] = await Promise.all([
        buscarSkus(filtro, linha).catch(() => []),
        listProducts({ linha, ...filtro, sort: "nome-asc", pageSize: 18 }).catch(() => ({
          rows: [] as Product[],
        })),
      ]);
      return { total: todos.length, produtos: pagina.rows as Product[] };
    });
  });

// Produtos em destaque (com foto) para a vitrine da landing /exportacion: mistura das linhas.
export const destaquesExportFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<Product[]> => {
    const { emCache } = await import("./cache.server");
    return emCache("export|destaques", 15 * 60_000, async () => {
      const { listProducts } = await import("./products.server");
      // Só linha agrícola: fotos próprias do catálogo (sem marca d'água de terceiros).
      const r = await listProducts({
        linha: "AGRICOLA",
        hasImage: true,
        vitrine: true,
        sort: "nome-asc",
        pageSize: 24,
      }).catch(() => ({ rows: [] as Product[] }));
      const rows = r.rows as Product[];
      // Prioriza as fotos próprias (/catalogo/), que são as mais limpas e rápidas.
      const proprias = rows.filter((p) => String(p.imagem_principal ?? "").includes("/catalogo/"));
      const resto = rows.filter((p) => !String(p.imagem_principal ?? "").includes("/catalogo/"));
      return [...proprias, ...resto].slice(0, 12);
    });
  },
);

// Total de peças exportáveis (agrícola + caminhões + diesel) para o hub /exportacion.
export const totalExportFn = createServerFn({ method: "GET" }).handler(
  async (): Promise<number> => {
    const { emCache } = await import("./cache.server");
    return emCache("export|total", 30 * 60_000, async () => {
      const { buscarSkus } = await import("./busca-catalogo.server");
      const linhas: Array<"AGRICOLA" | "CAMINHOES" | "DIESEL"> = [
        "AGRICOLA",
        "CAMINHOES",
        "DIESEL",
      ];
      const contagens = await Promise.all(
        linhas.map((l) =>
          buscarSkus({ vitrine: true }, l)
            .then((s) => s.length)
            .catch(() => 0),
        ),
      );
      return contagens.reduce((a, b) => a + b, 0);
    });
  },
);
