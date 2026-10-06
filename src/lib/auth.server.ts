import type { SessionPayload } from "./auth";
import { SignJWT, jwtVerify } from "jose";
import { getCookie } from "@tanstack/start-server-core";

export const AUTH_COOKIE = "rstrator_auth";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET ausente ou curto demais (mínimo 32 caracteres) no .env");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// Para server functions (usa o contexto da requisição atual do TanStack Start).
export async function getSession(): Promise<SessionPayload | null> {
  const token = getCookie(AUTH_COOKIE);
  if (!token) return null;
  return await verifySessionToken(token);
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return null;
}

export async function getSessionFromRequest(request: Request): Promise<SessionPayload | null> {
  const token = readCookie(request, AUTH_COOKIE);
  if (!token) return null;
  return await verifySessionToken(token);
}

// Para rotas de API: retorna uma Response 401/403 se não for admin, ou null se liberado.
export async function requireAdmin(request: Request): Promise<Response | null> {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return new Response(JSON.stringify({ error: "Não autenticado." }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (session.role !== "ADMIN") {
    return new Response(JSON.stringify({ error: "Acesso negado." }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return null;
}

// Para server functions: lança erro se não for admin.
export async function assertAdmin(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") {
    throw new Error("Acesso negado.");
  }
  return session;
}

// Cookie da sessão. `Secure` quando o acesso é por HTTPS (em produção a Hostinger encaminha
// a requisição ao Node por http, então vale também o cabeçalho x-forwarded-proto).
export function cookieSessao(request: Request, token: string | null): string {
  const https =
    new URL(request.url).protocol === "https:" || request.headers.get("x-forwarded-proto") === "https";
  const valor = token ? `${AUTH_COOKIE}=${token}; Max-Age=${60 * 60 * 24 * 7}` : `${AUTH_COOKIE}=; Max-Age=0`;
  return `${valor}; Path=/; HttpOnly; SameSite=Lax${https ? "; Secure" : ""}`;
}

// Limite de tentativas de login por IP + e-mail (em memória): atrasa quem tenta adivinhar senhas.
const tentativas = new Map<string, { n: number; desde: number }>();
const JANELA = 15 * 60 * 1000;
const MAX_TENTATIVAS = 8;

function chaveTentativa(request: Request, email: string) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() || request.headers.get("x-real-ip") || "local";
  return `${ip}|${email.toLowerCase()}`;
}

export function loginBloqueado(request: Request, email: string): boolean {
  const t = tentativas.get(chaveTentativa(request, email));
  if (!t) return false;
  if (Date.now() - t.desde > JANELA) {
    tentativas.delete(chaveTentativa(request, email));
    return false;
  }
  return t.n >= MAX_TENTATIVAS;
}

export function registrarFalhaLogin(request: Request, email: string) {
  const chave = chaveTentativa(request, email);
  const t = tentativas.get(chave);
  if (!t || Date.now() - t.desde > JANELA) tentativas.set(chave, { n: 1, desde: Date.now() });
  else t.n++;
  // Evita crescer sem limite
  if (tentativas.size > 5000) tentativas.clear();
}

export function limparFalhasLogin(request: Request, email: string) {
  tentativas.delete(chaveTentativa(request, email));
}
