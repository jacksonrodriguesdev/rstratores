// Entrar com Face ID / Touch ID / digital / Windows Hello (passkeys, padrão WebAuthn).
// O cliente ativa em Mi cuenta → Seguridad (precisa estar logado); depois entra só com a
// biometria, sem e-mail nem senha (a passkey fica no aparelho e diz qual é a conta).
// A biometria nunca sai do aparelho: o site guarda só a chave pública de cada aparelho.
// O desafio de cada operação vai assinado (JWT, 5 min, uso único) para não precisar de tabela.
// A biblioteca fica fora do empacotamento do servidor (vite.config.ts → traceDeps): uma
// dependência dela precisa do reflect-metadata carregado antes, como o Node faz sozinho.
import { SignJWT, jwtVerify } from "jose";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { prisma } from "./prisma";
import { SITE_URL } from "./site";

const MIN = 60_000;

async function criarTabela() {
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS \`passkeys\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`user_id\` INTEGER NOT NULL,
    \`credential_id\` VARCHAR(255) NOT NULL,
    \`public_key\` TEXT NOT NULL,
    \`counter\` BIGINT NOT NULL DEFAULT 0,
    \`transports\` VARCHAR(200) NULL,
    \`aparelho\` VARCHAR(120) NULL,
    \`sincronizada\` BOOLEAN NOT NULL DEFAULT false,
    \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`usado_em\` DATETIME(3) NULL,
    UNIQUE INDEX \`passkeys_credential_id_key\`(\`credential_id\`),
    INDEX \`passkeys_user_id_idx\`(\`user_id\`),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
}
let tabela: Promise<void> | null = null;
export const garantirTabelaPasskeys = () =>
  (tabela ??= criarTabela().catch((e) => {
    tabela = null;
    throw e;
  }));

// ---------- Domínio (RP) e origem ----------
// A passkey fica presa ao domínio: agropartsuy.com em produção, localhost nos testes.
// Outros domínios (www, antigos) são redirecionados antes de chegar aqui.
export function rpDe(request: Request): { rpID: string; origem: string } | null {
  const u = new URL(request.url);
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || u.host)
    .split(",")[0]
    .trim()
    .toLowerCase();
  const nome = host.replace(/:\d+$/, "");
  const principal = new URL(SITE_URL).hostname;
  if (nome === principal) return { rpID: principal, origem: `https://${principal}` };
  if (nome === "localhost") {
    const proto = request.headers.get("x-forwarded-proto") || u.protocol.replace(":", "");
    return { rpID: "localhost", origem: `${proto}://${host}` };
  }
  return null;
}

