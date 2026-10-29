import { createFileRoute } from "@tanstack/react-router";
import { idiomaDaRequisicao } from "@/lib/idioma-servidor";

// Pop-up: deixar só o celular (sem conta). Devolve o cupom de boas-vindas; o site guarda que este
// aparelho já deixou o contato e o WhatsApp de preço passa a abrir direto.
export const Route = createFileRoute("/api/public/contato-whatsapp")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const idioma = idiomaDaRequisicao(request);
        const t = (es: string, pt: string) => (idioma === "pt" ? pt : es);
        try {
          const body = await request.json().catch(() => ({}));
          // Campo escondido: só robô preenche
          if (body.site) return Response.json({ ok: true, cupom: null });
          const ip =
            request.headers.get("cf-connecting-ip") ||
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            "?";
          const { registrarContato, ipLiberado } = await import("@/lib/contato-whatsapp.server");
          if (!ipLiberado(ip))
            return Response.json(
              {
                error: t(
                  "Muchos intentos seguidos. Probá de nuevo en unos minutos.",
                  "Muitas tentativas seguidas. Tente de novo em alguns minutos.",
                ),
              },
              { status: 429 },
            );
          const r = await registrarContato({
            telefone: String(body.telefone ?? "").slice(0, 30),
            nome: body.nome,
            idioma,
            motivo: body.motivo,
            pagina: body.pagina,
            interesse: body.interesse,
            visitorId: body.visitorId,
          });
          if ("erro" in r)
            return Response.json(
              {
                error: t(
                  "Revisá el celular: 09X XXX XXX (Uruguay) o con DDD (Brasil).",
                  "Confira o celular: com DDD, ex.: (53) 99999-9999.",
                ),
              },
              { status: 400 },
            );
          return Response.json({ ok: true, cupom: r.cupom, usado: r.usado, nome: r.nome, novo: r.novo });
        } catch (e) {
          console.error("contato-whatsapp:", e);
          return Response.json(
            { error: t("Algo salió mal. Probá de nuevo.", "Algo deu errado. Tente de novo.") },
            { status: 500 },
          );
        }
      },
    },
  },
});
