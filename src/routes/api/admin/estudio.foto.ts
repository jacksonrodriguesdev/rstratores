import { createFileRoute } from "@tanstack/react-router";
import * as fs from "fs/promises";

// Foto da peça para o gerador de artes do Estúdio (o canvas do navegador não pode ler imagens
// de outro domínio). Só serve fotos próprias: agrotrator.com.br e uploads/produtos.
export const Route = createFileRoute("/api/admin/estudio/foto")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { requireAdmin } = await import("@/lib/auth.server");
        const negado = await requireAdmin(request);
        if (negado) return negado;
        const { fotoPropria } = await import("@/lib/estudio.server");
        const alvo = new URL(request.url).searchParams.get("u") || "";
        if (!fotoPropria(alvo)) return new Response("foto não permitida", { status: 403 });
        try {
          let corpo: ArrayBuffer;
          let tipo = "image/jpeg";
          if (
            /^https:\/\/[\w.-]*agrotrator[\w.-]*\.(com\.br|com)\//i.test(alvo) ||
            /^https:\/\/agrotrator2\.vteximg\.com\.br\//i.test(alvo)
          ) {
            const r = await fetch(alvo, { signal: AbortSignal.timeout(20_000) });
            if (!r.ok) return new Response("não encontrada", { status: 404 });
            corpo = await r.arrayBuffer();
            tipo = r.headers.get("content-type") || tipo;
          } else if (!/^https?:/i.test(alvo)) {
            const { caminhoUpload } = await import("@/lib/uploads.server");
            const rel = alvo.replace(/^\/?(uploads\/)?/, "");
            if (rel.includes("..")) return new Response("caminho inválido", { status: 400 });
            const b = await fs.readFile(caminhoUpload(rel));
            corpo = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
            tipo = /\.png$/i.test(rel)
              ? "image/png"
              : /\.webp$/i.test(rel)
                ? "image/webp"
                : "image/jpeg";
          } else return new Response("foto não permitida", { status: 403 });
          return new Response(corpo, {
            headers: { "Content-Type": tipo, "Cache-Control": "private, max-age=86400" },
          });
        } catch {
          return new Response("falha ao ler a foto", { status: 502 });
        }
      },
    },
  },
});
