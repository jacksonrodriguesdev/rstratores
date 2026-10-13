import { createServerFn } from "@tanstack/react-start";
import type { FiltroJornada } from "./jornadas.server";

export type { Sessao, Passo, Acoes, FiltroJornada } from "./jornadas.server";

const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  return assertAdmin();
};

export const listarJornadasFn = createServerFn({ method: "GET" })
  .validator((d: { dias: number; pais: string | null; filtro: FiltroJornada; pagina: number }) => ({
    dias: Math.min(Math.max(Number(d?.dias) || 7, 1), 90),
    pais: d?.pais === "UY" ? "UY" : null,
    filtro: d?.filtro ?? "todas",
    pagina: Math.max(1, Number(d?.pagina) || 1),
  }))
  .handler(async ({ data }) => {
    await admin();
    const { listarJornadas } = await import("./jornadas.server");
    return listarJornadas(data);
  });

export const detalheJornadaFn = createServerFn({ method: "GET" })
  .validator((d: { id: string }) => ({ id: String(d?.id ?? "").slice(0, 200) }))
  .handler(async ({ data }) => {
    await admin();
    const { detalheJornada } = await import("./jornadas.server");
    return detalheJornada(data.id);
  });
