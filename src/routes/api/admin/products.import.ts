import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/products/import")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { requireAdmin } = await import("@/lib/auth.server");
        const denied = await requireAdmin(request);
        if (denied) return denied;
        const { prisma } = await import("@/lib/prisma");
        const { delegates, dadosProduto, tabelasCatalogo } = await import("@/lib/catalogo-admin.server");
        try {
          const { rows } = await request.json();
          if (!Array.isArray(rows)) {
            return Response.json({ error: "Envie um array de linhas" }, { status: 400 });
          }

          // Categorias da mesma linha do produto (há categorias com o mesmo nome nas duas linhas)
          const catMap = new Map<string, number>();
          for (const r of rows) {
            const nome = r.categoria ? String(r.categoria).trim() : "";
            const linhaCat = tabelasCatalogo(r.linha).agricola ? "AGRICOLA" : "AUTOMOTIVA";
            const chave = `${linhaCat}|${nome}`;
            if (!nome || catMap.has(chave)) continue;
            const c =
              (await prisma.categories.findFirst({ where: { nome, linha: linhaCat } })) ??
              (await prisma.categories.create({ data: { nome, linha: linhaCat } }));
            catMap.set(chave, c.id);
          }

          const ops = rows
            .filter((r: any) => r.sku && r.nome)
            .map((r: any) => {
              const t = delegates(prisma, r.linha);
              const nomeCat = r.categoria ? String(r.categoria).trim() : "";
              const data = dadosProduto(
                {
                  ...r,
                  categoria: nomeCat || null,
                  category_id: nomeCat
                    ? catMap.get(`${t.agricola ? "AGRICOLA" : "AUTOMOTIVA"}|${nomeCat}`) ?? null
                    : null,
                },
                t.agricola,
              );
              return t.produtos.upsert({
                where: { sku: String(r.sku) },
                create: { sku: String(r.sku), ...data },
                update: data,
              });
            });

          await prisma.$transaction(ops);
          return Response.json({ count: ops.length });
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 });
        }
      },
    },
  },
});
