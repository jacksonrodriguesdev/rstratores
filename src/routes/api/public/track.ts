import { createFileRoute } from "@tanstack/react-router";

// Recebe cada página vista e cada evento (clique no WhatsApp, busca) do VisitTracker.
// Grava localização (pelo IP, que não é guardado), origem, aparelho e sessão.
const texto = (v: unknown, max: number) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

export const Route = createFileRoute("/api/public/track")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const ok = () => Response.json({ ok: true });
        try {
          const body = (await request.json().catch(() => ({}))) as Record<string, any>;
          const ua = (request.headers.get("user-agent") ?? "").slice(0, 512);
          const r = await import("@/lib/rastreio.server");
          if (!ua || r.ehRobo(ua)) return ok();

          // Visitas do próprio admin não entram nas estatísticas
          const { getSessionFromRequest } = await import("@/lib/auth.server");
          const sessao = await getSessionFromRequest(request).catch(() => null);
          if (sessao?.role === "ADMIN") return ok();

          const path = texto(body.path, 512) ?? "/";
          const atr = (body.atribuicao && typeof body.atribuicao === "object" ? body.atribuicao : {}) as Record<string, any>;
          const ip = r.ipDaRequisicao(request);
          const [geo, { SITE_URL }] = await Promise.all([r.localizar(ip), import("@/lib/site")]);
          const origem = r.classificarOrigem(
            {
              utm_source: texto(atr.utm_source, 100) ?? undefined,
              utm_medium: texto(atr.utm_medium, 100) ?? undefined,
              utm_campaign: texto(atr.utm_campaign, 150) ?? undefined,
              gclid: !!atr.gclid,
              fbclid: !!atr.fbclid,
              referrer: texto(atr.referrer, 500) ?? undefined,
            },
            new URL(SITE_URL).hostname.replace(/^www\./, ""),
          );
          const aparelho = r.lerAparelho(ua);

          const basico = {
            path,
            // Eventos guardam a página onde aconteceram; visitas, o site de origem
            referrer: texto(body.pagina, 512) ?? texto(atr.referrer, 512),
            user_agent: ua,
            country: geo.country,
            country_code: geo.country_code,
            region: geo.region,
            city: geo.city,
          };
          const { prisma } = await import("@/lib/prisma");
          try {
            await prisma.site_visits.create({
              data: {
                ...basico,
                visitor_id: texto(body.visitorId, 64),
                session_id: texto(body.sessionId, 64),
                ip_hash: r.hashIp(ip),
                latitude: geo.latitude,
                longitude: geo.longitude,
                fonte: origem.fonte,
                meio: origem.meio,
                utm_source: texto(atr.utm_source, 100),
                utm_medium: texto(atr.utm_medium, 100),
                utm_campaign: texto(atr.utm_campaign, 150),
                referrer_host: origem.referrer_host?.slice(0, 191) ?? null,
                device: aparelho.device,
                browser: aparelho.browser,
                os: aparelho.os,
                language: texto(body.language, 20),
                entrada: !!body.entrada,
              },
            });
          } catch (e: any) {
            // Banco sem as colunas novas (scripts/importacao/rastreio_producao.sql ainda não rodado):
            // grava o básico para não perder a visita
            if (!/column|does not exist|Unknown/i.test(String(e?.message))) throw e;
            await prisma.site_visits.create({ data: basico });
          }
          return ok();
        } catch (err) {
          console.error("track error", err);
          return ok();
        }
      },
    },
  },
});
