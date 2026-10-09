import { createFileRoute } from "@tanstack/react-router";

// Início do login com Google: /api/auth/google?redirect=/catalogos
export const Route = createFileRoute("/api/auth/google")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const g = await import("@/lib/google-oauth.server");
        const { destinoSeguro } = await import("@/lib/auth.server");
        if (!g.googleConfigurado()) {
          return new Response(null, { status: 302, headers: { Location: "/login?erro=google_no_configurado" } });
        }
        return g.iniciarGoogle(request, destinoSeguro(new URL(request.url).searchParams.get("redirect")));
      },
    },
  },
});
