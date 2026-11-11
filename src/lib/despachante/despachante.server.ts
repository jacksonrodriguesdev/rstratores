// Despachante aduaneiro: contas criadas pelo admin (convite com link de uso único, 7 dias), sem
// senha passando pelo admin. Papel "DESPACHANTE" no users.role (sessão de 12 h, como o admin);
// desativar troca o papel para "DESPACHANTE_OFF" e derruba as sessões na hora.
import { createHash, randomBytes } from "crypto";

const SQL = [
  `CREATE TABLE IF NOT EXISTS \`despachante_perfil\` (
  \`user_id\` INTEGER NOT NULL,
  \`escritorio\` VARCHAR(160) NULL,
  \`registro\` VARCHAR(60) NULL,
  \`telefone\` VARCHAR(40) NULL,
  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (\`user_id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS \`despachante_convites\` (
  \`id\` INTEGER NOT NULL AUTO_INCREMENT,
  \`user_id\` INTEGER NOT NULL,
  \`token_hash\` VARCHAR(64) NOT NULL,
  \`expira\` DATETIME(3) NOT NULL,
  \`usado_em\` DATETIME(3) NULL,
  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX \`despachante_convites_token_key\`(\`token_hash\`),
  INDEX \`despachante_convites_user_idx\`(\`user_id\`),
  PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
];
let pronto: Promise<void> | null = null;
function garantir() {
  pronto ??= (async () => {
    const { prisma } = await import("../prisma");
    for (const s of SQL) await prisma.$executeRawUnsafe(s);
  })().catch((e) => {
    pronto = null;
    throw e;
  });
  return pronto;
}
const db = async () => {
  await garantir();
  return (await import("../prisma")).prisma;
};
const hash = (t: string) => createHash("sha256").update(t).digest("hex");
const txt = (s: unknown, max: number) => {
  const t = String(s ?? "")
    .trim()
    .slice(0, max);
  return t || null;
};
const VALIDADE_CONVITE = 7 * 86400_000;

async function gerarConvite(userId: number) {
  const prisma = await db();
  // Convites anteriores não usados deixam de valer
  await prisma.$executeRaw`
    UPDATE despachante_convites SET expira = ${new Date()} WHERE user_id = ${userId} AND usado_em IS NULL`;
  const token = randomBytes(32).toString("hex");
  await prisma.$executeRaw`
    INSERT INTO despachante_convites (user_id, token_hash, expira)
    VALUES (${userId}, ${hash(token)}, ${new Date(Date.now() + VALIDADE_CONVITE)})`;
  const { SITE_URL } = await import("../site");
  return `${SITE_URL}/convite-despachante?token=${token}`;
}

async function emailConvite(email: string, nome: string, link: string) {
  const { resendConfigurado, enviarUm } = await import("../email.server");
  if (!resendConfigurado()) return false;
  await enviarUm({
    to: email,
    subject: "Acesso ao painel do despachante · AGRO PARTS",
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#0f172a"><p style="font-size:12px;letter-spacing:2px;font-weight:bold;color:#15803d;margin:0">AGRO PARTS · PAINEL DO DESPACHANTE</p><h2 style="margin:8px 0 14px">Olá, ${nome.split(" ")[0].replace(/[<>&"]/g, "")}!</h2><p style="font-size:16px;line-height:1.5">Você recebeu acesso ao painel do despachante da AGRO PARTS: cotações, embarques, dados para a DU-E, NCM e origem dos produtos e documentos de cada exportação para o Uruguai.</p><p style="font-size:16px">Crie sua senha pelo link abaixo (vale 7 dias e só pode ser usado uma vez):</p><p style="margin:24px 0"><a href="${link}" style="background:#14532d;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold">Criar minha senha</a></p></div>`,
    text: `Acesso ao painel do despachante da AGRO PARTS. Crie sua senha (link válido por 7 dias, uso único): ${link}`,
  });
  return true;
}

