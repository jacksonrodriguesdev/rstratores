// Indique um amigo: cada cliente com conta tem um código (ex.: AMIGO7KQ2M) que é ao mesmo tempo
// o link de indicação (agropartsuy.com/?amigo=AMIGO7KQ2M) e um cupom de primeira compra para o
// amigo. Quando um link de pagamento é pago com esse cupom, quem indicou ganha um cupom de prêmio
// (uso único, com validade) e recebe o código por e-mail. Indicar a si mesmo não vale.
// Percentuais e validade: configuração «indicacao_config» (Admin → Campanhas e cupons).
import { prisma } from "./prisma";

const DIA = 86_400_000;
const CHAVE = "indicacao_config";
export type ConfigIndicacao = {
  ativo: boolean;
  amigoPct: number; // desconto do amigo na primeira compra
  premioPct: number; // prêmio de quem indicou
  validadeDias: number; // validade do prêmio
};
const PADRAO: ConfigIndicacao = { ativo: true, amigoPct: 10, premioPct: 10, validadeDias: 90 };

const SQL = [
  `CREATE TABLE IF NOT EXISTS \`indicacoes\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`user_id\` INTEGER NOT NULL,
    \`codigo\` VARCHAR(40) NOT NULL,
    \`cliques\` INTEGER NOT NULL DEFAULT 0,
    \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updated_at\` DATETIME(3) NOT NULL,
    UNIQUE INDEX \`indicacoes_user_id_key\`(\`user_id\`),
    UNIQUE INDEX \`indicacoes_codigo_key\`(\`codigo\`),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS \`indicacao_premios\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`indicacao_id\` INTEGER NOT NULL,
    \`link_id\` INTEGER NOT NULL,
    \`indicado_email\` VARCHAR(191) NULL,
    \`cupom\` VARCHAR(40) NOT NULL,
    \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    UNIQUE INDEX \`indicacao_premios_link_id_key\`(\`link_id\`),
    INDEX \`indicacao_premios_indicacao_id_idx\`(\`indicacao_id\`),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
];
let tabelas: Promise<void> | null = null;
export function garantirTabelasIndicacao() {
  tabelas ??= (async () => {
    const { garantirTabelasCampanha } = await import("./campanha.server");
    await garantirTabelasCampanha();
    for (const s of SQL) await prisma.$executeRawUnsafe(s);
  })().catch((e) => {
    tabelas = null;
    throw e;
  });
  return tabelas;
}

export async function configIndicacao(): Promise<ConfigIndicacao> {
  const c = await prisma.configuracoes.findUnique({ where: { chave: CHAVE } }).catch(() => null);
  try {
    const v = c ? JSON.parse(c.valor) : {};
    return {
      ativo: v.ativo ?? PADRAO.ativo,
      amigoPct: Number(v.amigoPct) || PADRAO.amigoPct,
      premioPct: Number(v.premioPct) || PADRAO.premioPct,
      validadeDias: Number(v.validadeDias) || PADRAO.validadeDias,
    };
  } catch {
    return PADRAO;
  }
}
export async function salvarConfigIndicacao(c: ConfigIndicacao) {
  await garantirTabelasIndicacao();
  const limpo: ConfigIndicacao = {
    ativo: !!c.ativo,
    amigoPct: Math.min(50, Math.max(1, Math.round(Number(c.amigoPct) || PADRAO.amigoPct))),
    premioPct: Math.min(50, Math.max(1, Math.round(Number(c.premioPct) || PADRAO.premioPct))),
    validadeDias: Math.min(365, Math.max(7, Math.round(Number(c.validadeDias) || 90))),
  };
  const valor = JSON.stringify(limpo);
  await prisma.configuracoes.upsert({
    where: { chave: CHAVE },
    create: { chave: CHAVE, valor },
    update: { valor },
  });
  // O desconto do amigo vale para os códigos já criados também
  const codigos = (await prisma.indicacoes.findMany({ select: { codigo: true } })).map(
    (x) => x.codigo,
  );
  if (codigos.length)
    await prisma.cupons.updateMany({
      where: { codigo: { in: codigos } },
      data: { valor: limpo.amigoPct, ativo: limpo.ativo },
    });
  return limpo;
}

const primeiroNome = (n?: string | null) => (n ?? "").trim().split(/\s+/)[0] || "";

// Código do cliente (cria na primeira vez, junto com o cupom do amigo)
async function garantirCodigo(userId: number) {
  await garantirTabelasIndicacao();
  const ja = await prisma.indicacoes.findUnique({ where: { user_id: userId } });
  if (ja) return ja;
  const u = await prisma.users.findUnique({
    where: { id: userId },
    select: { nome_completo: true },
  });
  if (!u) throw new Error("Cliente não encontrado.");
  const cfg = await configIndicacao();
  const { novoCodigo } = await import("./avaliacoes.server");
  for (let t = 0; t < 6; t++) {
    const codigo = `AMIGO${novoCodigo(5)}`;
    try {
      await prisma.cupons.create({
        data: {
          codigo,
          tipo: "PERCENT",
          valor: cfg.amigoPct,
          moeda: "UYU",
          descricao: `Indicación de ${primeiroNome(u.nome_completo) || "un cliente"}: ${cfg.amigoPct}% en la primera compra`,
          descricao_pt: `Indicação de ${primeiroNome(u.nome_completo) || "um cliente"}: ${cfg.amigoPct}% na primeira compra`,
          so_primeira_compra: true,
          por_cliente: 1,
          publico: false,
          ativo: cfg.ativo,
        },
      });
      return await prisma.indicacoes.create({ data: { user_id: userId, codigo } });
    } catch (e: any) {
      if (!String(e?.code).includes("P2002")) throw e;
      const outra = await prisma.indicacoes.findUnique({ where: { user_id: userId } });
      if (outra) return outra; // criada ao mesmo tempo em outra aba
    }
  }
  throw new Error("Não foi possível criar o código de indicação.");
}

// Área do cliente: código, link, cliques, amigos que compraram e prêmios
export async function minhaIndicacao(userId: number, origem: string, idioma: "es" | "pt") {
  const cfg = await configIndicacao();
  const ind = await garantirCodigo(userId);
  const premios = await prisma.indicacao_premios.findMany({
    where: { indicacao_id: ind.id },
    orderBy: { id: "desc" },
  });
  const cupons = premios.length
    ? await prisma.cupons.findMany({ where: { codigo: { in: premios.map((p) => p.cupom) } } })
    : [];
  const base = origem.replace(/\/+$/, "");
  return {
    ativo: cfg.ativo,
    codigo: ind.codigo,
    link: `${base}${idioma === "pt" ? "/pt" : ""}/?amigo=${ind.codigo}`,
    cliques: ind.cliques,
    amigoPct: cfg.amigoPct,
    premioPct: cfg.premioPct,
    validadeDias: cfg.validadeDias,
    premios: premios.map((p) => {
      const c = cupons.find((x) => x.codigo === p.cupom);
      return {
        cupom: p.cupom,
        quando: p.created_at.toISOString(),
        usado: !!c && c.usos >= (c.max_usos || 1),
        vence: c?.fim?.toISOString() ?? null,
      };
    }),
  };
}

// Link de indicação aberto: confere o código e conta o clique (para o banner do amigo)
export async function abrirIndicacao(codigo: string) {
  const cfg = await configIndicacao();
  if (!cfg.ativo) return null;
  await garantirTabelasIndicacao();
  const c = String(codigo ?? "")
    .trim()
    .toUpperCase()
    .slice(0, 40);
  if (!/^AMIGO[A-Z0-9]{3,12}$/.test(c)) return null;
  const ind = await prisma.indicacoes.findUnique({ where: { codigo: c } });
  if (!ind) return null;
  await prisma.indicacoes.update({ where: { id: ind.id }, data: { cliques: { increment: 1 } } });
  const u = await prisma.users.findUnique({
    where: { id: ind.user_id },
    select: { nome_completo: true },
  });
  return { codigo: ind.codigo, nome: primeiroNome(u?.nome_completo), amigoPct: cfg.amigoPct };
}

// Link pago com o código de um amigo: prêmio para quem indicou (uma vez por link)
export async function premiarIndicacao(linkId: number) {
  await garantirTabelasIndicacao();
  const link = await prisma.links_pagamento.findUnique({
    where: { id: linkId },
    include: { user: true },
  });
  if (!link || link.status !== "PAGO" || !link.cupom) return null;
  const ind = await prisma.indicacoes.findUnique({ where: { codigo: link.cupom } });
  if (!ind) return null;
  const email = (link.user?.email ?? link.email_cliente ?? "").toLowerCase() || null;
  const dono = await prisma.users.findUnique({ where: { id: ind.user_id } });
  if (!dono) return null;
  // Indicar a si mesmo não vale
  if (link.user_id === ind.user_id || (email && email === dono.email.toLowerCase())) return null;
  const ja = await prisma.indicacao_premios.findUnique({ where: { link_id: link.id } });
  if (ja) return ja;
  const cfg = await configIndicacao();
  const { novoCodigo } = await import("./avaliacoes.server");
  const codigo = `PREMIO${novoCodigo(6)}`;
  const fim = new Date(Date.now() + cfg.validadeDias * DIA);
  const nomeAmigo =
    primeiroNome(link.user?.nome_completo) || (link.pais === "BR" ? "seu amigo" : "tu amigo");
  await prisma.cupons.create({
    data: {
      codigo,
      tipo: "PERCENT",
      valor: cfg.premioPct,
      moeda: link.moeda,
      descricao: `Premio por indicar a ${nomeAmigo}`,
      descricao_pt: `Prêmio por indicar ${nomeAmigo}`,
      fim,
      max_usos: 1,
      por_cliente: 1,
      publico: false,
    },
  });
  let premio;
  try {
    premio = await prisma.indicacao_premios.create({
      data: { indicacao_id: ind.id, link_id: link.id, indicado_email: email, cupom: codigo },
    });
  } catch (e: any) {
    // Outra chamada premiou este link ao mesmo tempo: desfaz o cupom extra
    await prisma.cupons.deleteMany({ where: { codigo } });
    if (String(e?.code).includes("P2002"))
      return prisma.indicacao_premios.findUnique({ where: { link_id: link.id } });
    throw e;
  }
  await avisarPremio(dono, codigo, cfg, nomeAmigo, link.pais === "BR" ? "pt" : "es").catch((e) =>
    console.error("e-mail do prêmio de indicação:", e),
  );
  return premio;
}

async function avisarPremio(
  dono: { id: number; email: string; nome_completo: string },
  codigo: string,
  cfg: ConfigIndicacao,
  nomeAmigo: string,
  idioma: "es" | "pt",
) {
  const { resendConfigurado, enviarUm, montarMensagem } = await import("./email.server");
  if (!resendConfigurado()) return;
  const { SITE_URL } = await import("./site");
  const pt = idioma === "pt";
  const m = montarMensagem(
    {
      destaque: pt ? "VOCÊ GANHOU" : "¡GANASTE!",
      titulo: pt
        ? `${nomeAmigo} comprou com a sua indicação`
        : `${nomeAmigo} compró con tu recomendación`,
      texto: pt
        ? `Obrigado por indicar a AGRO PARTS. Seu prêmio é um cupom de **${cfg.premioPct}%** para a próxima compra.\n\nContinue indicando: cada amigo que compra vale um cupom novo.`
        : `Gracias por recomendar AGRO PARTS. Tu premio es un cupón de **${cfg.premioPct}%** para tu próxima compra.\n\nSeguí recomendando: cada amigo que compra vale un cupón nuevo.`,
      cupom: {
        codigo,
        texto: pt ? `${cfg.premioPct}% de desconto` : `${cfg.premioPct}% de descuento`,
        validade: pt ? `por ${cfg.validadeDias} dias` : `por ${cfg.validadeDias} días`,
      },
      produtos: [],
      whatsapp: true,
      botaoTexto: pt ? "Ver minha conta" : "Ver mi cuenta",
      botaoUrl: `${SITE_URL}${pt ? "/pt" : ""}/cuenta?aba=amigos`,
      cor: "#0b7a3b",
    },
    pt ? `Você ganhou ${cfg.premioPct}% na AGRO PARTS` : `Ganaste ${cfg.premioPct}% en AGRO PARTS`,
    pt ? "Seu amigo comprou com a sua indicação." : "Tu amigo compró con tu recomendación.",
    SITE_URL,
    { id: dono.id, email: dono.email, nome: dono.nome_completo },
    undefined,
    { idioma },
  );
  await enviarUm(m);
}

// Admin: quem indica mais, cliques, compras e prêmios
export async function painelIndicacoes() {
  await garantirTabelasIndicacao();
  const [cfg, lista, premios] = await Promise.all([
    configIndicacao(),
    prisma.indicacoes.findMany({ orderBy: { cliques: "desc" }, take: 200 }),
    prisma.indicacao_premios.findMany({ orderBy: { id: "desc" }, take: 500 }),
  ]);
  const users = lista.length
    ? await prisma.users.findMany({
        where: { id: { in: lista.map((i) => i.user_id) } },
        select: { id: true, nome_completo: true, email: true },
      })
    : [];
  const linhas = lista
    .map((i) => {
      const u = users.find((x) => x.id === i.user_id);
      const meus = premios.filter((p) => p.indicacao_id === i.id);
      return {
        codigo: i.codigo,
        nome: u?.nome_completo ?? "—",
        email: u?.email ?? "",
        cliques: i.cliques,
        compras: meus.length,
        ultimo: meus[0]?.created_at.toISOString() ?? null,
      };
    })
    .sort((a, b) => b.compras - a.compras || b.cliques - a.cliques);
  return {
    config: cfg,
    total: {
      codigos: lista.length,
      cliques: lista.reduce((s, i) => s + i.cliques, 0),
      compras: premios.length,
    },
    linhas: linhas.slice(0, 100),
  };
}
