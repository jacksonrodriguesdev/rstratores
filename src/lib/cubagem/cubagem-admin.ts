import { createServerFn } from "@tanstack/react-start";
import type { FiltroCubagem } from "./cubagem.server";

// Funções do Admin → Cubagem/Logística. Toda a lógica pesada fica em cubagem.server.ts (import tardio).
const admin = async () => {
  const { assertAdmin } = await import("../auth.server");
  await assertAdmin();
};

export const coberturaCubagemFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  return (await import("./cubagem.server")).coberturaCubagem();
});

export const listarCubagemFn = createServerFn({ method: "GET" })
  .validator((d: FiltroCubagem) => d ?? {})
  .handler(async ({ data }) => {
    await admin();
    return (await import("./cubagem.server")).listarCubagemRef(data);
  });

export const familiasCubagemFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  return (await import("./cubagem.server")).familiasCubagem();
});

export const editarCubagemFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      catalogo: string;
      sku: string;
      ncm?: string | null;
      peso_kg?: number | null;
      comp_cm?: number | null;
      larg_cm?: number | null;
      alt_cm?: number | null;
      diam_cm?: number | null;
    }) => d,
  )
  .handler(async ({ data }) => {
    await admin();
    const { catalogo, sku, ...resto } = data;
    return (await import("./cubagem.server")).editarCubagem(catalogo, sku, resto);
  });

// Reclassifica tudo (popula cubagem_ref de novo). Pesado: ~123 mil itens.
export const reclassificarCubagemFn = createServerFn({ method: "POST" }).handler(async () => {
  await admin();
  return (await import("./cubagem.server")).popularCubagemRef();
});

// Recalcula as médias por NCM (base Pellegrino) e, em seguida, repopula.
export const recalcularMediasFn = createServerFn({ method: "POST" }).handler(async () => {
  await admin();
  const m = await import("./cubagem.server");
  const medias = await m.recalcularMediasNcm();
  const ref = await m.popularCubagemRef();
  return { medias, ref };
});

export const exportarCubagemFn = createServerFn({ method: "GET" })
  .validator((d: FiltroCubagem) => d ?? {})
  .handler(async ({ data }) => {
    await admin();
    const csv = await (await import("./cubagem.server")).exportarCubagemCsv(data);
    return { csv };
  });

// Tarifa da transportadora (frete por kg cubado) — ler e salvar no admin.
export const tarifaFreteAdminFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  return (await import("./cubagem.server")).tarifaFrete();
});

export const salvarTarifaFreteFn = createServerFn({ method: "POST" })
  .validator((d: { porKg?: number; taxaFixa?: number; minimo?: number; moeda?: string }) => d ?? {})
  .handler(async ({ data }) => {
    await admin();
    return (await import("./cubagem.server")).salvarTarifaFrete(data);
  });
