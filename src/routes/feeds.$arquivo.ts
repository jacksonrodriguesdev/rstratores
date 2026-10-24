import { createFileRoute } from "@tanstack/react-router";

// Feeds de produtos (Google Merchant Center): /feeds/google-merchant.xml (Uruguai, $U) e
// /feeds/google-merchant-br.xml (Sul do Brasil, R$)
export const Route = createFileRoute("/feeds/$arquivo")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const pais =
          params.arquivo === "google-merchant.xml"
            ? "UY"
            : params.arquivo === "google-merchant-br.xml"
              ? "BR"
              : null;
        if (!pais) return new Response("Not found", { status: 404 });
        const { feedGoogle } = await import("@/lib/feed-google.server");
        const { xml } = await feedGoogle(pais);
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
