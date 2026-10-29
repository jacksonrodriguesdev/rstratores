import { createFileRoute } from "@tanstack/react-router";

// Feeds de produtos (Google Merchant Center): /feeds/google-merchant.xml (Uruguai, $U) e
// /feeds/google-merchant-br.xml (Sul do Brasil, R$). Catálogo do Meta (anúncios da peça vista, só
// Uruguai): /feeds/meta-catalogo.xml
export const Route = createFileRoute("/feeds/$arquivo")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const meta = params.arquivo === "meta-catalogo.xml";
        const pais =
          params.arquivo === "google-merchant.xml" || meta
            ? "UY"
            : params.arquivo === "google-merchant-br.xml"
              ? "BR"
              : null;
        if (!pais) return new Response("Not found", { status: 404 });
        const { feedGoogle } = await import("@/lib/feed-google.server");
        const { xml } = await feedGoogle(pais, meta ? "meta" : "google");
        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml; charset=utf-8",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
