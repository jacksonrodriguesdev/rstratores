import { createServerFn } from "@tanstack/react-start";

// Painel Meta: Instagram (série diária real da API + engajamento dos posts) e Facebook, com filtro
// de período. KPIs, evolução por dia, top posts e demografia.
const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  return assertAdmin();
};

export const painelMetaFn = createServerFn({ method: "GET" })
  .validator((d: { dias?: number }) => ({ dias: Math.min(30, Math.max(7, Number(d?.dias) || 30)) }))
  .handler(async ({ data }) => {
    await admin();
    const ig = await import("./instagram.server");
    const fb = await import("./facebook.server");
    const [painel, demografia, facebook] = await Promise.all([
      ig.painelCompletoIg(data.dias).catch(() => null),
      ig.demografiaIg().catch(() => null),
      fb.desempenhoPagina(data.dias).catch(() => null),
    ]);
    return { conectado: !!painel, dias: data.dias, painel, demografia, facebook };
  });

// Força a atualização do retrato do dia (histórico de longo prazo).
export const atualizarPainelMetaFn = createServerFn({ method: "POST" }).handler(async () => {
  await admin();
  const ig = await import("./instagram.server");
  await ig.snapshotDiarioIg().catch(() => {});
  return { ok: true };
});
