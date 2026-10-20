import { createFileRoute } from "@tanstack/react-router";
import crypto from "crypto";

// Admin → Instagram e Facebook → «Conectar Facebook»: login do Facebook (página e anúncios).
// A senha fica na tela do Facebook; volta em /api/admin/facebook/callback.
export const Route = createFileRoute("/api/admin/facebook/conectar")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { requireAdmin } = await import("@/lib/auth.server");
        const negado = await requireAdmin(request);
        if (negado) return negado;
        const { facebookConfigurado, urlConectarFacebook } = await import("@/lib/facebook.server");
        const { origemPublica } = await import("@/lib/google-oauth.server");
        if (!facebookConfigurado())
          return new Response(null, {
            status: 302,
            headers: {
              Location:
                "/admin/instagram?fb=erro&msg=" +
                encodeURIComponent("Falta META_APP_ID / META_APP_SECRET no hPanel"),
            },
          });
        const state = crypto.randomBytes(16).toString("hex");
        const seguro = origemPublica(request).startsWith("https:") ? "; Secure" : "";
        return new Response(null, {
          status: 302,
          headers: {
            Location: urlConectarFacebook(origemPublica(request), state),
            "Set-Cookie": `ap_fb_state=${state}; Path=/api/admin/facebook; Max-Age=600; HttpOnly; SameSite=Lax${seguro}`,
          },
        });
      },
    },
  },
});
