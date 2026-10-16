import { createFileRoute } from "@tanstack/react-router";

// Números do Dashboard do admin. Vêm dos resumos diários (src/lib/resumo-diario.server.ts), os
// mesmos de Visitantes e Análises: dia no horário do Uruguai, sem robôs e sem limite de linhas.
//   visitantes = pessoas (aparelhos) diferentes · visitas = sessões (30 min sem navegar = nova)
//   páginas = páginas vistas
export const Route = createFileRoute("/api/public/analytics")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { requireAdmin } = await import("@/lib/auth.server");
        const denied = await requireAdmin(request);
        if (denied) return denied;
        try {
          const rd = await import("@/lib/resumo-diario.server");
          const { prisma } = await import("@/lib/prisma");
          const { whereHumano } = await import("@/lib/rastreio.server");
          const [dias, unicos, total] = await Promise.all([
            rd.resumosDoPeriodo(30),
            rd.visitantesDoPeriodo(30),
            prisma.site_visits.count({
              where: { NOT: { path: { startsWith: "/_evento/" } }, ...whereHumano },
            }),
          ]);

          const soma = (m: Map<string, number>, k: string, v: number) => m.set(k, (m.get(k) ?? 0) + v);
          const paises = new Map<string, number>();
          const cidades = new Map<string, number>();
          const paginas = new Map<string, number>();
          const aparelhos = new Map<string, number>();
          const pecas = new Map<string, number>();
          for (const d of dias) {
            for (const [k, v] of Object.entries(d.paises)) soma(paises, k, v);
            for (const c of Object.values(d.cidades)) soma(cidades, `${c.cidade} — ${c.pais}`, c.v);
            for (const [k, v] of Object.entries(d.paginas)) soma(paginas, k, v);
            for (const [k, v] of Object.entries(d.aparelhos)) soma(aparelhos, k, v);
            for (const [k, s] of Object.entries(d.skus)) soma(pecas, k, s.v);
          }
          const lista = (m: Map<string, number>) =>
            [...m].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
          const hoje = dias[dias.length - 1];

          return Response.json({
            total, // páginas vistas desde o início
            last30: dias.reduce((t, d) => t + d.visitas, 0), // páginas vistas em 30 dias
            visitantes30: Number(unicos.total ?? 0),
            sessoes30: dias.reduce((t, d) => t + d.sessoes, 0),
            hoje: {
              dia: hoje?.dia,
              visitantes: hoje?.visitantes ?? 0,
              sessoes: hoje?.sessoes ?? 0,
              paginas: hoje?.visitas ?? 0,
            },
            countries: lista(paises).slice(0, 10),
            cities: lista(cidades).slice(0, 10),
            paths: lista(paginas).slice(0, 10),
            // value = páginas vistas (o gráfico antigo); visitantes e sessões por dia ao lado
            days: dias.map((d) => ({
              name: d.dia,
              value: d.visitas,
              visitantes: d.visitantes,
              sessoes: d.sessoes,
            })),
            devices: lista(aparelhos),
            topProducts: lista(pecas).slice(0, 10),
          });
        } catch (err) {
          console.error("analytics error", err);
          return Response.json({ error: "failed" }, { status: 500 });
        }
      },
    },
  },
});
