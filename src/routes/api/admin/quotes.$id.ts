import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/lib/prisma";

export const Route = createFileRoute("/api/admin/quotes/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        try {
          const id = Number(params.id);
          const body = await request.json();
          
          if (!body.status) {
            return new Response(JSON.stringify({ error: "Missing status" }), { status: 400 });
          }

          const quote = await prisma.quotes.update({
            where: { id },
            data: { status: body.status }
          });

          return new Response(JSON.stringify({ quote }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
      }
    }
  }
});
