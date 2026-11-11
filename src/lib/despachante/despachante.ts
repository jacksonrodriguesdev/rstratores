import { createServerFn } from "@tanstack/react-start";

// Painel do despachante (despachante ou admin) e gestão das contas (só admin)
const despachante = async () => {
  const { assertDespachante } = await import("../auth.server");
  return assertDespachante();
};
const admin = async () => {
  const { assertAdmin } = await import("../auth.server");
  return assertAdmin();
};

export const sessaoDespFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getSession, PAPEIS_PAINEL } = await import("../auth.server");
  const s = await getSession();
  if (!s || !PAPEIS_PAINEL.includes(s.role)) return null;
  return { nome: s.nome, email: s.email, role: s.role };
});

export const painelDespFn = createServerFn({ method: "GET" }).handler(async () => {
  await despachante();
  const d = await import("./despachante.server");
  return d.painelDespachante();
});

export const cotacoesDespFn = createServerFn({ method: "GET" }).handler(async () => {
  await despachante();
  const b = await import("../b2b.server");
  return b.listarCotacoesAdmin();
});

export const cotacaoDespFn = createServerFn({ method: "GET" })
  .validator((d: { codigo: string }) => ({ codigo: String(d?.codigo ?? "").slice(0, 16) }))
  .handler(async ({ data }) => {
    await despachante();
    const b = await import("../b2b.server");
    const r = await b.cotacaoAdmin(data.codigo);
    // O despachante não vê a configuração comercial (margem): só o que a operação precisa
    return {
      ...r,
      cfg: { prazo: r.cfg.prazo, exportador: r.cfg.exportador, minimo: r.cfg.minimo },
    };
  });

export const empresasDespFn = createServerFn({ method: "GET" }).handler(async () => {
  await despachante();
  const b = await import("../b2b.server");
  const ad = await import("../aduana/aduana.server");
  await ad.garantirTabelasAduana();
  return b.listarEmpresas();
});

// ---------------------------------------------------------------- admin: contas
export const despachantesFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const d = await import("./despachante.server");
  return d.listarDespachantes();
});

export const criarDespachanteFn = createServerFn({ method: "POST" })
  .validator(
    (x: {
      nome: string;
      email: string;
      escritorio?: string;
      registro?: string;
      telefone?: string;
    }) => x,
  )
  .handler(async ({ data }) => {
    await admin();
    const d = await import("./despachante.server");
    return d.criarDespachante(data);
  });

export const novoConviteFn = createServerFn({ method: "POST" })
  .validator((x: { id: number }) => ({ id: Number(x?.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const d = await import("./despachante.server");
    return d.novoConvite(data.id);
  });

export const acessoDespachanteFn = createServerFn({ method: "POST" })
  .validator((x: { id: number; ativo: boolean }) => ({
    id: Number(x?.id) || 0,
    ativo: x?.ativo === true,
  }))
  .handler(async ({ data }) => {
    await admin();
    const d = await import("./despachante.server");
    return d.alterarAcesso(data.id, data.ativo);
  });

// Página do convite: nome e e-mail para a pessoa conferir antes de criar a senha
export const conviteFn = createServerFn({ method: "GET" })
  .validator((x: { token: string }) => ({ token: String(x?.token ?? "").slice(0, 64) }))
  .handler(async ({ data }) => {
    const d = await import("./despachante.server");
    const c = await d.conviteValido(data.token);
    return c ? { nome: c.nome, email: c.email } : null;
  });
