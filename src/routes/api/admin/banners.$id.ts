import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/banners/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        try {
          const { id } = params;
          const body = await request.json();
          const { updateBanner } = await import("@/lib/banners.server");
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
          const { deleteBanner } = await import("@/lib/banners.server");
          await deleteBanner(Number(id));
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
      },
    },
  },
});
