// Contato pelo WhatsApp (pop-up): quem não quer criar conta deixa só o celular. Ganha o cupom de
// boas-vindas e o WhatsApp de preço abre na hora. O admin vê os contatos em Site → Pop-up
// (com as peças que a pessoa viu) e em Visitantes quentes. Sem conta e sem e-mail: não recebe
// e-mails; o contato é feito pela equipe no WhatsApp.
import { randomInt } from "crypto";
import { prisma } from "./prisma";
import { normalizarCelularBR, normalizarCelularUY } from "./validacao-conta";

async function criarTabela() {
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS \`contatos_whatsapp\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`telefone\` VARCHAR(20) NOT NULL,
    \`nome\` VARCHAR(120) NULL,
    \`cupom\` VARCHAR(20) NULL,
    \`cupom_usado_em\` DATETIME(3) NULL,
    \`idioma\` VARCHAR(2) NOT NULL DEFAULT 'es',
    \`motivo\` VARCHAR(20) NULL,
    \`pagina\` VARCHAR(300) NULL,
    \`interesse\` TEXT NULL,
    \`visitor_id\` VARCHAR(64) NULL,
    \`fonte\` VARCHAR(40) NULL,
    \`utm_campaign\` VARCHAR(150) NULL,
    \`cidade\` VARCHAR(191) NULL,
    \`vezes\` INTEGER NOT NULL DEFAULT 1,
    \`status\` VARCHAR(20) NOT NULL DEFAULT 'NOVO',
    \`nota\` TEXT NULL,
    \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updated_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX \`contatos_whatsapp_telefone_key\`(\`telefone\`),
    UNIQUE INDEX \`contatos_whatsapp_cupom_key\`(\`cupom\`),
    INDEX \`contatos_whatsapp_visitor_id_idx\`(\`visitor_id\`),
    INDEX \`contatos_whatsapp_created_at_idx\`(\`created_at\`),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
}
let tabela: Promise<void> | null = null;
export const garantirTabelaContatos = () =>
  (tabela ??= criarTabela().catch((e) => {
    tabela = null;
    throw e;
  }));

// Celular do Uruguai ou do Brasil. Na versão em português tenta o Brasil primeiro.
export function normalizarCelular(entrada: string, idioma: "es" | "pt") {
  const d = (entrada || "").replace(/\D/g, "");
  const brPrimeiro = idioma === "pt" || (d.startsWith("55") && d.length >= 12);
  return brPrimeiro
    ? (normalizarCelularBR(entrada) ?? normalizarCelularUY(entrada))
    : (normalizarCelularUY(entrada) ?? normalizarCelularBR(entrada));
}

// Mesmo formato do cupom das contas (AGRO-7F3K), sem repetir nenhum dos dois
const ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
async function novoCupom() {
  for (let i = 0; i < 8; i++) {
    const c =
      "AGRO-" + Array.from({ length: 4 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
    const [u, k] = await Promise.all([
      prisma.users.count({ where: { cupom: c } }),
      prisma.$queryRawUnsafe<unknown[]>(
        "SELECT 1 FROM contatos_whatsapp WHERE cupom = ? LIMIT 1",
        c,
      ),
    ]);
    if (!u && !k.length) return c;
  }
  return null;
}

// Limite por IP: 5 contatos a cada 10 minutos (o mesmo celular de novo não conta)
const porIp = new Map<string, number[]>();
export function ipLiberado(ip: string) {
  const agora = Date.now();
  const l = (porIp.get(ip) ?? []).filter((t) => agora - t < 10 * 60_000);
  if (l.length >= 5) return false;
  porIp.set(ip, [...l, agora]);
  if (porIp.size > 5000) porIp.clear();
  return true;
}

const texto = (v: unknown, max: number) =>
  typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null;

export type DadosContato = {
  telefone: string;
  nome?: unknown;
  idioma: "es" | "pt";
  motivo?: unknown;
  pagina?: unknown;
  interesse?: unknown; // código da peça ou termo buscado
  visitorId?: unknown;
};
type Linha = {
  id: number;
  telefone: string;
  nome: string | null;
  cupom: string | null;
  cupom_usado_em: Date | null;
  interesse: string | null;
};

// Grava (ou atualiza) o contato. Devolve o cupom e se é novo.
export async function registrarContato(d: DadosContato) {
  await garantirTabelaContatos();
  const telefone = normalizarCelular(d.telefone, d.idioma);
  if (!telefone) return { erro: "celular" as const };
  const nome = texto(d.nome, 120);
  const motivo = texto(d.motivo, 20);
  const pagina = texto(d.pagina, 300);
  const interesse = texto(d.interesse, 120);
  const visitorId = texto(d.visitorId, 64);
  // Origem e cidade: da última visita deste visitante
  const v = visitorId
    ? await prisma.site_visits.findFirst({
        where: { visitor_id: visitorId },
        orderBy: { id: "desc" },
        select: { fonte: true, utm_campaign: true, city: true },
      })
    : null;
  const [atual] = await prisma.$queryRawUnsafe<Linha[]>(
    "SELECT id, telefone, nome, cupom, cupom_usado_em, interesse FROM contatos_whatsapp WHERE telefone = ? LIMIT 1",
    telefone,
  );
  if (atual) {
    const lista: string[] = JSON.parse(atual.interesse || "[]");
    if (interesse && !lista.includes(interesse)) lista.push(interesse);
    const cupom = atual.cupom ?? (await novoCupom());
    await prisma.$executeRawUnsafe(
      `UPDATE contatos_whatsapp SET nome = COALESCE(?, nome), cupom = ?, interesse = ?,
        visitor_id = COALESCE(?, visitor_id), vezes = vezes + 1, updated_at = CURRENT_TIMESTAMP(3)
       WHERE id = ?`,
      nome,
      cupom,
      JSON.stringify(lista.slice(-30)),
      visitorId,
      atual.id,
    );
    return {
      id: atual.id,
      telefone,
      cupom,
      usado: !!atual.cupom_usado_em,
      nome: nome ?? atual.nome,
      novo: false,
    };
  }
  const cupom = await novoCupom();
  await prisma.$executeRawUnsafe(
    `INSERT INTO contatos_whatsapp
      (telefone, nome, cupom, idioma, motivo, pagina, interesse, visitor_id, fonte, utm_campaign, cidade)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    telefone,
    nome,
    cupom,
    d.idioma,
    motivo,
    pagina,
    JSON.stringify(interesse ? [interesse] : []),
    visitorId,
    v?.fonte ?? null,
    v?.utm_campaign ?? null,
    v?.city ?? null,
  );
  const [criado] = await prisma.$queryRawUnsafe<Array<{ id: number }>>(
    "SELECT id FROM contatos_whatsapp WHERE telefone = ? LIMIT 1",
    telefone,
  );
  return { id: criado.id, telefone, cupom, usado: false, nome, novo: true };
}

