import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/products")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { requireAdmin } = await import("@/lib/auth.server");
        const denied = await requireAdmin(request);
        if (denied) return denied;
        const { prisma } = await import("@/lib/prisma");
        const { delegates, dadosProduto } = await import("@/lib/catalogo-admin.server");
        try {
          const body = await request.json();
          const { images, linha } = body;
          // Sem espaços nas pontas: "82636800 " virava /produto/82636800%20
          const sku = String(body.sku ?? "").trim();
          if (typeof body.nome === "string") body.nome = body.nome.trim();
          if (typeof body.codigo_fabricante === "string") body.codigo_fabricante = body.codigo_fabricante.trim() || null;
          if (!sku || !body.nome) {
            return Response.json({ error: "SKU e nome são obrigatórios." }, { status: 400 });
          }

          await prisma.$transaction(async (tx) => {
            const t = delegates(tx, linha);
            const data = dadosProduto(body, t.agricola);
            await t.produtos.create({ data: { sku, ...data } });
            if (images && images.length > 0) {
              await t.imagens.createMany({
                data: images.map((path: string, i: number) => ({
                  sku,
                  image_path: path,
                  image_type: i === 0 && !data.imagem_principal ? "main" : "thumb",
                  sort_order: i + 10,
                })),
              });
              if (!data.imagem_principal) {
                await t.produtos.update({ where: { sku }, data: { imagem_principal: images[0] } });
              }
            }
          });

          return Response.json({ success: true });
        } catch (err: any) {
          const msg = err?.code === "P2002" ? "Já existe um produto com esse SKU." : err.message;
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
