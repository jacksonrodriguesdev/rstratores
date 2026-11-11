import { createServerFn } from "@tanstack/react-start";
import type { Categoria, Produto } from "./catalogo.server";

// Catálogo de exportação: admin (categorias e produtos), despachante (classificação) e portal
const admin = async () => {
  const { assertAdmin } = await import("../auth.server");
  return assertAdmin();
};
const despachante = async () => {
  const { assertDespachante } = await import("../auth.server");
  return assertDespachante();
};

export const catalogoAdminFn = createServerFn({ method: "GET" })
  .validator((d: { q?: string; categoria?: number | null; pendencia?: string }) => ({
    q: String(d?.q ?? "").slice(0, 80),
    categoria: d?.categoria == null ? null : Number(d.categoria),
    pendencia: String(d?.pendencia ?? "").slice(0, 20),
  }))
  .handler(async ({ data }) => {
    await despachante();
    const c = await import("./catalogo.server");
    const [categorias, produtos] = await Promise.all([
      c.listarCategorias(),
      c.listarProdutos({ ...data, limite: 300 }),
    ]);
    return { categorias, produtos };
  });

export const salvarCategoriaFn = createServerFn({ method: "POST" })
  .validator((d: Partial<Categoria>) => d)
  .handler(async ({ data }) => {
    await admin();
    const c = await import("./catalogo.server");
    return c.salvarCategoria(data);
  });

export const apagarCategoriaFn = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: Number(d?.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const c = await import("./catalogo.server");
    return c.apagarCategoria(data.id);
  });

export const salvarProdutoFn = createServerFn({ method: "POST" })
  .validator((d: Partial<Produto>) => d)
  .handler(async ({ data }) => {
    await admin();
    const c = await import("./catalogo.server");
    return c.salvarProduto(data);
  });

export const apagarProdutoFn = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: Number(d?.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const c = await import("./catalogo.server");
    return c.apagarProduto(data.id);
  });

export const dadosDaLojaFn = createServerFn({ method: "GET" })
  .validator((d: { q: string }) => ({ q: String(d?.q ?? "").slice(0, 80) }))
  .handler(async ({ data }) => {
    await admin();
    const c = await import("./catalogo.server");
    return c.dadosDaLoja(data.q);
  });

// Despachante (ou admin): NCM, origem e prova de um produto de exportação
export const salvarClassificacaoFn = createServerFn({ method: "POST" })
  .validator((d: Partial<Produto> & { id: number }) => ({ ...d, id: Number(d?.id) || 0 }))
  .handler(async ({ data }) => {
    await despachante();
    const c = await import("./catalogo.server");
    const { id, ncm, origem_status, prova, prova_data, prova_ref, aec, pais_origem, fabricante } =
      data;
    return c.salvarClassificacao(id, {
      ncm,
      origem_status,
      prova,
      prova_data,
      prova_ref,
      aec,
      pais_origem,
      fabricante,
    });
  });

// Portal da empresa aprovada: catálogo com preço indicativo (desconto da empresa) se liberado
export const catalogoPortalFn = createServerFn({ method: "GET" })
  .validator((d: { q?: string; categoria?: number | null }) => ({
    q: String(d?.q ?? "").slice(0, 80),
    categoria: d?.categoria == null ? null : Number(d.categoria),
  }))
  .handler(async ({ data }) => {
    const { getSession } = await import("../auth.server");
    const s = await getSession();
    if (!s) throw new Error("Ingresá con tu cuenta para continuar.");
    const b = await import("../b2b.server");
    const e = await b.empresaAprovada(Number(s.id));
    const cfg = await b.configB2b();
    const c = await import("./catalogo.server");
    const r = await c.catalogoPortal(data);
    return {
      ...r,
      minimo: cfg.minimo,
      produtos: r.produtos.map(({ preco_usd, ...p }) => ({
        ...p,
        preco:
          cfg.instantaneo && preco_usd != null
            ? Math.round(preco_usd * (1 - e.desconto_pct / 100) * 100) / 100
            : null,
      })),
    };
  });
