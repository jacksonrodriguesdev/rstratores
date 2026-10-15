// Tags de marketing no navegador: Google Analytics 4, Google Tag Manager, Google Ads e Meta Pixel.
// Os IDs vêm de Marketing → Integrações (banco), carregados pela rota raiz; mudar lá não precisa
// de deploy. Nada roda no painel /admin. Os eventos daqui usam o mesmo event_id que o servidor
// manda pela API de Conversões do Meta (src/lib/conversoes.server.ts), para não contar duas vezes.
import type { MarketingPublico } from "./marketing-config.server";

export type { MarketingPublico };

// Só letras, números, hífen e sublinhado: o valor vai dentro de um <script>
const seguro = (s: string) => /^[A-Za-z0-9_-]+$/.test(s);

// Velocidade: os scripts do Google e do Meta são pesados (o do Google tem ~180 KB e trava o
// celular por quase 1 s). As filas (dataLayer, gtag, fbq, clarity) são criadas na hora, então
// nenhum evento se perde; os arquivos só baixam na 1ª interação (rolar, tocar, teclar, mover o
// mouse) ou 7 s depois que a página carregou, sem disputar com o conteúdo.
const carregar = (src: string) =>
  `var s=document.createElement("script");s.async=true;s.src=${JSON.stringify(src)};document.head.appendChild(s);`;
const depois = (corpo: string) =>
  `(function(){var ok=0;function go(){if(ok)return;ok=1;${corpo}}["scroll","pointerdown","keydown","touchstart","mousemove"].forEach(function(e){addEventListener(e,go,{once:true,passive:true})});addEventListener("load",function(){setTimeout(go,7000)});})();`;

