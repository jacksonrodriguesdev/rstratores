// Jornada dos visitantes: cada sessão (visita) com origem, local, aparelho, tempo e o que a
// pessoa fez (páginas, buscas, carrinho, WhatsApp, pop-up de cadastro), e a linha do tempo de
// cada uma. Também o funil de cadastro. Páginas em site_visits, eventos em site_eventos.
// Sessões dos dias fechados vêm prontas de analise_sessao (gravadas com o resumo diário,
// src/lib/resumo-diario.server.ts); só o dia de hoje é montado na hora.
import { prisma } from "./prisma";

const EV = "/_evento/";
const FUSO = -3 * 3600_000; // Uruguai

export type Acoes = {
  buscas: number;
  buscasVazias: number;
  produtos: number;
  carrinho: number;
  whatsapp: number;
  popupVisto: boolean;
  popupFechou: boolean;
  popupCodigo: boolean;
  cadastro: boolean;
  login: boolean;
  catalogos: number;
};
export type Sessao = {
  id: string;
  visitante: string;
  inicio: string;
  fim: string;
  duracao: number;
  paginas: number;
  entrada: string;
  saida: string;
  fonte: string | null;
  meio: string | null;
  campanha: string | null;
  origemSite: string | null;
  cidade: string | null;
  regiao: string | null;
  pais: string | null;
  aparelho: string | null;
  sistema: string | null;
  navegador: string | null;
  visitaN: number;
  usuario: { id: number; nome: string; email: string } | null;
  acoes: Acoes;
};
// Sessão como fica guardada (analise_sessao): sem número da visita e sem o nome do cliente,
// com o que a tela Visitantes usa (nome do país, coordenadas, páginas vistas)
export type SessaoBase = Omit<Sessao, "visitaN" | "usuario"> & {
  userId: number | null;
  paisNome: string | null;
  lat: number | null;
  lon: number | null;
  caminhos: Record<string, number>;
};
export type Passo = {
  t: number;
  quando: string;
  tipo: "pagina" | "evento";
  icone: string;
  texto: string;
  detalhe?: string;
  destaque?: "bom" | "ruim";
};

export type Linha = {
  id: number;
  created_at: Date;
  path: string;
  visitor_id: string | null;
  session_id: string | null;
  ip_hash: string | null;
  fonte: string | null;
  meio: string | null;
  utm_campaign: string | null;
  referrer_host: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  country_code: string | null;
  latitude: number | null;
  longitude: number | null;
  device: string | null;
  os: string | null;
  browser: string | null;
  user_id: number | null;
};
export const SELECT_LINHA = {
  id: true,
  created_at: true,
  visitor_id: true,
  session_id: true,
  ip_hash: true,
  fonte: true,
  meio: true,
  utm_campaign: true,
  referrer_host: true,
  city: true,
  region: true,
  country: true,
  country_code: true,
  latitude: true,
  longitude: true,
  device: true,
  os: true,
  browser: true,
  user_id: true,
} as const;

const visitanteDe = (l: Linha) => l.visitor_id || l.ip_hash || `v${l.id}`;
const sessaoDe = (l: Linha) =>
  l.session_id ||
  `${visitanteDe(l)}|${new Date(l.created_at.getTime() + FUSO).toISOString().slice(0, 10)}`;
const evento = (path: string) => {
  if (!path.startsWith(EV)) return null;
  const [tipo, ...resto] = path.slice(EV.length).split("/");
  let dado = resto.join("/");
  try {
    dado = decodeURIComponent(dado);
  } catch {
    /* "%" solto: fica como veio */
  }
  return { tipo, dado };
};

