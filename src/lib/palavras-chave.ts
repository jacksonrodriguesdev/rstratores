// Estratégia de palavras-chave (SEO + Google Ads), estilo grandes marketplaces: cobrir cada
// combinação que o cliente digita (local × marca × categoria × modelo × "maior/distribuidora/online")
// e ligar cada termo a uma página do site feita para ele. Código puro (roda no admin).
import { MARCAS_SEO, CATEGORIAS_SEO } from "./seo-paginas";
import { LOCAIS_SEO, nomeLocal, type LocalSeo } from "./locais-seo";

export type Grupo = "Autoridade" | "Local" | "Marca" | "Categoria" | "Marca + categoria" | "Modelo" | "Fronteira" | "Buscas reais" | "Conteúdo";
export type Palavra = {
  termo: string;
  idioma: "es" | "pt";
  mercado: "UY" | "RS";
  grupo: Grupo;
  prioridade: 1 | 2 | 3;
  correspondencia: "Exata" | "Frase" | "Ampla";
  destino: string; // caminho no site ("" = criar conteúdo)
  campanha: string;
  grupoAnuncio: string;
  uso: "SEO + Ads" | "SEO" | "Ads";
};

// Locais que o dono citou como prioridade
const LOCAIS_PRIORIDADE = new Set(["uruguay", "rocha", "montevideo", "chuy", "treinta-y-tres", "rivera", "este-de-uruguay", "rio-grande-do-sul", "extremo-sul", "zona-sul-do-rs", "chui", "santa-vitoria-do-palmar", "pelotas"]);
const MODELOS: Record<string, { curto: string[]; modelos: string[] }> = {
  "Massey Ferguson": { curto: ["massey ferguson", "massey", "mf"], modelos: ["265", "275", "283", "290", "292", "297", "4275", "4283", "4290", "4292", "5275", "5290", "5310", "6360"] },
  Valtra: { curto: ["valtra", "valmet"], modelos: ["685", "785", "885", "985", "bm 100", "bm 110", "bh 140", "bh 160", "bh 180", "a950"] },
  "New Holland": { curto: ["new holland"], modelos: ["tl 75", "tl 95", "tm 135", "tm 7020", "ts 90", "tt 3840", "7630", "8030"] },
  "John Deere": { curto: ["john deere"], modelos: ["5705", "5725", "6110j", "6405", "6605", "7505", "1175", "1450"] },
  "Case IH": { curto: ["case"], modelos: ["maxxum", "farmall", "puma", "magnum", "axial flow"] },
  Ford: { curto: ["ford"], modelos: ["4600", "5600", "6600", "6610", "7610", "7630"] },
  Agrale: { curto: ["agrale"], modelos: ["4100", "4118", "4230", "5075"] },
};
const PECAS_MODELO = { es: ["repuestos", "embrague", "bomba hidraulica", "kit de motor", "filtros"], pt: ["peças", "embreagem", "bomba hidráulica", "kit motor", "filtros"] };

const baixo = (s: string) => s.toLowerCase().normalize("NFC");
const pt = (c: string) => `/pt${c === "/" ? "" : c}`;

