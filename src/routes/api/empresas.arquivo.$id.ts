import { createFileRoute } from "@tanstack/react-router";

// Documento de um embarque (pasta privada): admin, ou a empresa dona quando marcado para o cliente
export const Route = createFileRoute("/api/empresas/arquivo/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const { getSessionFromRequest } = await import("@/lib/auth.server");
        const s = await getSessionFromRequest(request);
        const { arquivoPermitido } = await import("@/lib/aduana/aduana.server");
        const a = await arquivoPermitido(
          String(params.id ?? ""),
          s ? { id: Number(s.id), role: s.role } : null,
        );
        if (!a) return new Response("No encontrado", { status: 404 });
        const fs = await import("fs/promises");
        const { caminhoUpload } = await import("@/lib/uploads.server");
        try {
          const conteudo = await fs.readFile(caminhoUpload(a.caminho));
          return new Response(conteudo, {
            headers: {
              "content-type": a.tipo,
              "content-disposition": `inline; filename="${a.nome.replace(/[^\w.\- ]/g, "_")}"`,
              "cache-control": "private, no-store",
              "x-content-type-options": "nosniff",
            },
          });
        } catch {
          return new Response("No encontrado", { status: 404 });
        }
      },
    },
  },
});
