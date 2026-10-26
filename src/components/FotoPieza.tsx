// «Mandá una foto de la pieza»: para quem não sabe o código. Abre por evento
// (window.dispatchEvent(new Event("abrir-foto-pieza"))). Por enquanto o modal está montado no
// site, mas ainda sem formulário: falta o envio da foto (ver pendências da conversa).
export function abrirFotoPieza() {
  window.dispatchEvent(new Event("abrir-foto-pieza"));
}

export function FotoPiezaModal() {
  return null;
}
