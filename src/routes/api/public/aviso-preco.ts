import { createFileRoute } from "@tanstack/react-router";
import { idiomaDaRequisicao } from "@/lib/idioma-servidor";

// «Avisame cuando baje el precio» (página da peça): WhatsApp ou e-mail; logado, basta o toque.
const porIp = new Map<string, number[]>();

export const Route = createFileRoute("/api/public/aviso-preco")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const idioma = idiomaDaRequisicao(request);
        const t = (es: string, pt: string) => (idioma === "pt" ? pt : es);
        try {
          const body = await request.json().catch(() => ({}));
          // Campo escondido: só robô preenche
          if (body.site) return Response.json({ ok: true });
          const ip =
            request.headers.get("cf-connecting-ip") ||
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            "?";
          const agora = Date.now();
          const l = (porIp.get(ip) ?? []).filter((x) => agora - x < 10 * 60_000);
          if (l.length >= 10)
            return Response.json(
              {
                error: t(
                  "Muchos avisos seguidos. Probá de nuevo en unos minutos.",
                  "Muitos avisos seguidos. Tente de novo em alguns minutos.",
                ),
              },
              { status: 429 },
            );
          porIp.set(ip, [...l, agora]);
          if (porIp.size > 5000) porIp.clear();

          const { getSessionFromRequest } = await import("@/lib/auth.server");
          const sessao = await getSessionFromRequest(request).catch(() => null);
          const { criarAviso } = await import("@/lib/aviso-preco.server");
          const r = await criarAviso({
            sku: String(body.sku ?? ""),
            contato: typeof body.contato === "string" ? body.contato.slice(0, 191) : "",
            userId: sessao?.id ? Number(sessao.id) : null,
            idioma,
            visitorId: typeof body.visitorId === "string" ? body.visitorId : null,
          });
          if ("erro" in r)
            return Response.json(
              {
                error:
                  r.erro === "contato"
                    ? t(
                        "Revisá el dato: un celular (09X XXX XXX) o un e-mail.",
                        "Confira o dado: um celular com DDD ou um e-mail.",
                      )
                    : t(
                        "Esta pieza no tiene precio publicado todavía.",
                        "Esta peça ainda não tem preço publicado.",
                      ),
              },
              { status: 400 },
            );
          return Response.json({ ok: true, canal: r.canal });
        } catch (e) {
          console.error("aviso-preco:", e);
          return Response.json(
            { error: t("Algo salió mal. Probá de nuevo.", "Algo deu errado. Tente de novo.") },
            { status: 500 },
          );
        }
      },
    },
  },
});
