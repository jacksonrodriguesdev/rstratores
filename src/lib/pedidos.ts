import { createServerFn } from "@tanstack/react-start";
import type { Etapa } from "./pedidos-comum";

// Acompanhamento do pedido: página pública, conta do cliente, sininho e troca de etapa no admin
const sessao = async () => {
  const { getSession } = await import("./auth.server");
  return getSession();
};

export const acompanharPedidoFn = createServerFn({ method: "GET" })
  .validator((d: { codigo: string }) => ({ codigo: String(d?.codigo ?? "").slice(0, 24) }))
  .handler(async ({ data }) => {
    const p = await import("./pedidos.server");
    return p.acompanharPedido(data.codigo);
  });

export const meusPedidosFn = createServerFn({ method: "GET" }).handler(async () => {
  const s = await sessao();
  if (!s) return [];
  const p = await import("./pedidos.server");
  return p.meusPedidos(s.id);
});

export const notificacoesFn = createServerFn({ method: "GET" }).handler(async () => {
  const s = await sessao();
  if (!s) return { naoLidas: 0, lista: [] };
  const p = await import("./pedidos.server");
  return p.minhasNotificacoes(s.id);
});

export const marcarLidasFn = createServerFn({ method: "POST" }).handler(async () => {
  const s = await sessao();
  if (!s) return { ok: false };
  const p = await import("./pedidos.server");
  await p.marcarLidas(s.id);
  return { ok: true };
});

const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  return assertAdmin();
};

export const mudarEtapaFn = createServerFn({ method: "POST" })
  .validator((d: { id: number; etapa: Etapa; nota?: string | null; email?: boolean }) => d)
  .handler(async ({ data }) => {
    await admin();
    const p = await import("./pedidos.server");
    const r = await p.mudarEtapa(Number(data.id), data.etapa, {
      nota: data.nota,
      email: data.email !== false,
    });
    return { etapa: r.venda.etapa, status: r.venda.status, email: r.email };
  });

export const historicoVendaFn = createServerFn({ method: "GET" })
  .validator((d: { id: number }) => ({ id: Number(d?.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const p = await import("./pedidos.server");
    return p.historicoVenda(data.id);
  });
