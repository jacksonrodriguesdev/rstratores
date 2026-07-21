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
      GET: async () => {
        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

          const since30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

          const [{ count: total }, { count: last30 }, { data: rows }] = await Promise.all([
            supabaseAdmin.from("site_visits").select("*", { count: "exact", head: true }),
            supabaseAdmin
              .from("site_visits")
              .select("*", { count: "exact", head: true })
              .gte("created_at", since30),
            supabaseAdmin
              .from("site_visits")
              .select("country, city, created_at, path")
              .gte("created_at", since30)
              .limit(20000),
          ]);

          const byCountry = new Map<string, number>();
          const byCity = new Map<string, number>();
          const byDay = new Map<string, number>();
          const byPath = new Map<string, number>();

          for (const r of rows ?? []) {
            const country = r.country || "Desconhecido";
            byCountry.set(country, (byCountry.get(country) ?? 0) + 1);
            const cityKey = `${r.city || "Desconhecida"} — ${country}`;
            byCity.set(cityKey, (byCity.get(cityKey) ?? 0) + 1);
            const day = new Date(r.created_at as string).toISOString().slice(0, 10);
            byDay.set(day, (byDay.get(day) ?? 0) + 1);
            byPath.set(r.path, (byPath.get(r.path) ?? 0) + 1);
          }

          const toArr = (m: Map<string, number>) =>
            Array.from(m, ([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

          // day series ascending
          const days: Array<{ name: string; value: number }> = [];
          for (let i = 29; i >= 0; i--) {
            const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
            days.push({ name: d, value: byDay.get(d) ?? 0 });
          }

          // Top produtos mais visualizados (paths iniciando com /produto/)
          const productPathCounts = new Map<string, number>();
          for (const [name, value] of byPath.entries()) {
            const m = /^\/produto\/(.+)$/.exec(name);
            if (m) productPathCounts.set(decodeURIComponent(m[1]), value);
          }
          const topSkus = Array.from(productPathCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

          let topProducts: Array<{ sku: string; nome: string; views: number; imagem_principal: string | null }> = [];
          if (topSkus.length > 0) {
            const { data: prods } = await supabaseAdmin
              .from("products")
              .select("sku, nome, imagem_principal")
              .in("sku", topSkus.map(([s]) => s));
            const map = new Map((prods ?? []).map((p) => [p.sku, p]));
            topProducts = topSkus.map(([sku, views]) => {
              const p = map.get(sku);
              return {
                sku,
                nome: p?.nome ?? sku,
                imagem_principal: p?.imagem_principal ?? null,
                views,
              };
            });
          }

          return new Response(
            JSON.stringify({
              total: total ?? 0,
              last30: last30 ?? 0,
              countries: toArr(byCountry).slice(0, 10),
              cities: toArr(byCity).slice(0, 10),
              paths: toArr(byPath).slice(0, 10),
              days,
              topProducts,
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
