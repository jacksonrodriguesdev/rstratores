// Server functions das linhas extras da loja (CAMINHOES, DIESEL): quais estão ativas (loja) e o
// liga/desliga + contagem (admin). As peças saem pelo fluxo normal da loja (products.server).
import { createServerFn } from "@tanstack/react-start";

const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  await assertAdmin();
};

// Público: linhas extras ligadas, para a loja montar o filtro "Línea".
export const linhasLojaFn = createServerFn({ method: "GET" }).handler(async () => {
  const { linhasExtrasAtivas } = await import("./linhas-extras.server");
  return (await linhasExtrasAtivas()).map((l) => ({ id: l.id, rotulo: l.rotulo }));
});

// Admin: status de todas as linhas extras + contagem (total, marcas, segmentos).
export const statusLinhasFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const { LINHAS_EXTRAS, linhaExtraAtiva, contagemLinha } = await import("./linhas-extras.server");
  return Promise.all(
    LINHAS_EXTRAS.map(async (l) => ({
      id: l.id,
      rotulo: l.rotuloPt,
      ativa: await linhaExtraAtiva(l.id),
      ...(await contagemLinha(l.id)),
    })),
  );
});

// Admin: liga/desliga uma linha extra.
export const ativarLinhaFn = createServerFn({ method: "POST" })
  .validator((d: { id: string; ativa: boolean }) => ({ id: String(d.id), ativa: !!d.ativa }))
  .handler(async ({ data }) => {
    await admin();
    const { definirLinhaExtra } = await import("./linhas-extras.server");
    await definirLinhaExtra(data.id, data.ativa);
    return { ok: true, id: data.id, ativa: data.ativa };
  });
