import { createFileRoute } from "@tanstack/react-router";
import { listActiveBanners, listBanners } from "@/lib/banners.server";

export const Route = createFileRoute("/api/public/banners")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url);
          const kind = url.searchParams.get("kind") || undefined;
          const active = url.searchParams.get("active") === "true";
          
          const data = active ? await listActiveBanners(kind!) : await listBanners(kind);
          
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
