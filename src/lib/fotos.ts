// Fotos que o site NÃO usa (navegador, e-mail, Google, Estúdio, anúncios):
// - logo do fornecedor (redeparts), usado como foto provisória;
// - link externo da agrotrator.com.br: as fotos de lá já estão copiadas no nosso servidor
//   (uploads/agrotrator/…). Uma que ainda aponte para lá fica como «sem foto» até ser copiada
//   (Admin → Produtos → Fotos do agrotrator), para o site não ter nenhuma ligação com aquele site.
export const fotoDeFora = (u: string | null | undefined) =>
  !!u && /^(https?:)?\/\/[^/]*agrotrator/i.test(u.trim());
export const fotoInvalida = (u: string | null | undefined) =>
  !u || /redeparts/i.test(u) || fotoDeFora(u);
