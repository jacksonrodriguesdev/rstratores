import { createFileRoute } from "@tanstack/react-router";

// Admin ou despachante → Embarques: anexa um documento a uma etapa (COD, DANFE, extrato da DU-E, CRT, MIC/DTA…).
// Vai para a pasta privada; a empresa só vê os marcados "cliente".
const LIMITE = 15 * 1024 * 1024;

export const Route = createFileRoute("/api/admin/aduana/arquivo")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { requireDespachante } = await import("@/lib/auth.server");
        const negado = await requireDespachante(request);
        if (negado) return negado;
        try {
          const form = await request.formData();
          const arq = form.get("file");
          if (!(arq instanceof File))
            return Response.json({ error: "Envie um arquivo." }, { status: 400 });
          if (arq.size > LIMITE)
            return Response.json({ error: "Arquivo maior que 15 MB." }, { status: 400 });
          const buf = Buffer.from(await arq.arrayBuffer());
          const ext = arq.name.split(".").pop()?.toLowerCase() ?? "";
          // Confere a assinatura do arquivo (não confia só na extensão)
          const assinatura =
            ext === "pdf"
              ? buf.subarray(0, 5).toString() === "%PDF-"
              : ext === "png"
                ? buf[0] === 0x89 && buf[1] === 0x50
                : ext === "jpg" || ext === "jpeg"
                  ? buf[0] === 0xff && buf[1] === 0xd8
                  : ext === "xml"
                    ? /^\s*(\uFEFF)?</.test(buf.subarray(0, 64).toString("utf8"))
                    : false;
          if (!assinatura)
            return Response.json({ error: "Envie PDF, XML, JPG ou PNG válido." }, { status: 400 });
          const { guardarArquivo } = await import("@/lib/aduana/aduana.server");
          const id = await guardarArquivo({
            embarqueId: Number(form.get("embarque")) || 0,
            etapa: String(form.get("etapa") ?? ""),
            nome: arq.name,
            conteudo: buf,
            cliente: form.get("cliente") === "1",
          });
          return Response.json({ ok: true, id });
        } catch (e: any) {
          return Response.json({ error: e?.message || "Falha no envio." }, { status: 400 });
        }
      },
    },
  },
});
