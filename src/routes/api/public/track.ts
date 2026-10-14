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
          const comum = {
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
            user_id: sessao?.id ? Number(sessao.id) || null : null,
          };
          // Eventos (WhatsApp, busca, clique...) vão para a tabela própria; páginas, para site_visits
          const { lerCaminhoEvento, garantirTabelas } = await import("@/lib/eventos-db.server");
          const ev = lerCaminhoEvento(path);
          let gravado = false;
          if (ev) {
            try {
              await garantirTabelas();
              await prisma.site_eventos.create({
                data: {
                  ...comum,
                  tipo: ev.tipo,
                  dado: ev.dado,
                  pagina: basico.referrer,
                  city: geo.city?.slice(0, 191) ?? null,
                  region: geo.region?.slice(0, 191) ?? null,
                  country: geo.country?.slice(0, 191) ?? null,
                  country_code: geo.country_code?.slice(0, 8) ?? null,
                },
              });
              gravado = true;
            } catch (e) {
              console.error("track: evento não gravado em site_eventos, vai para site_visits", e);
            }
          }
          if (!gravado) try {
            // (se cair aqui, a migração automática move o evento para site_eventos depois)
            await prisma.site_visits.create({ data: { ...basico, ...comum, entrada: !!body.entrada } });
          } catch (e: any) {
            // Banco sem as colunas novas (scripts/importacao/rastreio_producao.sql ainda não rodado):
            // grava o básico para não perder a visita
            if (!/column|does not exist|Unknown/i.test(String(e?.message))) throw e;
            await prisma.site_visits.create({ data: basico });
          }
          // Entrou/cadastrou pelo pop-up: as buscas e visitas anteriores deste aparelho passam a ser dele
          // (a automação "Busca sem resultado" avisa quando a peça chegar)
          const vid = texto(body.visitorId, 64);
          if (sessao?.id && vid && /^\/_evento\/popup\/(cadastro|login)/.test(path)) {
            await prisma.site_visits
              .updateMany({ where: { visitor_id: vid, user_id: null }, data: { user_id: Number(sessao.id) } })
              .catch(() => {});
            await prisma.site_eventos
              .updateMany({ where: { visitor_id: vid, user_id: null }, data: { user_id: Number(sessao.id) } })
              .catch(() => {});
          }
          // Pedido pelo WhatsApp = Lead também pela API de Conversões do Meta (mesmo event_id do Pixel)
          const tipoEvento = path.startsWith("/_evento/") ? path.split("/")[2] : null;
          if (tipoEvento === "whatsapp" || tipoEvento === "cotacao") {
            const { enviarEventoMeta, cookiesMeta } = await import("@/lib/conversoes.server");
            const u = sessao?.id ? await prisma.users.findUnique({ where: { id: Number(sessao.id) } }).catch(() => null) : null;
            void enviarEventoMeta({
              evento: "Lead",
              eventId: texto(body.eventId, 100),
              pessoa: u ? { email: u.email, telefone: u.telefone, nome: u.nome_completo, userId: u.id, cidade: u.cidade } : {},
              navegador: { ip, ua, ...cookiesMeta(request), url: `${SITE_URL}${texto(body.pagina, 512) ?? "/"}` },
              dados: { content_name: tipoEvento === "cotacao" ? "carrito" : "whatsapp" },
            }).catch(() => {});
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
