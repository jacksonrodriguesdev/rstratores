// Camada aduaneira do AGRO PARTS Mayorista (exportação Brasil → Uruguai, preferência Mercosul).
// Partes usadas no navegador e no servidor. Base documental em docs/ADUANA_EXPORTACAO_URUGUAI.md:
// - Regime de Origem do Mercosul (Decisão CMC nº 05/23; no Brasil, Decreto nº 12.058/2024; vigente desde
//   18/07/2024): máximo de 45% de materiais não originários (Brasil), salto tarifário de posição ou
//   subposição, prova de origem por certificado de entidade habilitada OU autocertificação (Declaração
//   de Origem), validade de 12 meses, guarda de documentos por 5 anos.
// - Autocertificação no Brasil: Portaria SECEX nº 373/2024, em vigor desde 01/03/2025 (facultativa).
// - Setor automotivo Brasil–Uruguai: ACE 02, 76º Protocolo Adicional (Decreto nº 8.655/2016). Autopeças
//   simples seguem a regra de origem geral do Mercosul; veículos, máquinas agrícolas e conjuntos, o
//   Título II, Art. 8º (índice de conteúdo regional mínimo de 55% para o Brasil).
// - Exportação: NF-e de exportação (CFOP 7.102 revenda / 7.101 produção própria) → DU-E no Portal Único
//   Siscomex (exportador habilitado no RADAR) → transporte rodoviário internacional com CRT e MIC/DTA →
//   desembaraço e averbação → importação no Uruguai pelo despachante do comprador (DUA no sistema LUCIA).
import { NCM_ACE02 } from "./ace02-ncm";

export const soNcm = (s: string | null | undefined) =>
  String(s ?? "")
    .replace(/\D/g, "")
    .slice(0, 8);
export const ncmValida = (s: string | null | undefined) => soNcm(s).length === 8;
export const formatarNcm = (s: string | null | undefined) => {
  const n = soNcm(s);
  return n.length === 8 ? `${n.slice(0, 4)}.${n.slice(4, 6)}.${n.slice(6)}` : n || "—";
};

// ---------------------------------------------------------------- acordo aplicável por NCM
export type Acordo = "ACE02" | "ACE18";
// Veículos e máquinas completas do ACE 02 (alíneas "a" a "i"); o resto da lista são autopeças (alínea "j")
const ehMaquina = (n: string) =>
  /^(870[1-7]|8716|8429|8430)/.test(n) ||
  (/^8432/.test(n) && !/^843290/.test(n)) ||
  (/^8433/.test(n) && !/^843390/.test(n));
export function acordoDaNcm(ncm: string | null | undefined) {
  const n = soNcm(ncm);
  if (n.length !== 8) return null;
  if (NCM_ACE02.has(n)) {
    const maquina = ehMaquina(n);
    return {
      acordo: "ACE02" as Acordo,
      rotulo: "ACE 02 · 76º PA (setor automotivo Brasil–Uruguai)",
      regra: maquina
        ? "Veículo/máquina: índice de conteúdo regional mínimo de 55% (Título II, Art. 8º do 76º PA)"
        : "Autopeça simples: regra de origem do Mercosul (Decisão CMC 05/23); certificado com observação “ACE 02 – 76 PA”",
    };
  }
  return {
    acordo: "ACE18" as Acordo,
    rotulo: "ACE 18 · Mercosul (Regime de Origem, Decisão CMC 05/23)",
    regra:
      "Requisito específico de origem da NCM (Apêndice II): até 45% de materiais não originários, salto tarifário ou processo produtivo",
  };
}

