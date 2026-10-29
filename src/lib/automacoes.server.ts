// Motor das automações de e-mail. Roda a cada 10 minutos no servidor (iniciarAgendador) e pelo
// botão "Executar agora" do painel. Cada envio fica em email_envios com automacao_id + chave,
// para o mesmo cliente não receber o mesmo e-mail duas vezes.
import {
  aplicarVariaveis,
  trocarVariaveis,
  type ConteudoEmail,
  type ProdutoEmail,
  type Publico,
} from "./email-template";
import { defTipo, type ConfigAutomacao, type TipoAutomacao } from "./automacoes-tipos";
import type { ItemCarrinho } from "./carrinhos";
import { fotoInvalida } from "./fotos";

const HORA = 3600_000;
const DIA = 24 * HORA;

type Automacao = {
  id: number;
  tipo: string;
  nome: string;
  ativo: boolean;
  ativado_em: Date | null;
  assunto: string;
  preheader: string | null;
  conteudo: string;
  publico: string;
  config: string;
  cursor: number;
};
type Dest = { id: number; email: string; nome_completo: string; cupom?: string | null };
// Um e-mail a enviar: cliente + produtos/variáveis próprios dele
type Envio = {
  user: Dest;
  chave: string;
  produtos?: ProdutoEmail[];
  whatsappTexto?: string;
  vars?: Record<string, string>;
  botaoUrl?: string;
  // Cupom exclusivo deste cliente (peças vistas sem orçamento)
  cupom?: { codigo: string; texto: string; validade: string };
  // Idioma do cliente (pt = Sul do Brasil): textos, preços em R$ e links /pt
  idioma?: "es" | "pt";
};

// Cupom exclusivo de uso único (peças vistas sem orçamento)
async function cupomExclusivo(pct: number, dias: number, nome: string, idioma: "es" | "pt" = "es") {
  const { prisma } = await import("./prisma");
  const { novoCodigo } = await import("./avaliacoes.server");
  for (let t = 0; t < 5; t++) {
    const codigo = `OFERTA${novoCodigo(5)}`;
    try {
      await prisma.cupons.create({
        data: {
          codigo,
          tipo: "PERCENT",
          valor: pct,
          moeda: "UYU",
          descricao: `Oferta por repuestos vistos (${nome.split(" ")[0] || "cliente"})`,
          descricao_pt: `Oferta por peças vistas (${nome.split(" ")[0] || "cliente"})`,
          fim: new Date(Date.now() + dias * DIA),
          max_usos: 1,
          por_cliente: 1,
          publico: false,
        },
      });
      return {
        codigo,
        texto:
          idioma === "pt"
            ? `${pct}% de desconto nestas peças`
            : `${pct}% de descuento en estos repuestos`,
        validade: idioma === "pt" ? `por ${dias} dias` : `por ${dias} días`,
      };
    } catch (e: any) {
      if (!String(e?.code).includes("P2002")) throw e;
    }
  }
  throw new Error("Não foi possível criar o cupom exclusivo.");
}

const lerJson = <T>(s: string, padrao: T): T => {
  try {
    return { ...padrao, ...JSON.parse(s) };
  } catch {
    return padrao;
  }
};

async function origemSite() {
  const { SITE_URL } = await import("./site");
  return SITE_URL;
}

// ---------- Mudanças de preço ----------
// Compara o preço atual das peças com o último visto e registra PROMOCAO / BAIXOU.
export async function detectarMudancasPreco() {
  const { prisma } = await import("./prisma");
  const { configPrecos } = await import("./precos.server");
  const { precoVenda } = await import("./precos");
  const c = await configPrecos();
  const pecas = await prisma.agricolas.findMany({
    where: { duplicado_de: null, preco_brl: { gt: 0 } },
    select: {
      sku: true,
      preco_brl: true,
      preco_modo: true,
      preco_uyu: true,
      valor_promocional: true,
    },
  });
  const snaps = new Map((await prisma.produto_preco_snapshot.findMany()).map((s) => [s.sku, s]));
  const primeiraVez = snaps.size === 0;
  const eventos: Array<{ sku: string; tipo: string; de_brl: number; para_brl: number }> = [];
  const mudar: Array<{ sku: string; preco_brl: number; promocao: boolean }> = [];
  for (const p of pecas) {
    const pr = precoVenda(p, c);
    if (!pr?.brl) continue;
    const sku = p.sku.trim();
    const promo = !!pr.deBrl;
    const velho = snaps.get(sku);
    if (velho && Math.abs(velho.preco_brl - pr.brl) < 0.005 && velho.promocao === promo) continue;
    mudar.push({ sku, preco_brl: pr.brl, promocao: promo });
    // Peça precificada pela primeira vez não é "baixou de preço"
    if (!velho || primeiraVez) continue;
    if (pr.brl < velho.preco_brl * 0.995)
      eventos.push({
        sku,
        tipo: promo && !velho.promocao ? "PROMOCAO" : "BAIXOU",
        de_brl: velho.preco_brl,
        para_brl: pr.brl,
      });
  }
  if (primeiraVez && mudar.length) {
    await prisma.produto_preco_snapshot.createMany({ data: mudar, skipDuplicates: true });
    return { pecas: pecas.length, mudancas: mudar.length, eventos: 0 };
  }
  for (const m of mudar) {
    await prisma.produto_preco_snapshot.upsert({
      where: { sku: m.sku },
      create: m,
      update: { preco_brl: m.preco_brl, promocao: m.promocao },
    });
  }
  if (eventos.length) await prisma.produto_eventos.createMany({ data: eventos });
  return { pecas: pecas.length, mudancas: mudar.length, eventos: eventos.length };
}

