import { createServerFn } from "@tanstack/react-start";
import type { DadosConfig } from "./fiscal.server";

// Admin → Fiscal: limite do MEI, DAS, imposto de renda e notas fiscais
const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  return assertAdmin();
};
const fiscal = () => import("./fiscal.server");

export const painelFiscalFn = createServerFn({ method: "GET" })
  .validator((d: { ano?: number }) => ({ ano: Number(d?.ano) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    return (await fiscal()).painel(data.ano || undefined);
  });

export const configFiscalFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  return (await fiscal()).configPublica();
});

export const salvarConfigFiscalFn = createServerFn({ method: "POST" })
  .validator((d: DadosConfig) => d)
  .handler(async ({ data }) => {
    await admin();
    return (await fiscal()).salvarConfig(data);
  });

export const marcarDasFn = createServerFn({ method: "POST" })
  .validator((d: { competencia: string; pago: boolean }) => ({
    competencia: String(d?.competencia ?? ""),
    pago: !!d?.pago,
  }))
  .handler(async ({ data }) => {
    await admin();
    await (await fiscal()).marcarDas(data.competencia, data.pago);
    return { ok: true };
  });

export const emitirNotaFn = createServerFn({ method: "POST" })
  .validator((d: { vendaId: number }) => ({ vendaId: Number(d?.vendaId) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const n = await (await fiscal()).emitirNota(data.vendaId);
    return { status: n.status, mensagem: n.mensagem, numero: n.numero };
  });

export const cancelarNotaFn = createServerFn({ method: "POST" })
  .validator((d: { id: number; justificativa: string }) => ({
    id: Number(d?.id) || 0,
    justificativa: String(d?.justificativa ?? ""),
  }))
  .handler(async ({ data }) => {
    await admin();
    const n = await (await fiscal()).cancelarNota(data.id, data.justificativa);
    return { status: n.status };
  });

export const relatorioMensalFn = createServerFn({ method: "GET" })
  .validator((d: { mes: string }) => ({ mes: String(d?.mes ?? "") }))
  .handler(async ({ data }) => {
    await admin();
    return (await fiscal()).relatorioMensal(data.mes);
  });
