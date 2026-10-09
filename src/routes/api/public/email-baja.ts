import { createFileRoute } from "@tanstack/react-router";

// Descadastro em um clique (cabeçalho List-Unsubscribe-Post): o Gmail/Outlook chama este
// endereço por POST quando a pessoa toca em "Cancelar inscrição".
export const Route = createFileRoute("/api/public/email-baja")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const u = new URL(request.url);
        const id = Number(u.searchParams.get("u")) || 0;
        const { tokenBaixaValido } = await import("@/lib/email.server");
        if (!id || !tokenBaixaValido(id, u.searchParams.get("t") ?? "")) return new Response("inválido", { status: 400 });
        const { prisma } = await import("@/lib/prisma");
        await prisma.users.updateMany({ where: { id }, data: { recebe_emails: false } });
        return new Response("ok");
      },
    },
  },
});
