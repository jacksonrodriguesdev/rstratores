import { createFileRoute } from "@tanstack/react-router";

// Fotos das peças (até 15 MB cada; o admin já reduz no navegador antes de enviar). Aceita JPG,
// JFIF, PNG, WEBP, AVIF e GIF (HEIC/BMP/TIFF chegam convertidos): src/lib/upload-imagem.server.ts.
export const Route = createFileRoute("/api/admin/products/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { requireAdmin } = await import("@/lib/auth.server");
        const denied = await requireAdmin(request);
        if (denied) return denied;
        try {
          const formData = await request.formData();
          const files = formData.getAll("files") as File[];

          if (!files || files.length === 0) {
            return Response.json({ error: "No files uploaded" }, { status: 400 });
          }

          const { gravarImagem } = await import("@/lib/upload-imagem.server");
          const uploadedPaths: string[] = [];
          for (const file of files) {
            const r = await gravarImagem(file, "produtos", 15);
            if ("erro" in r) return Response.json({ error: r.erro }, { status: 400 });
            uploadedPaths.push(r.path);
          }

          return Response.json({ paths: uploadedPaths });
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 });
        }
      },
    },
  },
});