// ---------- Produtos com preço atual, prontos para o e-mail ----------
// antes: preço anterior em R$ (dos eventos), para mostrar "de/por" também quando não é promoção
export async function produtosEmail(
  skus: string[],
  qtd: Map<string, number> = new Map(),
  antes: Map<string, number> = new Map(),
  idioma: "es" | "pt" = "es", // pt: nome em português e preço em R$ (clientes do Brasil)
): Promise<ProdutoEmail[]> {
  if (!skus.length) return [];
  const brl = (v: number) =>
    `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const { prisma } = await import("./prisma");
  const { configPrecos } = await import("./precos.server");
  const { precoVenda, fmtUYU } = await import("./precos");
  const { nomeProduto } = await import("./pecas-es");
  const c = await configPrecos();
  const rows = await prisma.agricolas.findMany({ where: { sku: { in: skus } } });
  const porSku = new Map(rows.map((r) => [r.sku.trim(), r]));
  return skus
    .map((sku) => porSku.get(sku.trim()))
    .filter((r): r is NonNullable<typeof r> => !!r)
    .map((r) => {
      const pr = precoVenda(r, c);
      const ant = antes.get(r.sku.trim());
      if (pr?.uyu && pr.brl && !pr.deUyu && ant && ant > pr.brl * 1.005) {
        pr.deUyu = Math.round((pr.uyu * ant) / pr.brl / (c.arredondar || 1)) * (c.arredondar || 1);
        pr.desconto = Math.round((1 - pr.brl / ant) * 100);
      }
      const img =
        r.imagem_principal && !fotoInvalida(r.imagem_principal) ? r.imagem_principal : null;
      return {
        sku: r.sku.trim(),
        nome: idioma === "pt" ? r.nome.trim() : nomeProduto(r as any),
        codigo: (r.codigo_fabricante || r.sku).trim(),
        imagem: img,
        quantidade: qtd.get(r.sku.trim()),
        preco: idioma === "pt" ? (pr?.brl ? brl(pr.brl) : null) : pr?.uyu ? fmtUYU(pr.uyu) : null,
        precoDe:
          idioma === "pt"
            ? pr?.deBrl
              ? brl(pr.deBrl)
              : null
            : pr?.deUyu
              ? fmtUYU(pr.deUyu)
              : null,
        selo: pr?.desconto ? `-${pr.desconto}%` : null,
      };
    });
}

// Peças de uma marca para o e-mail: primeiro as em promoção, depois as precificadas com foto
async function produtosDaMarca(marca: string, max: number): Promise<ProdutoEmail[]> {
  const { prisma } = await import("./prisma");
  const base = { duplicado_de: null, marca, preco_brl: { gt: 0 } };
  const promo = await prisma.agricolas.findMany({
    where: { ...base, valor_promocional: { gt: 0 } },
    select: { sku: true },
    orderBy: { precificado_em: "desc" },
    take: max,
  });
  const resto =
    promo.length < max
      ? await prisma.agricolas.findMany({
          where: {
            ...base,
            imagem_principal: { not: null },
            NOT: [
              { imagem_principal: { contains: "redeparts" } },
              { sku: { in: promo.map((p) => p.sku) } },
            ],
          },
          select: { sku: true },
          orderBy: { precificado_em: "desc" },
          take: max - promo.length,
        })
      : [];
  return (await produtosEmail([...promo, ...resto].map((p) => p.sku))).filter((p) => p.preco);
}

// Dia e hora em Montevidéu (UTC-3, sem horário de verão desde 2015)
const emMontevideu = (ms: number) => new Date(ms - 3 * HORA);

// ---------- Quem pode receber ----------
async function elegiveis(publico: Publico): Promise<Map<number, Dest>> {
  const { destinatarios } = await import("./email.server");
  return new Map((await destinatarios(publico)).map((u) => [u.id, u]));
}

async function jaRecebeu(autoId: number, chaves: string[], desde?: Date): Promise<Set<string>> {
  const { prisma } = await import("./prisma");
  const rows = await prisma.email_envios.findMany({
    where: {
      automacao_id: autoId,
      status: { not: "FALHA" },
      ...(chaves.length && { chave: { in: chaves } }),
      ...(desde && { created_at: { gte: desde } }),
    },
    select: { user_id: true, chave: true },
  });
  return new Set(rows.map((r) => (chaves.length ? `${r.user_id}|${r.chave}` : String(r.user_id))));
}

const textoWhatsCarrinho = (ps: ProdutoEmail[]) =>
  `¡Hola! Quiero pedir los repuestos de mi lista:\n${ps.map((p) => `• ${p.quantidade ? `${p.quantidade}x ` : ""}${p.nome} (Cód. ${p.codigo})`).join("\n")}`;

function itensDoCarrinho(json: string): ItemCarrinho[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// ---------- Peças vistas sem orçamento ----------
// Clientes cadastrados que abriram páginas de peças nos últimos N dias, cuja última visita foi há
// mais de N horas (não manda enquanto ainda navega) e que no período não pediram nada: WhatsApp,
// cotação, carrinho, link de pagamento ou venda. As peças do e-mail são as mais vistas por ele.
const SKU_PAGINA = /^(?:\/pt)?\/produto\/([^/?#]+)/;
export async function selecionarInteresse(
  autoId: number,
  cfg: ConfigAutomacao,
  publico: Publico,
  agora: number,
): Promise<Envio[]> {
  const { prisma } = await import("./prisma");
  const { whereHumano } = await import("./rastreio.server");
  const desde = new Date(agora - (cfg.dias ?? 7) * DIA);
  const espera = agora - (cfg.horas ?? 24) * HORA;
  const visitas = await prisma.site_visits.findMany({
    where: {
      user_id: { not: null },
      created_at: { gte: desde },
      OR: [{ path: { startsWith: "/produto/" } }, { path: { startsWith: "/pt/produto/" } }],
      ...(whereHumano as any),
    },
    select: { user_id: true, path: true, created_at: true },
    orderBy: { id: "desc" },
    take: 20000,
  });
  // Peças vistas por cliente (vezes e última vez) e a última visita de cada um
  const porCliente = new Map<number, Map<string, { vezes: number; ultima: number }>>();
  const ultimaVisita = new Map<number, number>();
  for (const v of visitas) {
    const m = SKU_PAGINA.exec(v.path);
    if (!m || !v.user_id) continue;
    const sku = decodeURIComponent(m[1]).trim();
    const t = v.created_at.getTime();
    ultimaVisita.set(v.user_id, Math.max(ultimaVisita.get(v.user_id) ?? 0, t));
    const pecas = porCliente.get(v.user_id) ?? new Map();
    const x = pecas.get(sku) ?? { vezes: 0, ultima: 0 };
    x.vezes++;
    x.ultima = Math.max(x.ultima, t);
    pecas.set(sku, x);
    porCliente.set(v.user_id, pecas);
  }
  const ids = [...porCliente.keys()].filter((u) => (ultimaVisita.get(u) ?? 0) <= espera);
  if (!ids.length) return [];
  const ok = await elegiveis(publico);
  const recentes = await jaRecebeu(autoId, [], new Date(agora - (cfg.intervaloDias ?? 14) * DIA));
  const candidatos = ids.filter((u) => ok.has(u) && !recentes.has(String(u)));
  if (!candidatos.length) return [];
  // Quem pediu alguma coisa no período fica de fora
  const emails = candidatos.map((u) => ok.get(u)!.email.toLowerCase());
  const [eventos, carrinhos, links, vendas] = await Promise.all([
    prisma.site_eventos.findMany({
      where: {
        user_id: { in: candidatos },
        tipo: { in: ["whatsapp", "cotacao"] },
        created_at: { gte: desde },
      },
      select: { user_id: true },
    }),
    prisma.carrinhos.findMany({
      where: { user_id: { in: candidatos }, status: "ENVIADO", updated_at: { gte: desde } },
      select: { user_id: true },
    }),
    prisma.links_pagamento.findMany({
      where: {
        created_at: { gte: desde },
        OR: [{ user_id: { in: candidatos } }, { email_cliente: { in: emails } }],
      },
      select: { user_id: true, email_cliente: true },
    }),
    prisma.vendas.findMany({
      where: {
        created_at: { gte: desde },
        OR: [{ user_id: { in: candidatos } }, { cliente_email: { in: emails } }],
      },
      select: { user_id: true, cliente_email: true },
    }),
  ]);
  const pediram = new Set<number>();
  for (const e of [...eventos, ...carrinhos]) if (e.user_id) pediram.add(e.user_id);
  const porEmail = new Map(candidatos.map((u) => [ok.get(u)!.email.toLowerCase(), u]));
  for (const l of links) {
    if (l.user_id) pediram.add(l.user_id);
    const u = porEmail.get((l.email_cliente ?? "").toLowerCase());
    if (u) pediram.add(u);
  }
  for (const v of vendas) {
    if (v.user_id) pediram.add(v.user_id);
    const u = porEmail.get((v.cliente_email ?? "").toLowerCase());
    if (u) pediram.add(u);
  }
  const { idiomasDosClientes } = await import("./idioma-cliente.server");
  const idiomas = await idiomasDosClientes(candidatos.filter((u) => !pediram.has(u)));
  const envios: Envio[] = [];
  for (const uid of candidatos) {
    if (pediram.has(uid)) continue;
    const idioma = idiomas.get(uid) ?? "es";
    const skus = [...porCliente.get(uid)!.entries()]
      .sort((a, b) => b[1].vezes - a[1].vezes || b[1].ultima - a[1].ultima)
      .map(([s]) => s)
      .slice(0, cfg.maxProdutos ?? 6);
    const produtos = await produtosEmail(skus, undefined, undefined, idioma);
    if (!produtos.length) continue;
    const lista = produtos.map((p) => `• ${p.nome} (Cód. ${p.codigo})`).join("\n");
    envios.push({
      user: ok.get(uid)!,
      chave: `interesse:${[...skus].sort().join(",")}`.slice(0, 150),
      produtos,
      idioma,
      vars: { repuesto: produtos[0].nome },
      ...(idioma === "pt" && { botaoUrl: "/loja" }),
      whatsappTexto:
        idioma === "pt"
          ? `Olá! Recebi o e-mail da AGRO PARTS e quero negociar estas peças:\n${lista}`
          : `¡Hola! Recibí el e-mail de AGRO PARTS y quiero negociar estos repuestos:\n${lista}`,
    });
  }
  return envios;
}

// ---------- Gatilhos ----------
async function gatilho(
  a: Automacao,
  cfg: ConfigAutomacao,
  publico: Publico,
  agora: number,
): Promise<{ envios: Envio[]; cursor?: number }> {
  const { prisma } = await import("./prisma");
  const tipo = a.tipo as TipoAutomacao;
  const desdeAtivo = a.ativado_em ?? new Date(agora);

  if (tipo === "interesse_sem_pedido")
    return { envios: await selecionarInteresse(a.id, cfg, publico, agora) };

  if (tipo === "boas_vindas" || (tipo === "cupom" && cfg.gatilho === "cadastro")) {
    const espera = tipo === "boas_vindas" ? (cfg.atrasoHoras ?? 0) * HORA : (cfg.dias ?? 7) * DIA;
    // Só quem completou o prazo depois de a automação ser ativada (não manda para a base antiga)
    const users = await prisma.users.findMany({
      where: {
        role: { not: "ADMIN" },
        created_at: { lte: new Date(agora - espera), gte: new Date(desdeAtivo.getTime() - espera) },
      },
      select: { id: true },
      take: 500,
    });
    const ok = await elegiveis(publico);
    const chave =
      tipo === "boas_vindas"
        ? "boas_vindas"
        : `cupom:${lerJson<ConteudoEmail>(a.conteudo, {} as any).cupom?.codigo ?? ""}`;
    const ja = await jaRecebeu(a.id, [chave]);
    return {
      envios: users
        .filter((u) => ok.has(u.id) && !ja.has(`${u.id}|${chave}`))
        .map((u) => ({ user: ok.get(u.id)!, chave })),
    };
  }

  if (tipo === "promocao" || tipo === "preco_baixou" || tipo === "carrinho_baixou") {
    const evs = await prisma.produto_eventos.findMany({
      where: { id: { gt: a.cursor } },
      orderBy: { id: "asc" },
      take: 2000,
    });
    if (!evs.length) return { envios: [] };
    const cursor = evs[evs.length - 1].id;
    const minimo = (cfg.minimo ?? 0) / 100;
    const validos = evs.filter(
      (e) =>
        (tipo === "carrinho_baixou" || e.tipo === (tipo === "promocao" ? "PROMOCAO" : "BAIXOU")) &&
        e.para_brl <= e.de_brl * (1 - minimo),
    );
    const skus = [...new Set(validos.map((e) => e.sku))];
    // Maior preço anterior de cada peça nesta leva de eventos
    const antesDe = new Map<string, number>();
    for (const e of validos) antesDe.set(e.sku, Math.max(antesDe.get(e.sku) ?? 0, e.de_brl));
    if (!skus.length) return { envios: [], cursor };
    const ok = await elegiveis(publico);

    if (tipo === "carrinho_baixou") {
      const carts = await prisma.carrinhos.findMany({
        where: {
          user_id: { not: null },
          updated_at: { gte: new Date(agora - (cfg.dias ?? 60) * DIA) },
        },
        select: { user_id: true, itens: true },
      });
      const porUser = new Map<number, Map<string, number>>();
      const alvo = new Set(skus);
      for (const c of carts) {
        if (!c.user_id || !ok.has(c.user_id)) continue;
        for (const i of itensDoCarrinho(c.itens)) {
          const sku = String(i.sku ?? "").trim();
          if (!alvo.has(sku)) continue;
          const m = porUser.get(c.user_id) ?? new Map<string, number>();
          m.set(sku, Math.max(m.get(sku) ?? 0, Number(i.quantity) || 1));
          porUser.set(c.user_id, m);
        }
      }
      const envios: Envio[] = [];
      for (const [uid, m] of porUser) {
        const produtos = await produtosEmail([...m.keys()].slice(0, 12), m, antesDe);
        if (produtos.length)
          envios.push({
            user: ok.get(uid)!,
            chave: `ev:${cursor}`,
            produtos,
            whatsappTexto: textoWhatsCarrinho(produtos),
          });
      }
      return { envios, cursor };
    }

    // Promoção / preço baixou: um resumo com as peças (as de maior desconto primeiro)
    const melhor = new Map<string, number>();
    for (const e of validos)
      melhor.set(e.sku, Math.max(melhor.get(e.sku) ?? 0, 1 - e.para_brl / e.de_brl));
    const ordem = [...melhor.entries()].sort((x, y) => y[1] - x[1]).map(([s]) => s);
    const produtos = (await produtosEmail(ordem, new Map(), antesDe))
      .filter((p) => p.preco)
      .slice(0, cfg.maxProdutos ?? 6);
    if (!produtos.length) return { envios: [], cursor };
    // No máximo 1 e-mail deste tipo por cliente a cada N dias
    const recentes = await jaRecebeu(a.id, [], new Date(agora - (cfg.intervaloDias ?? 3) * DIA));
    return {
      envios: [...ok.values()]
        .filter((u) => !recentes.has(String(u.id)))
        .map((u) => ({ user: u, chave: `ev:${cursor}`, produtos })),
      cursor,
    };
  }

  if (tipo === "carrinho_abandonado") {
    const horas = (cfg.horas ?? 24) * HORA;
    const carts = await prisma.carrinhos.findMany({
      where: {
        status: "ABERTO",
        user_id: { not: null },
        qtd_itens: { gt: 0 },
        updated_at: {
          lte: new Date(agora - horas),
          gte: new Date(Math.max(agora - 7 * DIA, desdeAtivo.getTime() - horas)),
        },
      },
      select: { id: true, user_id: true, itens: true, updated_at: true },
      take: 300,
    });
    const ok = await elegiveis(publico);
    const chaves = carts.map((c) => `cart:${c.id}:${c.updated_at.getTime()}`);
    const ja = await jaRecebeu(a.id, chaves);
    const envios: Envio[] = [];
    for (const c of carts) {
      const chave = `cart:${c.id}:${c.updated_at.getTime()}`;
      if (!c.user_id || !ok.has(c.user_id) || ja.has(`${c.user_id}|${chave}`)) continue;
      const itens = itensDoCarrinho(c.itens);
      const qtd = new Map(itens.map((i) => [String(i.sku).trim(), Number(i.quantity) || 1]));
      const produtos = await produtosEmail([...qtd.keys()].slice(0, 12), qtd);
      if (produtos.length)
        envios.push({
          user: ok.get(c.user_id)!,
          chave,
          produtos,
          whatsappTexto: textoWhatsCarrinho(produtos),
        });
    }
    return { envios };
  }

  if (tipo === "reengajamento") {
    const limite = new Date(agora - (cfg.dias ?? 45) * DIA);
    const users = await prisma.users.findMany({
      where: {
        role: { not: "ADMIN" },
        OR: [{ ultimo_login: { lt: limite } }, { ultimo_login: null, created_at: { lt: limite } }],
      },
      select: { id: true },
      take: 2000,
    });
    const ok = await elegiveis(publico);
    const recentes = await jaRecebeu(a.id, [], new Date(agora - (cfg.intervaloDias ?? 60) * DIA));
    return {
      envios: users
        .filter((u) => ok.has(u.id) && !recentes.has(String(u.id)))
        .slice(0, 300)
        .map((u) => ({ user: ok.get(u.id)!, chave: "reeng" })),
    };
  }

  if (tipo === "catalogo_aberto") {
    const espera = (cfg.horas ?? 20) * HORA;
    const downloads = await prisma.catalogos_downloads.findMany({
      where: {
        user_id: { not: null },
        created_at: {
          lte: new Date(agora - espera),
          gte: new Date(Math.max(agora - espera - 3 * DIA, desdeAtivo.getTime() - espera)),
        },
      },
      select: { user_id: true, catalogo: { select: { marca: true } } },
      orderBy: { id: "desc" },
      take: 3000,
    });
    const ok = await elegiveis(publico);
    // No máximo 1 e-mail deste tipo por cliente a cada N dias
    const recentes = await jaRecebeu(a.id, [], new Date(agora - (cfg.intervaloDias ?? 30) * DIA));
    const marcaDe = new Map<number, string>(); // catálogo mais recente de cada cliente
    for (const d of downloads)
      if (d.user_id && d.catalogo.marca && !marcaDe.has(d.user_id))
        marcaDe.set(d.user_id, d.catalogo.marca);
    const porMarca = new Map<string, ProdutoEmail[]>();
    const envios: Envio[] = [];
    for (const [uid, marca] of marcaDe) {
      if (!ok.has(uid) || recentes.has(String(uid))) continue;
      if (!porMarca.has(marca))
        porMarca.set(marca, await produtosDaMarca(marca, cfg.maxProdutos ?? 6));
      const produtos = porMarca.get(marca)!;
      if (produtos.length)
        envios.push({
          user: ok.get(uid)!,
          chave: `cat:${marca}`,
          produtos,
          vars: { marca },
          botaoUrl: `/loja?marca=${encodeURIComponent(marca)}`,
        });
    }
    return { envios };
  }

  if (tipo === "busca_sem_resultado") {
    // Buscas com 0 resultado (evento "busca", dado "0|termo") de clientes identificados
    const PREFIXO = "0|";
    const { eventosProntos } = await import("./eventos-db.server");
    await eventosProntos();
    const buscas = await prisma.site_eventos.findMany({
      where: {
        tipo: "busca",
        dado: { startsWith: PREFIXO },
        created_at: { gte: new Date(agora - (cfg.dias ?? 60) * DIA) },
        OR: [{ user_id: { not: null } }, { visitor_id: { not: null } }],
      },
      select: { dado: true, user_id: true, visitor_id: true },
      orderBy: { id: "desc" },
      take: 5000,
    });
    if (!buscas.length) return { envios: [] };
    // Busca sem login: o cliente é descoberto pelos carrinhos que ele salvou logado
    const vids = [
      ...new Set(buscas.filter((b) => !b.user_id && b.visitor_id).map((b) => b.visitor_id!)),
    ];
    const carts = vids.length
      ? await prisma.carrinhos.findMany({
          where: { visitante_id: { in: vids }, user_id: { not: null } },
          select: { visitante_id: true, user_id: true },
        })
      : [];
    const userDoVisitante = new Map(carts.map((c) => [c.visitante_id, c.user_id!]));
    const termosDe = new Map<number, string[]>();
    for (const b of buscas) {
      const uid = b.user_id ?? (b.visitor_id ? userDoVisitante.get(b.visitor_id) : undefined);
      if (!uid) continue;
      const termo = b.dado.slice(PREFIXO.length).trim().toLowerCase().slice(0, 100);
      if (termo.length < 3) continue;
      const l = termosDe.get(uid) ?? [];
      if (!l.includes(termo)) l.push(termo);
      termosDe.set(uid, l);
    }
    const ok = await elegiveis(publico);
    const { buscarSkus } = await import("./busca-catalogo.server");
    const achados = new Map<string, string[]>();
    const envios: Envio[] = [];
    for (const [uid, termos] of termosDe) {
      if (!ok.has(uid)) continue;
      const ja = await jaRecebeu(
        a.id,
        termos.map((t) => `busca:${t}`.slice(0, 150)),
      );
      for (const termo of termos) {
        const chave = `busca:${termo}`.slice(0, 150);
        if (ja.has(`${uid}|${chave}`)) continue;
        if (!achados.has(termo) && achados.size < 200)
          achados.set(termo, (await buscarSkus({ search: termo })).slice(0, cfg.maxProdutos ?? 4));
        const skus = achados.get(termo) ?? [];
        if (!skus.length) continue;
        const produtos = await produtosEmail(skus);
        if (produtos.length) {
          envios.push({
            user: ok.get(uid)!,
            chave,
            produtos,
            vars: { busqueda: termo },
            botaoUrl: `/loja?q=${encodeURIComponent(termo)}`,
          });
          break; // um e-mail por cliente por vez
        }
      }
    }
    return { envios };
  }

  if (tipo === "catalogo_novo") {
    const cats = await prisma.catalogos.findMany({
      where: { ativo: true, publicado_em: { gte: desdeAtivo } },
      select: { id: true, titulo: true, marca: true },
      orderBy: { id: "asc" },
    });
    if (!cats.length) return { envios: [] };
    const ok = await elegiveis(publico);
    const envios: Envio[] = [];
    const jaNestaRodada = new Set<number>();
    for (const c of cats) {
      const chave = `catnovo:${c.id}`;
      const ja = await jaRecebeu(a.id, [chave]);
      let alvo: number[];
      if (cfg.alvo === "todos" || !c.marca) alvo = [...ok.keys()];
      else {
        // Quem já abriu catálogos da mesma marca
        const dl = await prisma.catalogos_downloads.findMany({
          where: { user_id: { not: null }, catalogo: { marca: c.marca } },
          select: { user_id: true },
          distinct: ["user_id"],
        });
        alvo = dl.map((d) => d.user_id!).filter((id) => ok.has(id));
      }
      for (const uid of alvo) {
        if (ja.has(`${uid}|${chave}`) || jaNestaRodada.has(uid)) continue; // um catálogo por cliente por vez
        jaNestaRodada.add(uid);
        envios.push({
          user: ok.get(uid)!,
          chave,
          vars: { catalogo: c.titulo, marca: c.marca ?? "" },
        });
      }
    }
    return { envios };
  }

  if (tipo === "data_especial") {
    if (!cfg.data) return { envios: [] };
    const uy = emMontevideu(agora);
    if (uy.toISOString().slice(0, 10) !== cfg.data || uy.getUTCHours() < (cfg.hora ?? 9))
      return { envios: [] };
    const chave = `data:${cfg.data}`;
    const ok = await elegiveis(publico);
    const ja = await jaRecebeu(a.id, [chave]);
    return {
      envios: [...ok.values()]
        .filter((u) => !ja.has(`${u.id}|${chave}`))
        .map((u) => ({ user: u, chave })),
    };
  }

  if (tipo === "aniversario") {
    const users = await prisma.users.findMany({
      where: { role: { not: "ADMIN" }, created_at: { lte: new Date(agora - 360 * DIA) } },
      select: { id: true, created_at: true },
    });
    const ok = await elegiveis(publico);
    const inicio = emMontevideu(desdeAtivo.getTime()).toISOString().slice(0, 10);
    const candidatos: Array<{ id: number; chave: string; anos: number }> = [];
    for (const u of users) {
      if (!ok.has(u.id)) continue;
      const cad = emMontevideu(u.created_at.getTime());
      // Aniversário hoje ou nos 2 dias anteriores (se o servidor ficou parado), só depois de ligar
      for (let k = 0; k < 3; k++) {
        const d = emMontevideu(agora - k * DIA);
        if (d.toISOString().slice(0, 10) < inicio) continue;
        if (
          d.getUTCMonth() === cad.getUTCMonth() &&
          d.getUTCDate() === cad.getUTCDate() &&
          d.getUTCFullYear() > cad.getUTCFullYear()
        ) {
          candidatos.push({
            id: u.id,
            chave: `aniv:${d.getUTCFullYear()}`,
            anos: d.getUTCFullYear() - cad.getUTCFullYear(),
          });
          break;
        }
      }
    }
    const ja = await jaRecebeu(a.id, [...new Set(candidatos.map((c) => c.chave))]);
    return {
      envios: candidatos
        .filter((c) => !ja.has(`${c.id}|${c.chave}`))
        .map((c) => ({
          user: ok.get(c.id)!,
          chave: c.chave,
          vars: { anos: String(c.anos), tiempo: c.anos === 1 ? "1 año" : `${c.anos} años` },
        })),
    };
  }

  return { envios: [] }; // cupom manual: só pelo botão "Enviar agora"
}

// ---------- Envio ----------
export async function enviarAutomacao(a: Automacao, envios: Envio[]) {
  if (!envios.length) return 0;
  const { prisma } = await import("./prisma");
  const { enviarLote, montarMensagem } = await import("./email.server");
  const { PHONE } = await import("./whatsapp");
  const origem = await origemSite();
  const def = defTipo(a.tipo);
  const base = lerJson<ConteudoEmail>(a.conteudo, {
    titulo: "",
    texto: "",
    produtos: [],
    cor: "#0b7a3b",
  });
  const vars = { cupon: base.cupom?.codigo ?? "", validez: base.cupom?.validade ?? "" };
  const tag = `auto-${a.tipo}`;
  const wa = (t: string) =>
    `https://api.whatsapp.com/send?phone=${PHONE}&text=${encodeURIComponent(t)}`;
  let ok = 0;
  // Anúncio por e-mail (rodízio por cliente), se a automação não desligou
  const mk = await import("./email-marketing.server");
  const anuncios = base.semAnuncio ? [] : await mk.anunciosAtivos("AUTOMACAO");
  // Boas-vindas com cupom: cada cliente recebe o próprio cupom único (AGRO-XXXX)
  if (a.tipo === "boas_vindas" && base.cupom) {
    const { garantirCupom } = await import("./acesso.server");
    for (const e of envios) if (!e.user.cupom) e.user.cupom = await garantirCupom(e.user.id);
  }
  // Peças vistas: cupom exclusivo para cada cliente (se a automação tiver desconto)
  if (a.tipo === "interesse_sem_pedido") {
    const cfg = lerJson<ConfigAutomacao>(a.config, def.config);
    const pct = Math.max(0, Math.min(50, Math.round(Number(cfg.descontoPct ?? 0))));
    if (pct > 0)
      for (const e of envios)
        e.cupom = await cupomExclusivo(
          pct,
          cfg.validadeDias ?? 7,
          e.user.nome_completo,
          e.idioma ?? "es",
        );
  }
  for (let i = 0; i < envios.length; i += 50) {
    const lote = envios.slice(i, i + 50);
    const escolhidos = lote.map((e) => mk.escolherAnuncio(anuncios, e.user.id));
    const msgs = lote.map((e, k) => {
      // Variáveis do cliente (marca, busca, catálogo, anos...) somadas às da automação
      const pessoal =
        e.cupom?.codigo ??
        (a.tipo === "boas_vindas" && base.cupom && e.user.cupom ? e.user.cupom : null);
      const v = {
        ...vars,
        ...e.vars,
        ...(pessoal && { cupon: pessoal }),
        ...(e.cupom && { validez: e.cupom.validade }),
      };
      // Cliente do Brasil: textos da versão em português do tipo (quando houver)
      const pt = e.idioma === "pt" && def.pt;
      const baseIdioma = pt ? { ...base, ...def.pt!.conteudo } : base;
      const comCupom = e.cupom
        ? { ...baseIdioma, cupom: e.cupom }
        : pessoal
          ? { ...baseIdioma, cupom: { ...base.cupom!, codigo: pessoal } }
          : baseIdioma;
      const conteudo = {
        ...aplicarVariaveis(comCupom, v),
        ...(def.produtos && { produtos: e.produtos ?? [] }),
        ...(e.botaoUrl && { botaoUrl: e.botaoUrl }),
      };
      const codigoCupom = pessoal ?? base.cupom?.codigo;
      const whats = e.whatsappTexto
        ? `${e.whatsappTexto}${e.cupom ? `\n\n${e.idioma === "pt" ? "Meu cupom" : "Mi cupón"}: ${e.cupom.codigo}` : ""}`
        : codigoCupom
          ? `¡Hola! Quiero usar mi cupón ${codigoCupom}`
          : null;
      const preheader = pt ? def.pt!.preheader : a.preheader;
      const pre = preheader ? trocarVariaveis(preheader, v) : null;
      return montarMensagem(
        conteudo,
        trocarVariaveis(pt ? def.pt!.assunto : a.assunto, v),
        pre,
        origem,
        { id: e.user.id, email: e.user.email, nome: e.user.nome_completo },
        tag,
        {
          ...(whats && { whatsappUrl: wa(whats) }),
          // Anúncios do e-mail são do Uruguai: não vão para clientes do Brasil
          anuncio: e.idioma === "pt" ? null : escolhidos[k],
          idioma: e.idioma ?? "es",
        },
      );
    });
    try {
      const ids = await enviarLote(msgs);
      await prisma.email_envios.createMany({
        data: lote.map((e, k) => ({
          automacao_id: a.id,
          user_id: e.user.id,
          email: e.user.email,
          tipo: "AUTOMACAO",
          status: "ENVIADO",
          chave: e.chave,
          resend_id: ids[k] ?? null,
          produtos: e.produtos?.length ? JSON.stringify(e.produtos.map((p) => p.sku)) : null,
          cupom: e.cupom?.codigo ?? null,
        })),
      });
      await mk
        .registrarExibicoes(
          lote.flatMap((e, k) =>
            escolhidos[k]
              ? [
                  {
                    anuncio_id: escolhidos[k]!.id,
                    resend_id: ids[k] ?? null,
                    user_id: e.user.id,
                    origem: "AUTOMACAO" as const,
                  },
                ]
              : [],
          ),
        )
        .catch((err) => console.error("exibições do anúncio", err));
      ok += lote.length;
    } catch (err: any) {
      await prisma.email_envios.createMany({
        data: lote.map((e) => ({
          automacao_id: a.id,
          user_id: e.user.id,
          email: e.user.email,
          tipo: "AUTOMACAO",
          status: "FALHA",
          chave: e.chave,
          erro: String(err?.message ?? err).slice(0, 500),
          produtos: e.produtos?.length ? JSON.stringify(e.produtos.map((p) => p.sku)) : null,
          cupom: e.cupom?.codigo ?? null,
        })),
      });
      throw err;
    } finally {
      await new Promise((r) => setTimeout(r, 600)); // limite do Resend
    }
  }
  await prisma.email_automacoes.update({
    where: { id: a.id },
    data: { enviados: { increment: ok } },
  });
  return ok;
}