// ---------------------------------------------------------------- origem da peça
// COMPROVADA: há prova (declaração do produtor / do fornecedor do material, ou certificado) dentro da
// validade. INFORMADA: o fornecedor diz que é nacional, falta o documento. EXTRAZONA: fabricada fora do
// Mercosul (ex.: importada da Ásia e revendida no Brasil) — não tem preferência.
export type StatusOrigem = "COMPROVADA" | "INFORMADA" | "EXTRAZONA" | "A_VERIFICAR";
export const STATUS_ORIGEM_PT: Record<StatusOrigem, string> = {
  COMPROVADA: "Mercosul comprovada",
  INFORMADA: "Nacional informada (falta documento)",
  EXTRAZONA: "Extrazona (sem preferência)",
  A_VERIFICAR: "A verificar",
};
export const STATUS_ORIGEM_ES: Record<StatusOrigem, string> = {
  COMPROVADA: "Origen Mercosur",
  INFORMADA: "Origen Mercosur a confirmar",
  EXTRAZONA: "Origen extrazona",
  A_VERIFICAR: "Origen a confirmar",
};
export const PROVAS = {
  DECL_PRODUTOR: "Declaração do produtor (fabricante)",
  DECL_FORNECEDOR: "Declaração do Fornecedor do Material (Apêndice X do ROM)",
  CERTIFICADO: "Certificado de origem anterior / laudo da entidade",
  NF_FABRICANTE: "NF de compra direta do fabricante nacional",
} as const;
export type Prova = keyof typeof PROVAS;
// Prova de origem vale 12 meses (ROM, Decisão CMC 05/23)
export const VALIDADE_PROVA_DIAS = 365;
export function origemValida(o: { status: StatusOrigem; prova_data?: string | null }) {
  if (o.status !== "COMPROVADA") return false;
  if (!o.prova_data) return false;
  return (
    Date.now() - new Date(`${o.prova_data}T12:00:00`).getTime() < VALIDADE_PROVA_DIAS * 86400_000
  );
}

// ---------------------------------------------------------------- preferência de um item na cotação
export type Preferencia = "SIM" | "A_CONFIRMAR" | "NAO";
export function preferenciaDoItem(i: { ncm?: string | null; origem?: string | null }): Preferencia {
  if (i.origem === "OUTRA") return "NAO";
  if (i.origem === "MERCOSUL" && ncmValida(i.ncm)) return "SIM";
  return "A_CONFIRMAR";
}

// ---------------------------------------------------------------- custo estimado no Uruguai
// Estimativa para o comprador comparar (não é cálculo oficial): valor em aduana ≈ CIF; arancel 0% com
// preferência, senão a TEC/AEC da NCM; Tasa Consular sobre o valor em aduana (3% Mercosul / 5% extrazona,
// conferir na DNA); IVA de importação 22% sobre CIF + arancel. Honorários do despachante à parte.
export type TaxasUruguai = {
  tasaConsularMercosul: number; // %
  tasaConsularExtrazona: number; // %
  iva: number; // %
  aecPadrao: number; // % (TEC média para peças sem preferência, se o item não tiver a sua)
  seguro: number; // % do FOB
  despachante: number; // USD estimado por operação
};
export const TAXAS_PADRAO: TaxasUruguai = {
  tasaConsularMercosul: 3,
  tasaConsularExtrazona: 5,
  iva: 22,
  aecPadrao: 14,
  seguro: 0.5,
  despachante: 250,
};

export type LinhaCusto = {
  qtd: number;
  preco: number | null;
  preferencia: Preferencia;
  aec?: number | null; // % da TEC para o item (sem preferência)
};
export function custoUruguai(itens: LinhaCusto[], frete: number | null, t: TaxasUruguai) {
  const validos = itens.filter((i) => i.preco != null && i.preco > 0);
  const fob = validos.reduce((s, i) => s + i.qtd * i.preco!, 0);
  const seguro = (fob * t.seguro) / 100;
  const cif = fob + (frete ?? 0) + seguro;
  // Rateio do frete e seguro pelo valor de cada item
  let arancel = 0;
  let tasa = 0;
  let arancelSemPref = 0; // quanto pagaria sem a preferência (para mostrar a economia)
  for (const i of validos) {
    const peso = fob ? (i.qtd * i.preco!) / fob : 0;
    const cifItem = cif * peso;
    const aec = (i.aec ?? t.aecPadrao) / 100;
    arancelSemPref += cifItem * aec;
    if (i.preferencia === "SIM") tasa += (cifItem * t.tasaConsularMercosul) / 100;
    else {
      arancel += cifItem * aec;
      tasa += (cifItem * t.tasaConsularExtrazona) / 100;
    }
  }
  const iva = ((cif + arancel) * t.iva) / 100;
  const r = (n: number) => Math.round(n * 100) / 100;
  return {
    fob: r(fob),
    frete: r(frete ?? 0),
    seguro: r(seguro),
    cif: r(cif),
    arancel: r(arancel),
    tasaConsular: r(tasa),
    iva: r(iva),
    despachante: r(t.despachante),
    // IVA de importação costuma ser crédito para empresa contribuinte: mostramos com e sem
    totalSemIva: r(cif + arancel + tasa + t.despachante),
    total: r(cif + arancel + tasa + iva + t.despachante),
    economiaMercosul: r(arancelSemPref - arancel),
  };
}

