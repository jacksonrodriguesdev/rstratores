// Identificação anônima do visitante no navegador (sem cookies de terceiros):
// - visitante: id aleatório guardado no aparelho (localStorage) -> conta visitantes únicos;
// - sessão: termina após 30 min sem navegar;
// - atribuição: de onde a sessão veio (UTM, gclid/fbclid, site de origem), capturada na
//   primeira página e repetida em toda a sessão, para cada visita e evento saber a origem.
const MIN30 = 30 * 60 * 1000;

const id = () =>
  (crypto as any)?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;

function ler(store: Storage, chave: string) {
  try {
    return store.getItem(chave);
  } catch {
    return null;
  }
}
function gravar(store: Storage, chave: string, valor: string) {
  try {
    store.setItem(chave, valor);
  } catch {
    /* modo privado: segue sem guardar */
  }
}

export type DadosVisitante = {
  visitorId: string;
  sessionId: string;
  entrada: boolean;
  atribuicao: Record<string, string | boolean>;
  language: string;
};

let memoria: DadosVisitante | null = null;

// Chamada a cada página vista: renova a sessão e diz se é a primeira página dela
export function dadosVisitante(novaPagina = false): DadosVisitante {
  if (typeof window === "undefined") return { visitorId: "", sessionId: "", entrada: false, atribuicao: {}, language: "" };
  let visitorId: string = ler(localStorage, "ap_vid") ?? "";
  if (!visitorId) {
    visitorId = id();
    gravar(localStorage, "ap_vid", visitorId);
  }
  const agora = Date.now();
  const ultima = Number(ler(localStorage, "ap_ult") || 0);
  let sessionId: string = ler(localStorage, "ap_sid") ?? "";
  let atribuicao: Record<string, string | boolean> = {};
  try {
    atribuicao = JSON.parse(ler(localStorage, "ap_atr") || "{}");
  } catch {
    atribuicao = {};
  }
  const q = new URLSearchParams(location.search);
  const temCampanha = q.has("utm_source") || q.has("gclid") || q.has("fbclid");
  let entrada = false;
  if (!sessionId || agora - ultima > MIN30 || temCampanha) {
    // Nova sessão (ou chegou por um link de campanha): nova atribuição
    sessionId = id();
    entrada = true;
    atribuicao = {
      ...(q.get("utm_source") && { utm_source: q.get("utm_source")!.slice(0, 100) }),
      ...(q.get("utm_medium") && { utm_medium: q.get("utm_medium")!.slice(0, 100) }),
      ...(q.get("utm_campaign") && { utm_campaign: q.get("utm_campaign")!.slice(0, 150) }),
      ...(q.has("gclid") && { gclid: true }),
      ...(q.has("fbclid") && { fbclid: true }),
      ...(document.referrer && { referrer: document.referrer.slice(0, 500) }),
    };
    gravar(localStorage, "ap_sid", sessionId);
    gravar(localStorage, "ap_atr", JSON.stringify(atribuicao));
  }
  if (novaPagina) gravar(localStorage, "ap_ult", String(agora));
  const dados: DadosVisitante = { visitorId, sessionId, entrada, atribuicao, language: navigator.language || "" };
  memoria = dados;
  return dados;
}

// Para eventos (clique no WhatsApp, busca): usa a sessão atual sem abrir outra
export function visitanteAtual(): DadosVisitante {
  return memoria ?? dadosVisitante(false);
}
