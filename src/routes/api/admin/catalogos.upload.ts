import { createFileRoute } from "@tanstack/react-router";

// Envio de PDF de catálogo pelo admin (até 300 MB). Arquivos maiores: suba pelo gerenciador
// de arquivos da Hostinger para <UPLOADS_DIR>/catalogos e use "Detectar archivos".
const LIMITE = 300 * 1024 * 1024;

export const Route = createFileRoute("/api/admin/catalogos/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { requireAdmin } = await import("@/lib/auth.server");
        const negado = await requireAdmin(request);
        if (negado) return negado;
        try {
          const form = await request.formData();
          const arq = form.get("file");
          if (!(arq instanceof File)) return Response.json({ error: "Envie um arquivo PDF." }, { status: 400 });
          if (!/\.pdf$/i.test(arq.name) || (arq.type && arq.type !== "application/pdf")) {
            return Response.json({ error: "Só arquivos PDF." }, { status: 400 });
          }
          if (arq.size > LIMITE) return Response.json({ error: "Arquivo maior que 300 MB: suba pelo gerenciador de arquivos." }, { status: 400 });
          const fs = await import("fs");
          const path = await import("path");
          const { pastaCatalogos, detectarCatalogos } = await import("@/lib/catalogos.server");
          const marca = String(form.get("marca") || "geral").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "geral";
          const nome = arq.name.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9.]+/g, "-").replace(/^-|-$/g, "");
          const dir = path.join(pastaCatalogos(), marca);
          fs.mkdirSync(dir, { recursive: true });
          const destino = path.join(dir, nome);
          if (fs.existsSync(destino)) return Response.json({ error: "Já existe um catálogo com esse nome de arquivo." }, { status: 400 });
          // Confere a assinatura de PDF (não confia só na extensão)
          const buf = Buffer.from(await arq.arrayBuffer());
          if (buf.subarray(0, 5).toString() !== "%PDF-") return Response.json({ error: "O arquivo não é um PDF válido." }, { status: 400 });
          fs.writeFileSync(destino, buf);
          const r = await detectarCatalogos();
          return Response.json({ ok: true, novos: r.novos });
        } catch (e: any) {
          console.error("upload catálogo:", e);
          return Response.json({ error: "Falha no envio." }, { status: 500 });
        }
      },
    },
  },
});
