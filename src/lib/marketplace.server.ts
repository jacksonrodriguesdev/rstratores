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

// ===== PAINEL DO VENDEDOR =====

export function normalizaHandle(s: string) {
  return (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 40);
}

export async function empresaDoUsuario(userId: number) {
  return prisma.mkt_empresa.findUnique({ where: { user_id: userId } });
}

export async function handleDisponivel(handle: string, exceptoUserId?: number) {
  const h = normalizaHandle(handle);
  if (h.length < 3) return false;
  const e = await prisma.mkt_empresa.findUnique({
    where: { handle: h },
    select: { user_id: true },
  });
  return !e || e.user_id === exceptoUserId;
}

export async function criarEmpresa(
  userId: number,
  data: {
    handle: string;
    nome: string;
    bio?: string;
    telefone_wa?: string;
    ubicacion?: string;
    departamento?: string;
  },
) {
  const handle = normalizaHandle(data.handle);
  if (handle.length < 3) return { erro: "El usuario debe tener al menos 3 caracteres." };
  if (!data.nome?.trim()) return { erro: "El nombre es obligatorio." };
  if (!(await handleDisponivel(handle, userId))) return { erro: "Ese @usuario ya está en uso." };
  const existe = await prisma.mkt_empresa.findUnique({
    where: { user_id: userId },
    select: { id: true },
  });
  if (existe) return { erro: "Ya tenés una tienda." };
  const e = await prisma.mkt_empresa.create({
    data: {
      user_id: userId,
      handle,
      nome: data.nome.trim().slice(0, 120),
      bio: data.bio?.slice(0, 2000) || null,
      telefone_wa: data.telefone_wa?.replace(/\D/g, "").slice(0, 20) || null,
      ubicacion: data.ubicacion?.slice(0, 120) || null,
      departamento: data.departamento?.slice(0, 40) || null,
    },
  });
  await prisma.users.update({ where: { id: userId }, data: { role: "EMPRESA" } }).catch(() => {});
  return { empresa: e };
}

export async function atualizarEmpresa(
  userId: number,
  data: Partial<{
    nome: string;
    bio: string;
    telefone_wa: string;
    web: string;
    ubicacion: string;
    departamento: string;
    maps_url: string;
    cor_tema: string;
    logo_url: string;
    capa_url: string;
  }>,
) {
  const e = await empresaDoUsuario(userId);
  if (!e) return { erro: "No tenés tienda." };
  await prisma.mkt_empresa.update({
    where: { id: e.id },
    data: {
      nome: data.nome?.trim().slice(0, 120) ?? undefined,
      bio: data.bio?.slice(0, 2000) ?? undefined,
      telefone_wa:
        data.telefone_wa !== undefined
          ? data.telefone_wa.replace(/\D/g, "").slice(0, 20)
          : undefined,
      web: data.web?.slice(0, 200) ?? undefined,
      ubicacion: data.ubicacion?.slice(0, 120) ?? undefined,
      departamento: data.departamento?.slice(0, 40) ?? undefined,
      maps_url: data.maps_url?.slice(0, 500) ?? undefined,
      cor_tema: data.cor_tema?.slice(0, 9) ?? undefined,
      logo_url: data.logo_url ?? undefined,
      capa_url: data.capa_url ?? undefined,
    },
  });
  return { ok: true };
}

export async function meusAnuncios(userId: number) {
  const e = await empresaDoUsuario(userId);
  if (!e) return { empresa: null, anuncios: [] as any[] };
  const anuncios = await prisma.mkt_anuncio.findMany({
    where: { empresa_id: e.id },
    include: { fotos: { orderBy: { ordem: "asc" }, take: 1 }, _count: { select: { fotos: true } } },
    orderBy: { updated_at: "desc" },
  });
  return {
    empresa: {
      id: e.id,
      handle: e.handle,
      nome: e.nome,
      verificada: e.verificada,
      plano: e.plano,
      limite: e.limite_anuncios,
      logo_url: e.logo_url,
    },
    anuncios: anuncios.map((a) => ({
      id: a.id,
      titulo: a.titulo,
      status: a.status,
      preco: a.preco ? Number(a.preco) : null,
      moeda: a.moeda,
      views: a.views,
      nFotos: a._count.fotos,
      foto: a.fotos[0]?.image_path ?? null,
    })),
  };
}

