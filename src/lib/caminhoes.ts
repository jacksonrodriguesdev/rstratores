// Server functions da linha de caminhões (loja /repuestos-camiones em espanhol + toggle no admin).
// Nomes e grupos são traduzidos para espanhol aqui na saída (glossário pecas-es.ts). Sem preço.
import { createServerFn } from "@tanstack/react-start";

const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  await assertAdmin();
};

export type CaminhaoItem = {
  codigo: string;
  referencia: string | null;
  nome_es: string;
  nome: string;
  montadora: string;
  montadora_slug: string;
  grupo_es: string | null;
  grupo: string | null;
  grupo_slug: string | null;
  aplicacao: string | null;
  fabricante: string | null;
  imagem: string | null;
  slug: string;
};

async function paraItem(p: any): Promise<CaminhaoItem> {
  const { nomeEs, categoriaEs } = await import("./pecas-es");
  const { fotoDe } = await import("./caminhoes.server");
  return {
    codigo: p.codigo,
    referencia: p.referencia,
    nome_es: nomeEs(p.nome),
    nome: p.nome,
    montadora: p.montadora,
    montadora_slug: p.montadora_slug,
    grupo_es: p.grupo ? categoriaEs(p.grupo) : null,
    grupo: p.grupo,
    grupo_slug: p.grupo_slug,
    aplicacao: p.aplicacao,
    fabricante: p.fabricante,
    imagem: fotoDe(p),
    slug: p.slug,
  };
}

// ---------- Público (loja) ----------

// A linha está ligada? Usado para mostrar/esconder a seção e o item do menu.
export const caminhoesAtivaFn = createServerFn({ method: "GET" }).handler(async () => {
  const { linhaCaminhoesAtiva } = await import("./caminhoes.server");
  return { ativa: await linhaCaminhoesAtiva() };
});

async function exigirLinhaLigada() {
  const { linhaCaminhoesAtiva } = await import("./caminhoes.server");
  if (!(await linhaCaminhoesAtiva())) throw new Error("Linha de caminhões desativada");
}

export const montadorasCaminhoesFn = createServerFn({ method: "GET" }).handler(async () => {
  await exigirLinhaLigada();
  const { listarMontadoras } = await import("./caminhoes.server");
  return listarMontadoras();
});

export const gruposCaminhoesFn = createServerFn({ method: "GET" })
  .validator((d: { montadora: string }) => ({ montadora: String(d.montadora || "") }))
  .handler(async ({ data }) => {
    await exigirLinhaLigada();
    const { listarGrupos, nomeMontadora } = await import("./caminhoes.server");
    const { categoriaEs } = await import("./pecas-es");
    const [grupos, montadora] = await Promise.all([
      listarGrupos(data.montadora),
      nomeMontadora(data.montadora),
    ]);
    return {
      montadora,
      grupos: grupos.map((g) => ({ ...g, grupo_es: g.grupo ? categoriaEs(g.grupo) : null })),
    };
  });

export const produtosCaminhoesFn = createServerFn({ method: "GET" })
  .validator((d: { montadora?: string; grupo?: string; q?: string; pagina?: number }) => ({
    montadora: d.montadora ? String(d.montadora) : undefined,
    grupo: d.grupo ? String(d.grupo) : undefined,
    q: d.q ? String(d.q).slice(0, 80) : undefined,
    pagina: d.pagina ? Math.max(1, Number(d.pagina)) : 1,
  }))
  .handler(async ({ data }) => {
    await exigirLinhaLigada();
    const { listarProdutos, nomeMontadora } = await import("./caminhoes.server");
    const r = await listarProdutos({
      montadoraSlug: data.montadora,
      grupoSlug: data.grupo,
      q: data.q,
      pagina: data.pagina,
    });
    const itens = await Promise.all(r.itens.map(paraItem));
    const montadora = data.montadora ? await nomeMontadora(data.montadora) : null;
    return { ...r, itens, montadoraNome: montadora };
  });

export const produtoCaminhaoFn = createServerFn({ method: "GET" })
  .validator((d: { codigo: string }) => ({ codigo: String(d.codigo || "").slice(0, 40) }))
  .handler(async ({ data }) => {
    await exigirLinhaLigada();
    const { produtoPorCodigo, relacionados } = await import("./caminhoes.server");
    const p = await produtoPorCodigo(data.codigo);
    if (!p) return null;
    const [item, rel] = await Promise.all([
      paraItem(p),
      relacionados(p).then((rs) => Promise.all(rs.map(paraItem))),
    ]);
    return { ...item, relacionados: rel };
  });

// ---------- Admin ----------

export const statusCaminhoesFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const { linhaCaminhoesAtiva, contagemCaminhoes } = await import("./caminhoes.server");
  const [ativa, c] = await Promise.all([linhaCaminhoesAtiva(), contagemCaminhoes()]);
  return { ativa, ...c };
});

export const ativarCaminhoesFn = createServerFn({ method: "POST" })
  .validator((d: { ativa: boolean }) => ({ ativa: !!d.ativa }))
  .handler(async ({ data }) => {
    await admin();
    const { definirLinhaCaminhoes } = await import("./caminhoes.server");
    await definirLinhaCaminhoes(data.ativa);
    return { ativa: data.ativa };
  });