// Roda todas as automações ativas (ou só uma). Não roda duas vezes ao mesmo tempo.
// Uma vez: automações já criadas sem imagem de topo ganham a imagem nova do tipo
// (quem já escolheu uma imagem própria fica com ela)
let imagensAplicadas: Promise<void> | null = null;
export function aplicarImagensAutomacoes() {
  imagensAplicadas ??= (async () => {
    const { prisma } = await import("./prisma");
    const chave = "email_auto_imagens_v1";
    if (await prisma.configuracoes.findUnique({ where: { chave } })) return;
    const { imagemAutomacao } = await import("./automacoes-tipos");
    const rows = await prisma.email_automacoes.findMany({
      select: { id: true, tipo: true, conteudo: true },
    });
    for (const r of rows) {
      const c = lerJson<Record<string, unknown>>(r.conteudo, {});
      if (c.cabecalho) continue;
      c.cabecalho = imagemAutomacao(r.tipo as any);
      await prisma.email_automacoes.update({
        where: { id: r.id },
        data: { conteudo: JSON.stringify(c) },
      });
    }
    await prisma.configuracoes.create({ data: { chave, valor: new Date().toISOString() } });
  })().catch((e) => {
    imagensAplicadas = null;
    console.error("imagens das automações", e);
  });
  return imagensAplicadas;
}

