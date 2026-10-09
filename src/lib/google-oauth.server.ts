// Login com Google (OAuth 2.0 / OpenID Connect), sem biblioteca extra.
// Precisa de GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET (Google Cloud Console > Credenciais >
// ID do cliente OAuth, tipo "Aplicativo da Web"), com o URI de redirecionamento
// https://<seu domínio>/api/auth/google/callback cadastrado lá.
import crypto from "crypto";
import { createRemoteJWKSet, jwtVerify } from "jose";

export const googleConfigurado = () => !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

const COOKIE = "ap_google_oauth";
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

// Origem pública do site (atrás do proxy da Hostinger a requisição chega por http)
export function origemPublica(request: Request): string {
  const u = new URL(request.url);
  const proto = request.headers.get("x-forwarded-proto")?.split(",")[0].trim() || u.protocol.replace(":", "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || u.host;
  return `${proto}://${host}`;
}
const callback = (request: Request) => `${origemPublica(request)}/api/auth/google/callback`;

const lerCookie = (request: Request, nome: string) => {
  for (const p of (request.headers.get("cookie") || "").split(";")) {
    const [k, ...v] = p.trim().split("=");
    if (k === nome) return decodeURIComponent(v.join("="));
  }
  return null;
};
const segura = (request: Request) => origemPublica(request).startsWith("https:");

// 1) Manda o usuário ao Google, guardando state/nonce/destino num cookie curto
export function iniciarGoogle(request: Request, destino: string): Response {
  const state = crypto.randomBytes(16).toString("hex");
  const nonce = crypto.randomBytes(16).toString("hex");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: callback(request),
    response_type: "code",
    scope: "openid email profile",
    state,
    nonce,
    prompt: "select_account",
  }).toString();
  const valor = encodeURIComponent(JSON.stringify({ state, nonce, destino }));
  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      "Set-Cookie": `${COOKIE}=${valor}; Path=/api/auth/google; Max-Age=600; HttpOnly; SameSite=Lax${segura(request) ? "; Secure" : ""}`,
    },
  });
}

export type PerfilGoogle = { sub: string; email: string; nome: string; foto: string | null };

// 2) Volta do Google: confere state, troca o code pelo id_token e valida a assinatura
export async function concluirGoogle(request: Request): Promise<{ perfil: PerfilGoogle; destino: string }> {
  const u = new URL(request.url);
  const salvo = (() => {
    try {
      return JSON.parse(lerCookie(request, COOKIE) || "null");
    } catch {
      return null;
    }
  })();
  if (u.searchParams.get("error")) throw new Error("cancelado");
  if (!salvo || !u.searchParams.get("state") || u.searchParams.get("state") !== salvo.state) throw new Error("state inválido");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: u.searchParams.get("code") || "",
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: callback(request),
      grant_type: "authorization_code",
    }),
  });
  const tokens = await res.json();
  if (!res.ok || !tokens.id_token) throw new Error("troca do código falhou");

  const { payload } = await jwtVerify(tokens.id_token, JWKS, {
    issuer: ["https://accounts.google.com", "accounts.google.com"],
    audience: process.env.GOOGLE_CLIENT_ID!,
  });
  if (payload.nonce !== salvo.nonce) throw new Error("nonce inválido");
  if (!payload.email || payload.email_verified !== true) throw new Error("e-mail do Google não verificado");
  return {
    perfil: {
      sub: String(payload.sub),
      email: String(payload.email).toLowerCase(),
      nome: String(payload.name || payload.given_name || String(payload.email).split("@")[0]),
      foto: typeof payload.picture === "string" ? payload.picture : null,
    },
    destino: salvo.destino || "/cuenta",
  };
}

export const limparCookieGoogle = (request: Request) =>
  `${COOKIE}=; Path=/api/auth/google; Max-Age=0; HttpOnly; SameSite=Lax${segura(request) ? "; Secure" : ""}`;
