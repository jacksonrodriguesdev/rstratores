import { createServerFn } from "@tanstack/react-start";

// Admin → Instagram e Facebook → Estúdio: recomendações, horários, orçamento, busca e legendas.
const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  return assertAdmin();
};

export const estudioFn = createServerFn({ method: "GET" })
  .validator((d: { dias?: number }) => ({ dias: Math.min(90, Math.max(7, Number(d?.dias) || 30)) }))
  .handler(async ({ data }) => {
    await admin();
    const e = await import("./estudio.server");
    const [rec, horarios, orcamento] = await Promise.all([
      e.recomendacoes(data.dias, 24),
      e.melhoresHorarios(data.dias),
      e.sugestaoOrcamento(),
    ]);
    return {
      ...rec,
      horarios,
      orcamento,
      produtos: rec.produtos.map((p) => ({ ...p, legendas: e.legendas(p) })),
    };
  });

export const buscarPecasEstudioFn = createServerFn({ method: "GET" })
  .validator((d: { q?: string }) => ({ q: String(d?.q ?? "").slice(0, 80) }))
  .handler(async ({ data }) => {
    await admin();
    const e = await import("./estudio.server");
    const lista = await e.buscarPecas(data.q);
    return lista.map((p) => ({ ...p, legendas: e.legendas(p) }));
  });
