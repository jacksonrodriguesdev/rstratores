// Campanha de Instagram "comentou → DM": quem comenta a palavra-chave numa publicação recebe
// um DM (private reply) com o link do prêmio. O link leva ao cadastro; ao criar a conta, o
// cliente ganha o prêmio (cashback na carteira). Ler comentários usa a permissão que já temos
// (manage_comments); ENVIAR DM exige instagram_business_manage_messages (App Review da Meta).

const SITE = () => (process.env.SITE_URL || "https://agropartsuy.com").replace(/\/+$/, "");

export type DadosCampanhaDm = {
  id?: number;
  nome: string;
  media_id?: string | null;
  permalink?: string | null;
  palavra: string;
  dm_texto: string;
  resposta_publica?: string | null;
  premio: "CASHBACK" | "CUPOM";
  valor: number;
  validade_dias: number;
  ativo: boolean;
};

const txt = (s: unknown, max: number) =>
  String(s ?? "")
    .trim()
    .slice(0, max);

function limpar(d: DadosCampanhaDm) {
  const nome = txt(d.nome, 120);
  const palavra = txt(d.palavra, 60).toLowerCase();
  if (!nome) throw new Error("Dê um nome à campanha.");
  if (!palavra) throw new Error("Defina a palavra-chave do comentário.");
  return {
    nome,
    media_id: txt(d.media_id, 64) || null,
    permalink: txt(d.permalink, 300) || null,
    palavra,
    dm_texto: txt(d.dm_texto, 2000) || "¡Gracias por comentar! Activá tu regalo acá: {{link}}",
    resposta_publica: txt(d.resposta_publica, 200) || null,
    premio: d.premio === "CUPOM" ? "CUPOM" : "CASHBACK",
    valor: Math.max(0, Math.round(Number(d.valor) || 0)),
    validade_dias: Math.max(1, Math.round(Number(d.validade_dias) || 30)),
    ativo: !!d.ativo,
  };
}

// Link do prêmio (vai no DM). /ig/<id> grava um cookie e manda pro cadastro.
export function linkDaCampanha(id: number) {
  return `${SITE()}/ig/${id}`;
}
// Troca {{link}} pelo link real no texto do DM.
export function textoDoDm(dmTexto: string, id: number) {
  const link = linkDaCampanha(id);
  return dmTexto.includes("{{link}}")
    ? dmTexto.replace(/\{\{\s*link\s*\}\}/g, link)
    : `${dmTexto}\n${link}`;
}

// ---------------------------------------------------------------- CRUD
export async function listarCampanhasDm() {
  const { prisma } = await import("./prisma");
  const campanhas = await prisma.ig_campanha_dm.findMany({
    orderBy: { created_at: "desc" },
    take: 100,
  });
  return campanhas.map((c) => ({ ...c, link: linkDaCampanha(c.id) }));
}

export async function campanhaDm(id: number) {
  const { prisma } = await import("./prisma");
  const c = await prisma.ig_campanha_dm.findUnique({ where: { id } });
  return c ? { ...c, link: linkDaCampanha(c.id) } : null;
}

export async function salvarCampanhaDm(d: DadosCampanhaDm) {
  const { prisma } = await import("./prisma");
  const dados = limpar(d);
  if (d.id) return prisma.ig_campanha_dm.update({ where: { id: d.id }, data: dados });
  return prisma.ig_campanha_dm.create({ data: dados });
}

export async function ativarCampanhaDm(id: number, ativo: boolean) {
  const { prisma } = await import("./prisma");
  await prisma.ig_campanha_dm.update({ where: { id }, data: { ativo } });
}

export async function excluirCampanhaDm(id: number) {
  const { prisma } = await import("./prisma");
  await prisma.ig_campanha_dm.delete({ where: { id } });
}

