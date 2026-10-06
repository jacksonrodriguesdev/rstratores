import { createFileRoute } from "@tanstack/react-router";
import * as fs from "fs/promises";
import * as path from "path";

export const Route = createFileRoute("/api/admin/categories/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { requireAdmin } = await import("@/lib/auth.server");
        const denied = await requireAdmin(request);
        if (denied) return denied;
        try {
          const formData = await request.formData();
          const file = formData.get("file") as File;

          if (!file) {
            return new Response(JSON.stringify({ error: "Missing file" }), { status: 400 });
          }

          const ext = file.name.split(".").pop()?.toLowerCase() || "";
          if (!["jpg", "jpeg", "png", "webp", "avif"].includes(ext)) {
            return Response.json({ error: "Use imagem JPG, PNG, WEBP ou AVIF" }, { status: 400 });
          }
          if (file.size > 5 * 1024 * 1024) {
            return Response.json({ error: "Imagem maior que 5 MB" }, { status: 400 });
          }
          const buffer = Buffer.from(await file.arrayBuffer());
          const relativePath = `categorias/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

          const { caminhoUpload } = await import("@/lib/uploads.server");
          const dest = caminhoUpload(relativePath);
          await fs.mkdir(path.dirname(dest), { recursive: true });
          await fs.writeFile(dest, buffer);

          return new Response(JSON.stringify({ path: relativePath }), {
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
