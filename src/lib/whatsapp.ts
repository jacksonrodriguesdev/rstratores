// +55 (Brasil) 53 9 9942-8130
export const PHONE = "5553999428130";
export const PHONE_DISPLAY = "(53) 99942-8130";

export function whatsappQuoteUrl(product: { sku: string; nome: string }): string {
  const msg =
    `Olá! Gostaria de fazer uma cotação do seguinte produto:\n\n` +
    `*${product.nome}*\n` +
    `SKU: ${product.sku}`;
  return `https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`;
}

export function whatsappContactUrl(text?: string): string {
  const msg = text ?? "Olá! Gostaria de mais informações.";
  return `https://wa.me/${PHONE}?text=${encodeURIComponent(msg)}`;
}
