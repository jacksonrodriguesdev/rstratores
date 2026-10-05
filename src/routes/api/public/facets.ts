import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/facets")({
  server: {
    handlers: {
      GET: async () => {
        const { prisma } = await import("@/lib/prisma");
        try {
          const categorias = [
            "Motor",
            "Suspensão",
            "Freios",
            "Transmissão",
            "Elétrica",
            "Embreagem",
          ];
          const marcas = [
            "Massey Ferguson",
            "Valmet",
            "Ford",
            "John Deere",
            "New Holland",
            "Case",
            "Bosch",
            "Nakata",
            "Cofap",
            "Monroe",
            "Sachs",
            "Valeo",
          ];

          return new Response(JSON.stringify({ categorias, marcas }), {
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
