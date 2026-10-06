// Eventos de interesse do cliente (cliques no WhatsApp, buscas). Vão para a mesma tabela das
// visitas (site_visits) com o caminho "/_evento/<tipo>/<dado>", sem precisar mudar o banco.
// O painel lê em Admin > Interesse dos clientes (src/lib/interesse.server.ts).
import { conversaoWhatsapp, eventoBusca } from "./marketing";

export const PREFIXO_EVENTO = "/_evento/";

export function registrarEvento(tipo: "whatsapp" | "busca" | "cotacao", dado: string) {
  if (typeof window === "undefined") return;
  // Também avisa o Google Analytics / Meta Pixel, quando configurados
  if (tipo === "busca") eventoBusca(dado.slice(dado.indexOf("|") + 1));
  else conversaoWhatsapp(dado);
  try {
    fetch("/api/public/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: `${PREFIXO_EVENTO}${tipo}/${encodeURIComponent(dado.slice(0, 300))}`,
        referrer: window.location.pathname,
      }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* sem rede: o evento se perde, a navegação segue */
  }
}

// Cliques em qualquer link do WhatsApp do site. O código da peça vem da própria mensagem
// ("Código: X" na cotação de uma peça, "Cód: X" em cada linha do carrinho).
export function eventoDoLinkWhatsapp(href: string) {
  let texto = "";
  try {
    texto = new URL(href).searchParams.get("text") ?? "";
  } catch {
    return;
  }
  const codigos = [...texto.matchAll(/C[óo]d(?:igo)?:\s*([^\s\n]+)/g)].map((m) => m[1]);
  if (codigos.length > 1) registrarEvento("cotacao", codigos.join(","));
  else if (codigos.length === 1) registrarEvento("whatsapp", codigos[0]);
  else registrarEvento("whatsapp", `contato:${window.location.pathname}`);
}
