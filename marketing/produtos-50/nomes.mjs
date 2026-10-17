// Nome do arquivo de cada arte de peça (usado pelo gerador, pelas capas e pelas legendas)
import { TXT, slug } from "./comum.mjs";

export const arquivoPeca = (i, p, idioma) =>
  `${String(i + 1).padStart(2, "0")}_${slug(TXT[idioma].nome(p))}_${p.cod.toLowerCase()}.png`;
