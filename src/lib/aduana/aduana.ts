import { createServerFn } from "@tanstack/react-start";
import type { ConfigAduana, Embarque, Origem } from "./aduana.server";
import type { EtapaId, RegistroEtapa } from "./aduana-comum";

// Admin → Empresas (atacado) → Aduana e Embarques; documentos do embarque para a empresa
const admin = async () => {
  const { assertAdmin } = await import("../auth.server");
  return assertAdmin();
};
const despachante = async () => {
  const { assertDespachante } = await import("../auth.server");
  return assertDespachante();
};
const logado = async () => {
  const { getSession } = await import("../auth.server");
  const s = await getSession();
  if (!s) throw new Error("Ingresá con tu cuenta para continuar.");
  return s;
};

export const painelAduanaFn = createServerFn({ method: "GET" }).handler(async () => {
  await despachante();
  const ad = await import("./aduana.server");
  const [config, prontidao, embarques] = await Promise.all([
    ad.configAduana(),
    ad.prontidao(),
    ad.listarEmbarques(),
  ]);
  return { config, prontidao, embarques };
});

export const salvarConfigAduanaFn = createServerFn({ method: "POST" })
  .validator((d: Partial<ConfigAduana>) => d)
  .handler(async ({ data }) => {
    await admin();
    const ad = await import("./aduana.server");
    return ad.salvarConfigAduana(data);
  });

export const origensFn = createServerFn({ method: "GET" })
  .validator((d: { q?: string; filtro?: string }) => ({
    q: String(d?.q ?? "").slice(0, 80),
    filtro: String(d?.filtro ?? "").slice(0, 20),
  }))
  .handler(async ({ data }) => {
    await despachante();
    const ad = await import("./aduana.server");
    return ad.listarOrigens(data.q, data.filtro);
  });

export const salvarOrigemFn = createServerFn({ method: "POST" })
  .validator((d: Partial<Origem> & { sku: string }) => d)
  .handler(async ({ data }) => {
    await despachante();
    const ad = await import("./aduana.server");
    return ad.salvarOrigem(data);
  });

export const embarqueAdminFn = createServerFn({ method: "GET" })
  .validator((d: { codigo: string }) => ({ codigo: String(d?.codigo ?? "").slice(0, 16) }))
  .handler(async ({ data }) => {
    await despachante();
    const b = await import("../b2b.server");
    return b.cotacaoAdmin(data.codigo);
  });

export const atualizarEmbarqueFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      id: number;
      etapa?: EtapaId;
      registro?: RegistroEtapa;
      geral?: Partial<
        Pick<
          Embarque,
          | "fronteira"
          | "transportadora"
          | "volumes"
          | "peso_bruto"
          | "peso_liquido"
          | "cfop"
          | "prova_modo"
        >
      >;
    }) => ({ ...d, id: Number(d?.id) || 0 }),
  )
  .handler(async ({ data }) => {
    await despachante();
    const ad = await import("./aduana.server");
    return ad.atualizarEmbarque(data);
  });

export const apagarArquivoFn = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => ({ id: String(d?.id ?? "").slice(0, 32) }))
  .handler(async ({ data }) => {
    await despachante();
    const ad = await import("./aduana.server");
    return ad.apagarArquivo(data.id);
  });

// Empresa: despachante de aduana no Uruguai
export const salvarDespachanteFn = createServerFn({ method: "POST" })
  .validator((d: { nome: string; contato: string }) => ({
    nome: String(d?.nome ?? "").slice(0, 160),
    contato: String(d?.contato ?? "").slice(0, 200),
  }))
  .handler(async ({ data }) => {
    const s = await logado();
    const b = await import("../b2b.server");
    return b.salvarDespachante(Number(s.id), data.nome, data.contato);
  });

// Documentos do embarque (fatura comercial, packing list, declaração de origem): dono ou admin
export const documentoFn = createServerFn({ method: "GET" })
  .validator((d: { codigo: string }) => ({ codigo: String(d?.codigo ?? "").slice(0, 16) }))
  .handler(async ({ data }) => {
    const s = await logado();
    const b = await import("../b2b.server");
    const ad = await import("./aduana.server");
    const r =
      s.role === "ADMIN" || s.role === "DESPACHANTE"
        ? await b.cotacaoAdmin(data.codigo)
        : await b.cotacaoDoCliente(Number(s.id), data.codigo);
    if (!["COTADA", "ACEITA"].includes(r.cotacao.status))
      throw new Error("Documento disponible cuando la propuesta esté lista.");
    const embarque = await ad.embarqueDaCotacao(r.cotacao.id);
    const { nota_interna: _n, ...cotacao } = r.cotacao;
    const aduana = await ad.configAduana();
    const cfgB2b = await b.configB2b();
    return {
      cotacao,
      empresa: r.empresa,
      embarque: embarque
        ? {
            fronteira: embarque.fronteira,
            transportadora: embarque.transportadora,
            volumes: embarque.volumes,
            peso_bruto: embarque.peso_bruto,
            peso_liquido: embarque.peso_liquido,
            fatura: embarque.fatura,
            prova_modo: embarque.prova_modo,
          }
        : null,
      exportador: {
        razao: aduana.razao,
        cnpj: aduana.cnpj,
        endereco: aduana.endereco,
        texto: cfgB2b.exportador,
        provaModo: aduana.provaModo,
        entidade: aduana.entidade,
      },
    };
  });
