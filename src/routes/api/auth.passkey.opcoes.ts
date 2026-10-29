import { createFileRoute } from "@tanstack/react-router";

// Passkeys (Face ID / digital): opções para ativar num aparelho (logado) ou para entrar.
// Corpo: { tipo: "registro" | "login" }. Ver src/lib/passkey.server.ts.
export const Route = createFileRoute("/api/auth/passkey/opcoes")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({}));
          const p = await import("@/lib/passkey.server");
          if (body.tipo === "registro") {
            const { getSessionFromRequest } = await import("@/lib/auth.server");
            const s = await getSessionFromRequest(request);
            if (!s) return Response.json({ error: "login" }, { status: 401 });
            const r = await p.opcoesRegistro(request, {
              id: Number(s.id),
              email: s.email,
              nome: s.nome,
            });
            if ("erro" in r) return Response.json({ error: r.erro }, { status: 400 });
            return Response.json(r);
          }
          const r = await p.opcoesLogin(request);
          if ("erro" in r) return Response.json({ error: r.erro }, { status: 400 });
          return Response.json(r);
        } catch (e) {
          console.error("passkey opcoes:", e);
          return Response.json({ error: "erro" }, { status: 500 });
        }
      },
    },
  },
});
