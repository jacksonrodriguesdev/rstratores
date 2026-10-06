import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/products/$sku")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const { requireAdmin } = await import("@/lib/auth.server");
        const denied = await requireAdmin(request);
        if (denied) return denied;
        const { prisma } = await import("@/lib/prisma");
        const { delegates, dadosProduto } = await import("@/lib/catalogo-admin.server");
        try {
          const { sku } = params;
          const body = await request.json();
          const { images, linha } = body;

          await prisma.$transaction(async (tx) => {
            const t = delegates(tx, linha);
            const data = dadosProduto(body, t.agricola);
            await t.produtos.update({ where: { sku }, data });
            if (images && images.length > 0) {
              await t.imagens.createMany({
                data: images.map((path: string, i: number) => ({
                  sku,
                  image_path: path,
                  image_type: "thumb",
                  sort_order: i + 10,
                })),
                skipDuplicates: true,
              });
              // Produto sem foto (ou com o logo usado como placeholder) passa a usar a primeira enviada
              const p = await t.produtos.findUnique({ where: { sku } });
              if (p && (!p.imagem_principal || /redeparts/i.test(p.imagem_principal))) {
                await t.produtos.update({ where: { sku }, data: { imagem_principal: images[0] } });
              }
            }
          });

          return Response.json({ success: true });
        } catch (err: any) {
          const msg = err?.code === "P2025" ? "Produto não encontrado." : err.message;
          return Response.json({ error: msg }, { status: 500 });
        }
      },
      DELETE: async ({ request, params }) => {
        const { requireAdmin } = await import("@/lib/auth.server");
        const denied = await requireAdmin(request);
        if (denied) return denied;
        const { prisma } = await import("@/lib/prisma");
        const { delegates } = await import("@/lib/catalogo-admin.server");
        try {
          const linha = new URL(request.url).searchParams.get("linha");
          await delegates(prisma, linha).produtos.delete({ where: { sku: params.sku } });
          return Response.json({ success: true });
        } catch (err: any) {
          const msg = err?.code === "P2025" ? "Produto não encontrado." : err.message;
          return Response.json({ error: msg }, { status: 500 });
        }
      },
    },
  },
});
