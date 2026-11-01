// O que cada movimento do banco é, e o que ele significa para o MEI e para o imposto de renda.
// "E" = só entrada, "S" = só saída, "ES" = os dois.
export type Categoria =
  | "A_CLASSIFICAR"
  | "VENDA"
  | "SERVICO_PF"
  | "DOACAO"
  | "EMPRESTIMO"
  | "OUTRA_ENTRADA"
  | "FORNECEDOR"
  | "ANUNCIOS"
  | "IMPOSTOS"
  | "LOJA"
  | "PESSOAL"
  | "DOACAO_FEITA"
  | "OUTRA_SAIDA"
  | "PROPRIA"
  | "ESTORNO";

export const CATEGORIAS: Record<
  Categoria,
  { nome: string; sentido: "E" | "S" | "ES"; efeito: string; cor: string }
> = {
  A_CLASSIFICAR: {
    nome: "A classificar",
    sentido: "ES",
    efeito: "Diga o que foi: o painel só conta o que está classificado.",
    cor: "bg-amber-100 text-amber-900",
  },
  VENDA: {
    nome: "Venda (CNPJ)",
    sentido: "E",
    efeito: "Entra no limite do MEI. Precisa estar lançada em Vendas.",
    cor: "bg-emerald-100 text-emerald-800",
  },
  SERVICO_PF: {
    nome: "Serviço como pessoa física",
    sentido: "E",
    efeito: "IR: rendimento tributável recebido de pessoa física (no mês em que recebeu).",
    cor: "bg-violet-100 text-violet-800",
  },
  DOACAO: {
    nome: "Doação recebida (família)",
    sentido: "E",
    efeito: "IR: rendimento isento (doações), com o CPF de quem doou.",
    cor: "bg-sky-100 text-sky-800",
  },
  EMPRESTIMO: {
    nome: "Empréstimo recebido",
    sentido: "E",
    efeito: "Não é renda. Acima de R$ 5 mil, declare a dívida no IR.",
    cor: "bg-zinc-200 text-zinc-700",
  },
  OUTRA_ENTRADA: {
    nome: "Outra entrada",
    sentido: "E",
    efeito: "Explique na anotação o que foi.",
    cor: "bg-zinc-200 text-zinc-700",
  },
  FORNECEDOR: {
    nome: "Compra de peças",
    sentido: "S",
    efeito: "Custo da loja (livro caixa): reduz o lucro e aumenta a parte isenta.",
    cor: "bg-orange-100 text-orange-800",
  },
  ANUNCIOS: {
    nome: "Anúncios",
    sentido: "S",
    efeito: "Despesa da loja.",
    cor: "bg-orange-100 text-orange-800",
  },
  IMPOSTOS: {
    nome: "DAS / impostos",
    sentido: "S",
    efeito: "Despesa da loja.",
    cor: "bg-orange-100 text-orange-800",
  },
  LOJA: {
    nome: "Outra despesa da loja",
    sentido: "S",
    efeito: "Frete, embalagem, internet, site…: despesa da loja.",
    cor: "bg-orange-100 text-orange-800",
  },
  PESSOAL: {
    nome: "Gasto pessoal",
    sentido: "S",
    efeito: "Mercado, aluguel, luz, lazer: não entra no MEI.",
    cor: "bg-zinc-200 text-zinc-700",
  },
  DOACAO_FEITA: {
    nome: "Ajuda à família",
    sentido: "S",
    efeito: "IR: doações efetuadas (em dinheiro), com o CPF de quem recebeu.",
    cor: "bg-sky-100 text-sky-800",
  },
  OUTRA_SAIDA: {
    nome: "Outra saída",
    sentido: "S",
    efeito: "Explique na anotação o que foi.",
    cor: "bg-zinc-200 text-zinc-700",
  },
  PROPRIA: {
    nome: "Entre minhas contas",
    sentido: "ES",
    efeito: "Dinheiro seu mudando de conta: não conta para nada.",
    cor: "bg-zinc-100 text-zinc-500",
  },
  ESTORNO: {
    nome: "Estorno / devolução",
    sentido: "ES",
    efeito: "Volta de um valor: não conta para nada.",
    cor: "bg-zinc-100 text-zinc-500",
  },
};
export const ehCategoria = (c: unknown): c is Categoria => typeof c === "string" && c in CATEGORIAS;
export const categoriasDo = (valor: number) =>
  (Object.keys(CATEGORIAS) as Categoria[]).filter((c) =>
    CATEGORIAS[c].sentido.includes(valor >= 0 ? "E" : "S"),
  );

// Nome sem acento, maiúsculo e sem espaço sobrando: chave das regras "lembrar"
export const chaveNome = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);

// ---------- Pessoal: para onde vai o dinheiro do dia a dia ----------
// Vale para os gastos pessoais e para a ajuda à família (que sempre fica em FAMILIA)
export type Sub =
  | "MERCADO"
  | "COMBUSTIVEL"
  | "MORADIA"
  | "CONTAS"
  | "PESSOAS"
  | "FAMILIA"
  | "PLATAFORMAS"
  | "CREDITO"
  | "LAZER"
  | "SAUDE"
  | "TRANSPORTE"
  | "COMPRAS"
  | "OUTROS";
