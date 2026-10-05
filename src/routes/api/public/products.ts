import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/products")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { prisma } = await import("@/lib/prisma");
        try {
          const url = new URL(request.url);
          const search = url.searchParams.get("search") || undefined;
          const categoria = url.searchParams.get("categoria") || undefined;
          const marca = url.searchParams.get("marca") || undefined;
          const precoMinStr = url.searchParams.get("precoMin");
          const precoMaxStr = url.searchParams.get("precoMax");
          const precoMin = precoMinStr ? Number(precoMinStr) : undefined;
          const precoMax = precoMaxStr ? Number(precoMaxStr) : undefined;
          const sort = url.searchParams.get("sort") || "nome-asc";
          const pageStr = url.searchParams.get("page");
          const page = pageStr ? Number(pageStr) : 1;
          const pageSizeStr = url.searchParams.get("pageSize");
          const pageSize = pageSizeStr ? Number(pageSizeStr) : 36;

          const where: any = {};
          if (search && search.trim()) {
            const s = search.trim();
            where.OR = [{ nome: { contains: s } }, { sku: { contains: s } }];
          }
          if (categoria) where.categoria = categoria;
          if (marca) where.marca = marca;
          if (precoMin !== undefined) where.preco_brl = { ...where.preco_brl, gte: precoMin };
          if (precoMax !== undefined) where.preco_brl = { ...where.preco_brl, lte: precoMax };

          const sortMap: Record<string, any> = {
            "nome-asc": { nome: "asc" },
            "nome-desc": { nome: "desc" },
            "preco-asc": { preco_brl: "asc" },
            "preco-desc": { preco_brl: "desc" },
            sku: { sku: "asc" },
          };
          const orderBy = sortMap[sort] || { nome: "asc" };
          const skip = (page - 1) * pageSize;

          const [data, total] = await Promise.all([
            prisma.products.findMany({ where, orderBy, skip, take: pageSize }),
            prisma.products.count({ where }),
          ]);

          return new Response(JSON.stringify({ rows: data, total }), {
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