export type DadosAnuncio = {
  id?: number;
  titulo: string;
  tipo: string;
  marca?: string | null;
  modelo?: string | null;
  ano?: number | null;
  horas_km?: number | null;
  unidade_uso?: string | null;
  condicao?: string;
  potencia?: string | null;
  preco?: number | null;
  moeda?: string;
  preco_consultar?: boolean;
  descricao?: string | null;
  departamento?: string | null;
  fotos?: string[];
};

export async function salvarAnuncio(userId: number, d: DadosAnuncio) {
  const e = await empresaDoUsuario(userId);
  if (!e) return { erro: "Primero creá tu tienda." };
  if (!d.titulo?.trim()) return { erro: "El título es obligatorio." };
  if (!d.tipo) return { erro: "Elegí el tipo de máquina." };
  const base = {
    titulo: d.titulo.trim().slice(0, 160),
    tipo: d.tipo,
    marca: d.marca?.slice(0, 60) || null,
    modelo: d.modelo?.slice(0, 80) || null,
    ano: d.ano ?? null,
    horas_km: d.horas_km ?? null,
    unidade_uso: d.unidade_uso || null,
    condicao: d.condicao === "NUEVO" ? "NUEVO" : "USADO",
    potencia: d.potencia?.slice(0, 40) || null,
    preco: d.preco != null && !d.preco_consultar ? d.preco : null,
    moeda: d.moeda === "UYU" ? "UYU" : "USD",
    preco_consultar: !!d.preco_consultar,
    descricao: d.descricao?.slice(0, 5000) || null,
    departamento: d.departamento?.slice(0, 40) || null,
  };
  let anuncioId: number;
  if (d.id) {
    const dono = await prisma.mkt_anuncio.findFirst({
      where: { id: d.id, empresa_id: e.id },
      select: { id: true },
    });
    if (!dono) return { erro: "Anuncio no encontrado." };
    await prisma.mkt_anuncio.update({ where: { id: d.id }, data: base });
    anuncioId = d.id;
  } else {
    const criado = await prisma.mkt_anuncio.create({
      data: { ...base, empresa_id: e.id, status: "ACTIVO" },
    });
    anuncioId = criado.id;
  }
  // Fotos: substitui a galeria pelas enviadas (na ordem).
  if (d.fotos) {
    await prisma.mkt_anuncio_foto.deleteMany({ where: { anuncio_id: anuncioId } });
    if (d.fotos.length) {
      await prisma.mkt_anuncio_foto.createMany({
        data: d.fotos
          .slice(0, 12)
          .map((p, i) => ({ anuncio_id: anuncioId, image_path: p, ordem: i })),
      });
    }
  }
  return { ok: true, id: anuncioId };
}

export async function getAnuncioParaEditar(userId: number, id: number) {
  const e = await empresaDoUsuario(userId);
  if (!e) return null;
  const a = await prisma.mkt_anuncio.findFirst({
    where: { id, empresa_id: e.id },
    include: { fotos: { orderBy: { ordem: "asc" } } },
  });
  if (!a) return null;
  return {
    id: a.id,
    titulo: a.titulo,
    tipo: a.tipo,
    marca: a.marca,
    modelo: a.modelo,
    ano: a.ano,
    horas_km: a.horas_km,
    unidade_uso: a.unidade_uso,
    condicao: a.condicao,
    potencia: a.potencia,
    preco: a.preco ? Number(a.preco) : null,
    moeda: a.moeda,
    preco_consultar: a.preco_consultar,
    descricao: a.descricao,
    departamento: a.departamento,
    fotos: a.fotos.map((f) => f.image_path),
  };
}

export async function mudarStatusAnuncio(userId: number, id: number, status: string) {
  const e = await empresaDoUsuario(userId);
  if (!e) return { erro: "Sin tienda." };
  const ok = ["ACTIVO", "PAUSADO", "VENDIDO"].includes(status);
  if (!ok) return { erro: "Estado inválido." };
  const r = await prisma.mkt_anuncio.updateMany({
    where: { id, empresa_id: e.id },
    data: { status },
  });
  return { ok: r.count > 0 };
}

export async function deletarAnuncio(userId: number, id: number) {
  const e = await empresaDoUsuario(userId);
  if (!e) return { erro: "Sin tienda." };
  const r = await prisma.mkt_anuncio.deleteMany({ where: { id, empresa_id: e.id } });
  return { ok: r.count > 0 };
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
