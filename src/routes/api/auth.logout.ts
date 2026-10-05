import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const { AUTH_COOKIE } = await import("@/lib/auth.server");
          return new Response(JSON.stringify({ success: true }), {
            status: 200,
            headers: {
              "Set-Cookie": `${AUTH_COOKIE}=; Path=/; HttpOnly; Max-Age=0; SameSite=Lax`,
            },
          });
        } catch (err: any) {
          return new Response(JSON.stringify({ error: err.message }), { status: 500 });
        }
      },
    },
  },
});