export async function rodarAutomacoes(apenasId?: number) {
  const g = globalThis as any;
  if (g.__automacoesRodando)
    return {
      ocupado: true,
      resultados: [] as Array<{ id: number; nome: string; enviados: number; erro?: string }>,
    };
  g.__automacoesRodando = true;
  const resultados: Array<{ id: number; nome: string; enviados: number; erro?: string }> = [];
  try {
    const { prisma } = await import("./prisma");
    const { resendConfigurado } = await import("./email.server");
    await (await import("./email.server")).garantirColunasEmail();
    await aplicarImagensAutomacoes();
    await detectarMudancasPreco();
    // «Avisame cuando baje el precio» (página da peça): independe das automações ligadas
    if (!apenasId)
      await (
        await import("./aviso-preco.server")
      )
        .processarAvisosPreco()
        .catch((e) => console.error("avisos de preço:", e));
    if (!resendConfigurado()) return { ocupado: false, resultados };
    const autos = await prisma.email_automacoes.findMany({
      where: { ativo: true, ...(apenasId && { id: apenasId }) },
    });
    const agora = Date.now();
    for (const a of autos) {
      try {
        const cfg = lerJson<ConfigAutomacao>(a.config, defTipo(a.tipo).config);
        const publico = lerJson<Publico>(a.publico, { tipo: "todos", departamentos: [], dias: 30 });
        const { envios, cursor } = await gatilho(a, cfg, publico, agora);
        const n = await enviarAutomacao(a, envios);
        await prisma.email_automacoes.update({
          where: { id: a.id },
          data: { rodou_em: new Date(), ultimo_erro: null, ...(cursor != null && { cursor }) },
        });
        resultados.push({ id: a.id, nome: a.nome, enviados: n });
      } catch (e: any) {
        console.error("automação", a.id, e);
        await prisma.email_automacoes
          .update({
            where: { id: a.id },
            data: { rodou_em: new Date(), ultimo_erro: String(e?.message ?? e).slice(0, 500) },
          })
          .catch(() => {});
        resultados.push({ id: a.id, nome: a.nome, enviados: 0, erro: String(e?.message ?? e) });
      }
    }
    return { ocupado: false, resultados };
  } finally {
    g.__automacoesRodando = false;
  }
}

