// Meta Ads completo (Admin → Meta Ads): visão geral com retorno no site, campanhas → conjuntos →
// anúncios (pausar/ativar/orçamento), últimos anúncios com prévia, público (idade, gênero,
// região, posicionamento, aparelho), cidades e rotas no site, leads, criar anúncio e conta/saldo.
// Usa o token e a conta da Central de Anúncios (Integrações ou «Conectar Facebook»).
import { cfg, chamar, contasMeta, emCadaConta, fatorDoObjeto, todas } from "./ads-meta.server";

const DIA = 86_400_000;
const diaUY = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Montevideo" });
export const periodo = (dias: number) => {
  const fim = new Date();
  const ini = new Date(fim.getTime() - (dias - 1) * DIA);
  return { since: diaUY(ini), until: diaUY(fim), desde: new Date(`${diaUY(ini)}T00:00:00-03:00`) };
};
const faixa = (dias: number) => {
  const p = periodo(dias);
  return JSON.stringify({ since: p.since, until: p.until });
};

// Memória curta: a mesma tela pede várias coisas e a Meta limita chamadas
const memo = new Map<string, { ate: number; v: Promise<any> }>();
function lembrar<T>(chave: string, ms: number, fn: () => Promise<T>): Promise<T> {
  const m = memo.get(chave);
  if (m && m.ate > Date.now()) return m.v;
  const v = fn().catch((e) => {
    memo.delete(chave);
    throw e;
  });
  memo.set(chave, { ate: Date.now() + ms, v });
  return v;
}
export const limparMemoMeta = () => memo.clear();

// ---------------------------------------------------------------- ações → números
const LEADS = [
  "lead",
  "onsite_conversion.lead_grouped",
  "offsite_conversion.fb_pixel_lead",
  "contact",
  "offsite_conversion.fb_pixel_contact",
];
const CONVERSAS = ["onsite_conversion.messaging_conversation_started_7d"];
const soma = (lista: any[] | undefined, tipos: string[]) =>
  (lista ?? [])
    .filter((a) => tipos.includes(a.action_type))
    .reduce((t, a) => t + Number(a.value || 0), 0);
const um = (lista: any[] | undefined, tipo: string) => soma(lista, [tipo]);

export type Numeros = {
  gasto: number;
  impressoes: number;
  alcance: number;
  cliques: number;
  cliquesLink: number;
  visitasPagina: number;
  leads: number;
  conversas: number;
  compras: number;
  valorCompras: number;
  ctr: number | null;
  cpc: number | null;
  cpm: number | null;
  frequencia: number | null;
};
const CAMPOS_INSIGHTS =
  "spend,impressions,reach,clicks,inline_link_clicks,ctr,cpc,cpm,frequency,actions,action_values";
function numeros(x: any, fator = 1): Numeros {
  const compra =
    um(x.actions, "purchase") ||
    um(x.actions, "omni_purchase") ||
    um(x.actions, "offsite_conversion.fb_pixel_purchase");
  const valor =
    um(x.action_values, "purchase") ||
    um(x.action_values, "omni_purchase") ||
    um(x.action_values, "offsite_conversion.fb_pixel_purchase");
  return {
    gasto: Number(x.spend || 0) * fator,
    impressoes: Number(x.impressions || 0),
    alcance: Number(x.reach || 0),
    cliques: Number(x.clicks || 0),
    cliquesLink: Number(x.inline_link_clicks || 0),
    visitasPagina: um(x.actions, "landing_page_view"),
    leads: soma(x.actions, LEADS),
    conversas: soma(x.actions, CONVERSAS),
    compras: compra,
    valorCompras: valor * fator,
    ctr: x.ctr != null ? Number(x.ctr) : null,
    cpc: x.cpc != null ? Number(x.cpc) * fator : null,
    cpm: x.cpm != null ? Number(x.cpm) * fator : null,
    frequencia: x.frequency != null ? Number(x.frequency) : null,
  };
}
const vazio = (): Numeros => numeros({});
// Junta os números de várias contas (as taxas são recalculadas sobre a soma; o alcance é somado,
// então quem viu anúncios das duas contas conta duas vezes)
const SOMAVEIS = [
  "gasto",
  "impressoes",
  "alcance",
  "cliques",
  "cliquesLink",
  "visitasPagina",
  "leads",
  "conversas",
  "compras",
  "valorCompras",
] as const;
function somar(lista: Numeros[]): Numeros {
  if (lista.length === 1) return lista[0];
  const t = vazio();
  for (const n of lista) for (const k of SOMAVEIS) t[k] += n[k];
  t.ctr = t.impressoes ? (t.cliques / t.impressoes) * 100 : null;
  t.cpc = t.cliques ? t.gasto / t.cliques : null;
  t.cpm = t.impressoes ? (t.gasto / t.impressoes) * 1000 : null;
  t.frequencia = t.alcance ? t.impressoes / t.alcance : null;
  return t;
}

