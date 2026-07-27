import { createFileRoute } from "@tanstack/react-router";
import { updateBanner, deleteBanner } from "@/lib/banners.server";

export const Route = createFileRoute("/api/admin/banners/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        try {
          const { id } = params;
          const body = await request.json();
          await updateBanner(Number(id), body);
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
      },
      DELETE: async ({ params }) => {
        try {
          const { id } = params;
          await deleteBanner(Number(id));
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
      }
    },
  },
});