export function chaveEnvioAgora(
  tipo: string,
  conteudo: Partial<ConteudoEmail>,
  cfg: ConfigAutomacao,
) {
  if (tipo === "boas_vindas") return "boas_vindas";
  if (tipo === "cupom") return `cupom:${conteudo.cupom?.codigo ?? ""}`;
  if (tipo === "data_especial")
    return `data:${cfg.data || emMontevideu(Date.now()).toISOString().slice(0, 10)}`;
  return "reeng";
}

// "Enviar agora": boas-vindas, cupom, data comercial e cliente inativo, para o público (ou clientes escolhidos)
export async function enviarAgora(id: number, ids?: number[]) {
  const { prisma } = await import("./prisma");
  const a = await prisma.email_automacoes.findUnique({ where: { id } });
  if (!a) throw new Error("Automação não encontrada");
  const publico: Publico = ids?.length
    ? { tipo: "ids", departamentos: [], dias: 30, ids }
    : lerJson<Publico>(a.publico, { tipo: "todos", departamentos: [], dias: 30 });
  const ok = await elegiveis(publico);
  const conteudo = lerJson<ConteudoEmail>(a.conteudo, {} as any);
  const cfg = lerJson<ConfigAutomacao>(a.config, defTipo(a.tipo).config);
  // Boas-vindas, o mesmo cupom e a mesma data: só uma vez por cliente. Inativo: respeita o intervalo.
  const chave = chaveEnvioAgora(a.tipo, conteudo, cfg);
  const ja =
    a.tipo === "reengajamento"
      ? await jaRecebeu(a.id, [], new Date(Date.now() - (cfg.intervaloDias ?? 60) * DIA))
      : await jaRecebeu(a.id, [chave]);
  const envios = [...ok.values()]
    .filter((u) => !ja.has(a.tipo === "reengajamento" ? String(u.id) : `${u.id}|${chave}`))
    .map((u) => ({ user: u, chave }));
  void enviarAutomacao(a, envios).catch(async (e) => {
    await prisma.email_automacoes
      .update({ where: { id }, data: { ultimo_erro: String(e?.message ?? e).slice(0, 500) } })
      .catch(() => {});
  });
  return { total: envios.length, jaReceberam: ok.size - envios.length };
}

