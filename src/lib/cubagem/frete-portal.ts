import { createServerFn } from "@tanstack/react-start";

// Frete estimado no portal B2B: o logista (logado) escolhe os produtos e vê o frete aproximado.
// Só leitura de cubagem/tarifa — exige sessão, mas não precisa ser admin.
const exigirSessao = async () => {
  const { getSession } = await import("../auth.server");
  const s = await getSession();
  if (!s) throw new Error("Ingresá con tu cuenta para ver el flete.");
  return s;
};

export const estimarFreteFn = createServerFn({ method: "POST" })
  .validator((d: { itens: Array<{ codigo: string; qtd: number }> }) => ({
    itens: (d?.itens ?? [])
      .slice(0, 1000)
      .map((i) => ({ codigo: String(i.codigo ?? ""), qtd: Math.max(0, Number(i.qtd) || 0) })),
  }))
  .handler(async ({ data }) => {
    await exigirSessao();
    return (await import("./cubagem.server")).estimarFrete(data.itens);
  });
