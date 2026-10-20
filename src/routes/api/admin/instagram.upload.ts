import { createFileRoute } from "@tanstack/react-router";
import * as fs from "fs/promises";
import * as path from "path";

// Mídias das publicações do Instagram: ficam em <uploads>/instagram (link público em /uploads,
// que é de onde a Meta baixa na hora de publicar). Imagem: JPG (o navegador converte antes).
const TIPOS: Record<string, { tipo: "IMAGE" | "VIDEO"; max: number }> = {
  jpg: { tipo: "IMAGE", max: 8 * 1024 * 1024 },
  jpeg: { tipo: "IMAGE", max: 8 * 1024 * 1024 },
  mp4: { tipo: "VIDEO", max: 100 * 1024 * 1024 },
  mov: { tipo: "VIDEO", max: 100 * 1024 * 1024 },
};
export const Route = createFileRoute("/api/admin/instagram/upload")({
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
          const t = TIPOS[ext];
          if (!t)
            return Response.json({ error: "Use imagem JPG/PNG ou vídeo MP4/MOV" }, { status: 400 });
          if (file.size > t.max)
            return Response.json(
              { error: `Arquivo grande demais (máximo ${t.max / 1024 / 1024} MB)` },
              { status: 400 },
            );
          const relativo = `instagram/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext === "jpeg" ? "jpg" : ext}`;
          const { caminhoUpload } = await import("@/lib/uploads.server");
          const dest = caminhoUpload(relativo);
          await fs.mkdir(path.dirname(dest), { recursive: true });
          await fs.writeFile(dest, Buffer.from(await file.arrayBuffer()));
          return Response.json({ path: relativo, tipo: t.tipo });
        } catch (e: any) {
          return Response.json({ error: e?.message || "Falha no envio" }, { status: 500 });
        }
      },
    },
  },
});
