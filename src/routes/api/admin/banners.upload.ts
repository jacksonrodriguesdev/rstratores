import { createFileRoute } from "@tanstack/react-router";
import * as fs from "fs/promises";
import * as path from "path";

export const Route = createFileRoute("/api/admin/banners/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { requireAdmin } = await import("@/lib/auth.server");
        const denied = await requireAdmin(request);
        if (denied) return denied;
        try {
          const formData = await request.formData();
          const file = formData.get("file") as File;
          const kind = formData.get("kind") as string;

          if (!file || !kind) {
            return new Response(JSON.stringify({ error: "Missing file or kind" }), { status: 400 });
          }

          const buffer = Buffer.from(await file.arrayBuffer());
          const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
          const relativePath = `site/${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

          const dest = path.join(process.cwd(), "public", "uploads", relativePath);
          await fs.mkdir(path.dirname(dest), { recursive: true });
          await fs.writeFile(dest, buffer);

          return new Response(JSON.stringify({ path: relativePath }), {
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
