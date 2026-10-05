import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const { email, senha } = body;

          if (!email || !senha) {
            return new Response(JSON.stringify({ error: "Preencha todos os campos." }), {
              status: 400,
            });
          }

          const { prisma } = await import("@/lib/prisma");
          const bcrypt = (await import("bcryptjs")).default;
          const { createSessionToken, AUTH_COOKIE } = await import("@/lib/auth.server");

          const user = await prisma.users.findUnique({ where: { email } });
          if (!user) {
            return new Response(JSON.stringify({ error: "E-mail ou senha incorretos." }), {
              status: 401,
            });
          }

          const valid = await bcrypt.compare(senha, user.senha_hash);
          if (!valid) {
            return new Response(JSON.stringify({ error: "E-mail ou senha incorretos." }), {
              status: 401,
            });
          }

          const token = await createSessionToken({
            id: user.id,
            nome: user.nome_completo,
            email: user.email,
            role: user.role,
          });

          return new Response(JSON.stringify({ success: true, role: user.role }), {
            status: 200,
            headers: {
              "Set-Cookie": `${AUTH_COOKIE}=${token}; Path=/; HttpOnly; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`,
            },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
      },
    },
  },
});
