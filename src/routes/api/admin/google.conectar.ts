import { createFileRoute } from "@tanstack/react-router";
import crypto from "crypto";

// Admin → Posições no Google → "Conectar": manda ao Google pedir acesso de leitura ao Search Console.
// O endereço de volta (/api/admin/google/callback) tem que estar cadastrado no mesmo ID do cliente
// OAuth do "Entrar com Google" (Google Cloud → Credenciais).
export const Route = createFileRoute("/api/admin/google/conectar")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { requireAdmin } = await import("@/lib/auth.server");
        const negado = await requireAdmin(request);
        if (negado) return negado;
        const { googleConfigurado, origemPublica } = await import("@/lib/google-oauth.server");
        if (!googleConfigurado())
          return new Response(null, {
            status: 302,
            headers: { Location: "/admin/google?gsc=erro&msg=Falta%20GOOGLE_CLIENT_ID" },
          });
        const { urlConectar } = await import("@/lib/search-console.server");
        const state = crypto.randomBytes(16).toString("hex");
        const origem = origemPublica(request);
        return new Response(null, {
          status: 302,
          headers: {
            Location: urlConectar(`${origem}/api/admin/google/callback`, state),
            "Set-Cookie": `ap_gsc_state=${state}; Path=/api/admin/google; Max-Age=600; HttpOnly; SameSite=Lax${origem.startsWith("https:") ? "; Secure" : ""}`,
          },
        });
      },
    },
  },
});
