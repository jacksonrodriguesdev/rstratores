import { createFileRoute } from "@tanstack/react-router";

// Foto de produto do catálogo de exportação (pública, como as fotos da loja): uploads/exportacao/
const LIMITE = 8 * 1024 * 1024;

export const Route = createFileRoute("/api/admin/exportacao/foto")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { requireAdmin } = await import("@/lib/auth.server");
        const negado = await requireAdmin(request);
        if (negado) return negado;
        try {
          const form = await request.formData();
          const arq = form.get("file");
          if (!(arq instanceof File))
            return Response.json({ error: "Envie uma imagem." }, { status: 400 });
          if (arq.size > LIMITE)
            return Response.json({ error: "Imagem maior que 8 MB." }, { status: 400 });
          const buf = Buffer.from(await arq.arrayBuffer());
          const ext =
            buf[0] === 0xff && buf[1] === 0xd8
              ? "jpg"
              : buf[0] === 0x89 && buf[1] === 0x50
                ? "png"
                : buf.subarray(8, 12).toString() === "WEBP"
                  ? "webp"
                  : null;
          if (!ext) return Response.json({ error: "Envie JPG, PNG ou WEBP." }, { status: 400 });
          const crypto = await import("crypto");
          const fs = await import("fs");
          const path = await import("path");
          const { caminhoUpload } = await import("@/lib/uploads.server");
          const rel = `exportacao/${crypto.randomBytes(10).toString("hex")}.${ext}`;
          const destino = caminhoUpload(rel);
          fs.mkdirSync(path.dirname(destino), { recursive: true });
          fs.writeFileSync(destino, buf);
          return Response.json({ ok: true, url: `/uploads/${rel}` });
        } catch {
          return Response.json({ error: "Falha no envio." }, { status: 500 });
        }
      },
    },
  },
});