async function lerLinhas(filtro: any): Promise<Linha[]> {
  // Páginas (site_visits) + eventos (site_eventos), na ordem do tempo. Cliques e rolagem
  // (mapa de cliques, Admin → Análises) não entram na linha do tempo.
  const { eventosProntos, caminhoDoEvento } = await import("./eventos-db.server");
  await eventosProntos();
  const { whereHumano } = await import("./rastreio.server");
  const where = { ...filtro, NOT: { path: { startsWith: EV } }, ...whereHumano };
  const [paginas, eventos] = await Promise.all([
    prisma.site_visits.findMany({
      where,
      orderBy: { created_at: "asc" },
      take: 150000,
      select: { ...SELECT_LINHA, path: true },
    }) as Promise<Linha[]>,
    prisma.site_eventos.findMany({
      where: { ...filtro, tipo: { notIn: ["clique", "rolagem"] } },
      orderBy: { created_at: "asc" },
      take: 50000,
      select: { ...SELECT_LINHA, tipo: true, dado: true },
    }),
  ]);
  const comoLinha = eventos.map(
    ({ tipo, dado, id, ...e }) =>
      ({ ...e, id: -id, path: caminhoDoEvento({ tipo, dado }) }) as Linha,
  );
  return [...paginas, ...comoLinha].sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
}

const vazio = (): Acoes => ({
  buscas: 0,
  buscasVazias: 0,
  produtos: 0,
  carrinho: 0,
  whatsapp: 0,
  popupVisto: false,
  popupFechou: false,
  popupCodigo: false,
  cadastro: false,
  login: false,
  catalogos: 0,
});

function montarSessoes(linhas: Linha[]) {
  const mapa = new Map<string, { linhas: Linha[] }>();
  for (const l of linhas) {
    const k = sessaoDe(l);
    const s = mapa.get(k) ?? { linhas: [] };
    s.linhas.push(l);
    mapa.set(k, s);
  }
  return mapa;
}

function resumir(id: string, ls: Linha[]): SessaoBase {
  const a = vazio();
  let paginas = 0;
  let entrada = "",
    saida = "";
  const caminhos: Record<string, number> = {};
  for (const l of ls) {
    const e = evento(l.path);
    if (e) {
      if (e.tipo === "busca") {
        a.buscas++;
        if (e.dado.startsWith("0|")) a.buscasVazias++;
      } else if (e.tipo === "whatsapp" || e.tipo === "cotacao") a.whatsapp++;
      else if (e.tipo === "carrinho") a.carrinho++;
      else if (e.tipo === "popup") {
        if (e.dado.startsWith("visto")) a.popupVisto = true;
        if (e.dado === "fechado") a.popupFechou = true;
        if (e.dado === "codigo") a.popupCodigo = true;
        if (e.dado === "cadastro") a.cadastro = true;
        if (e.dado === "login") a.login = true;
      }
    } else {
      paginas++;
      if (!entrada) entrada = l.path;
      saida = l.path;
      if (l.path.startsWith("/produto/")) a.produtos++;
      if (l.path.startsWith("/catalogos/ver/")) a.catalogos++;
      // Páginas vistas (no máximo 60 diferentes por sessão)
      if (caminhos[l.path] || Object.keys(caminhos).length < 60)
        caminhos[l.path] = (caminhos[l.path] ?? 0) + 1;
    }
  }
  // Atributos da sessão: a primeira linha que tem cada informação; o local vem todo da mesma linha
  const pega = <K extends keyof Linha>(k: K) => ls.find((l) => l[k])?.[k] ?? null;
  const comLocal = ls.find((l) => l.city) ?? ls.find((l) => l.country_code);
  const ini = ls[0].created_at,
    fim = ls[ls.length - 1].created_at;
  return {
    id,
    visitante: visitanteDe(ls[0]),
    inicio: ini.toISOString(),
    fim: fim.toISOString(),
    duracao: Math.round((fim.getTime() - ini.getTime()) / 1000),
    paginas,
    entrada,
    saida,
    fonte: pega("fonte") as string | null,
    meio: pega("meio") as string | null,
    campanha: pega("utm_campaign") as string | null,
    origemSite: pega("referrer_host") as string | null,
    cidade: comLocal?.city ?? null,
    regiao: comLocal?.region ?? null,
    pais: comLocal?.country_code ?? null,
    paisNome: comLocal?.country ?? null,
    lat: comLocal?.latitude ?? null,
    lon: comLocal?.longitude ?? null,
    aparelho: pega("device") as string | null,
    sistema: pega("os") as string | null,
    navegador: pega("browser") as string | null,
    acoes: a,
    userId: (pega("user_id") as number | null) ?? null,
    caminhos,
  };
}

