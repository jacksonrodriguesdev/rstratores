// Lógica de servidor do AGRO PARTS Marketplace (acesso ao banco via Prisma).
// As server functions client-callable ficam em marketplace.ts.
import { prisma } from "./prisma";

export type FiltroAnuncios = {
  tipo?: string | null;
  marca?: string | null;
  departamento?: string | null;
  anoMin?: number | null;
  precoMax?: number | null;
  q?: string | null;
  orden?: "recientes" | "precio_asc" | "precio_desc" | null;
  pagina?: number;
  porPagina?: number;
};

const INCLUIR_CARD = {
  fotos: { orderBy: { ordem: "asc" as const }, take: 8 },
  empresa: { select: { handle: true, nome: true, verificada: true, logo_url: true } },
};

function destaqueAtivo() {
  return { gt: new Date() };
}

// Lista pública: só anúncios ATIVOS de empresas ativas. Destacados primeiro.
export async function listarAnuncios(f: FiltroAnuncios) {
  const porPagina = Math.min(Math.max(f.porPagina ?? 24, 1), 60);
  const pagina = Math.max(f.pagina ?? 1, 1);
  const where: any = { status: "ACTIVO", empresa: { is: { ativa: true } } };
  if (f.tipo) where.tipo = f.tipo;
  if (f.marca) where.marca = f.marca;
  if (f.departamento) where.departamento = f.departamento;
  if (f.anoMin) where.ano = { gte: f.anoMin };
  if (f.precoMax) where.preco = { lte: f.precoMax };
  if (f.q) {
    where.OR = [
      { titulo: { contains: f.q } },
      { marca: { contains: f.q } },
      { modelo: { contains: f.q } },
    ];
  }
  const orderBy: any[] = [{ destaque_ate: { sort: "desc", nulls: "last" } }];
  if (f.orden === "precio_asc") orderBy.push({ preco: "asc" });
  else if (f.orden === "precio_desc") orderBy.push({ preco: "desc" });
  else orderBy.push({ created_at: "desc" });

  const [total, itens] = await Promise.all([
    prisma.mkt_anuncio.count({ where }),
    prisma.mkt_anuncio.findMany({
      where,
      include: INCLUIR_CARD,
      orderBy,
      skip: (pagina - 1) * porPagina,
      take: porPagina,
    }),
  ]);
  return { total, pagina, porPagina, itens: itens.map(cartao) };
}

function cartao(a: any) {
  return {
    id: a.id,
    titulo: a.titulo,
    tipo: a.tipo,
    marca: a.marca,
    ano: a.ano,
    horasKm: a.horas_km,
    unidadeUso: a.unidade_uso,
    departamento: a.departamento,
    preco: a.preco ? Number(a.preco) : null,
    moeda: a.moeda,
    precoConsultar: a.preco_consultar,
    destaque: a.destaque_ate ? new Date(a.destaque_ate) > new Date() : false,
    foto: a.fotos?.[0]?.image_path ?? null,
    fotos: (a.fotos ?? []).map((f: any) => f.image_path),
    empresa: a.empresa
      ? { handle: a.empresa.handle, nome: a.empresa.nome, verificada: a.empresa.verificada }
      : null,
  };
}

// Detalhe do anúncio (qualquer status, mas só mostra ao público se ATIVO — a rota decide).
export async function getAnuncio(id: number) {
  const a = await prisma.mkt_anuncio.findUnique({
    where: { id },
    include: {
      fotos: { orderBy: { ordem: "asc" } },
      empresa: true,
    },
  });
  if (!a) return null;
  return {
    ...cartao(a),
    modelo: a.modelo,
    condicao: a.condicao,
    potencia: a.potencia,
    descricao: a.descricao,
    status: a.status,
    views: a.views,
    fotos: a.fotos.map((f) => f.image_path),
    empresaFull: a.empresa,
  };
}

// Perfil público da empresa pelo @handle (sem o @). userId = quem está vendo (p/ "seguindo").
export async function getEmpresaPorHandle(handle: string, userId?: number | null) {
  const h = handle.replace(/^@/, "").toLowerCase();
  const e = await prisma.mkt_empresa.findUnique({
    where: { handle: h },
    include: {
      anuncios: {
        where: { status: "ACTIVO" },
        include: INCLUIR_CARD,
        orderBy: [{ destaque_ate: { sort: "desc", nulls: "last" } }, { created_at: "desc" }],
      },
      _count: { select: { seguidores: true, anuncios: { where: { status: "ACTIVO" } } } },
    },
  });
  if (!e || !e.ativa) return null;
  const seguindo = userId
    ? (await prisma.mkt_seguidor.findFirst({
        where: { empresa_id: e.id, user_id: userId },
        select: { id: true },
      })) != null
    : false;
  return {
    seguindo,
    id: e.id,
    handle: e.handle,
    nome: e.nome,
    bio: e.bio,
    logoUrl: e.logo_url,
    capaUrl: e.capa_url,
    corTema: e.cor_tema,
    telefoneWa: e.telefone_wa,
    web: e.web,
    ubicacion: e.ubicacion,
    departamento: e.departamento,
    mapsUrl: e.maps_url,
    verificada: e.verificada,
    plano: e.plano,
    desde: e.created_at,
    seguidores: e._count.seguidores,
    totalMaquinas: e._count.anuncios,
    anuncios: e.anuncios.map(cartao),
  };
}

// Seguir/deixar de seguir uma empresa. Retorna o estado novo e a contagem.
export async function seguirEmpresa(empresaId: number, userId: number) {
  const existe = await prisma.mkt_seguidor.findFirst({
    where: { empresa_id: empresaId, user_id: userId },
    select: { id: true },
  });
  if (existe) {
    await prisma.mkt_seguidor.delete({ where: { id: existe.id } });
  } else {
    await prisma.mkt_seguidor.create({ data: { empresa_id: empresaId, user_id: userId } });
  }
  const seguidores = await prisma.mkt_seguidor.count({ where: { empresa_id: empresaId } });
  return { seguindo: !existe, seguidores };
}

// Métrica: registra clique no WhatsApp ou view (não bloqueia a navegação).
export async function registrarLead(anuncioId: number, tipo: "whatsapp" | "view") {
  try {
    await prisma.mkt_lead.create({ data: { anuncio_id: anuncioId, tipo } });
    if (tipo === "view") {
      await prisma.mkt_anuncio.update({
        where: { id: anuncioId },
        data: { views: { increment: 1 } },
      });
    }
  } catch {
    /* métrica nunca quebra a página */
  }
}

// Facetas pra montar os filtros (marcas e tipos com anúncios ativos).
export async function facetasAnuncios() {
  const marcas = await prisma.mkt_anuncio.groupBy({
    by: ["marca"],
    where: { status: "ACTIVO", marca: { not: null } },
    _count: true,
    orderBy: { _count: { marca: "desc" } },
    take: 30,
  });
  return { marcas: marcas.map((m) => m.marca).filter(Boolean) as string[] };
}
