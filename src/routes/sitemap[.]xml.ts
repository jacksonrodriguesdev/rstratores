import { createFileRoute } from "@tanstack/react-router";

// Índice do mapa do site (o endereço enviado ao Search Console): aponta para as partes em
// /sitemaps/paginas.xml e /sitemaps/pecas-N.xml (src/lib/sitemap.server.ts).
export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const { indiceSitemap } = await import("@/lib/sitemap.server");
        return new Response(await indiceSitemap(), {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
