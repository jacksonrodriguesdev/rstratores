import { createFileRoute } from "@tanstack/react-router";

// Login rápido (pop-up "Entrá y ganá"): manda um código de 6 dígitos para o e-mail.
// Responde também se o e-mail já tem conta (para o pop-up saber se vai pedir o nome depois).
export const Route = createFileRoute("/api/auth/codigo")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({}));
          const email = String(body.email ?? "").trim().toLowerCase().slice(0, 191);
          const { emailValido } = await import("@/lib/validacao-conta");
          if (!emailValido(email)) return Response.json({ error: "El e-mail no es válido." }, { status: 400 });

          const { resendConfigurado } = await import("@/lib/email.server");
          if (!resendConfigurado()) return Response.json({ error: "El ingreso con código no está disponible. Entrá con Google o con tu contraseña." }, { status: 503 });

          const { criarCodigo, enviarEmailCodigo } = await import("@/lib/acesso.server");
          const { ipDaRequisicao } = await import("@/lib/rastreio.server");
          const r = await criarCodigo(email, ipDaRequisicao(request));
          if ("erro" in r) return Response.json({ error: r.erro }, { status: 429 });

          const { origemPublica } = await import("@/lib/google-oauth.server");
          await enviarEmailCodigo(email, r.codigo, origemPublica(request));

          const { prisma } = await import("@/lib/prisma");
          const existe = !!(await prisma.users.findUnique({ where: { email }, select: { id: true } }));
          return Response.json({ ok: true, existe });
        } catch (err) {
          console.error("Erro ao enviar código:", err);
          return Response.json({ error: "No pudimos enviar el código. Probá de nuevo." }, { status: 500 });
        }
      },
    },
  },
});
