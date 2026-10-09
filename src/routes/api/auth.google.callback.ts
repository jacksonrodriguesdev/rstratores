import { createFileRoute } from "@tanstack/react-router";

// Volta do Google: acha a conta (pelo id do Google ou pelo e-mail) ou cria uma nova
export const Route = createFileRoute("/api/auth/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const crypto = await import("crypto");
        const g = await import("@/lib/google-oauth.server");
        const { abrirSessao } = await import("@/lib/auth.server");
        const { prisma } = await import("@/lib/prisma");
        const redirecionar = (local: string, cookies: string[]) => {
          const h = new Headers({ Location: local });
          for (const c of cookies) h.append("Set-Cookie", c);
          return new Response(null, { status: 302, headers: h });
        };
        try {
          const { perfil, destino } = await g.concluirGoogle(request);
          let user =
            (await prisma.users.findUnique({ where: { google_id: perfil.sub } })) ??
            (await prisma.users.findUnique({ where: { email: perfil.email } }));
          if (user) {
            // E-mail verificado pelo Google: liga a conta existente ao Google
            user = await prisma.users.update({
              where: { id: user.id },
              data: { google_id: perfil.sub, avatar_url: user.avatar_url || perfil.foto },
            });
          } else {
            user = await prisma.users.create({
              data: {
                nome_completo: perfil.nome.slice(0, 120),
                email: perfil.email,
                // Conta sem senha: o login é pelo Google (pode definir uma senha no perfil)
                senha_hash: "google:" + crypto.randomBytes(24).toString("hex"),
                google_id: perfil.sub,
                avatar_url: perfil.foto,
                pais: "Uruguai",
              },
            });
          }
          const sessao = await abrirSessao(request, user);
          // Sem celular: completa o cadastro antes (é como a loja fala com o cliente)
          const final =
            user.role === "ADMIN"
              ? "/admin"
              : user.telefone
                ? destino
                : `/cuenta?completar=1&redirect=${encodeURIComponent(destino)}`;
          return redirecionar(final, [sessao, g.limparCookieGoogle(request)]);
        } catch (e: any) {
          console.error("[google] login falhou:", e?.message);
          const erro = e?.message === "cancelado" ? "google_cancelado" : "google";
          return redirecionar(`/login?erro=${erro}`, [g.limparCookieGoogle(request)]);
        }
      },
    },
  },
});
