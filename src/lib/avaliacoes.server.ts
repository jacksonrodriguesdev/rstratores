// Vendas do admin + avaliações de produtos.
// Fluxo: venda lançada → etiqueta com QR (/avaliar/<codigo>) → o cliente avalia as peças que
// comprou (estrelas + comentário, qualquer nota) → recebe na hora um cupom único de 15% para a
// próxima compra (1 por venda). As avaliações só aparecem no site depois de aprovadas no painel.
// O Google não entra no cupom: a política do Google proíbe incentivo para avaliar lá; o botão
// do Google aparece depois, como convite.
import crypto from "crypto";

const DIA = 86_400_000;
export const DESCONTO_AVALIACAO = 15;
export const VALIDADE_CUPOM_DIAS = 60;

// ---------------------------------------------------------------- tabelas
const SQL_VENDAS = `CREATE TABLE IF NOT EXISTS \`vendas\` (
  \`id\` INTEGER NOT NULL AUTO_INCREMENT,
  \`codigo\` VARCHAR(24) NOT NULL,
  \`cliente_nome\` VARCHAR(160) NOT NULL,
  \`cliente_email\` VARCHAR(191) NULL,
  \`cliente_telefone\` VARCHAR(40) NULL,
  \`cliente_doc\` VARCHAR(40) NULL,
  \`endereco\` TEXT NULL,
  \`cidade\` VARCHAR(120) NULL,
  \`departamento\` VARCHAR(80) NULL,
  \`cep\` VARCHAR(20) NULL,
  \`pais\` VARCHAR(2) NOT NULL DEFAULT 'UY',
  \`user_id\` INTEGER NULL,
  \`itens\` TEXT NOT NULL,
  \`total\` DOUBLE NOT NULL DEFAULT 0,
  \`moeda\` VARCHAR(3) NOT NULL DEFAULT 'UYU',
  \`transportadora\` VARCHAR(80) NULL,
  \`rastreio\` VARCHAR(80) NULL,
  \`observacao\` TEXT NULL,
  \`status\` VARCHAR(20) NOT NULL DEFAULT 'ABERTA',
  \`cupom\` VARCHAR(40) NULL,
  \`avaliada_em\` DATETIME(3) NULL,
  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updated_at\` DATETIME(3) NOT NULL,
  UNIQUE INDEX \`vendas_codigo_key\`(\`codigo\`),
  INDEX \`vendas_created_at_idx\`(\`created_at\`),
  INDEX \`vendas_user_id_idx\`(\`user_id\`),
  PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`;
const SQL_AVALIACOES = `CREATE TABLE IF NOT EXISTS \`avaliacoes\` (
  \`id\` INTEGER NOT NULL AUTO_INCREMENT,
  \`sku\` VARCHAR(64) NOT NULL,
  \`venda_id\` INTEGER NULL,
  \`user_id\` INTEGER NULL,
  \`nome\` VARCHAR(120) NOT NULL,
  \`cidade\` VARCHAR(120) NULL,
  \`nota\` INTEGER NOT NULL,
  \`comentario\` TEXT NULL,
  \`idioma\` VARCHAR(2) NOT NULL DEFAULT 'es',
  \`status\` VARCHAR(20) NOT NULL DEFAULT 'PENDENTE',
  \`resposta\` TEXT NULL,
  \`com_cupom\` BOOLEAN NOT NULL DEFAULT false,
  \`verificada\` BOOLEAN NOT NULL DEFAULT false,
  \`aprovada_em\` DATETIME(3) NULL,
  \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`updated_at\` DATETIME(3) NOT NULL,
  INDEX \`avaliacoes_sku_status_idx\`(\`sku\`, \`status\`),
  INDEX \`avaliacoes_status_created_at_idx\`(\`status\`, \`created_at\`),
  INDEX \`avaliacoes_venda_id_idx\`(\`venda_id\`),
  PRIMARY KEY (\`id\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`;
