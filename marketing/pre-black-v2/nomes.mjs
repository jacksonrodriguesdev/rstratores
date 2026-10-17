// Nome do arquivo de cada card de peça (cards, capas, roteiro dos carrosséis e legendas)
import { TXT, slug } from "./comum.mjs";

export const arquivoCard = (i, p, idioma) =>
  `${String(i + 1).padStart(2, "0")}_${slug(TXT[idioma].nome(p))}_${p.cod.toLowerCase()}.png`;
