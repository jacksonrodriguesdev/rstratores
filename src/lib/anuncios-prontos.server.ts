// Anúncios prontos do dia (Meta Ads → Criar anúncio): milhares de combinações
// departamento do Uruguai × peça × ângulo, pontuadas com os dados do site.
// - Peças: as que mais rendem (visitas, WhatsApp, carrinho, buscas), as que cada departamento
//   mais olha e as das marcas que o departamento procura (só com foto própria e preço).
// - Locais: os 19 departamentos (perfil agrícola + interesse real) e «todo o Uruguai».
// - Ângulos: WhatsApp, código, oferta (só com desconto real), temporada, máquina da região.
// Os textos variam por dia (o mesmo anúncio muda de redação de um dia para o outro) e a
// ordem acompanha os dados. Anúncio pago só para o Uruguai; textos em espanhol.
import { DEPTOS, PERFIL_DEPTO, semAcento } from "./locais-anuncio";
import { nomeLimpo } from "./estudio-textos";

const DIA = 86_400_000;
export type Angulo = "whatsapp" | "codigo" | "oferta" | "temporada" | "maquina";
export const ANGULOS: Record<Angulo, string> = {
  whatsapp: "Conversa no WhatsApp",
  codigo: "Busca pelo código",
  oferta: "Oferta / desconto",
  temporada: "Temporada (zafra)",
  maquina: "Máquina da região",
};
// O que cada departamento usa (espanhol, para o texto do anúncio)
const MAQUINA_ES: Record<string, string> = {
  Artigas: "tu cosechadora arrocera",
  Canelones: "tu tractor de granja",
  "Cerro Largo": "tu cosechadora arrocera",
  Colonia: "tu tractor del tambo",
  Durazno: "tu tractor",
  Flores: "tu tractor y tu sembradora",
  Florida: "tu tractor del tambo",
  Lavalleja: "tu tractor",
  Maldonado: "tu tractor",
  Montevideo: "tu taller",
  Paysandú: "tu cosechadora",
  "Río Negro": "tu cosechadora",
  Rivera: "tu tractor",
  Rocha: "tu cosechadora arrocera",
  Salto: "tu tractor",
  "San José": "tu tractor del tambo",
  Soriano: "tu cosechadora",
  Tacuarembó: "tu tractor",
  "Treinta y Tres": "tu cosechadora arrocera",
};

const MARCAS_MAQUINA = /massey|valtra|john deere|new holland|case|ford|agrale|deutz|fendt|claas/i;
const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};
const slug = (s: string) =>
  semAcento(s)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
const corta = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…");
const fmtUYU = (n: number) => `$U ${Math.round(n).toLocaleString("es-UY")}`;

// Época do ano (Uruguai): siembra de verano set–dez, cosecha mar–jun, resto: mantenimiento
function epoca(agora = new Date()) {
  const m = agora.getMonth() + 1;
  if (m >= 9 && m <= 12)
    return { nome: "siembra", frase: "en plena siembra", para: "para la siembra" };
  if (m >= 3 && m <= 6)
    return { nome: "cosecha", frase: "en plena cosecha", para: "para la cosecha" };
  return { nome: "mantenimiento", frase: "antes de la zafra", para: "para la zafra" };
}
// Campanha do momento pelo calendário (Black Friday 27/11)
function campanhaAtual(agora = new Date()) {
  const ano = agora.getFullYear();
  const bf = new Date(ano, 10, 27);
  const fimBf = new Date(ano, 11, 1);
  if (agora >= new Date(ano, 9, 1) && agora < bf) return "Pre Black Friday";
  if (agora >= bf && agora < fimBf) return "Black Friday";
  return null;
}

export type PecaPronta = {
  sku: string;
  codigo: string;
  nome: string;
  marca: string | null;
  categoria: string | null;
  fotos: string[];
  uyu: string | null;
  desconto: number;
  pontos: number;
  sinais: { views: number; whatsapp: number; carrinho: number; busca: number; tendencia: number };
};
export type AnuncioPronto = {
  id: string;
  local: { nome: string; regioes: string[]; cidades: string[] };
  angulo: Angulo;
  objetivo: "WHATSAPP" | "TRAFEGO";
  texto: string;
  titulo: string;
  descricao: string;
  link: string;
  botao: string;
  score: number;
  motivos: string[];
  peca: PecaPronta;
};

