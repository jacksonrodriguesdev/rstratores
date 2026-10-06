import { createFileRoute } from "@tanstack/react-router";

// Texto curto e sem espaços nas pontas; corta campos gigantes enviados de propósito.
const texto = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export const Route = createFileRoute("/api/auth/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const nome_completo = texto(body.nome_completo);
          const email = texto(body.email, 191).toLowerCase();
          const senha = typeof body.senha === "string" ? body.senha : "";

          if (!nome_completo || !email || !senha) {
            return Response.json({ error: "Completá los campos obligatorios." }, { status: 400 });
          }
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return Response.json({ error: "El e-mail no es válido." }, { status: 400 });
          }
          if (senha.length < 6 || senha.length > 200) {
            return Response.json({ error: "La contraseña debe tener al menos 6 caracteres." }, { status: 400 });
          }

          const { prisma } = await import("@/lib/prisma");
          const bcrypt = (await import("bcryptjs")).default;
          const { createSessionToken, cookieSessao } = await import("@/lib/auth.server");

          const existing = await prisma.users.findUnique({ where: { email } });
          if (existing) {
            return Response.json({ error: "Ya existe una cuenta con este e-mail. Ingresá con tu contraseña." }, { status: 400 });
          }

          const senha_hash = await bcrypt.hash(senha, 10);

          // `role` nunca vem do formulário: toda conta criada aqui é de cliente
          const user = await prisma.users.create({
            data: {
              nome_completo,
              email,
              senha_hash,
              telefone: texto(body.telefone, 40),
              endereco: texto(body.endereco),
              cidade: texto(body.cidade, 100),
              ponto_referencia: texto(body.ponto_referencia),
              numero_casa: texto(body.numero_casa, 20),
              cep: texto(body.cep, 20),
              pais: texto(body.pais, 40),
            },
          });

          const token = await createSessionToken({
            id: user.id,
            nome: user.nome_completo,
            email: user.email,
            role: user.role,
          });

          return Response.json({ success: true }, { headers: { "Set-Cookie": cookieSessao(request, token) } });
        } catch (err) {
          console.error("Erro no cadastro:", err);
          return Response.json({ error: "No pudimos crear la cuenta. Probá de nuevo." }, { status: 500 });
        }
      },
    },
  },
});
