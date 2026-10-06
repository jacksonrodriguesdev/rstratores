import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/admin/categories/$id")({
  server: {
    handlers: {
      PATCH: async ({ request, params }) => {
        const { requireAdmin } = await import("@/lib/auth.server");
        const denied = await requireAdmin(request);
        if (denied) return denied;
        try {
          const body = await request.json();
          const { updateCategory } = await import("@/lib/categories.server");
          const cat = await updateCategory(Number(params.id), body);
          return Response.json(cat);
        } catch (e: any) {
          return Response.json({ error: e.message }, { status: 400 });
        }
      },
      DELETE: async ({ request, params }) => {
        const { requireAdmin } = await import("@/lib/auth.server");
        const denied = await requireAdmin(request);
        if (denied) return denied;
        try {
          const mover = new URL(request.url).searchParams.get("mover_para");
          const { deleteCategory } = await import("@/lib/categories.server");
          const r = await deleteCategory(Number(params.id), mover ? Number(mover) : null);
          return Response.json({ success: true, ...r });
        } catch (e: any) {
          return Response.json({ error: e.message }, { status: 400 });
        }
      },
    },
  },
});
