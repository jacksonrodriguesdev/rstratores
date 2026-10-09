import { createHmac, timingSafeEqual } from "crypto";
import { renderEmail, textoEmail, personalizar, type ConteudoEmail, type Publico, type DadosRender } from "./email-template";
import { PHONE } from "./whatsapp";

// Envio de e-mails pelo Resend (https://resend.com).
// .env / Hostinger:
//   RESEND_API_KEY          chave da API (re_...)
//   EMAIL_REMETENTE         ex.: AGRO PARTS <novedades@agropartsuy.com>  (domínio verificado no Resend)
//   EMAIL_RESPONDER_PARA    opcional: e-mail que recebe as respostas dos clientes
//   EMAIL_ENDERECO          opcional: endereço físico mostrado no rodapé
//   RESEND_WEBHOOK_SECRET   opcional: whsec_... do webhook (aberturas, cliques, rebotes)
// RESEND_API_URL só serve para testes locais (servidor falso); em produção fica o padrão
const API = (process.env.RESEND_API_URL || "https://api.resend.com").replace(/\/+$/, "");

export function resendConfigurado() {
  return !!process.env.RESEND_API_KEY?.trim() && !!process.env.EMAIL_REMETENTE?.trim();
}

export function configEmail() {
  return {
    configurado: resendConfigurado(),
    chave: !!process.env.RESEND_API_KEY?.trim(),
    remetente: process.env.EMAIL_REMETENTE?.trim() || null,
    responderPara: process.env.EMAIL_RESPONDER_PARA?.trim() || null,
    webhook: !!process.env.RESEND_WEBHOOK_SECRET?.trim(),
  };
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Mensagem = { to: string; subject: string; html: string; text: string; headers?: Record<string, string> };

async function chamar(caminho: string, corpo: unknown): Promise<any> {
  for (let tentativa = 0; ; tentativa++) {
    const r = await fetch(API + caminho, {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const j = await r.json().catch(() => ({}));
    // Limite de velocidade do Resend: espera e tenta de novo
    if (r.status === 429 && tentativa < 4) {
      await espera(1500 * (tentativa + 1));
      continue;
    }
    if (!r.ok) throw new Error(j?.message || j?.error || `Resend respondeu ${r.status}`);
    return j;
  }
}

const base = () => ({
  from: process.env.EMAIL_REMETENTE!.trim(),
  ...(process.env.EMAIL_RESPONDER_PARA?.trim() && { reply_to: process.env.EMAIL_RESPONDER_PARA.trim() }),
});

export async function enviarUm(m: Mensagem): Promise<string> {
  if (!resendConfigurado()) throw new Error("Resend não configurado (RESEND_API_KEY e EMAIL_REMETENTE).");
  const j = await chamar("/emails", { ...base(), to: [m.to], subject: m.subject, html: m.html, text: m.text, headers: m.headers });
  return j.id as string;
}

// Até 100 e-mails por chamada. Devolve os ids na mesma ordem.
export async function enviarLote(ms: Mensagem[]): Promise<string[]> {
  const j = await chamar(
    "/emails/batch",
    ms.map((m) => ({ ...base(), to: [m.to], subject: m.subject, html: m.html, text: m.text, headers: m.headers })),
  );
  return (j.data ?? []).map((d: any) => d.id as string);
}

// ---------- Descadastro ("darse de baja") ----------
function segredo() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET ausente");
  return s;
}
export function tokenBaixa(userId: number) {
  return createHmac("sha256", segredo()).update(`baja:${userId}`).digest("base64url").slice(0, 24);
}
export function tokenBaixaValido(userId: number, token: string) {
  const a = Buffer.from(tokenBaixa(userId));
  const b = Buffer.from(String(token));
  return a.length === b.length && timingSafeEqual(a, b);
}
export const urlBaixa = (origem: string, userId: number) => `${origem}/baja?u=${userId}&t=${tokenBaixa(userId)}`;
const urlBaixaUmClique = (origem: string, userId: number) =>
  `${origem}/api/public/email-baja?u=${userId}&t=${tokenBaixa(userId)}`;

// Cabeçalhos que fazem o Gmail/Outlook mostrarem o botão "Cancelar inscrição"
export const cabecalhosBaixa = (origem: string, userId: number) => ({
  "List-Unsubscribe": `<${urlBaixaUmClique(origem, userId)}>`,
  "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
});

export function dadosRender(origem: string, extra: Partial<DadosRender> = {}): DadosRender {
  return {
    origem,
    whatsappUrl: `https://api.whatsapp.com/send?phone=${PHONE}&text=${encodeURIComponent("¡Hola! Vi el e-mail de AGRO PARTS y quiero cotizar repuestos.")}`,
    enderecoRodape: process.env.EMAIL_ENDERECO?.trim() || undefined,
    ...extra,
  };
}

export function montarMensagem(
  conteudo: ConteudoEmail,
  assunto: string,
  preheader: string | null,
  origem: string,
  dest: { id?: number; email: string; nome?: string | null },
  campanha?: string,
): Mensagem {
  const d = dadosRender(origem, {
    nome: dest.nome,
    preheader,
    campanha,
    urlBaixa: dest.id ? urlBaixa(origem, dest.id) : null,
  });
  return {
    to: dest.email,
    subject: personalizar(assunto, dest.nome),
    html: renderEmail(conteudo, d),
    text: textoEmail(conteudo, d),
    headers: dest.id ? cabecalhosBaixa(origem, dest.id) : undefined,
  };
}

// ---------- Público das campanhas ----------
export async function destinatarios(p: Publico) {
  const { prisma } = await import("./prisma");
  const desde = new Date(Date.now() - Math.max(1, Number(p.dias) || 30) * 86400000);
  const where: any = { role: { not: "ADMIN" }, recebe_emails: true };
  if (p.tipo === "departamentos") where.departamento = { in: p.departamentos?.length ? p.departamentos : ["-"] };
  if (p.tipo === "carrinho") where.carrinhos = { some: { updated_at: { gte: desde } } };
  if (p.tipo === "catalogos") where.downloads = { some: { created_at: { gte: desde } } };
  if (p.tipo === "recentes") where.created_at = { gte: desde };
  if (p.tipo === "inativos") where.OR = [{ ultimo_login: null }, { ultimo_login: { lt: desde } }];
  const rows = await prisma.users.findMany({ where, select: { id: true, email: true, nome_completo: true }, orderBy: { id: "asc" } });
  // Só e-mails com formato válido
  return rows.filter((r) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email));
}

// ---------- Envio de campanha (em segundo plano, em lotes de 100) ----------
const rodando = new Set<number>();
export const campanhaRodando = (id: number) => rodando.has(id);

const slug = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);