// ---------- Desafio assinado (5 min, uso único) ----------
const segredo = () => {
  const s = process.env.JWT_SECRET;
  if (!s || s.length < 32) throw new Error("JWT_SECRET ausente");
  return new TextEncoder().encode(s);
};
type Uso = "registro" | "login";
async function assinarDesafio(desafio: string, uso: Uso, uid?: number) {
  return new SignJWT({ desafio, uso, ...(uid && { uid }) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(segredo());
}
const usados = new Map<string, number>();
async function lerDesafio(token: string, uso: Uso, uid?: number) {
  try {
    const { payload } = await jwtVerify(String(token ?? ""), segredo());
    if (payload.uso !== uso || typeof payload.desafio !== "string") return null;
    if (uid && payload.uid !== uid) return null;
    const agora = Date.now();
    for (const [k, t] of usados) if (agora - t > 6 * MIN) usados.delete(k);
    if (usados.has(payload.desafio)) return null; // já usado
    usados.set(payload.desafio, agora);
    return payload.desafio;
  } catch {
    return null;
  }
}

// Nome do aparelho para a lista em Mi cuenta (pelo navegador)
export function nomeAparelho(ua: string) {
  if (/iPhone/i.test(ua)) return "iPhone";
  if (/iPad/i.test(ua)) return "iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Macintosh|Mac OS X/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows";
  return "Outro aparelho";
}

const b64 = (b: Uint8Array) => Buffer.from(b).toString("base64url");
const deB64 = (s: string) => new Uint8Array(Buffer.from(s, "base64url"));

type Linha = {
  id: number;
  user_id: number;
  credential_id: string;
  public_key: string;
  counter: bigint | number;
  transports: string | null;
};

// ---------- Ativar num aparelho (logado) ----------
export async function opcoesRegistro(
  request: Request,
  user: { id: number; email: string; nome: string },
) {
  await garantirTabelaPasskeys();
  const rp = rpDe(request);
  if (!rp) return { erro: "dominio" as const };
  const existentes = await prisma.$queryRawUnsafe<Linha[]>(
    "SELECT credential_id, transports FROM passkeys WHERE user_id = ?",
    user.id,
  );
  const opcoes = await generateRegistrationOptions({
    rpName: "AGRO PARTS",
    rpID: rp.rpID,
    userName: user.email,
    userDisplayName: user.nome || user.email,
    userID: new TextEncoder().encode(`agro-${user.id}`),
    attestationType: "none",
    // Não cadastra de novo o mesmo aparelho
    excludeCredentials: existentes.map((e) => ({
      id: e.credential_id,
      transports: e.transports ? e.transports.split(",") : undefined,
    })),
    // Passkey "descobrível": entra sem digitar o e-mail; biometria/PIN obrigatório
    authenticatorSelection: { residentKey: "required", userVerification: "required" },
    preferredAuthenticatorType: "localDevice",
  });
  return { opcoes, token: await assinarDesafio(opcoes.challenge, "registro", user.id) };
}

export async function verificarRegistro(
  request: Request,
  userId: number,
  token: string,
  resposta: RegistrationResponseJSON,
) {
  await garantirTabelaPasskeys();
  const rp = rpDe(request);
  if (!rp) return { erro: "dominio" as const };
  const desafio = await lerDesafio(token, "registro", userId);
  if (!desafio) return { erro: "expirou" as const };
  let v;
  try {
    v = await verifyRegistrationResponse({
      response: resposta,
      expectedChallenge: desafio,
      expectedOrigin: rp.origem,
      expectedRPID: rp.rpID,
      requireUserVerification: true,
    });
  } catch {
    return { erro: "invalida" as const };
  }
  if (!v.verified) return { erro: "invalida" as const };
  const { credential, credentialBackedUp } = v.registrationInfo;
  await prisma.$executeRawUnsafe(
    `INSERT INTO passkeys (user_id, credential_id, public_key, counter, transports, aparelho, sincronizada)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE user_id = VALUES(user_id)`,
    userId,
    credential.id,
    b64(credential.publicKey),
    credential.counter,
    credential.transports?.join(",") ?? null,
    nomeAparelho(request.headers.get("user-agent") ?? ""),
    credentialBackedUp,
  );
  return { ok: true as const };
}

// ---------- Entrar (sem estar logado) ----------
export async function opcoesLogin(request: Request) {
  const rp = rpDe(request);
  if (!rp) return { erro: "dominio" as const };
  const opcoes = await generateAuthenticationOptions({
    rpID: rp.rpID,
    userVerification: "required",
  });
  return { opcoes, token: await assinarDesafio(opcoes.challenge, "login") };
}

export async function verificarLogin(
  request: Request,
  token: string,
  resposta: AuthenticationResponseJSON,
) {
  await garantirTabelaPasskeys();
  const rp = rpDe(request);
  if (!rp) return { erro: "dominio" as const };
  const desafio = await lerDesafio(token, "login");
  if (!desafio) return { erro: "expirou" as const };
  const [pk] = await prisma.$queryRawUnsafe<Linha[]>(
    "SELECT id, user_id, credential_id, public_key, counter, transports FROM passkeys WHERE credential_id = ? LIMIT 1",
    String(resposta?.id ?? ""),
  );
  // Passkey apagada em Mi cuenta (ou de outro site): o aparelho ainda oferece, mas não vale
  if (!pk) return { erro: "desconhecida" as const };
  let v;
  try {
    v = await verifyAuthenticationResponse({
      response: resposta,
      expectedChallenge: desafio,
      expectedOrigin: rp.origem,
      expectedRPID: rp.rpID,
      requireUserVerification: true,
      credential: {
        id: pk.credential_id,
        publicKey: deB64(pk.public_key),
        counter: Number(pk.counter),
        transports: pk.transports ? pk.transports.split(",") : undefined,
      },
    });
  } catch {
    return { erro: "invalida" as const };
  }
  if (!v.verified) return { erro: "invalida" as const };
  await prisma.$executeRawUnsafe(
    "UPDATE passkeys SET counter = ?, usado_em = CURRENT_TIMESTAMP(3) WHERE id = ?",
    v.authenticationInfo.newCounter,
    pk.id,
  );
  const user = await prisma.users.findUnique({
    where: { id: pk.user_id },
    select: { id: true, nome_completo: true, email: true, role: true },
  });
  if (!user) return { erro: "desconhecida" as const };
  return { ok: true as const, user };
}

// ---------- Mi cuenta ----------
export async function listarPasskeys(userId: number) {
  await garantirTabelaPasskeys();
  const rows = await prisma.$queryRawUnsafe<
    Array<{
      id: number;
      aparelho: string | null;
      sincronizada: number;
      created_at: Date;
      usado_em: Date | null;
    }>
  >(
    "SELECT id, aparelho, sincronizada, created_at, usado_em FROM passkeys WHERE user_id = ? ORDER BY id DESC",
    userId,
  );
  return rows.map((r) => ({
    id: Number(r.id),
    aparelho: r.aparelho ?? "Aparelho",
    sincronizada: !!r.sincronizada,
    criado: new Date(r.created_at).toISOString(),
    usado: r.usado_em ? new Date(r.usado_em).toISOString() : null,
  }));
}

export async function removerPasskey(userId: number, id: number) {
  await garantirTabelaPasskeys();
  await prisma.$executeRawUnsafe("DELETE FROM passkeys WHERE id = ? AND user_id = ?", id, userId);
}
