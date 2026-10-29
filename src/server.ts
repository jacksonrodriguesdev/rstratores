import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { SITE_URL, DOMINIOS_ALIAS } from "./lib/site";

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
    if (alias) return alias;
    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
