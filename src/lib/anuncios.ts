import { createServerFn } from "@tanstack/react-start";

// Admin → Criador de anúncios (src/lib/anuncios.server.ts)
export const criadorAnunciosFn = createServerFn({ method: "GET" })
  .validator((d: { dias: number }) => ({ dias: Math.min(365, Math.max(7, Number(d?.dias) || 90)) }))
  .handler(async ({ data }) => {
    const { assertAdmin } = await import("./auth.server");
    await assertAdmin();
    return (await import("./anuncios.server")).criadorAnuncios(data.dias);
  });
