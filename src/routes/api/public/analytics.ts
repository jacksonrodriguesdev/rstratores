import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/analytics")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const { requireAdmin } = await import("@/lib/auth.server");
        const denied = await requireAdmin(request);
        if (denied) return denied;
        try {
          const { prisma } = await import("@/lib/prisma");

          const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

          // Eventos (cliques no WhatsApp, buscas) ficam na mesma tabela e não são visitas
          const soVisitas = { NOT: { path: { startsWith: "/_evento/" } } };
          const [total, last30, rows] = await Promise.all([
            prisma.site_visits.count({ where: soVisitas }),
            prisma.site_visits.count({ where: { ...soVisitas, created_at: { gte: since30 } } }),
            prisma.site_visits.findMany({
              select: { country: true, city: true, created_at: true, path: true, user_agent: true },
              where: { ...soVisitas, created_at: { gte: since30 } },
              take: 20000,
            }),
          ]);

          const byCountry = new Map<string, number>();
          const byCity = new Map<string, number>();
          const byDay = new Map<string, number>();
          const byPath = new Map<string, number>();
          const byDevice = new Map<string, number>();
          const topProductsMap = new Map<string, number>();

          for (const r of rows ?? []) {
            const country = r.country || "Desconhecido";
            byCountry.set(country, (byCountry.get(country) ?? 0) + 1);
            const cityKey = `${r.city || "Desconhecida"} — ${country}`;
            byCity.set(cityKey, (byCity.get(cityKey) ?? 0) + 1);
            const day = new Date(r.created_at as unknown as string).toISOString().slice(0, 10);
            byDay.set(day, (byDay.get(day) ?? 0) + 1);
            byPath.set(r.path, (byPath.get(r.path) ?? 0) + 1);

            const ua = (r.user_agent || "").toLowerCase();
            let device = "Desktop";
            if (/mobile|android|iphone|ipad|ipod|windows phone/i.test(ua)) {
              device = "Mobile";
            }
            byDevice.set(device, (byDevice.get(device) ?? 0) + 1);

            if (r.path?.startsWith("/produto/")) {
              const sku = r.path.split("/produto/")[1]?.split("?")[0];
              if (sku) {
                topProductsMap.set(sku, (topProductsMap.get(sku) ?? 0) + 1);
              }
            }
          }

          const toArr = (m: Map<string, number>) =>
            Array.from(m, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

          // day series ascending
          const days: Array<{ name: string; value: number }> = [];
          for (let i = 29; i >= 0; i--) {
            const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
            days.push({ name: d, value: byDay.get(d) ?? 0 });
          }

          return new Response(
            JSON.stringify({
              total: total ?? 0,
              last30: last30 ?? 0,
              countries: toArr(byCountry).slice(0, 10),
              cities: toArr(byCity).slice(0, 10),
              paths: toArr(byPath).slice(0, 10),
              days,
              devices: toArr(byDevice),
              topProducts: toArr(topProductsMap).slice(0, 10),
            }),
            { status: 200, headers: { "Content-Type": "application/json", ...CORS } },
          );
        } catch (err) {
          console.error("analytics error", err);
          return new Response(JSON.stringify({ error: "failed" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
      },
    },
  },
});
