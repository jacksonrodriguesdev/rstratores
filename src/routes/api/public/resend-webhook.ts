import { createFileRoute } from "@tanstack/react-router";

// Webhook do Resend: entregue, aberto, clicado, rebote, queixa de spam.
// No Resend: Webhooks → Add endpoint → https://<domínio>/api/public/resend-webhook,
// e copie o "Signing secret" (whsec_...) para RESEND_WEBHOOK_SECRET na Hostinger.
export const Route = createFileRoute("/api/public/resend-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const corpo = await request.text();
        const { webhookValido, registrarEventoWebhook } = await import("@/lib/email.server");
        if (!webhookValido(corpo, request.headers)) return new Response("assinatura inválida", { status: 401 });
        try {
          await registrarEventoWebhook(JSON.parse(corpo));
        } catch (e) {
          console.error("resend webhook:", e);
        }
        return Response.json({ ok: true });
      },
    },
  },
});
