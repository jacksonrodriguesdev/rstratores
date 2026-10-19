// Monta pecas100.json: 50 peças da seleção anterior + 50 novas (escolhidas na folha amarela),
// com títulos ES/PT revisados e o preço de hoje com o desconto da pré-Black (mesma conta do site).
// Uso: npx tsx marketing/pre-black-amarelo/montar.ts
import fs from "fs";
import { prisma } from "../../src/lib/prisma";
import { configPrecos } from "../../src/lib/precos.server";
import { precoVenda, fmtUYU } from "../../src/lib/precos";

// Desconto da pré-Black no site (Admin → Campanhas e cupons). Mudou lá? Troque e rode de novo.
export const DESCONTO = 20;

const P = "marketing/pre-black-amarelo";
const antigas = JSON.parse(fs.readFileSync(`${P}/selecao50.json`, "utf8"));
const cand = JSON.parse(fs.readFileSync(`${P}/candidatas.json`, "utf8"));

// índice na folha amarela → [título ES, título PT, fabricante da peça (opcional)]
const T: Record<number, [string, string, string?]> = {
  0: ["Tractómetro", "Tratômetro"],
  2: ["Reducida con engranaje 30 mm", "Reduzida com engrenagem 30 mm"],
  3: ["Engranaje de 38 dientes", "Engrenagem de 38 dentes"],
  6: ["Articulador doble montado", "Articulador duplo montado"],
  18: ["Retén K7 44,5 × 63,5 × 18", "Retentor K7 44,5 × 63,5 × 18"],
  22: ["Retén 65 × 100 × 10 de la caja de cambios", "Retentor 65 × 100 × 10 da caixa de câmbio"],
  23: ["Retén del semieje delantero", "Retentor do semieixo dianteiro", "Carraro"],
  26: ["Retén 100 × 125 × 15", "Retentor 100 × 125 × 15"],
  29: ["Retén del eje de la toma de fuerza", "Retentor do eixo da tomada de força"],
  33: ["Cubo de rueda", "Cubo de roda", "CNH"],
  34: ["Cojinete montado", "Mancal montado", "AGCO"],
  37: ["Kit cubo de rueda con tornillos", "Kit cubo de roda com parafusos"],
  39: ["Cubo AS3065", "Cubo AS3065", "ZF"],
  43: ["Cubo de rueda", "Cubo de roda", "Panegossi"],
  46: ["Cubo de tracción delantera", "Cubo da tração dianteira", "ZF"],
  // 47 (cubo de roda JD) saiu: a foto tem fundo cinza e não dá para recortar
  44: ["Cubo del eje delantero", "Cubo do eixo dianteiro", "ZF"],
  49: ["Alternador", "Alternador", "Mahle"],
  51: ["Tacómetro del panel", "Tacômetro do painel", "AGCO"],
  55: ["Conjunto alternador", "Conjunto alternador", "Mahle"],
  56: ["Tacómetro eléctrico", "Tacômetro elétrico", "Turotest"],
  62: ["Panel de instrumentos", "Painel de instrumentos", "AGCO"],
  64: ["Disco de embrague", "Disco de embreagem"],
  65: ["Disco de embrague", "Disco de embreagem"],
  74: ["Disco intermedio", "Disco intermediário"],
  76: ["Conjunto de embrague", "Conjunto de embreagem", "CNH"],
  77: ["Plato doble", "Platô duplo", "LuK"],
  79: ["Plato de embrague", "Platô de embreagem", "LuK"],
  80: ["Kit filtro de combustible", "Kit filtro de combustível", "AGCO"],
  81: ["Filtro de combustible", "Filtro de combustível", "CNH"],
  82: ["Filtro sedimentador", "Filtro sedimentador", "AGCO"],
  87: ["Filtro hidráulico", "Filtro hidráulico", "AGCO"],
  89: ["Filtro de combustible", "Filtro de combustível", "CNH"],
  91: ["Filtro de aire 188", "Filtro de ar 188", "Tecnoar"],
  92: ["Filtro de aire", "Filtro de ar", "CNH"],
  96: ["Bomba hidráulica E6NN3K514EA", "Bomba hidráulica E6NN3K514EA"],
  97: ["Bomba hidráulica con depósito", "Bomba hidráulica com reservatório"],
  99: ["Bomba hidráulica doble", "Bomba hidráulica dupla"],
  105: ["Bomba hidráulica simple", "Bomba hidráulica simples"],
  109: ["Bomba hidráulica simple", "Bomba hidráulica simples"],
  113: ["Conjunto engranaje de marcha atrás", "Conjunto engrenagem de ré"],
  116: ["Engranaje de la caja de transmisión", "Engrenagem da caixa de transmissão"],
  120: ["Engranaje de transmisión", "Engrenagem de transmissão"],
  123: ["Engranaje de alta", "Engrenagem de alta"],
  124: ["Piñón caja de cambios Z-20", "Pinhão caixa de câmbio Z-20"],
  127: ["Conjunto de engranajes", "Conjunto de engrenagens"],
  151: ["Resorte del pedal de embrague", "Mola do pedal da embreagem"],
  152: ["Volante del motor", "Volante do motor", "AGCO"],
  154: ["Volante del motor", "Volante do motor", "AGCO"],
  156: ["Soporte planetario", "Suporte planetário", "NCG"],
  159: ["Asiento completo", "Banco completo", "Grammer"],
};

(async () => {
  const novas = Object.entries(T).map(([i, [es, pt, extra]]) => {
    const x = cand[Number(i)];
    return { sku: x.sku, cod: x.cod, es, pt, extra: extra ?? null, marca: x.marca, cat: x.cat, cat_es: x.cat_es, img: x.img };
  });
  const todas = [...antigas, ...novas];
  if (todas.length !== 100) throw new Error(`são ${todas.length} peças`);

  const cfg = await configPrecos();
  // Mesma regra que está no ar: -DESCONTO% no site todo na fase pré
  cfg.campanha = { id: 0, selo: "BLACK", fase: "PRE", regras: [{ tipo: "TUDO", alvo: "", pct: DESCONTO }] };
  const rows = await prisma.agricolas.findMany({ where: { sku: { in: todas.map((p) => p.sku) } } });
  const porSku = new Map(rows.map((r) => [r.sku.trim(), r]));
  const brl = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const out = todas.map((p) => {
    const r = porSku.get(p.sku);
    const v = r ? precoVenda(r as any, cfg) : null;
    if (!v?.brl || !v.uyu) throw new Error(`sem preço: ${p.sku}`);
    return {
      ...p,
      preco: { brl: brl(v.brl), deBrl: v.deBrl ? brl(v.deBrl) : null, uyu: fmtUYU(v.uyu), deUyu: v.deUyu ? fmtUYU(v.deUyu) : null, desconto: v.desconto ?? 0 },
    };
  });
  const data = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Montevideo" });
  fs.writeFileSync(`${P}/pecas100.json`, JSON.stringify({ data, cotacao: cfg.cotacao, desconto: DESCONTO, pecas: out }, null, 1));
  console.log(`pecas100.json: ${out.length} peças · preços de ${data} · cotação ${cfg.cotacao}`);
  console.log(out.slice(0, 3).map((p) => `${p.cod}: ${p.preco.deBrl} → ${p.preco.brl} | ${p.preco.deUyu} → ${p.preco.uyu}`).join("\n"));
  await prisma.$disconnect();
})();
