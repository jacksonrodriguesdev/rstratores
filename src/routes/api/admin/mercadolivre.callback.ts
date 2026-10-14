import { createFileRoute } from "@tanstack/react-router";

// Volta do login do Mercado Livre (app do lojista): troca o código pelo token e volta ao admin.
// Este endereço tem que estar cadastrado no app do ML como "URI de redirect".
export const Route = createFileRoute("/api/admin/mercadolivre/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const voltar = (q: string) =>
          new Response(null, { status: 302, headers: { Location: `/admin/pesquisa-precos?${q}` } });
        const { requireAdmin } = await import("@/lib/auth.server");
        const negado = await requireAdmin(request);
        if (negado) return negado;
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        if (!code)
          return voltar(
            `ml=erro&msg=${encodeURIComponent(url.searchParams.get("error_description") || "sem código")}`,
          );
        try {
          const { trocarCodigoML } = await import("@/lib/pesquisa-precos.server");
          const { origemPublica } = await import("@/lib/google-oauth.server");
          await trocarCodigoML(code, `${origemPublica(request)}/api/admin/mercadolivre/callback`);
          return voltar("ml=ok");
        } catch (e: any) {
          return voltar(`ml=erro&msg=${encodeURIComponent(String(e?.message ?? e))}`);
        }
      },
    },
  },
});