let tabelas: Promise<void> | null = null;
export function garantirTabelasAvaliacoes() {
  tabelas ??= (async () => {
    const { prisma } = await import("./prisma");
    await prisma.$executeRawUnsafe(SQL_VENDAS);
    await prisma.$executeRawUnsafe(SQL_AVALIACOES);
    const { garantirTabelasCampanha } = await import("./campanha.server");
    await garantirTabelasCampanha();
  })().catch((e) => {
    tabelas = null;
    throw e;
  });
  return tabelas;
}

// Código do QR: 10 letras/números sem os que confundem (0/O, 1/I/L)
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function novoCodigo(n = 10) {
  const b = crypto.randomBytes(n);
  return [...b].map((x) => ALFABETO[x % ALFABETO.length]).join("");
}
// Cliente do Brasil abre em português (/pt/avaliar/…), do Uruguai em espanhol
export const linkAvaliacao = (origem: string, codigo: string, pais = "UY") =>
  `${origem.replace(/\/+$/, "")}${pais === "BR" ? "/pt" : ""}/avaliar/${codigo}`;
export function linkGoogle() {
  const id = process.env.GOOGLE_PLACE_ID?.trim();
  return id
    ? `https://search.google.com/local/writereview?placeid=${encodeURIComponent(id)}`
    : null;
}

// ---------------------------------------------------------------- vendas
export type ItemVenda = { sku: string; codigo: string; nome: string; qtd: number; valor: number };
export type DadosVenda = {
  cliente_nome: string;
  cliente_email?: string | null;
  cliente_telefone?: string | null;
  cliente_doc?: string | null;
  endereco?: string | null;
  cidade?: string | null;
  departamento?: string | null;
  cep?: string | null;
  pais: "UY" | "BR";
  user_id?: number | null;
  itens: ItemVenda[];
  moeda: "UYU" | "BRL";
  transportadora?: string | null;
  rastreio?: string | null;
  observacao?: string | null;
  status?: string;
};
const txt = (s: unknown, max: number) => {
  const t = String(s ?? "")
    .trim()
    .slice(0, max);
  return t || null;
};
export function limparVenda(d: DadosVenda) {
  const nome = txt(d.cliente_nome, 160);
  if (!nome) throw new Error("Coloque o nome do cliente.");
  const itens = (Array.isArray(d.itens) ? d.itens : [])
    .map((i) => ({
      sku: String(i.sku ?? "")
        .trim()
        .slice(0, 64),
      codigo: String(i.codigo ?? i.sku ?? "")
        .trim()
        .slice(0, 64),
      nome: String(i.nome ?? "")
        .trim()
        .slice(0, 200),
      qtd: Math.max(1, Math.min(9999, Math.round(Number(i.qtd) || 1))),
      valor: Math.max(0, Math.round((Number(i.valor) || 0) * 100) / 100),
    }))
    .filter((i) => i.sku && i.nome)
    .slice(0, 50);
  if (!itens.length) throw new Error("Adicione pelo menos um produto.");
  const email = txt(d.cliente_email, 191)?.toLowerCase() ?? null;
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    throw new Error("E-mail do cliente inválido.");
  return {
    cliente_nome: nome,
    cliente_email: email,
    cliente_telefone: txt(d.cliente_telefone, 40),
    cliente_doc: txt(d.cliente_doc, 40),
    endereco: txt(d.endereco, 1000),
    cidade: txt(d.cidade, 120),
    departamento: txt(d.departamento, 80),
    cep: txt(d.cep, 20),
    pais: d.pais === "BR" ? "BR" : "UY",
    user_id: d.user_id ? Number(d.user_id) : null,
    itens: JSON.stringify(itens),
    total: Math.round(itens.reduce((s, i) => s + i.qtd * i.valor, 0) * 100) / 100,
    moeda: d.moeda === "BRL" ? "BRL" : "UYU",
    transportadora: txt(d.transportadora, 80),
    rastreio: txt(d.rastreio, 80),
    observacao: txt(d.observacao, 2000),
    ...(d.status &&
      ["ABERTA", "ENVIADA", "ENTREGUE", "CANCELADA"].includes(d.status) && { status: d.status }),
  };
}
export const paraVenda = (r: any) => ({
  ...r,
  itens: JSON.parse(r.itens || "[]") as ItemVenda[],
  avaliada_em: r.avaliada_em?.toISOString?.() ?? r.avaliada_em ?? null,
  created_at: r.created_at?.toISOString?.() ?? r.created_at,
  updated_at: r.updated_at?.toISOString?.() ?? r.updated_at,
});

