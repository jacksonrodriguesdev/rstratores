import { createFileRoute } from "@tanstack/react-router";
import crypto from "crypto";

// Admin → Posições no Google → "Conectar": manda ao Google pedir acesso de leitura ao Search Console.
// Com ?para=ads: Central de Anúncios → acesso ao Google Ads (escopo adwords).
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
        const paraAds = new URL(request.url).searchParams.get("para") === "ads";
        const state = crypto.randomBytes(16).toString("hex") + (paraAds ? "-ads" : "");
        const origem = origemPublica(request);
        const destino = `${origem}/api/admin/google/callback`;
        const url = paraAds
          ? (await import("@/lib/ads-google.server")).urlConectarAds(destino, state)
          : (await import("@/lib/search-console.server")).urlConectar(destino, state);
        return new Response(null, {
          status: 302,
          headers: {
            Location: url,
            "Set-Cookie": `ap_gsc_state=${state}; Path=/api/admin/google; Max-Age=600; HttpOnly; SameSite=Lax${origem.startsWith("https:") ? "; Secure" : ""}`,
          },
        });
      },
    },
  },
});
