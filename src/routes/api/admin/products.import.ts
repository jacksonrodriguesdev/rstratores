import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/products/import")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { prisma } = await import("@/lib/prisma");
        try {
          const { rows } = await request.json();

          if (!Array.isArray(rows)) {
            return new Response(JSON.stringify({ error: "Invalid rows array" }), { status: 400 });
          }

          const categoryNames = [...new Set(rows.map((r: any) => r.categoria).filter(Boolean))];
          const catMap = new Map<string, number>();
          for (const name of categoryNames) {
            let c = await prisma.categories.findFirst({ where: { nome: String(name).trim() } });
            if (!c) {
              c = await prisma.categories.create({ data: { nome: String(name).trim() } });
            }
            catMap.set(String(name).trim(), c.id);
          }

          const ops = rows.map((r: any) => {
            const data = {
              nome: r.nome,
              preco_brl: r.preco_brl,
              categoria: r.categoria,
              category_id: r.categoria ? catMap.get(String(r.categoria).trim()) || null : null,
              marca: r.marca,
              estoque: r.estoque,
              peso: r.peso,
              url: r.url,
              descricao: r.descricao,
              imagem_principal: r.imagem_principal,
              linha: r.linha || "AGRICOLA",
            };
            return prisma.products.upsert({
              where: { sku: r.sku },
              create: { sku: r.sku, ...data },
              update: data,
            });
          });

          await prisma.$transaction(ops);

          return new Response(JSON.stringify({ count: rows.length }), {
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