export async function salvarVenda(d: DadosVenda, id?: number) {
  await garantirTabelasAvaliacoes();
  const { prisma } = await import("./prisma");
  const dados = limparVenda(d);
  if (id) return paraVenda(await prisma.vendas.update({ where: { id }, data: dados }));
  for (let t = 0; t < 5; t++) {
    try {
      return paraVenda(await prisma.vendas.create({ data: { ...dados, codigo: novoCodigo() } }));
    } catch (e: any) {
      if (!String(e?.code).includes("P2002")) throw e; // código repetido: tenta outro
    }
  }
  throw new Error("Não foi possível gerar o código da venda.");
}

export async function listarVendas(q = "", limite = 200) {
  await garantirTabelasAvaliacoes();
  const { prisma } = await import("./prisma");
  const t = q.trim();
  const rows = await prisma.vendas.findMany({
    where: t
      ? {
          OR: [
            { cliente_nome: { contains: t } },
            { cliente_email: { contains: t } },
            { codigo: { contains: t.toUpperCase() } },
            { itens: { contains: t } },
          ],
        }
      : {},
    orderBy: { id: "desc" },
    take: limite,
  });
  return rows.map(paraVenda);
}

// Clientes do site para preencher a venda (nome, e-mail, telefone, endereço)
export async function buscarClientes(q: string) {
  const { prisma } = await import("./prisma");
  const t = q.trim().replace(/^@/, "");
  if (t.length < 2) return [];
  const rows = await prisma.users.findMany({
    where: {
      role: "USER",
      OR: [
        { nome_completo: { contains: t } },
        { email: { contains: t } },
        { telefone: { contains: t } },
      ],
    },
    select: {
      id: true,
      nome_completo: true,
      email: true,
      telefone: true,
      endereco: true,
      numero_casa: true,
      cidade: true,
      departamento: true,
      cep: true,
      pais: true,
    },
    take: 12,
  });
  return rows.map((u) => ({
    ...u,
    endereco: [u.endereco, u.numero_casa].filter(Boolean).join(" "),
    pais: /bra/i.test(u.pais ?? "") ? "BR" : "UY",
  }));
}

// ---------------------------------------------------------------- página de avaliação (pública)
export async function paginaAvaliacao(codigo: string) {
  await garantirTabelasAvaliacoes();
  const { prisma } = await import("./prisma");
  const v = await prisma.vendas.findUnique({ where: { codigo: codigo.trim().toUpperCase() } });
  if (!v || v.status === "CANCELADA") return null;
  const itens = JSON.parse(v.itens) as ItemVenda[];
  const skus = [...new Set(itens.map((i) => i.sku))];
  const pecas = await prisma.agricolas.findMany({
    where: { sku: { in: skus } },
    select: { sku: true, nome: true, nome_es: true, imagem_principal: true },
  });
  const { nomeProduto } = await import("./pecas-es");
  return {
    primeiroNome: v.cliente_nome.split(/\s+/)[0],
    nome: v.cliente_nome,
    cidade: v.cidade,
    idioma: (v.pais === "BR" ? "pt" : "es") as "es" | "pt",
    itens: skus.map((sku) => {
      const p = pecas.find((x) => x.sku.trim() === sku.trim());
      const it = itens.find((i) => i.sku === sku)!;
      return {
        sku,
        codigo: it.codigo,
        nome: p ? nomeProduto(p as any) : it.nome,
        nomePt: p?.nome?.trim() || it.nome,
        foto: p?.imagem_principal ?? null,
      };
    }),
    cupom: v.cupom,
    validade: v.avaliada_em
      ? new Date(v.avaliada_em.getTime() + VALIDADE_CUPOM_DIAS * DIA).toISOString()
      : null,
    google: linkGoogle(),
    desconto: DESCONTO_AVALIACAO,
  };
}

