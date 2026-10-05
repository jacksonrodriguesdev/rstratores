import { createFileRoute } from "@tanstack/react-router";

// Entrega os arquivos enviados pelo site (banners, categorias, cotações, fotos de produtos).
// O servidor de arquivos estáticos só conhece o que existia em public/ quando ele subiu
// (e o build copia public/ uma única vez), então uploads novos davam 404 até reiniciar.
// Esta rota lê direto do disco, a cada pedido.
const TIPOS: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  avif: "image/avif",
  jfif: "image/jpeg",
  pdf: "application/pdf",
};

export const Route = createFileRoute("/uploads/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = await import("path");
        const fs = await import("fs/promises");
        const raiz = path.resolve(process.cwd(), "public", "uploads");
        const arquivo = path.resolve(raiz, decodeURIComponent(params._splat ?? ""));

        // Impede sair da pasta de uploads (ex.: /uploads/../../.env)
        if (!arquivo.startsWith(raiz + path.sep)) {
          return new Response("Não encontrado", { status: 404 });
        }

        const ext = arquivo.split(".").pop()?.toLowerCase() ?? "";
        const tipo = TIPOS[ext];
        if (!tipo) return new Response("Não encontrado", { status: 404 });

        try {
          const conteudo = await fs.readFile(arquivo);
          return new Response(conteudo, {
            headers: {
              "Content-Type": tipo,
              "Cache-Control": "public, max-age=86400",
              // SVG enviado por usuário não pode executar script no domínio do site
              ...(ext === "svg" && { "Content-Security-Policy": "script-src 'none'" }),
            },
          });
        } catch {
          return new Response("Não encontrado", { status: 404 });
        }
      },
    },
  },
});
