// Admin → Clientes → olho: tudo o que sabemos de um cliente para fazer contato com quem viu
// peças e não pediu orçamento. Junta o cadastro, as visitas (com login e as do mesmo navegador
// antes do login), as peças vistas, buscas, cliques no WhatsApp, carrinhos, vendas, links de
// pagamento, catálogos baixados e avaliações. Sem robôs (mesmo filtro das estatísticas).
import { prisma } from "./prisma";

const DIA = 86_400_000;
const SKU_DA_PAGINA = /^(?:\/pt)?\/produto\/([^/?#]+)/;

export async function fichaCliente(id: number) {
  const u = await prisma.users.findUnique({
    where: { id },
    include: {
      downloads: { orderBy: { created_at: "desc" }, take: 30, include: { catalogo: true } },
    },
  });
  if (!u) throw new Error("Cliente não encontrado.");
  const { whereHumano } = await import("./rastreio.server");

  // Navegadores (visitor_id) do cliente: das visitas e eventos com login e dos carrinhos
  const [vv, ve, carrinhos] = await Promise.all([
    prisma.site_visits.findMany({
      where: { user_id: id, visitor_id: { not: null } },
      distinct: ["visitor_id"],
      select: { visitor_id: true },
      take: 20,
    }),
    prisma.site_eventos.findMany({
      where: { user_id: id, visitor_id: { not: null } },
      distinct: ["visitor_id"],
      select: { visitor_id: true },
      take: 20,
    }),
    prisma.carrinhos.findMany({
      where: { user_id: id },
      orderBy: { updated_at: "desc" },
      take: 20,
    }),
  ]);
  const vids = [
    ...new Set(
      [
        ...vv.map((x) => x.visitor_id),
        ...ve.map((x) => x.visitor_id),
        ...carrinhos.map((c) => c.visitante_id),
      ].filter((x): x is string => !!x),
    ),
  ];
  const quem = vids.length
    ? { OR: [{ user_id: id }, { visitor_id: { in: vids } }] }
    : { user_id: id };
  const [visitas, eventos] = await Promise.all([
    prisma.site_visits.findMany({
      where: { AND: [quem, whereHumano as any] },
      orderBy: { id: "desc" },
      take: 3000,
      select: {
        created_at: true,
        path: true,
        city: true,
        region: true,
        country_code: true,
        device: true,
        fonte: true,
        utm_campaign: true,
        session_id: true,
      },
    }),
    prisma.site_eventos.findMany({
      where: quem,
      orderBy: { id: "desc" },
      take: 1000,
      select: { created_at: true, tipo: true, dado: true, pagina: true },
    }),
  ]);

  // Peças vistas (páginas /produto/<sku>), com quantas vezes e quando por último
  const vistas = new Map<string, { vezes: number; ultima: Date; primeira: Date }>();
  for (const v of visitas) {
    const m = SKU_DA_PAGINA.exec(v.path);
    if (!m) continue;
    const sku = decodeURIComponent(m[1]).trim();
    const x = vistas.get(sku) ?? { vezes: 0, ultima: v.created_at, primeira: v.created_at };
    x.vezes++;
    if (v.created_at > x.ultima) x.ultima = v.created_at;
    if (v.created_at < x.primeira) x.primeira = v.created_at;
    vistas.set(sku, x);
  }
  // O que ele pediu: WhatsApp da peça, carrinho, carrinho enviado, venda ou link de pagamento
  const pediu = new Set<string>();
  const norm = (s: string) => s.trim().toUpperCase();
  for (const e of eventos)
    if (e.tipo === "whatsapp" || e.tipo === "carrinho" || e.tipo === "cotacao") {
      const m = SKU_DA_PAGINA.exec(e.pagina ?? "");
      pediu.add(norm(e.dado));
      if (m) pediu.add(norm(decodeURIComponent(m[1])));
    }
  for (const c of carrinhos) {
    try {
      for (const i of JSON.parse(c.itens || "[]")) pediu.add(norm(String(i.sku ?? i.codigo ?? "")));
    } catch {
      /* carrinho antigo */
    }
  }
  const vendas = await prisma.vendas.findMany({
    where: { OR: [{ user_id: id }, { cliente_email: u.email.toLowerCase() }] },
    orderBy: { id: "desc" },
    take: 30,
  });
  const links = await prisma.links_pagamento.findMany({
    where: { OR: [{ user_id: id }, { email_cliente: u.email.toLowerCase() }] },
    orderBy: { id: "desc" },
    take: 30,
  });
  for (const v of vendas)
    for (const i of JSON.parse(v.itens || "[]")) pediu.add(norm(String(i.sku ?? i.codigo ?? "")));
  for (const l of links)
    for (const i of JSON.parse(l.itens || "[]")) pediu.add(norm(String(i.sku ?? i.codigo ?? "")));

  const skus = [...vistas.keys()];
  const pecas = skus.length
    ? await prisma.agricolas.findMany({
        where: { sku: { in: skus } },
        select: {
          sku: true,
          nome: true,
          nome_es: true,
          codigo_fabricante: true,
          imagem_principal: true,
          preco_brl: true,
          marca: true,
        },
      })
    : [];
  const { configPrecos } = await import("./precos.server");
  const { precoVenda } = await import("./precos");
  const { nomeProduto } = await import("./pecas-es");
  const cfg = await configPrecos();
  const pecasVistas = skus
    .map((sku) => {
      const p = pecas.find((x) => x.sku.trim() === sku);
      const x = vistas.get(sku)!;
      const pr = p ? precoVenda(p as any, cfg) : null;
      return {
        sku,
        codigo: (p?.codigo_fabricante || sku).trim(),
        nome: p ? nomeProduto(p as any) : sku,
        nomePt: p?.nome?.trim() ?? sku,
        marca: p?.marca ?? null,
        foto: p?.imagem_principal ?? null,
        uyu: pr?.uyu ?? null,
        brl: pr?.brl ?? null,
        vezes: x.vezes,
        ultima: x.ultima.toISOString(),
        pediu: pediu.has(norm(sku)) || pediu.has(norm(p?.codigo_fabricante ?? "")),
      };
    })
    .sort((a, b) => Number(a.pediu) - Number(b.pediu) || b.ultima.localeCompare(a.ultima));

  // Resumo da navegação
  const sessoes = new Set(visitas.map((v) => v.session_id).filter(Boolean));
  const dias = new Set(visitas.map((v) => v.created_at.toISOString().slice(0, 10)));
  const conta = (f: (v: (typeof visitas)[number]) => string | null | undefined) => {
    const m = new Map<string, number>();
    for (const v of visitas) {
      const k = f(v);
      if (k) m.set(k, (m.get(k) ?? 0) + 1);
    }
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([nome, n]) => ({ nome, n }));
  };
  const buscas = eventos
    .filter((e) => e.tipo === "busca")
    .slice(0, 30)
    .map((e) => ({ termo: e.dado, quando: e.created_at.toISOString() }));
  const whatsapp = eventos.filter((e) => e.tipo === "whatsapp").length;
  const ultimaVisita = visitas[0]?.created_at ?? null;

  // Linha do tempo (o mais recente primeiro)
  type Item = { quando: string; tipo: string; texto: string };
  const tempo: Item[] = [];
  for (const v of visitas.slice(0, 80))
    tempo.push({ quando: v.created_at.toISOString(), tipo: "visita", texto: v.path });
  for (const e of eventos.slice(0, 80))
    tempo.push({ quando: e.created_at.toISOString(), tipo: e.tipo, texto: e.dado });
  for (const c of carrinhos)
    tempo.push({
      quando: (c.enviado_em ?? c.updated_at).toISOString(),
      tipo: "carrinho",
      texto: `${c.qtd_itens} peça(s) · ${c.status === "ENVIADO" ? "enviado pelo WhatsApp" : "não enviado"}`,
    });
  for (const v of vendas)
    tempo.push({
      quando: v.created_at.toISOString(),
      tipo: "venda",
      texto: `Venda ${v.codigo} · ${v.status}`,
    });
  for (const l of links)
    tempo.push({
      quando: l.created_at.toISOString(),
      tipo: "link",
      texto: `Link de pagamento #${l.id} · ${l.status}`,
    });
  tempo.sort((a, b) => b.quando.localeCompare(a.quando));

  const semAtividade = ultimaVisita
    ? Math.floor((Date.now() - ultimaVisita.getTime()) / DIA)
    : null;
  return {
    perfil: {
      id: u.id,
      nome: u.nome_completo,
      email: u.email,
      telefone: u.telefone,
      endereco: [u.endereco, u.numero_casa].filter(Boolean).join(" ") || null,
      cidade: u.cidade,
      departamento: u.departamento,
      cep: u.cep,
      pais: u.pais,
      google: !!u.google_id,
      recebeEmails: u.recebe_emails,
      criado: u.created_at.toISOString(),
      ultimoLogin: u.ultimo_login?.toISOString() ?? null,
    },
    navegacao: {
      visitas: visitas.length,
      sessoes: sessoes.size,
      dias: dias.size,
      ultimaVisita: ultimaVisita?.toISOString() ?? null,
      diasSemVisita: semAtividade,
      whatsapp,
      cidades: conta((v) => [v.city, v.region].filter(Boolean).join(", ") || null),
      aparelhos: conta((v) => v.device),
      origens: conta((v) => v.fonte),
      campanhas: conta((v) => v.utm_campaign),
      navegadores: vids.length,
    },
    pecasVistas,
    naoPediu: pecasVistas.filter((p) => !p.pediu).length,
    buscas,
    carrinhos: carrinhos.map((c) => {
      let itens: Array<{ nome: string; codigo: string; qtd: number }> = [];
      try {
        itens = JSON.parse(c.itens || "[]").map((i: any) => ({
          nome: i.nameEs || i.name || i.nome || i.sku,
          codigo: i.codigo || i.sku,
          qtd: i.quantity ?? i.qtd ?? 1,
        }));
      } catch {
        /* carrinho antigo */
      }
      return {
        id: c.id,
        status: c.status,
        etapa: c.etapa,
        quando: c.updated_at.toISOString(),
        itens,
      };
    }),
    vendas: vendas.map((v) => ({
      codigo: v.codigo,
      total: v.total + v.frete_cobrado - v.desconto,
      moeda: v.moeda,
      status: v.status,
      etapa: v.etapa,
      quando: v.created_at.toISOString(),
    })),
    links: links.map((l) => ({
      id: l.id,
      codigo: l.codigo,
      total: l.total / 100,
      moeda: l.moeda,
      status: l.status,
      quando: l.created_at.toISOString(),
    })),
    catalogos: u.downloads.map((d: any) => ({
      titulo: d.catalogo?.titulo ?? "Catálogo",
      quando: d.created_at.toISOString(),
    })),
    tempo: tempo.slice(0, 120),
  };
}
