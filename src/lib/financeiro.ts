import { createServerFn } from "@tanstack/react-start";
import type { CustosVenda, DadosDespesa, Taxas } from "./financeiro.server";

// Admin → Financeiro: faturamento, custos e lucro com base nas vendas
const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  return assertAdmin();
};

export const relatorioFinanceiroFn = createServerFn({ method: "GET" })
  .validator((d: { mes?: string }) => ({ mes: String(d?.mes ?? "") }))
  .handler(async ({ data }) => {
    await admin();
    const f = await import("./financeiro.server");
    return f.relatorio(f.mesValido(data.mes) ? data.mes : f.mesAtual());
  });

export const salvarCustosVendaFn = createServerFn({ method: "POST" })
  .validator((d: CustosVenda) => d)
  .handler(async ({ data }) => {
    await admin();
    const f = await import("./financeiro.server");
    await f.salvarCustosVenda(data);
    return { ok: true };
  });

export const salvarDespesaFn = createServerFn({ method: "POST" })
  .validator((d: DadosDespesa) => d)
  .handler(async ({ data }) => {
    await admin();
    const f = await import("./financeiro.server");
    await f.salvarDespesa(data);
    return { ok: true };
  });

export const excluirDespesaFn = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: Number(d?.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const f = await import("./financeiro.server");
    await f.excluirDespesa(data.id);
    return { ok: true };
  });

export const salvarTaxasFn = createServerFn({ method: "POST" })
  .validator((d: Taxas) => d)
  .handler(async ({ data }) => {
    await admin();
    const f = await import("./financeiro.server");
    return f.salvarTaxas(data);
  });
