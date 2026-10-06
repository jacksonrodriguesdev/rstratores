import { createServerFn } from "@tanstack/react-start";

export type Interesse = {
  dias: number;
  visitas: number;
  cliquesWhatsapp: number;
  cotacoesCarrinho: number;
  buscas: number;
  porDia: Array<{ dia: string; whatsapp: number; buscas: number }>;
  pecas: Array<{ sku: string; nome: string; nomeEs: string; cliques: number }>;
  termos: Array<{ termo: string; vezes: number; resultados: number }>;
  semResultado: Array<{ termo: string; vezes: number }>;
};

// Painel "Interesse dos clientes" (só admin)
export const getInteresseFn = createServerFn({ method: "GET" })
  .validator((dias: number) => Math.min(Math.max(Number(dias) || 30, 1), 365))
  .handler(async ({ data }) => {
    const { assertAdmin } = await import("./auth.server");
    await assertAdmin();
    const { resumoInteresse } = await import("./interesse.server");
    return resumoInteresse(data);
  });
