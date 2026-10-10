import type { ConfigPrecos } from "./precos";

// Cotação R$ → $U do dia e configurações de preço.
// A cotação é buscada na internet quando a guardada tem mais de 6 horas (sem tarefa agendada:
// a primeira consulta depois disso atualiza). Fica guardada na tabela `cotacoes`.
const SEIS_HORAS = 6 * 3600 * 1000;
const PAR = "BRL_UYU";

const PADROES: Record<string, string> = {
  margem_padrao: "40",
  arredondar_uyu: "10",
  ajuste_cambio: "0",
  mostrar_precos: "1",
  cotacao_manual: "",
};

let memo: { cfg: ConfigPrecos; em: number } | null = null;
export const limparCacheConfig = () => (memo = null);

export async function lerConfiguracoes(): Promise<Record<string, string>> {
  const { prisma } = await import("./prisma");
  const rows = await prisma.configuracoes.findMany();
  return { ...PADROES, ...Object.fromEntries(rows.map((r) => [r.chave, r.valor])) };
}

export async function salvarConfiguracoes(valores: Record<string, string>) {
  const { prisma } = await import("./prisma");
  for (const [chave, valor] of Object.entries(valores)) {
    if (!(chave in PADROES)) continue;
    await prisma.configuracoes.upsert({ where: { chave }, create: { chave, valor: String(valor) }, update: { valor: String(valor) } });
  }
  memo = null;
}

async function buscarNaInternet(): Promise<{ valor: number; fonte: string } | null> {
  const fontes: Array<[string, string, (j: any) => number]> = [
    ["open.er-api.com", "https://open.er-api.com/v6/latest/BRL", (j) => j?.rates?.UYU],
    ["currency-api (jsDelivr)", "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/brl.json", (j) => j?.brl?.uyu],
  ];
  for (const [nome, url, ler] of fontes) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) continue;
      const v = Number(ler(await r.json()));
      if (v > 1 && v < 100) return { valor: v, fonte: nome }; // sanidade: 1 R$ vale alguns $U
    } catch {
      /* tenta a próxima */
    }
  }
  return null;
}

export async function cotacaoGuardada(forcar = false) {
  const { prisma } = await import("./prisma");
  const ultima = await prisma.cotacoes.findFirst({ where: { par: PAR }, orderBy: { created_at: "desc" } });
  if (!forcar && ultima && Date.now() - ultima.created_at.getTime() < SEIS_HORAS) return ultima;
  const nova = await buscarNaInternet();
  if (!nova) return ultima; // sem internet: segue com a última
  return prisma.cotacoes.create({ data: { par: PAR, valor: nova.valor, fonte: nova.fonte } });
}

export async function configPrecos(forcarCotacao = false): Promise<ConfigPrecos> {
  if (!forcarCotacao && memo && Date.now() - memo.em < 10 * 60 * 1000) return memo.cfg;
  const c = await lerConfiguracoes();
  const manual = Number(String(c.cotacao_manual).replace(",", "."));
  const cot = manual > 0 ? null : await cotacaoGuardada(forcarCotacao).catch(() => null);
  const cfg: ConfigPrecos = {
    cotacao: manual > 0 ? manual : cot?.valor ?? null,
    cotacaoEm: manual > 0 ? null : cot?.created_at.toISOString() ?? null,
    fonte: manual > 0 ? "manual" : cot?.fonte ?? null,
    manual: manual > 0,
    arredondar: Number(c.arredondar_uyu) || 0,
    ajuste: Number(c.ajuste_cambio) || 0,
    margemPadrao: Number(c.margem_padrao) || 0,
    mostrar: c.mostrar_precos === "1",
  };
  memo = { cfg, em: Date.now() };
  return cfg;
}

// Tira do registro o que o cliente não pode ver (custo e margem)
export function semCusto<T extends Record<string, any>>(p: T): T {
  if (!p) return p;
  const { valor_compra, margem, ...resto } = p as any;
  return resto as T;
}
