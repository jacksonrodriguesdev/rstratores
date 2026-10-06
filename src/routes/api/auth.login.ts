import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const email = String(body.email ?? "").trim().toLowerCase();
          const senha = String(body.senha ?? "");

          if (!email || !senha) {
            return Response.json({ error: "Completá el e-mail y la contraseña." }, { status: 400 });
          }

          const { prisma } = await import("@/lib/prisma");
          const bcrypt = (await import("bcryptjs")).default;
          const { createSessionToken, cookieSessao, loginBloqueado, registrarFalhaLogin, limparFalhasLogin } =
            await import("@/lib/auth.server");

          if (loginBloqueado(request, email)) {
            return Response.json(
              { error: "Demasiados intentos. Esperá 15 minutos y probá de nuevo." },
              { status: 429 },
            );
          }

          const user = await prisma.users.findUnique({ where: { email } });
          const valid = user ? await bcrypt.compare(senha, user.senha_hash) : false;
          if (!user || !valid) {
            registrarFalhaLogin(request, email);
            return Response.json({ error: "E-mail o contraseña incorrectos." }, { status: 401 });
          }
          limparFalhasLogin(request, email);

          const token = await createSessionToken({
            id: user.id,
            nome: user.nome_completo,
            email: user.email,
            role: user.role,
          });

          return Response.json(
            { success: true, role: user.role },
            { headers: { "Set-Cookie": cookieSessao(request, token) } },
          );
        } catch (err) {
          console.error("Erro no login:", err);
          return Response.json({ error: "No pudimos iniciar sesión. Probá de nuevo." }, { status: 500 });
        }
      },
    },
  },
});
