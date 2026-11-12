import { createFileRoute } from "@tanstack/react-router";

// Entrega as fotos da linha Diesel (Bodipasa) direto da pasta persistente
// "agroparts-uploads/diesel" (fora do git, fora de public/). A pasta é localizada
// automaticamente subindo a partir do cwd e da pasta de uploads; pode ser fixada
// pela variável FOTOS_DIESEL_DIR. Lê do disco a cada pedido (sem rebuild/reinício).
const TIPOS: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  jfif: "image/jpeg",
};

let baseResolvida: string | null = null;

async function baseDiesel(): Promise<string | null> {
  if (baseResolvida) return baseResolvida;
  const path = await import("path");
  const fs = await import("fs");
  const { pastaUploads } = await import("@/lib/uploads.server");

  const existe = (p: string) => {
    try {
      return fs.statSync(p).isDirectory();
    } catch {
      return false;
    }
  };

  // 1) variável explícita (se existir)
  if (process.env.FOTOS_DIESEL_DIR) {
    const p = path.resolve(process.env.FOTOS_DIESEL_DIR);
    if (existe(p)) return (baseResolvida = p);
  }

  // 2) procura "agroparts-uploads/diesel" subindo a partir do cwd e da pasta de uploads
  const inicios = [process.cwd(), pastaUploads()];
  for (const inicio of inicios) {
    let d = path.resolve(inicio);
    for (let i = 0; i < 10; i++) {
      const cand = path.join(d, "agroparts-uploads", "diesel");
      if (existe(cand)) return (baseResolvida = cand);
      const pai = path.dirname(d);
      if (pai === d) break;
      d = pai;
    }
  }

  // 3) último recurso: <UPLOADS_DIR>/diesel
  const up = path.join(pastaUploads(), "diesel");
  if (existe(up)) return (baseResolvida = up);

  return null;
}

export const Route = createFileRoute("/diesel/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const path = await import("path");
        const fs = await import("fs/promises");
        const raiz = await baseDiesel();
        if (!raiz) return new Response("Não encontrado", { status: 404 });

        const arquivo = path.resolve(raiz, decodeURIComponent(params._splat ?? ""));
        // impede sair da pasta (ex.: /diesel/../../.env)
        const relativo = path.relative(raiz, arquivo).split(path.sep).join("/");
        if (!arquivo.startsWith(raiz + path.sep) || relativo.startsWith("..")) {
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
            },
          });
        } catch {
          return new Response("Não encontrado", { status: 404 });
        }
      },
    },
  },
});
