import { createFileRoute } from "@tanstack/react-router";

// Imagem da categoria (até 5 MB). Formatos: src/lib/upload-imagem.server.ts.
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
            return Response.json({ error: "Missing file" }, { status: 400 });
          }

          const { gravarImagem } = await import("@/lib/upload-imagem.server");
          const r = await gravarImagem(file, "categorias", 5);
          if ("erro" in r) return Response.json({ error: r.erro }, { status: 400 });
          return Response.json({ path: r.path });
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 });
        }
      },
    },
  },
});
