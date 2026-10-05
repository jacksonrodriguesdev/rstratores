import { createFileRoute } from "@tanstack/react-router";
import * as fs from "fs/promises";
import * as path from "path";

export const Route = createFileRoute("/api/admin/products/upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { requireAdmin } = await import("@/lib/auth.server");
        const denied = await requireAdmin(request);
        if (denied) return denied;
        try {
          const formData = await request.formData();
          const files = formData.getAll("files") as File[];

          if (!files || files.length === 0) {
            return new Response(JSON.stringify({ error: "No files uploaded" }), { status: 400 });
          }

          const uploadedPaths: string[] = [];

          for (const file of files) {
            const buffer = Buffer.from(await file.arrayBuffer());
            const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
            const relativePath = `produtos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

            const { caminhoUpload } = await import("@/lib/uploads.server");
          const dest = caminhoUpload(relativePath);
            await fs.mkdir(path.dirname(dest), { recursive: true });
            await fs.writeFile(dest, buffer);

            uploadedPaths.push(relativePath);
          }

          return new Response(JSON.stringify({ paths: uploadedPaths }), {
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
