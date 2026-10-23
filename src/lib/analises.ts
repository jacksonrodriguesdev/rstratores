import { createServerFn } from "@tanstack/react-start";

// Admin → Análises: uma função por ferramenta (cada aba carrega só o que mostra)
const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  return assertAdmin();
};
const diasOk = (d: unknown) => Math.min(365, Math.max(1, Number(d) || 30));

export const resumoFn = createServerFn({ method: "GET" })
  .validator((d: { dias: number }) => ({ dias: diasOk(d?.dias) }))
  .handler(async ({ data }) => {
    await admin();
    return (await import("./analises.server")).resumo(data.dias);
  });

export const calorFn = createServerFn({ method: "GET" })
  .validator((d: { dias: number }) => ({ dias: diasOk(d?.dias) }))
  .handler(async ({ data }) => {
    await admin();
    return (await import("./analises.server")).calor(data.dias);
  });

export const regioesFn = createServerFn({ method: "GET" })
  .validator((d: { dias: number }) => ({ dias: diasOk(d?.dias) }))
  .handler(async ({ data }) => {
    await admin();
    return (await import("./analises.server")).regioes(data.dias);
  });

export const produtosFn = createServerFn({ method: "GET" })
  .validator((d: { dias: number }) => ({ dias: diasOk(d?.dias) }))
  .handler(async ({ data }) => {
    await admin();
    return (await import("./analises.server")).produtos(data.dias);
  });

export const produtoRegiaoFn = createServerFn({ method: "GET" })
  .validator((d: { dias: number; sku?: string }) => ({
    dias: diasOk(d?.dias),
    sku: d?.sku ? String(d.sku).slice(0, 100) : undefined,
  }))
  .handler(async ({ data }) => {
    await admin();
    return (await import("./analises.server")).produtoRegiao(data.dias, data.sku);
  });

export const cliquesFn = createServerFn({ method: "GET" })
  .validator((d: { dias: number; pagina?: string }) => ({
    dias: diasOk(d?.dias),
    pagina: d?.pagina ? String(d.pagina).slice(0, 200) : undefined,
  }))
  .handler(async ({ data }) => {
    await admin();
    return (await import("./analises.server")).cliques(data.dias, data.pagina);
  });

export const rolagemFn = createServerFn({ method: "GET" })
  .validator((d: { dias: number }) => ({ dias: diasOk(d?.dias) }))
  .handler(async ({ data }) => {
    await admin();
    return (await import("./analises.server")).rolagem(data.dias);
  });

export const funilFn = createServerFn({ method: "GET" })
  .validator((d: { dias: number }) => ({ dias: diasOk(d?.dias) }))
  .handler(async ({ data }) => {
    await admin();
    return (await import("./analises.server")).funil(data.dias);
  });

export const canaisFn = createServerFn({ method: "GET" })
  .validator((d: { dias: number }) => ({ dias: diasOk(d?.dias) }))
  .handler(async ({ data }) => {
    await admin();
    return (await import("./analises.server")).canais(data.dias);
  });

export const tempoRealFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  return (await import("./analises.server")).tempoReal();
});

// Admin → Google: leads que vieram da busca orgânica (WhatsApp e cotações) por página de entrada
export const leadsOrganicosFn = createServerFn({ method: "GET" })
  .validator((d: { dias: number }) => ({ dias: diasOk(d?.dias) }))
  .handler(async ({ data }) => {
    await admin();
    return (await import("./leads-organicos.server")).leadsOrganicos(data.dias);
  });
