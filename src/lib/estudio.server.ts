// Estúdio de publicações e anúncios (Admin → Instagram e Facebook → Estúdio).
// Cruza o que acontece no site (visitas às páginas das peças, WhatsApp, carrinho, buscas) com o
// preço do dia e os números do Meta Ads para dizer O QUE anunciar, ONDE, QUANDO e por QUANTO,
// e já entrega legendas prontas. Sem IA externa: regras explicadas na tela.
//
// Fotos: só as da agrotrator.com.br (loja própria) e as enviadas pelo admin (uploads/produtos).
// As de outras lojas (redeparts) e as de /catalogo (origem não confirmada) ficam de fora.

const DIA = 86_400_000;

export const fotoPropria = (u: string | null | undefined) =>
  !!u &&
  (/^https:\/\/[\w.-]*agrotrator[\w.-]*\//i.test(u) ||
    /^(uploads\/)?produtos\//.test(u.replace(/^\//, "")));

const normal = (s: string) =>
  s
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");

type Interesse = {
  sku: string;
  views: number;
  visitantes: Set<string>;
  viewsRecentes: number; // últimos 7 dias
  viewsAnteriores: number; // 7 dias antes
  whatsapp: number;
  carrinho: number;
  buscas: number;
  regioes: Map<string, number>;
  cidades: Map<string, number>;
  paises: Map<string, number>;
};

// Peso de cada sinal (o WhatsApp vale mais: é gente pedindo preço)
export const PESOS = { view: 1, visitante: 2, whatsapp: 12, carrinho: 6, busca: 3 };

async function coletar(dias: number) {
  const { prisma } = await import("./prisma");
  const { whereHumano } = await import("./rastreio.server");
  const desde = new Date(Date.now() - dias * DIA);
  const meio = new Date(Date.now() - 7 * DIA);
  const ini2 = new Date(Date.now() - 14 * DIA);
  const [visitas, eventos] = await Promise.all([
    prisma.site_visits.findMany({
      where: {
        created_at: { gte: desde < ini2 ? desde : ini2 },
        OR: [{ path: { startsWith: "/produto/" } }, { path: { startsWith: "/pt/produto/" } }],
        ...(whereHumano as any),
      },
      select: {
        path: true,
        visitor_id: true,
        region: true,
        city: true,
        country_code: true,
        created_at: true,
      },
      take: 200_000,
    }),
    prisma.site_eventos.findMany({
      where: {
        created_at: { gte: desde },
        tipo: { in: ["whatsapp", "carrinho", "busca", "cotacao"] },
      },
      select: { tipo: true, dado: true },
      take: 100_000,
    }),
  ]);
  const mapa = new Map<string, Interesse>();
  const pega = (sku: string) => {
    let x = mapa.get(sku);
    if (!x) {
      x = {
        sku,
        views: 0,
        visitantes: new Set(),
        viewsRecentes: 0,
        viewsAnteriores: 0,
        whatsapp: 0,
        carrinho: 0,
        buscas: 0,
        regioes: new Map(),
        cidades: new Map(),
        paises: new Map(),
      };
      mapa.set(sku, x);
    }
    return x;
  };
  const inc = (m: Map<string, number>, k: string | null) => k && m.set(k, (m.get(k) ?? 0) + 1);
  for (const v of visitas) {
    const sku = decodeURIComponent(
      v.path.replace(/^\/(pt\/)?produto\//, "").split(/[?#/]/)[0] ?? "",
    );
    if (!sku) continue;
    const x = pega(sku);
    if (v.created_at >= meio) x.viewsRecentes++;
    else if (v.created_at >= ini2) x.viewsAnteriores++;
    if (v.created_at < desde) continue;
    x.views++;
    if (v.visitor_id) x.visitantes.add(v.visitor_id);
    inc(x.regioes, v.region);
    inc(x.cidades, v.city);
    inc(x.paises, v.country_code);
  }
  // WhatsApp/cotação/carrinho guardam códigos; buscas guardam "resultados|termo"
  const porCodigo = new Map<string, number>();
  const carrinhos = new Map<string, number>();
  const buscas = new Map<string, number>();
  for (const e of eventos) {
    if (e.tipo === "busca") {
      const termo = normal(e.dado.slice(e.dado.indexOf("|") + 1));
      if (termo.length >= 4) buscas.set(termo, (buscas.get(termo) ?? 0) + 1);
      continue;
    }
    const alvo = e.tipo === "carrinho" ? carrinhos : porCodigo;
    for (const c of e.dado.split(/[\s,;|]+/)) {
      const k = normal(c);
      if (k.length >= 3) alvo.set(k, (alvo.get(k) ?? 0) + 1);
    }
  }
  return { mapa, porCodigo, carrinhos, buscas };
}

export type Recomendacao = Awaited<ReturnType<typeof recomendacoes>>["produtos"][number];

export async function recomendacoes(dias = 30, limite = 24) {
  const { prisma } = await import("./prisma");
  const { configPrecos } = await import("./precos.server");
  const { precoVenda, fmtUYU } = await import("./precos");
  const { nomeProduto } = await import("./pecas-es");
  const { mapa, porCodigo, carrinhos, buscas } = await coletar(dias);

  // Peças citadas no WhatsApp/carrinho/busca que não tiveram visita também entram
  const extras = [...new Set([...porCodigo.keys(), ...carrinhos.keys(), ...buscas.keys()])].slice(
    0,
    400,
  );
  const rows = await prisma.agricolas.findMany({
    where: {
      duplicado_de: null,
      OR: [
        { sku: { in: [...mapa.keys()] } },
        ...(extras.length ? [{ sku: { in: extras } }, { codigo_fabricante: { in: extras } }] : []),
      ],
    },
    select: {
      sku: true,
      nome: true,
      nome_es: true,
      marca: true,
      categoria: true,
      codigo_fabricante: true,
      imagem_principal: true,
      preco_brl: true,
      valor_promocional: true,
      preco_modo: true,
      preco_uyu: true,
      estoque: true,
      images: { select: { image_path: true }, orderBy: { sort_order: "asc" }, take: 6 } as any,
    } as any,
  });
  const cfg = await configPrecos();
  const lista = rows.map((r: any) => {
    const sku = String(r.sku).trim();
    const x = mapa.get(sku) ?? mapa.get(sku.toUpperCase());
    const chaves = [normal(sku), normal(r.codigo_fabricante ?? "")].filter(Boolean);
    const whatsapp = chaves.reduce((s, k) => s + (porCodigo.get(k) ?? 0), 0);
    const carrinho = chaves.reduce((s, k) => s + (carrinhos.get(k) ?? 0), 0);
    const busca = chaves.reduce((s, k) => s + (buscas.get(k) ?? 0), 0);
    const views = x?.views ?? 0;
    const visitantes = x?.visitantes.size ?? 0;
    const pontos =
      views * PESOS.view +
      visitantes * PESOS.visitante +
      whatsapp * PESOS.whatsapp +
      carrinho * PESOS.carrinho +
      busca * PESOS.busca;
    const tendencia =
      x && x.viewsAnteriores > 0
        ? Math.round(((x.viewsRecentes - x.viewsAnteriores) / x.viewsAnteriores) * 100)
        : x?.viewsRecentes
          ? 100
          : 0;
    const pr = precoVenda(r, cfg);
    const fotos = [
      r.imagem_principal,
      ...((r.images ?? []) as any[]).map((i) => i.image_path),
    ].filter(fotoPropria);
    const top = (m: Map<string, number> | undefined, n: number) =>
      [...(m ?? new Map())]
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
        .map(([k, v]) => ({ nome: k, v }));
    return {
      sku,
      codigo: String(r.codigo_fabricante || sku).trim(),
      nome: nomeProduto(r),
      nomePt: String(r.nome ?? "").trim(),
      marca: r.marca ?? null,
      categoria: r.categoria ?? null,
      estoque: r.estoque ?? 0,
      fotos: [...new Set(fotos)] as string[],
      preco: pr?.uyu
        ? {
            uyu: fmtUYU(pr.uyu),
            brl: pr.brl
              ? `R$ ${pr.brl.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : null,
            deUyu: pr.deUyu ? fmtUYU(pr.deUyu) : null,
            desconto: pr.desconto ?? 0,
            valorUyu: pr.uyu,
          }
        : null,
      sinais: { views, visitantes, whatsapp, carrinho, busca, tendencia },
      pontos,
      regioes: top(x?.regioes, 5),
      cidades: top(x?.cidades, 5),
      paises: top(x?.paises, 3),
    };
  });
  const ordenada = lista.filter((p) => p.pontos > 0).sort((a, b) => b.pontos - a.pontos);
  return { produtos: ordenada.slice(0, limite).map((p) => ({ ...p, ideias: ideias(p) })), dias };
}

// Ideias de anúncio para cada peça, explicando o porquê (regras simples e visíveis)
function ideias(p: {
  sinais: {
    views: number;
    whatsapp: number;
    carrinho: number;
    busca: number;
    tendencia: number;
    visitantes: number;
  };
  preco: { desconto: number } | null;
  fotos: string[];
}) {
  const s = p.sinais;
  const out: Array<{
    tipo: string;
    titulo: string;
    porque: string;
    formato: string;
    objetivo: "TRAFEGO" | "WHATSAPP" | "ORGANICO";
  }> = [];
  if (s.whatsapp >= 2)
    out.push({
      tipo: "conversas",
      titulo: "Anúncio de conversas no WhatsApp",
      porque: `${s.whatsapp} pessoas já pediram essa peça no WhatsApp: o anúncio leva mais gente direto para a conversa.`,
      formato: "Post 4:5 com o preço",
      objetivo: "WHATSAPP",
    });
  if (s.views >= 5 && s.whatsapp === 0)
    out.push({
      tipo: "remarketing",
      titulo: "Oferta com preço para quem olhou",
      porque: `${s.views} visitas e nenhum pedido: mostre o preço e o desconto para convencer quem já se interessou.`,
      formato: "Story 9:16 com o preço",
      objetivo: "TRAFEGO",
    });
  if (s.carrinho >= 1)
    out.push({
      tipo: "carrinho",
      titulo: "Lembrete «está na sua lista»",
      porque: `${s.carrinho} pessoa(s) puseram no carrinho e não fecharam: anúncio de tráfego para a página da peça.`,
      formato: "Post 1:1",
      objetivo: "TRAFEGO",
    });
  if (s.tendencia >= 30 && s.views >= 3)
    out.push({
      tipo: "alta",
      titulo: "Em alta: publique já e impulsione",
      porque: `As visitas subiram ${s.tendencia}% na última semana.`,
      formato: "Carrossel com peças parecidas",
      objetivo: "ORGANICO",
    });
  if (s.busca >= 2)
    out.push({
      tipo: "busca",
      titulo: "Muito buscada no site",
      porque: `Procurada ${s.busca} vezes pelo código: anúncio com o código bem grande.`,
      formato: "Post 4:5 com o código",
      objetivo: "TRAFEGO",
    });
  if (p.preco?.desconto)
    out.push({
      tipo: "desconto",
      titulo: `Destaque o -${p.preco.desconto}%`,
      porque: "A peça está com desconto no site agora.",
      formato: "Card amarelo pré-Black",
      objetivo: "TRAFEGO",
    });
  if (!out.length)
    out.push({
      tipo: "organico",
      titulo: "Post orgânico para testar o interesse",
      porque: "Ainda há pouco movimento: teste no feed antes de pagar anúncio.",
      formato: "Post 4:5",
      objetivo: "ORGANICO",
    });
  if (!p.fotos.length)
    out.forEach((i) => (i.porque += " Atenção: sem foto própria, a arte usa o código da peça."));
  return out;
}

// Quando publicar: horas e dias com mais visitas reais no site (horário do Uruguai)
export async function melhoresHorarios(dias = 30) {
  const { prisma } = await import("./prisma");
  const rows: any[] = await prisma.$queryRawUnsafe(
    `SELECT HOUR(CONVERT_TZ(created_at, '+00:00', '-03:00')) h, DAYOFWEEK(CONVERT_TZ(created_at, '+00:00', '-03:00')) d, COUNT(*) n
     FROM site_visits WHERE created_at >= ? AND entrada = 1 GROUP BY h, d`,
    new Date(Date.now() - dias * DIA),
  );
  const horas = Array(24).fill(0);
  const semana = Array(7).fill(0);
  for (const r of rows) {
    if (r.h == null) continue;
    horas[Number(r.h)] += Number(r.n);
    semana[(Number(r.d) + 6) % 7] += Number(r.n); // 0 = domingo
  }
  const topHoras = horas
    .map((v, h) => ({ h, v }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, 3)
    .map((x) => x.h)
    .sort((a, b) => a - b);
  const dias_ = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const topDias = semana
    .map((v, d) => ({ d, v }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v)
    .slice(0, 2)
    .map((x) => dias_[x.d]);
  return { horas, semana, topHoras, topDias };
}

// Orçamento sugerido: usa o custo por clique real da conta (últimos 30 dias); sem dados, um piso
export async function sugestaoOrcamento() {
  try {
    const { metaConfigurado } = await import("./ads-meta.server");
    if (!(await metaConfigurado()))
      return { cpc: null, moeda: null, diario: null, base: "sem conta de anúncios" };
    const m = await import("./meta-ads.server");
    const [g, conta] = await Promise.all([m.visaoGeral(30), m.contaCompleta()]);
    const cpc = g.total.cliquesLink > 0 ? g.total.gasto / g.total.cliquesLink : null;
    const diario = cpc ? Math.max(1, Math.ceil((cpc * 25) / 10) * 10) : null; // ~25 cliques por dia
    return {
      cpc,
      moeda: conta.moeda,
      diario,
      base: cpc
        ? "custo por clique real dos últimos 30 dias × 25 cliques/dia"
        : "a conta ainda não tem cliques",
    };
  } catch (e: any) {
    return { cpc: null, moeda: null, diario: null, base: String(e?.message ?? e) };
  }
}

// Busca de peças para o estúdio (com foto própria e preço do dia)
export async function buscarPecas(q: string) {
  const { prisma } = await import("./prisma");
  const { configPrecos } = await import("./precos.server");
  const { precoVenda, fmtUYU } = await import("./precos");
  const { nomeProduto } = await import("./pecas-es");
  const termo = q.trim().slice(0, 80);
  const rows = await prisma.agricolas.findMany({
    where: {
      duplicado_de: null,
      ...(termo
        ? {
            OR: [
              { sku: { contains: termo } },
              { nome: { contains: termo } },
              { nome_es: { contains: termo } },
              { codigo_fabricante: { contains: termo } },
            ],
          }
        : { imagem_principal: { contains: "agrotrator" }, preco_brl: { gt: 0 } }),
    },
    orderBy: [{ estoque: "desc" }],
    take: 30,
  });
  const cfg = await configPrecos();
  return rows.map((r) => {
    const pr = precoVenda(r as any, cfg);
    return {
      sku: r.sku.trim(),
      codigo: (r.codigo_fabricante || r.sku).trim(),
      nome: nomeProduto(r as any),
      nomePt: r.nome.trim(),
      marca: r.marca,
      foto: fotoPropria(r.imagem_principal) ? r.imagem_principal : null,
      preco: pr?.uyu
        ? {
            uyu: fmtUYU(pr.uyu),
            brl: pr.brl
              ? `R$ ${pr.brl.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : null,
            deUyu: pr.deUyu ? fmtUYU(pr.deUyu) : null,
            desconto: pr.desconto ?? 0,
          }
        : null,
    };
  });
}

// Legendas prontas (variações em espanhol e português), sem promessas sem prova
export function legendas(p: {
  nome: string;
  nomePt: string;
  codigo: string;
  marca: string | null;
  sku: string;
  preco: { uyu: string; brl: string | null; desconto: number } | null;
}) {
  const m = p.marca ? ` para ${p.marca}` : "";
  const d = p.preco?.desconto ? ` con -${p.preco.desconto}%` : "";
  const dPt = p.preco?.desconto ? ` com -${p.preco.desconto}%` : "";
  const es = [
    `🔧 ${p.nome}${m}${d}\n\nCódigo: ${p.codigo}${p.preco ? `\n💰 ${p.preco.uyu}` : ""}\n👉 agropartsuy.com/produto/${encodeURIComponent(p.sku)}\n\n🚚 Envíos por DAC a todo Uruguay · 💬 Cotizá por WhatsApp`,
    `¿Buscás ${p.nome.toLowerCase()}${m}? 🚜\n\nLa tenemos${d}. Pedila con el código ${p.codigo} y te la mandamos por DAC a todo Uruguay.\n\n💬 Link en la bio`,
    `Que no se te pare el tractor en plena zafra 🌾\n\n${p.nome}${m} · Cód. ${p.codigo}${p.preco ? ` · ${p.preco.uyu}` : ""}\nCotizá por WhatsApp, respondemos rápido.`,
  ];
  const pt = [
    `🔧 ${p.nomePt}${m}${dPt}\n\nCódigo: ${p.codigo}${p.preco?.brl ? `\n💰 ${p.preco.brl}` : ""}\n👉 agropartsuy.com/pt/produto/${encodeURIComponent(p.sku)}\n\n🚚 Envio para todo o RS · 💬 Peça pelo WhatsApp`,
    `Procurando ${p.nomePt.toLowerCase()}${m}? 🚜\n\nTemos${dPt}. Peça pelo código ${p.codigo} e enviamos para todo o RS.\n\n💬 Link na bio`,
  ];
  return { es, pt };
}

// ---------------------------------------------------------------- banco de posts
// Toda peça com foto própria e preço vira um post pronto (arte gerada no navegador + legenda).
export type FiltroBanco = {
  pagina: number;
  marca?: string;
  categoria?: string;
  q?: string;
  ordem?: "estoque" | "menor" | "maior" | "novas" | "mistura";
  soNovas?: boolean; // só peças que ainda não foram postadas
  comDesconto?: boolean;
};
const ONDE_BANCO = {
  duplicado_de: null,
  imagem_principal: { startsWith: "https://agrotrator" },
  preco_brl: { gt: 0 },
};

// SKUs que já aparecem em alguma publicação (pelo link da peça na legenda)
export async function skusPostados() {
  const { prisma } = await import("./prisma");
  const rows = await prisma.instagram_posts
    .findMany({ select: { legenda: true }, where: { legenda: { contains: "/produto/" } } })
    .catch(() => [] as Array<{ legenda: string | null }>);
  const s = new Set<string>();
  for (const r of rows)
    for (const m of (r.legenda ?? "").matchAll(/\/produto\/([^\s/?#]+)/g))
      s.add(decodeURIComponent(m[1]).toUpperCase());
  return s;
}

export async function bancoPosts(f: FiltroBanco, tamanho = 48) {
  const { prisma } = await import("./prisma");
  const { configPrecos } = await import("./precos.server");
  const { precoVenda, fmtUYU } = await import("./precos");
  const { nomeProduto } = await import("./pecas-es");
  const postados = await skusPostados();
  const termo = (f.q ?? "").trim().slice(0, 80);
  const where: any = {
    ...ONDE_BANCO,
    ...(f.marca && { marca: f.marca === "—" ? null : f.marca }),
    ...(f.categoria && { categoria: f.categoria }),
    ...(termo && {
      OR: [
        { sku: { contains: termo } },
        { nome: { contains: termo } },
        { codigo_fabricante: { contains: termo } },
      ],
    }),
    ...(f.soNovas && postados.size && { NOT: { sku: { in: [...postados] } } }),
    ...(f.comDesconto && { valor_promocional: { gt: 0 } }),
  };
  const orderBy: any =
    f.ordem === "menor"
      ? [{ preco_brl: "asc" }]
      : f.ordem === "maior"
        ? [{ preco_brl: "desc" }]
        : f.ordem === "novas"
          ? [{ created_at: "desc" }]
          : f.ordem === "mistura"
            ? [{ codigo_fabricante: "asc" }]
            : [{ estoque: "desc" }, { sku: "asc" }];
  const pagina = Math.max(0, Math.floor(f.pagina || 0));
  const [total, rows, cfg] = await Promise.all([
    prisma.agricolas.count({ where }),
    prisma.agricolas.findMany({ where, orderBy, skip: pagina * tamanho, take: tamanho }),
    configPrecos(),
  ]);
  return {
    total,
    pagina,
    tamanho,
    postados: postados.size,
    itens: rows.map((r) => {
      const pr = precoVenda(r as any, cfg);
      const sku = r.sku.trim();
      return {
        sku,
        codigo: (r.codigo_fabricante || r.sku).trim(),
        nome: nomeProduto(r as any),
        nomePt: r.nome.trim(),
        marca: r.marca,
        categoria: r.categoria,
        foto: r.imagem_principal,
        postado: postados.has(sku.toUpperCase()),
        preco: pr?.uyu
          ? {
              uyu: fmtUYU(pr.uyu),
              brl: pr.brl
                ? `R$ ${pr.brl.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                : null,
              deUyu: pr.deUyu ? fmtUYU(pr.deUyu) : null,
              desconto: pr.desconto ?? 0,
              valorBrl: pr.brl ?? null,
            }
          : null,
      };
    }),
  };
}

// Marcas e categorias do banco, com quantidade (para os filtros)
export async function filtrosBanco() {
  const { prisma } = await import("./prisma");
  const [marcas, categorias, total] = await Promise.all([
    prisma.agricolas.groupBy({ by: ["marca"], where: ONDE_BANCO as any, _count: true }),
    prisma.agricolas.groupBy({ by: ["categoria"], where: ONDE_BANCO as any, _count: true }),
    prisma.agricolas.count({ where: ONDE_BANCO as any }),
  ]);
  const fmt = (l: any[], k: string) =>
    l
      .map((x) => ({ nome: (x[k] as string | null) ?? "—", n: x._count as number }))
      .sort((a, b) => b.n - a.n);
  return { total, marcas: fmt(marcas, "marca"), categorias: fmt(categorias, "categoria") };
}

// Cupons ativos ou futuros (para a arte de cupom)
export async function cuponsParaArte() {
  const { prisma } = await import("./prisma");
  const agora = new Date();
  const rows = await prisma.cupons
    .findMany({
      where: { OR: [{ fim: null }, { fim: { gte: agora } }] },
      orderBy: { id: "desc" },
      take: 30,
    })
    .catch(() => []);
  return rows.map((c) => ({
    codigo: c.codigo,
    tipo: c.tipo,
    valor: c.valor,
    moeda: c.moeda,
    minimo: c.minimo,
    descricao: c.descricao,
    descricaoPt: c.descricao_pt,
    fim: c.fim?.toISOString() ?? null,
  }));
}