// ---------------------------------------------------------------- peças
async function pecasDoCatalogo(marcas: string[], porMarca: number, fora: Set<string>) {
  const { prisma } = await import("./prisma");
  const { configPrecos } = await import("./precos.server");
  const { precoVenda } = await import("./precos");
  const { nomeProduto } = await import("./pecas-es");
  const { fotoPropria, ONDE_FOTO_AGROTRATOR } = await import("./estudio.server");
  const cfg = await configPrecos();
  const out: PecaPronta[] = [];
  for (const marca of marcas) {
    const rows = await prisma.agricolas.findMany({
      where: {
        duplicado_de: null,
        marca,
        AND: [ONDE_FOTO_AGROTRATOR],
        preco_brl: { gt: 0 },
      },
      orderBy: [{ estoque: "desc" }, { sku: "asc" }],
      take: porMarca + 10,
    });
    for (const r of rows) {
      const sku = r.sku.trim();
      if (fora.has(sku) || !fotoPropria(r.imagem_principal)) continue;
      const pr = precoVenda(r as any, cfg);
      if (!pr?.uyu) continue;
      out.push({
        sku,
        codigo: (r.codigo_fabricante || r.sku).trim(),
        nome: nomeProduto(r as any),
        marca: r.marca,
        categoria: r.categoria,
        fotos: [r.imagem_principal!],
        uyu: fmtUYU(pr.uyu),
        desconto: pr.desconto ?? 0,
        pontos: 0,
        sinais: { views: 0, whatsapp: 0, carrinho: 0, busca: 0, tendencia: 0 },
      });
      fora.add(sku);
      if (out.filter((p) => p.marca === marca).length >= porMarca) break;
    }
  }
  return out;
}

// ---------------------------------------------------------------- textos
// Nome para o texto: sem o código e sem a marca repetida no fim (o texto já diz «para Valtra»)
export { nomeLimpo } from "./estudio-textos";
// Primeira letra maiúscula (depois de emoji/pontuação)
const maiuscula = (s: string) =>
  s.replace(/^(\P{L}*)(\p{L})/u, (_m, a: string, b: string) => a + b.toUpperCase());
function redigir(a: {
  angulo: Angulo;
  p: PecaPronta;
  local: string | null;
  cidade: string | null;
  variante: number;
  campanha: string | null;
}) {
  const { local, cidade } = a;
  const p = { ...a.p, nome: nomeLimpo(a.p) };
  const para = p.marca ? ` para ${p.marca}` : "";
  const ondeEnvio = cidade ? `a ${cidade}` : local ? `a ${local}` : "a todo Uruguay";
  const quem =
    local && local !== "Montevideo"
      ? `Productor de ${local}`
      : local === "Montevideo"
        ? "Taller en Montevideo"
        : null;
  const ep = epoca();
  const v = a.variante % 2;
  let texto = "";
  let titulo = "";
  if (a.angulo === "whatsapp") {
    texto = v
      ? `🚜 ${quem ? `${quem}: ` : ""}¿necesitás ${p.nome}${para}? Mandanos el código ${p.codigo} por WhatsApp y te respondemos en minutos con precio y envío por DAC ${ondeEnvio}.`
      : `💬 ${p.nome}${para} · Cód. ${p.codigo}\n\nEscribinos por WhatsApp: te confirmamos que sirve para tu máquina y te lo mandamos por DAC ${ondeEnvio}.`;
    titulo = v ? "Pedila por WhatsApp" : corta(`${p.nome}`, 40);
  } else if (a.angulo === "codigo") {
    texto = v
      ? `🔎 ¿Buscás el ${p.codigo}? Lo tenemos${para}.\n\n${p.nome}. Envío por DAC ${ondeEnvio}. Consultá stock por WhatsApp.`
      : `Código ${p.codigo}${para}: ${p.nome}.\n\nVerificá el código en la pieza vieja o en el manual y pedila hoy. Envío ${ondeEnvio}.`;
    titulo = corta(`Cód. ${p.codigo}${p.marca ? ` · ${p.marca}` : ""}`, 40);
  } else if (a.angulo === "oferta") {
    const camp = a.campanha ?? "Oferta";
    texto = v
      ? `🖤 ${camp}${local ? ` en ${local}` : ""}: ${p.nome}${para} con -${p.desconto}%.\n\nCód. ${p.codigo} · Envío por DAC ${ondeEnvio}. Ofertas válidas hasta agotar stock.`
      : `⚡ -${p.desconto}% en ${p.nome}${para}.\n\n${camp} en AGRO PARTS. Cód. ${p.codigo}. Pedila y te la mandamos ${ondeEnvio}.`;
    titulo = corta(`-${p.desconto}% · ${p.nome}`, 40);
  } else if (a.angulo === "temporada") {
    texto = v
      ? `🌾 Que no se te pare la máquina ${ep.frase}. ${p.nome}${para} · Cód. ${p.codigo}.\n\nTenela a mano: envío por DAC ${ondeEnvio}.`
      : `${ep.nome === "siembra" ? "🌱" : ep.nome === "cosecha" ? "🌾" : "🔧"} ${quem ? `${quem}, ` : ""}preparate ${ep.para}: ${p.nome}${para}.\n\nCód. ${p.codigo}. Consultá por WhatsApp.`;
    titulo =
      ep.nome === "mantenimiento"
        ? "Preparate para la zafra"
        : corta(`Repuestos para la ${ep.nome}`, 40);
  } else {
    const maq = (local && MAQUINA_ES[local]) || "tu tractor";
    texto = v
      ? `🚜 Repuestos para ${maq}${local ? ` en ${local}` : ""}: ${p.nome}${para}.\n\nCód. ${p.codigo} · Envío por DAC ${ondeEnvio}.`
      : `¿${maq.replace(/^tu /, "Tu ").replace(/^Tu taller/, "Tu taller")} necesita ${p.nome}? La tenemos${para}.\n\nCód. ${p.codigo}. Te la mandamos ${ondeEnvio}.`;
    titulo = corta(local ? `Repuestos en ${local}` : "Repuestos agrícolas", 40);
  }
  return { texto: maiuscula(texto), titulo: maiuscula(titulo) };
}

