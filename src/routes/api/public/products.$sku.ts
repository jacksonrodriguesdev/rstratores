import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/products/$sku")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { prisma } = await import("@/lib/prisma");
        try {
          const { sku } = params;
          const data = await prisma.products.findUnique({ where: { sku } });
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
