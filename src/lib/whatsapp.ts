// +55 (Brasil) 53 9 9942-8130
export const PHONE = "5553999428130";
export const PHONE_DISPLAY = "(53) 99942-8130";

// Usamos api.whatsapp.com/send diretamente (sem passar por wa.me).
// O redirect do wa.me pode ser bloqueado dentro de iframes de preview
// com ERR_BLOCKED_BY_RESPONSE (COOP). O link direto abre normalmente.
function buildUrl(text: string): string {
  return `https://api.whatsapp.com/send?phone=${PHONE}&text=${encodeURIComponent(text)}`;
}

export function whatsappQuoteUrl(product: { sku: string; nome: string }): string {
  const msg =
    `Olá! Gostaria de fazer uma cotação do seguinte produto:\n\n` +
    `*${product.nome}*\n` +
    `SKU: ${product.sku}`;
  return buildUrl(msg);
}

export function whatsappContactUrl(text?: string): string {
  return buildUrl(text ?? "Olá! Gostaria de mais informações.");
}
