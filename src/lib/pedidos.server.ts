// Acompanhamento do pedido: o admin troca a etapa da venda (Admin → Vendas) e o cliente recebe
// um e-mail e um aviso no sininho do site (se tiver conta). Sem conta, o cliente acompanha pela
// página /pedido/<código> (o mesmo código da venda, que vai no e-mail).
import { prisma } from "./prisma";
import { garantirTabelasAvaliacoes } from "./avaliacoes.server";
import { ETAPAS, etapaDe, indiceEtapa, nomeEtapa, type Etapa } from "./pedidos-comum";

const primeiro = (n?: string | null) => (n ?? "").trim().split(/\s+/)[0] || "";
const idiomaDe = (pais: string) => (pais === "BR" ? "pt" : "es") as "es" | "pt";
export const linkPedido = (origem: string, codigo: string, pais: string) =>
  `${origem.replace(/\/+$/, "")}${pais === "BR" ? "/pt" : ""}/pedido/${codigo}`;

// Conta do cliente: a da venda ou a do mesmo e-mail
async function contaDoCliente(v: { user_id: number | null; cliente_email: string | null }) {
  if (v.user_id) return v.user_id;
  if (!v.cliente_email) return null;
  const u = await prisma.users.findUnique({
    where: { email: v.cliente_email.toLowerCase() },
    select: { id: true },
  });
  return u?.id ?? null;
}

export type OpcoesEtapa = { nota?: string | null; email?: boolean; sininho?: boolean };

export async function mudarEtapa(vendaId: number, etapa: Etapa, o: OpcoesEtapa = {}) {
  await garantirTabelasAvaliacoes();
  if (!ETAPAS.some((e) => e.id === etapa)) throw new Error("Etapa inválida.");
  const v = await prisma.vendas.findUnique({ where: { id: vendaId } });
  if (!v) throw new Error("Venda não encontrada.");
  if (v.status === "CANCELADA") throw new Error("Venda cancelada: reabra antes de mudar a etapa.");
  const nota = (o.nota ?? "").trim().slice(0, 1000) || null;
  // A situação da venda acompanha a etapa (enviada / entregue)
  const status =
    etapa === "ENTREGUE"
      ? "ENTREGUE"
      : etapa === "DESPACHADO"
        ? "ENVIADA"
        : v.status === "ENVIADA" || v.status === "ENTREGUE"
          ? "ABERTA"
          : v.status;
  const atual = await prisma.vendas.update({ where: { id: v.id }, data: { etapa, status } });
  const idioma = idiomaDe(v.pais);
  const pt = idioma === "pt";
  const { SITE_URL } = await import("./site");
  const link = linkPedido(SITE_URL, v.codigo, v.pais);
  const titulo = nomeEtapa(etapa, idioma, v.transportadora);
  const info = etapaDe(etapa);
  const texto = [
    pt ? info.textoPt : info.textoEs,
    etapa === "DESPACHADO" && v.rastreio
      ? `${pt ? "Código de rastreio" : "Número de seguimiento"}: ${v.rastreio}`
      : "",
    nota ?? "",
  ]
    .filter(Boolean)
    .join("\n");

  // Sininho (cliente com conta)
  if (o.sininho !== false) {
    const uid = await contaDoCliente(v);
    if (uid)
      await prisma.notificacoes.create({
        data: {
          user_id: uid,
          titulo: `${pt ? "Pedido" : "Pedido"} ${v.codigo}: ${titulo}`.slice(0, 200),
          texto,
          link: `/pedido/${v.codigo}`,
        },
      });
  }
  // E-mail
  let enviado = false;
  if (o.email !== false && v.cliente_email) {
    enviado = await emailEtapa(v, etapa, texto, link).catch((e) => {
      console.error("e-mail da etapa do pedido:", e);
      return false;
    });
  }
  await prisma.venda_etapas.create({
    data: { venda_id: v.id, etapa, nota, email: enviado },
  });
  return { venda: atual, email: enviado };
}