export const SUBS: Record<Sub, { nome: string; cor: string; dica: string }> = {
  MERCADO: { nome: "Mercado", cor: "#2a78d6", dica: "Supermercado, padaria, açougue" },
  COMBUSTIVEL: { nome: "Combustível", cor: "#eb6834", dica: "Posto e abastecimento" },
  MORADIA: { nome: "Aluguel e moradia", cor: "#7a5af8", dica: "Aluguel, imobiliária, condomínio" },
  CONTAS: { nome: "Contas da casa", cor: "#0e9384", dica: "Luz, água, internet, celular" },
  PESSOAS: { nome: "PIX para pessoas", cor: "#c4329b", dica: "Transferências para pessoas" },
  FAMILIA: { nome: "Família", cor: "#1d9bd1", dica: "Ajuda à família" },
  PLATAFORMAS: {
    nome: "Plataformas e assinaturas",
    cor: "#6172f3",
    dica: "Apple, Google, streaming, apps",
  },
  CREDITO: { nome: "Cartão e crédito", cor: "#d92d20", dica: "Fatura, Pix no crédito, empréstimo" },
  LAZER: { nome: "Lazer e comer fora", cor: "#e5a000", dica: "Bar, restaurante, lanche, esporte" },
  SAUDE: { nome: "Saúde", cor: "#16a34a", dica: "Farmácia, consulta, exame" },
  TRANSPORTE: { nome: "Transporte", cor: "#8a6d3b", dica: "Uber, passagem, pedágio" },
  COMPRAS: { nome: "Compras", cor: "#9e77ed", dica: "Lojas, roupas, casa" },
  OUTROS: { nome: "Outros", cor: "#98a2b3", dica: "O que não se encaixou" },
};
export const ehSub = (s: unknown): s is Sub => typeof s === "string" && s in SUBS;

// Palpite pelo nome de quem recebeu (o dono corrige e o «lembrar» guarda)
const PALPITES: Array<[Sub, RegExp]> = [
  ["CREDITO", /PAGAMENTO DE FATURA|PIX NO CREDITO|EMPRESTIMO|FINANCIAMENTO/],
  [
    "CONTAS",
    /CEEE|ESTADUAL DE DIST|CORSAN|ENERGIA|SANEAMENTO|INTERNET|TELECOM|OSIRNET|\bVIVO\b|\bCLARO\b|\bTIM\b|NUCEL|RECARGA DE CELULAR/,
  ],
  ["MORADIA", /IMOBILIARI|ALUGUEL|CONDOMINIO|NEGOCIOS IMOBILIARIOS/],
  ["COMBUSTIVEL", /POSTO|ABASTECEDORA|COMBUST|PETROBRAS|IPIRANGA|\bSHELL\b|AUTO POSTO/],
  [
    "MERCADO",
    /SUPERMERCADO|MERCADO|ATACAD|ACOUGUE|HORTIFRUTI|PADARIA|MINIMERCADO|ARMAZEM|FRUTEIRA/,
  ],
  [
    "PLATAFORMAS",
    /APPLE|NETFLIX|SPOTIFY|AMAZON|GOOGLE|YOUTUBE|DISNEY|\bHBO\b|PRIME VIDEO|MICROSOFT|CHATGPT|OPENAI|DEEZER|GLOBOPLAY|CANVA/,
  ],
  [
    "LAZER",
    /\bBAR\b|LOUNGE|RESTAURANTE|LANCHE|PIZZ|BURGER|HAMBURG|BEACH TENNIS|CHOPP|CERVEJ|IFOOD|SORVET|CAFE|TRAINING|ACADEMIA/,
  ],
  ["SAUDE", /FARMACIA|DROGA|CLINICA|HOSPITAL|LABORAT|ODONTO|MEDIC/],
  ["TRANSPORTE", /\bUBER\b|\b99\b|BUSER|PASSAGE|ESTACIONAMENTO|PEDAGIO|RODOVIARIA/],
  ["COMPRAS", /LOJA|MAGAZINE|SHOPEE|SHEIN|MERCADOLIVRE|CALCADOS|MODAS|CONFEC|MOVEIS/],
];
export function palpiteSub(m: {
  categoria: string;
  tipo: string;
  contraparte: string;
  documento: string | null;
}): Sub {
  if (m.categoria === "DOACAO_FEITA") return "FAMILIA";
  const t = chaveNome(`${m.tipo} ${m.contraparte}`);
  for (const [s, re] of PALPITES) if (re.test(t)) return s;
  // PIX para um CPF (pessoa), não para empresa
  if (/TRANSFERENCIA/.test(t) && /^[•·*]{3}/.test(m.documento ?? "")) return "PESSOAS";
  return "OUTROS";
}
