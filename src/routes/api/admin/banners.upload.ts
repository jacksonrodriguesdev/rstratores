import { createFileRoute } from "@tanstack/react-router";
import * as fs from "fs/promises";
import * as path from "path";

export const Route = createFileRoute("/api/admin/banners/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { requireAdmin } = await import("@/lib/auth.server");
        const denied = await requireAdmin(request);
        if (denied) return denied;
        try {
          const formData = await request.formData();
          const file = formData.get("file") as File;
          const kind = formData.get("kind") as string;

          if (!file || !kind) {
            return new Response(JSON.stringify({ error: "Missing file or kind" }), { status: 400 });
          }

          // `kind` vira parte do caminho: só tipos conhecidos, para não gravar fora de uploads/site
          if (!["hero", "duplo", "strip"].includes(kind)) {
            return new Response(JSON.stringify({ error: "Tipo de banner inválido" }), { status: 400 });
          }
          const ext = file.name.split(".").pop()?.toLowerCase() || "";
          if (!["jpg", "jpeg", "png", "webp", "avif"].includes(ext)) {
            return new Response(JSON.stringify({ error: "Use imagem JPG, PNG, WEBP ou AVIF" }), {
              status: 400,
            });
          }
          if (file.size > 8 * 1024 * 1024) {
            return new Response(JSON.stringify({ error: "Imagem maior que 8 MB" }), { status: 400 });
          }
          const buffer = Buffer.from(await file.arrayBuffer());
          const relativePath = `site/${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

          const dest = path.join(process.cwd(), "public", "uploads", relativePath);
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
