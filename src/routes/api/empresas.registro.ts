import { createFileRoute } from "@tanstack/react-router";
import { avaliarSenha, emailValido } from "@/lib/validacao-conta";

// AGRO PARTS Mayorista: cadastro da empresa. Quem já está logado só adiciona a empresa à conta;
// quem não tem conta cria o usuário (cliente comum, nunca admin) junto, e já entra logado.
const texto = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const porIp = new Map<string, number[]>();

export const Route = createFileRoute("/api/empresas/registro")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { ipDaRequisicao } = await import("@/lib/rastreio.server");
        const ip = ipDaRequisicao(request) ?? "local";
        const agora = Date.now();
        const l = (porIp.get(ip) ?? []).filter((x) => agora - x < 60 * 60_000);
        if (l.length >= 10)
          return Response.json(
            { error: "Demasiados intentos. Probá en un rato." },
            { status: 429 },
          );
        porIp.set(ip, [...l, agora]);
        try {
          const body = await request.json();
          const { getSessionFromRequest, abrirSessao } = await import("@/lib/auth.server");
          const { prisma } = await import("@/lib/prisma");
          const b = await import("@/lib/b2b.server");
          // Valida a empresa antes de criar qualquer conta
          const empresa = b.limparEmpresa(body.empresa ?? {});
          if (body.aceita !== true)
            return Response.json(
              { error: "Aceptá las condiciones para registrar la empresa." },
              { status: 400 },
            );

          const sessao = await getSessionFromRequest(request);
          let userId: number;
          let cookie: string | null = null;
          if (sessao) {
            userId = Number(sessao.id);
          } else {
            const email = texto(body.email, 191).toLowerCase() || empresa.email;
            const senha = typeof body.senha === "string" ? body.senha : "";
            if (!emailValido(email))
              return Response.json({ error: "El e-mail no es válido." }, { status: 400 });
            if (!avaliarSenha(senha).valida || senha.length > 200)
              return Response.json(
                { error: "La contraseña debe tener al menos 8 caracteres, con letras y números." },
                { status: 400 },
              );
            if (await prisma.users.findUnique({ where: { email } }))
              return Response.json(
                {
                  error:
                    "Ya existe una cuenta con este e-mail. Ingresá primero y después registrá la empresa.",
                  login: true,
                },
                { status: 400 },
              );
            const bcrypt = (await import("bcryptjs")).default;
            // `role` nunca vem do formulário
            const user = await prisma.users.create({
              data: {
                nome_completo: empresa.contato_nome,
                email,
                senha_hash: await bcrypt.hash(senha, 10),
                telefone: empresa.telefone,
                departamento: empresa.departamento,
                cidade: empresa.cidade,
                pais: "Uruguai",
              },
            });
            userId = user.id;
            cookie = await abrirSessao(request, user);
          }
          const e = await b.registrarEmpresa(body.empresa, userId);
          return Response.json(
            { success: true, status: e.status },
            cookie ? { headers: { "Set-Cookie": cookie } } : undefined,
          );
        } catch (err: any) {
          const msg = String(err?.message ?? "");
          // Erros de validação já vêm em espanhol para o cliente
          if (/RUT|razón|contacto|e-mail|empresa/i.test(msg))
            return Response.json({ error: msg }, { status: 400 });
          console.error("Cadastro de empresa:", err);
          return Response.json(
            { error: "No pudimos registrar la empresa. Probá de nuevo." },
            { status: 500 },
          );
        }
      },
    },
  },
});
