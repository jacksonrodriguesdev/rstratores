// Monta selecao.json: as 50 peças escolhidas na folha de contato, com títulos revisados em
// espanhol e português (os nomes do banco são abreviados). Uso: node marketing/produtos-50/montar-selecao.cjs
const fs = require("fs");
const c = require("./candidatas.json");

// índice na folha → [título ES, título PT, extra opcional (fabricante da peça, medida…)]
const T = {
  0: ["Correa de accionamiento principal de trilla", "Correia de acionamento principal da trilha"],
  5: ["Conjunto engranaje baja 42 dientes", "Conjunto engrenagem baixa 42 dentes"],
  11: ["Engranaje con manguito Z44/46", "Engrenagem com luva Z44/46"],
  14: ["Turbocompresor", "Turbocompressor"],
  15: ["Conjunto sincronizador", "Conjunto sincronizador"],
  19: ["Planetaria 18/24 dientes", "Planetária 18/24 dentes"],
  20: ["Articulación doble montada", "Articulação dupla montada"],
  21: ["Brazo del elevador", "Braço do elevador"],
  23: ["Colector de escape", "Coletor de escape"],
  25: ["Horquilla", "Garfo"],
  29: ["Barra de corte seccionada 23'", "Barra de corte seccionada 23'"],
  40: ["Soporte de freno a disco (lado derecho)", "Suporte do freio a disco (lado direito)"],
  43: ["Rodamiento 21309", "Rolamento 21309"],
  44: ["Rodamiento 42381/584", "Rolamento 42381/584"],
  46: ["Rodamiento NU309", "Rolamento NU309"],
  49: ["Rodamiento NJ309", "Rolamento NJ309"],
  52: ["Rodamiento 30208", "Rolamento 30208"],
  53: ["Rodamiento de agujas", "Rolamento de agulhas"],
  56: ["Anillo sincronizador 2ª/3ª", "Anel sincronizador 2ª/3ª"],
  58: ["Anillo estriado", "Anel estriado"],
  62: ["Retén 127 × 159 × 24", "Retentor 127 × 159 × 24"],
  66: ["Retén del semieje delantero", "Retentor do semieixo dianteiro", "Carraro"],
  70: ["Buje guía del embrague", "Bucha guia da embreagem"],
  78: ["Tornillo de rueda trasera", "Parafuso da roda traseira"],
  83: ["Tornillo con tuerca", "Parafuso com porca"],
  84: ["Kit de reparación del cilindro de dirección", "Kit de reparo do cilindro de direção"],
  85: ["Bomba hidráulica D8NN600LB", "Bomba hidráulica D8NN600LB"],
  87: ["Bomba hidráulica D8NN600KB", "Bomba hidráulica D8NN600KB"],
  90: ["Bomba hidráulica doble con colector", "Bomba hidráulica dupla com coletor"],
  91: ["Bomba hidráulica doble con colector", "Bomba hidráulica dupla com coletor"],
  94: ["Bomba hidráulica", "Bomba hidráulica"],
  96: ["Bomba hidráulica doble", "Bomba hidráulica dupla"],
  98: ["Filtro hidráulico", "Filtro hidráulico"],
  99: ["Filtro de combustible de la bomba eléctrica", "Filtro de combustível da bomba elétrica"],
  100: ["Filtro de aceite del motor", "Filtro de óleo do motor"],
  101: ["Filtro de combustible", "Filtro de combustível"],
  105: ["Filtro de combustible", "Filtro de combustível"],
  109: ["Filtro de aire primario", "Filtro de ar primário"],
  111: ["Prefiltro de combustible", "Pré-filtro de combustível"],
  112: ["Sensor de temperatura", "Sensor de temperatura"],
  116: ["Llave de luces de 7 terminales", "Chave de luz de 7 terminais"],
  120: ["Radiador de agua", "Radiador de água"],
  122: ["Solenoide del control remoto", "Solenoide do controle remoto", "Bosch"],
  125: ["Panel de instrumentos 4600 a 6610", "Painel de instrumentos 4600 a 6610"],
  126: ["Kit de embrague plato + disco", "Kit de embreagem platô + disco", "LuK"],
  127: ["Kit de embrague plato + disco + rulemán", "Kit de embreagem platô + disco + rolamento", "LuK"],
  128: ["Disco de embrague cerámico 280 mm", "Disco de embreagem cerâmico 280 mm"],
  133: ["Disco rígido de 14 pastillas", "Disco rígido de 14 pastilhas"],
  136: ["Disco de embrague", "Disco de embreagem"],
  139: ["Cobertura del embrague", "Cobertura da embreagem"],
};
const CAT_PT = {
  "Engrenagens e Transmissão": "Transmissão",
  "Outros Componentes": "Componentes",
  "Estrutura e Suspensão": "Estrutura",
  "Rolamentos e Mancais": "Rolamentos",
  Vedações: "Vedações",
  "Elementos de Fixação": "Fixação",
  "Hidráulica e Pneumática": "Hidráulica",
  Filtros: "Filtros",
  "Elétrica e Sensores": "Elétrica",
  "Freios e Embreagens": "Embreagem e freios",
};
const sel = Object.entries(T).map(([i, [es, pt, extra]]) => {
  const x = c[Number(i)];
  return {
    sku: x.sku,
    cod: x.cod,
    es,
    pt,
    extra: extra ?? null,
    marca: x.marca || (x.es.includes("AGCO") ? "AGCO" : null),
    cat: x.cat,
    cat_es: x.cat_es,
    cat_pt: CAT_PT[x.cat] ?? x.cat,
    img: x.img,
  };
});
if (sel.length !== 50) throw new Error(`seleção com ${sel.length}`);
fs.writeFileSync(__dirname + "/selecao.json", JSON.stringify(sel, null, 1));
console.log("selecao.json:", sel.length, "peças");
