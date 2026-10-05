import { createFileRoute } from "@tanstack/react-router";
import * as fs from "fs/promises";
import * as path from "path";

const ALLOWED_EXTS = ["pdf", "jpg", "jpeg", "png", "webp", "doc", "docx", "xls", "xlsx"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export const Route = createFileRoute("/api/public/quotes")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { prisma } = await import("@/lib/prisma");
        try {
          const formData = await request.formData();
          const nome = formData.get("nome") as string;
          const endereco = formData.get("endereco") as string;
          const whatsapp = formData.get("whatsapp") as string;
          const mensagem = formData.get("mensagem") as string;
          const file = formData.get("file") as File | null;

          if (!nome || !endereco || !whatsapp || (!mensagem && (!file || file.size === 0))) {
            return new Response(
              JSON.stringify({ error: "Preencha todos os campos obrigatórios." }),
              { status: 400 },
            );
          }

          let relativePath: string | null = null;

          if (file && file.size > 0) {
            const ext = file.name.split(".").pop()?.toLowerCase() || "";
            if (!ALLOWED_EXTS.includes(ext)) {
              return new Response(
                JSON.stringify({ error: `Tipo de arquivo não permitido. Use: ${ALLOWED_EXTS.join(", ")}.` }),
                { status: 400 },
              );
            }
            if (file.size > MAX_FILE_SIZE) {
              return new Response(JSON.stringify({ error: "Arquivo maior que 10 MB." }), {
                status: 400,
              });
            }
            const buffer = Buffer.from(await file.arrayBuffer());
            relativePath = `quotes/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

            const { caminhoUpload } = await import("@/lib/uploads.server");
            const dest = caminhoUpload(relativePath);
            await fs.mkdir(path.dirname(dest), { recursive: true });
            await fs.writeFile(dest, buffer);
          }

          const quote = await prisma.quotes.create({
            data: {
              nome,
              endereco,
              whatsapp,
              mensagem: mensagem || null,
              file_path: relativePath,
              status: "NOVA",
            },
          });

          return new Response(JSON.stringify({ success: true, quote }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
      },
    },
  },
});