// ---------------------------------------------------------------- geração (com cache do dia)
let cache: { chave: string; em: number; dados: Awaited<ReturnType<typeof gerar>> } | null = null;
export async function anunciosProntos(dias = 30) {
  const chave = `${new Date().toISOString().slice(0, 10)}:${dias}`;
  if (cache && cache.chave === chave && Date.now() - cache.em < 30 * 60_000) return cache.dados;
  const dados = await gerar(dias);
  cache = { chave, em: Date.now(), dados };
  return dados;
}

async function gerar(dias: number) {
  const { criadorAnuncios } = await import("./anuncios.server");
  const { recomendacoes, fotoPropria } = await import("./estudio.server");
  const { SITE_URL } = await import("./site");
  const [c, rec] = await Promise.all([
    criadorAnuncios(Math.max(dias, 30)),
    recomendacoes(dias, 200),
  ]);
  const hoje = new Date().toISOString().slice(0, 10);
  const campanha = campanhaAtual();

  // Peças das recomendações (só com foto própria e preço)
  const pecas = new Map<string, PecaPronta>();
  for (const r of rec.produtos) {
    if (!r.fotos.length || !r.preco?.uyu) continue;
    pecas.set(r.sku, {
      sku: r.sku,
      codigo: r.codigo,
      nome: r.nome,
      marca: r.marca,
      categoria: r.categoria,
      fotos: r.fotos,
      uyu: r.preco.uyu,
      desconto: r.preco.desconto ?? 0,
      pontos: r.pontos,
      sinais: r.sinais,
    });
  }
  // Locais do Uruguai com os dados do Criador
  const locais = c.ondeAnunciar.filter((l) => l.pais === "UY" && DEPTOS.includes(l.nome));
  // Peças vistas em cada departamento entram no conjunto (se tiverem foto própria)
  for (const l of locais)
    for (const p of l.pecas)
      if (!pecas.has(p.sku) && fotoPropria(p.imagem) && p.uyu)
        pecas.set(p.sku, {
          sku: p.sku,
          codigo: p.sku,
          nome: p.nome,
          marca: p.marca,
          categoria: p.categoria,
          fotos: [p.imagem!],
          uyu: fmtUYU(p.uyu),
          desconto: p.desconto ?? 0,
          pontos: p.vistas,
          sinais: { views: p.vistas, whatsapp: 0, carrinho: 0, busca: 0, tendencia: 0 },
        });
  // Marcas procuradas (site) e as principais: completam com o catálogo (foto própria + preço)
  const marcasProcuradas = [
    ...new Set([
      ...c.marcas.map((m) => m.marca),
      "Massey Ferguson",
      "Valtra",
      "John Deere",
      "New Holland",
    ]),
  ]
    .filter(Boolean)
    .slice(0, 6) as string[];
  for (const p of await pecasDoCatalogo(marcasProcuradas, 15, new Set(pecas.keys())))
    pecas.set(p.sku, p);
  const lista = [...pecas.values()];
  const maxPontos = Math.max(1, ...lista.map((p) => p.pontos));

  // Peso de cada local: interesse real + prioridade do Criador
  const PRIOR: Record<string, number> = { Alta: 3, Média: 1.5, Baixa: 0.5, Opcional: 0 };
  type Alvo = {
    nome: string | null;
    regioes: string[];
    cidades: string[];
    peso: number;
    marcas: string[];
    vistas: Map<string, number>;
    leads: number;
    motivo: string;
  };
  const alvos: Alvo[] = [
    {
      nome: null,
      regioes: [],
      cidades: [],
      peso: 3.5,
      marcas: c.marcas.slice(0, 4).map((m) => m.marca),
      vistas: new Map(),
      leads: 1,
      motivo: "Todo o Uruguai: alcance maior para as peças que mais rendem",
    },
    ...locais.map((l) => ({
      nome: l.nome,
      regioes: [l.nome],
      cidades: l.cidades.map((x) => x.nome).slice(0, 3),
      peso: 1 + Math.log2(1 + l.pontos) / 2 + (PRIOR[(l as any).prioridade] ?? 1),
      marcas: l.marcas.map((m) => m.nome),
      vistas: new Map(l.pecas.map((p) => [p.sku, p.vistas])),
      leads: l.leads,
      motivo: `${l.nome}: ${(l as any).prioridade ?? "—"} · ${l.visitas} visitas, ${l.leads} pedidos no WhatsApp · ${PERFIL_DEPTO[l.nome]?.perfil ?? ""}`,
    })),
  ];

  const anuncios: AnuncioPronto[] = [];
  for (const alvo of alvos) {
    // Peças para este local: as vistas aqui, as da marca procurada aqui e as mais fortes
    const ordenadas = lista
      .map((p) => {
        const vistasAqui = alvo.vistas.get(p.sku) ?? 0;
        const marcaAqui = p.marca && alvo.marcas.includes(p.marca) ? 1 : 0;
        const base =
          (p.pontos / maxPontos) * 10 + vistasAqui * 4 + marcaAqui * 3 + (p.desconto ? 1 : 0);
        return { p, base, vistasAqui, marcaAqui };
      })
      .sort((a, b) => b.base - a.base)
      .slice(0, alvo.nome ? 60 : 120);
    for (const { p, base, vistasAqui, marcaAqui } of ordenadas) {
      const angulos: Angulo[] = ["whatsapp", "codigo", "temporada"];
      if (p.desconto > 0) angulos.push("oferta");
      // «Máquina da região» só para peças de marcas de trator/colheitadeira
      if (alvo.nome && p.marca && MARCAS_MAQUINA.test(p.marca)) angulos.push("maquina");
      for (const angulo of angulos) {
        const id = `${slug(alvo.nome ?? "uruguai")}-${p.sku}-${angulo}`;
        const h = hash(`${hoje}:${id}`);
        const fatorAng =
          angulo === "whatsapp"
            ? alvo.leads > 0 || p.sinais.whatsapp > 0
              ? 1.25
              : 1.05
            : angulo === "oferta"
              ? 1.3
              : angulo === "codigo"
                ? p.sinais.busca > 0
                  ? 1.2
                  : 0.85
                : angulo === "temporada"
                  ? 1
                  : 0.95;
        const score =
          Math.round((base + 2) * alvo.peso * fatorAng * (0.97 + (h % 60) / 1000) * 10) / 10;
        const { texto, titulo } = redigir({
          angulo,
          p,
          local: alvo.nome,
          cidade: alvo.cidades[0] ?? null,
          variante: h,
          campanha,
        });
        const motivos = [
          alvo.motivo,
          p.sinais.whatsapp ? `${p.sinais.whatsapp} pedido(s) da peça no WhatsApp` : "",
          p.sinais.views ? `${p.sinais.views} visitas na peça` : "",
          p.sinais.carrinho ? `${p.sinais.carrinho} vez(es) no carrinho` : "",
          p.sinais.busca ? `buscada ${p.sinais.busca} vez(es) pelo código` : "",
          p.sinais.tendencia >= 30 ? `em alta: +${p.sinais.tendencia}% na semana` : "",
          vistasAqui ? `${vistasAqui} visitas vindas de ${alvo.nome}` : "",
          marcaAqui ? `${p.marca} é das marcas mais procuradas aqui` : "",
          p.desconto ? `com -${p.desconto}% no site` : "",
          !p.pontos && !vistasAqui ? "do catálogo da marca (sem histórico ainda)" : "",
        ].filter(Boolean);
        anuncios.push({
          id,
          local: {
            nome: alvo.nome ?? "Todo o Uruguai",
            regioes: alvo.regioes,
            cidades: alvo.cidades,
          },
          angulo,
          objetivo: angulo === "whatsapp" ? "WHATSAPP" : "TRAFEGO",
          texto,
          titulo,
          descricao: corta(
            `Cód. ${p.codigo} · Envío por DAC ${alvo.nome ? `a ${alvo.nome}` : "a todo Uruguay"}`,
            90,
          ),
          link: `${SITE_URL}/produto/${encodeURIComponent(p.sku)}?utm_source=facebook&utm_medium=cpc&utm_campaign=prontos-${slug(alvo.nome ?? "uruguai")}&utm_content=${angulo}-${slug(p.sku)}`,
          botao:
            angulo === "oferta" ? "SHOP_NOW" : angulo === "codigo" ? "LEARN_MORE" : "GET_QUOTE",
          score,
          motivos,
          peca: p,
        });
      }
    }
  }
  anuncios.sort((a, b) => b.score - a.score);
  const cont = (k: (a: AnuncioPronto) => string | null) => {
    const m = new Map<string, number>();
    for (const a of anuncios) {
      const v = k(a);
      if (v) m.set(v, (m.get(v) ?? 0) + 1);
    }
    return [...m].sort((a, b) => b[1] - a[1]).map(([nome, n]) => ({ nome, n }));
  };
  return {
    dia: hoje,
    campanha,
    epoca: epoca().nome,
    total: anuncios.length,
    pecas: lista.length,
    anuncios,
    facetas: {
      locais: cont((a) => a.local.nome),
      marcas: cont((a) => a.peca.marca),
      categorias: cont((a) => a.peca.categoria),
      angulos: cont((a) => a.angulo),
    },
    estrategia: {
      ondeAnunciar: locais.slice(0, 8).map((l) => ({
        nome: l.nome,
        prioridade: (l as any).prioridade as string,
        motivo: (l as any).motivo as string,
        visitas: l.visitas,
        leads: l.leads,
        cidades: l.cidades.slice(0, 3).map((x) => x.nome),
        marcas: l.marcas.slice(0, 3).map((x) => x.nome),
      })),
      faixaHoras: (c.geral as any)?.faixaHoras ?? "",
      melhoresDias: (c.geral as any)?.melhoresDias ?? [],
      celular: (c.geral as any)?.celular ?? 0,
    },
  };
}