// ---------------------------------------------------------------- conta e saldo
async function lerConta(id: string) {
  {
    const j = await chamar(id, {
      fields:
        "name,currency,balance,amount_spent,spend_cap,account_status,disable_reason,timezone_name,funding_source_details,business{id,name}",
    });
    const cent = (v: unknown) => (v == null || v === "" ? null : Number(v) / 100);
    const STATUS: Record<number, string> = {
      1: "Ativa",
      2: "Desativada",
      3: "Pagamento pendente",
      7: "Em análise de risco",
      8: "Pagamento em andamento",
      9: "Em período de carência",
      100: "Fechamento pendente",
      101: "Fechada",
    };
    const digitos = id.replace(/\D/g, "");
    return {
      id,
      nome: String(j.name ?? ""),
      moeda: String(j.currency ?? "USD"),
      status: STATUS[Number(j.account_status)] ?? String(j.account_status ?? ""),
      ativa: Number(j.account_status) === 1,
      saldoDevido: cent(j.balance), // o que a conta deve (cobrança pós-paga)
      gastoTotal: cent(j.amount_spent),
      limiteGasto: j.spend_cap && Number(j.spend_cap) > 0 ? cent(j.spend_cap) : null,
      pagamento: j.funding_source_details?.display_string ?? null,
      fuso: j.timezone_name ?? null,
      // Adicionar fundos/forma de pagamento: só pelo Gerenciador (a API não permite)
      linkPagamento: `https://business.facebook.com/billing_hub/accounts/details?asset_id=${digitos}`,
      linkGerenciador: `https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=${digitos}`,
    };
  }
}
export async function contaCompleta() {
  const c = await cfg();
  return lembrar(`conta:${c.contas.join(",")}`, 60_000, async () => {
    const { contas, semAcesso } = await contasMeta();
    const [principal, ...outras] = await Promise.all(contas.map((x) => lerConta(x.id)));
    return { ...principal, outras, semAcesso };
  });
}

// ---------------------------------------------------------------- visão geral
export async function visaoGeral(dias: number) {
  const c = await cfg();
  return lembrar(`geral:${c.contas.join(",")}:${dias}`, 120_000, async () => {
    const porConta = await emCadaConta(async (conta) => {
      const [tot, serie] = await Promise.all([
        chamar(`${conta.id}/insights`, { fields: CAMPOS_INSIGHTS, time_range: faixa(dias) }),
        todas(`${conta.id}/insights`, {
          fields: CAMPOS_INSIGHTS,
          time_range: faixa(dias),
          time_increment: "1",
          limit: "500",
        }),
      ]);
      return [
        {
          total: numeros(tot.data?.[0] ?? {}, conta.fator),
          serie: serie.map((x: any) => ({ dia: String(x.date_start), n: numeros(x, conta.fator) })),
        },
      ];
    });
    const juntos = new Map<string, Numeros[]>();
    for (const p of porConta)
      for (const x of p.serie) juntos.set(x.dia, [...(juntos.get(x.dia) ?? []), x.n]);
    const porDia = new Map([...juntos].map(([d, l]) => [d, somar(l)]));
    const p = periodo(dias);
    const dias_: Array<Numeros & { dia: string }> = [];
    for (
      let t = new Date(`${p.since}T12:00:00Z`).getTime();
      diaUY(new Date(t)) <= p.until;
      t += DIA
    ) {
      const d = new Date(t).toISOString().slice(0, 10);
      dias_.push({ dia: d, ...(porDia.get(d) ?? vazio()) });
    }
    return { total: porConta.length ? somar(porConta.map((p) => p.total)) : vazio(), serie: dias_ };
  });
}

// O que os anúncios do Meta trouxeram ao site (visitas pagas, WhatsApp, cotações, cadastros,
// vendas por link de pagamento de quem veio de anúncio)
export async function retornoSite(dias: number) {
  const { prisma } = await import("./prisma");
  const { whereHumano } = await import("./rastreio.server");
  const desde = periodo(dias).desde;
  const pago = {
    fonte: { in: ["facebook", "instagram"] },
    meio: "pago",
    created_at: { gte: desde },
  };
  const visitas = await prisma.site_visits.findMany({
    where: { ...pago, ...(whereHumano as any) },
    select: { session_id: true, visitor_id: true, user_id: true },
  });
  const [eventos, sessoes] = await Promise.all([
    prisma.site_eventos.groupBy({ by: ["tipo"], where: pago, _count: true }),
    Promise.resolve(new Set(visitas.map((v) => v.session_id).filter(Boolean)).size),
  ]);
  const users = [...new Set(visitas.map((v) => v.user_id).filter((x): x is number => !!x))];
  const [cadastros, vendas] = await Promise.all([
    prisma.users.count({
      where: { id: { in: users.length ? users : [-1] }, created_at: { gte: desde } },
    }),
    prisma.links_pagamento.findMany({
      where: {
        user_id: { in: users.length ? users : [-1] },
        status: "PAGO",
        pago_em: { gte: desde },
      },
      select: { total: true, moeda: true },
    }),
  ]);
  const ev = Object.fromEntries(eventos.map((e) => [e.tipo, e._count])) as Record<string, number>;
  const receita: Record<string, number> = {};
  for (const v of vendas) receita[v.moeda] = (receita[v.moeda] ?? 0) + v.total / 100;
  return {
    sessoes,
    visitantes: new Set(visitas.map((v) => v.visitor_id).filter(Boolean)).size,
    whatsapp: ev.whatsapp ?? 0,
    cotacoes: ev.cotacao ?? 0,
    carrinhos: ev.carrinho ?? 0,
    cadastros,
    vendas: vendas.length,
    receita,
  };
}

