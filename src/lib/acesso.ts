import { createServerFn } from "@tanstack/react-start";
import type { ConfigPopup } from "./acesso.server";

// Pop-up "Entrá y ganá": configuração pública, cupom do cliente e painel do admin.

export type PopupPublico = ConfigPopup & { google: boolean; codigo: boolean };

export const getPopupFn = createServerFn({ method: "GET" }).handler(async (): Promise<PopupPublico> => {
  const { configPopup } = await import("./acesso.server");
  const { googleConfigurado } = await import("./google-oauth.server");
  const { resendConfigurado } = await import("./email.server");
  return { ...(await configPopup()), google: googleConfigurado(), codigo: resendConfigurado() };
});

// Cupom do cliente logado (cria na hora se ele entrou pelo pop-up e ainda não tem)
export const meuCupomFn = createServerFn({ method: "POST" }).handler(async () => {
  const { getSession } = await import("./auth.server");
  const s = await getSession();
  if (!s || s.role === "ADMIN") return null;
  const { garantirCupom } = await import("./acesso.server");
  const { prisma } = await import("./prisma");
  const cupom = await garantirCupom(s.id);
  const u = await prisma.users.findUnique({ where: { id: s.id }, select: { nome_completo: true, cupom_usado_em: true } });
  return { cupom, usado: !!u?.cupom_usado_em, nome: u?.nome_completo ?? s.nome };
});

// Depois do cadastro só com e-mail: nome, departamento e celular são opcionais (pop-up ou Mi cuenta)
export const completarPerfilFn = createServerFn({ method: "POST" })
  .validator((d: { nome?: string; departamento?: string; telefone?: string }) => ({
    nome: String(d?.nome ?? "").trim().slice(0, 120),
    departamento: String(d?.departamento ?? "").trim(),
    telefone: String(d?.telefone ?? "").trim().slice(0, 30),
  }))
  .handler(async ({ data }) => {
    const { getSession } = await import("./auth.server");
    const s = await getSession();
    if (!s || s.role === "ADMIN") throw new Error("Iniciá sesión de nuevo.");
    const { normalizarCelularUY, DEPARTAMENTOS_UY } = await import("./validacao-conta");
    const telefone = data.telefone ? normalizarCelularUY(data.telefone) : null;
    if (data.telefone && !telefone) throw new Error("El celular debe ser uruguayo: 09X XXX XXX.");
    const campos: { nome_completo?: string; departamento?: string; telefone?: string } = {};
    if (data.nome.length >= 2) campos.nome_completo = data.nome;
    if ((DEPARTAMENTOS_UY as readonly string[]).includes(data.departamento)) campos.departamento = data.departamento;
    if (telefone) campos.telefone = telefone;
    const { prisma } = await import("./prisma");
    if (Object.keys(campos).length) await prisma.users.update({ where: { id: s.id }, data: campos });
    return { ok: true, nome: campos.nome_completo ?? null };
  });

// ---------- Admin ----------
const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  return assertAdmin();
};

export type CupomCliente = { id: number; nome: string; email: string; telefone: string | null; cupom: string; usadoEm: string | null; criado: string };

export const painelPopupFn = createServerFn({ method: "GET" })
  .validator((d: { busca?: string }) => ({ busca: String(d?.busca ?? "").trim().slice(0, 60) }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    const { configPopup } = await import("./acesso.server");
    const desde = new Date(Date.now() - 30 * 86400_000);
    // Eventos do pop-up (site_eventos, tipo "popup", dado = ação)
    const { eventosProntos } = await import("./eventos-db.server");
    await eventosProntos();
    const eventos = await prisma.site_eventos.groupBy({
      by: ["dado"],
      where: { tipo: "popup", created_at: { gte: desde } },
      _count: true,
    });
    const n = (acao: string) => eventos.filter((e) => e.dado.startsWith(acao)).reduce((t, e) => t + e._count, 0);
    const q = data.busca;
    const where: any = { cupom: { not: null } };
    if (q) where.OR = [{ cupom: { contains: q } }, { nome_completo: { contains: q } }, { email: { contains: q } }, { telefone: { contains: q } }];
    const [cupons, total, usados] = await Promise.all([
      prisma.users.findMany({ where, orderBy: { created_at: "desc" }, take: 100, select: { id: true, nome_completo: true, email: true, telefone: true, cupom: true, cupom_usado_em: true, created_at: true } }),
      prisma.users.count({ where: { cupom: { not: null } } }),
      prisma.users.count({ where: { cupom_usado_em: { not: null } } }),
    ]);
    return {
      config: await configPopup(),
      stats: { vistos: n("visto"), fechados: n("fechado"), codigos: n("codigo"), cadastros: n("cadastro"), logins: n("login"), cupons: total, usados },
      cupons: cupons.map(
        (u): CupomCliente => ({ id: u.id, nome: u.nome_completo, email: u.email, telefone: u.telefone, cupom: u.cupom!, usadoEm: u.cupom_usado_em?.toISOString() ?? null, criado: u.created_at.toISOString() }),
      ),
    };
  });

export const salvarPopupFn = createServerFn({ method: "POST" })
  .validator((d: ConfigPopup) => d)
  .handler(async ({ data }) => {
    await admin();
    const { salvarConfigPopup } = await import("./acesso.server");
    await salvarConfigPopup(data);
    return { ok: true };
  });

export const marcarCupomFn = createServerFn({ method: "POST" })
  .validator((d: { id: number; usado: boolean }) => ({ id: Number(d?.id) || 0, usado: !!d?.usado }))
  .handler(async ({ data }) => {
    await admin();
    const { prisma } = await import("./prisma");
    await prisma.users.update({ where: { id: data.id }, data: { cupom_usado_em: data.usado ? new Date() : null } });
    return { ok: true };
  });
