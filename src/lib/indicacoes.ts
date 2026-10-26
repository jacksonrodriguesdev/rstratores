import { createServerFn } from "@tanstack/react-start";
import type { ConfigIndicacao } from "./indicacoes.server";

// Indique um amigo: área do cliente, link aberto pelo amigo e painel do admin
export const minhaIndicacaoFn = createServerFn({ method: "GET" })
  .validator((d: { idioma?: string }) => ({ idioma: d?.idioma === "pt" ? "pt" : "es" }) as const)
  .handler(async ({ data }) => {
    const { getSession } = await import("./auth.server");
    const s = await getSession();
    if (!s) return null;
    const { SITE_URL } = await import("./site");
    const i = await import("./indicacoes.server");
    return i.minhaIndicacao(s.id, SITE_URL, data.idioma);
  });

export const abrirIndicacaoFn = createServerFn({ method: "POST" })
  .validator((d: { codigo: string }) => ({ codigo: String(d?.codigo ?? "").slice(0, 40) }))
  .handler(async ({ data }) => {
    const i = await import("./indicacoes.server");
    return i.abrirIndicacao(data.codigo);
  });

const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  return assertAdmin();
};

export const painelIndicacoesFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const i = await import("./indicacoes.server");
  return i.painelIndicacoes();
});

export const salvarConfigIndicacaoFn = createServerFn({ method: "POST" })
  .validator((d: ConfigIndicacao) => d)
  .handler(async ({ data }) => {
    await admin();
    const i = await import("./indicacoes.server");
    return i.salvarConfigIndicacao(data);
  });
