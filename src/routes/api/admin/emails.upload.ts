import { createFileRoute } from "@tanstack/react-router";
import * as fs from "fs/promises";
import * as path from "path";

// Imagem de cabeçalho das campanhas de e-mail. Fica em <uploads>/emails e é servida por /uploads.
export const Route = createFileRoute("/api/admin/emails/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { requireAdmin } = await import("@/lib/auth.server");
        const negado = await requireAdmin(request);
        if (negado) return negado;
        try {
          const file = (await request.formData()).get("file") as File | null;
          if (!file) return Response.json({ error: "Nenhum arquivo" }, { status: 400 });
          const ext = file.name.split(".").pop()?.toLowerCase() || "";
          // Sem WEBP/AVIF: o Outlook não mostra
          if (!["jpg", "jpeg", "png", "gif"].includes(ext)) {
            return Response.json({ error: "Use JPG, PNG ou GIF (o Outlook não mostra WEBP)" }, { status: 400 });
          }
          if (file.size > 3 * 1024 * 1024) {
            return Response.json({ error: "Imagem maior que 3 MB: e-mails pesados vão para spam" }, { status: 400 });
          }
          const relativo = `emails/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
          const { caminhoUpload } = await import("@/lib/uploads.server");
          const dest = caminhoUpload(relativo);
          await fs.mkdir(path.dirname(dest), { recursive: true });
          await fs.writeFile(dest, Buffer.from(await file.arrayBuffer()));
          return Response.json({ path: relativo });
        } catch (e: any) {
          return Response.json({ error: e?.message || "Falha no envio" }, { status: 500 });
        }
      },
    },
  },
});
