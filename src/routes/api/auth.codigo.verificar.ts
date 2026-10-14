import { createFileRoute } from "@tanstack/react-router";
import { comIdioma } from "@/lib/idioma-servidor";

// Confere o código. Quem já tem conta entra na hora; e-mail novo recebe um token para
// terminar o cadastro rápido em /api/auth/rapido (nome e departamento).
export const Route = createFileRoute("/api/auth/codigo/verificar")({
  server: {
    handlers: {
      // comIdioma: mensagens de erro em português nas páginas /pt
      POST: comIdioma(async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({}));
          const email = String(body.email ?? "")
            .trim()
            .toLowerCase()
            .slice(0, 191);
          const codigo = String(body.codigo ?? "").slice(0, 12);
          const { conferirCodigo, tokenEmailConfirmado, garantirCupom } =
            await import("@/lib/acesso.server");
          const r = await conferirCodigo(email, codigo);
          if ("erro" in r) return Response.json({ error: r.erro }, { status: 400 });

          const { prisma } = await import("@/lib/prisma");
          const user = await prisma.users.findUnique({ where: { email } });
          if (!user)
            return Response.json({
              ok: true,
              novo: true,
              token: await tokenEmailConfirmado(email),
            });

          const { abrirSessao } = await import("@/lib/auth.server");
          const cupom = user.role === "ADMIN" ? null : await garantirCupom(user.id);
          const cookie = await abrirSessao(request, user);
          return Response.json(
            {
              ok: true,
              novo: false,
              nome: user.nome_completo,
              cupom,
              cupomUsado: !!user.cupom_usado_em,
              role: user.role,
            },
            { headers: { "Set-Cookie": cookie } },
          );
        } catch (err) {
          console.error("Erro ao conferir código:", err);
          return Response.json(
            { error: "No pudimos verificar el código. Probá de nuevo." },
            { status: 500 },
          );
        }
      }),
    },
  },
});
