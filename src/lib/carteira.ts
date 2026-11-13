import { createServerFn } from "@tanstack/react-start";
import type { ConfigCarteira } from "./carteira.server";

// Carteira interna: saldo/extrato do cliente, config e painel do admin.

// ---------- Cliente logado ----------
export const minhaCarteiraFn = createServerFn({ method: "POST" }).handler(async () => {
  const { getSession } = await import("./auth.server");
  const s = await getSession();
  if (!s || s.role === "ADMIN") return null;
  const { configCarteira, extratoCarteira } = await import("./carteira.server");
  const cfg = await configCarteira();
  if (!cfg.ativo) return { ativo: false, saldo: 0, movimentos: [], config: cfg };
  const ext = await extratoCarteira(s.id);
  return {
    ativo: true,
    saldo: ext.saldo,
    config: cfg,
    movimentos: ext.movimentos.map((m) => ({
      id: m.id,
      tipo: m.tipo,
      valor: m.valor,
      motivo: m.motivo,
      descricao: m.descricao,
      expira_em: m.expira_em?.toISOString() ?? null,
      created_at: m.created_at.toISOString(),
    })),
  };
});

// ---------- Admin ----------
const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  return assertAdmin();
};

export const painelCarteiraFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const { configCarteira, resumoCarteira } = await import("./carteira.server");
  return { config: await configCarteira(), resumo: await resumoCarteira() };
});

export const salvarCarteiraFn = createServerFn({ method: "POST" })
  .validator((d: ConfigCarteira) => d)
  .handler(async ({ data }) => {
    await admin();
    const { salvarConfigCarteira } = await import("./carteira.server");
    await salvarConfigCarteira(data);
    return { ok: true };
  });

// Quanto da carteira do cliente pode entrar como desconto numa venda de "total" pesos.
export const creditoDaVendaFn = createServerFn({ method: "POST" })
  .validator((d: { userId?: number; total?: number }) => ({
    userId: Number(d?.userId) || 0,
    total: Math.max(0, Number(d?.total) || 0),
  }))
  .handler(async ({ data }) => {
    await admin();
    if (!data.userId) return { disponivel: 0, aplicavel: 0, motivo: "sem_cliente" };
    const { creditoAplicavel } = await import("./carteira.server");
    return creditoAplicavel(data.userId, data.total);
  });

// Extrato de um cliente (visão do admin).
export const carteiraClienteFn = createServerFn({ method: "POST" })
  .validator((d: { userId?: number }) => ({ userId: Number(d?.userId) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    if (!data.userId) return { saldo: 0, movimentos: [] };
    const { extratoCarteira } = await import("./carteira.server");
    const ext = await extratoCarteira(data.userId);
    return {
      saldo: ext.saldo,
      movimentos: ext.movimentos.map((m) => ({
        id: m.id,
        tipo: m.tipo,
        valor: m.valor,
        motivo: m.motivo,
        descricao: m.descricao,
        ref: m.ref,
        expira_em: m.expira_em?.toISOString() ?? null,
        created_at: m.created_at.toISOString(),
      })),
    };
  });

// Lançamento manual de crédito/ajuste pelo admin (ex.: cortesia, indicação).
export const lancarCreditoFn = createServerFn({ method: "POST" })
  .validator((d: { userId?: number; valor?: number; motivo?: string; descricao?: string }) => ({
    userId: Number(d?.userId) || 0,
    valor: Math.round(Number(d?.valor) || 0),
    motivo: String(d?.motivo ?? "AJUSTE")
      .toUpperCase()
      .slice(0, 16),
    descricao: String(d?.descricao ?? "")
      .trim()
      .slice(0, 200),
  }))
  .handler(async ({ data }) => {
    const s = await admin();
    if (!data.userId || data.valor <= 0) throw new Error("Cliente e valor são obrigatórios.");
    const { creditar } = await import("./carteira.server");
    const r = await creditar({
      userId: data.userId,
      valor: data.valor,
      motivo: data.motivo || "AJUSTE",
      descricao: data.descricao || "Crédito manual",
      criadoPor: s.id,
    });
    if (!r.ok)
      throw new Error(
        r.motivo === "orcamento" ? "Estourou o orçamento do mês." : "Não foi possível creditar.",
      );
    return { ok: true };
  });
