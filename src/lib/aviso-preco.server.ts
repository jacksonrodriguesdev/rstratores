// "Avisame cuando baje el precio" (página da peça): a pessoa deixa o WhatsApp ou o e-mail (logado:
// um toque). O agendador (rodarAutomacoes, a cada 10 min) confere os preços: baixou pelo menos 1%
// → e-mail na hora (no idioma do aviso) e aviso no sininho de quem tem conta; quem deixou só o
// WhatsApp entra na fila do admin (Captação → Avisos de preço) com a mensagem pronta.
// O aviso vale por 120 dias e dispara uma vez (a pessoa pode pedir de novo depois).
import { prisma } from "./prisma";
import { normalizarCelular } from "./contato-whatsapp.server";
import { emailValido } from "./validacao-conta";
import { whatsappContactUrl } from "./whatsapp";

const DIA = 86400_000;
const VALIDADE = 120 * DIA;

async function criarTabela() {
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS \`avisos_preco\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`sku\` VARCHAR(191) NOT NULL,
    \`telefone\` VARCHAR(20) NULL,
    \`email\` VARCHAR(191) NULL,
    \`user_id\` INTEGER NULL,
    \`idioma\` VARCHAR(2) NOT NULL DEFAULT 'es',
    \`preco_ref_brl\` DOUBLE NOT NULL,
    \`preco_aviso_brl\` DOUBLE NULL,
    \`status\` VARCHAR(20) NOT NULL DEFAULT 'ATIVO',
    \`visitor_id\` VARCHAR(64) NULL,
    \`baixou_em\` DATETIME(3) NULL,
    \`avisado_em\` DATETIME(3) NULL,
    \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    INDEX \`avisos_preco_status_idx\`(\`status\`),
    INDEX \`avisos_preco_sku_idx\`(\`sku\`),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
}
let tabela: Promise<void> | null = null;
export const garantirTabelaAvisos = () =>
  (tabela ??= criarTabela().catch((e) => {
    tabela = null;
    throw e;
  }));

// Preço atual de venda (R$, base de todas as moedas) de várias peças
async function precosAtuais(skus: string[]) {
  const { configPrecos } = await import("./precos.server");
  const { precoVenda } = await import("./precos");
  const c = await configPrecos();
  const rows = await prisma.agricolas.findMany({
    where: { sku: { in: skus } },
    select: {
      sku: true,
      preco_brl: true,
      preco_modo: true,
      preco_uyu: true,
      valor_promocional: true,
    },
  });
  const out = new Map<string, number>();
  for (const r of rows) {
    const pr = precoVenda(r, c);
    if (pr?.brl) out.set(r.sku.trim(), pr.brl);
  }
  return out;
}

export type NovoAviso = {
  sku: string;
  contato?: string; // WhatsApp ou e-mail (sem conta)
  userId?: number | null;
  idioma: "es" | "pt";
  visitorId?: string | null;
};

export async function criarAviso(a: NovoAviso) {
  await garantirTabelaAvisos();
  const sku = String(a.sku ?? "")
    .trim()
    .slice(0, 191);
  if (!sku) return { erro: "peca" as const };
  const preco = (await precosAtuais([sku])).get(sku);
  if (!preco) return { erro: "sem_preco" as const };
  let email: string | null = null;
  let telefone: string | null = null;
  const bruto = String(a.contato ?? "").trim();
  if (bruto) {
    if (bruto.includes("@")) {
      if (!emailValido(bruto)) return { erro: "contato" as const };
      email = bruto.toLowerCase().slice(0, 191);
    } else {
      telefone = normalizarCelular(bruto, a.idioma);
      if (!telefone) return { erro: "contato" as const };
    }
  } else if (a.userId) {
    const u = await prisma.users.findUnique({ where: { id: a.userId }, select: { email: true } });
    email = u?.email?.toLowerCase() ?? null;
  }
  if (!email && !telefone) return { erro: "contato" as const };
  // Já tem um aviso ativo desta peça para o mesmo contato: só renova o preço de referência
  const [ja] = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
    `SELECT id FROM avisos_preco WHERE sku = ? AND status = 'ATIVO'
       AND ((? IS NOT NULL AND email = ?) OR (? IS NOT NULL AND telefone = ?)) LIMIT 1`,
    sku,
    email,
    email,
    telefone,
    telefone,
  );
  if (ja) {
    await prisma.$executeRawUnsafe(
      "UPDATE avisos_preco SET preco_ref_brl = ?, created_at = CURRENT_TIMESTAMP(3) WHERE id = ?",
      preco,
      ja.id,
    );
    return { ok: true as const, novo: false, canal: email ? "email" : "whatsapp" };
  }
  await prisma.$executeRawUnsafe(
    `INSERT INTO avisos_preco (sku, telefone, email, user_id, idioma, preco_ref_brl, visitor_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    sku,
    telefone,
    email,
    a.userId ?? null,
    a.idioma,
    preco,
    a.visitorId ? String(a.visitorId).slice(0, 64) : null,
  );
  return { ok: true as const, novo: true, canal: email ? "email" : "whatsapp" };
}