// Teste: monta o e-mail com dados reais (ou de exemplo) e manda só para o admin
export async function mensagemTeste(
  a: Pick<Automacao, "tipo" | "assunto" | "preheader" | "conteudo">,
  para: string,
  nome: string,
) {
  const { montarMensagem } = await import("./email.server");
  const { prisma } = await import("./prisma");
  const { PRODUTOS_EXEMPLO } = await import("./automacoes-tipos");
  const base = lerJson<ConteudoEmail>(a.conteudo, {
    titulo: "",
    texto: "",
    produtos: [],
    cor: "#0b7a3b",
  });
  const vars: Record<string, string> = {
    ...defTipo(a.tipo).variaveis,
    cupon: base.cupom?.codigo ?? "",
    validez: base.cupom?.validade ?? "",
  };
  let produtos: ProdutoEmail[] = [];
  if (a.tipo === "catalogo_aberto") produtos = await produtosDaMarca(vars.marca ?? "John Deere", 4);
  if (defTipo(a.tipo).produtos && !produtos.length) {
    // Peças em promoção de verdade, se houver; senão, exemplos
    const promo = await prisma.agricolas.findMany({
      where: { duplicado_de: null, valor_promocional: { gt: 0 } },
      select: { sku: true },
      take: 4,
    });
    produtos = (await produtosEmail(promo.map((p) => p.sku))).filter((p) => p.preco);
    if (!produtos.length) produtos = PRODUTOS_EXEMPLO;
  }
  const conteudo = {
    ...aplicarVariaveis(base, vars),
    ...(defTipo(a.tipo).produtos && { produtos }),
  };
  const pre = a.preheader ? trocarVariaveis(a.preheader, vars) : null;
  return montarMensagem(
    conteudo,
    `[PRUEBA] ${trocarVariaveis(a.assunto, vars)}`,
    pre,
    await origemSite(),
    { email: para, nome },
    "teste",
  );
}

