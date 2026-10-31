// Gera src/lib/municipios-sul.json: os 1.191 municípios do RS, SC e PR com a microrregião e as
// lavouras de cada um (IBGE, Produção Agrícola Municipal, área plantada, último ano publicado).
// "p": 1 marca os que ganham página própria (/pt/pecas-agricolas/<cidade>): os de maior área
// plantada em cada estado (POR_ESTADO). Os outros aparecem na lista da página do estado.
// Uso: node scripts/seo/gerar_municipios_sul.cjs   (rodar de novo quando o IBGE publicar outro ano)
const fs = require("fs");
const path = require("path");

const ESTADOS = { 43: "RS", 42: "SC", 41: "PR" };
// SC tem menos lavoura (leite, suínos e aves): mais cidades em proporção à área
const POR_ESTADO = { RS: 110, PR: 100, SC: 40 };

// "Soja (em grão)" -> "soja"; "Café (em grão) Total" -> "café". Subitens do café ficam de fora.
const limpar = (p) =>
  p
    .replace(/\*$/, "")
    .replace(/ Total$/, "")
    .replace(/\s*\(.*?\)\s*/g, " ")
    .trim()
    .toLowerCase();
const ignorar = (p) => p === "Total" || /Arábica|Canephora/.test(p);

async function json(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
}

(async () => {
  const saida = [];
  let ano = "";
  for (const [cod, uf] of Object.entries(ESTADOS)) {
    const municipios = await json(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${cod}/municipios`,
    );
    const pam = await json(
      `https://apisidra.ibge.gov.br/values/t/5457/n6/in%20n3%20${cod}/v/8331/p/last%201/c782/all?formato=json`,
    );
    const porMun = new Map();
    for (const r of pam.slice(1)) {
      ano = r.D3N;
      const ha = Number(r.V) || 0;
      const m = porMun.get(r.D1C) ?? { total: 0, culturas: [] };
      if (r.D4N === "Total") m.total = ha;
      else if (!ignorar(r.D4N) && ha > 0) m.culturas.push([limpar(r.D4N), ha]);
      porMun.set(r.D1C, m);
    }
    const lista = municipios.map((m) => {
      const d = porMun.get(String(m.id)) ?? { total: 0, culturas: [] };
      return {
        n: m.nome,
        uf,
        mi: m.microrregiao?.nome ?? "",
        ha: d.total,
        c: d.culturas.sort((a, b) => b[1] - a[1]).slice(0, 4),
      };
    });
    const topo = new Set(
      [...lista]
        .sort((a, b) => b.ha - a.ha)
        .slice(0, POR_ESTADO[uf])
        .map((m) => m.n),
    );
    for (const m of lista) saida.push(topo.has(m.n) ? { ...m, p: 1 } : m);
    console.log(uf, lista.length, "municípios,", topo.size, "com página");
  }
  const destino = path.join(__dirname, "../../src/lib/municipios-sul.json");
  fs.writeFileSync(destino, JSON.stringify({ ano, fonte: "IBGE — Produção Agrícola Municipal", municipios: saida }));
  console.log("ano", ano, "→", destino, fs.statSync(destino).size, "bytes");
})();
