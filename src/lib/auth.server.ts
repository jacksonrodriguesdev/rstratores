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
