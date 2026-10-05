import type { SessionPayload } from "./auth";
import { SignJWT, jwtVerify } from "jose";
import { deleteCookie, getEvent } from "vinxi/http";
import { getCookie } from "@tanstack/start-server-core";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "fallback-super-secret-key-12345",
);

export const AUTH_COOKIE = "rstrator_auth";



export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);

  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const token = getCookie(AUTH_COOKIE);
    console.log("[getSession] token exists?", !!token);
    if (!token) return null;

    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as SessionPayload;
  } catch (err) {
    console.error("getSession error:", err);
    return null;
  }
}

export function destroySession() {
  const event = getEvent();
  deleteCookie(event, AUTH_COOKIE, { path: "/" });
}