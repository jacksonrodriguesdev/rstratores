import { createServerFn } from "@tanstack/react-start";

// Painel Meta (Instagram): KPIs da conta, evolução diária, top posts e demografia.
const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  return assertAdmin();
};

export const painelMetaFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const ig = await import("./instagram.server");
  const [desempenho, serie, demografia] = await Promise.all([
    ig.desempenhoInstagram(28).catch(() => null),
    ig.serieIg(30).catch(() => []),
    ig.demografiaIg().catch(() => null),
  ]);
  return { conectado: !!desempenho, desempenho, serie, demografia };
});

// Força a atualização do retrato do dia (botão "Atualizar agora").
export const atualizarPainelMetaFn = createServerFn({ method: "POST" }).handler(async () => {
  await admin();
  const ig = await import("./instagram.server");
  await ig.snapshotDiarioIg().catch(() => {});
  return { ok: true };
});
