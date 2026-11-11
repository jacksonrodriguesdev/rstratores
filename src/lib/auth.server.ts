import type { SessionPayload } from "./auth";
import { SignJWT, jwtVerify } from "jose";
import { getCookie, getRequestHeader, getRequestUrl, setCookie } from "@tanstack/start-server-core";

export const AUTH_COOKIE = "agroparts_auth";

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET ausente ou curto demais (mínimo 32 caracteres) no .env");
  }
  return new TextEncoder().encode(secret);
}

// Duração do login: cliente 7 dias; admin 12 horas (cookie do painel roubado vale pouco tempo)
// Admin e despachante (veem dados de todas as empresas): sessão curta de 12 h; cliente: 7 dias
export const PAPEIS_PAINEL = ["ADMIN", "DESPACHANTE"];
export const duracaoSessao = (role: string) =>
  PAPEIS_PAINEL.includes(role) ? 12 * 60 * 60 : 7 * 24 * 60 * 60;

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${duracaoSessao(payload.role)}s`)
    .sign(getJwtSecret());
}

// ---------- Versão da sessão (users.sessao_versao) ----------
// Cada login leva a versão do usuário no token. Trocar a senha ou "sair de todos os aparelhos"
// sobe a versão e derruba os cookies antigos. O papel (ADMIN) também vem do banco: tirar o admin
// de alguém vale na hora, sem esperar o token vencer.
// A coluna fica fora do schema do Prisma: a produção não roda db push, e um campo novo no model
// quebraria toda consulta de usuários até a coluna existir. Ela é criada aqui, na primeira vez.
let coluna: Promise<void> | null = null;
function garantirColunaSessao() {
  coluna ??= (async () => {
    const { prisma } = await import("./prisma");
    const c: unknown[] = await prisma.$queryRawUnsafe(
      "SHOW COLUMNS FROM `users` LIKE 'sessao_versao'",
    );
    if (!c.length)
      await prisma.$executeRawUnsafe(
        "ALTER TABLE `users` ADD COLUMN `sessao_versao` INT NOT NULL DEFAULT 0",
      );
  })().catch((e) => {
    coluna = null;
    throw e;
  });
  return coluna;
}

// Cache curto: o painel dispara várias consultas por tela
const situacao = new Map<number, { role: string; v: number; ate: number }>();

async function situacaoDoUsuario(id: number): Promise<{ role: string; v: number } | null> {
  const s = situacao.get(id);
  if (s && s.ate > Date.now()) return s;
  await garantirColunaSessao();
  const { prisma } = await import("./prisma");
  const r: Array<{ role: string; sessao_versao: number }> = await prisma.$queryRaw`
    SELECT role, sessao_versao FROM users WHERE id = ${id} LIMIT 1`;
  if (!r.length) {
    situacao.delete(id);
    return null;
  }
  const atual = { role: r[0].role, v: Number(r[0].sessao_versao) || 0, ate: Date.now() + 15_000 };
  if (situacao.size > 5000) situacao.clear();
  situacao.set(id, atual);
  return atual;
}

// Derruba todos os logins do usuário (todos os aparelhos)
export async function encerrarSessoes(id: number) {
  await garantirColunaSessao();
  const { prisma } = await import("./prisma");
  await prisma.$executeRaw`UPDATE users SET sessao_versao = sessao_versao + 1 WHERE id = ${id}`;
  situacao.delete(id);
}

// Dentro de uma server function: derruba os outros aparelhos e mantém este logado (troca de senha)
export async function encerrarOutrasSessoes(s: SessionPayload) {
  await encerrarSessoes(s.id);
  const atual = await situacaoDoUsuario(s.id);
  if (!atual) return;
  const token = await createSessionToken({ ...s, role: atual.role, v: atual.v });
  setCookie(AUTH_COOKIE, token, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure:
      getRequestUrl().protocol === "https:" || getRequestHeader("x-forwarded-proto") === "https",
    maxAge: duracaoSessao(atual.role),
  });
}

async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  let payload: SessionPayload;
  try {
    payload = (await jwtVerify(token, getJwtSecret())).payload as unknown as SessionPayload;
  } catch {
    return null;
  }
  try {
    const s = await situacaoDoUsuario(Number(payload.id));
    if (!s || s.v !== (Number(payload.v) || 0)) return null;
    // Admin com token de 7 dias (emitido antes do limite de 12 h, ou quando ainda era cliente):
    // entra de novo
    const { iat, exp } = payload as unknown as { iat?: number; exp?: number };
    if (PAPEIS_PAINEL.includes(s.role) && (!iat || !exp || exp - iat > duracaoSessao(s.role)))
      return null;
    return { ...payload, role: s.role };
  } catch (e) {
    // Banco fora do ar: cliente segue navegando; os painéis fecham (não dá para conferir o papel)
    console.error("sessão: não deu para conferir no banco", e);
    return PAPEIS_PAINEL.includes(payload.role) ? null : payload;
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

// Painel do despachante: despachante aduaneiro ou admin
export async function requireDespachante(request: Request): Promise<Response | null> {
  const session = await getSessionFromRequest(request);
  if (!session || !PAPEIS_PAINEL.includes(session.role))
    return new Response(JSON.stringify({ error: "Acesso negado." }), {
      status: session ? 403 : 401,
      headers: { "Content-Type": "application/json" },
    });
  return null;
}
export async function assertDespachante(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session || !PAPEIS_PAINEL.includes(session.role)) throw new Error("Acesso negado.");
  return session;
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
export function cookieSessao(
  request: Request,
  token: string | null,
  segundos = duracaoSessao("USER"),
): string {
  const https =
    new URL(request.url).protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";
  const valor = token
    ? `${AUTH_COOKIE}=${token}; Max-Age=${segundos}`
    : `${AUTH_COOKIE}=; Max-Age=0`;
  return `${valor}; Path=/; HttpOnly; SameSite=Lax${https ? "; Secure" : ""}`;
}

// Limite de tentativas de login (em memória): atrasa quem tenta adivinhar senhas.
// Duas contagens: IP + e-mail (8) e só o e-mail (20). O IP vem de cabeçalhos que quem ataca pode
// inventar a cada tentativa; o teto por e-mail segura esse caso (a conta ainda entra por código,
// Google ou passkey enquanto a senha estiver travada).
const tentativas = new Map<string, { n: number; desde: number }>();
const JANELA = 15 * 60 * 1000;
const MAX_TENTATIVAS = 8;
const MAX_POR_EMAIL = 20;

function chavesTentativa(request: Request, email: string) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    request.headers.get("x-real-ip") ||
    "local";
  const e = email.toLowerCase();
  return [`${ip}|${e}`, `*|${e}`];
}

function contagem(chave: string): number {
  const t = tentativas.get(chave);
  if (!t) return 0;
  if (Date.now() - t.desde > JANELA) {
    tentativas.delete(chave);
    return 0;
  }
  return t.n;
}

export function loginBloqueado(request: Request, email: string): boolean {
  const [porIp, porEmail] = chavesTentativa(request, email);
  return contagem(porIp) >= MAX_TENTATIVAS || contagem(porEmail) >= MAX_POR_EMAIL;
}

export function registrarFalhaLogin(request: Request, email: string) {
  for (const chave of chavesTentativa(request, email)) {
    const t = tentativas.get(chave);
    if (!t || Date.now() - t.desde > JANELA) tentativas.set(chave, { n: 1, desde: Date.now() });
    else t.n++;
  }
  // Evita crescer sem limite: tira as vencidas e depois as mais antigas por IP. As contagens só
  // por e-mail ficam (encher o mapa de propósito não zera o teto de quem está sendo atacado).
  if (tentativas.size > 20000) {
    const agora = Date.now();
    for (const [k, t] of tentativas) {
      if (tentativas.size <= 15000) break;
      if (agora - t.desde > JANELA || !k.startsWith("*|")) tentativas.delete(k);
    }
  }
}

export function limparFalhasLogin(request: Request, email: string) {
  for (const chave of chavesTentativa(request, email)) tentativas.delete(chave);
}

// Abre a sessão de um usuário: grava o último acesso e devolve o cabeçalho Set-Cookie
export async function abrirSessao(
  request: Request,
  user: { id: number; nome_completo: string; email: string; role: string },
): Promise<string> {
  const { prisma } = await import("./prisma");
  await prisma.users
    .update({ where: { id: user.id }, data: { ultimo_login: new Date() } })
    .catch(() => {});
  situacao.delete(user.id);
  const s = await situacaoDoUsuario(user.id);
  const token = await createSessionToken({
    id: user.id,
    nome: user.nome_completo,
    email: user.email,
    role: user.role,
    v: s?.v ?? 0,
  });
  return cookieSessao(request, token, duracaoSessao(user.role));
}

// Destino depois do login: só caminhos internos do site (evita redirecionar para outro domínio)
export function destinoSeguro(r: unknown, padrao = "/cuenta"): string {
  return typeof r === "string" && /^\/(?!\/)[\w\-/?=&.%#]*$/.test(r) && !r.startsWith("/api/")
    ? r
    : padrao;
}
