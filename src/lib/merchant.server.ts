// Google Merchant Center (Admin → Google → Google Shopping). Só leitura, pela Merchant API, com a
// mesma conta Google conectada ao Search Console (permissão "content" pedida na conexão).
// - Situação das peças: aprovadas, pendentes e reprovadas por país, e os problemas mais comuns.
// - Desempenho nas listagens grátis do Shopping: vistas e cliques por dia e por peça.
// O ID da conta vem de Admin → Marketing (mkt_merchant_id). MERCHANT_API_URL só para testes.
import { prisma } from "./prisma";

const API = (process.env.MERCHANT_API_URL || "https://merchantapi.googleapis.com").replace(
  /\/+$/,
  "",
);

export class ErroMerchant extends Error {}

async function idConta() {
  const c = await prisma.configuracoes.findUnique({ where: { chave: "mkt_merchant_id" } });
  const id = String(c?.valor ?? "").replace(/\D/g, "");
  if (!id) throw new ErroMerchant("Coloque o ID da conta do Merchant Center em Admin → Marketing.");
  return id;
}

// Chama a Merchant API (v1); se a versão estável não existir para o recurso, tenta a beta
async function api(caminho: (versao: string) => string, corpo?: unknown): Promise<any> {
  const { tokenGoogle } = await import("./search-console.server");
  const tk = await tokenGoogle();
  let ultimo = "";
  for (const versao of ["v1", "v1beta"]) {
    const r = await fetch(`${API}${caminho(versao)}`, {
      method: corpo ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${tk}`,
        ...(corpo ? { "Content-Type": "application/json" } : {}),
      },
      body: corpo ? JSON.stringify(corpo) : undefined,
      signal: AbortSignal.timeout(60_000),
    });
    const j: any = await r.json().catch(() => ({}));
    if (r.ok) return j;
    ultimo = j?.error?.message || `Merchant API respondeu ${r.status}`;
    if (r.status !== 404) {
      if (/register|GCP/i.test(ultimo))
        throw new ErroMerchant(
          "O projeto do Google Cloud ainda não está registrado no Merchant Center. Abra Admin → Google e clique em “Registrar acesso”.",
        );
      if (r.status === 403)
        throw new ErroMerchant(
          `Sem permissão no Merchant Center (${ultimo}). Confira se a conta Google conectada é usuária da conta do Merchant e se a "Merchant API" está ativada no Google Cloud.`,
        );
      throw new ErroMerchant(ultimo);
    }
  }
  throw new ErroMerchant(ultimo);
}

// Registro do projeto do Google Cloud na conta do Merchant (exigido pela Merchant API uma vez)
export async function registrarAcesso(email: string) {
  const id = await idConta();
  await api((v) => `/accounts/${v}/accounts/${id}/developerRegistration:registerGcp`, {
    developerEmail: email,
  });
  return { ok: true };
}

type Situacao = {
  pais: string;
  contexto: string;
  ativas: number;
  pendentes: number;
  reprovadas: number;
  expirando: number;
};
type Problema = { descricao: string; pecas: number; gravidade: string };

export async function merchantResumo(dias: number) {
  const id = await idConta();
  // Situação agregada das peças (aprovadas / pendentes / reprovadas) e problemas por tipo
  const sit = await api(
    (v) => `/issueresolution/${v}/accounts/${id}/aggregateProductStatuses?pageSize=250`,
  );
  const situacoes: Situacao[] = [];
  const problemas = new Map<string, Problema>();
  for (const a of sit.aggregateProductStatuses ?? []) {
    const st = a.stats ?? {};
    situacoes.push({
      pais: a.country ?? "?",
      contexto: a.reportingContext ?? "",
      ativas: Number(st.activeCount ?? 0),
      pendentes: Number(st.pendingCount ?? 0),
      reprovadas: Number(st.disapprovedCount ?? 0),
      expirando: Number(st.expiringCount ?? 0),
    });
    for (const p of a.itemLevelIssues ?? []) {
      const k = p.description ?? p.code ?? "?";
      const atual = problemas.get(k) ?? { descricao: k, pecas: 0, gravidade: p.severity ?? "" };
      atual.pecas = Math.max(atual.pecas, Number(p.productCount ?? 0));
      problemas.set(k, atual);
    }
  }

  // Desempenho nas listagens do Shopping (vistas e cliques), por dia e por peça
  const fim = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);
  const ini = new Date(Date.now() - dias * 86400_000).toISOString().slice(0, 10);
  const linhas = async (query: string) => {
    const out: any[] = [];
    let pageToken: string | undefined;
    for (let i = 0; i < 10; i++) {
      const j = await api((v) => `/reports/${v}/accounts/${id}/reports:search`, {
        query,
        pageSize: 1000,
        ...(pageToken && { pageToken }),
      });
      out.push(...(j.results ?? []));
      pageToken = j.nextPageToken;
      if (!pageToken) break;
    }
    return out;
  };
  const porDiaRows = await linhas(
    `SELECT date, impressions, clicks FROM product_performance_view WHERE date BETWEEN '${ini}' AND '${fim}'`,
  ).catch(() => []);
  const porPecaRows = await linhas(
    `SELECT offer_id, title, impressions, clicks FROM product_performance_view WHERE date BETWEEN '${ini}' AND '${fim}' ORDER BY clicks DESC LIMIT 20`,
  ).catch(() => []);
  const dataDe = (d: any) =>
    typeof d === "string"
      ? d
      : d
        ? `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`
        : "";
  const porDia = new Map<string, { vistas: number; cliques: number }>();
  for (const r of porDiaRows) {
    const p = r.productPerformanceView ?? r;
    const dia = dataDe(p.date);
    const x = porDia.get(dia) ?? { vistas: 0, cliques: 0 };
    x.vistas += Number(p.impressions ?? 0);
    x.cliques += Number(p.clicks ?? 0);
    porDia.set(dia, x);
  }
  const pecas = porPecaRows.map((r) => {
    const p = r.productPerformanceView ?? r;
    return {
      sku: String(p.offerId ?? ""),
      titulo: String(p.title ?? ""),
      vistas: Number(p.impressions ?? 0),
      cliques: Number(p.clicks ?? 0),
    };
  });
  const serie = [...porDia]
    .map(([dia, v]) => ({ dia, ...v }))
    .sort((a, b) => a.dia.localeCompare(b.dia));
  return {
    conta: id,
    situacoes,
    problemas: [...problemas.values()].sort((a, b) => b.pecas - a.pecas).slice(0, 12),
    serie,
    vistas: serie.reduce((t, d) => t + d.vistas, 0),
    cliques: serie.reduce((t, d) => t + d.cliques, 0),
    pecas,
  };
}
