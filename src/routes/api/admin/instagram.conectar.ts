import { createFileRoute } from "@tanstack/react-router";
import crypto from "crypto";

// Admin → Instagram → «Conectar Instagram»: manda à tela da Meta, onde o admin entra com a conta
// do Instagram (a senha nunca passa pelo site). Volta em /api/admin/instagram/callback.
export const Route = createFileRoute("/api/admin/instagram/conectar")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { requireAdmin } = await import("@/lib/auth.server");
        const negado = await requireAdmin(request);
        if (negado) return negado;
        const { instagramConfigurado, urlConectar } = await import("@/lib/instagram.server");
        const { origemPublica } = await import("@/lib/google-oauth.server");
        if (!instagramConfigurado())
          return new Response(null, {
            status: 302,
            headers: {
              Location:
                "/admin/instagram?ig=erro&msg=" +
                encodeURIComponent("Falta INSTAGRAM_APP_ID / INSTAGRAM_APP_SECRET no hPanel"),
            },
          });
        const state = crypto.randomBytes(16).toString("hex");
        const seguro = origemPublica(request).startsWith("https:") ? "; Secure" : "";
        return new Response(null, {
          status: 302,
          headers: {
            Location: urlConectar(origemPublica(request), state),
            "Set-Cookie": `ap_ig_state=${state}; Path=/api/admin/instagram; Max-Age=600; HttpOnly; SameSite=Lax${seguro}`,
          },
        });
      },
    },
  },
});