export type EnvioAvaliacao = {
  codigo: string;
  nome: string;
  cidade?: string | null;
  idioma: "es" | "pt";
  avaliacoes: Array<{ sku: string; nota: number; comentario?: string | null }>;
};
export async function enviarAvaliacoes(e: EnvioAvaliacao) {
  await garantirTabelasAvaliacoes();
  const { prisma } = await import("./prisma");
  const v = await prisma.vendas.findUnique({
    where: { codigo: String(e.codigo).trim().toUpperCase() },
  });
  if (!v || v.status === "CANCELADA") throw new Error("Compra não encontrada.");
  if (v.cupom) return { cupom: v.cupom, novo: false }; // já avaliou: o cupom é o mesmo
  const skus = new Set((JSON.parse(v.itens) as ItemVenda[]).map((i) => i.sku));
  const lista = (e.avaliacoes ?? [])
    .filter((a) => skus.has(a.sku) && Number(a.nota) >= 1 && Number(a.nota) <= 5)
    .map((a) => ({
      sku: a.sku,
      nota: Math.round(Number(a.nota)),
      comentario: txt(a.comentario, 2000),
    }));
  if (!lista.length)
    throw new Error(
      e.idioma === "pt"
        ? "Dê as estrelas para pelo menos uma peça."
        : "Calificá al menos una pieza.",
    );
  const nome = txt(e.nome, 120) ?? v.cliente_nome.split(/\s+/)[0];
  const codigoCupom = `AVAL${novoCodigo(6)}`;
  const fim = new Date(Date.now() + VALIDADE_CUPOM_DIAS * DIA);
  await prisma.$transaction([
    prisma.avaliacoes.createMany({
      data: lista.map((a) => ({
        ...a,
        venda_id: v.id,
        user_id: v.user_id,
        nome,
        cidade: txt(e.cidade, 120) ?? v.cidade,
        idioma: e.idioma === "pt" ? "pt" : "es",
        verificada: true,
        com_cupom: true,
      })),
    }),
    prisma.cupons.create({
      data: {
        codigo: codigoCupom,
        tipo: "PERCENT",
        valor: DESCONTO_AVALIACAO,
        moeda: v.moeda,
        descricao: `${DESCONTO_AVALIACAO}% por avaliar tu compra (venta ${v.codigo})`,
        descricao_pt: `${DESCONTO_AVALIACAO}% por avaliar sua compra (venda ${v.codigo})`,
        inicio: new Date(),
        fim,
        max_usos: 1,
        por_cliente: 1,
        publico: false,
        ativo: true,
      },
    }),
    prisma.vendas.update({
      where: { id: v.id },
      data: { cupom: codigoCupom, avaliada_em: new Date() },
    }),
  ]);
  if (v.cliente_email)
    await emailCupom(v.cliente_email, nome, codigoCupom, fim, e.idioma).catch(() => {});
  return { cupom: codigoCupom, novo: true };
}

