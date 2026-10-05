import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/quotes")({
  server: {
    handlers: {
      GET: async () => {
        const { prisma } = await import("@/lib/prisma");
        try {
          const rows = await prisma.quotes.findMany({
            orderBy: { created_at: "desc" },
          });
          return new Response(JSON.stringify({ rows }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
      },
    },
  },
});
