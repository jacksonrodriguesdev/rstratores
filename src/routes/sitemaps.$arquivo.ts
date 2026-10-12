import { createFileRoute } from "@tanstack/react-router";

// Partes do mapa do site: /sitemaps/paginas.xml e /sitemaps/pecas-1.xml, pecas-2.xml...
export const Route = createFileRoute("/sitemaps/$arquivo")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { sitemapParte } = await import("@/lib/sitemap.server");
        const xml = await sitemapParte(params.arquivo);
        if (!xml) return new Response("Not found", { status: 404 });
        return new Response(xml, {
          headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
