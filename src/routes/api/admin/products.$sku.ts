import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/products/$sku")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const { prisma } = await import("@/lib/prisma");
        try {
          const { sku } = params;
          const body = await request.json();
          const { images, ...data } = body;

          await prisma.$transaction(async (tx) => {
            await tx.products.update({ where: { sku }, data });
            if (images && images.length > 0) {
              const imgData = images.map((path: string, i: number) => ({
                sku,
                image_path: path,
                image_type: "thumb",
                sort_order: i + 10,
              }));
              await tx.products_img.createMany({ data: imgData });

              if (!data.imagem_principal) {
                const p = await tx.products.findUnique({ where: { sku } });
                if (p && !p.imagem_principal) {
                  await tx.products.update({
                    where: { sku },
                    data: { imagem_principal: images[0] },
                  });
                }
              }
            }
          });

          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
      },
      DELETE: async ({ params }) => {
        const { prisma } = await import("@/lib/prisma");
        try {
          const { sku } = params;
          await prisma.products.delete({ where: { sku } });
          return new Response(JSON.stringify({ success: true }), {
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
