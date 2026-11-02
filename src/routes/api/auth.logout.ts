import { createFileRoute } from "@tanstack/react-router";

// Sai deste aparelho. Com { todos: true }, derruba também os logins em todos os outros aparelhos.
export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { cookieSessao, encerrarSessoes, getSessionFromRequest } =
          await import("@/lib/auth.server");
        const body = await request.json().catch(() => ({}));
        if (body?.todos === true) {
          const s = await getSessionFromRequest(request);
          if (s) await encerrarSessoes(s.id);
        }
        return Response.json(
          { success: true },
          { headers: { "Set-Cookie": cookieSessao(request, null) } },
        );
      },
    },
  },
});
