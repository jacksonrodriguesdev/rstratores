// Cubagem e peso cubado (base de logística). Funções puras — servem no navegador e no servidor.
// Medidas sempre em CENTÍMETROS, peso em QUILOS. A base única fica em `cubagem_ref`
// (uma linha por código normalizado) e a média por classe fiscal em `cubagem_ncm`.

// Fator de cubagem = quantos quilos "pesa" 1 m³ para a transportadora. Padrão rodoviário no
// Brasil: 300 kg/m³ (equivale ao divisor 6.000 quando as medidas estão em cm). Configurável
// em `configuracoes` (chave `cubagem_fator`), porque muda de transportadora para transportadora.
export const FATOR_CUBAGEM_PADRAO = 300; // kg por m³

// Faixas de sanidade: descartam lixo e placeholders. O Pellegrino usa 0,01 m (= 1 cm) como "sem
// medida"; por isso o mínimo de dimensão é 1,5 cm (caixa de envio nunca tem lado < 1,5 cm), o que
// elimina os placeholders sem perder medidas reais. Também corta 0.00001 e valores absurdos.
export const LIMITES = {
  pesoMinKg: 0.005,
  pesoMaxKg: 2000,
  dimMinCm: 1.5,
  dimMaxCm: 300,
} as const;

export type Fonte = "MEDIDO" | "CASADO" | "MEDIA_NCM" | "MEDIA_FAMILIA" | "MANUAL";
export type Confianca = "ALTA" | "MEDIA" | "ESTIMADA";

export const CONFIANCA_DA_FONTE: Record<Fonte, Confianca> = {
  MEDIDO: "ALTA",
  MANUAL: "ALTA",
  CASADO: "MEDIA",
  MEDIA_NCM: "ESTIMADA",
  MEDIA_FAMILIA: "ESTIMADA",
};

export const num = (v: unknown): number | null => {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

// Volume em m³ a partir de comprimento × largura × altura em cm.
export function volumeM3(comp_cm?: number | null, larg_cm?: number | null, alt_cm?: number | null) {
  const c = num(comp_cm),
    l = num(larg_cm),
    a = num(alt_cm);
  if (!c || !l || !a || c <= 0 || l <= 0 || a <= 0) return null;
  return (c * l * a) / 1_000_000;
}

// Peso volumétrico (kg) = volume (m³) × fator (kg/m³).
export function pesoVolumetrico(volume_m3: number | null, fator = FATOR_CUBAGEM_PADRAO) {
  return volume_m3 == null ? null : Math.round(volume_m3 * fator * 1000) / 1000;
}

// Peso cubado = o maior entre o peso real e o peso volumétrico (é o que a transportadora cobra).
export function pesoCubado(
  peso_kg: number | null,
  volume_m3: number | null,
  fator = FATOR_CUBAGEM_PADRAO,
) {
  const pv = pesoVolumetrico(volume_m3, fator);
  if (peso_kg == null && pv == null) return null;
  return Math.round(Math.max(peso_kg ?? 0, pv ?? 0) * 1000) / 1000;
}

// Uma dimensão é válida para cubar?
export const dimOk = (cm: number | null) =>
  cm != null && cm >= LIMITES.dimMinCm && cm <= LIMITES.dimMaxCm;
export const pesoOk = (kg: number | null) =>
  kg != null && kg >= LIMITES.pesoMinKg && kg <= LIMITES.pesoMaxKg;
