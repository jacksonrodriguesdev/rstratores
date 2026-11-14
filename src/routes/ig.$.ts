import { createFileRoute } from "@tanstack/react-router";

// Link do DM da campanha (/ig/<id>): grava um cookie com a campanha e manda pro cadastro.
// Ao criar a conta, o cliente ganha o prêmio (ver resgatarIgDm em instagram-dm.server.ts).
export const Route = createFileRoute("/ig/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const id = Number(String(params._splat ?? "").replace(/\D/g, ""));
        const headers = new Headers({ Location: "/cadastro" });
        if (id) headers.append("Set-Cookie", `igdm=${id}; Path=/; Max-Age=2592000; SameSite=Lax`);
        return new Response(null, { status: 302, headers });
      },
    },
  },
});