async function emailCupom(
  para: string,
  nome: string,
  cupom: string,
  fim: Date,
  idioma: "es" | "pt",
) {
  const { resendConfigurado, enviarUm } = await import("./email.server");
  if (!resendConfigurado()) return;
  const pt = idioma === "pt";
  const ate = fim.toLocaleDateString(pt ? "pt-BR" : "es-UY");
  const site = pt ? "https://agropartsuy.com/pt" : "https://agropartsuy.com";
  const titulo = pt ? `Obrigado pela avaliação, ${nome}!` : `¡Gracias por tu reseña, ${nome}!`;
  const corpo = pt
    ? `Seu cupom de ${DESCONTO_AVALIACAO}% para a próxima compra é <b>${cupom}</b> (válido até ${ate}, uso único). Informe o código no WhatsApp ou no pagamento.`
    : `Tu cupón de ${DESCONTO_AVALIACAO}% para la próxima compra es <b>${cupom}</b> (válido hasta el ${ate}, un solo uso). Indicá el código por WhatsApp o al pagar.`;
  await enviarUm({
    to: para,
    subject: pt
      ? `Seu cupom de ${DESCONTO_AVALIACAO}% · AGRO PARTS`
      : `Tu cupón de ${DESCONTO_AVALIACAO}% · AGRO PARTS`,
    html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px"><h2>${titulo}</h2><p style="font-size:16px">${corpo}</p><p style="font-size:34px;font-weight:900;letter-spacing:3px;background:#f9c80e;padding:14px;text-align:center;border-radius:10px">${cupom}</p><p><a href="${site}">${site.replace("https://", "")}</a></p></div>`,
    text: `${titulo}\n\n${corpo.replace(/<[^>]+>/g, "")}\n\n${site}`,
  });
}

// ---------------------------------------------------------------- avaliações no site
const nomePublico = (n: string) => {
  const [a, b] = n.trim().split(/\s+/);
  return b ? `${a} ${b[0].toUpperCase()}.` : a;
};
export async function avaliacoesProduto(sku: string) {
  await garantirTabelasAvaliacoes();
  const { prisma } = await import("./prisma");
  const rows = await prisma.avaliacoes.findMany({
    where: { sku: sku.trim(), status: "APROVADA" },
    orderBy: { created_at: "desc" },
    take: 100,
  });
  const total = rows.length;
  const media = total ? Math.round((rows.reduce((s, r) => s + r.nota, 0) / total) * 10) / 10 : 0;
  const dist = [5, 4, 3, 2, 1].map((n) => ({ n, q: rows.filter((r) => r.nota === n).length }));
  return {
    total,
    media,
    dist,
    lista: rows.map((r) => ({
      id: r.id,
      nome: nomePublico(r.nome),
      cidade: r.cidade,
      nota: r.nota,
      comentario: r.comentario,
      resposta: r.resposta,
      verificada: r.verificada,
      comCupom: r.com_cupom,
      idioma: r.idioma,
      quando: r.created_at.toISOString(),
    })),
  };
}

// ---------------------------------------------------------------- moderação (admin)
export async function listarModeracao(status: string) {
  await garantirTabelasAvaliacoes();
  const { prisma } = await import("./prisma");
  const rows = await prisma.avaliacoes.findMany({
    where: status === "TODAS" ? {} : { status },
    orderBy: { created_at: "desc" },
    take: 300,
  });
  const skus = [...new Set(rows.map((r) => r.sku))];
  const pecas = skus.length
    ? await prisma.agricolas.findMany({
        where: { sku: { in: skus } },
        select: { sku: true, nome: true, imagem_principal: true },
      })
    : [];
  const vendas = await prisma.vendas.findMany({
    where: { id: { in: rows.map((r) => r.venda_id).filter((x): x is number => !!x) } },
    select: { id: true, codigo: true, cliente_nome: true },
  });
  const [pendentes, aprovadas, rejeitadas] = await Promise.all(
    ["PENDENTE", "APROVADA", "REJEITADA"].map((s) =>
      prisma.avaliacoes.count({ where: { status: s } }),
    ),
  );
  return {
    contagem: { pendentes, aprovadas, rejeitadas },
    lista: rows.map((r) => ({
      ...r,
      created_at: r.created_at.toISOString(),
      updated_at: r.updated_at.toISOString(),
      aprovada_em: r.aprovada_em?.toISOString() ?? null,
      peca: pecas.find((p) => p.sku.trim() === r.sku.trim())?.nome ?? r.sku,
      foto: pecas.find((p) => p.sku.trim() === r.sku.trim())?.imagem_principal ?? null,
      venda: vendas.find((v) => v.id === r.venda_id) ?? null,
    })),
  };
}
export async function moderar(
  id: number,
  o: { status?: "APROVADA" | "REJEITADA" | "PENDENTE"; resposta?: string | null },
) {
  await garantirTabelasAvaliacoes();
  const { prisma } = await import("./prisma");
  return prisma.avaliacoes.update({
    where: { id },
    data: {
      ...(o.status && {
        status: o.status,
        aprovada_em: o.status === "APROVADA" ? new Date() : null,
      }),
      ...(o.resposta !== undefined && { resposta: txt(o.resposta, 2000) }),
    },
  });
}

