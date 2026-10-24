import { nomeProduto } from "./pecas-es";
import { SITE_URL } from "./site";

// Número de contato (WhatsApp das cotações): +55 (53) 99183-1101.
// PHONE vai no link do WhatsApp: código do país + DDD + número, só dígitos (55 53 991831101).
// A verificação do GitHub (scripts/ci/fumaca.cjs) confere este número no site.
export const PHONE = "5553991831101";
export const PHONE_DISPLAY = "+55 (53) 99183-1101";

// Usamos api.whatsapp.com/send diretamente (sem passar por wa.me).
// O redirect do wa.me pode ser bloqueado dentro de iframes de preview
// com ERR_BLOCKED_BY_RESPONSE (COOP). O link direto abre normalmente.
function buildUrl(text: string): string {
  return `https://api.whatsapp.com/send?phone=${PHONE}&text=${encodeURIComponent(text)}`;
}

// Mensagem em espanhol para o cliente; o nome original em português e o link da peça
// vão junto para a equipe identificar a peça sem dúvida.
// idioma "pt": cliente do Brasil (página /pt), mensagem e link em português.
export function whatsappQuoteUrl(
  product: { sku: string; nome: string; nome_es?: string | null },
  idioma: "es" | "pt" = "es",
): string {
  if (idioma === "pt") {
    const link = `${SITE_URL}/pt/produto/${encodeURIComponent(product.sku)}`;
    return buildUrl(
      `Olá! Quero orçamento desta peça (cliente do Brasil):\n\n*${product.nome}*\nCódigo: ${product.sku}\n${link}`,
    );
  }
  const es = nomeProduto(product);
  const link = `${SITE_URL}/produto/${encodeURIComponent(product.sku)}`;
  const msg =
    `¡Hola! Quiero cotizar este repuesto:\n\n` +
    `*${es}*\n` +
    (es !== product.nome ? `(${product.nome})\n` : "") +
    `Código: ${product.sku}\n${link}`;
  return buildUrl(msg);
}

export function whatsappContactUrl(text?: string): string {
  return buildUrl(text ?? "¡Hola! Quiero más información.");
}
