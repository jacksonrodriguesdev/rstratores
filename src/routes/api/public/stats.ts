import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/stats")({
  server: {
    handlers: {
      GET: async () => {
        const { prisma } = await import("@/lib/prisma");
        try {
          const [totalProducts, sample] = await Promise.all([
            prisma.products.count(),
            prisma.products.findMany({
              select: { categoria: true, marca: true, estoque: true },
            }),
          ]);

          const categorias = new Set<string>();
          const marcas = new Set<string>();
          let estoqueTotal = 0;

          sample.forEach((r) => {
            if (r.categoria) categorias.add(r.categoria);
            if (r.marca) marcas.add(r.marca);
            estoqueTotal += r.estoque ?? 0;
          });

          return new Response(
            JSON.stringify({
              totalProducts,
              totalCategorias: categorias.size,
              totalMarcas: marcas.size,
              estoqueTotal,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
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
