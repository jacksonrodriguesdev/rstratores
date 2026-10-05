import { createFileRoute } from "@tanstack/react-router";
import JSZip from "jszip";
import * as fs from "fs/promises";
import * as path from "path";

export const Route = createFileRoute("/api/admin/images/import")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { prisma } = await import("@/lib/prisma");
        try {
          const formData = await request.formData();
          const file = formData.get("file") as File;

          if (!file) {
            return new Response(JSON.stringify({ error: "No file uploaded" }), { status: 400 });
          }

          const buffer = Buffer.from(await file.arrayBuffer());
          const zip = await JSZip.loadAsync(buffer);

          const bySku = new Map<string, { path: string; entry: JSZip.JSZipObject }[]>();
          zip.forEach((relativePath, entry) => {
            if (entry.dir) return;
            const parts = relativePath.split("/").filter(Boolean);
            const skuFolder = parts.find((p) => /^SKU[_-]/i.test(p));
            if (!skuFolder) return;
            const sku = skuFolder.replace(/^SKU[_-]/i, "");
            const fileName = parts[parts.length - 1];
            if (!/\.(jpe?g|png|webp|gif)$/i.test(fileName)) return;

            if (!bySku.has(sku)) bySku.set(sku, []);
            bySku.get(sku)!.push({ path: fileName, entry });
          });

          const allSkus = Array.from(bySku.keys());

          const existingProducts = await prisma.products.findMany({
            where: { sku: { in: allSkus } },
            select: { sku: true },
          });
          const knownSkus = new Set(existingProducts.map((p) => p.sku));

          let uploaded = 0;
          let skipped = allSkus.length - knownSkus.size;
          const errors: string[] = [];

          for (const sku of knownSkus) {
            const files = bySku.get(sku)!;
            const imageRows: any[] = [];
            let mainPath: string | null = null;

            for (const { path: filename, entry } of files) {
              const storagePath = `SKU_${sku}/${filename}`;
              const dest = path.join(process.cwd(), "public", "uploads", storagePath);

              try {
                await fs.mkdir(path.dirname(dest), { recursive: true });
                const fileBuffer = await entry.async("nodebuffer");
                await fs.writeFile(dest, fileBuffer);

                uploaded += 1;

                const isMain = /^main\./i.test(filename);
                if (isMain) mainPath = storagePath;
                const orderMatch = filename.match(/thumb[_-]?(\d+)/i);
                const sortOrder = isMain ? 0 : orderMatch ? Number(orderMatch[1]) : 99;

                imageRows.push({
                  sku,
                  image_path: storagePath,
                  image_type: isMain ? "main" : "thumb",
                  sort_order: sortOrder,
                });
              } catch (e: any) {
                errors.push(`SKU ${sku} / ${filename}: ${e.message}`);
              }
            }

            if (imageRows.length > 0) {
              const ops = imageRows.map((r) =>
                prisma.products_img.upsert({
                  where: { sku_image_path: { sku: r.sku, image_path: r.image_path } },
                  create: r,
                  update: r,
                }),
              );
              await prisma.$transaction(ops);
            }
            if (mainPath) {
              await prisma.products.update({
                where: { sku },
                data: { imagem_principal: mainPath },
              });
            }
          }

          return new Response(
            JSON.stringify({
              processed: allSkus.length,
              total: allSkus.length,
              uploaded,
              skipped,
              errors,
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
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
