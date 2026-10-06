import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";

// Orienta os buscadores: indexar a loja, não o painel, a API nem buscas internas.
export const Route = createFileRoute("/robots.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(
          [
            "User-agent: *",
            "Allow: /",
            "Disallow: /admin",
            "Disallow: /api/",
            "Disallow: /_serverFn/",
            "Disallow: /login",
            "Disallow: /cadastro",
            "Disallow: /loja?q=",
            "",
            `Sitemap: ${SITE_URL}/sitemap.xml`,
            "",
          ].join("\n"),
          { headers: { "Content-Type": "text/plain; charset=utf-8" } },
        ),
    },
  },
});
