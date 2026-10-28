// Nova venda (Admin → Vendas): editar o preço de compra e de venda de uma peça ali mesmo, e
// cadastrar na hora uma peça que ainda não existe (código, nome, compra e venda em R$). As fotos
// e o resto do cadastro ficam para depois (editor completo da peça).
import { prisma } from "./prisma";

const limparCaches = async () => {
  const { limparCacheCatalogo } = await import("./busca-catalogo.server");
  const { limparCacheFacets } = await import("./products.server");
  limparCacheCatalogo();
  limparCacheFacets();
};
const valor = (v: unknown, nome: string) => {
  if (v == null || String(v).trim() === "") return null;
  const n = Number(String(v).replace(",", "."));
  if (!Number.isFinite(n) || n < 0) throw new Error(`Valor inválido em ${nome}.`);
  return Math.round(n * 100) / 100;
};

// Preço do dia da peça (o mesmo da busca da venda), depois de salvar
async function precoAtual(sku: string) {
  const r = await prisma.agricolas.findUnique({ where: { sku } });
  if (!r) throw new Error("Peça não encontrada.");
  const { configPrecos } = await import("./precos.server");
  const { precoVenda } = await import("./precos");
  const { nomeProduto } = await import("./pecas-es");
  const p = precoVenda(r as any, await configPrecos());
  return {
    sku: r.sku.trim(),
    codigo: (r.codigo_fabricante || r.sku).trim(),
    nome: r.nome.trim(),
    nomeEs: nomeProduto(r as any),
    foto: r.imagem_principal,
    uyu: p?.uyu ?? null,
    brl: p?.brl ?? null,
    custo: r.valor_compra ?? null,
    precoBrl: r.preco_brl ?? null,
  };
}
export type PecaVenda = Awaited<ReturnType<typeof precoAtual>>;

export async function salvarPrecoPeca(d: { sku: string; custo?: unknown; venda?: unknown }) {
  const atual = await prisma.agricolas.findUnique({ where: { sku: String(d.sku) } });
  if (!atual) throw new Error("Peça não encontrada.");
  const custo = valor(d.custo, "compra");
  const venda = valor(d.venda, "venda");
  await prisma.agricolas.update({
    where: { sku: atual.sku },
    data: {
      valor_compra: custo,
      preco_brl: venda,
      // Preço digitado vale em R$; o $U sai da cotação do dia
      ...(venda && venda > 0 && { preco_modo: "AUTO" }),
      precificado_em: venda && venda > 0 ? (atual.precificado_em ?? new Date()) : null,
    },
  });
  await limparCaches();
  return precoAtual(atual.sku);
}

export async function criarPecaRapida(d: {
  codigo: string;
  nome: string;
  custo?: unknown;
  venda?: unknown;
  marca?: string | null;
}) {
  const codigo = String(d.codigo ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .slice(0, 60);
  const nome = String(d.nome ?? "")
    .trim()
    .slice(0, 300);
  if (!codigo) throw new Error("Escreva o código da peça.");
  if (!nome) throw new Error("Escreva o nome da peça.");
  if (!/^[A-Z0-9][A-Z0-9.\-/_]*$/.test(codigo))
    throw new Error("Código só com letras, números, ponto, hífen ou barra.");
  const ja = await prisma.agricolas.findFirst({
    where: { OR: [{ sku: codigo }, { codigo_fabricante: codigo }] },
    select: { sku: true },
  });
  if (ja) throw new Error(`Já existe uma peça com o código ${codigo} (SKU ${ja.sku}).`);
  const custo = valor(d.custo, "compra");
  const venda = valor(d.venda, "venda");
  const marca =
    String(d.marca ?? "")
      .trim()
      .slice(0, 80) || null;
  await prisma.agricolas.create({
    data: {
      sku: codigo,
      nome,
      codigo_fabricante: codigo,
      marca,
      marca_confirmada: !!marca,
      valor_compra: custo,
      preco_brl: venda,
      preco_modo: "AUTO",
      precificado_em: venda && venda > 0 ? new Date() : null,
      estoque: 0,
    } as any,
  });
  await limparCaches();
  return precoAtual(codigo);
}
