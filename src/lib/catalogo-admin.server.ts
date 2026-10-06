import { AUTOMOTIVA_ATIVA } from "./linhas";

// Tabelas do catálogo que o admin edita. O site lista a linha agrícola da tabela
// `agricolas`; antes, criar/editar/excluir/importar no admin gravava em `products`
// (linha automotiva), então nada aparecia no site e a edição falhava.
export function tabelasCatalogo(linha?: string | null) {
  const automotiva = AUTOMOTIVA_ATIVA && linha === "AUTOMOTIVA";
  return automotiva
    ? ({ produtos: "products", imagens: "products_img", agricola: false } as const)
    : ({ produtos: "agricolas", imagens: "agricolas_img", agricola: true } as const);
}

// Campos que o admin pode gravar (o corpo da requisição não vai direto para o banco).
const COMUNS = [
  "nome",
  "nome_es",
  "descricao",
  "descricao_es",
  "categoria",
  "category_id",
  "marca",
  "estoque",
  "peso",
  "tamanho",
  "altura",
  "largura",
  "profundidade",
  "valor_compra",
  "valor_promocional",
  "preco_brl",
  "veiculos_compativeis",
  "url",
  "codigo_fabricante",
  "ean",
  "ncm",
  "imagem_principal",
];
const SO_AGRICOLA = ["fabricante"];
const SO_AUTOMOTIVA = ["linha"];

export function dadosProduto(body: Record<string, unknown>, agricola: boolean) {
  const permitidos = [...COMUNS, ...(agricola ? SO_AGRICOLA : SO_AUTOMOTIVA)];
  const data: Record<string, unknown> = {};
  for (const k of permitidos) if (k in body && body[k] !== undefined) data[k] = body[k];
  // Marca escolhida no admin é marca confirmada (deixa de ficar oculta no site)
  if (agricola && "marca" in data) data.marca_confirmada = true;
  return data;
}

export function delegates(tx: any, linha?: string | null) {
  const t = tabelasCatalogo(linha);
  return { produtos: tx[t.produtos], imagens: tx[t.imagens], agricola: t.agricola };
}

