import { createFileRoute } from "@tanstack/react-router";

// Entrega o PDF de um catálogo publicado, só para o visualizador do site (/catalogos/ver/$id),
// que desenha as páginas sem opção de baixar. Abrir este endereço direto (barra de endereço,
// "salvar link") redireciona para o visualizador. Só o admin recebe o arquivo direto.
// Se o catálogo exige login e a pessoa não está logada, manda para o cadastro.
// Suporta "Range" (o leitor de PDF do navegador abre arquivos grandes por partes).
export const Route = createFileRoute("/catalogos/archivo/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const fs = await import("fs");
        const { Readable } = await import("stream");
        const { prisma } = await import("@/lib/prisma");
        const { getSessionFromRequest } = await import("@/lib/auth.server");
        const { caminhoCatalogo } = await import("@/lib/catalogos.server");

        const c = await prisma.catalogos.findUnique({ where: { id: Number(params.id) || 0 } });
        const sessao = await getSessionFromRequest(request);
        if (!c || (!c.ativo && sessao?.role !== "ADMIN")) return new Response("Catálogo no encontrado", { status: 404 });
        if (c.exige_login && !sessao) {
          return new Response(null, { status: 302, headers: { Location: `/cadastro?redirect=${"/catalogos/ver/" + c.id}` } });
        }
        // Pedido que não veio do visualizador (navegação direta, gerenciador de downloads): vai para o visualizador
        const doVisor = request.headers.get("x-visor") === "1" && request.headers.get("sec-fetch-dest") !== "document";
        if (!doVisor && sessao?.role !== "ADMIN") {
          return new Response(null, { status: 302, headers: { Location: `/catalogos/ver/${c.id}`, "Cache-Control": "no-store" } });
        }

        let arq: string;
        try {
          arq = caminhoCatalogo(c.arquivo);
        } catch {
          return new Response("Catálogo no encontrado", { status: 404 });
        }
        if (!fs.existsSync(arq)) return new Response("Archivo no disponible", { status: 404 });
        const tamanho = fs.statSync(arq).size;
        const range = request.headers.get("range");

        // Conta uma vista por abertura do visor (o primeiro pedaço vem marcado), não a cada pedaço
        if (request.headers.get("x-visor-inicio") === "1") {
          await prisma.$transaction([
            prisma.catalogos.update({ where: { id: c.id }, data: { downloads: { increment: 1 } } }),
            prisma.catalogos_downloads.create({ data: { catalogo_id: c.id, user_id: sessao?.id ?? null } }),
          ]).catch(() => {});
        }

        const nome = `${c.titulo.replace(/[^\w\- áéíóúñÁÉÍÓÚÑ]+/g, "").trim() || "catalogo"}.pdf`;
        const base = {
          "Content-Type": "application/pdf",
          "Accept-Ranges": "bytes",
          "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(nome)}`,
          // Não guarda cópia no cache do navegador
          "Cache-Control": "private, no-store",
          "X-Robots-Tag": "noindex",
        };
        const m = range?.match(/^bytes=(\d*)-(\d*)$/);
        if (m) {
          const ini = m[1] ? Number(m[1]) : Math.max(0, tamanho - Number(m[2]));
          const fim = m[1] && m[2] ? Math.min(Number(m[2]), tamanho - 1) : tamanho - 1;
          if (ini >= tamanho || ini > fim) {
            return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${tamanho}` } });
          }
          return new Response(Readable.toWeb(fs.createReadStream(arq, { start: ini, end: fim })) as any, {
            status: 206,
            headers: { ...base, "Content-Range": `bytes ${ini}-${fim}/${tamanho}`, "Content-Length": String(fim - ini + 1) },
          });
        }
        return new Response(Readable.toWeb(fs.createReadStream(arq)) as any, { headers: { ...base, "Content-Length": String(tamanho) } });
      },
    },
  },
});
