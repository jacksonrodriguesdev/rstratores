import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { SITE_URL, DOMINIOS_ALIAS } from "./lib/site";
import { comPrefixo, tirarPrefixo } from "./lib/idioma";

// www e domínios antigos -> domínio principal (301), mantendo o caminho
function redirecionarAlias(request: Request): Response | null {
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "")
    .split(",")[0]
    .trim()
    .toLowerCase()
    .replace(/:\d+$/, "");
  if (!DOMINIOS_ALIAS.includes(host)) return null;
  const u = new URL(request.url);
  return new Response(null, {
    status: 301,
    headers: { Location: `${SITE_URL}${u.pathname}${u.search}` },
  });
}

// Cabeçalhos de segurança em todas as respostas (páginas, APIs, arquivos):
// - HSTS: o navegador passa a usar sempre https neste domínio (180 dias; sem subdomínios);
// - nenhum outro site pode abrir o nosso dentro de uma moldura (golpe de clique escondido);
// - o navegador não adivinha o tipo do arquivo (um upload não vira script);
// - links para fora levam só o domínio, não o endereço completo;
// - câmera, microfone e localização desligados (o site não usa).
// Pagamentos (dLocal/Stripe) e prévias da Meta são iframes DE outros sites dentro do nosso: seguem
// funcionando.
const SEGURANCA: Record<string, string> = {
  "Strict-Transport-Security": "max-age=15552000",
  "X-Frame-Options": "SAMEORIGIN",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};
function comSeguranca(response: Response): Response {
  let r = response;
  for (const [k, v] of Object.entries(SEGURANCA)) {
    if (r.headers.has(k)) continue;
    try {
      r.headers.set(k, v);
    } catch {
      // Cabeçalhos imutáveis (ex.: resposta de fetch repassada): copia a resposta
      r = new Response(r.body, r);
      r.headers.set(k, v);
    }
  }
  // Moldura: também pela regra moderna (CSP), sem mexer na política que a CDN já envia
  if (!r.headers.get("content-security-policy")?.includes("frame-ancestors"))
    r.headers.append("Content-Security-Policy", "frame-ancestors 'self'");
  return r;
}

// Versão em português com endereço em espanhol ("/pt/repuestos/sellos-y-juntas", como era antes)
// -> endereço em português ("/pt/pecas/vedacoes"), 301, mantendo a busca (?...). Links antigos,
// favoritos e o que o Google já indexou passam para o endereço novo.
function redirecionarCaminhoPt(request: Request): Response | null {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const u = new URL(request.url);
  const atual = u.pathname;
  if (!atual.startsWith("/pt/")) return null;
  const certo = comPrefixo(tirarPrefixo(atual), "pt");
  // Barra no fim fica com o tratamento que já existe
  if (certo === atual || certo === atual.replace(/\/+$/, "")) return null;
  return new Response(null, {
    status: 301,
    headers: { Location: `${SITE_URL}${certo}${u.search}` },
  });
}

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

// Automações de e-mail: o agendador começa junto com o primeiro acesso ao servidor
let agendadorIniciado = false;
function iniciarAutomacoes() {
  if (agendadorIniciado) return;
  agendadorIniciado = true;
  // Colunas novas das tabelas de e-mail já no primeiro acesso (antes de qualquer tela ler os envios)
  import("./lib/email.server")
    .then((m) => m.garantirColunasEmail())
    .catch((e) => console.error("colunas de e-mail", e));
  import("./lib/automacoes.server")
    .then((m) => m.iniciarAgendador())
    .catch((e) => console.error("automações", e));
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    iniciarAutomacoes();
    const alias = redirecionarAlias(request);
    if (alias) return comSeguranca(alias);
    const pt = redirecionarCaminhoPt(request);
    if (pt) return comSeguranca(pt);
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return comSeguranca(await normalizeCatastrophicSsrResponse(response));
    } catch (error) {
      console.error(error);
      return comSeguranca(
        new Response(renderErrorPage(), {
          status: 500,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
      );
    }
  },
};