export type ContatoWhatsapp = {
  id: number;
  telefone: string;
  nome: string | null;
  cupom: string | null;
  usadoEm: string | null;
  idioma: string;
  motivo: string | null;
  pagina: string | null;
  interesse: string[];
  fonte: string | null;
  campanha: string | null;
  cidade: string | null;
  vezes: number;
  status: string;
  nota: string | null;
  criado: string;
  atualizado: string;
  pecasVistas: number;
};

// Admin: contatos mais recentes (busca por celular, nome ou cupom)
export async function listarContatos(busca = "", dias = 90): Promise<ContatoWhatsapp[]> {
  await garantirTabelaContatos();
  const q = busca.trim();
  const desde = new Date(Date.now() - dias * 86400_000);
  const rows = await prisma.$queryRawUnsafe<any[]>(
    `SELECT * FROM contatos_whatsapp
     WHERE updated_at >= ? ${q ? "AND (telefone LIKE ? OR nome LIKE ? OR cupom LIKE ?)" : ""}
     ORDER BY updated_at DESC LIMIT 300`,
    desde,
    ...(q ? [`%${q.replace(/\s/g, "")}%`, `%${q}%`, `%${q.toUpperCase()}%`] : []),
  );
  // Peças vistas por cada visitante (para saber o que oferecer)
  const vids = rows.map((r) => r.visitor_id).filter(Boolean) as string[];
  const vistas = vids.length
    ? await prisma.site_visits.groupBy({
        by: ["visitor_id"],
        where: {
          visitor_id: { in: vids },
          OR: [{ path: { startsWith: "/produto/" } }, { path: { startsWith: "/pt/produto/" } }],
        },
        _count: true,
      })
    : [];
  const n = new Map(vistas.map((v) => [v.visitor_id, v._count]));
  return rows.map((r) => ({
    id: Number(r.id),
    telefone: r.telefone,
    nome: r.nome,
    cupom: r.cupom,
    usadoEm: r.cupom_usado_em ? new Date(r.cupom_usado_em).toISOString() : null,
    idioma: r.idioma,
    motivo: r.motivo,
    pagina: r.pagina,
    interesse: JSON.parse(r.interesse || "[]"),
    fonte: r.fonte,
    campanha: r.utm_campaign,
    cidade: r.cidade,
    vezes: Number(r.vezes),
    status: r.status,
    nota: r.nota,
    criado: new Date(r.created_at).toISOString(),
    atualizado: new Date(r.updated_at).toISOString(),
    pecasVistas: (r.visitor_id && n.get(r.visitor_id)) || 0,
  }));
}

export const STATUS_CONTATO = ["NOVO", "CONTATADO", "NEGOCIANDO", "GANHO", "PERDIDO"] as const;

export async function atualizarContato(
  id: number,
  o: { status?: string; nota?: string | null; usado?: boolean },
) {
  await garantirTabelaContatos();
  if (o.status && STATUS_CONTATO.includes(o.status as any))
    await prisma.$executeRawUnsafe(
      "UPDATE contatos_whatsapp SET status = ? WHERE id = ?",
      o.status,
      id,
    );
  if (o.nota !== undefined)
    await prisma.$executeRawUnsafe(
      "UPDATE contatos_whatsapp SET nota = ? WHERE id = ?",
      o.nota ? String(o.nota).slice(0, 2000) : null,
      id,
    );
  if (o.usado !== undefined)
    await prisma.$executeRawUnsafe(
      "UPDATE contatos_whatsapp SET cupom_usado_em = ? WHERE id = ?",
      o.usado ? new Date() : null,
      id,
    );
}
