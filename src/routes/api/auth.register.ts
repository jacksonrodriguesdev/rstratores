import { createFileRoute } from "@tanstack/react-router";
import { normalizarCelularUY, emailValido, avaliarSenha, DEPARTAMENTOS_UY } from "@/lib/validacao-conta";

// Texto curto e sem espaços nas pontas; corta campos gigantes enviados de propósito.
const texto = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export const Route = createFileRoute("/api/auth/register")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          const nome_completo = texto(body.nome_completo, 120);
          const email = texto(body.email, 191).toLowerCase();
          const senha = typeof body.senha === "string" ? body.senha : "";
          const confirmar = typeof body.confirmar === "string" ? body.confirmar : "";
          const telefone = normalizarCelularUY(texto(body.telefone, 30));
          const departamento = DEPARTAMENTOS_UY.includes(body.departamento) ? body.departamento : null;

          if (!nome_completo || nome_completo.length < 3) return Response.json({ error: "Escribí tu nombre completo." }, { status: 400 });
          if (!emailValido(email)) return Response.json({ error: "El e-mail no es válido." }, { status: 400 });
          if (!telefone) return Response.json({ error: "El celular debe ser uruguayo: 09X XXX XXX." }, { status: 400 });
          if (!avaliarSenha(senha).valida || senha.length > 200)
            return Response.json({ error: "La contraseña debe tener al menos 8 caracteres, con letras y números." }, { status: 400 });
          if (senha !== confirmar) return Response.json({ error: "Las contraseñas no coinciden." }, { status: 400 });
          if (body.aceita !== true) return Response.json({ error: "Aceptá los términos para crear la cuenta." }, { status: 400 });

          const { prisma } = await import("@/lib/prisma");
          const bcrypt = (await import("bcryptjs")).default;
          const { abrirSessao, destinoSeguro } = await import("@/lib/auth.server");

          if (await prisma.users.findUnique({ where: { email } })) {
            return Response.json({ error: "Ya existe una cuenta con este e-mail. Ingresá con tu contraseña o con Google." }, { status: 400 });
          }

          // `role` nunca vem do formulário: toda conta criada aqui é de cliente
          const user = await prisma.users.create({
            data: {
              nome_completo,
              email,
              senha_hash: await bcrypt.hash(senha, 10),
              telefone,
              departamento,
              cidade: texto(body.cidade, 100) || null,
              pais: "Uruguai",
            },
          });
          const cookie = await abrirSessao(request, user);
          return Response.json({ success: true, destino: destinoSeguro(body.redirect) }, { headers: { "Set-Cookie": cookie } });
        } catch (err) {
          console.error("Erro no cadastro:", err);
          return Response.json({ error: "No pudimos crear la cuenta. Probá de nuevo." }, { status: 500 });
        }
      },
    },
  },
});