// Números para o painel: vendas, quantas avaliadas, nota média, cupons usados
export async function resumoAvaliacoes() {
  await garantirTabelasAvaliacoes();
  const { prisma } = await import("./prisma");
  const [vendas, avaliadas, aprovadas, media, cupons] = await Promise.all([
    prisma.vendas.count({ where: { status: { not: "CANCELADA" } } }),
    prisma.vendas.count({ where: { avaliada_em: { not: null } } }),
    prisma.avaliacoes.count({ where: { status: "APROVADA" } }),
    prisma.avaliacoes.aggregate({ _avg: { nota: true } }),
    prisma.cupons.aggregate({
      where: { codigo: { startsWith: "AVAL" } },
      _sum: { usos: true },
      _count: true,
    }),
  ]);
  return {
    vendas,
    avaliadas,
    taxa: vendas ? Math.round((avaliadas / vendas) * 100) : 0,
    aprovadas,
    media: Math.round((media._avg.nota ?? 0) * 10) / 10,
    cuponsGerados: cupons._count,
    cuponsUsados: cupons._sum.usos ?? 0,
  };
}

// ---------------------------------------------------------------- remetente da etiqueta
export type Remetente = {
  nome: string;
  endereco: string;
  cidade: string;
  telefone: string;
  doc: string;
};
const CHAVE_REMETENTE = "etiqueta_remetente";
export const REMETENTE_PADRAO: Remetente = {
  nome: "AGRO PARTS",
  endereco: "",
  cidade: "Chuy, Rocha — Uruguay",
  telefone: "+55 53 99183-1101",
  doc: "",
};
export async function lerRemetente(): Promise<Remetente> {
  const { prisma } = await import("./prisma");
  const r = await prisma.configuracoes
    .findUnique({ where: { chave: CHAVE_REMETENTE } })
    .catch(() => null);
  try {
    return { ...REMETENTE_PADRAO, ...(r ? JSON.parse(r.valor) : {}) };
  } catch {
    return REMETENTE_PADRAO;
  }
}
export async function salvarRemetente(r: Remetente) {
  const { prisma } = await import("./prisma");
  const limpo: Remetente = {
    nome: String(r.nome ?? "").slice(0, 120) || "AGRO PARTS",
    endereco: String(r.endereco ?? "").slice(0, 300),
    cidade: String(r.cidade ?? "").slice(0, 120),
    telefone: String(r.telefone ?? "").slice(0, 40),
    doc: String(r.doc ?? "").slice(0, 40),
  };
  await prisma.configuracoes.upsert({
    where: { chave: CHAVE_REMETENTE },
    create: { chave: CHAVE_REMETENTE, valor: JSON.stringify(limpo) },
    update: { valor: JSON.stringify(limpo) },
  });
  return limpo;
}

// Código de rastreio (ex.: DAC), que só existe depois do despacho: salvo pela lista de vendas.
// Venda ainda aberta passa para ENVIADA.
export async function salvarRastreio(id: number, rastreio: string, transportadora?: string | null) {
  await garantirTabelasAvaliacoes();
  const { prisma } = await import("./prisma");
  const v = await prisma.vendas.findUnique({ where: { id } });
  if (!v) throw new Error("Venda não encontrada");
  const codigo =
    String(rastreio ?? "")
      .trim()
      .slice(0, 80) || null;
  return paraVenda(
    await prisma.vendas.update({
      where: { id },
      data: {
        rastreio: codigo,
        ...(transportadora !== undefined && { transportadora: txt(transportadora, 80) }),
        ...(codigo && v.status === "ABERTA" && { status: "ENVIADA" }),
      },
    }),
  );
}
