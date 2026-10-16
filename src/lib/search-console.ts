import { createServerFn } from "@tanstack/react-start";

// Admin → Posições no Google (Search Console). A lógica fica em search-console.server.ts.
const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  return assertAdmin();
};
const sc = () => import("./search-console.server");

export const estadoGscFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  return (await sc()).estadoGsc();
});

export const relatorioGscFn = createServerFn({ method: "GET" })
  .validator((d: { dias: number; pais: string }) => ({
    dias: [7, 28, 90].includes(Number(d?.dias)) ? Number(d.dias) : 28,
    pais: /^[a-z]{3}$/.test(String(d?.pais)) ? String(d.pais) : "*",
  }))
  .handler(async ({ data }) => {
    await admin();
    return (await sc()).relatorio(data);
  });

export const sincronizarGscFn = createServerFn({ method: "POST" }).handler(async () => {
  await admin();
  return (await sc()).sincronizar();
});

export const sitesGscFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  return (await sc()).listarSites();
});

export const escolherSiteGscFn = createServerFn({ method: "POST" })
  .validator((d: { site: string }) => ({ site: String(d?.site || "").slice(0, 300) }))
  .handler(async ({ data }) => {
    await admin();
    const s = await sc();
    await s.escolherSite(data.site);
    // Outra propriedade: recomeça o histórico
    const { prisma } = await import("./prisma");
    await s.garantirTabelasGsc();
    await prisma.gsc_dia.deleteMany({});
    await prisma.gsc_consulta.deleteMany({});
    await prisma.gsc_pagina.deleteMany({});
    s.sincronizar().catch((e) => console.error("Search Console:", e?.message ?? e));
    return { ok: true };
  });

export const desconectarGscFn = createServerFn({ method: "POST" }).handler(async () => {
  await admin();
  await (await sc()).desconectar();
  return { ok: true };
});
