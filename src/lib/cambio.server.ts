// Cotação do dólar em pesos uruguaios (US$ 1 = $U x), para o cliente que prefere pagar o link em
// dólares pelo Stripe. Buscada na internet quando a guardada tem mais de 6 horas; fica na tabela
// `cotacoes` (par USD_UYU). Valor manual em Admin (configuração "cotacao_usd_manual") tem prioridade.
const SEIS_HORAS = 6 * 3600 * 1000;
const PAR = "USD_UYU";

async function buscarNaInternet(): Promise<{ valor: number; fonte: string } | null> {
  const fontes: Array<[string, string, (j: any) => number]> = [
    ["open.er-api.com", "https://open.er-api.com/v6/latest/USD", (j) => j?.rates?.UYU],
    [
      "currency-api (jsDelivr)",
      "https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json",
      (j) => j?.usd?.uyu,
    ],
  ];
  for (const [nome, url, ler] of fontes) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!r.ok) continue;
      const v = Number(ler(await r.json()));
      if (v > 15 && v < 150) return { valor: v, fonte: nome }; // sanidade: US$ 1 vale dezenas de $U
    } catch {
      /* tenta a próxima */
    }
  }
  return null;
}

export async function cotacaoDolar(): Promise<{ valor: number; fonte: string } | null> {
  const { prisma } = await import("./prisma");
  const manual = await prisma.configuracoes
    .findUnique({ where: { chave: "cotacao_usd_manual" } })
    .catch(() => null);
  const m = Number(String(manual?.valor ?? "").replace(",", "."));
  if (m > 15 && m < 150) return { valor: m, fonte: "manual" };
  const ultima = await prisma.cotacoes.findFirst({
    where: { par: PAR },
    orderBy: { created_at: "desc" },
  });
  if (ultima && Date.now() - ultima.created_at.getTime() < SEIS_HORAS)
    return { valor: ultima.valor, fonte: ultima.fonte };
  const nova = await buscarNaInternet();
  if (!nova) return ultima ? { valor: ultima.valor, fonte: ultima.fonte } : null;
  await prisma.cotacoes.create({ data: { par: PAR, valor: nova.valor, fonte: nova.fonte } });
  return nova;
}

// Cotação do real (R$ 1 = $U x): a mesma dos preços do site (Admin → Preços: manual ou automática),
// sem o ajuste de câmbio dos preços (aqui é só a conversão do valor do link)
export async function cotacaoReal(): Promise<number | null> {
  const { configPrecos } = await import("./precos.server");
  const c = await configPrecos().catch(() => null);
  return c?.cotacao && c.cotacao > 1 ? c.cotacao : null;
}

// Total do link em $U (centavos) → reais (centavos), arredondado para cima no centavo
export const emReais = (centavosUyu: number, cotacao: number) => Math.ceil(centavosUyu / cotacao);

// Total do link em $U (centavos) → dólares (centavos), arredondado para cima no centavo
export const emDolares = (centavosUyu: number, cotacao: number) => Math.ceil(centavosUyu / cotacao);
