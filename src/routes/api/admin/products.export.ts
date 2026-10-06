import { createFileRoute } from "@tanstack/react-router";

// Exporta o catálogo ativo (linha agrícola) para o CSV do admin.
// Antes o admin usava /api/public/products, que lia a tabela automotiva.
export const Route = createFileRoute("/api/admin/products/export")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { requireAdmin } = await import("@/lib/auth.server");
        const denied = await requireAdmin(request);
        if (denied) return denied;
        const { prisma } = await import("@/lib/prisma");
        try {
          const rows = await prisma.agricolas.findMany({
            // Versões agrupadas ficam dentro do produto principal; não entram como linhas soltas
            where: { duplicado_de: null },
            orderBy: { nome: "asc" },
            select: {
              sku: true,
              codigo_fabricante: true,
              nome: true,
              categoria: true,
              marca: true,
              fabricante: true,
              preco_brl: true,
              estoque: true,
              peso: true,
              imagem_principal: true,
              descricao: true,
            },
          });
          return Response.json({ rows });
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 });
        }
      },
    },
  },
});
