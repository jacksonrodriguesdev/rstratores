// Pesquisa de preços na web pelo código da peça.
// Fontes: SerpAPI (Google Shopping no Brasil e no Uruguai) e a API do Mercado Livre (app do
// lojista, com login OAuth). Cada oferta vira uma linha em precos_ofertas; o resumo por peça
// (menor/mediana/maior em R$) fica em precos_resumo. Só contam ofertas cujo título tem o código.
// PRECOS_SERPAPI_URL e PRECOS_ML_URL só servem para testes locais (servidores falsos).

const SERP = (process.env.PRECOS_SERPAPI_URL || "https://serpapi.com").replace(/\/+$/, "");
const ML = (process.env.PRECOS_ML_URL || "https://api.mercadolibre.com").replace(/\/+$/, "");

// ---------- Configuração (tabela configuracoes, chaves pp_*) ----------
export const CAMPOS_PP = {
  pp_serpapi_key: true, // segredo
  pp_paises: false, // "BR,UY"
  pp_ml_client_id: false,
  pp_ml_client_secret: true,
  pp_ml_token: true,
  pp_ml_refresh: true,
  pp_ml_token_expira: false,
  pp_ml_usuario: false,
} as const;
export type ChavePP = keyof typeof CAMPOS_PP;

export async function configPP(): Promise<Record<ChavePP, string>> {
  const { prisma } = await import("./prisma");
  const rows = await prisma.configuracoes.findMany({ where: { chave: { startsWith: "pp_" } } });
  const m = Object.fromEntries(rows.map((r) => [r.chave, r.valor]));
  const out = {} as Record<ChavePP, string>;
  for (const k of Object.keys(CAMPOS_PP) as ChavePP[])
    out[k] = (process.env[k.toUpperCase()]?.trim() || m[k] || "").trim();
  if (!out.pp_paises) out.pp_paises = "BR,UY";
  return out;
}
export async function salvarPP(v: Partial<Record<ChavePP, string>>) {
  const { prisma } = await import("./prisma");
  for (const [chave, bruto] of Object.entries(v)) {
    if (!(chave in CAMPOS_PP)) continue;
    const valor = String(bruto ?? "")
      .trim()
      .slice(0, 2000);
    if (CAMPOS_PP[chave as ChavePP] && valor.startsWith("••••")) continue; // segredo mascarado: mantém
    if (valor)
      await prisma.configuracoes.upsert({
        where: { chave },
        create: { chave, valor },
        update: { valor },
      });
    else await prisma.configuracoes.deleteMany({ where: { chave } });
  }
}

// ---------- Utilidades ----------
const soAlnum = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
export function tituloTemCodigo(titulo: string, codigo: string) {
  const c = soAlnum(codigo);
  return c.length >= 4 && soAlnum(titulo).includes(c);
}
function moedaDoTexto(preco: string, paisBusca: string): string {
  if (/US\$|USD|U\$S/i.test(preco)) return "USD";
  if (/R\$|BRL/i.test(preco)) return "BRL";
  if (/\$U|UYU/i.test(preco)) return "UYU";
  return paisBusca === "BR" ? "BRL" : "UYU";
}
async function paraBRL(valor: number, moeda: string): Promise<number | null> {
  if (moeda === "BRL") return valor;
  if (moeda === "UYU") {
    const { configPrecos } = await import("./precos.server");
    const c = await configPrecos();
    return c.cotacao ? Math.round((valor / c.cotacao) * 100) / 100 : null;
  }
  return null; // dólar e outras moedas ficam guardadas, mas fora da conta
}
const mediana = (v: number[]) => {
  if (!v.length) return null;
  const s = [...v].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : Math.round(((s[m - 1] + s[m]) / 2) * 100) / 100;
};

type Oferta = {
  fonte: string;
  pais: string;
  loja: string | null;
  titulo: string;
  preco: number;
  moeda: string;
  link: string | null;
};

