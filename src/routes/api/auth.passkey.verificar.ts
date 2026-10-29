import { createFileRoute } from "@tanstack/react-router";

// Passkeys (Face ID / digital): confere a resposta do aparelho.
// registro (logado): grava o aparelho; login: abre a sessão (cookie) e devolve o destino.
// Corpo: { tipo, token, resposta, redirect? }. Ver src/lib/passkey.server.ts.
const porIp = new Map<string, number[]>();

export const Route = createFileRoute("/api/auth/passkey/verificar")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({}));
          const p = await import("@/lib/passkey.server");
          const auth = await import("@/lib/auth.server");
          if (body.tipo === "registro") {
            const s = await auth.getSessionFromRequest(request);
            if (!s) return Response.json({ error: "login" }, { status: 401 });
            const r = await p.verificarRegistro(request, Number(s.id), body.token, body.resposta);
            if ("erro" in r) return Response.json({ error: r.erro }, { status: 400 });
            return Response.json({ ok: true });
          }
          // Login: limite por IP (20 tentativas a cada 10 min)
          const ip =
            request.headers.get("cf-connecting-ip") ||
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            "?";
          const agora = Date.now();
          const l = (porIp.get(ip) ?? []).filter((t) => agora - t < 10 * 60_000);
          if (l.length >= 20) return Response.json({ error: "limite" }, { status: 429 });
          porIp.set(ip, [...l, agora]);
          if (porIp.size > 5000) porIp.clear();

          const r = await p.verificarLogin(request, body.token, body.resposta);
          if ("erro" in r) return Response.json({ error: r.erro }, { status: 400 });
          const cookie = await auth.abrirSessao(request, r.user);
          const destino = r.user.role === "ADMIN" ? "/admin" : auth.destinoSeguro(body.redirect);
          return Response.json(
            { ok: true, role: r.user.role, destino, nome: r.user.nome_completo },
            { headers: { "Set-Cookie": cookie } },
          );
        } catch (e) {
          console.error("passkey verificar:", e);
          return Response.json({ error: "erro" }, { status: 500 });
        }
      },
    },
  },
});