export type FiltroProntos = {
  pagina?: number;
  local?: string;
  marca?: string;
  categoria?: string;
  angulo?: string;
  objetivo?: string;
  q?: string;
};
export async function buscarProntos(f: FiltroProntos, dias = 30, tamanho = 24) {
  const d = await anunciosProntos(dias);
  const q = semAcento(String(f.q ?? "").trim());
  const lista = d.anuncios.filter(
    (a) =>
      (!f.local || a.local.nome === f.local) &&
      (!f.marca || a.peca.marca === f.marca) &&
      (!f.categoria || a.peca.categoria === f.categoria) &&
      (!f.angulo || a.angulo === f.angulo) &&
      (!f.objetivo || a.objetivo === f.objetivo) &&
      (!q || semAcento(`${a.peca.nome} ${a.peca.codigo} ${a.peca.sku} ${a.texto}`).includes(q)),
  );
  const pagina = Math.max(0, Math.floor(Number(f.pagina) || 0));
  return {
    dia: d.dia,
    campanha: d.campanha,
    epoca: d.epoca,
    totalDia: d.total,
    pecas: d.pecas,
    total: lista.length,
    pagina,
    tamanho,
    itens: lista.slice(pagina * tamanho, (pagina + 1) * tamanho),
    facetas: d.facetas,
    estrategia: d.estrategia,
    angulos: ANGULOS,
  };
}
// Para os testes: data fixa nos textos de época/campanha
export const _teste = { epoca, campanhaAtual, redigir, DIA };
