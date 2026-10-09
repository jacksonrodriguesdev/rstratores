import { createServerFn } from "@tanstack/react-start";

// Configuração pública das telas de login (ex.: mostrar o botão do Google)
export const getConfigLoginFn = createServerFn({ method: "GET" }).handler(async () => {
  const { googleConfigurado } = await import("./google-oauth.server");
  return { google: googleConfigurado() };
});

export type Perfil = {
  id: number;
  nome_completo: string;
  email: string;
  telefone: string | null;
  departamento: string | null;
  cidade: string | null;
  endereco: string | null;
  numero_casa: string | null;
  ponto_referencia: string | null;
  cep: string | null;
  avatar_url: string | null;
  google: boolean;
  temSenha: boolean;
  role: string;
  criado: string;
  downloads: Array<{ id: number; titulo: string; marca: string | null; quando: string }>;
};

export const getPerfilFn = createServerFn({ method: "GET" }).handler(async (): Promise<Perfil | null> => {
  const { getSession } = await import("./auth.server");
  const s = await getSession();
  if (!s) return null;
  const { prisma } = await import("./prisma");
  const u = await prisma.users.findUnique({
    where: { id: s.id },
    include: {
      downloads: {
        orderBy: { created_at: "desc" },
        take: 20,
        include: { catalogo: { select: { id: true, titulo: true, marca: true } } },
      },
    },
  });
  if (!u) return null;
  return {
    id: u.id,
    nome_completo: u.nome_completo,
    email: u.email,
    telefone: u.telefone,
    departamento: u.departamento,
    cidade: u.cidade,
    endereco: u.endereco,
    numero_casa: u.numero_casa,
    ponto_referencia: u.ponto_referencia,
    cep: u.cep,
    avatar_url: u.avatar_url,
    google: !!u.google_id,
    temSenha: !u.senha_hash.startsWith("google:"),
    role: u.role,
    criado: u.created_at.toISOString(),
    downloads: u.downloads.map((d) => ({
      id: d.catalogo.id,
      titulo: d.catalogo.titulo,
      marca: d.catalogo.marca,
      quando: d.created_at.toISOString(),
    })),
  };
});

export type DadosPerfil = {
  nome_completo: string;
  telefone: string;
  departamento: string;
  cidade: string;
  endereco: string;
  numero_casa: string;
  ponto_referencia: string;
  cep: string;
};

export const salvarPerfilFn = createServerFn({ method: "POST" })
  .validator((d: DadosPerfil) => d)
  .handler(async ({ data }) => {
    const { getSession } = await import("./auth.server");
    const s = await getSession();
    if (!s) throw new Error("Iniciá sesión de nuevo.");
    const { normalizarCelularUY, DEPARTAMENTOS_UY } = await import("./validacao-conta");
    const t = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
    const nome = t(data.nome_completo, 120);
    if (nome.length < 3) throw new Error("Escribí tu nombre completo.");
    const tel = normalizarCelularUY(t(data.telefone, 30));
    if (!tel) throw new Error("El celular debe ser uruguayo: 09X XXX XXX.");
    const { prisma } = await import("./prisma");
    await prisma.users.update({
      where: { id: s.id },
      data: {
        nome_completo: nome,
        telefone: tel,
        departamento: DEPARTAMENTOS_UY.includes(data.departamento) ? data.departamento : null,
        cidade: t(data.cidade, 100) || null,
        endereco: t(data.endereco, 300) || null,
        numero_casa: t(data.numero_casa, 20) || null,
        ponto_referencia: t(data.ponto_referencia, 300) || null,
        cep: t(data.cep, 20) || null,
      },
    });
    return { ok: true };
  });

export const trocarSenhaFn = createServerFn({ method: "POST" })
  .validator((d: { atual: string; nova: string; confirmar: string }) => d)
  .handler(async ({ data }) => {
    const { getSession } = await import("./auth.server");
    const s = await getSession();
    if (!s) throw new Error("Iniciá sesión de nuevo.");
    const { avaliarSenha } = await import("./validacao-conta");
    if (!avaliarSenha(data.nova || "").valida) {
      throw new Error("La nueva contraseña debe tener al menos 8 caracteres, con letras y números.");
    }
    if (data.nova !== data.confirmar) throw new Error("Las contraseñas no coinciden.");
    const { prisma } = await import("./prisma");
    const bcrypt = (await import("bcryptjs")).default;
    const u = await prisma.users.findUnique({ where: { id: s.id } });
    if (!u) throw new Error("Cuenta no encontrada.");
    // Conta criada pelo Google ainda sem senha: pode definir sem informar a atual
    if (!u.senha_hash.startsWith("google:") && !(await bcrypt.compare(data.atual || "", u.senha_hash))) {
      throw new Error("La contraseña actual no es correcta.");
    }
    await prisma.users.update({ where: { id: s.id }, data: { senha_hash: await bcrypt.hash(data.nova, 10) } });
    return { ok: true };
  });