// ---------------------------------------------------------------- campanhas → conjuntos → anúncios
const STATUS: Record<string, string> = {
  ACTIVE: "ATIVA",
  PAUSED: "PAUSADA",
  DELETED: "REMOVIDA",
  ARCHIVED: "REMOVIDA",
};
async function insightsPor(nivel: "campaign" | "adset" | "ad", dias: number) {
  const rows = await emCadaConta(async (c) =>
    (
      await todas(`${c.id}/insights`, {
        level: nivel,
        fields: `${nivel}_id,${CAMPOS_INSIGHTS}`,
        time_range: faixa(dias),
        limit: "500",
      })
    ).map((x: any) => [String(x[`${nivel}_id`]), numeros(x, c.fator)] as const),
  );
  return new Map(rows);
}

export async function estrutura(dias: number) {
  const c = await cfg();
  return lembrar(`estrutura:${c.contas.join(",")}:${dias}`, 120_000, async () => {
    const { contas } = await contasMeta();
    const varias = contas.length > 1;
    const [camps, conjuntos, ins, insC] = await Promise.all([
      emCadaConta(async (conta) =>
        (
          await todas(`${conta.id}/campaigns`, {
            fields:
              "id,name,status,effective_status,objective,daily_budget,lifetime_budget,created_time",
            limit: "200",
          })
        ).map((x: any) => ({ ...x, _conta: conta })),
      ),
      emCadaConta(async (conta) =>
        (
          await todas(`${conta.id}/adsets`, {
            fields:
              "id,name,status,effective_status,campaign_id,daily_budget,lifetime_budget,optimization_goal,targeting{age_min,age_max,genders,geo_locations}",
            limit: "500",
          })
        ).map((x: any) => ({ ...x, _conta: conta })),
      ),
      insightsPor("campaign", dias),
      insightsPor("adset", dias),
    ]);
    const conj = conjuntos.map((a: any) => ({
      id: String(a.id),
      campanha: String(a.campaign_id),
      nome: String(a.name ?? a.id),
      status: STATUS[a.status] ?? "OUTRO",
      statusOrigem: String(a.effective_status ?? a.status ?? ""),
      orcamentoDiario: a.daily_budget ? (Number(a.daily_budget) / 100) * a._conta.fator : null,
      vitalicio: !!a.lifetime_budget,
      otimizacao: a.optimization_goal ?? null,
      publico: [
        a.targeting?.age_min && `${a.targeting.age_min}–${a.targeting.age_max ?? "65+"} anos`,
        a.targeting?.genders?.length === 1
          ? a.targeting.genders[0] === 1
            ? "homens"
            : "mulheres"
          : null,
        (a.targeting?.geo_locations?.countries ?? []).join(", ") || null,
      ]
        .filter(Boolean)
        .join(" · "),
      numeros: insC.get(String(a.id)) ?? vazio(),
    }));
    return camps
      .map((x: any) => ({
        id: String(x.id),
        nome: String(x.name ?? x.id),
        status: STATUS[x.status] ?? "OUTRO",
        statusOrigem: String(x.effective_status ?? x.status ?? ""),
        objetivo: x.objective ?? null,
        conta: varias ? (x._conta.nome as string) : null,
        orcamentoDiario: x.daily_budget ? (Number(x.daily_budget) / 100) * x._conta.fator : null,
        vitalicio: !!x.lifetime_budget,
        criada: x.created_time ?? null,
        numeros: ins.get(String(x.id)) ?? vazio(),
        conjuntos: conj.filter((a: any) => a.campanha === String(x.id)),
      }))
      .sort(
        (a: any, b: any) =>
          b.numeros.gasto - a.numeros.gasto || String(b.criada).localeCompare(String(a.criada)),
      );
  });
}