// Sessões a partir das linhas (páginas + eventos já como "/_evento/..."): também usado pelo resumo diário
export function sessoesDeLinhas(linhas: Linha[]): SessaoBase[] {
  return [...montarSessoes(linhas).entries()]
    .map(([id, s]) => resumir(id, s.linhas))
    .filter((s) => s.paginas > 0 || s.acoes.whatsapp > 0);
}

// Uma sessão que passou da meia-noite fica em dois dias: junta as partes
function juntar(a: SessaoBase, b: SessaoBase): SessaoBase {
  const [p, q] = a.inicio <= b.inicio ? [a, b] : [b, a];
  const caminhos = { ...p.caminhos };
  for (const [k, v] of Object.entries(q.caminhos)) caminhos[k] = (caminhos[k] ?? 0) + v;
  const acoes = { ...p.acoes };
  for (const k of Object.keys(acoes) as Array<keyof Acoes>) {
    const x = q.acoes[k];
    (acoes as any)[k] = typeof x === "number" ? (acoes[k] as number) + x : acoes[k] || x;
  }
  const fim = p.fim > q.fim ? p.fim : q.fim;
  return {
    ...p,
    fim,
    duracao: Math.round((Date.parse(fim) - Date.parse(p.inicio)) / 1000),
    paginas: p.paginas + q.paginas,
    entrada: p.entrada || q.entrada,
    saida: q.saida || p.saida,
    caminhos,
    acoes,
    cidade: p.cidade ?? q.cidade,
    regiao: p.regiao ?? q.regiao,
    pais: p.pais ?? q.pais,
    paisNome: p.paisNome ?? q.paisNome,
    lat: p.lat ?? q.lat,
    lon: p.lon ?? q.lon,
    userId: p.userId ?? q.userId,
  };
}

// Sessões dos últimos `dias` dias (o último é hoje). pais "UY": só as localizadas no Uruguai.
export async function sessoesDoPeriodo(dias: number, pais: string | null) {
  const { garantirDias, diasAte, hojeLocal, inicioDia } = await import("./resumo-diario.server");
  const lista = diasAte(dias);
  const hoje = hojeLocal();
  const fechados = lista.filter((d) => d < hoje);
  await garantirDias(fechados);
  const salvas = fechados.length
    ? await prisma.analise_sessao.findMany({
        where: { dia: { in: fechados }, ...(pais && { pais }) },
        select: { dados: true },
      })
    : [];
  const todas: SessaoBase[] = [];
  for (const s of salvas) {
    try {
      todas.push(JSON.parse(s.dados));
    } catch {
      /* linha corrompida: ignora */
    }
  }
  if (lista.includes(hoje)) {
    const deHoje = sessoesDeLinhas(await lerLinhas({ created_at: { gte: inicioDia(hoje) } }));
    todas.push(...(pais ? deHoje.filter((s) => s.pais === pais) : deHoje));
  }
  const porId = new Map<string, SessaoBase>();
  for (const s of todas) porId.set(s.id, porId.has(s.id) ? juntar(porId.get(s.id)!, s) : s);
  return { sessoes: [...porId.values()], desde: inicioDia(lista[0]) };
}

export type FiltroJornada =
  "todas" | "com_acao" | "popup" | "cadastro" | "voltaram" | "identificados";