// ---------- SerpAPI: Google Shopping ----------
async function buscarSerp(q: string, pais: "BR" | "UY", chave: string): Promise<Oferta[]> {
  const params = new URLSearchParams({
    engine: "google_shopping",
    q,
    gl: pais.toLowerCase(),
    hl: pais === "BR" ? "pt-br" : "es-419",
    google_domain: pais === "BR" ? "google.com.br" : "google.com.uy",
    api_key: chave,
  });
  const r = await fetch(`${SERP}/search.json?${params}`, { signal: AbortSignal.timeout(30_000) });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || j.error) {
    // "Google hasn't returned any results" não é erro: só não achou
    if (/hasn't returned any results/i.test(j.error ?? "")) return [];
    throw new Error(`SerpAPI: ${j.error ?? `HTTP ${r.status}`}`);
  }
  const lista: any[] = [...(j.shopping_results ?? []), ...(j.inline_shopping_results ?? [])];
  return lista
    .filter((x) => Number(x.extracted_price) > 0 && x.title)
    .map((x) => ({
      fonte: "SERPAPI",
      pais,
      loja: x.source ?? null,
      titulo: String(x.title).slice(0, 400),
      preco: Number(x.extracted_price),
      moeda: moedaDoTexto(String(x.price ?? ""), pais),
      link: x.product_link || x.link || null,
    }));
}

export async function quotaSerp(): Promise<{
  restantes: number | null;
  usadas: number | null;
  plano: string | null;
} | null> {
  const c = await configPP();
  if (!c.pp_serpapi_key) return null;
  try {
    const r = await fetch(`${SERP}/account.json?api_key=${encodeURIComponent(c.pp_serpapi_key)}`, {
      signal: AbortSignal.timeout(15_000),
    });
    const j: any = await r.json();
    if (!r.ok || j.error)
      return { restantes: null, usadas: null, plano: `erro: ${j.error ?? r.status}` };
    return {
      restantes: j.total_searches_left ?? j.plan_searches_left ?? null,
      usadas: j.this_month_usage ?? null,
      plano: j.plan_name ?? null,
    };
  } catch (e: any) {
    return { restantes: null, usadas: null, plano: `erro: ${e?.message ?? e}` };
  }
}

// ---------- Mercado Livre (OAuth do app do lojista) ----------
export function urlLoginML(clientId: string, redirect: string) {
  return `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirect)}`;
}
export async function trocarCodigoML(code: string, redirect: string) {
  const c = await configPP();
  const r = await fetch(`${ML}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: c.pp_ml_client_id,
      client_secret: c.pp_ml_client_secret,
      code,
      redirect_uri: redirect,
    }),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw new Error(j.message || j.error || `HTTP ${r.status}`);
  await guardarTokenML(j);
}
async function guardarTokenML(j: any) {
  await salvarPP({
    pp_ml_token: j.access_token,
    ...(j.refresh_token && { pp_ml_refresh: j.refresh_token }),
    pp_ml_token_expira: String(Date.now() + (Number(j.expires_in) || 21600) * 1000),
    ...(j.user_id && { pp_ml_usuario: String(j.user_id) }),
  });
}
async function tokenML(): Promise<string | null> {
  const c = await configPP();
  if (!c.pp_ml_token) return null;
  if (Number(c.pp_ml_token_expira) - Date.now() > 5 * 60_000) return c.pp_ml_token;
  if (!c.pp_ml_refresh) return c.pp_ml_token;
  const r = await fetch(`${ML}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: c.pp_ml_client_id,
      client_secret: c.pp_ml_client_secret,
      refresh_token: c.pp_ml_refresh,
    }),
  });
  const j: any = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token)
    throw new Error(
      `Mercado Livre: não renovou o acesso (${j.message || r.status}). Conecte de novo.`,
    );
  await guardarTokenML(j);
  return j.access_token;
}
async function buscarML(q: string, pais: "BR" | "UY"): Promise<Oferta[]> {
  const t = await tokenML();
  if (!t) return [];
  const site = pais === "BR" ? "MLB" : "MLU";
  const r = await fetch(`${ML}/sites/${site}/search?q=${encodeURIComponent(q)}&limit=20`, {
    headers: { Authorization: `Bearer ${t}` },
    signal: AbortSignal.timeout(20_000),
  });
  const j: any = await r.json().catch(() => ({}));
  if (r.status === 403)
    throw new Error(
      `Mercado Livre ${pais === "BR" ? "Brasil" : "Uruguai"} bloqueou a busca para este app (403); os outros preços seguem normalmente.`,
    );
  if (!r.ok) throw new Error(`Mercado Livre: ${j.message || `HTTP ${r.status}`}`);
  return (j.results ?? [])
    .filter((x: any) => Number(x.price) > 0)
    .map((x: any) => ({
      fonte: "MERCADOLIVRE",
      pais,
      loja: x.seller?.nickname ? `Mercado Livre · ${x.seller.nickname}` : "Mercado Livre",
      titulo: String(x.title).slice(0, 400),
      preco: Number(x.price),
      moeda: x.currency_id ?? (pais === "BR" ? "BRL" : "UYU"),
      link: x.permalink ?? null,
    }));
}