// Últimos anúncios com a arte, os textos e os números do período
export async function anuncios(dias: number) {
  const c = await cfg();
  return lembrar(`anuncios:${c.contas.join(",")}:${dias}`, 120_000, async () => {
    const { contas } = await contasMeta();
    const varias = contas.length > 1;
    const [ads, ins] = await Promise.all([
      emCadaConta(async (conta) =>
        (
          await todas(`${conta.id}/ads`, {
            fields:
              "id,name,status,effective_status,created_time,campaign{name},adset{name},creative{thumbnail_url,image_url,title,body,call_to_action_type,object_story_spec,effective_instagram_media_id,effective_object_story_id}",
            limit: "100",
          })
        ).map((x: any) => ({ ...x, _conta: conta })),
      ),
      insightsPor("ad", dias),
    ]);
    return ads
      .map((a: any) => {
        const cr = a.creative ?? {};
        const ld = cr.object_story_spec?.link_data ?? {};
        return {
          id: String(a.id),
          nome: String(a.name ?? a.id),
          status: STATUS[a.status] ?? "OUTRO",
          statusOrigem: String(a.effective_status ?? a.status ?? ""),
          criado: a.created_time ?? null,
          campanha: a.campaign?.name ?? null,
          conta: varias ? (a._conta.nome as string) : null,
          conjunto: a.adset?.name ?? null,
          imagem: cr.image_url ?? cr.thumbnail_url ?? ld.picture ?? null,
          titulo: cr.title ?? ld.name ?? null,
          texto: cr.body ?? ld.message ?? null,
          link: ld.link ?? null,
          botao: cr.call_to_action_type ?? ld.call_to_action?.type ?? null,
          numeros: ins.get(String(a.id)) ?? vazio(),
        };
      })
      .sort((a: any, b: any) => String(b.criado).localeCompare(String(a.criado)));
  });
}

// Prévia oficial do anúncio (iframe da Meta)
export async function previaAnuncio(id: string, formato: string) {
  const j = await chamar(`${id}/previews`, { ad_format: formato });
  const html = String(j.data?.[0]?.body ?? "");
  const src = /src="([^"]+)"/.exec(html)?.[1]?.replace(/&amp;/g, "&");
  if (!src) throw new Error("A Meta não devolveu a prévia desse anúncio.");
  return src;
}

// Pausar/ativar e orçamento de campanha, conjunto ou anúncio (registra no histórico da Central)
export async function alterarObjeto(id: string, o: { ativo?: boolean; orcamento?: number }) {
  if (!/^\d+$/.test(id)) throw new Error("Id inválido");
  const params: Record<string, string> = {};
  if (o.ativo !== undefined) params.status = o.ativo ? "ACTIVE" : "PAUSED";
  if (o.orcamento !== undefined) {
    if (!(o.orcamento > 0)) throw new Error("Orçamento inválido");
    params.daily_budget = String(Math.round((o.orcamento / (await fatorDoObjeto(id))) * 100));
  }
  await chamar(id, params, "POST");
  limparMemoMeta();
}

// ---------------------------------------------------------------- público
export async function publico(dias: number) {
  const c = await cfg();
  return lembrar(`publico:${c.contas.join(",")}:${dias}`, 300_000, async () => {
    const por = async (breakdowns: string) =>
      emCadaConta(async (conta) =>
        (
          await todas(`${conta.id}/insights`, {
            fields: CAMPOS_INSIGHTS,
            time_range: faixa(dias),
            breakdowns,
            limit: "500",
          }).catch(() => [])
        ).map((x: any) => ({ ...x, _fator: conta.fator })),
      );
    const [idade, regiao, posicao, aparelho] = await Promise.all([
      por("age,gender"),
      por("region"),
      por("publisher_platform,platform_position"),
      por("impression_device"),
    ]);
    // A mesma linha vinda de contas diferentes vira uma só
    const agrupar = (rows: any[], rotulo: (x: any) => string) => {
      const g = new Map<string, Numeros[]>();
      for (const x of rows) g.set(rotulo(x), [...(g.get(rotulo(x)) ?? []), numeros(x, x._fator)]);
      return [...g].map(([r, l]) => ({ rotulo: r, ...somar(l) })).sort((a, b) => b.gasto - a.gasto);
    };
    const GEN: Record<string, string> = {
      male: "Homens",
      female: "Mulheres",
      unknown: "Não informado",
    };
    const idades = new Map<string, any>();
    for (const x of idade) {
      const k = String(x.age);
      const g = idades.get(k) ?? {
        rotulo: k,
        Homens: 0,
        Mulheres: 0,
        "Não informado": 0,
        gasto: 0,
        cliques: 0,
        resultados: 0,
      };
      const n = numeros(x, x._fator);
      g[GEN[x.gender] ?? "Não informado"] += n.cliques;
      g.gasto += n.gasto;
      g.cliques += n.cliques;
      g.resultados += n.leads + n.conversas;
      idades.set(k, g);
    }
    return {
      idade: [...idades.values()].sort((a, b) => a.rotulo.localeCompare(b.rotulo)),
      regiao: agrupar(regiao, (x) => String(x.region)),
      posicao: agrupar(
        posicao,
        (x) => `${x.publisher_platform} · ${String(x.platform_position).replace(/_/g, " ")}`,
      ),
      aparelho: agrupar(aparelho, (x) => String(x.impression_device).replace(/_/g, " ")),
    };
  });
}