type Aviso = {
  id: number;
  sku: string;
  telefone: string | null;
  email: string | null;
  user_id: number | null;
  idioma: "es" | "pt";
  preco_ref_brl: number;
};

// Roda no agendador: confere os avisos ativos. Baixou ≥ 1% → avisa (e-mail) ou põe na fila (WhatsApp).
export async function processarAvisosPreco(agora = Date.now()) {
  await garantirTabelaAvisos();
  await prisma.$executeRawUnsafe(
    "UPDATE avisos_preco SET status = 'VENCIDO' WHERE status = 'ATIVO' AND created_at < ?",
    new Date(agora - VALIDADE),
  );
  const ativos = await prisma.$queryRawUnsafe<Aviso[]>(
    "SELECT id, sku, telefone, email, user_id, idioma, preco_ref_brl FROM avisos_preco WHERE status = 'ATIVO' LIMIT 5000",
  );
  if (!ativos.length) return { baixaram: 0, emails: 0, whatsapp: 0 };
  const precos = await precosAtuais([...new Set(ativos.map((a) => a.sku))]);
  const baixaram = ativos.filter((a) => {
    const p = precos.get(a.sku);
    return p != null && p <= a.preco_ref_brl * 0.99;
  });
  let emails = 0;
  let whatsapp = 0;
  for (const a of baixaram) {
    const atual = precos.get(a.sku)!;
    let enviado = false;
    if (a.email) enviado = await emailAviso(a, atual).catch(() => false);
    if (a.user_id) await sininho(a).catch(() => {});
    // E-mail enviado: pronto. Só WhatsApp (ou e-mail sem Resend): fila do admin
    const status = enviado
      ? "AVISADO"
      : a.telefone
        ? "WHATSAPP"
        : a.user_id
          ? "AVISADO"
          : "WHATSAPP";
    if (enviado) emails++;
    if (status === "WHATSAPP") whatsapp++;
    await prisma.$executeRawUnsafe(
      `UPDATE avisos_preco SET status = ?, preco_aviso_brl = ?, baixou_em = CURRENT_TIMESTAMP(3),
         avisado_em = ${status === "AVISADO" ? "CURRENT_TIMESTAMP(3)" : "NULL"} WHERE id = ?`,
      status,
      atual,
      a.id,
    );
  }
  return { baixaram: baixaram.length, emails, whatsapp };
}

async function sininho(a: Aviso) {
  const pt = a.idioma === "pt";
  await prisma.notificacoes.create({
    data: {
      user_id: a.user_id!,
      titulo: pt ? `Baixou o preço: ${a.sku}` : `Bajó el precio: ${a.sku}`,
      texto: pt
        ? "A peça que você pediu para acompanhar está mais barata."
        : "La pieza que pediste seguir está más barata.",
      link: `${pt ? "/pt" : ""}/produto/${encodeURIComponent(a.sku)}`,
    },
  });
}