export function scriptsMarketing(cfg?: MarketingPublico | null) {
  const scripts: Array<{ src?: string; async?: boolean; children?: string }> = [];
  if (!cfg) return scripts;
  const fora = "!location.pathname.startsWith('/admin')";
  // IDs de conversão do Google Ads ficam à mão para os eventos (não são segredo)
  scripts.push({
    children: `window.__mkt=${JSON.stringify({ gads: cfg.gads, gadsLead: cfg.gadsLead, gadsCadastro: cfg.gadsCadastro })};`,
  });
  const aCarregar: string[] = [];
  const gtagId = cfg.ga4 || cfg.gads;
  if (gtagId && seguro(gtagId)) {
    const configs = [cfg.ga4, cfg.gads]
      .filter((x) => x && seguro(x))
      .map((x) => `gtag('config','${x}');`)
      .join("");
    scripts.push({
      children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());if(${fora}){${configs}}`,
    });
    aCarregar.push(carregar(`https://www.googletagmanager.com/gtag/js?id=${gtagId}`));
  }
  if (cfg.gtm && seguro(cfg.gtm)) {
    aCarregar.push(
      `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);})(window,document,'script','dataLayer','${cfg.gtm}');`,
    );
  }
  // Microsoft Clarity: grava as visitas (sem o que é digitado) e mostra mapas de calor
  if (cfg.clarity && seguro(cfg.clarity)) {
    scripts.push({
      children: `if(${fora}){window.clarity=window.clarity||function(){(window.clarity.q=window.clarity.q||[]).push(arguments)};}`,
    });
    aCarregar.push(carregar(`https://www.clarity.ms/tag/${cfg.clarity}`));
  }
  if (cfg.pixel && seguro(cfg.pixel)) {
    // Fila do Pixel na hora (o PageView entra nela); o fbevents.js baixa depois
    scripts.push({
      children: `if(${fora}){!function(f){if(f.fbq)return;var n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];}(window);fbq('init','${cfg.pixel}');fbq('track','PageView');}`,
    });
    aCarregar.push(carregar("https://connect.facebook.net/en_US/fbevents.js"));
  }
  if (aCarregar.length) scripts.push({ children: `if(${fora}){${depois(aCarregar.join(""))}}` });
  return scripts;
}

// Metas de verificação de domínio (Meta Business e Google Search Console/Merchant Center)
export function metasVerificacao(cfg?: MarketingPublico | null) {
  const m: Array<{ name: string; content: string }> = [];
  if (cfg?.metaDominio) m.push({ name: "facebook-domain-verification", content: cfg.metaDominio });
  if (cfg?.googleVerificacao)
    m.push({ name: "google-site-verification", content: cfg.googleVerificacao });
  return m;
}

const w = () => (typeof window === "undefined" ? null : (window as any));
const naoAdmin = () => !!w() && !w().location.pathname.startsWith("/admin");

export function novoEventId(prefixo = "ev") {
  return `${prefixo}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function adsConversao(rotulo: "gadsLead" | "gadsCadastro", extra: Record<string, unknown> = {}) {
  const m = w()?.__mkt;
  if (m?.gads && m[rotulo])
    w()?.gtag?.("event", "conversion", { send_to: `${m.gads}/${m[rotulo]}`, ...extra });
}

// Mudou de página sem recarregar (navegação do site): PageView do Pixel
export function paginaVista() {
  if (!naoAdmin()) return;
  try {
    w()?.fbq?.("track", "PageView");
  } catch {
    /* ignora */
  }
}

// Pedido pelo WhatsApp (uma peça ou o carrinho) = Lead no Meta, generate_lead no GA4, conversão no Ads
export function conversaoWhatsapp(detalhe: string, eventId: string) {
  if (!naoAdmin()) return;
  try {
    w()?.gtag?.("event", "generate_lead", { method: "whatsapp", item_id: detalhe });
    adsConversao("gadsLead");
    w()?.fbq?.("track", "Lead", { content_name: detalhe }, { eventID: eventId });
  } catch {
    /* bloqueador de anúncios: ignora */
  }
}

// Pop-up "Entrá y ganá": visto, fechado, código pedido, cadastro, login
export function eventoPopup(acao: string, eventId?: string) {
  if (!naoAdmin()) return;
  const ga: Record<string, [string, Record<string, string>]> = {
    visto: ["view_promotion", { promotion_name: "popup_acceso" }],
    cadastro: ["sign_up", { method: "popup" }],
    login: ["login", { method: "popup" }],
  };
  try {
    if (ga[acao]) w()?.gtag?.("event", ga[acao][0], ga[acao][1]);
    if (acao === "cadastro") {
      adsConversao("gadsCadastro");
      w()?.fbq?.("track", "CompleteRegistration", {}, eventId ? { eventID: eventId } : undefined);
    }
  } catch {
    /* ignora */
  }
}

// Busca no site
export function eventoBusca(termo: string) {
  if (!naoAdmin()) return;
  try {
    w()?.gtag?.("event", "search", { search_term: termo });
    w()?.fbq?.("track", "Search", { search_string: termo });
  } catch {
    /* ignora */
  }
}

type Peca = { sku: string; nome: string; valor?: number | null; quantidade?: number };
const comValor = (p: Peca) =>
  p.valor && p.valor > 0 ? { value: p.valor * (p.quantidade ?? 1), currency: "UYU" } : {};

// Página de uma peça (ViewContent / view_item): base dos anúncios de catálogo e remarketing
export function eventoVerProduto(p: Peca) {
  if (!naoAdmin()) return;
  try {
    w()?.fbq?.("track", "ViewContent", {
      content_ids: [p.sku],
      content_type: "product",
      content_name: p.nome,
      ...comValor(p),
    });
    w()?.gtag?.("event", "view_item", {
      ...comValor(p),
      items: [{ item_id: p.sku, item_name: p.nome, ...(p.valor ? { price: p.valor } : {}) }],
    });
  } catch {
    /* ignora */
  }
}

// Adicionou ao carrinho (AddToCart / add_to_cart)
export function eventoCarrinho(p: Peca) {
  if (!naoAdmin()) return;
  try {
    const q = p.quantidade ?? 1;
    w()?.fbq?.("track", "AddToCart", {
      content_ids: [p.sku],
      content_type: "product",
      content_name: p.nome,
      contents: [{ id: p.sku, quantity: q }],
      ...comValor(p),
    });
    w()?.gtag?.("event", "add_to_cart", {
      ...comValor(p),
      items: [
        { item_id: p.sku, item_name: p.nome, quantity: q, ...(p.valor ? { price: p.valor } : {}) },
      ],
    });
  } catch {
    /* ignora */
  }
}