export async function listarJornadas(o: {
  dias: number;
  pais: string | null;
  filtro: FiltroJornada;
  pagina: number;
}) {
  const { sessoes: base, desde } = await sessoesDoPeriodo(o.dias, o.pais);

  // Quantas visitas cada visitante já fez (olhando até 90 dias antes do período)
  const antes = new Date(desde.getTime() - 90 * 86400_000);
  const visitantes = [...new Set(base.map((s) => s.visitante))].filter((v) => !v.startsWith("v"));
  const anteriores = visitantes.length
    ? await prisma.site_visits
        .groupBy({
          by: ["visitor_id", "session_id"],
          where: {
            visitor_id: { in: visitantes.slice(0, 5000) },
            created_at: { gte: antes, lt: desde },
          },
        })
        .catch(() => [])
    : [];
  const visitasAntes = new Map<string, number>();
  for (const r of anteriores)
    if (r.visitor_id) visitasAntes.set(r.visitor_id, (visitasAntes.get(r.visitor_id) ?? 0) + 1);

  const sessoes = [...base];
  // Número da visita: ordem das sessões do mesmo visitante
  sessoes.sort((a, b) => a.inicio.localeCompare(b.inicio));
  const contagem = new Map<string, number>();
  const comN = sessoes.map((s) => {
    const n = (contagem.get(s.visitante) ?? visitasAntes.get(s.visitante) ?? 0) + 1;
    contagem.set(s.visitante, n);
    return { ...s, visitaN: n };
  });

  // Quem é: usuário logado na sessão, ou o mesmo visitante logado em outra visita
  const userDoVisitante = new Map<string, number>();
  for (const s of sessoes) if (s.userId) userDoVisitante.set(s.visitante, s.userId);
  const ids = [
    ...new Set(comN.map((s) => s.userId ?? userDoVisitante.get(s.visitante)).filter(Boolean)),
  ] as number[];
  const users = ids.length
    ? await prisma.users.findMany({
        where: { id: { in: ids } },
        select: { id: true, nome_completo: true, email: true },
      })
    : [];
  const porId = new Map(
    users.map((u) => [u.id, { id: u.id, nome: u.nome_completo, email: u.email }]),
  );
  const todas: Sessao[] = comN.map(
    ({ userId, paisNome: _p, lat: _la, lon: _lo, caminhos: _c, ...s }) => ({
      ...s,
      usuario: porId.get(userId ?? userDoVisitante.get(s.visitante) ?? -1) ?? null,
    }),
  );

  // Funil de cadastro do período
  const novos = await prisma.users.count({
    where: { role: { not: "ADMIN" }, created_at: { gte: desde } },
  });
  const funil = {
    sessoes: todas.length,
    visitantes: new Set(todas.map((s) => s.visitante)).size,
    comAcao: todas.filter(
      (s) => s.paginas >= 3 || s.acoes.buscas || s.acoes.whatsapp || s.acoes.carrinho,
    ).length,
    popupVisto: todas.filter((s) => s.acoes.popupVisto).length,
    popupFechou: todas.filter((s) => s.acoes.popupFechou).length,
    popupCodigo: todas.filter((s) => s.acoes.popupCodigo).length,
    cadastrosPopup: todas.filter((s) => s.acoes.cadastro).length,
    contasNovas: novos,
    whatsapp: todas.filter((s) => s.acoes.whatsapp).length,
    carrinho: todas.filter((s) => s.acoes.carrinho).length,
    buscasVazias: todas.reduce((t, s) => t + s.acoes.buscasVazias, 0),
  };
  // Por canal: sessões, quantas viram o pop-up e quantas cadastraram
  const canais = new Map<
    string,
    { canal: string; sessoes: number; popup: number; cadastros: number; whatsapp: number }
  >();
  for (const s of todas) {
    const c = s.fonte || "sem dado";
    const v = canais.get(c) ?? { canal: c, sessoes: 0, popup: 0, cadastros: 0, whatsapp: 0 };
    v.sessoes++;
    if (s.acoes.popupVisto) v.popup++;
    if (s.acoes.cadastro) v.cadastros++;
    if (s.acoes.whatsapp) v.whatsapp++;
    canais.set(c, v);
  }

  const filtradas = todas
    .filter((s) => {
      if (o.filtro === "com_acao")
        return s.paginas >= 3 || s.acoes.buscas > 0 || s.acoes.whatsapp > 0 || s.acoes.carrinho > 0;
      if (o.filtro === "popup") return s.acoes.popupVisto;
      if (o.filtro === "cadastro") return s.acoes.cadastro || s.acoes.login;
      if (o.filtro === "voltaram") return s.visitaN > 1;
      if (o.filtro === "identificados") return !!s.usuario;
      return true;
    })
    .sort((a, b) => b.fim.localeCompare(a.fim));
  const POR = 50;
  return {
    funil,
    canais: [...canais.values()].sort((a, b) => b.sessoes - a.sessoes),
    total: filtradas.length,
    paginas: Math.max(1, Math.ceil(filtradas.length / POR)),
    sessoes: filtradas.slice((o.pagina - 1) * POR, o.pagina * POR),
  };
}

