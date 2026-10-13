import { createFileRoute } from "@tanstack/react-router";

// Feeds de produtos: /feeds/google-merchant.xml (Google Merchant Center)
export const Route = createFileRoute("/feeds/$arquivo")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (params.arquivo !== "google-merchant.xml") return new Response("Not found", { status: 404 });
        const { feedGoogle } = await import("@/lib/feed-google.server");
        const { xml } = await feedGoogle();
        return new Response(xml, {
          headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
