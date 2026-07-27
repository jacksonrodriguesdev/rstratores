import { createFileRoute } from "@tanstack/react-router";
import { prisma } from "@/lib/prisma";

export const Route = createFileRoute("/api/admin/products")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { images, ...data } = body;
          
          await prisma.$transaction(async (tx) => {
            await tx.products.create({ data });
            if (images && images.length > 0) {
              const imgData = images.map((path: string, i: number) => ({
                sku: data.sku,
                image_path: path,
                image_type: i === 0 && !data.imagem_principal ? "main" : "thumb",
                sort_order: i + 10, // put after existing
              }));
              await tx.products_img.createMany({ data: imgData });
              
              if (!data.imagem_principal) {
                 await tx.products.update({ where: { sku: data.sku }, data: { imagem_principal: images[0] } });
              }
            }
          });
          
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      }
    }
  }
});