async function emailAviso(a: Aviso, atual: number) {
  const { resendConfigurado, enviarUm, montarMensagem } = await import("./email.server");
  if (!resendConfigurado() || !a.email) return false;
  const { produtosEmail } = await import("./automacoes.server");
  const { SITE_URL } = await import("./site");
  const produtos = await produtosEmail(
    [a.sku],
    undefined,
    new Map([[a.sku, a.preco_ref_brl]]),
    a.idioma,
  );
  if (!produtos.length) return false;
  const pt = a.idioma === "pt";
  const queda = Math.round((1 - atual / a.preco_ref_brl) * 100);
  const m = montarMensagem(
    {
      destaque: pt ? "BAIXOU O PREÇO" : "BAJÓ EL PRECIO",
      titulo: pt
        ? "A peça que você acompanha ficou mais barata"
        : "La pieza que seguís bajó de precio",
      texto: pt
        ? `Você pediu para avisar quando o preço baixasse. Baixou${queda >= 1 ? ` ${queda}%` : ""}. Peça pelo WhatsApp enquanto vale este preço.`
        : `Nos pediste que te avisáramos cuando bajara. Bajó${queda >= 1 ? ` ${queda}%` : ""}. Pedila por WhatsApp mientras vale este precio.`,
      produtos,
      produtosTitulo: pt ? "Novo preço" : "Nuevo precio",
      whatsapp: true,
      botaoTexto: pt ? "Ver a peça" : "Ver la pieza",
      botaoUrl: `/produto/${encodeURIComponent(a.sku)}`,
      cor: "#1f6fb5",
    },
    pt ? `Baixou o preço: ${produtos[0].nome}` : `Bajó el precio: ${produtos[0].nome}`,
    pt ? "A peça que você acompanha ficou mais barata." : "La pieza que seguís está más barata.",
    SITE_URL,
    { email: a.email },
    undefined,
    {
      idioma: a.idioma,
      // "Código: X" na mensagem: o painel registra a peça do pedido
      whatsappUrl: whatsappContactUrl(
        pt
          ? `Olá! Recebi o aviso de que baixou o preço desta peça e quero comprar:\nCódigo: ${a.sku}`
          : `¡Hola! Me llegó el aviso de que bajó el precio de esta pieza y la quiero:\nCódigo: ${a.sku}`,
      ),
    },
  );
  await enviarUm(m);
  return true;
}

// ---------- Admin ----------
export type AvisoAdmin = {
  id: number;
  sku: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  idioma: string;
  status: string;
  refBrl: number;
  avisoBrl: number | null;
  atualBrl: number | null;
  criado: string;
  baixouEm: string | null;
  avisadoEm: string | null;
};

export async function listarAvisos(): Promise<{
  avisos: AvisoAdmin[];
  resumo: Record<string, number>;
  pecas: Array<{ sku: string; nome: string; pessoas: number }>;
}> {
  await garantirTabelaAvisos();
  const rows = await prisma.$queryRawUnsafe<any[]>(
    "SELECT * FROM avisos_preco ORDER BY (status = 'WHATSAPP') DESC, id DESC LIMIT 400",
  );
  const skus = [...new Set(rows.map((r) => String(r.sku)))];
  const [nomes, precos, cont] = await Promise.all([
    skus.length
      ? prisma.agricolas.findMany({
          where: { sku: { in: skus } },
          select: { sku: true, nome: true, nome_es: true },
        })
      : [],
    skus.length ? precosAtuais(skus) : new Map<string, number>(),
    prisma.$queryRawUnsafe<Array<{ status: string; n: bigint }>>(
      "SELECT status, COUNT(*) n FROM avisos_preco GROUP BY status",
    ),
  ]);
  const nome = new Map(nomes.map((n) => [n.sku.trim(), n.nome_es || n.nome]));
  // Peças mais acompanhadas (avisos ativos): bom sinal de onde dar desconto
  const porPeca = new Map<string, number>();
  for (const r of rows) if (r.status === "ATIVO") porPeca.set(r.sku, (porPeca.get(r.sku) ?? 0) + 1);
  return {
    avisos: rows.map((r) => ({
      id: Number(r.id),
      sku: r.sku,
      nome: nome.get(r.sku) ?? r.sku,
      telefone: r.telefone,
      email: r.email,
      idioma: r.idioma,
      status: r.status,
      refBrl: Number(r.preco_ref_brl),
      avisoBrl: r.preco_aviso_brl == null ? null : Number(r.preco_aviso_brl),
      atualBrl: precos.get(r.sku) ?? null,
      criado: new Date(r.created_at).toISOString(),
      baixouEm: r.baixou_em ? new Date(r.baixou_em).toISOString() : null,
      avisadoEm: r.avisado_em ? new Date(r.avisado_em).toISOString() : null,
    })),
    resumo: Object.fromEntries(cont.map((c) => [c.status, Number(c.n)])),
    pecas: [...porPeca.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([sku, pessoas]) => ({ sku, nome: nome.get(sku) ?? sku, pessoas })),
  };
}

export async function marcarAvisoWhatsapp(id: number) {
  await garantirTabelaAvisos();
  await prisma.$executeRawUnsafe(
    "UPDATE avisos_preco SET status = 'AVISADO', avisado_em = CURRENT_TIMESTAMP(3) WHERE id = ? AND status = 'WHATSAPP'",
    id,
  );
}