// Publicações recentes do Instagram (para escolher o post da campanha no admin).
export async function postsRecentesIg() {
  try {
    const { igChamada } = await import("./instagram.server");
    const j = await igChamada("me/media", {
      fields: "id,caption,media_type,media_url,thumbnail_url,permalink,timestamp",
      limit: "25",
    });
    return (j.data ?? []).map((m: any) => ({
      id: String(m.id),
      legenda: (m.caption ?? "").slice(0, 120),
      permalink: m.permalink ?? null,
      foto: m.thumbnail_url || m.media_url || null,
      tipo: m.media_type ?? null,
    }));
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------- comentários
// Lê os comentários do post da campanha, bate a palavra-chave e grava os que faltam (PENDENTE).
// Funciona HOJE (manage_comments). O envio do DM é um passo à parte.
export async function sincronizarComentarios(id: number) {
  const { prisma } = await import("./prisma");
  const camp = await prisma.ig_campanha_dm.findUnique({ where: { id } });
  if (!camp || !camp.media_id) return { novos: 0, erro: "Campanha sem post vinculado." };
  const { igChamada } = await import("./instagram.server");
  let data: any[] = [];
  try {
    const j = await igChamada(`${camp.media_id}/comments`, {
      fields: "id,text,username,timestamp,from",
      limit: "100",
    });
    data = j.data ?? [];
  } catch (e: any) {
    return { novos: 0, erro: e?.message || "Não foi possível ler os comentários." };
  }
  const palavra = camp.palavra.toLowerCase();
  let novos = 0;
  for (const c of data) {
    const texto = String(c.text ?? "");
    if (!texto.toLowerCase().includes(palavra)) continue;
    try {
      await prisma.ig_dm_log.create({
        data: {
          campanha_id: id,
          comment_id: String(c.id),
          ig_user_id: c.from?.id ? String(c.from.id) : null,
          ig_username: c.username ?? c.from?.username ?? null,
          texto: texto.slice(0, 300),
        },
      });
      novos++;
    } catch {
      /* já registrado (unique campanha_id+comment_id) */
    }
  }
  if (novos)
    await prisma.ig_campanha_dm.update({
      where: { id },
      data: { comentarios: { increment: novos } },
    });
  return { novos };
}

export async function comentariosDaCampanha(id: number) {
  const { prisma } = await import("./prisma");
  return prisma.ig_dm_log.findMany({
    where: { campanha_id: id },
    orderBy: { created_at: "desc" },
    take: 300,
  });
}

// Envia o DM (private reply) ao comentário. Exige a permissão de mensagens (App Review).
export async function enviarDmLog(logId: number) {
  const { prisma } = await import("./prisma");
  const log = await prisma.ig_dm_log.findUnique({
    where: { id: logId },
    include: { campanha: true },
  });
  if (!log) return { ok: false, erro: "Registro não encontrado." };
  if (log.dm_status === "ENVIADO") return { ok: true };
  const texto = textoDoDm(log.campanha.dm_texto, log.campanha_id);
  try {
    const { igChamada } = await import("./instagram.server");
    await igChamada(
      "me/messages",
      {
        recipient: JSON.stringify({ comment_id: log.comment_id }),
        message: JSON.stringify({ text: texto }),
      },
      "POST",
    );
    // resposta pública (opcional)
    if (log.campanha.resposta_publica) {
      try {
        await igChamada(
          `${log.comment_id}/replies`,
          { message: log.campanha.resposta_publica },
          "POST",
        );
      } catch {
        /* reply pública falhou: segue mesmo assim */
      }
    }
    await prisma.ig_dm_log.update({
      where: { id: logId },
      data: { dm_status: "ENVIADO", dm_erro: null },
    });
    await prisma.ig_campanha_dm.update({
      where: { id: log.campanha_id },
      data: { dms: { increment: 1 } },
    });
    return { ok: true };
  } catch (e: any) {
    await prisma.ig_dm_log.update({
      where: { id: logId },
      data: { dm_status: "ERRO", dm_erro: String(e?.message || "").slice(0, 300) },
    });
    return { ok: false, erro: e?.message || "Falha ao enviar o DM." };
  }
}

// Marca como enviado manualmente (quando o admin manda o DM pelo app do Instagram).
export async function marcarManual(logId: number) {
  const { prisma } = await import("./prisma");
  await prisma.ig_dm_log.update({ where: { id: logId }, data: { dm_status: "MANUAL" } });
}

// ---------------------------------------------------------------- webhook (comentários em tempo real)
// Chamado pela rota /api/instagram/webhook quando chega um comentário novo.
export async function processarComentarioWebhook(ev: {
  mediaId: string;
  commentId: string;
  texto: string;
  username?: string | null;
  igUserId?: string | null;
}) {
  const { prisma } = await import("./prisma");
  const camp = await prisma.ig_campanha_dm.findFirst({
    where: { ativo: true, media_id: ev.mediaId },
  });
  if (!camp) return;
  if (!ev.texto.toLowerCase().includes(camp.palavra.toLowerCase())) return;
  let log;
  try {
    log = await prisma.ig_dm_log.create({
      data: {
        campanha_id: camp.id,
        comment_id: ev.commentId,
        ig_user_id: ev.igUserId ?? null,
        ig_username: ev.username ?? null,
        texto: ev.texto.slice(0, 300),
      },
    });
    await prisma.ig_campanha_dm.update({
      where: { id: camp.id },
      data: { comentarios: { increment: 1 } },
    });
  } catch {
    return; // já processado
  }
  await enviarDmLog(log.id);
}

// ---------------------------------------------------------------- resgate do prêmio (no cadastro)
function lerCookie(request: Request, nome: string): string | null {
  const cru = request.headers.get("cookie");
  if (!cru) return null;
  for (const parte of cru.split(";")) {
    const [k, ...v] = parte.trim().split("=");
    if (k === nome) return decodeURIComponent(v.join("="));
  }
  return null;
}

// Chamado quando uma conta nova é criada: se veio do link da campanha (cookie igdm), dá o prêmio.
export async function resgatarIgDm(request: Request, userId: number) {
  const bruto = lerCookie(request, "igdm");
  const id = Number(bruto);
  if (!id) return;
  const { prisma } = await import("./prisma");
  const camp = await prisma.ig_campanha_dm.findUnique({ where: { id } });
  if (!camp) return;
  const ref = `ig:${id}`;
  // já resgatou esta campanha?
  const ja = await prisma.carteira_movimentos.findFirst({ where: { user_id: userId, ref } });
  if (ja) return;
  let resgatou = false;
  if (camp.premio === "CASHBACK" && camp.valor > 0) {
    const { creditar } = await import("./carteira.server");
    const r = await creditar({
      userId,
      valor: camp.valor,
      motivo: "PROMO",
      descricao: `Instagram: ${camp.nome}`,
      ref,
      validadeDias: camp.validade_dias,
    });
    resgatou = r.ok;
  }
  await prisma.ig_campanha_dm.update({
    where: { id },
    data: { cadastros: { increment: 1 }, ...(resgatou && { resgates: { increment: 1 } }) },
  });
}
