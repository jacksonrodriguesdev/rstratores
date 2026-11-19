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
