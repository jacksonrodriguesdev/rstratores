import { createServerFn } from "@tanstack/react-start";
import type { DadosEmpresa, PropostaAdmin } from "./b2b.server";
import type { StatusEmpresa } from "./b2b-comum";

// AGRO PARTS Mayorista: funções do portal das empresas e do Admin → Empresas (atacado)
type LinhaEnviada = { linha?: number; codigo: string; qtd?: number | null; descricao?: string };
const limparLinhas = (l: unknown): LinhaEnviada[] =>
  (Array.isArray(l) ? l : []).slice(0, 300).map((x: any, i) => ({
    linha: Number(x?.linha) || i + 1,
    codigo: String(x?.codigo ?? "").slice(0, 64),
    qtd: x?.qtd == null || x?.qtd === "" ? null : Number(x.qtd),
    descricao: String(x?.descricao ?? "").slice(0, 160),
  }));

const logado = async () => {
  const { getSession } = await import("./auth.server");
  const s = await getSession();
  if (!s) throw new Error("Ingresá con tu cuenta para continuar.");
  return s;
};
const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  return assertAdmin();
};

// ---------------------------------------------------------------- portal da empresa
export const minhaEmpresaFn = createServerFn({ method: "GET" }).handler(async () => {
  const { getSession } = await import("./auth.server");
  const s = await getSession();
  const b = await import("./b2b.server");
  const cfg = await b.configB2b();
  const publico = { minimo: cfg.minimo, incoterm: cfg.incoterm, prazo: cfg.prazo };
  if (!s) return { sessao: null, empresa: null, cfg: publico };
  return {
    sessao: { nome: s.nome, email: s.email },
    empresa: await b.empresaDoUsuario(Number(s.id)),
    cfg: publico,
  };
});

export const previaCotacaoFn = createServerFn({ method: "POST" })
  .validator((d: { linhas: LinhaEnviada[] }) => ({ linhas: limparLinhas(d?.linhas) }))
  .handler(async ({ data }) => {
    const s = await logado();
    const b = await import("./b2b.server");
    return b.previaCotacao(Number(s.id), data.linhas);
  });

export const criarCotacaoFn = createServerFn({ method: "POST" })
  .validator(
    (d: { linhas: LinhaEnviada[]; mensagem?: string; destino?: string; incoterm?: string }) => ({
      linhas: limparLinhas(d?.linhas).filter((l) => l.codigo.trim()),
      mensagem: String(d?.mensagem ?? "").slice(0, 2000),
      destino: String(d?.destino ?? "").slice(0, 160),
      incoterm: String(d?.incoterm ?? "").slice(0, 4),
    }),
  )
  .handler(async ({ data }) => {
    const s = await logado();
    const b = await import("./b2b.server");
    return { codigo: await b.criarCotacao(Number(s.id), data) };
  });

export const minhasCotacoesFn = createServerFn({ method: "GET" }).handler(async () => {
  const s = await logado();
  const b = await import("./b2b.server");
  return b.cotacoesDaEmpresa(Number(s.id));
});

export const cotacaoClienteFn = createServerFn({ method: "GET" })
  .validator((d: { codigo: string }) => ({ codigo: String(d?.codigo ?? "").slice(0, 16) }))
  .handler(async ({ data }) => {
    const s = await logado();
    const b = await import("./b2b.server");
    const r = await b.cotacaoDoCliente(Number(s.id), data.codigo);
    return {
      cotacao: r.cotacao,
      empresa: r.empresa,
      cfg: { minimo: r.cfg.minimo, prazo: r.cfg.prazo, instantaneo: r.cfg.instantaneo },
      embarque: r.embarque,
      taxas: r.taxas,
    };
  });

export const decidirCotacaoFn = createServerFn({ method: "POST" })
  .validator((d: { codigo: string; aceita: boolean }) => ({
    codigo: String(d?.codigo ?? "").slice(0, 16),
    aceita: d?.aceita === true,
  }))
  .handler(async ({ data }) => {
    const s = await logado();
    const b = await import("./b2b.server");
    return b.decidirCotacao(Number(s.id), data.codigo, data.aceita);
  });

export const repetirCotacaoFn = createServerFn({ method: "POST" })
  .validator((d: { codigo: string }) => ({ codigo: String(d?.codigo ?? "").slice(0, 16) }))
  .handler(async ({ data }) => {
    const s = await logado();
    const b = await import("./b2b.server");
    return { codigo: await b.repetirCotacao(Number(s.id), data.codigo) };
  });

// ---------------------------------------------------------------- admin
export const painelB2bFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const b = await import("./b2b.server");
  const [empresas, cotacoes, cfg, cambio] = await Promise.all([
    b.listarEmpresas(),
    b.listarCotacoesAdmin(),
    b.configB2b(),
    b.cambioUsd().catch(() => null),
  ]);
  return { empresas, cotacoes, cfg, usdPorReal: cambio };
});

export const atualizarEmpresaFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      id: number;
      status: StatusEmpresa;
      desconto_pct: number;
      pagamento: string;
      nota_admin?: string | null;
    }) => d,
  )
  .handler(async ({ data }) => {
    await admin();
    const b = await import("./b2b.server");
    return b.atualizarEmpresa(Number(data.id), data);
  });

export const cotacaoAdminFn = createServerFn({ method: "GET" })
  .validator((d: { codigo: string }) => ({ codigo: String(d?.codigo ?? "").slice(0, 16) }))
  .handler(async ({ data }) => {
    await admin();
    const b = await import("./b2b.server");
    return b.cotacaoAdmin(data.codigo);
  });

export const salvarPropostaFn = createServerFn({ method: "POST" })
  .validator((d: PropostaAdmin) => d)
  .handler(async ({ data }) => {
    await admin();
    const b = await import("./b2b.server");
    return b.salvarProposta(data);
  });

export const salvarConfigB2bFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      minimo: number;
      incoterm: string;
      validade: number;
      margem: number;
      instantaneo: boolean;
      prazo: string;
      exportador: string;
    }) => d,
  )
  .handler(async ({ data }) => {
    await admin();
    const b = await import("./b2b.server");
    return b.salvarConfigB2b(data as any);
  });

// Proforma para imprimir: a empresa dona da cotação ou o admin
export const proformaFn = createServerFn({ method: "GET" })
  .validator((d: { codigo: string }) => ({ codigo: String(d?.codigo ?? "").slice(0, 16) }))
  .handler(async ({ data }) => {
    const s = await logado();
    const b = await import("./b2b.server");
    const r =
      s.role === "ADMIN" || s.role === "DESPACHANTE"
        ? await b.cotacaoAdmin(data.codigo)
        : await b.cotacaoDoCliente(Number(s.id), data.codigo);
    const { nota_interna: _n, ...cotacao } = r.cotacao;
    return { cotacao, empresa: r.empresa, exportador: r.cfg.exportador, prazo: r.cfg.prazo };
  });

export type { DadosEmpresa };

// Página /empresas: tamanho real do catálogo (peças sem duplicadas), arredondado para baixo
let catalogo: { n: number; em: number } | null = null;
export const numerosB2bFn = createServerFn({ method: "GET" }).handler(async () => {
  if (!catalogo || Date.now() - catalogo.em > 6 * 3600_000) {
    const { prisma } = await import("./prisma");
    const n = await prisma.agricolas.count({ where: { duplicado_de: null } });
    catalogo = { n, em: Date.now() };
  }
  const b = await import("./b2b.server");
  const cfg = await b.configB2b();
  return {
    pecas: Math.floor(catalogo.n / 1000) * 1000,
    minimo: cfg.minimo,
    prazo: cfg.prazo,
  };
});
