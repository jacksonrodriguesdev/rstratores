import { createFileRoute } from "@tanstack/react-router";

// Volta do login do Facebook: confere o state e guarda os tokens (criptografados).
export const Route = createFileRoute("/api/admin/facebook/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const voltar = (q: string) =>
          new Response(null, {
            status: 302,
            headers: {
              Location: `/admin/instagram?${q}`,
              "Set-Cookie": "ap_fb_state=; Path=/api/admin/facebook; Max-Age=0",
            },
          });
        const { requireAdmin } = await import("@/lib/auth.server");
        const negado = await requireAdmin(request);
        if (negado) return negado;
        const url = new URL(request.url);
        const cookie = (request.headers.get("cookie") || "").match(
          /(?:^|;\s*)ap_fb_state=([a-f0-9]+)/,
        )?.[1];
        if (!cookie || cookie !== url.searchParams.get("state"))
          return voltar(
            "fb=erro&msg=" + encodeURIComponent("Sessão expirada. Tente conectar de novo."),
          );
        const code = url.searchParams.get("code");
        if (!code)
          return voltar(
            "fb=erro&msg=" +
              encodeURIComponent(
                url.searchParams.get("error_description") || "Autorização cancelada.",
              ),
          );
        try {
          const { concluirFacebook } = await import("@/lib/facebook.server");
          const { origemPublica } = await import("@/lib/google-oauth.server");
          const r = await concluirFacebook(code, origemPublica(request));
          return voltar(`fb=ok&paginas=${r.paginas}&contas=${r.contas}`);
        } catch (e: any) {
          return voltar("fb=erro&msg=" + encodeURIComponent(e?.message || "Falha ao conectar"));
        }
      },
    },
  },
});
