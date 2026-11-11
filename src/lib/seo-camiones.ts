// SEO da linha de caminhões para o Uruguai: páginas por cidade (/repuestos-camiones/<ciudad>),
// com frases-chave de montadora × grupo × peça × cidade. Reaproveita as cidades do Uruguai de
// locais-seo.ts e manda o tráfego para a loja integrada (/loja?linha=CAMINHOES).
import { LOCAIS_SEO, type LocalSeo } from "./locais-seo";

// Cidades/departamentos do Uruguai (as mesmas da linha agrícola).
export const LOCAIS_CAMION: LocalSeo[] = LOCAIS_SEO.filter((l) => l.pais === "UY");
export const localCamionPorSlug = (s: string) => LOCAIS_CAMION.find((l) => l.slug === s) ?? null;

// Montadoras (valor em `marca` no catálogo = filtro da loja). rotulo = como aparece no texto.
export const MONTADORAS_CAMION: { marca: string; rotulo: string }[] = [
  { marca: "MERCEDES-BENZ", rotulo: "Mercedes-Benz" },
  { marca: "SCANIA", rotulo: "Scania" },
  { marca: "VOLVO", rotulo: "Volvo" },
  { marca: "VOLKSWAGEN // MAN", rotulo: "Volkswagen / MAN" },
  { marca: "IVECO", rotulo: "Iveco" },
  { marca: "FORD", rotulo: "Ford" },
  { marca: "DAF", rotulo: "DAF" },
  { marca: "AGRALE", rotulo: "Agrale" },
  { marca: "CUMMINS", rotulo: "Cummins" },
  { marca: "MWM", rotulo: "MWM" },
  { marca: "INTERNATIONAL", rotulo: "International" },
];

// Grupos (valor em `categoria` no catálogo = filtro da loja). es = rótulo em espanhol.
export const GRUPOS_CAMION: { cat: string; es: string }[] = [
  { cat: "MOTORES", es: "Motor" },
  { cat: "SISTEMA DE FREIO", es: "Frenos" },
  { cat: "CAIXAS DE CÂMBIO", es: "Caja de cambios" },
  { cat: "CABINE", es: "Cabina" },
  { cat: "PEÇAS ELÉTRICAS", es: "Piezas eléctricas" },
  { cat: "EIXO TRASEIRO", es: "Eje trasero" },
  { cat: "DIFERENCIAL", es: "Diferencial" },
  { cat: "EIXO DIANTEIRO", es: "Eje delantero" },
  { cat: "EMBREAGEM", es: "Embrague" },
  { cat: "DIREÇÃO", es: "Dirección" },
  { cat: "CARDÃ", es: "Cardán" },
  { cat: "CHASSI", es: "Chasis" },
  { cat: "ELEMENTOS FILTROS", es: "Filtros" },
  { cat: "SUSPENSÃO", es: "Suspensión" },
];

// Peças long-tail (frases-chave que as pessoas procuram no Google).
export const PIEZAS_CAMION: string[] = [
  "filtro de aceite",
  "filtro de combustible",
  "filtro de aire",
  "filtro separador de agua",
  "pastillas de freno",
  "lona de freno",
  "cilindro de freno",
  "válvula de freno",
  "turbina",
  "bomba de agua",
  "bomba de aceite",
  "bomba de combustible",
  "radiador",
  "intercooler",
  "amortiguador",
  "muelle",
  "resorte delantero",
  "cardán",
  "cruceta",
  "disco de embrague",
  "plato de embrague",
  "collarín de embrague",
  "retén de cubo",
  "rodamiento de rueda",
  "cubo de rueda",
  "corona y piñón",
  "satélite de diferencial",
  "terminal de dirección",
  "muñón de dirección",
  "junta de motor",
  "kit de junta",
  "camisa y pistón",
  "cojinete de biela",
  "bomba de dirección hidráulica",
  "compresor de aire",
  "válvula secadora de aire",
  "faro delantero",
  "farol trasero",
  "espejo retrovisor",
  "parachoques",
];

// Frases-chave de uma cidade (para o conteúdo da página). Combina montadoras, grupos e peças.
export function frasesCamion(nome: string): string[] {
  const frases: string[] = [
    `repuestos de camiones en ${nome}`,
    `repuestos para camiones en ${nome}`,
    `autopartes de camión en ${nome}`,
    `repuestos para camión importados en ${nome}`,
    `repuestos de línea pesada en ${nome}`,
  ];
  for (const m of MONTADORAS_CAMION) {
    frases.push(`repuestos para ${m.rotulo} en ${nome}`);
    frases.push(`repuestos de camión ${m.rotulo} ${nome}`);
  }
  for (const g of GRUPOS_CAMION) frases.push(`${g.es.toLowerCase()} de camión en ${nome}`);
  for (const p of PIEZAS_CAMION) frases.push(`${p} para camión en ${nome}`);
  // Combos montadora × grupo (long-tail de alto valor)
  for (const m of MONTADORAS_CAMION.slice(0, 7))
    for (const g of GRUPOS_CAMION.slice(0, 8))
      frases.push(`${g.es.toLowerCase()} para ${m.rotulo} en ${nome}`);
  return frases;
}

// Quantas frases-chave o site cobre no total (montadora/grupo/peça × cidades).
export function totalFrasesChave(): number {
  return LOCAIS_CAMION.reduce((s, l) => s + frasesCamion(l.nome).length, 0);
}

export function tituloCamion(l: LocalSeo): string {
  if (l.tipo === "pais") return "Repuestos de camiones multimarca en Uruguay";
  return `Repuestos de camiones en ${l.nome}, Uruguay`;
}

export function descripcionCamion(l: LocalSeo, total: number): string {
  const marcas = "Mercedes-Benz, Scania, Volvo, Volkswagen, MAN, Iveco, Ford y DAF";
  const base =
    l.tipo === "pais"
      ? `Más de ${total.toLocaleString("es-UY")} repuestos para camiones multimarca en Uruguay`
      : `Repuestos para camiones en ${l.nome} y todo Uruguay`;
  return `${base}: motor, frenos, caja de cambios, cabina, suspensión y eléctrica para ${marcas}. Con código y aplicación. Cotizá por WhatsApp.`;
}

// Link para a loja já filtrada na linha de caminhões.
export const urlCamion = (p?: { marca?: string; categoria?: string }) => {
  const qs = new URLSearchParams({ linha: "CAMINHOES" });
  if (p?.marca) qs.set("marca", p.marca);
  if (p?.categoria) qs.set("categoria", p.categoria);
  return `/loja?${qs.toString()}`;
};
