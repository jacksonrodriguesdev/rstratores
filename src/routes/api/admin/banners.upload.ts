import { createFileRoute } from "@tanstack/react-router";

// Imagem de banner (site e página inicial). Aceita JPG, JFIF, PNG, WEBP, AVIF e GIF (HEIC/BMP/
// TIFF chegam já convertidos pelo navegador): src/lib/upload-imagem.server.ts.
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
            return Response.json({ error: "Missing file or kind" }, { status: 400 });
          }

          // `kind` vira parte do caminho: só tipos conhecidos, para não gravar fora de uploads/site
          if (!["hero", "duplo", "strip", "dac"].includes(kind)) {
            return Response.json({ error: "Tipo de banner inválido" }, { status: 400 });
          }
          const { gravarImagem } = await import("@/lib/upload-imagem.server");
          const r = await gravarImagem(file, `site/${kind}`, 8);
          if ("erro" in r) return Response.json({ error: r.erro }, { status: 400 });
          return Response.json({ path: r.path });
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 });
        }
      },
    },
  },
});
