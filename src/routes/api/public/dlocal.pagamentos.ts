import { createFileRoute } from "@tanstack/react-router";

// Aviso da dLocal quando um pagamento muda (pago, recusado, vencido…). A assinatura é conferida
// sobre o corpo bruto; o status aplicado é o que a dLocal confirma na consulta.
export const Route = createFileRoute("/api/public/dlocal/pagamentos")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const corpo = (await request.text()).slice(0, 200_000);
        const { avisoAutentico } = await import("@/lib/dlocal.server");
        const { receberAviso } = await import("@/lib/pagamentos.server");
        const r = await receberAviso(corpo, avisoAutentico(corpo, request.headers));
        return Response.json({ ok: r.ok }, { status: r.status });
      },
    },
  },
});
