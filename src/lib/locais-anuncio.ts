// Classificação do visitante pelo local onde anunciamos (departamento do Uruguai, RS, outros).
// Usada pelo resumo diário das análises e pelo Criador de anúncios.
// Perfil agrícola de cada departamento do Uruguai (conhecimento geral, não dado do site)
export const PERFIL_DEPTO: Record<string, { perfil: string; maquinas: string }> = {
  Artigas: { perfil: "Arroz e pecuária", maquinas: "colheitadeiras arrozeiras, tratores médios" },
  Canelones: {
    perfil: "Granja, horta, leite",
    maquinas: "tratores pequenos e médios, implementos",
  },
  "Cerro Largo": { perfil: "Arroz e pecuária", maquinas: "colheitadeiras arrozeiras, tratores" },
  Colonia: { perfil: "Leite e agricultura", maquinas: "tratores, misturadores, enfardadeiras" },
  Durazno: { perfil: "Pecuária e agricultura", maquinas: "tratores médios, enfardadeiras" },
  Flores: { perfil: "Agricultura e pecuária", maquinas: "tratores, plantadeiras" },
  Florida: { perfil: "Leite e pecuária", maquinas: "tratores médios, enfardadeiras" },
  Lavalleja: { perfil: "Pecuária e florestal", maquinas: "tratores médios" },
  Maldonado: { perfil: "Pecuária e serviços", maquinas: "tratores pequenos e médios" },
  Montevideo: {
    perfil: "Oficinas, revendas e empresas",
    maquinas: "compra para revenda e manutenção",
  },
  Paysandú: {
    perfil: "Agricultura de grãos",
    maquinas: "colheitadeiras, plantadeiras, tratores grandes",
  },
  "Río Negro": {
    perfil: "Agricultura de grãos e florestal",
    maquinas: "colheitadeiras, tratores grandes",
  },
  Rivera: { perfil: "Pecuária e florestal (fronteira)", maquinas: "tratores médios" },
  Rocha: {
    perfil: "Arroz e pecuária (nossa base, Chuy)",
    maquinas: "colheitadeiras arrozeiras, tratores",
  },
  Salto: { perfil: "Citros, horta e pecuária", maquinas: "tratores pequenos e médios" },
  "San José": { perfil: "Leite e agricultura", maquinas: "tratores, enfardadeiras, misturadores" },
  Soriano: {
    perfil: "Agricultura de grãos (maior polo)",
    maquinas: "colheitadeiras, plantadeiras, tratores grandes",
  },
  Tacuarembó: { perfil: "Pecuária e florestal", maquinas: "tratores médios" },
  "Treinta y Tres": { perfil: "Arroz e pecuária", maquinas: "colheitadeiras arrozeiras, tratores" },
};
export const DEPTOS = Object.keys(PERFIL_DEPTO);
export const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export const DEPTO_POR_CHAVE = new Map(DEPTOS.map((d) => [semAcento(d), d]));

// Onde está o visitante, no nível em que anunciamos
export type Local = { chave: string; nome: string; pais: "UY" | "RS" | "BR" | "OUTRO" | "?" };
export function localDe(l: {
  region: string | null;
  city: string | null;
  country_code: string | null;
}): Local {
  const cc = (l.country_code || "").toUpperCase();
  const reg = (l.region || "")
    .replace(/^Departamento de /i, "")
    .replace(/ Department$/i, "")
    .trim();
  if (cc === "UY") {
    const d = DEPTO_POR_CHAVE.get(semAcento(reg)) ?? (reg || "Uruguai (sem departamento)");
    return { chave: `UY:${d}`, nome: d, pais: "UY" };
  }
  if (cc === "BR")
    return /grande do sul/i.test(reg)
      ? { chave: "RS", nome: "Rio Grande do Sul", pais: "RS" }
      : { chave: "BR", nome: "Brasil (outros estados)", pais: "BR" };
  if (cc) return { chave: "OUTRO", nome: "Outros países", pais: "OUTRO" };
  return { chave: "?", nome: "Sem localização", pais: "?" };
}
