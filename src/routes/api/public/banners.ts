import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/banners")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const kind = url.searchParams.get("kind") || undefined;
          const active = url.searchParams.get("active") === "true";
          const linha = url.searchParams.get("linha") || undefined;

          const { listActiveBanners, listBanners } = await import("@/lib/banners.server");
          const data = active ? await listActiveBanners(kind!, linha) : await listBanners(kind, linha);

          return new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