// ---------------------------------------------------------------- etapas da exportação
// Ordem do trâmite. "base" = norma/fonte que a etapa segue (aparece no admin).
export const ETAPAS = [
  {
    id: "PROFORMA",
    pt: "Proforma aceita",
    es: "Propuesta aceptada",
    base: "Fatura proforma com NCM, origem, Incoterm e condições",
    cliente: true,
  },
  {
    id: "PAGAMENTO",
    pt: "Pagamento recebido",
    es: "Pago recibido",
    base: "Câmbio de exportação: o pagamento do exterior entra por contrato de câmbio no banco",
    cliente: true,
  },
  {
    id: "ORIGEM",
    pt: "Prova de origem",
    es: "Certificado / declaración de origen",
    base: "ROM Mercosul (Decisão CMC 05/23): certificado de origem digital (COD) por entidade habilitada ou Declaração de Origem (autocertificação, Portaria SECEX 373/2024). Validade 12 meses; guardar documentos 5 anos",
    cliente: true,
  },
  {
    id: "FATURA",
    pt: "Fatura comercial e packing list",
    es: "Factura comercial y packing list",
    base: "Documentos comerciais do embarque (o despachante uruguaio usa no DUA)",
    cliente: true,
  },
  {
    id: "NFE",
    pt: "NF-e de exportação",
    es: "Factura electrónica de exportación (Brasil)",
    base: "NF-e com CFOP 7.102 (revenda) ou 7.101 (produção própria); exportação com imunidade de ICMS e desoneração de IPI/PIS/COFINS — confirmar com o contador",
    cliente: false,
  },
  {
    id: "DUE",
    pt: "DU-E registrada (Portal Único Siscomex)",
    es: "Declaración de exportación (DU-E) registrada",
    base: "IN RFB 1.702/2017: DU-E elaborada a partir da NF-e, pelo exportador habilitado no Siscomex (RADAR, IN RFB 1.984/2020)",
    cliente: true,
  },
  {
    id: "TRANSPORTE",
    pt: "Transporte: CRT e MIC/DTA",
    es: "Transporte: CRT y MIC/DTA",
    base: "Transporte rodoviário internacional (Acordo ATIT): CRT emitido por transportadora habilitada na ANTT + MIC/DTA vinculado à DU-E",
    cliente: true,
  },
  {
    id: "DESEMBARACO",
    pt: "Desembaraço de exportação e saída",
    es: "Despacho de exportación y salida de Brasil",
    base: "Presença de carga e desembaraço na fronteira; DU-E averbada após a saída",
    cliente: true,
  },
  {
    id: "IMPORTACAO",
    pt: "Despacho de importação no Uruguai",
    es: "Despacho de importación en Uruguay",
    base: "Despachante do comprador registra o DUA no sistema LUCIA da DNA, com fatura, CRT/MIC e prova de origem",
    cliente: true,
  },
  {
    id: "ENTREGUE",
    pt: "Entregue",
    es: "Entregado",
    base: "Entrega no destino combinado (Incoterm)",
    cliente: true,
  },
] as const;
export type EtapaId = (typeof ETAPAS)[number]["id"];
export type StatusEtapa = "PENDENTE" | "EM_ANDAMENTO" | "FEITO" | "NAO_SE_APLICA";
export type RegistroEtapa = {
  status: StatusEtapa;
  numero?: string | null; // nº da DU-E, chave da NF-e, nº do CRT/MIC, nº do COD…
  data?: string | null; // AAAA-MM-DD
  nota?: string | null;
  arquivos?: Array<{ id: string; nome: string; cliente: boolean }>; // documentos anexados
};

export const PONTOS_FRONTEIRA = {
  CHUI: "Chuí (BR) / Chuy (UY)",
  JAGUARAO: "Jaguarão (BR) / Río Branco (UY)",
  LIVRAMENTO: "Santana do Livramento (BR) / Rivera (UY)",
  ACEGUA: "Aceguá (BR) / Aceguá (UY)",
  QUARAI: "Quaraí (BR) / Artigas (UY)",
  BARRA: "Barra do Quaraí (BR) / Bella Unión (UY)",
} as const;
export type PontoFronteira = keyof typeof PONTOS_FRONTEIRA;