export async function processarCampanha(id: number, origem: string) {
  if (rodando.has(id)) return;
  rodando.add(id);
  const { prisma } = await import("./prisma");
  try {
    const c = await prisma.email_campanhas.findUnique({ where: { id } });
    if (!c) return;
    const conteudo = JSON.parse(c.conteudo) as ConteudoEmail;
    const publico = JSON.parse(c.publico) as Publico;
    const lista = await destinatarios(publico);
    // Quem já recebeu esta campanha não recebe de novo (permite retomar ou mandar aos novos)
    const ja = new Set(
      (await prisma.email_envios.findMany({ where: { campanha_id: id, status: { not: "FALHA" } }, select: { user_id: true } })).map((e) => e.user_id),
    );
    const pendentes = lista.filter((u) => !ja.has(u.id));
    await prisma.email_campanhas.update({
      where: { id },
      data: { status: "ENVIANDO", erro: null, total: ja.size + pendentes.length, enviados: ja.size, falhas: 0 },
    });
    const tag = slug(c.nome) || `campanha-${id}`;
    for (let i = 0; i < pendentes.length; i += 100) {
      const lote = pendentes.slice(i, i + 100);
      const msgs = lote.map((u) => montarMensagem(conteudo, c.assunto, c.preheader, origem, { id: u.id, email: u.email, nome: u.nome_completo }, tag));
      try {
        const ids = await enviarLote(msgs);
        await prisma.email_envios.createMany({
          data: lote.map((u, k) => ({ campanha_id: id, user_id: u.id, email: u.email, tipo: "CAMPANHA", status: "ENVIADO", resend_id: ids[k] ?? null })),
        });
        await prisma.email_campanhas.update({ where: { id }, data: { enviados: { increment: lote.length } } });
      } catch (e: any) {
        await prisma.email_envios.createMany({
          data: lote.map((u) => ({ campanha_id: id, user_id: u.id, email: u.email, tipo: "CAMPANHA", status: "FALHA", erro: String(e?.message ?? e).slice(0, 500) })),
        });
        await prisma.email_campanhas.update({ where: { id }, data: { falhas: { increment: lote.length }, erro: String(e?.message ?? e).slice(0, 500) } });
      }
      await espera(600); // respeita o limite de 2 chamadas por segundo do Resend
    }
    await prisma.email_campanhas.update({ where: { id }, data: { status: "ENVIADA", enviado_em: new Date() } });
  } catch (e: any) {
    console.error("campanha", id, e);
    await prisma.email_campanhas.update({ where: { id }, data: { status: "ERRO", erro: String(e?.message ?? e).slice(0, 500) } }).catch(() => {});
  } finally {
    rodando.delete(id);
  }
}

