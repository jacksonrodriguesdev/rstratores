import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/lib/prisma";

export const Route = createFileRoute("/api/admin/categories/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        try {
          const id = Number(params.id);
          const body = await request.json();
          const cat = await prisma.categories.update({
            where: { id },
            data: {
              nome: body.nome,
              parent_id: body.parent_id,
              image_path: body.image_path,
              linha: body.linha,
            } as any
          });
          return new Response(JSON.stringify(cat), {
             status: 200,
             headers: { "Content-Type": "application/json" }
          });
        } catch (e: any) {
           return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
      },
      DELETE: async ({ params }) => {
        try {
          const id = Number(params.id);
          await prisma.categories.delete({ where: { id } });
          return new Response(JSON.stringify({ success: true }), {
             status: 200,
             headers: { "Content-Type": "application/json" }
          });
        } catch (e: any) {
           return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
      }
    }
  }
});
