// Notificações push do app (PWA): inscrições dos aparelhos, chaves VAPID e envio.
// As chaves são criadas sozinhas na primeira vez e ficam em `configuracoes` (ou VAPID_PUBLIC_KEY /
// VAPID_PRIVATE_KEY no .env, se existirem). As tabelas também são criadas sozinhas.
import { createHash } from "node:crypto";
import { prisma } from "./prisma";

async function criarTabelas() {
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS \`push_inscricoes\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`hash\` CHAR(64) NOT NULL,
    \`endpoint\` TEXT NOT NULL,
    \`p256dh\` VARCHAR(200) NOT NULL,
    \`auth\` VARCHAR(100) NOT NULL,
    \`user_id\` INTEGER NULL,
    \`visitor_id\` VARCHAR(64) NULL,
    \`idioma\` VARCHAR(2) NOT NULL DEFAULT 'es',
    \`aparelho\` VARCHAR(40) NULL,
    \`ativo\` BOOLEAN NOT NULL DEFAULT true,
    \`falhas\` INTEGER NOT NULL DEFAULT 0,
    \`ultimo_envio\` DATETIME(3) NULL,
    \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX \`push_inscricoes_hash_key\`(\`hash\`),
    INDEX \`push_inscricoes_user_idx\`(\`user_id\`),
    INDEX \`push_inscricoes_visitor_idx\`(\`visitor_id\`),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS \`push_envios\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`origem\` VARCHAR(30) NOT NULL,
    \`titulo\` VARCHAR(120) NOT NULL,
    \`texto\` VARCHAR(300) NULL,
    \`url\` VARCHAR(300) NULL,
    \`idioma\` VARCHAR(5) NULL,
    \`total\` INTEGER NOT NULL DEFAULT 0,
    \`enviados\` INTEGER NOT NULL DEFAULT 0,
    \`falhas\` INTEGER NOT NULL DEFAULT 0,
    \`cliques\` INTEGER NOT NULL DEFAULT 0,
    \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
}
let tabelas: Promise<void> | null = null;
export const garantirTabelasPush = () =>
  (tabelas ??= criarTabelas().catch((e) => {
    tabelas = null;
    throw e;
  }));

// ---------- Chaves VAPID ----------
let chaves: Promise<{ publica: string; privada: string }> | null = null;
export function chavesVapid() {
  return (chaves ??= (async () => {
    if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY)
      return { publica: process.env.VAPID_PUBLIC_KEY, privada: process.env.VAPID_PRIVATE_KEY };
    const rows = await prisma.configuracoes.findMany({
      where: { chave: { in: ["push_vapid_publica", "push_vapid_privada"] } },
    });
    const v = Object.fromEntries(rows.map((r) => [r.chave, r.valor]));
    if (v.push_vapid_publica && v.push_vapid_privada)
      return { publica: v.push_vapid_publica, privada: v.push_vapid_privada };
    const webpush = (await import("web-push")).default;
    const k = webpush.generateVAPIDKeys();
    // createMany + skipDuplicates: dois processos ao mesmo tempo ficam com o mesmo par
    await prisma.configuracoes.createMany({
      data: [
        { chave: "push_vapid_publica", valor: k.publicKey },
        { chave: "push_vapid_privada", valor: k.privateKey },
      ],
      skipDuplicates: true,
    });
    const salvas = await prisma.configuracoes.findMany({
      where: { chave: { in: ["push_vapid_publica", "push_vapid_privada"] } },
    });
    const s = Object.fromEntries(salvas.map((r) => [r.chave, r.valor]));
    return { publica: s.push_vapid_publica, privada: s.push_vapid_privada };
  })().catch((e) => {
    chaves = null;
    throw e;
  }));
}

// ---------- Inscrição ----------
export type Inscricao = { endpoint: string; keys: { p256dh: string; auth: string } };
const hashDe = (endpoint: string) => createHash("sha256").update(endpoint).digest("hex");

export function inscricaoValida(x: any): x is Inscricao {
  return (
    typeof x?.endpoint === "string" &&
    /^https:\/\//.test(x.endpoint) &&
    x.endpoint.length < 2000 &&
    typeof x?.keys?.p256dh === "string" &&
    x.keys.p256dh.length < 200 &&
    typeof x?.keys?.auth === "string" &&
    x.keys.auth.length < 100
  );
}

export async function inscrever(d: {
  inscricao: Inscricao;
  userId: number | null;
  visitorId: string | null;
  idioma: "es" | "pt";
  aparelho: string | null;
}) {
  await garantirTabelasPush();
  const h = hashDe(d.inscricao.endpoint);
  // Mesmo aparelho de novo (outra conta, outro idioma): atualiza e reativa
  await prisma.$executeRawUnsafe(
    `INSERT INTO push_inscricoes (hash, endpoint, p256dh, auth, user_id, visitor_id, idioma, aparelho)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE p256dh = VALUES(p256dh), auth = VALUES(auth),
       user_id = COALESCE(VALUES(user_id), user_id), visitor_id = COALESCE(VALUES(visitor_id), visitor_id),
       idioma = VALUES(idioma), aparelho = VALUES(aparelho), ativo = true, falhas = 0,
       updated_at = CURRENT_TIMESTAMP(3)`,
    h,
    d.inscricao.endpoint,
    d.inscricao.keys.p256dh,
    d.inscricao.keys.auth,
    d.userId,
    d.visitorId?.slice(0, 64) ?? null,
    d.idioma,
    d.aparelho?.slice(0, 40) ?? null,
  );
}

export async function cancelar(endpoint: string) {
  await garantirTabelasPush();
  await prisma.$executeRawUnsafe(
    "UPDATE push_inscricoes SET ativo = false, updated_at = CURRENT_TIMESTAMP(3) WHERE hash = ?",
    hashDe(endpoint),
  );
}

export async function registrarClique(envioId: number) {
  await garantirTabelasPush();
  await prisma.$executeRawUnsafe(
    "UPDATE push_envios SET cliques = cliques + 1 WHERE id = ?",
    envioId,
  );
}

// ---------- Envio ----------
export type Alvo =
  | { tipo: "todos"; idioma?: "es" | "pt" }
  | { tipo: "pessoa"; userId?: number | null; visitorId?: string | null };

export type Mensagem = {
  titulo: string;
  texto?: string;
  url?: string; // caminho do site (/pt/produto/...)
  imagem?: string | null; // foto grande (Android)
  tag?: string; // mesma tag substitui o aviso anterior em vez de empilhar
};

type Linha = { id: number; endpoint: string; p256dh: string; auth: string };

async function destinatarios(alvo: Alvo): Promise<Linha[]> {
  await garantirTabelasPush();
  if (alvo.tipo === "todos")
    return alvo.idioma
      ? prisma.$queryRawUnsafe<Linha[]>(
          "SELECT id, endpoint, p256dh, auth FROM push_inscricoes WHERE ativo = true AND idioma = ?",
          alvo.idioma,
        )
      : prisma.$queryRawUnsafe<Linha[]>(
          "SELECT id, endpoint, p256dh, auth FROM push_inscricoes WHERE ativo = true",
        );
  if (!alvo.userId && !alvo.visitorId) return [];
  return prisma.$queryRawUnsafe<Linha[]>(
    "SELECT id, endpoint, p256dh, auth FROM push_inscricoes WHERE ativo = true AND (user_id = ? OR visitor_id = ?)",
    alvo.userId ?? -1,
    alvo.visitorId ?? "-",
  );
}

// Manda para todos os aparelhos do alvo. Aparelho que não existe mais (404/410) é desativado.
export async function enviarPush(
  alvo: Alvo,
  m: Mensagem,
  origem: string,
): Promise<{ envioId: number; total: number; enviados: number; falhas: number }> {
  const lista = await destinatarios(alvo);
  const idioma = alvo.tipo === "todos" ? (alvo.idioma ?? "todos") : null;
  // Mesma conexão (transação) para o LAST_INSERT_ID ser o deste INSERT
  const envioId = await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      "INSERT INTO push_envios (origem, titulo, texto, url, idioma, total) VALUES (?, ?, ?, ?, ?, ?)",
      origem.slice(0, 30),
      m.titulo.slice(0, 120),
      m.texto?.slice(0, 300) ?? null,
      m.url?.slice(0, 300) ?? null,
      idioma,
      lista.length,
    );
    const [r] = await tx.$queryRawUnsafe<Array<{ id: bigint }>>("SELECT LAST_INSERT_ID() AS id");
    return Number(r.id);
  });
  if (!lista.length) return { envioId, total: 0, enviados: 0, falhas: 0 };

  const webpush = (await import("web-push")).default;
  const k = await chavesVapid();
  const { SITE_URL } = await import("./site");
  const payload = JSON.stringify({
    titulo: m.titulo,
    texto: m.texto ?? "",
    url: m.url ?? "/",
    imagem: m.imagem ?? null,
    tag: m.tag ?? null,
    envio: envioId,
  });
  let enviados = 0;
  let falhas = 0;
  // Lotes de 20 ao mesmo tempo: rápido sem abrir conexões demais
  for (let i = 0; i < lista.length; i += 20) {
    await Promise.all(
      lista.slice(i, i + 20).map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            payload,
            {
              vapidDetails: { subject: SITE_URL, publicKey: k.publica, privateKey: k.privada },
              TTL: 3 * 86400,
              urgency: "normal",
            },
          );
          enviados++;
          await prisma.$executeRawUnsafe(
            "UPDATE push_inscricoes SET ultimo_envio = CURRENT_TIMESTAMP(3), falhas = 0 WHERE id = ?",
            s.id,
          );
        } catch (e: any) {
          falhas++;
          const morto = e?.statusCode === 404 || e?.statusCode === 410;
          await prisma.$executeRawUnsafe(
            `UPDATE push_inscricoes SET falhas = falhas + 1${morto ? ", ativo = false" : ""} WHERE id = ?`,
            s.id,
          );
        }
      }),
    );
  }
  await prisma.$executeRawUnsafe(
    "UPDATE push_envios SET enviados = ?, falhas = ? WHERE id = ?",
    enviados,
    falhas,
    envioId,
  );
  return { envioId, total: lista.length, enviados, falhas };
}

// ---------- Admin ----------
export async function painelPush() {
  await garantirTabelasPush();
  const [porIdioma, envios] = await Promise.all([
    prisma.$queryRawUnsafe<
      Array<{ idioma: string; ativos: bigint; total: bigint; logados: bigint }>
    >(
      `SELECT idioma, SUM(ativo = true) AS ativos, COUNT(*) AS total,
         SUM(ativo = true AND user_id IS NOT NULL) AS logados
       FROM push_inscricoes GROUP BY idioma`,
    ),
    prisma.$queryRawUnsafe<
      Array<{
        id: number;
        origem: string;
        titulo: string;
        texto: string | null;
        url: string | null;
        idioma: string | null;
        total: number;
        enviados: number;
        falhas: number;
        cliques: number;
        created_at: Date;
      }>
    >("SELECT * FROM push_envios ORDER BY id DESC LIMIT 50"),
  ]);
  const n = (x: bigint | number | null) => Number(x ?? 0);
  return {
    inscritos: {
      es: n(porIdioma.find((x) => x.idioma === "es")?.ativos ?? 0),
      pt: n(porIdioma.find((x) => x.idioma === "pt")?.ativos ?? 0),
      logados: porIdioma.reduce((s, x) => s + n(x.logados), 0),
      cancelaram: porIdioma.reduce((s, x) => s + n(x.total) - n(x.ativos), 0),
    },
    envios: envios.map((e) => ({
      ...e,
      id: Number(e.id),
      total: Number(e.total),
      enviados: Number(e.enviados),
      falhas: Number(e.falhas),
      cliques: Number(e.cliques),
      created_at: e.created_at.toISOString(),
    })),
  };
}