async function emailEtapa(
  v: {
    codigo: string;
    cliente_nome: string;
    cliente_email: string | null;
    pais: string;
    user_id: number | null;
    transportadora: string | null;
  },
  etapa: Etapa,
  texto: string,
  link: string,
) {
  const { resendConfigurado, enviarUm, montarMensagem } = await import("./email.server");
  if (!resendConfigurado() || !v.cliente_email) return false;
  const { SITE_URL } = await import("./site");
  const idioma = idiomaDe(v.pais);
  const pt = idioma === "pt";
  const n = indiceEtapa(etapa);
  // Linha do tempo em texto: ✅ feitas, ➡️ atual, ⚪ próximas
  const linha = ETAPAS.map(
    (e, i) =>
      `${i < n ? "✅" : i === n ? "➡️" : "⚪"} ${i === n ? `**${nomeEtapa(e.id, idioma, v.transportadora)}**` : nomeEtapa(e.id, idioma, v.transportadora)}`,
  ).join("\n");
  const nome = primeiro(v.cliente_nome);
  const titulo = nomeEtapa(etapa, idioma, v.transportadora);
  const m = montarMensagem(
    {
      destaque: pt ? `PEDIDO ${v.codigo}` : `PEDIDO ${v.codigo}`,
      titulo: pt
        ? `${nome ? `${nome}, s` : "S"}eu pedido: ${titulo}`
        : `${nome ? `${nome}, t` : "T"}u pedido: ${titulo}`,
      texto: `${texto}\n\n${linha}`,
      produtos: [],
      whatsapp: true,
      botaoTexto: pt ? "Acompanhar meu pedido" : "Seguir mi pedido",
      botaoUrl: link,
      cor: "#0b7a3b",
    },
    pt ? `Pedido ${v.codigo}: ${titulo}` : `Pedido ${v.codigo}: ${titulo}`,
    pt ? "Atualização do seu pedido na AGRO PARTS." : "Novedades de tu pedido en AGRO PARTS.",
    SITE_URL,
    { id: v.user_id ?? undefined, email: v.cliente_email, nome: v.cliente_nome },
  );
  await enviarUm(m);
  return true;
}

// Linha do tempo de uma venda (página do pedido, conta do cliente e admin)
async function linhaDoTempo(vendaId: number) {
  const hist = await prisma.venda_etapas.findMany({
    where: { venda_id: vendaId },
    orderBy: { id: "asc" },
  });
  return hist.map((h) => ({
    etapa: h.etapa,
    nota: h.nota,
    email: h.email,
    quando: h.created_at.toISOString(),
  }));
}
function resumoPedido(v: any, hist: Awaited<ReturnType<typeof linhaDoTempo>>) {
  const itens = JSON.parse(v.itens || "[]") as Array<{ nome: string; codigo: string; qtd: number }>;
  return {
    codigo: v.codigo as string,
    primeiroNome: primeiro(v.cliente_nome),
    pais: v.pais as string,
    etapa: v.etapa as Etapa,
    cancelado: v.status === "CANCELADA",
    transportadora: v.transportadora as string | null,
    rastreio:
      v.etapa === "DESPACHADO" || v.etapa === "ENTREGUE" ? (v.rastreio as string | null) : null,
    criado: (v.created_at as Date).toISOString(),
    itens: itens.map((i) => ({ nome: i.nome, codigo: i.codigo, qtd: i.qtd })),
    historico: hist,
  };
}

// Página pública /pedido/<código> (sem dados pessoais além do primeiro nome)
export async function acompanharPedido(codigo: string) {
  await garantirTabelasAvaliacoes();
  const c = String(codigo ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 24);
  if (!/^[A-Z0-9]{6,24}$/.test(c)) return null;
  const v = await prisma.vendas.findUnique({ where: { codigo: c } });
  if (!v) return null;
  return resumoPedido(v, await linhaDoTempo(v.id));
}

// Conta do cliente: pedidos dele (pela conta ou pelo e-mail)
export async function meusPedidos(userId: number) {
  await garantirTabelasAvaliacoes();
  const u = await prisma.users.findUnique({ where: { id: userId }, select: { email: true } });
  if (!u) return [];
  const vs = await prisma.vendas.findMany({
    where: { OR: [{ user_id: userId }, { cliente_email: u.email.toLowerCase() }] },
    orderBy: { id: "desc" },
    take: 30,
  });
  const out = [];
  for (const v of vs) out.push(resumoPedido(v, await linhaDoTempo(v.id)));
  return out;
}

// Sininho
export async function minhasNotificacoes(userId: number) {
  await garantirTabelasAvaliacoes();
  const [lista, naoLidas] = await Promise.all([
    prisma.notificacoes.findMany({
      where: { user_id: userId },
      orderBy: { id: "desc" },
      take: 20,
    }),
    prisma.notificacoes.count({ where: { user_id: userId, lida: false } }),
  ]);
  return {
    naoLidas,
    lista: lista.map((n) => ({
      id: n.id,
      titulo: n.titulo,
      texto: n.texto,
      link: n.link,
      lida: n.lida,
      quando: n.created_at.toISOString(),
    })),
  };
}
export async function marcarLidas(userId: number) {
  await garantirTabelasAvaliacoes();
  await prisma.notificacoes.updateMany({
    where: { user_id: userId, lida: false },
    data: { lida: true },
  });
}

// Admin: histórico de uma venda
export async function historicoVenda(vendaId: number) {
  await garantirTabelasAvaliacoes();
  return linhaDoTempo(vendaId);
}
