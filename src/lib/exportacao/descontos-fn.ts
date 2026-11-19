import { createServerFn } from "@tanstack/react-start";
import type { FaixaDesconto } from "./descontos";

const admin = async () => {
  const { assertAdmin } = await import("../auth.server");
  await assertAdmin();
};
const sessao = async () => {
  const { getSession } = await import("../auth.server");
  const s = await getSession();
  if (!s) throw new Error("Ingresá con tu cuenta.");
};

// ---- Admin (painel de descontos) ----
export const configDescontosAdminFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  return (await import("./descontos.server")).lerConfigDescontos();
});

export const salvarGeralDescontosFn = createServerFn({ method: "POST" })
  .validator((d: { ativo?: boolean; base?: string }) => d ?? {})
  .handler(async ({ data }) => {
    await admin();
    return (await import("./descontos.server")).salvarGeralDescontos(data);
  });

export const salvarFaixasFn = createServerFn({ method: "POST" })
  .validator((d: { faixas: FaixaDesconto[] }) => ({ faixas: d?.faixas ?? [] }))
  .handler(async ({ data }) => {
    await admin();
    return (await import("./descontos.server")).salvarFaixas(data.faixas);
  });

export const adicionarRegraFn = createServerFn({ method: "POST" })
  .validator((d: { tipo: string; alvo: string; pct: number }) => d)
  .handler(async ({ data }) => {
    await admin();
    return (await import("./descontos.server")).adicionarRegra(data);
  });

export const apagarRegraFn = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: Number(d?.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    return (await import("./descontos.server")).apagarRegra(data.id);
  });

// ---- Portal (empresa logada): lê a config para aplicar no catálogo/cotação ----
export const configDescontosPortalFn = createServerFn({ method: "GET" }).handler(async () => {
  await sessao();
  return (await import("./descontos.server")).lerConfigDescontos();
});
