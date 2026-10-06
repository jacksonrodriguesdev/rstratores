import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { cookieSessao } = await import("@/lib/auth.server");
        return Response.json({ success: true }, { headers: { "Set-Cookie": cookieSessao(request, null) } });
      },
    },
  },
});