// Agendador: a cada 10 minutos no servidor de produção (ou com AUTOMACOES_LOCAL=1)
export function iniciarAgendador() {
  const g = globalThis as any;
  if (g.__agendadorAutomacoes) return;
  if (process.env.NODE_ENV !== "production" && process.env.AUTOMACOES_LOCAL !== "1") return;
  g.__agendadorAutomacoes = true;
  const rodar = () => {
    rodarAutomacoes().catch((e) => console.error("automações", e));
    // Campanhas de e-mail agendadas
    import("./email.server")
      .then((m) => m.dispararAgendadas())
      .catch((e) => console.error("campanhas agendadas", e?.message ?? e));
    // Peças e catálogos novos/alterados → Bing pela IndexNow
    import("./indexnow.server")
      .then((m) => m.indexNowPendentes())
      .catch((e) => console.error("indexnow", e));
    // Pagamentos em aberto (PIX, Abitab/Redpagos, 3D Secure): confere direto na dLocal, caso
    // algum aviso tenha se perdido. Uma vez por dia, limpa os avisos antigos.
    import("./pagamentos.server")
      .then(async (m) => {
        await m.conferirPendentes();
        if (new Date().getHours() === 3) await m.limparAvisosAntigos();
      })
      .catch((e) => console.error("pagamentos", e));
    // Search Console: importa posições, buscas e páginas a cada 12 h (se conectado)
    import("./search-console.server")
      .then((m) => m.sincronizarSeVencido())
      .catch((e) => console.error("search console", e?.message ?? e));
    // Instagram: publicações agendadas (e métricas a cada 6 h)
    import("./instagram.server")
      .then((m) => m.tarefasInstagram())
      .catch((e) => console.error("instagram", e?.message ?? e));
    // Central de Anúncios: campanhas e números do Google Ads e do Meta a cada 3 h
    import("./ads.server")
      .then((m) => m.sincronizarAdsSeVencido())
      .catch((e) => console.error("ads", e?.message ?? e));
  };
  setTimeout(rodar, 60_000);
  setInterval(rodar, 10 * 60_000);
}
