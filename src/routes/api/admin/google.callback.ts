import { createFileRoute } from "@tanstack/react-router";

// Volta do Google: confere o state, guarda a autorização (só leitura) e começa a importação.
export const Route = createFileRoute("/api/admin/google/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const voltar = (q: string) =>
          new Response(null, {
            status: 302,
            headers: {
              Location: `/admin/google?${q}`,
              "Set-Cookie": "ap_gsc_state=; Path=/api/admin/google; Max-Age=0",
            },
          });
        const { requireAdmin } = await import("@/lib/auth.server");
        const negado = await requireAdmin(request);
        if (negado) return negado;
        const url = new URL(request.url);
        const cookie = (request.headers.get("cookie") || "").match(
          /(?:^|;\s*)ap_gsc_state=([a-f0-9]+(?:-ads)?)/,
        )?.[1];
        if (!cookie || cookie !== url.searchParams.get("state"))
          return voltar(
            "gsc=erro&msg=" + encodeURIComponent("Sessão expirada. Tente conectar de novo."),
          );
        const code = url.searchParams.get("code");
        if (!code)
          return voltar(
            "gsc=erro&msg=" +
              encodeURIComponent(url.searchParams.get("error") || "sem autorização"),
          );
        // Central de Anúncios: conexão do Google Ads (state termina em "-ads")
        if (cookie.endsWith("-ads")) {
          const ir = (q: string) =>
            new Response(null, {
              status: 302,
              headers: {
                Location: `/admin/ads?${q}`,
                "Set-Cookie": "ap_gsc_state=; Path=/api/admin/google; Max-Age=0",
              },
            });
          try {
            const { origemPublica } = await import("@/lib/google-oauth.server");
            const g = await import("@/lib/ads-google.server");
            await g.concluirConexaoAds(code, `${origemPublica(request)}/api/admin/google/callback`);
            const ads = await import("@/lib/ads.server");
            ads
              .sincronizarPlataforma("GOOGLE")
              .catch((e) => console.error("Google Ads:", e?.message ?? e));
            return ir("gads=ok");
          } catch (e: any) {
            return ir("gads=erro&msg=" + encodeURIComponent(String(e?.message ?? e)));
          }
        }
        try {
          const { origemPublica } = await import("@/lib/google-oauth.server");
          const sc = await import("@/lib/search-console.server");
          const r = await sc.concluirConexao(
            code,
            `${origemPublica(request)}/api/admin/google/callback`,
          );
          if (!r.site)
            return voltar(
              "gsc=erro&msg=" +
                encodeURIComponent(
                  "Esta conta Google não tem acesso a nenhuma propriedade do Search Console.",
                ),
            );
          // Primeira importação (até 16 meses) em segundo plano
          sc.sincronizar().catch((e) => console.error("Search Console:", e?.message ?? e));
          return voltar("gsc=ok");
        } catch (e: any) {
          return voltar("gsc=erro&msg=" + encodeURIComponent(String(e?.message ?? e)));
        }
      },
    },
  },
});
