// Gerador de post diário do Instagram: todo dia escolhe um produto (com foto própria),
// monta a legenda em espanhol + hashtags e cria 1 post. Modo RASCUNHO (fica na fila para o
// admin aprovar) ou AUTO (agenda e o publicador já existente posta no horário). Config em
// "configuracoes" (chaves postauto_*). Roda 1×/dia pelo agendador (ver tarefasInstagram).

const SITE = () => (process.env.SITE_URL || "https://agropartsuy.com").replace(/\/+$/, "");
const diaMvd = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Montevideo" });

export type ConfigPostAuto = {
  ativo: boolean;
  modo: "RASCUNHO" | "AUTO";
  hora: number; // hora do dia (0-23, Montevidéu) para publicar/agendar
};

export const POSTAUTO_PADRAO: ConfigPostAuto = { ativo: false, modo: "RASCUNHO", hora: 10 };

export async function configPostAuto(): Promise<ConfigPostAuto> {
  const { prisma } = await import("./prisma");
  const rows = await prisma.configuracoes.findMany({
    where: { chave: { startsWith: "postauto_" } },
  });
  const v: Record<string, string> = Object.fromEntries(rows.map((r) => [r.chave, r.valor]));
  return {
    ativo: v.postauto_ativo === "1",
    modo: v.postauto_modo === "AUTO" ? "AUTO" : "RASCUNHO",
    hora: Math.min(23, Math.max(0, Math.round(Number(v.postauto_hora)) || POSTAUTO_PADRAO.hora)),
  };
}

export async function salvarConfigPostAuto(c: ConfigPostAuto) {
  const { prisma } = await import("./prisma");
  const valores: Record<string, string> = {
    postauto_ativo: c.ativo ? "1" : "0",
    postauto_modo: c.modo === "AUTO" ? "AUTO" : "RASCUNHO",
    postauto_hora: String(Math.min(23, Math.max(0, Math.round(c.hora) || 10))),
  };
  for (const [chave, valor] of Object.entries(valores))
    await prisma.configuracoes.upsert({
      where: { chave },
      create: { chave, valor },
      update: { valor },
    });
}

// Escolhe o produto do dia: um agrícola com foto própria (/catalogo/), em rotação por dia.
async function produtoDoDia() {
  const { prisma } = await import("./prisma");
  const total = await prisma.agricolas.count({
    where: { imagem_principal: { startsWith: "/catalogo/" } },
  });
  if (!total) return null;
  // índice determinístico pelo dia (gira o catálogo aos poucos)
  const base = Math.floor(Date.parse(diaMvd() + "T00:00:00Z") / 86400000);
  const idx = ((base % total) + total) % total;
  const [p] = await prisma.agricolas.findMany({
    where: { imagem_principal: { startsWith: "/catalogo/" } },
    orderBy: { sku: "asc" },
    skip: idx,
    take: 1,
    select: {
      sku: true,
      nome: true,
      nome_es: true,
      marca: true,
      categoria: true,
      imagem_principal: true,
    },
  });
  return p ?? null;
}

const hashtag = (s: string) =>
  "#" +
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9]/g, "")
    .toLowerCase();

function montarLegenda(p: {
  nome: string;
  nome_es: string | null;
  marca: string | null;
  categoria: string | null;
  sku: string;
}) {
  const nome = (p.nome_es || p.nome || "").trim();
  const marca = (p.marca || "").trim();
  const categoria = (p.categoria || "").split("\n")[0].trim();
  const linhas = [
    `🔧 ${nome}${marca ? ` — ${marca}` : ""}`,
    categoria
      ? `Repuesto de ${categoria} para tu maquinaria agrícola.`
      : "Repuesto para tu maquinaria agrícola.",
    "",
    "✅ Consultá precio y disponibilidad 👉 agropartsuy.com",
    "📲 Pedí por WhatsApp (link en la bio).",
    `Cód. ${p.sku}`,
  ];
  const tags = [
    "repuestosagricolas",
    "repuestos",
    "agro",
    "tractores",
    "maquinariaagricola",
    "uruguay",
    "agropartsuy",
    ...(marca ? [hashtag(marca)] : []),
    ...(categoria ? [hashtag(categoria)] : []),
  ];
  const comentario = [...new Set(tags.map((t) => (t.startsWith("#") ? t : "#" + t)))].join(" ");
  return { legenda: linhas.join("\n"), comentario };
}

// Cria o post do dia (1×/dia). Retorna o id criado, ou null se não gerou.
export async function gerarPostDiario(forcar = false): Promise<number | null> {
  const { prisma } = await import("./prisma");
  const cfg = await configPostAuto();
  if (!cfg.ativo && !forcar) return null;
  // já gerou hoje? (o "gerar agora" ignora essa trava)
  const hoje = diaMvd();
  if (!forcar) {
    const marca = await prisma.configuracoes.findUnique({ where: { chave: "postauto_ultimo" } });
    if (marca?.valor === hoje) return null;
  }
  // precisa do Instagram conectado (token guardado em configuracoes, chave ig_user_id)
  const temConta = await prisma.configuracoes.count({ where: { chave: "ig_user_id" } });
  if (!temConta) return null;

  const p = await produtoDoDia();
  if (!p || !p.imagem_principal) {
    // marca o dia mesmo sem produto, para não ficar tentando
    await prisma.configuracoes.upsert({
      where: { chave: "postauto_ultimo" },
      create: { chave: "postauto_ultimo", valor: hoje },
      update: { valor: hoje },
    });
    return null;
  }
  const { legenda, comentario } = montarLegenda(p);
  const urlFoto = `${SITE()}${p.imagem_principal}`;
  const auto = cfg.modo === "AUTO";
  const quando = new Date(`${hoje}T${String(cfg.hora).padStart(2, "0")}:00:00-03:00`);
  const post = await prisma.instagram_posts.create({
    data: {
      tipo: "FEED",
      legenda,
      comentario,
      midias: JSON.stringify([{ path: urlFoto, tipo: "IMAGE" }]),
      status: auto ? "AGENDADO" : "RASCUNHO",
      ...(auto && { agendado_para: quando }),
    },
  });
  await prisma.configuracoes.upsert({
    where: { chave: "postauto_ultimo" },
    create: { chave: "postauto_ultimo", valor: hoje },
    update: { valor: hoje },
  });
  return post.id;
}