export async function criarDespachante(d: {
  nome: string;
  email: string;
  escritorio?: string;
  registro?: string;
  telefone?: string;
}) {
  const prisma = await db();
  const nome = txt(d.nome, 120);
  const email = txt(d.email, 191)?.toLowerCase() ?? "";
  if (!nome) throw new Error("Coloque o nome do despachante.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("E-mail inválido.");
  const existe = await prisma.users.findUnique({ where: { email } });
  if (existe && !["DESPACHANTE", "DESPACHANTE_OFF"].includes(existe.role))
    throw new Error(
      "Este e-mail já tem uma conta no site (cliente ou admin). Use outro e-mail para o despachante.",
    );
  // Conta sem senha utilizável até o convite ser aceito
  const user =
    existe ??
    (await prisma.users.create({
      data: {
        nome_completo: nome,
        email,
        senha_hash: `convite:${randomBytes(24).toString("hex")}`,
        role: "DESPACHANTE",
        telefone: txt(d.telefone, 40),
        pais: "Brasil",
      },
    }));
  if (existe)
    await prisma.users.update({ where: { id: existe.id }, data: { role: "DESPACHANTE" } });
  await prisma.$executeRaw`
    INSERT INTO despachante_perfil (user_id, escritorio, registro, telefone)
    VALUES (${user.id}, ${txt(d.escritorio, 160)}, ${txt(d.registro, 60)}, ${txt(d.telefone, 40)})
    ON DUPLICATE KEY UPDATE escritorio = VALUES(escritorio), registro = VALUES(registro), telefone = VALUES(telefone)`;
  const link = await gerarConvite(user.id);
  const enviado = await emailConvite(email, nome, link).catch(() => false);
  return { link, enviado };
}

export async function novoConvite(userId: number) {
  const prisma = await db();
  const u = await prisma.users.findUnique({ where: { id: userId } });
  if (!u || !["DESPACHANTE", "DESPACHANTE_OFF"].includes(u.role))
    throw new Error("Despachante não encontrado.");
  const link = await gerarConvite(u.id);
  const enviado = await emailConvite(u.email, u.nome_completo, link).catch(() => false);
  return { link, enviado };
}

export async function alterarAcesso(userId: number, ativo: boolean) {
  const prisma = await db();
  const u = await prisma.users.findUnique({ where: { id: userId } });
  if (!u || !["DESPACHANTE", "DESPACHANTE_OFF"].includes(u.role))
    throw new Error("Despachante não encontrado.");
  await prisma.users.update({
    where: { id: userId },
    data: { role: ativo ? "DESPACHANTE" : "DESPACHANTE_OFF" },
  });
  const { encerrarSessoes } = await import("../auth.server");
  await encerrarSessoes(userId);
  return true;
}

export async function listarDespachantes() {
  const prisma = await db();
  const rows = await prisma.$queryRaw<any[]>`
    SELECT u.id, u.nome_completo, u.email, u.role, u.senha_hash, u.created_at, p.escritorio, p.registro, p.telefone,
      (SELECT MAX(c.expira) FROM despachante_convites c WHERE c.user_id = u.id AND c.usado_em IS NULL) AS convite_expira
    FROM users u LEFT JOIN despachante_perfil p ON p.user_id = u.id
    WHERE u.role IN ('DESPACHANTE', 'DESPACHANTE_OFF') ORDER BY u.id DESC`;
  return rows.map((r) => ({
    id: Number(r.id),
    nome: r.nome_completo as string,
    email: r.email as string,
    ativo: r.role === "DESPACHANTE",
    senhaCriada: !String(r.senha_hash).startsWith("convite:"),
    convitePendente: !!r.convite_expira && new Date(r.convite_expira).getTime() > Date.now(),
    escritorio: r.escritorio as string | null,
    registro: r.registro as string | null,
    telefone: r.telefone as string | null,
    criado: new Date(r.created_at).toISOString(),
  }));
}

// Convite: confere o token (uso único, dentro da validade)
export async function conviteValido(token: string) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const prisma = await db();
  const [c] = await prisma.$queryRaw<any[]>`
    SELECT c.id, c.user_id, c.expira, c.usado_em, u.nome_completo, u.email, u.role
    FROM despachante_convites c JOIN users u ON u.id = c.user_id WHERE c.token_hash = ${hash(token)}`;
  if (!c || c.usado_em || new Date(c.expira).getTime() < Date.now() || c.role !== "DESPACHANTE")
    return null;
  return {
    id: Number(c.id),
    userId: Number(c.user_id),
    nome: c.nome_completo as string,
    email: c.email as string,
  };
}

export async function aceitarConvite(token: string, senha: string) {
  const c = await conviteValido(token);
  if (!c) throw new Error("Link inválido ou vencido. Peça um novo convite à AGRO PARTS.");
  const { avaliarSenha } = await import("../validacao-conta");
  if (!avaliarSenha(senha).valida || senha.length > 200)
    throw new Error("A senha precisa de pelo menos 8 caracteres, com letras e números.");
  const prisma = await db();
  const bcrypt = (await import("bcryptjs")).default;
  await prisma.users.update({
    where: { id: c.userId },
    data: { senha_hash: await bcrypt.hash(senha, 10) },
  });
  await prisma.$executeRaw`UPDATE despachante_convites SET usado_em = ${new Date()} WHERE id = ${c.id}`;
  const { encerrarSessoes } = await import("../auth.server");
  await encerrarSessoes(c.userId);
  return prisma.users.findUniqueOrThrow({ where: { id: c.userId } });
}

