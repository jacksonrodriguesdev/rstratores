// Abre o pop-up de cadastro num momento de interesse (não só pelo tempo):
// - carrinho: adicionou uma peça ao carrinho (uma vez por sessão);
// - busca: buscou e não achou a peça ("te avisamos cuando llegue");
// - catalogo: tentou abrir um catálogo que pede conta;
// - whatsapp: pediu preço / mandou o pedido pelo WhatsApp (exige cadastro: sem conta, o pop-up
//   aparece e o WhatsApp só abre depois de entrar; com o pop-up desligado no admin, abre direto).
// O PopupAcesso (montado na rota raiz) escuta este evento.
import { eventoDoLinkWhatsapp } from "./eventos";

export type MotivoCadastro = "carrinho" | "busca" | "catalogo" | "whatsapp" | "cotizacao";
export type PedidoCadastro = {
  motivo: MotivoCadastro;
  termo?: string; // busca sem resultado
  email?: string; // já digitado na página: o pop-up pede o código direto
  destino?: string; // para onde ir depois de entrar (o catálogo, ou o link do WhatsApp)
  aoAbrir?: () => void; // whatsapp: o que fazer depois de abrir (ex.: esvaziar o carrinho)
};

export const EVENTO_PEDIR_CADASTRO = "agro:pedir-cadastro";

export function pedirCadastro(p: PedidoCadastro) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<PedidoCadastro>(EVENTO_PEDIR_CADASTRO, { detail: p }));
}

// Abre o WhatsApp e registra o pedido (Lead no Pixel, na API de Conversões e no painel).
// Chamar direto de um clique: navegadores bloqueiam window.open fora de um clique.
export function abrirWhatsapp(url: string, aoAbrir?: () => void) {
  eventoDoLinkWhatsapp(url);
  window.open(url, "_blank", "noopener");
  aoAbrir?.();
}

// Pedir preço pelo WhatsApp: o pop-up decide (logado abre na hora; sem conta, pede o cadastro)
export function pedirPrecoWhatsapp(url: string, aoAbrir?: () => void) {
  pedirCadastro({ motivo: "whatsapp", destino: url, aoAbrir });
}