// Cidades e rotas no site de quem veio de anúncio do Meta (a Meta só informa região/departamento)
export async function cidadesERotas(dias: number) {
  const { prisma } = await import("./prisma");
  const { whereHumano } = await import("./rastreio.server");
  const desde = periodo(dias).desde;
  const visitas = await prisma.site_visits.findMany({
    where: {
      fonte: { in: ["facebook", "instagram"] },
      meio: "pago",
      created_at: { gte: desde },
      ...(whereHumano as any),
    },
    select: {
      session_id: true,
      city: true,
      region: true,
      path: true,
      created_at: true,
      latitude: true,
      longitude: true,
    },
    orderBy: { created_at: "asc" },
    take: 50_000,
  });
  const sessoesPagas = [
    ...new Set(visitas.map((v) => v.session_id).filter((x): x is string => !!x)),
  ];
  // As páginas seguintes da sessão (que podem não ter UTM) completam a rota
  const todasVisitas = sessoesPagas.length
    ? await prisma.site_visits.findMany({
        where: { session_id: { in: sessoesPagas.slice(0, 5000) }, created_at: { gte: desde } },
        select: { session_id: true, path: true, created_at: true },
        orderBy: { created_at: "asc" },
      })
    : [];
  const zaps = await prisma.site_eventos.findMany({
    where: {
      fonte: { in: ["facebook", "instagram"] },
      meio: "pago",
      created_at: { gte: desde },
      tipo: { in: ["whatsapp", "cotacao"] },
    },
    select: { city: true },
  });
  const cidades = new Map<
    string,
    {
      cidade: string;
      regiao: string | null;
      sessoes: Set<string>;
      whatsapp: number;
      lat: number | null;
      lon: number | null;
    }
  >();
  for (const v of visitas) {
    const k = v.city || "Desconhecida";
    const c = cidades.get(k) ?? {
      cidade: k,
      regiao: v.region,
      sessoes: new Set(),
      whatsapp: 0,
      lat: v.latitude,
      lon: v.longitude,
    };
    if (v.session_id) c.sessoes.add(v.session_id);
    cidades.set(k, c);
  }
  for (const z of zaps) {
    const k = z.city || "Desconhecida";
    const c = cidades.get(k);
    if (c) c.whatsapp++;
  }
  // Rotas: página de entrada → próximas páginas (até 3 passos)
  const porSessao = new Map<string, string[]>();
  for (const v of todasVisitas) {
    if (!v.session_id || v.path.startsWith("/_evento/")) continue;
    const l = porSessao.get(v.session_id) ?? [];
    if (l[l.length - 1] !== v.path) l.push(v.path);
    porSessao.set(v.session_id, l);
  }
  const rotas = new Map<string, number>();
  const entradas = new Map<string, number>();
  for (const l of porSessao.values()) {
    entradas.set(l[0], (entradas.get(l[0]) ?? 0) + 1);
    const r = l.slice(0, 3).join(" → ");
    rotas.set(r, (rotas.get(r) ?? 0) + 1);
  }
  const top = (m: Map<string, number>, n: number) =>
    [...m]
      .sort((a, b) => b[1] - a[1])
      .slice(0, n)
      .map(([k, v]) => ({ k, v }));
  return {
    cidades: [...cidades.values()]
      .map((c) => ({
        cidade: c.cidade,
        regiao: c.regiao,
        sessoes: c.sessoes.size,
        whatsapp: c.whatsapp,
        lat: c.lat,
        lon: c.lon,
      }))
      .sort((a, b) => b.sessoes - a.sessoes)
      .slice(0, 40),
    entradas: top(entradas, 12),
    rotas: top(rotas, 15),
    sessoes: porSessao.size,
    umaPagina: [...porSessao.values()].filter((l) => l.length === 1).length,
  };
}