// Avisa os despachantes ativos (proposta aceita = embarque novo para preparar)
export async function avisarDespachantes(assunto: string, texto: string, link: string) {
  const prisma = await db();
  const lista = await prisma.users.findMany({
    where: { role: "DESPACHANTE" },
    select: { email: true, senha_hash: true },
  });
  const { resendConfigurado, enviarUm } = await import("../email.server");
  if (!resendConfigurado()) return;
  const { SITE_URL } = await import("../site");
  for (const u of lista.filter((x) => !x.senha_hash.startsWith("convite:")))
    await enviarUm({
      to: u.email,
      subject: assunto,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;padding:20px"><h2 style="margin:0 0 12px">${assunto.replace(/[<>&"]/g, "")}</h2><p style="white-space:pre-line;font-size:15px">${texto.replace(/[<>&"]/g, "")}</p><p><a href="${SITE_URL}${link}" style="background:#14532d;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:bold">Abrir no painel do despachante</a></p></div>`,
      text: `${assunto}\n\n${texto}\n\n${SITE_URL}${link}`,
    }).catch(() => {});
}

// ---------------------------------------------------------------- painel
export async function painelDespachante() {
  const b = await import("../b2b.server");
  const ad = await import("../aduana/aduana.server");
  const { ETAPAS, origemValida, VALIDADE_PROVA_DIAS } = await import("../aduana/aduana-comum");
  const [cotacoes, embarques, prontidao, config] = await Promise.all([
    b.listarCotacoesAdmin(),
    ad.listarEmbarques(),
    ad.prontidao(),
    ad.configAduana(),
  ]);
  // Pendências do despachante por etapa (embarques em andamento)
  const abertos = embarques.filter((e) => e.feitas < ETAPAS.length);
  const porEtapa = ETAPAS.map((et) => ({
    id: et.id,
    pt: et.pt,
    pendentes: abertos.filter(
      (e) => !["FEITO", "NAO_SE_APLICA"].includes(e.etapas[et.id]?.status ?? ""),
    ).length,
  }));
  // Itens de propostas aceitas/abertas sem NCM ou com origem a confirmar
  const atencao: Array<{
    codigo: string;
    empresa: string;
    linha: number;
    peca: string;
    motivo: string;
  }> = [];
  for (const c of cotacoes.filter((x) => ["ACEITA", "COTADA"].includes(x.status)))
    for (const i of c.itens.filter((x) => x.disponivel !== false)) {
      if (String(i.ncm ?? "").length !== 8)
        atencao.push({
          codigo: c.codigo,
          empresa: c.razao_social,
          linha: i.linha,
          peca: i.nome ?? i.codigo,
          motivo: "sem NCM",
        });
      else if (i.origem === "MERCOSUL" && i.origemStatus !== "COMPROVADA")
        atencao.push({
          codigo: c.codigo,
          empresa: c.razao_social,
          linha: i.linha,
          peca: i.nome ?? i.codigo,
          motivo: "origem Mercosul sem prova registrada",
        });
    }
  // Provas de origem que vencem em até 30 dias (peças da loja e catálogo de exportação)
  const prisma = await db();
  const limite = new Date(Date.now() - (VALIDADE_PROVA_DIAS - 30) * 86400_000)
    .toISOString()
    .slice(0, 10);
  const vencendo = await prisma
    .$queryRawUnsafe<any[]>(
      `SELECT sku, ncm, prova_data, 'loja' AS onde FROM aduana_origem WHERE status = 'COMPROVADA' AND prova_data <= ?
     UNION ALL
     SELECT CONCAT('EXP-', id), ncm, prova_data, 'exportacao' FROM b2b_produtos WHERE origem_status = 'COMPROVADA' AND prova_data <= ?
     ORDER BY prova_data LIMIT 50`,
      limite,
      limite,
    )
    .catch(() => []);
  return {
    numeros: {
      embarquesAbertos: abertos.length,
      aceitas: cotacoes.filter((c) => c.status === "ACEITA").length,
      propostas: cotacoes.filter((c) => c.status === "COTADA").length,
      novas: cotacoes.filter((c) => c.status === "ENVIADA").length,
    },
    porEtapa,
    embarques: abertos.slice(0, 20),
    atencao: atencao.slice(0, 50),
    vencendo: vencendo.map((v) => ({
      sku: v.sku as string,
      ncm: v.ncm as string | null,
      prova_data: v.prova_data as string,
      onde: v.onde as string,
      vencida: !origemValida({ status: "COMPROVADA", prova_data: v.prova_data }),
    })),
    prontidao,
    exportador: config,
  };
}