// ---------- Pesquisa de uma peça ----------
export async function pesquisarPeca(
  sku: string,
): Promise<{ achados: number; erro: string | null }> {
  const { prisma } = await import("./prisma");
  const p = await prisma.agricolas.findFirst({
    where: { sku },
    select: { sku: true, codigo_fabricante: true, marca: true },
  });
  if (!p) return { achados: 0, erro: "peça não encontrada" };
  const codigo = (p.codigo_fabricante || p.sku).trim();
  const q = [codigo, p.marca].filter(Boolean).join(" ");
  const c = await configPP();
  const paises = c.pp_paises
    .split(",")
    .map((x) => x.trim().toUpperCase())
    .filter((x): x is "BR" | "UY" => x === "BR" || x === "UY");
  const ofertas: Oferta[] = [];
  const erros: string[] = [];
  for (const pais of paises) {
    if (c.pp_serpapi_key) {
      try {
        ofertas.push(...(await buscarSerp(q, pais, c.pp_serpapi_key)));
      } catch (e: any) {
        erros.push(e.message);
      }
    }
    if (c.pp_ml_token) {
      try {
        ofertas.push(...(await buscarML(q, pais)));
      } catch (e: any) {
        erros.push(e.message);
      }
    }
  }
  // Nova pesquisa substitui a anterior desta peça
  await prisma.precos_ofertas.deleteMany({ where: { sku: p.sku } });
  if (ofertas.length) {
    const linhas = [];
    for (const o of ofertas)
      linhas.push({
        ...o,
        sku: p.sku,
        preco_brl: await paraBRL(o.preco, o.moeda),
        relevante: tituloTemCodigo(o.titulo, codigo),
      });
    await prisma.precos_ofertas.createMany({ data: linhas });
  }
  await recalcularResumo(p.sku, erros.length ? [...new Set(erros)].join(" · ") : null);
  return { achados: ofertas.length, erro: erros[0] ?? null };
}

export async function recalcularResumo(sku: string, erro?: string | null) {
  const { prisma } = await import("./prisma");
  const ofs = await prisma.precos_ofertas.findMany({
    where: { sku, relevante: true, ignorar: false, preco_brl: { not: null } },
  });
  const v = ofs.map((o) => o.preco_brl!);
  const dados = {
    achados: ofs.length,
    menor_brl: v.length ? Math.min(...v) : null,
    mediana_brl: mediana(v),
    maior_brl: v.length ? Math.max(...v) : null,
    ...(erro !== undefined && { erro, pesquisado_em: new Date() }),
  };
  await prisma.precos_resumo.upsert({ where: { sku }, create: { sku, ...dados }, update: dados });
}

// ---------- Lote em segundo plano (uma peça por vez, com pausa entre buscas) ----------
type Lote = {
  rodando: boolean;
  total: number;
  feitos: number;
  comPreco: number;
  erros: number;
  ultimoErro: string | null;
  inicio: number;
  parar: boolean;
};
const g = globalThis as any;
export const statusLote = (): Lote =>
  g.__lotePrecos ?? {
    rodando: false,
    total: 0,
    feitos: 0,
    comPreco: 0,
    erros: 0,
    ultimoErro: null,
    inicio: 0,
    parar: false,
  };

export function iniciarLote(skus: string[]) {
  if (statusLote().rodando)
    throw new Error("Já tem uma pesquisa rodando. Espere terminar ou pare.");
  const lote: Lote = {
    rodando: true,
    total: skus.length,
    feitos: 0,
    comPreco: 0,
    erros: 0,
    ultimoErro: null,
    inicio: Date.now(),
    parar: false,
  };
  g.__lotePrecos = lote;
  void (async () => {
    for (const sku of skus) {
      if (lote.parar) break;
      try {
        const r = await pesquisarPeca(sku);
        if (r.erro) {
          lote.erros++;
          lote.ultimoErro = r.erro;
          // Chave inválida ou cota acabou: não adianta continuar
          if (/Invalid API key|run out of searches|plan.*limit|account.*disabled/i.test(r.erro))
            break;
        }
        const { prisma } = await import("./prisma");
        const res = await prisma.precos_resumo.findUnique({ where: { sku } });
        if (res?.maior_brl) lote.comPreco++;
      } catch (e: any) {
        lote.erros++;
        lote.ultimoErro = String(e?.message ?? e);
      }
      lote.feitos++;
      await new Promise((r) => setTimeout(r, 1200));
    }
    lote.rodando = false;
  })();
}
export function pararLote() {
  const l = statusLote();
  if (l.rodando) l.parar = true;
}
