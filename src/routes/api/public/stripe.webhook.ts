import { createFileRoute } from "@tanstack/react-router";

// Aviso do Stripe (webhook) quando a página de pagamento é concluída, expira ou o pagamento
// assíncrono muda. A assinatura (Stripe-Signature) é conferida sobre o corpo bruto; o status
// aplicado é o que o Stripe confirma na consulta da sessão.
// Cadastrar no painel do Stripe: https://agropartsuy.com/api/public/stripe/webhook
export const Route = createFileRoute("/api/public/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const corpo = (await request.text()).slice(0, 500_000);
        const { avisoStripeAutentico } = await import("@/lib/stripe.server");
        const { receberAvisoStripe } = await import("@/lib/pagamentos.server");
        const r = await receberAvisoStripe(
          corpo,
          avisoStripeAutentico(corpo, request.headers.get("stripe-signature")),
        );
        return Response.json({ ok: r.ok }, { status: r.status });
      },
    },
  },
});
