import { createFileRoute } from "@tanstack/react-router";

// Notificações push do app: GET devolve a chave pública; POST inscreve, cancela ou conta clique.
const porIp = new Map<string, number[]>();

export const Route = createFileRoute("/api/public/push")({
  server: {
    handlers: {
      GET: async () => {
        try {
          const { chavesVapid } = await import("@/lib/push.server");
          return Response.json({ chave: (await chavesVapid()).publica });
        } catch (e) {
          console.error("push: chave", e);
          return Response.json({ error: "indisponível" }, { status: 503 });
        }
      },
      POST: async ({ request }) => {
        try {
          const ip =
            request.headers.get("cf-connecting-ip") ||
            request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
            "?";
          const agora = Date.now();
          const l = (porIp.get(ip) ?? []).filter((x) => agora - x < 10 * 60_000);
          if (l.length >= 30) return Response.json({ error: "muitos" }, { status: 429 });
          porIp.set(ip, [...l, agora]);
          if (porIp.size > 5000) porIp.clear();

          const body = await request.json().catch(() => ({}));
          const push = await import("@/lib/push.server");
          if (body.acao === "clique") {
            const id = Number(body.envio);
            if (Number.isInteger(id) && id > 0) await push.registrarClique(id);
            return Response.json({ ok: true });
          }
          if (!push.inscricaoValida(body.inscricao))
            return Response.json({ error: "inscrição inválida" }, { status: 400 });
          if (body.acao === "cancelar") {
            await push.cancelar(body.inscricao.endpoint);
            return Response.json({ ok: true });
          }
          const { getSessionFromRequest } = await import("@/lib/auth.server");
          const sessao = await getSessionFromRequest(request).catch(() => null);
          await push.inscrever({
            inscricao: body.inscricao,
            userId: sessao?.id ? Number(sessao.id) || null : null,
            visitorId: typeof body.visitorId === "string" ? body.visitorId : null,
            idioma: body.idioma === "pt" ? "pt" : "es",
            aparelho: typeof body.aparelho === "string" ? body.aparelho : null,
          });
          return Response.json({ ok: true });
        } catch (e) {
          console.error("push: inscrição", e);
          return Response.json({ error: "falhou" }, { status: 500 });
        }
      },
    },
  },
});
