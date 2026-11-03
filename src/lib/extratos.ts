import { createServerFn } from "@tanstack/react-start";
import type { ArquivoEnviado, Tarefa } from "./extratos.server";

// Admin → Extrato do banco e as tarefas do dono (Fiscal)
const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  return assertAdmin();
};
const ext = () => import("./extratos.server");

export const painelExtratoFn = createServerFn({ method: "GET" })
  .validator((d: { ano?: number; mes?: string | null }) => ({
    ano: Number(d?.ano) || new Date().getFullYear(),
    mes: /^\d{4}-\d{2}$/.test(String(d?.mes ?? "")) ? String(d!.mes) : null,
  }))
  .handler(async ({ data }) => {
    await admin();
    return (await ext()).painel(data.ano, data.mes);
  });

export const importarExtratoFn = createServerFn({ method: "POST" })
  .validator((d: ArquivoEnviado) => {
    const texto = String(d?.texto ?? "");
    if (texto.length > 3_000_000) throw new Error("Arquivo grande demais (máx. um ano por vez).");
    return {
      nome: String(d?.nome ?? ""),
      formato: d?.formato === "csv" ? "csv" : "pdf",
      texto,
    } as ArquivoEnviado;
  })
  .handler(async ({ data }) => {
    await admin();
    return (await ext()).importar(data);
  });

export const classificarMovimentoFn = createServerFn({ method: "POST" })
  .validator((d: { id: number; categoria: string; lembrar?: boolean; nota?: string | null }) => ({
    id: Number(d?.id),
    categoria: String(d?.categoria ?? ""),
    lembrar: !!d?.lembrar,
    ...(d?.nota !== undefined && { nota: d.nota == null ? null : String(d.nota) }),
  }))
  .handler(async ({ data }) => {
    await admin();
    return (await ext()).classificarMovimento(data);
  });

export const apagarArquivoExtratoFn = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: Number(d?.id) }))
  .handler(async ({ data }) => {
    await admin();
    return (await ext()).apagarArquivo(data.id);
  });

export const pessoalFn = createServerFn({ method: "GET" })
  .validator((d: { ano?: number; mes?: string | null }) => ({
    ano: Number(d?.ano) || new Date().getFullYear(),
    mes: /^\d{4}-\d{2}$/.test(String(d?.mes ?? "")) ? String(d!.mes) : null,
  }))
  .handler(async ({ data }) => {
    await admin();
    return (await ext()).pessoal(data.ano, data.mes);
  });

export const buscarPessoaFn = createServerFn({ method: "GET" })
  .validator((d: { ano?: number; busca?: string; nome?: string | null }) => ({
    ano: Number(d?.ano) || new Date().getFullYear(),
    busca: String(d?.busca ?? "").slice(0, 80),
    nome: d?.nome ? String(d.nome).slice(0, 160) : null,
  }))
  .handler(async ({ data }) => {
    await admin();
    return (await ext()).buscarPessoa(data.ano, data.busca, data.nome);
  });

export const classificarSubFn = createServerFn({ method: "POST" })
  .validator((d: { id: number; sub: string; lembrar?: boolean }) => ({
    id: Number(d?.id),
    sub: String(d?.sub ?? ""),
    lembrar: !!d?.lembrar,
  }))
  .handler(async ({ data }) => {
    await admin();
    return (await ext()).classificarSub(data);
  });

export const tarefasFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  return (await ext()).lerTarefas();
});

export const salvarTarefasFn = createServerFn({ method: "POST" })
  .validator((d: { tarefas: Tarefa[] }) => ({
    tarefas: Array.isArray(d?.tarefas) ? d.tarefas : [],
  }))
  .handler(async ({ data }) => {
    await admin();
    return (await ext()).salvarTarefas(data.tarefas);
  });
