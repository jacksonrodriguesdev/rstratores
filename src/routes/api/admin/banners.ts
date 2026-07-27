import { createFileRoute } from "@tanstack/react-router";
import { createBanner } from "@/lib/banners.server";

export const Route = createFileRoute("/api/admin/banners")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json();
          await createBanner(body);
          
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
