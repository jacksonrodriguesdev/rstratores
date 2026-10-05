// Linha automotiva DESLIGADA: o site vende apenas peças e categorias agrícolas.
// Os dados automotivos (tabela `products`, categorias com linha AUTOMOTIVA) continuam no banco.
// Para religar a linha automotiva no site e no admin, basta mudar para `true`.
export const AUTOMOTIVA_ATIVA = false;

export type Linha = "AGRICOLA" | "AUTOMOTIVA";

// Normaliza a linha pedida: com a automotiva desligada, sempre retorna AGRICOLA.
export function linhaPermitida(linha?: string | null): Linha {
  if (AUTOMOTIVA_ATIVA && linha === "AUTOMOTIVA") return "AUTOMOTIVA";
  return "AGRICOLA";
}
