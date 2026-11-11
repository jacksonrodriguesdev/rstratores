// Server functions da linha de caminhões: saber se está ligada (loja) e o liga/desliga (admin).
// As peças em si saem pelo fluxo normal da loja (products.server, linha='CAMINHOES').
import { createServerFn } from "@tanstack/react-start";

const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  await assertAdmin();
};

// Público: a loja usa para mostrar/esconder o filtro "Línea: Camiones".
export const caminhoesAtivaFn = createServerFn({ method: "GET" }).handler(async () => {
  const { linhaCaminhoesAtiva } = await import("./caminhoes.server");
  return { ativa: await linhaCaminhoesAtiva() };
});

// Público: linha ligada + total de peças (páginas de SEO por cidade).
export const infoCamionesFn = createServerFn({ method: "GET" }).handler(async () => {
  const { linhaCaminhoesAtiva, contagemCaminhoes } = await import("./caminhoes.server");
  if (!(await linhaCaminhoesAtiva())) return { ativa: false, total: 0 };
  const c = await contagemCaminhoes();
  return { ativa: true, total: c.total };
});

// Admin: status com contagem.
export const statusCaminhoesFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const { linhaCaminhoesAtiva, contagemCaminhoes } = await import("./caminhoes.server");
  const [ativa, c] = await Promise.all([linhaCaminhoesAtiva(), contagemCaminhoes()]);
  return { ativa, ...c };
});

// Admin: liga/desliga a linha inteira.
export const ativarCaminhoesFn = createServerFn({ method: "POST" })
  .validator((d: { ativa: boolean }) => ({ ativa: !!d.ativa }))
  .handler(async ({ data }) => {
    await admin();
    const { definirLinhaCaminhoes } = await import("./caminhoes.server");
    await definirLinhaCaminhoes(data.ativa);
    return { ativa: data.ativa };
  });
