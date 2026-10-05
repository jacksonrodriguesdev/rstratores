import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/track")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        try {
          const body = (await request.json().catch(() => ({}))) as {
            path?: string;
            referrer?: string;
          };
          const path = (body.path ?? "/").slice(0, 512);
          const referrer = (body.referrer ?? "").slice(0, 512) || null;
          const userAgent = (request.headers.get("user-agent") ?? "").slice(0, 512) || null;

          // Cloudflare Workers geolocation headers
          const h = request.headers;
          const country = h.get("cf-ipcountry") || h.get("x-vercel-ip-country") || null;
          const city = h.get("cf-ipcity") || h.get("x-vercel-ip-city") || null;
          const region =
            h.get("cf-region") ||
            h.get("cf-ipregion") ||
            h.get("x-vercel-ip-country-region") ||
            null;

          // Skip obvious bots
          if (userAgent && /bot|crawler|spider|preview|lighthouse/i.test(userAgent)) {
            return new Response(JSON.stringify({ skipped: true }), {
              status: 200,
              headers: { "Content-Type": "application/json", ...CORS },
            });
          }

          const { prisma } = await import("@/lib/prisma");
          await prisma.site_visits.create({
            data: {
              path,
              country: country ? decodeURIComponent(country) : null,
              country_code: country,
              city: city ? decodeURIComponent(city) : null,
              region: region ? decodeURIComponent(region) : null,
              referrer,
              user_agent: userAgent,
            },
          });

          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        } catch (err) {
          console.error("track error", err);
          return new Response(JSON.stringify({ ok: false }), {
            status: 200,
            headers: { "Content-Type": "application/json", ...CORS },
          });
        }
      },
    },
  },
});