// ---------------------------------------------------------------- leads
async function garantirLeads() {
  const { prisma } = await import("./prisma");
  await prisma.$executeRawUnsafe(`CREATE TABLE IF NOT EXISTS \`leads\` (
    \`id\` INTEGER NOT NULL AUTO_INCREMENT,
    \`origem\` VARCHAR(20) NOT NULL,
    \`ref\` VARCHAR(120) NOT NULL,
    \`nome\` VARCHAR(191) NULL,
    \`email\` VARCHAR(191) NULL,
    \`telefone\` VARCHAR(60) NULL,
    \`cidade\` VARCHAR(191) NULL,
    \`detalhe\` TEXT NULL,
    \`campanha\` VARCHAR(300) NULL,
    \`anuncio\` VARCHAR(300) NULL,
    \`user_id\` INTEGER NULL,
    \`status\` VARCHAR(20) NOT NULL DEFAULT 'NOVO',
    \`nota\` TEXT NULL,
    \`valor\` DOUBLE NULL,
    \`quando\` DATETIME(3) NOT NULL,
    \`created_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    \`updated_at\` DATETIME(3) NOT NULL,
    UNIQUE INDEX \`leads_origem_ref_key\`(\`origem\`, \`ref\`),
    INDEX \`leads_status_quando_idx\`(\`status\`, \`quando\`),
    INDEX \`leads_quando_idx\`(\`quando\`),
    PRIMARY KEY (\`id\`)
  ) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
}
let tabelaLeads: Promise<void> | null = null;
export const garantirTabelaLeads = () =>
  (tabelaLeads ??= garantirLeads().catch((e) => {
    tabelaLeads = null;
    throw e;
  }));

type NovoLead = {
  origem: string;
  ref: string;
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  cidade?: string | null;
  detalhe?: string | null;
  campanha?: string | null;
  anuncio?: string | null;
  user_id?: number | null;
  quando: Date;
};
async function inserir(lista: NovoLead[]) {
  if (!lista.length) return 0;
  const { prisma } = await import("./prisma");
  const r = await prisma.leads.createMany({
    data: lista.map((l) => ({
      ...l,
      nome: l.nome?.slice(0, 191) ?? null,
      email: l.email?.slice(0, 191) ?? null,
      telefone: l.telefone?.slice(0, 60) ?? null,
      cidade: l.cidade?.slice(0, 191) ?? null,
      campanha: l.campanha?.slice(0, 300) ?? null,
      anuncio: l.anuncio?.slice(0, 300) ?? null,
    })),
    skipDuplicates: true, // (origem, ref) único: sincronizar de novo não duplica
  });
  return r.count;
}

// Traz os leads novos: formulários dos anúncios (Lead Ads) e contatos do site vindos de anúncio
export async function sincronizarLeads(dias = 90) {
  await garantirTabelaLeads();
  const { prisma } = await import("./prisma");
  const desde = new Date(Date.now() - dias * DIA);
  const avisos: string[] = [];
  let novos = 0;

  // 1) Formulários de anúncio (precisa de leads_retrieval e pages_manage_ads)
  try {
    const { paginaAtual } = await import("./facebook.server");
    const pg = await paginaAtual();
    const GRAPH = (process.env.META_GRAPH_URL || "https://graph.facebook.com").replace(/\/+$/, "");
    const get = async (caminho: string, p: Record<string, string>) => {
      const u = new URL(`${GRAPH}/v21.0/${caminho}`);
      for (const [k, v] of Object.entries({ ...p, access_token: pg.token }))
        u.searchParams.set(k, v);
      const j: any = await fetch(u, { signal: AbortSignal.timeout(30_000) }).then((r) => r.json());
      if (j.error) throw new Error(j.error.message);
      return j;
    };
    const forms = await get(`${pg.id}/leadgen_forms`, { fields: "id,name", limit: "100" });
    for (const f of forms.data ?? []) {
      const ls = await get(`${f.id}/leads`, {
        fields: "id,created_time,field_data,ad_name,campaign_name",
        limit: "500",
        filtering: JSON.stringify([
          {
            field: "time_created",
            operator: "GREATER_THAN",
            value: Math.floor(desde.getTime() / 1000),
          },
        ]),
      });
      const lista: NovoLead[] = (ls.data ?? []).map((l: any) => {
        const campos = Object.fromEntries(
          (l.field_data ?? []).map((c: any) => [String(c.name), (c.values ?? []).join(", ")]),
        );
        const pega = (...k: string[]) => k.map((x) => campos[x]).find(Boolean) ?? null;
        return {
          origem: "FORMULARIO",
          ref: String(l.id),
          nome: pega("full_name", "nome", "name", "first_name"),
          email: pega("email", "correo"),
          telefone: pega("phone_number", "telefono", "telefone", "whatsapp"),
          cidade: pega("city", "ciudad", "cidade", "departamento"),
          detalhe:
            `Formulário «${f.name}»\n` +
            Object.entries(campos)
              .map(([k, v]) => `${k}: ${v}`)
              .join("\n"),
          campanha: l.campaign_name ?? null,
          anuncio: l.ad_name ?? null,
          quando: new Date(l.created_time),
        };
      });
      novos += await inserir(lista);
    }
  } catch (e: any) {
    avisos.push(`Formulários do Meta: ${e?.message ?? e}`);
  }

  // 2) Contatos no site vindos de anúncio pago do Meta (WhatsApp, cotação)
  const eventos = await prisma.site_eventos.findMany({
    where: {
      fonte: { in: ["facebook", "instagram"] },
      meio: "pago",
      tipo: { in: ["whatsapp", "cotacao"] },
      created_at: { gte: desde },
    },
    select: {
      id: true,
      tipo: true,
      dado: true,
      pagina: true,
      user_id: true,
      city: true,
      region: true,
      utm_campaign: true,
      utm_medium: true,
      created_at: true,
      fonte: true,
    },
    take: 5000,
  });
  const ids = [...new Set(eventos.map((e) => e.user_id).filter((x): x is number => !!x))];
  const us = await prisma.users.findMany({
    where: { id: { in: ids.length ? ids : [-1] } },
    select: { id: true, nome_completo: true, email: true, telefone: true, cidade: true },
  });
  const U = new Map(us.map((u) => [u.id, u]));
  novos += await inserir(
    eventos.map((e) => {
      const u = e.user_id ? U.get(e.user_id) : undefined;
      return {
        origem: e.tipo === "cotacao" ? "COTACAO" : "WHATSAPP",
        ref: String(e.id),
        nome: u?.nome_completo ?? null,
        email: u?.email ?? null,
        telefone: u?.telefone ?? null,
        cidade: u?.cidade ?? [e.city, e.region].filter(Boolean).join(", ") ?? null,
        detalhe: [
          `${e.tipo === "cotacao" ? "Cotação" : "WhatsApp"} pelo site (${e.fonte})`,
          e.dado && `Peças/dado: ${e.dado}`,
          e.pagina && `Página: ${e.pagina}`,
        ]
          .filter(Boolean)
          .join("\n"),
        campanha: e.utm_campaign ?? null,
        anuncio: null,
        user_id: e.user_id,
        quando: e.created_at,
      };
    }),
  );

  // 3) Cadastros de quem chegou por anúncio do Meta
  const visitas = await prisma.site_visits.findMany({
    where: {
      fonte: { in: ["facebook", "instagram"] },
      meio: "pago",
      user_id: { not: null },
      created_at: { gte: desde },
    },
    select: { user_id: true, utm_campaign: true },
    distinct: ["user_id"],
  });
  const cad = await prisma.users.findMany({
    where: {
      id: { in: visitas.map((v) => v.user_id!).filter(Boolean) },
      created_at: { gte: desde },
    },
    select: {
      id: true,
      nome_completo: true,
      email: true,
      telefone: true,
      cidade: true,
      departamento: true,
      created_at: true,
    },
  });
  const camp = new Map(visitas.map((v) => [v.user_id, v.utm_campaign]));
  novos += await inserir(
    cad.map((u) => ({
      origem: "CADASTRO",
      ref: String(u.id),
      nome: u.nome_completo,
      email: u.email,
      telefone: u.telefone,
      cidade: [u.cidade, u.departamento].filter(Boolean).join(", ") || null,
      detalhe: "Criou conta no site depois de chegar por anúncio",
      campanha: camp.get(u.id) ?? null,
      user_id: u.id,
      quando: u.created_at,
    })),
  );
  return { novos, avisos };
}

// ---------------------------------------------------------------- criar anúncio
export type NovoAnuncio = {
  nome: string;
  objetivo: "TRAFEGO" | "WHATSAPP";
  orcamentoDiario: number;
  inicio?: string | null;
  fim?: string | null;
  idadeMin: number;
  idadeMax: number;
  genero: "TODOS" | "HOMENS" | "MULHERES";
  imagemBase64: string; // JPG/PNG em base64 (sem o prefixo data:)
  texto: string;
  titulo: string;
  descricao?: string;
  link: string;
  botao: string;
  ativar: boolean;
  regioes?: string[]; // departamentos do Uruguai (vazio = o Uruguai inteiro)
};

// Departamentos → regiões da Meta (busca adgeolocation, só do Uruguai). Sem achar: país inteiro.
const cacheRegiao = new Map<string, string | null>();
const normal = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/^departamento de /, "")
    .replace(/ department$/, "")
    .trim();
export async function geoUruguai(regioes?: string[]) {
  const nomes = [...new Set((regioes ?? []).map((r) => String(r).trim()).filter(Boolean))].slice(
    0,
    19,
  );
  const chaves: Array<{ key: string }> = [];
  for (const nome of nomes) {
    let key = cacheRegiao.get(normal(nome));
    if (key === undefined) {
      const j = await chamar("search", {
        type: "adgeolocation",
        location_types: JSON.stringify(["region"]),
        country_code: "UY",
        q: nome,
        limit: "10",
      }).catch(() => ({ data: [] }));
      const achou = (j.data ?? []).find(
        (x: any) =>
          x.type === "region" && x.country_code === "UY" && normal(String(x.name)) === normal(nome),
      );
      key = achou ? String(achou.key) : null;
      cacheRegiao.set(normal(nome), key);
    }
    if (key) chaves.push({ key });
  }
  return chaves.length ? { regions: chaves } : { countries: ["UY"] };
}

// Campanha + conjunto + criativo + anúncio. Público: Uruguai (a loja só anuncia para o Uruguai).
export async function criarAnuncio(a: NovoAnuncio) {
  const c = await cfg();
  const { paginaAtual } = await import("./facebook.server");
  const pg = await paginaAtual();
  if (!a.nome.trim()) throw new Error("Dê um nome ao anúncio.");
  if (!(a.orcamentoDiario > 0)) throw new Error("Coloque o orçamento diário.");
  if (!a.imagemBase64) throw new Error("Envie a imagem do anúncio.");
  if (!a.texto.trim() || !a.titulo.trim()) throw new Error("Escreva o texto e o título.");
  if (a.objetivo === "TRAFEGO" && !/^https:\/\//.test(a.link))
    throw new Error("O link precisa começar com https://");
  const status = a.ativar ? "ACTIVE" : "PAUSED";
  const criados: string[] = [];
  try {
    const img = await chamar(`${c.conta}/adimages`, { bytes: a.imagemBase64 }, "POST");
    const hash = (Object.values(img.images ?? {})[0] as any)?.hash;
    if (!hash) throw new Error("A Meta não aceitou a imagem.");

    const camp = await chamar(
      `${c.conta}/campaigns`,
      {
        name: a.nome,
        objective: a.objetivo === "WHATSAPP" ? "OUTCOME_ENGAGEMENT" : "OUTCOME_TRAFFIC",
        status,
        special_ad_categories: "[]",
        is_adset_budget_sharing_enabled: "false",
      },
      "POST",
    );
    criados.push(camp.id);
    const generos = a.genero === "HOMENS" ? [1] : a.genero === "MULHERES" ? [2] : undefined;
    const geo = await geoUruguai(a.regioes);
    const conj = await chamar(
      `${c.conta}/adsets`,
      {
        name: `${a.nome} · ${geo.regions ? (a.regioes ?? []).join(", ").slice(0, 120) : "Uruguai"}`,
        campaign_id: camp.id,
        daily_budget: String(Math.round(a.orcamentoDiario * 100)),
        billing_event: "IMPRESSIONS",
        bid_strategy: "LOWEST_COST_WITHOUT_CAP",
        optimization_goal: a.objetivo === "WHATSAPP" ? "CONVERSATIONS" : "LANDING_PAGE_VIEWS",
        ...(a.objetivo === "WHATSAPP" && {
          destination_type: "WHATSAPP",
          promoted_object: JSON.stringify({ page_id: pg.id }),
        }),
        targeting: JSON.stringify({
          geo_locations: geo,
          age_min: Math.max(18, a.idadeMin),
          age_max: Math.min(65, a.idadeMax),
          ...(generos && { genders: generos }),
          targeting_automation: { advantage_audience: 0 },
        }),
        ...(a.inicio && { start_time: new Date(a.inicio).toISOString() }),
        ...(a.fim && { end_time: new Date(a.fim).toISOString() }),
        status,
      },
      "POST",
    );
    criados.push(conj.id);
    const destino = a.objetivo === "WHATSAPP" ? "https://api.whatsapp.com/send" : a.link;
    const criativo = await chamar(
      `${c.conta}/adcreatives`,
      {
        name: `${a.nome} · criativo`,
        object_story_spec: JSON.stringify({
          page_id: pg.id,
          ...(pg.ig && { instagram_user_id: pg.ig }),
          link_data: {
            image_hash: hash,
            link: destino,
            message: a.texto,
            name: a.titulo,
            ...(a.descricao && { description: a.descricao }),
            call_to_action: {
              type: a.objetivo === "WHATSAPP" ? "WHATSAPP_MESSAGE" : a.botao,
              value: a.objetivo === "WHATSAPP" ? { app_destination: "WHATSAPP" } : { link: a.link },
            },
          },
        }),
      },
      "POST",
    );
    const ad = await chamar(
      `${c.conta}/ads`,
      {
        name: a.nome,
        adset_id: conj.id,
        creative: JSON.stringify({ creative_id: criativo.id }),
        status,
      },
      "POST",
    );
    limparMemoMeta();
    return { campanha: camp.id, conjunto: conj.id, anuncio: ad.id, ativo: a.ativar };
  } catch (e) {
    // Desfaz o que ficou pela metade (campanha apaga os filhos)
    if (criados[0]) await chamar(criados[0], { status: "DELETED" }, "POST").catch(() => {});
    throw e;
  }
}
