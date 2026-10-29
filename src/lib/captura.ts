// Admin → Captação de visitantes: avisos de preço (página da peça) e visitantes quentes
import { createServerFn } from "@tanstack/react-start";

const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  return assertAdmin();
};

export const avisosPrecoFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const { listarAvisos } = await import("./aviso-preco.server");
  return listarAvisos();
});

export const marcarAvisoFn = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: Number(d?.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const { marcarAvisoWhatsapp } = await import("./aviso-preco.server");
    await marcarAvisoWhatsapp(data.id);
    return { ok: true };
  });

export const visitantesQuentesFn = createServerFn({ method: "GET" })
  .validator((d: { dias?: number; minimo?: number; pais?: string }) => ({
    dias: [7, 14, 30, 60].includes(Number(d?.dias)) ? Number(d.dias) : 30,
    minimo: Math.min(10, Math.max(2, Number(d?.minimo) || 3)),
    pais: d?.pais === "BR" ? "BR" : d?.pais === "" ? "" : "UY",
  }))
  .handler(async ({ data }) => {
    await admin();
    const { visitantesQuentes } = await import("./visitantes-quentes.server");
    return visitantesQuentes(data.dias, data.minimo, data.pais);
  });

// Balão de ajuda da página da peça e pop-up: vistos, cliques e WhatsApps deixados (30 dias)
export const resumoCapturaFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const { prisma } = await import("./prisma");
  const { eventosProntos } = await import("./eventos-db.server");
  await eventosProntos();
  const eventos = await prisma.site_eventos.groupBy({
    by: ["dado"],
    where: { tipo: "popup", created_at: { gte: new Date(Date.now() - 30 * 86400_000) } },
    _count: true,
  });
  const n = (p: string) =>
    eventos.filter((e) => e.dado.startsWith(p)).reduce((t, e) => t + e._count, 0);
  return {
    ajudaVista: n("ajuda:vista"),
    ajudaClique: n("ajuda:clique"),
    ajudaModelo: n("ajuda:clique_modelo"),
    ajudaFechada: n("ajuda:fechada"),
    popupVisto: n("visto"),
    popupWhatsapp: n("whatsapp"),
  };
});
