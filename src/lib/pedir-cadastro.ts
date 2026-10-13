// Abre o pop-up de cadastro num momento de interesse (não só pelo tempo):
// - carrinho: adicionou uma peça ao carrinho (uma vez por sessão);
// - busca: buscou e não achou a peça ("te avisamos cuando llegue");
// - catalogo: tentou abrir um catálogo que pede conta.
// O PopupAcesso (montado na rota raiz) escuta este evento.
export type MotivoCadastro = "carrinho" | "busca" | "catalogo";
export type PedidoCadastro = {
  motivo: MotivoCadastro;
  termo?: string; // busca sem resultado
  email?: string; // já digitado na página: o pop-up pede o código direto
  destino?: string; // para onde ir depois de entrar (ex.: o catálogo)
};

export const EVENTO_PEDIR_CADASTRO = "agro:pedir-cadastro";

export function pedirCadastro(p: PedidoCadastro) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<PedidoCadastro>(EVENTO_PEDIR_CADASTRO, { detail: p }));
}
