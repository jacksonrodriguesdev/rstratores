import { createServerFn } from "@tanstack/react-start";
import type { DadosCampanhaDm } from "./instagram-dm.server";

const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  return assertAdmin();
};

export const listarCampanhasDmFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const { listarCampanhasDm } = await import("./instagram-dm.server");
  return listarCampanhasDm();
});

export const postsRecentesIgFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const { postsRecentesIg } = await import("./instagram-dm.server");
  return postsRecentesIg();
});

export const salvarCampanhaDmFn = createServerFn({ method: "POST" })
  .validator((d: DadosCampanhaDm) => d)
  .handler(async ({ data }) => {
    await admin();
    const { salvarCampanhaDm } = await import("./instagram-dm.server");
    const c = await salvarCampanhaDm(data);
    return { ok: true, id: c.id };
  });

export const ativarCampanhaDmFn = createServerFn({ method: "POST" })
  .validator((d: { id: number; ativo: boolean }) => ({ id: Number(d?.id) || 0, ativo: !!d?.ativo }))
  .handler(async ({ data }) => {
    await admin();
    const { ativarCampanhaDm } = await import("./instagram-dm.server");
    await ativarCampanhaDm(data.id, data.ativo);
    return { ok: true };
  });

export const excluirCampanhaDmFn = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: Number(d?.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const { excluirCampanhaDm } = await import("./instagram-dm.server");
    await excluirCampanhaDm(data.id);
    return { ok: true };
  });

export const sincronizarComentariosFn = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: Number(d?.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const { sincronizarComentarios } = await import("./instagram-dm.server");
    return sincronizarComentarios(data.id);
  });

export const comentariosDaCampanhaFn = createServerFn({ method: "GET" })
  .validator((d: { id: number }) => ({ id: Number(d?.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const { comentariosDaCampanha } = await import("./instagram-dm.server");
    const logs = await comentariosDaCampanha(data.id);
    return logs.map((l) => ({
      id: l.id,
      username: l.ig_username,
      texto: l.texto,
      status: l.dm_status,
      erro: l.dm_erro,
      quando: l.created_at.toISOString(),
    }));
  });

export const enviarDmLogFn = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: Number(d?.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const { enviarDmLog } = await import("./instagram-dm.server");
    return enviarDmLog(data.id);
  });

export const marcarManualFn = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: Number(d?.id) || 0 }))
  .handler(async ({ data }) => {
    await admin();
    const { marcarManual } = await import("./instagram-dm.server");
    await marcarManual(data.id);
    return { ok: true };
  });
