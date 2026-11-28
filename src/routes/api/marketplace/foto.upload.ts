import { createFileRoute } from "@tanstack/react-router";

// Upload de foto de máquina (Marketplace). Precisa estar logado. Salva em uploads/marketplace.
export const Route = createFileRoute("/api/marketplace/foto/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { getSessionFromRequest } = await import("@/lib/auth.server");
        const s = await getSessionFromRequest(request);
        if (!s) return Response.json({ error: "No autorizado" }, { status: 401 });
        try {
          const formData = await request.formData();
          const file = formData.get("file") as File;
          if (!file) return Response.json({ error: "Falta el archivo" }, { status: 400 });
          const { gravarImagem } = await import("@/lib/upload-imagem.server");
          const r = await gravarImagem(file, "marketplace", 8);
          if ("erro" in r) return Response.json({ error: r.erro }, { status: 400 });
          return Response.json({ path: r.path });
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 500 });
        }
      },
    },
  },
});