// Linha do tempo de uma sessão, em linguagem simples
export async function detalheJornada(sessionId: string) {
  // A sessão pode ser um id real ou "visitante|dia" (visitas antigas, sem sessão)
  const [vid, dia] = sessionId.includes("|") ? sessionId.split("|") : [null, null];
  const linhas = vid
    ? (await lerLinhas({ OR: [{ visitor_id: vid }, { ip_hash: vid }] })).filter(
        (l) => sessaoDe(l) === sessionId,
      )
    : await lerLinhas({ session_id: sessionId });
  if (!linhas.length) return null;
  void dia;
  const skus = new Set<string>();
  for (const l of linhas) {
    if (l.path.startsWith("/produto/")) skus.add(decodeURIComponent(l.path.slice(9)));
    const e = evento(l.path);
    if (e && (e.tipo === "whatsapp" || e.tipo === "carrinho")) skus.add(e.dado);
    if (e && e.tipo === "cotacao") e.dado.split(",").forEach((s) => skus.add(s));
  }
  const pecas = skus.size
    ? await prisma.agricolas.findMany({
        where: { sku: { in: [...skus] } },
        select: { sku: true, nome: true, nome_es: true, codigo_fabricante: true },
      })
    : [];
  const { nomeProduto } = await import("./pecas-es");
  const nomeDe = new Map(
    pecas.map((p) => [
      p.sku.trim(),
      `${nomeProduto(p as any)} (cód. ${(p.codigo_fabricante || p.sku).trim()})`,
    ]),
  );
  const peca = (sku: string) => nomeDe.get(sku.trim()) ?? `peça ${sku}`;
  const catIds = linhas
    .filter((l) => l.path.startsWith("/catalogos/ver/"))
    .map((l) => Number(l.path.split("/")[3]))
    .filter(Boolean);
  const cats = catIds.length
    ? await prisma.catalogos.findMany({
        where: { id: { in: catIds } },
        select: { id: true, titulo: true },
      })
    : [];
  const catDe = new Map(cats.map((c) => [c.id, c.titulo]));

  const t0 = linhas[0].created_at.getTime();
  const PAGINAS: Record<string, string> = {
    "/": "Página inicial",
    "/loja": "Loja (lista de peças)",
    "/catalogos": "Lista de catálogos",
    "/cadastro": "Página de cadastro",
    "/login": "Página de login",
    "/cuenta": "Mi cuenta",
    "/cotizar": "Página de cotização (distribuidor)",
    "/pedido-rapido": "Pedido rápido",
    "/ayuda": "Ajuda",
    "/repuestos": "Repuestos (marcas e categorias)",
  };
  const passos: Passo[] = linhas.map((l) => {
    const base = {
      t: Math.round((l.created_at.getTime() - t0) / 1000),
      quando: l.created_at.toISOString(),
    };
    const e = evento(l.path);
    if (!e) {
      if (l.path.startsWith("/produto/"))
        return {
          ...base,
          tipo: "pagina",
          icone: "📦",
          texto: `Viu a peça ${peca(decodeURIComponent(l.path.slice(9)))}`,
        };
      if (l.path.startsWith("/catalogos/ver/"))
        return {
          ...base,
          tipo: "pagina",
          icone: "📖",
          texto: `Abriu o catálogo "${catDe.get(Number(l.path.split("/")[3])) ?? l.path.split("/")[3]}"`,
          destaque: "bom",
        };
      if (l.path.startsWith("/repuestos/"))
        return {
          ...base,
          tipo: "pagina",
          icone: "🗂️",
          texto: `Página ${l.path.slice(11).replace(/[/-]/g, " ")}`,
        };
      return { ...base, tipo: "pagina", icone: "📄", texto: PAGINAS[l.path] ?? `Página ${l.path}` };
    }
    if (e.tipo === "busca") {
      const i = e.dado.indexOf("|");
      const n = Number(e.dado.slice(0, i));
      const termo = e.dado.slice(i + 1);
      return {
        ...base,
        tipo: "evento",
        icone: "🔎",
        texto: `Buscou "${termo}"`,
        detalhe: n ? `${n} resultado(s)` : "nenhum resultado",
        destaque: n ? undefined : "ruim",
      };
    }
    if (e.tipo === "carrinho")
      return {
        ...base,
        tipo: "evento",
        icone: "🛒",
        texto: `Adicionou ao carrinho: ${peca(e.dado)}`,
        destaque: "bom",
      };
    if (e.tipo === "whatsapp") {
      if (e.dado.startsWith("contato:"))
        return {
          ...base,
          tipo: "evento",
          icone: "💬",
          texto: `Clicou no WhatsApp (${PAGINAS[e.dado.slice(8)] ?? e.dado.slice(8)})`,
          destaque: "bom",
        };
      return {
        ...base,
        tipo: "evento",
        icone: "💬",
        texto: `Pediu preço pelo WhatsApp: ${peca(e.dado)}`,
        destaque: "bom",
      };
    }
    if (e.tipo === "cotacao")
      return {
        ...base,
        tipo: "evento",
        icone: "💬",
        texto: `Enviou o carrinho pelo WhatsApp (${e.dado.split(",").length} peças)`,
        detalhe: e.dado.split(",").map(peca).join(" · "),
        destaque: "bom",
      };
    if (e.tipo === "popup") {
      const P: Record<string, [string, string, Passo["destaque"]?]> = {
        visto: ["🪧", "Viu o pop-up de cadastro"],
        fechado: ["✖️", "Fechou o pop-up sem se cadastrar", "ruim"],
        codigo: ["✉️", "Pediu o código de acesso por e-mail"],
        cadastro: ["🎉", "CRIOU A CONTA", "bom"],
        login: ["🔑", "Entrou na conta", "bom"],
      };
      // "visto:carrinho" etc.: o pop-up abriu por uma ação da pessoa, não pelo tempo
      const MOTIVO: Record<string, string> = {
        carrinho: "ao adicionar ao carrinho",
        busca: "ao buscar uma peça que não temos",
        catalogo: "ao abrir um catálogo",
      };
      const [acao, motivo] = e.dado.split(":");
      const [icone, texto, destaque] = P[acao] ?? ["•", `Pop-up: ${e.dado}`];
      if (motivo && MOTIVO[motivo])
        return { ...base, tipo: "evento", icone, texto: `${texto} (${MOTIVO[motivo]})`, destaque };
      return { ...base, tipo: "evento", icone, texto, destaque };
    }
    return { ...base, tipo: "evento", icone: "•", texto: `${e.tipo}: ${e.dado}` };
  });

  // Outras visitas do mesmo visitante (histórico)
  const vis = visitanteDe(linhas[0]);
  const outras = vis.startsWith("v")
    ? new Map<string, { linhas: Linha[] }>()
    : montarSessoes(
        await lerLinhas({
          OR: [{ visitor_id: vis }, { ip_hash: vis }],
          created_at: { gte: new Date(Date.now() - 180 * 86400_000) },
        }),
      );
  const historico = [...outras.entries()]
    .map(([id, s]) => resumir(id, s.linhas))
    .filter((s) => s.paginas > 0)
    .sort((a, b) => b.inicio.localeCompare(a.inicio))
    .slice(0, 20)
    .map((s) => ({
      id: s.id,
      inicio: s.inicio,
      paginas: s.paginas,
      duracao: s.duracao,
      fonte: s.fonte,
      acoes: s.acoes,
    }));
  return { passos, historico };
}
