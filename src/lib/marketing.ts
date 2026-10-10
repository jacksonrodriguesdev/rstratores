// Google Analytics 4 e Meta Pixel (Facebook/Instagram), ligados só quando os IDs existem.
// GA4 da loja: G-M8WS1HTBES (o ID de medição é público). VITE_GA4_ID na Hostinger substitui.
// VITE_META_PIXEL_ID (só números) liga o Meta Pixel. Os valores entram no build: faça deploy de novo.
export const GA4_ID = (import.meta.env.VITE_GA4_ID as string | undefined)?.trim() || "G-M8WS1HTBES";
export const META_PIXEL_ID = (import.meta.env.VITE_META_PIXEL_ID as string | undefined)?.trim() || "";

// Só letras, números e hífen: o valor vai dentro de um <script>
const seguro = (s: string) => /^[A-Za-z0-9-]+$/.test(s);

export function scriptsMarketing() {
  const scripts: Array<{ src?: string; async?: boolean; children?: string }> = [];
  // O painel /admin não entra nas estatísticas do Analytics
  if (GA4_ID && seguro(GA4_ID)) {
    scripts.push({ src: `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`, async: true });
    scripts.push({
      children: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());if(!location.pathname.startsWith('/admin'))gtag('config','${GA4_ID}');`,
    });
  }
  if (META_PIXEL_ID && seguro(META_PIXEL_ID)) {
    scripts.push({
      children: `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${META_PIXEL_ID}');fbq('track','PageView');`,
    });
  }
  return scripts;
}

// Contato pelo WhatsApp = conversão (lead) nas duas plataformas
export function conversaoWhatsapp(detalhe: string) {
  if (typeof window === "undefined") return;
  const w = window as any;
  try {
    w.gtag?.("event", "generate_lead", { method: "whatsapp", item_id: detalhe });
    w.fbq?.("track", "Contact", { content_name: detalhe });
  } catch {
    /* bloqueador de anúncios: ignora */
  }
}

// Busca no site
export function eventoBusca(termo: string) {
  if (typeof window === "undefined") return;
  const w = window as any;
  try {
    w.gtag?.("event", "search", { search_term: termo });
    w.fbq?.("track", "Search", { search_string: termo });
  } catch {
    /* ignora */
  }
}
