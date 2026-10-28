import { createServerFn } from "@tanstack/react-start";
import type { DadosVenda, EnvioAvaliacao } from "./avaliacoes.server";

// Vendas (admin) e avaliações de produtos (página pública /avaliar/<codigo> e página da peça)
const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  return assertAdmin();
};

// ---------------------------------------------------------------- admin: vendas
export const listarVendasFn = createServerFn({ method: "GET" })
  .validator((d: { q?: string }) => ({ q: String(d?.q ?? "").slice(0, 80) }))
  .handler(async ({ data }) => {
    await admin();
    const a = await import("./avaliacoes.server");
    const [vendas, resumo] = await Promise.all([a.listarVendas(data.q), a.resumoAvaliacoes()]);
    return { vendas, resumo };
  });

export const vendaFn = createServerFn({ method: "GET" })
  .validator((d: { id: number }) => ({ id: Number(d?.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const a = await import("./avaliacoes.server");
    await a.garantirTabelasAvaliacoes();
    const v = await prisma.vendas.findUnique({ where: { id: data.id } });
    if (!v) throw new Error("Venda não encontrada");
    const { SITE_URL } = await import("./site");
    return { ...a.paraVenda(v), link: a.linkAvaliacao(SITE_URL, v.codigo, v.pais) };
  });

export const salvarVendaFn = createServerFn({ method: "POST" })
  .validator((d: DadosVenda & { id?: number }) => d)
  .handler(async ({ data }) => {
    await admin();
    const a = await import("./avaliacoes.server");
    const { id, ...resto } = data;
    return a.salvarVenda(resto as DadosVenda, id ? Number(id) : undefined);
  });

export const buscarClientesFn = createServerFn({ method: "GET" })
  .validator((d: { q?: string }) => ({ q: String(d?.q ?? "").slice(0, 80) }))
  .handler(async ({ data }) => {
    await admin();
    const a = await import("./avaliacoes.server");
    return a.buscarClientes(data.q);
  });

// Peças para a venda: nome, código e preço do dia (UYU e BRL)
export const buscarPecasVendaFn = createServerFn({ method: "GET" })
  .validator((d: { q?: string }) => ({ q: String(d?.q ?? "").slice(0, 80) }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const { configPrecos } = await import("./precos.server");
    const { precoVenda } = await import("./precos");
    const { nomeProduto } = await import("./pecas-es");
    const t = data.q.trim();
    if (t.length < 2) return [];
    const rows = await prisma.agricolas.findMany({
      where: {
        duplicado_de: null,
        OR: [
          { sku: { contains: t } },
          { nome: { contains: t } },
          { codigo_fabricante: { contains: t } },
        ],
      },
      orderBy: [{ estoque: "desc" }],
      take: 20,
    });
    const cfg = await configPrecos();
    return rows.map((r) => {
      const p = precoVenda(r as any, cfg);
      return {
        sku: r.sku.trim(),
        codigo: (r.codigo_fabricante || r.sku).trim(),
        nome: r.nome.trim(),
        nomeEs: nomeProduto(r as any),
        foto: r.imagem_principal,
        uyu: p?.uyu ?? null,
        brl: p?.brl ?? null,
        // Para editar no modal da venda (valores do cadastro, em R$)
        custo: r.valor_compra ?? null,
        precoBrl: r.preco_brl ?? null,
      };
    });
  });

// ---------------------------------------------------------------- admin: moderação
export const moderacaoFn = createServerFn({ method: "GET" })
  .validator((d: { status?: string }) => ({
    status: ["PENDENTE", "APROVADA", "REJEITADA", "TODAS"].includes(String(d?.status))
      ? String(d.status)
      : "PENDENTE",
  }))
  .handler(async ({ data }) => {
    await admin();
    const a = await import("./avaliacoes.server");
    return a.listarModeracao(data.status);
  });

export const moderarFn = createServerFn({ method: "POST" })
  .validator(
    (d: { id: number; status?: "APROVADA" | "REJEITADA" | "PENDENTE"; resposta?: string | null }) =>
      d,
  )
  .handler(async ({ data }) => {
    await admin();
    const a = await import("./avaliacoes.server");
    await a.moderar(Number(data.id), {
      status: ["APROVADA", "REJEITADA", "PENDENTE"].includes(String(data.status))
        ? data.status
        : undefined,
      resposta: data.resposta,
    });
    return { ok: true };
  });

// ---------------------------------------------------------------- público
export const paginaAvaliacaoFn = createServerFn({ method: "GET" })
  .validator((d: { codigo: string }) => ({
    codigo: String(d?.codigo ?? "")
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 24),
  }))
  .handler(async ({ data }) => {
    const a = await import("./avaliacoes.server");
    return a.paginaAvaliacao(data.codigo);
  });

export const enviarAvaliacoesFn = createServerFn({ method: "POST" })
  .validator((d: EnvioAvaliacao) => ({
    codigo: String(d?.codigo ?? "")
      .replace(/[^A-Za-z0-9]/g, "")
      .slice(0, 24),
    nome: String(d?.nome ?? "").slice(0, 120),
    cidade: d?.cidade ? String(d.cidade).slice(0, 120) : null,
    idioma: (d?.idioma === "pt" ? "pt" : "es") as "es" | "pt",
    avaliacoes: (Array.isArray(d?.avaliacoes) ? d.avaliacoes : []).slice(0, 50).map((x) => ({
      sku: String(x?.sku ?? "").slice(0, 64),
      nota: Number(x?.nota) || 0,
      comentario: x?.comentario ? String(x.comentario).slice(0, 2000) : null,
    })),
  }))
  .handler(async ({ data }) => {
    const a = await import("./avaliacoes.server");
    return a.enviarAvaliacoes(data);
  });

export const avaliacoesProdutoFn = createServerFn({ method: "GET" })
  .validator((d: { sku: string }) => ({ sku: String(d?.sku ?? "").slice(0, 64) }))
  .handler(async ({ data }) => {
    const a = await import("./avaliacoes.server");
    return a.avaliacoesProduto(data.sku);
  });

// ---------------------------------------------------------------- admin: etiqueta
export const etiquetaFn = createServerFn({ method: "GET" })
  .validator((d: { id: number }) => ({ id: Number(d?.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const a = await import("./avaliacoes.server");
    await a.garantirTabelasAvaliacoes();
    const v = await prisma.vendas.findUnique({ where: { id: data.id } });
    if (!v) throw new Error("Venda não encontrada");
    const { SITE_URL } = await import("./site");
    return {
      venda: a.paraVenda(v),
      link: a.linkAvaliacao(SITE_URL, v.codigo, v.pais),
      remetente: await a.lerRemetente(),
      desconto: a.DESCONTO_AVALIACAO,
    };
  });

export const remetenteFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const a = await import("./avaliacoes.server");
  return a.lerRemetente();
});

export const salvarRemetenteFn = createServerFn({ method: "POST" })
  .validator((d: import("./avaliacoes.server").Remetente) => d)
  .handler(async ({ data }) => {
    await admin();
    const a = await import("./avaliacoes.server");
    return a.salvarRemetente(data);
  });

export const salvarRastreioFn = createServerFn({ method: "POST" })
  .validator((d: { id: number; rastreio: string; transportadora?: string | null }) => d)
  .handler(async ({ data }) => {
    await admin();
    const a = await import("./avaliacoes.server");
    return a.salvarRastreio(Number(data.id), String(data.rastreio ?? ""), data.transportadora);
  });

// ---------------------------------------------------------------- admin: peças na nova venda
// Editar o preço de compra/venda da peça e cadastrar uma peça nova sem sair do modal
export const salvarPrecoPecaFn = createServerFn({ method: "POST" })
  .validator(
    (d: { sku: string; custo?: number | string | null; venda?: number | string | null }) => d,
  )
  .handler(async ({ data }) => {
    await admin();
    const p = await import("./pecas-venda.server");
    return p.salvarPrecoPeca(data);
  });

export const criarPecaRapidaFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      codigo: string;
      nome: string;
      custo?: number | string | null;
      venda?: number | string | null;
      marca?: string | null;
    }) => d,
  )
  .handler(async ({ data }) => {
    await admin();
    const p = await import("./pecas-venda.server");
    return p.criarPecaRapida(data);
  });
