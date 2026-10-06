import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/categories")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { requireAdmin } = await import("@/lib/auth.server");
        const denied = await requireAdmin(request);
        if (denied) return denied;
        try {
          const body = await request.json();
          const { createCategory } = await import("@/lib/categories.server");
          const cat = await createCategory(body);
          return Response.json(cat);
        } catch (e: any) {
          return Response.json({ error: e.message }, { status: 400 });
        }
      },
    },
  },
});
