import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/products/$sku/related")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { prisma } = await import("@/lib/prisma");
        try {
          const { sku } = params;
          const url = new URL(request.url);
          const categoria = url.searchParams.get("categoria");
          const limit = Number(url.searchParams.get("limit")) || 4;

          if (!categoria) {
            return new Response(JSON.stringify([]), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          }

          const data = await prisma.products.findMany({
            where: {
              categoria,
              sku: { not: sku },
            },
            take: limit,
          });

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
