import { createFileRoute } from "@tanstack/react-router";

// Volta da Meta: confere o state, troca o código pelo token de 60 dias (guardado criptografado).
export const Route = createFileRoute("/api/admin/instagram/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const voltar = (q: string) =>
          new Response(null, {
            status: 302,
            headers: {
              Location: `/admin/instagram?${q}`,
              "Set-Cookie": "ap_ig_state=; Path=/api/admin/instagram; Max-Age=0",
            },
          });
        const { requireAdmin } = await import("@/lib/auth.server");
        const negado = await requireAdmin(request);
        if (negado) return negado;
        const url = new URL(request.url);
        const cookie = (request.headers.get("cookie") || "").match(
          /(?:^|;\s*)ap_ig_state=([a-f0-9]+)/,
        )?.[1];
        if (!cookie || cookie !== url.searchParams.get("state"))
          return voltar(
            "ig=erro&msg=" + encodeURIComponent("Sessão expirada. Tente conectar de novo."),
          );
        const code = url.searchParams.get("code");
        if (!code)
          return voltar(
            "ig=erro&msg=" +
              encodeURIComponent(
                url.searchParams.get("error_description") || "Autorização cancelada.",
              ),
          );
        try {
          const { concluirConexao } = await import("@/lib/instagram.server");
          const { origemPublica } = await import("@/lib/google-oauth.server");
          const r = await concluirConexao(code, origemPublica(request));
          return voltar("ig=ok&conta=" + encodeURIComponent(r.username ?? ""));
        } catch (e: any) {
          return voltar("ig=erro&msg=" + encodeURIComponent(e?.message || "Falha ao conectar"));
        }
      },
    },
  },
});