export function gerarPalavras(opc: { buscasReais?: Array<{ termo: string; vezes: number }> } = {}): Palavra[] {
  const out: Palavra[] = [];
  const vistos = new Set<string>();
  const add = (p: Palavra) => {
    const k = `${p.idioma}|${baixo(p.termo)}`;
    if (vistos.has(k)) return;
    vistos.add(k);
    out.push({ ...p, termo: baixo(p.termo).replace(/\s+/g, " ").trim() });
  };
  const UY = LOCAIS_SEO.filter((l) => l.pais === "UY");
  const RS = LOCAIS_SEO.filter((l) => l.pais === "RS");
  const prioLocal = (l: LocalSeo): 1 | 2 | 3 => (LOCAIS_PRIORIDADE.has(l.slug) ? 1 : l.tipo === "departamento" || l.tipo === "regiao" || l.tipo === "estado" ? 2 : 3);

  // ---------------- 1. Autoridade ("o maior", distribuidora, loja online) — país inteiro
  const AUT_ES = [
    "mayor tienda de repuestos agricolas de uruguay",
    "mayor ecommerce de repuestos agricolas de uruguay",
    "mayor tienda online de repuestos agricolas",
    "mayor catalogo de repuestos agricolas online",
    "mayor distribuidora de repuestos agricolas uruguay",
    "mayor tienda de repuestos para tractores uruguay",
    "la tienda con mas repuestos agricolas online",
    "tienda online de repuestos agricolas uruguay",
    "ecommerce repuestos agricolas",
    "repuestos agricolas online uruguay",
    "comprar repuestos agricolas online",
    "repuestos agricolas uruguay",
    "repuestos para tractores uruguay",
    "repuestos tractores uruguay",
    "repuestos para maquinaria agricola uruguay",
    "repuestos de cosechadoras uruguay",
    "distribuidora de repuestos agricolas uruguay",
    "distribuidores de repuestos agricolas",
    "mayorista de repuestos agricolas uruguay",
    "importador de repuestos agricolas uruguay",
    "casa de repuestos agricolas",
    "repuestera agricola",
    "repuestos agricolas con envio a todo el pais",
    "repuestos agricolas precios",
    "repuestos agricolas baratos uruguay",
    "repuestos agricolas originales y alternativos",
    "repuestos para tractores con envio a todo uruguay",
    "mayor tienda de repuestos agricolas de la region",
    "mayor tienda de repuestos agricolas del este",
    "mayor tienda de repuestos agricolas del sur de uruguay",
  ];
  for (const t of AUT_ES)
    add({ termo: t, idioma: "es", mercado: "UY", grupo: "Autoridade", prioridade: /mayor|distribuid|tienda online|ecommerce/.test(t) ? 1 : 2, correspondencia: "Frase", destino: /distribuid|mayorista|importador/.test(t) ? "/cotizar" : "/", campanha: "UY | Pesquisa | Institucional", grupoAnuncio: /distribuid|mayorista|importador/.test(t) ? "Distribuidora" : /mayor|la tienda con/.test(t) ? "Maior loja online" : "Loja online", uso: "SEO + Ads" });
  const AUT_PT = [
    "maior loja de peças agrícolas do rio grande do sul",
    "maior ecommerce de peças agrícolas do rs",
    "maior loja online de peças agrícolas",
    "maior loja de peças de trator do rs",
    "maior loja de peças agrícolas do extremo sul",
    "maior loja de peças agrícolas da região sul",
    "maior loja de peças agrícolas da zona sul",
    "maior distribuidora de peças agrícolas do rs",
    "loja com mais peças agrícolas online",
    "maior catálogo de peças agrícolas online",
    "loja online de peças agrícolas",
    "ecommerce de peças agrícolas",
    "peças agrícolas online",
    "comprar peças agrícolas online",
    "peças agrícolas rio grande do sul",
    "peças para trator rio grande do sul",
    "peças de trator rs",
    "peças para colheitadeira rs",
    "distribuidora de peças agrícolas rio grande do sul",
    "distribuidora de peças agrícolas",
    "atacado de peças agrícolas rs",
    "casa de peças agrícolas",
    "peças agrícolas com entrega no rs",
    "peças agrícolas preço",
    "peças agrícolas baratas",
  ];
  for (const t of AUT_PT)
    add({ termo: t, idioma: "pt", mercado: "RS", grupo: "Autoridade", prioridade: /maior|distribuid|loja online|ecommerce/.test(t) ? 1 : 2, correspondencia: "Frase", destino: /rio grande do sul|rs\b|extremo sul|região sul|zona sul/.test(t) ? pt(`/repuestos-agricolas/${/extremo/.test(t) ? "extremo-sul" : /zona sul/.test(t) ? "zona-sul-do-rs" : "rio-grande-do-sul"}`) : pt("/"), campanha: "RS | Pesquisa | Institucional", grupoAnuncio: /distribuid|atacado/.test(t) ? "Distribuidora" : /maior|mais peças/.test(t) ? "Maior loja online" : "Loja online", uso: "SEO + Ads" });

  // ---------------- 2. Local × termos (cada local tem sua página)
  const LOC_ES = (n: string) => [
    `repuestos agricolas ${n}`,
    `repuestos agricolas en ${n}`,
    `repuestos para tractores ${n}`,
    `repuestos tractor ${n}`,
    `repuestos de maquinaria agricola ${n}`,
    `casa de repuestos agricolas ${n}`,
    `venta de repuestos agricolas ${n}`,
    `distribuidora de repuestos agricolas ${n}`,
    `mayor tienda de repuestos agricolas de ${n}`,
    `mayor ecommerce de repuestos agricolas de ${n}`,
    `repuestos de cosechadoras ${n}`,
    `envio de repuestos agricolas a ${n}`,
  ];
  const LOC_PT = (n: string) => [
    `peças agrícolas ${n}`,
    `peças agrícolas em ${n}`,
    `peças para trator ${n}`,
    `peças de trator em ${n}`,
    `peças para colheitadeira ${n}`,
    `loja de peças agrícolas ${n}`,
    `loja de peças agrícolas em ${n}`,
    `distribuidora de peças agrícolas ${n}`,
    `maior loja de peças agrícolas de ${n}`,
    `maior ecommerce de peças agrícolas de ${n}`,
    `autopeças agrícolas ${n}`,
    `peças de máquinas agrícolas ${n}`,
  ];
  for (const l of UY) {
    const n = baixo(nomeLocal(l, "es"));
    const lista = l.tipo === "pais" ? [] : LOC_ES(n);
    lista.forEach((t, i) =>
      add({ termo: t, idioma: "es", mercado: "UY", grupo: "Local", prioridade: i < 4 ? prioLocal(l) : (Math.min(3, prioLocal(l) + 1) as 1 | 2 | 3), correspondencia: "Frase", destino: `/repuestos-agricolas/${l.slug}`, campanha: "UY | Pesquisa | Local", grupoAnuncio: l.nome, uso: "SEO + Ads" }),
    );
  }
  for (const l of RS) {
    const n = baixo(l.nome) === "rio grande do sul" ? "rio grande do sul" : baixo(l.nome);
    LOC_PT(n).forEach((t, i) =>
      add({ termo: t, idioma: "pt", mercado: "RS", grupo: "Local", prioridade: i < 4 ? prioLocal(l) : (Math.min(3, prioLocal(l) + 1) as 1 | 2 | 3), correspondencia: "Frase", destino: pt(`/repuestos-agricolas/${l.slug}`), campanha: "RS | Pesquisa | Local", grupoAnuncio: l.nome, uso: "SEO + Ads" }),
    );
  }
  // Brasileiro procurando peças no Uruguai/fronteira
  const FRONT = [
    "peças agrícolas no uruguai",
    "peças de trator no uruguai",
    "comprar peças agrícolas no uruguai",
    "peças agrícolas uruguai preço",
    "peças agrícolas chuí",
    "peças agrícolas chuy",
    "loja de peças agrícolas na fronteira",
    "peças de trator na fronteira com o uruguai",
    "peças agrícolas santa vitória do palmar",
    "peças de trator mais baratas no uruguai",
  ];
  for (const t of FRONT) add({ termo: t, idioma: "pt", mercado: "RS", grupo: "Fronteira", prioridade: 1, correspondencia: "Frase", destino: pt(/santa vit/.test(t) ? "/repuestos-agricolas/santa-vitoria-do-palmar" : "/repuestos-agricolas/chui"), campanha: "RS | Pesquisa | Fronteira", grupoAnuncio: "Comprar na fronteira", uso: "SEO + Ads" });
  for (const t of ["repuestos agricolas chuy", "repuestos tractor chuy", "repuestos agricolas frontera brasil", "repuestos agricolas rocha chuy"])
    add({ termo: t, idioma: "es", mercado: "UY", grupo: "Fronteira", prioridade: 1, correspondencia: "Frase", destino: "/repuestos-agricolas/chuy", campanha: "UY | Pesquisa | Local", grupoAnuncio: "Chuy", uso: "SEO + Ads" });

  // ---------------- 3. Marca
  for (const m of MARCAS_SEO) {
    const nm = baixo(m.marca);
    const curtos = MODELOS[m.marca]?.curto ?? [nm];
    const es = [`repuestos ${nm}`, `repuestos ${nm} uruguay`, `repuestos tractor ${nm}`, `repuestos para tractor ${nm}`, `piezas ${nm}`, `repuestos ${nm} precio`, `distribuidor repuestos ${nm} uruguay`, ...curtos.filter((c) => c !== nm).map((c) => `repuestos ${c}`)];
    es.forEach((t, i) => add({ termo: t, idioma: "es", mercado: "UY", grupo: "Marca", prioridade: i < 3 ? 1 : 2, correspondencia: i === 0 || i === 1 ? "Exata" : "Frase", destino: `/repuestos/${m.slug}`, campanha: "UY | Pesquisa | Marcas", grupoAnuncio: m.marca, uso: "SEO + Ads" }));
    const p = [`peças ${nm}`, `peças ${nm} rs`, `peças trator ${nm}`, `peças para trator ${nm}`, `peças ${nm} rio grande do sul`, `peças ${nm} preço`, ...curtos.filter((c) => c !== nm).map((c) => `peças ${c}`)];
    p.forEach((t, i) => add({ termo: t, idioma: "pt", mercado: "RS", grupo: "Marca", prioridade: i < 3 ? 1 : 2, correspondencia: i === 0 ? "Exata" : "Frase", destino: pt(`/repuestos/${m.slug}`), campanha: "RS | Pesquisa | Marcas", grupoAnuncio: m.marca, uso: "SEO + Ads" }));
  }

  // ---------------- 4. Categoria e 5. Marca + categoria
  for (const c of CATEGORIAS_SEO) {
    if (c.categoria === "Outros Componentes") continue;
    const ces = baixo(c.nome.split(" y ")[0]);
    const cpt = baixo(c.categoria.split(" e ")[0]);
    for (const t of [`${ces} para tractor`, `${ces} tractor uruguay`, `${ces} para maquinaria agricola`])
      add({ termo: t, idioma: "es", mercado: "UY", grupo: "Categoria", prioridade: 2, correspondencia: "Frase", destino: `/repuestos/${c.slug}`, campanha: "UY | Pesquisa | Categorias", grupoAnuncio: c.nome, uso: "SEO + Ads" });
    for (const t of [`${cpt} para trator`, `${cpt} trator rs`, `${cpt} para máquinas agrícolas`])
      add({ termo: t, idioma: "pt", mercado: "RS", grupo: "Categoria", prioridade: 2, correspondencia: "Frase", destino: pt(`/repuestos/${c.slug}`), campanha: "RS | Pesquisa | Categorias", grupoAnuncio: c.categoria, uso: "SEO + Ads" });
    for (const m of MARCAS_SEO) {
      const nm = baixo(m.marca);
      add({ termo: `${ces} ${nm}`, idioma: "es", mercado: "UY", grupo: "Marca + categoria", prioridade: 2, correspondencia: "Frase", destino: `/repuestos/${m.slug}/${c.slug}`, campanha: "UY | Pesquisa | Marcas", grupoAnuncio: `${m.marca} · ${c.nome}`, uso: "SEO + Ads" });
      add({ termo: `${cpt} ${nm}`, idioma: "pt", mercado: "RS", grupo: "Marca + categoria", prioridade: 3, correspondencia: "Frase", destino: pt(`/repuestos/${m.slug}/${c.slug}`), campanha: "RS | Pesquisa | Marcas", grupoAnuncio: `${m.marca} · ${c.categoria}`, uso: "SEO + Ads" });
    }
  }

  // ---------------- 6. Modelo (cauda longa: alta intenção de compra)
  for (const [marca, { curto, modelos }] of Object.entries(MODELOS)) {
    const prefixo = curto[curto.length - 1];
    for (const mod of modelos) {
      const nome = `${prefixo} ${mod}`;
      PECAS_MODELO.es.forEach((peca, i) =>
        add({ termo: `${peca} ${nome}`, idioma: "es", mercado: "UY", grupo: "Modelo", prioridade: i === 0 ? 2 : 3, correspondencia: "Frase", destino: `/loja?q=${encodeURIComponent(`${marca.split(" ")[0]} ${mod}`)}`, campanha: "UY | Pesquisa | Modelos", grupoAnuncio: `${marca} ${mod.toUpperCase()}`, uso: "Ads" }),
      );
      PECAS_MODELO.pt.slice(0, 3).forEach((peca, i) =>
        add({ termo: `${peca} ${nome}`, idioma: "pt", mercado: "RS", grupo: "Modelo", prioridade: i === 0 ? 2 : 3, correspondencia: "Frase", destino: pt(`/loja?q=${encodeURIComponent(`${marca.split(" ")[0]} ${mod}`)}`), campanha: "RS | Pesquisa | Modelos", grupoAnuncio: `${marca} ${mod.toUpperCase()}`, uso: "Ads" }),
      );
    }
  }

  // ---------------- 7. Conteúdo (perguntas: atraem tráfego orgânico; precisam de artigo/FAQ)
  const CONT_ES = [
    "como saber el codigo de un repuesto de tractor",
    "cada cuanto cambiar los filtros del tractor",
    "sintomas de embrague gastado tractor",
    "por que pierde fuerza el hidraulico del tractor",
    "como preparar la cosechadora para la zafra",
    "mantenimiento de tractor antes de la siembra",
  ];
  for (const t of CONT_ES) add({ termo: t, idioma: "es", mercado: "UY", grupo: "Conteúdo", prioridade: 3, correspondencia: "Ampla", destino: "", campanha: "SEO | Artigos", grupoAnuncio: "Guias", uso: "SEO" });
  const CONT_PT = ["como saber o código de uma peça de trator", "quando trocar os filtros do trator", "sintomas de embreagem gasta no trator", "como preparar a colheitadeira para a safra"];
  for (const t of CONT_PT) add({ termo: t, idioma: "pt", mercado: "RS", grupo: "Conteúdo", prioridade: 3, correspondencia: "Ampla", destino: "", campanha: "SEO | Artigos", grupoAnuncio: "Guias", uso: "SEO" });

  // ---------------- 8. Buscas reais do site (o que os clientes já digitam)
  for (const b of opc.buscasReais ?? []) {
    if (b.termo.length < 3) continue;
    const idioma = /ç|ã|õ|peça|trator|colheitadeira|rolamento|embreagem/.test(b.termo) ? "pt" : "es";
    add({ termo: b.termo, idioma, mercado: idioma === "pt" ? "RS" : "UY", grupo: "Buscas reais", prioridade: b.vezes >= 3 ? 1 : 2, correspondencia: "Frase", destino: `${idioma === "pt" ? "/pt" : ""}/loja?q=${encodeURIComponent(b.termo)}`, campanha: `${idioma === "pt" ? "RS" : "UY"} | Pesquisa | Buscas do site`, grupoAnuncio: "Buscas do site", uso: "Ads" });
  }
  return out;
}

export const NEGATIVAS_PADRAO = {
  es: ["juguete", "miniatura", "escala", "gratis", "manual pdf", "usado", "usados", "mercadolibre", "trabajo", "empleo", "curso", "dibujo", "lego", "simulador", "farming simulator", "alquiler"],
  pt: ["brinquedo", "miniatura", "grátis", "manual pdf", "usado", "usados", "mercado livre", "olx", "emprego", "vaga", "curso", "desenho", "simulador", "aluguel"],
};

// CSV para importar no Google Ads Editor (Conta → Importar → Colar texto/arquivo)
export function csvGoogleAds(lista: Palavra[], site: string) {
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const tipo = { Exata: "Exact", Frase: "Phrase", Ampla: "Broad" } as const;
  const linhas = [["Campaign", "Ad Group", "Keyword", "Criterion Type", "Final URL"].join(",")];
  for (const p of lista) {
    if (p.uso === "SEO") continue;
    linhas.push([p.campanha, p.grupoAnuncio, p.termo, tipo[p.correspondencia], p.destino ? `${site}${p.destino}` : ""].map(esc).join(","));
  }
  return linhas.join("\n");
}
