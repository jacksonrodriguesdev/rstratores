import { createFileRoute } from "@tanstack/react-router";
import { AUTH_COOKIE } from "@/lib/auth.server";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async () => {
        try {
          return new Response(JSON.stringify({ success: true }), { 
            status: 200,
            headers: {
              "Set-Cookie": `${AUTH_COOKIE}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`
            }
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
      }
    }
  }
});
