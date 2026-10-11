import { createFileRoute } from "@tanstack/react-router";

// Cadastro rápido do pop-up: e-mail já confirmado pelo código (token), nome e departamento.
// Celular é opcional. A conta nasce sem senha (dá para criar uma depois em Mi cuenta).
const texto = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export const Route = createFileRoute("/api/auth/rapido")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({}));
          const { lerTokenEmail, garantirCupom, senhaAleatoria } = await import("@/lib/acesso.server");
          const email = await lerTokenEmail(String(body.token ?? ""));
          if (!email) return Response.json({ error: "La verificación venció. Pedí un código nuevo." }, { status: 400 });

          const { normalizarCelularUY, DEPARTAMENTOS_UY } = await import("@/lib/validacao-conta");
          const nome_completo = texto(body.nome, 120);
          const departamento = DEPARTAMENTOS_UY.includes(body.departamento) ? body.departamento : null;
          const telBruto = texto(body.telefone, 30);
          const telefone = telBruto ? normalizarCelularUY(telBruto) : null;
          if (nome_completo.length < 3) return Response.json({ error: "Escribí tu nombre completo." }, { status: 400 });
          if (!departamento) return Response.json({ error: "Elegí tu departamento." }, { status: 400 });
          if (telBruto && !telefone) return Response.json({ error: "El celular debe ser uruguayo: 09X XXX XXX." }, { status: 400 });

          const { prisma } = await import("@/lib/prisma");
          const { abrirSessao } = await import("@/lib/auth.server");
          // Se a conta já existir (ex.: criada em outra aba), só entra
          const user =
            (await prisma.users.findUnique({ where: { email } })) ??
            (await prisma.users.create({
              data: { nome_completo, email, senha_hash: senhaAleatoria("codigo"), telefone, departamento, pais: "Uruguai" },
            }));
          const cupom = await garantirCupom(user.id);
          const cookie = await abrirSessao(request, user);
          return Response.json({ ok: true, nome: user.nome_completo, cupom }, { headers: { "Set-Cookie": cookie } });
        } catch (err) {
          console.error("Erro no cadastro rápido:", err);
          return Response.json({ error: "No pudimos crear la cuenta. Probá de nuevo." }, { status: 500 });
        }
      },
    },
  },
});
