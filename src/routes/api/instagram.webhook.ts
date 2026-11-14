import { createFileRoute } from "@tanstack/react-router";

// Webhook do Instagram (comentários em tempo real). Configurar na Meta:
//   Callback URL: https://agropartsuy.com/api/instagram/webhook
//   Verify token: valor de INSTAGRAM_WEBHOOK_TOKEN
//   Campo: "comments"
// Assina com o App Secret (X-Hub-Signature-256), conferido abaixo quando houver secret.
export const Route = createFileRoute("/api/instagram/webhook")({
  server: {
    handlers: {
      // Verificação do webhook (a Meta chama uma vez ao configurar)
      GET: async ({ request }) => {
        const u = new URL(request.url);
        const mode = u.searchParams.get("hub.mode");
        const token = u.searchParams.get("hub.verify_token");
        const challenge = u.searchParams.get("hub.challenge") ?? "";
        const esperado = process.env.INSTAGRAM_WEBHOOK_TOKEN;
        if (mode === "subscribe" && esperado && token === esperado)
          return new Response(challenge, {
            status: 200,
            headers: { "Content-Type": "text/plain" },
          });
        return new Response("forbidden", { status: 403 });
      },
      // Eventos (comentários novos)
      POST: async ({ request }) => {
        const corpo = await request.text();
        // Confere a assinatura do App Secret, se configurado (evita eventos falsos)
        const segredo = process.env.INSTAGRAM_APP_SECRET?.trim();
        if (segredo) {
          const assinatura = request.headers.get("x-hub-signature-256") || "";
          const { createHmac, timingSafeEqual } = await import("crypto");
          const esperada = "sha256=" + createHmac("sha256", segredo).update(corpo).digest("hex");
          const a = Buffer.from(assinatura);
          const b = Buffer.from(esperada);
          if (a.length !== b.length || !timingSafeEqual(a, b))
            return new Response("invalid signature", { status: 403 });
        }
        try {
          const j = JSON.parse(corpo);
          const { processarComentarioWebhook } = await import("@/lib/instagram-dm.server");
          for (const entry of j.entry ?? []) {
            for (const ch of entry.changes ?? []) {
              if (ch.field !== "comments") continue;
              const v = ch.value ?? {};
              await processarComentarioWebhook({
                mediaId: String(v.media?.id ?? ""),
                commentId: String(v.id ?? ""),
                texto: String(v.text ?? ""),
                username: v.from?.username ?? null,
                igUserId: v.from?.id ? String(v.from.id) : null,
              });
            }
          }
        } catch {
          /* corpo inválido: ignora, mas responde 200 para a Meta não repetir */
        }
        return new Response("EVENT_RECEIVED", { status: 200 });
      },
    },
  },
});
