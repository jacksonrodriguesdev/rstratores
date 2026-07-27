import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/lib/prisma";

export const Route = createFileRoute("/api/admin/categories")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          if (!body.nome) {
            return new Response(JSON.stringify({ error: "Nome é obrigatório" }), { status: 400 });
          }
          const cat = await prisma.categories.create({
            data: {
              nome: body.nome,
              parent_id: body.parent_id,
              image_path: body.image_path,
              linha: body.linha || "AGRICOLA",
            } as any
          });
          return new Response(JSON.stringify(cat), {
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
