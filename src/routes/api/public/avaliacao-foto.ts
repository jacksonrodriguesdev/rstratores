import { createFileRoute } from "@tanstack/react-router";
import * as fs from "fs/promises";
import * as path from "path";

// Foto da peça instalada na avaliação (página do QR /avaliar/<código>). Só com o código de uma
// compra que ainda não foi avaliada; só imagem, até 8 MB (o navegador já reduz); até 12 por compra.
// Fica em uploads/avaliacoes/<código>/ e só aparece no site depois que a avaliação é aprovada.
const EXTS = ["jpg", "jpeg", "png", "webp"];
const MAX = 8 * 1024 * 1024;

export const Route = createFileRoute("/api/public/avaliacao-foto")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const fd = await request.formData();
          const codigo = String(fd.get("codigo") ?? "")
            .trim()
            .toUpperCase();
          const file = fd.get("file") as File | null;
          if (!/^[A-Z0-9]{6,24}$/.test(codigo))
            return Response.json({ error: "Compra não encontrada." }, { status: 400 });
          if (!file || !file.size) return Response.json({ error: "Falta a foto." }, { status: 400 });
          const ext = file.name.split(".").pop()?.toLowerCase() || "";
          if (!EXTS.includes(ext) || !file.type.startsWith("image/"))
            return Response.json({ error: "Envie uma foto (JPG, PNG ou WEBP)." }, { status: 400 });
          if (file.size > MAX)
            return Response.json({ error: "Foto maior que 8 MB." }, { status: 400 });
          const { garantirTabelasAvaliacoes } = await import("@/lib/avaliacoes.server");
          await garantirTabelasAvaliacoes();
          const { prisma } = await import("@/lib/prisma");
          const v = await prisma.vendas.findUnique({ where: { codigo } });
          if (!v || v.status === "CANCELADA")
            return Response.json({ error: "Compra não encontrada." }, { status: 404 });
          if (v.cupom)
            return Response.json({ error: "Esta compra já foi avaliada." }, { status: 409 });
          const { caminhoUpload } = await import("@/lib/uploads.server");
          const pasta = caminhoUpload(`avaliacoes/${codigo}`);
          await fs.mkdir(pasta, { recursive: true });
          const ja = await fs.readdir(pasta).catch(() => [] as string[]);
          if (ja.length >= 12)
            return Response.json({ error: "Limite de fotos atingido." }, { status: 400 });
          const nome = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext === "jpeg" ? "jpg" : ext}`;
          await fs.writeFile(path.join(pasta, nome), Buffer.from(await file.arrayBuffer()));
          return Response.json({ path: `avaliacoes/${codigo}/${nome}` });
        } catch (e: any) {
          return Response.json({ error: e?.message ?? "Falha no envio." }, { status: 500 });
        }
      },
    },
  },
});
