import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/products/$sku/images")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const { prisma } = await import("@/lib/prisma");
        try {
          const { sku } = params;
          const data = await prisma.products_img.findMany({
            where: { sku },
            orderBy: { sort_order: "asc" },
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
