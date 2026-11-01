// Leitura do extrato do banco (sem servidor: roda igual no navegador e nos testes).
// Nubank conta: PDF (texto tirado pelo pdfjs, uma linha por linha do PDF) ou CSV
// (Data,Valor,Identificador,Descrição). Cada movimento vira {data, valor (+/-), tipo, contraparte}.

export type MovimentoLido = {
  data: string; // AAAA-MM-DD
  valor: number; // + entrada, − saída
  tipo: string; // "Transferência recebida pelo Pix", "Compra no débito"…
  contraparte: string; // nome de quem pagou / recebeu
  documento: string | null; // CPF mascarado ou CNPJ, como vem no extrato
  descricao: string; // texto completo do movimento
};
export type ExtratoLido = {
  banco: string;
  titular: string | null;
  inicio: string | null; // período do extrato
  fim: string | null;
  // Totais que o próprio banco imprime: servem para conferir a leitura
  totais: { saldoInicial: number; entradas: number; saidas: number; saldoFinal: number } | null;
  movimentos: MovimentoLido[];
};

const MESES: Record<string, number> = {
  JAN: 1,
  FEV: 2,
  MAR: 3,
  ABR: 4,
  MAI: 5,
  JUN: 6,
  JUL: 7,
  AGO: 8,
  SET: 9,
  OUT: 10,
  NOV: 11,
  DEZ: 12,
  JANEIRO: 1,
  FEVEREIRO: 2,
  MARÇO: 3,
  MARCO: 3,
  ABRIL: 4,
  MAIO: 5,
  JUNHO: 6,
  JULHO: 7,
  AGOSTO: 8,
  SETEMBRO: 9,
  OUTUBRO: 10,
  NOVEMBRO: 11,
  DEZEMBRO: 12,
};
const num = (s: string) => Number(s.replace(/[+\s]/g, "").replace(/\./g, "").replace(",", "."));
const r2 = (n: number) => Math.round(n * 100) / 100;
const dia = (d: string | number, m: number, a: string | number) =>
  `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

// Tipos do Nubank, do mais longo para o mais curto (o resto da linha é a contraparte)
const TIPOS = [
  "Transferência recebida pelo Pix",
  "Transferência enviada pelo Pix",
  "Reembolso recebido pelo Pix",
  "Reembolso enviado pelo Pix",
  "Pagamento de boleto efetuado",
  "Transferência Recebida",
  "Transferência enviada",
  "Transferência recebida",
  "Pagamento de fatura",
  "Compra no débito",
  "Recarga de celular",
  "Débito em conta",
  "Aplicação RDB",
  "Resgate RDB",
  "Depósito recebido",
  "Estorno",
  "Pix no Crédito",
  "Plano Nucel Conta",
  "NuCel Conta",
];
// "Tipo Nome - doc - banco…" → tipo, contraparte, documento
export function separar(descricao: string) {
  const d = descricao.replace(/\s+/g, " ").trim();
  const tipo = TIPOS.find((t) => d.toLowerCase().startsWith(t.toLowerCase())) ?? "";
  const resto = d
    .slice(tipo.length)
    .replace(/^\s*-\s*/, "")
    .trim();
  const partes = resto.split(" - ").map((x) => x.trim());
  // CNPJ do MEI aparece antes do nome ("44.508.569 Fulano"): tira o número da frente
  // Sem nome (recarga, débito em conta…): o próprio tipo serve de nome
  const contraparte = (partes[0] || resto || tipo || d)
    .replace(/^\d{2}[ .]\d{3}[ .]\d{3}\s+/, "")
    .replace(/^\d{6,}(?=[A-Za-z])/, "")
    .replace(/\s*-$/, "")
    .slice(0, 160);
  const doc =
    partes
      .slice(1)
      .find((p) =>
        /^[•·*]{3}\.\d{3}\.\d{3}-[•·*]{2}$|^\d{2}\.\d{3}\.\d{3}\s?\/\d{4}-\s?\d{2}$/.test(p),
      ) ?? null;
  return {
    tipo: tipo || d.split(" ").slice(0, 3).join(" "),
    contraparte,
    documento: doc?.replace(/[·*]/g, "•").replace(/\s/g, "") ?? null,
  };
}

// Posição do primeiro tipo conhecido no texto (-1 se não tiver)
function inicioTipo(d: string) {
  const baixo = d.toLowerCase();
  let pos = -1;
  for (const t of TIPOS) {
    const i = baixo.indexOf(t.toLowerCase());
    if (i >= 0 && (pos < 0 || i < pos)) pos = i;
  }
  return pos;
}

const RODAPE =
  /^(Tem alguma d|metropolitanas|Caso a solu|dispon.veis em|Extrato gerado|Movimentações$|Saldo final do per|Saldo inicial$|Rendimento l.quido$|Total de entradas$|Total de sa.das$|VALORES EM R\$)/;

// PDF do Nubank (conta), já como texto
export function lerNubankPdf(texto: string): ExtratoLido {
  const linhas = texto
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const titular = linhas[0] && !/\d/.test(linhas[0]) ? linhas[0] : null;
  const cab = texto.match(/(\d{2}) DE ([A-ZÇ]+) DE (\d{4})\s*a?\s*(\d{2}) DE ([A-ZÇ]+) DE (\d{4})/);
  const inicio = cab ? dia(cab[1], MESES[cab[2]], cab[3]) : null;
  const fim = cab ? dia(cab[4], MESES[cab[5]], cab[6]) : null;
  // Conta (cabeçalho de toda página) e os 5 números do resumo
  const conta = linhas.find((l) => /^\d{6,10}-\d$/.test(l)) ?? null;
  let totais: ExtratoLido["totais"] = null;
  const iMov = linhas.indexOf("Movimentações");
  const nums = linhas
    .slice(0, iMov > 0 ? iMov : 40)
    .filter((l) => /^[+-]?\d{1,3}(\.\d{3})*,\d{2}$/.test(l))
    .map(num);
  if (nums.length >= 5)
    totais = {
      saldoInicial: nums[0],
      entradas: nums[2],
      saidas: Math.abs(nums[3]),
      saldoFinal: nums[4],
    };

  const movimentos: MovimentoLido[] = [];
  let data: string | null = null;
  let sinal = 0;
  let buf: string[] = [];
  for (const l of linhas.slice(iMov > 0 ? iMov + 1 : 0)) {
    if (RODAPE.test(l) || l === titular || l === conta) continue;
    if (/CPF Ag.ncia Conta|^[•·]{3}\.\d{3}\.\d{3}-[•·]{2} \d{4}/.test(l)) continue;
    if (/^a?\d{2} DE [A-ZÇ]+ DE \d{4}/.test(l)) continue; // período (cabeçalho da página)
    let m = /^(\d{2}) ([A-Z]{3}) (\d{4}) Total de (entradas|sa.das) [+-] ?[\d.]+,\d{2}$/.exec(l);
    if (m) {
      data = dia(m[1], MESES[m[2]], m[3]);
      sinal = m[4] === "entradas" ? 1 : -1;
      buf = [];
      continue;
    }
    m = /^Total de (entradas|sa.das) [+-] ?[\d.]+,\d{2}$/.exec(l);
    if (m) {
      sinal = m[1] === "entradas" ? 1 : -1;
      buf = [];
      continue;
    }
    if (!data) continue;
    m = /^(.*?)\s*(\d{1,3}(?:\.\d{3})*,\d{2})$/.exec(l);
    if (m) {
      if (m[1]) buf.push(m[1]);
      let descricao = buf.join(" ").replace(/\s+/g, " ").trim();
      // Na troca de página o fim do movimento anterior (banco, conta) vem antes do próximo:
      // devolve esse pedaço para o anterior e começa no tipo
      const ini = inicioTipo(descricao);
      if (ini > 0) {
        const ant = movimentos[movimentos.length - 1];
        if (ant) ant.descricao = `${ant.descricao} ${descricao.slice(0, ini).trim()}`;
        descricao = descricao.slice(ini);
      }
      movimentos.push({ data, valor: r2(sinal * num(m[2])), ...separar(descricao), descricao });
      buf = [];
      continue;
    }
    buf.push(l);
  }
  return { banco: "Nubank", titular, inicio, fim, totais, movimentos };
}

// CSV do Nubank (conta): Data,Valor,Identificador,Descrição
export function lerNubankCsv(linhas: string[][]): ExtratoLido {
  const movimentos: MovimentoLido[] = [];
  for (const c of linhas) {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec((c[0] ?? "").trim());
    const v = Number(String(c[1] ?? "").replace(",", "."));
    if (!m || !Number.isFinite(v) || !v) continue;
    const descricao = String(c[3] ?? c[2] ?? "")
      .replace(/\s+/g, " ")
      .trim();
    movimentos.push({
      data: dia(m[1], Number(m[2]), m[3]),
      valor: r2(v),
      ...separar(descricao),
      descricao,
    });
  }
  const datas = movimentos.map((x) => x.data).sort();
  return {
    banco: "Nubank",
    titular: null,
    inicio: datas[0] ?? null,
    fim: datas[datas.length - 1] ?? null,
    totais: null,
    movimentos,
  };
}

// A leitura bate com os totais do banco?
export function conferir(e: ExtratoLido) {
  const ent = r2(e.movimentos.filter((m) => m.valor > 0).reduce((s, m) => s + m.valor, 0));
  const sai = r2(-e.movimentos.filter((m) => m.valor < 0).reduce((s, m) => s + m.valor, 0));
  return {
    entradas: ent,
    saidas: sai,
    ok: e.totais
      ? Math.abs(ent - e.totais.entradas) < 0.01 && Math.abs(sai - e.totais.saidas) < 0.01
      : null,
  };
}
