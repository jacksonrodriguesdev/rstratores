// Admin → E-mail marketing → Peças vistas: controle da automação «peças vistas sem orçamento».
// Cada e-mail enviado com as peças e o cupom, e as respostas do cliente: abriu, clicou, chamou no
// WhatsApp (até 14 dias depois), usou o cupom e comprou (até 30 dias depois). Mostra também quem
// vai receber na próxima rodada.
import { prisma } from "./prisma";

const DIA = 86_400_000;
const lerSkus = (s: string | null) => {
  try {
    const v = JSON.parse(s || "[]");
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
};

export async function painelInteresse(dias: number) {
  const { garantirColunasEmail } = await import("./email.server");
  await garantirColunasEmail();
  const autos = await prisma.email_automacoes.findMany({
    where: { tipo: "interesse_sem_pedido" },
    orderBy: { id: "asc" },
  });
  const desde = new Date(Date.now() - dias * DIA);
  const envios = autos.length
    ? await prisma.email_envios.findMany({
        where: { automacao_id: { in: autos.map((a) => a.id) }, created_at: { gte: desde } },
        orderBy: { id: "desc" },
        take: 500,
      })
    : [];
  const uids = [...new Set(envios.map((e) => e.user_id).filter((x): x is number => !!x))];
  const emails = [...new Set(envios.map((e) => e.email.toLowerCase()))];
  const skus = [...new Set(envios.flatMap((e) => lerSkus(e.produtos)))];
  const cupons = envios.map((e) => e.cupom).filter((x): x is string => !!x);
  const [users, pecas, eventos, links, vendas] = await Promise.all([
    uids.length
      ? prisma.users.findMany({
          where: { id: { in: uids } },
          select: {
            id: true,
            nome_completo: true,
            telefone: true,
            cidade: true,
            departamento: true,
          },
        })
      : [],
    skus.length
      ? prisma.agricolas.findMany({
          where: { sku: { in: skus } },
          select: {
            sku: true,
            nome: true,
            nome_es: true,
            codigo_fabricante: true,
            imagem_principal: true,
          },
        })
      : [],
    uids.length
      ? prisma.site_eventos.findMany({
          where: {
            user_id: { in: uids },
            tipo: { in: ["whatsapp", "cotacao"] },
            created_at: { gte: desde },
          },
          select: { user_id: true, created_at: true },
        })
      : [],
    cupons.length
      ? prisma.links_pagamento.findMany({
          where: { cupom: { in: cupons } },
          select: { id: true, cupom: true, status: true, total: true, moeda: true },
        })
      : [],
    uids.length || emails.length
      ? prisma.vendas.findMany({
          where: {
            created_at: { gte: desde },
            status: { not: "CANCELADA" },
            OR: [{ user_id: { in: uids } }, { cliente_email: { in: emails } }],
          },
          select: {
            codigo: true,
            user_id: true,
            cliente_email: true,
            created_at: true,
            itens: true,
            total: true,
            frete_cobrado: true,
            desconto: true,
            moeda: true,
          },
        })
      : [],
  ]);
  const { nomeProduto } = await import("./pecas-es");
  const peca = new Map(pecas.map((p) => [p.sku.trim(), p]));

  const linhas = envios.map((e) => {
    const t0 = e.created_at.getTime();
    const u = users.find((x) => x.id === e.user_id);
    const enviados = lerSkus(e.produtos);
    const whatsapp = eventos
      .filter(
        (x) =>
          x.user_id === e.user_id &&
          x.created_at.getTime() > t0 &&
          x.created_at.getTime() < t0 + 14 * DIA,
      )
      .sort((a, b) => a.created_at.getTime() - b.created_at.getTime())[0];
    const link = e.cupom ? links.find((l) => l.cupom === e.cupom) : undefined;
    const compra = vendas
      .filter(
        (v) =>
          (v.user_id === e.user_id || v.cliente_email?.toLowerCase() === e.email.toLowerCase()) &&
          v.created_at.getTime() > t0 &&
          v.created_at.getTime() < t0 + 30 * DIA,
      )
      .sort((a, b) => a.created_at.getTime() - b.created_at.getTime())[0];
    const itensCompra = compra ? (JSON.parse(compra.itens || "[]") as Array<{ sku: string }>) : [];
    const abriu = !!e.aberto_em || e.status === "ABERTO" || e.status === "CLICADO";
    const clicou = !!e.clicado_em || e.status === "CLICADO";
    return {
      id: e.id,
      quando: e.created_at.toISOString(),
      status: e.status,
      erro: e.erro,
      cliente: {
        id: e.user_id,
        nome: u?.nome_completo ?? e.email,
        email: e.email,
        telefone: u?.telefone ?? null,
        local: [u?.cidade, u?.departamento].filter(Boolean).join(", "),
      },
      produtos: enviados.map((s) => {
        const p = peca.get(s);
        return {
          sku: s,
          nome: p ? nomeProduto(p as any) : s,
          codigo: (p?.codigo_fabricante || s).trim(),
          foto: p?.imagem_principal ?? null,
        };
      }),
      cupom: e.cupom,
      abriu,
      abertoEm: e.aberto_em?.toISOString() ?? null,
      clicou,
      whatsapp: whatsapp?.created_at.toISOString() ?? null,
      cupomUsado: link
        ? { id: link.id, status: link.status, total: link.total / 100, moeda: link.moeda }
        : null,
      compra: compra
        ? {
            codigo: compra.codigo,
            total: compra.total + compra.frete_cobrado - compra.desconto,
            moeda: compra.moeda,
            quando: compra.created_at.toISOString(),
            pecaEnviada: itensCompra.some((i) => enviados.includes(String(i.sku).trim())),
          }
        : null,
    };
  });

  const ok = linhas.filter((l) => l.status !== "FALHA");
  const respondeu = (l: (typeof linhas)[number]) => !!(l.whatsapp || l.cupomUsado || l.compra);
  const faturamento: Record<string, number> = {};
  for (const l of ok)
    if (l.compra) faturamento[l.compra.moeda] = (faturamento[l.compra.moeda] ?? 0) + l.compra.total;
  const contagem = new Map<
    string,
    { nome: string; codigo: string; foto: string | null; vezes: number }
  >();
  for (const l of ok)
    for (const p of l.produtos) {
      const x = contagem.get(p.sku) ?? { nome: p.nome, codigo: p.codigo, foto: p.foto, vezes: 0 };
      x.vezes++;
      contagem.set(p.sku, x);
    }

  // Próxima rodada (sem enviar): quem receberia agora
  let proximos: Array<{
    id: number;
    nome: string;
    email: string;
    produtos: string[];
    idioma: "es" | "pt";
  }> = [];
  const a = autos.find((x) => x.ativo) ?? autos[0];
  if (a) {
    const { selecionarInteresse } = await import("./automacoes.server");
    const { defTipo } = await import("./automacoes-tipos");
    const ler = <T>(s: string, p: T): T => {
      try {
        return { ...p, ...JSON.parse(s) };
      } catch {
        return p;
      }
    };
    const cfg = ler(a.config, defTipo(a.tipo).config);
    const publico = ler(a.publico, { tipo: "todos", departamentos: [], dias: 30 } as any);
    const lista = await selecionarInteresse(a.id, cfg, publico, Date.now()).catch(() => []);
    proximos = lista.slice(0, 50).map((x) => ({
      id: x.user.id,
      nome: x.user.nome_completo,
      email: x.user.email,
      produtos: (x.produtos ?? []).map((p) => p.nome),
      idioma: x.idioma ?? "es",
    }));
  }

  return {
    automacao: a
      ? {
          id: a.id,
          nome: a.nome,
          ativo: a.ativo,
          rodouEm: a.rodou_em?.toISOString() ?? null,
          erro: a.ultimo_erro,
          config: JSON.parse(a.config || "{}"),
        }
      : null,
    resumo: {
      enviados: ok.length,
      falhas: linhas.length - ok.length,
      abertos: ok.filter((l) => l.abriu).length,
      clicados: ok.filter((l) => l.clicou).length,
      whatsapp: ok.filter((l) => l.whatsapp).length,
      cupons: ok.filter((l) => l.cupomUsado).length,
      compras: ok.filter((l) => l.compra).length,
      responderam: ok.filter(respondeu).length,
      pecas: ok.reduce((s, l) => s + l.produtos.length, 0),
      faturamento,
    },
    maisEnviadas: [...contagem.entries()]
      .map(([sku, x]) => ({ sku, ...x }))
      .sort((a, b) => b.vezes - a.vezes)
      .slice(0, 10),
    linhas,
    proximos,
  };
}