// ---------- Webhook do Resend (assinatura Svix) ----------
export function webhookValido(corpo: string, h: Headers): boolean {
  const secret = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!secret) return false;
  const id = h.get("svix-id"), ts = h.get("svix-timestamp"), assinaturas = h.get("svix-signature");
  if (!id || !ts || !assinaturas) return false;
  if (Math.abs(Date.now() / 1000 - Number(ts)) > 300) return false;
  const chave = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const esperado = createHmac("sha256", chave).update(`${id}.${ts}.${corpo}`).digest("base64");
  return assinaturas.split(" ").some((s) => {
    const v = s.split(",")[1] ?? "";
    return v.length === esperado.length && timingSafeEqual(Buffer.from(v), Buffer.from(esperado));
  });
}

const ORDEM = ["ENVIADO", "ENTREGUE", "ABERTO", "CLICADO"];
export async function registrarEventoWebhook(ev: { type?: string; data?: any }) {
  const { prisma } = await import("./prisma");
  const resendId = ev.data?.email_id;
  if (!resendId || !ev.type) return;
  const envio = await prisma.email_envios.findFirst({ where: { resend_id: resendId } });
  if (!envio) return;
  const agora = new Date();
  const novo: Record<string, string> = {
    "email.delivered": "ENTREGUE",
    "email.opened": "ABERTO",
    "email.clicked": "CLICADO",
    "email.bounced": "REBOTADO",
    "email.complained": "QUEIXA",
  };
  const st = novo[ev.type];
  if (!st) return;
  const data: any = {};
  if (st === "ABERTO" && !envio.aberto_em) data.aberto_em = agora;
  if (st === "CLICADO") {
    if (!envio.clicado_em) data.clicado_em = agora;
    if (!envio.aberto_em) data.aberto_em = agora;
  }
  // Status só avança (aberto não volta para entregue); rebote/queixa sempre vale
  if (st === "REBOTADO" || st === "QUEIXA" || ORDEM.indexOf(st) > ORDEM.indexOf(envio.status)) data.status = st;
  if (Object.keys(data).length) await prisma.email_envios.update({ where: { id: envio.id }, data });
  // Quem reclamou de spam ou tem e-mail inexistente não recebe mais campanhas
  if (st === "QUEIXA" || st === "REBOTADO") {
    await prisma.users.updateMany({ where: { email: envio.email }, data: { recebe_emails: false } });
  }
}
