import { createServerFn } from "@tanstack/react-start";
import type { FiltroVitrine } from "./vitrine.server";

// Vitrine de importação: catálogo liberado para a empresa logada (a página /empresas controla a aprovação).
const exigirSessao = async () => {
  const { getSession } = await import("../auth.server");
  const s = await getSession();
  if (!s) throw new Error("Ingresá con tu cuenta para ver el catálogo.");
  return s;
};

export const facetsExportacaoFn = createServerFn({ method: "GET" }).handler(async () => {
  await exigirSessao();
  return (await import("./vitrine.server")).facetsExportacao();
});

export const vitrineExportacaoFn = createServerFn({ method: "GET" })
  .validator((d: FiltroVitrine) => d ?? {})
  .handler(async ({ data }) => {
    await exigirSessao();
    return (await import("./vitrine.server")).vitrineExportacao(data);
  });

// Pública (landing /empresas): carrosséis de produtos com foto, sem preço.
export const destaquesPublicosFn = createServerFn({ method: "GET" }).handler(async () => {
  return (await import("./vitrine.server")).destaquesPublicos();
});

export const produtoExportacaoFn = createServerFn({ method: "GET" })
  .validator((d: { sku: string; linha: string }) => ({
    sku: String(d?.sku ?? "").slice(0, 191),
    linha: String(d?.linha ?? "AGRICOLA"),
  }))
  .handler(async ({ data }) => {
    await exigirSessao();
    const { produtoExportacao } = await import("./vitrine.server");
    return produtoExportacao(data.sku, data.linha as any);
  });
