// Admin → Financeiro: faturamento, custos e lucro do mês com base nas vendas (links pagos entram
// sozinhos; vendas lançadas à mão em Admin → Vendas). Uruguai em $U, Brasil em R$ e o total em R$
// pela cotação do dia da venda. Custos por venda (peças, taxa, frete e embalagem), anúncios do
// Meta (Uruguai), despesas do mês e as taxas de cada forma de pagamento.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Percent,
  Plus,
  Receipt,
  Save,
  Trash2,
  Wallet,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  excluirDespesaFn,
  relatorioFinanceiroFn,
  salvarCustosVendaFn,
  salvarDespesaFn,
  salvarTaxasFn,
} from "@/lib/financeiro";
import { cn } from "@/lib/utils";
import {
  CardsFinanceiros,
  Cascata,
  ComposicaoGastos,
  EstiloFinanceiro,
  GraficoRendimento,
} from "@/components/admin/FinanceiroGraficos";

export const Route = createFileRoute("/admin/financeiro")({ component: PaginaFinanceiro });

type Relatorio = Awaited<ReturnType<typeof relatorioFinanceiroFn>>;
type VendaFin = Relatorio["vendas"][number];
type Despesa = Relatorio["despesas"][number];

const NOME_MES = (m: string) => {
  const [a, n] = m.split("-").map(Number);
  return new Date(Date.UTC(a, n - 1, 15)).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
};
const MES_CURTO = (m: string) => {
  const [a, n] = m.split("-").map(Number);
  return new Date(Date.UTC(a, n - 1, 15))
    .toLocaleDateString("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" })
    .replace(".", "");
};
const somarMes = (mes: string, n: number) => {
  const [a, m] = mes.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1 + n, 1)).toISOString().slice(0, 7);
};
const mesHoje = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "America/Montevideo" }).slice(0, 7);

const dinheiro = (v: number | null | undefined, moeda: string) => {
  if (v == null) return "—";
  const n = Math.abs(v).toLocaleString("pt-BR", {
    minimumFractionDigits: moeda === "UYU" ? 0 : 2,
    maximumFractionDigits: moeda === "UYU" ? 0 : 2,
  });
  return `${v < 0 ? "−" : ""}${moeda === "BRL" ? "R$" : moeda === "USD" ? "US$" : "$U"} ${n}`;
};
const pct = (v: number | null | undefined) =>
  v == null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;

const NOMES: Record<string, string> = {
  LINK: "Link de pagamento",
  WHATSAPP: "WhatsApp",
  SITE: "Site",
  BALCAO: "Balcão",
  TELEFONE: "Telefone",
  MERCADOLIVRE: "Mercado Livre",
  OUTRO: "Outro",
  SEM_CANAL: "Sem canal",
  STRIPE: "Stripe",
  CARTAO: "Cartão (dLocal)",
  PIX: "PIX (dLocal)",
  ABITAB: "Abitab (dLocal)",
  REDPAGOS: "Redpagos (dLocal)",
  TRANSFERENCIA: "Transferência",
  DINHEIRO: "Dinheiro",
  SEM_METODO: "Sem forma de pagamento",
  FIXA: "Fixa",
  ANUNCIOS: "Anúncios",
  PESSOAL: "Pessoal",
  IMPOSTOS: "Impostos",
  OUTRA: "Outra",
};
const CANAIS = ["LINK", "WHATSAPP", "SITE", "BALCAO", "TELEFONE", "MERCADOLIVRE", "OUTRO"];
const METODOS = [
  "STRIPE",
  "CARTAO",
  "PIX",
  "ABITAB",
  "REDPAGOS",
  "TRANSFERENCIA",
  "DINHEIRO",
  "OUTRO",
];

function PaginaFinanceiro() {
  const [mes, setMes] = useState(mesHoje);
  const [venda, setVenda] = useState<VendaFin | null>(null);
  const [despesa, setDespesa] = useState<Partial<Despesa> | null>(null);
  const [taxas, setTaxas] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["financeiro", mes],
    queryFn: () => relatorioFinanceiroFn({ data: { mes } }),
  });
  const [foco, setFoco] = useState<string | null>(null);
  const t = data?.resumo.total;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Wallet className="h-6 w-6 text-primary" /> Financeiro
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Faturamento, custos e lucro com base nas vendas. Links pagos entram sozinhos; as outras
            vendas você lança em{" "}
            <Link to="/admin/vendas" className="font-semibold text-primary hover:underline">
              Vendas e etiquetas
            </Link>
            .
          </p>
        </div>
        <Button variant="outline" onClick={() => setTaxas(true)}>
          <Percent className="mr-1.5 h-4 w-4" /> Taxas
        </Button>
        <Button
          onClick={() => setDespesa({ moeda: "UYU", categoria: "FIXA", recorrente: true, mes })}
        >
          <Plus className="mr-1.5 h-4 w-4" /> Despesa
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          aria-label="Mês anterior"
          onClick={() => setMes(somarMes(mes, -1))}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Input
          type="month"
          value={mes}
          onChange={(e) => e.target.value && setMes(e.target.value)}
          className="w-44"
        />
        <Button
          variant="outline"
          size="icon"
          aria-label="Próximo mês"
          disabled={mes >= mesHoje()}
          onClick={() => setMes(somarMes(mes, 1))}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="ml-2 text-sm font-semibold capitalize">{NOME_MES(mes)}</span>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {error && (
        <Card className="border-destructive p-4 text-sm text-destructive">
          {(error as Error).message}
        </Card>
      )}

      {!!data?.avisos.length && (
        <Card className="space-y-1 border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
          {data.avisos.map((a) => (
            <p key={a} className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {a}
            </p>
          ))}
        </Card>
      )}

      {data && t && (
        <>
          <EstiloFinanceiro />
          <CardsFinanceiros meses={data.meses} foco={foco} focar={setFoco} />
          <GraficoRendimento
            meses={data.meses}
            dias={data.dias}
            mes={mes}
            foco={foco}
            limparFoco={() => setFoco(null)}
            escolherMes={setMes}
          />
          <div className="grid gap-4 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <Cascata m={data.meses[data.meses.length - 1]} />
            </div>
            <div className="lg:col-span-2">
              <ComposicaoGastos m={data.meses[data.meses.length - 1]} />
            </div>
          </div>

          <Demonstrativo r={data} />
          <Meses r={data} mes={mes} escolher={setMes} />

          <div className="grid gap-4 lg:grid-cols-2">
            <Agrupado titulo="Por canal de venda" linhas={data.porCanal} />
            <Agrupado titulo="Por forma de pagamento" linhas={data.porMetodo} />
          </div>

          <VendasDoMes vendas={data.vendas} abrir={setVenda} />
          <Pecas pecas={data.pecas} />
          <Despesas lista={data.despesas} mes={mes} abrir={setDespesa} />
        </>
      )}

      {venda && <DialogoCustos v={venda} fechar={() => setVenda(null)} />}
      {despesa && <DialogoDespesa d={despesa} fechar={() => setDespesa(null)} />}
      {taxas && data && <DialogoTaxas inicial={data.taxas} fechar={() => setTaxas(false)} />}
    </div>
  );
}

// Demonstrativo do mês: Uruguai ($U), Brasil (R$) e total (R$)
function Demonstrativo({ r }: { r: Relatorio }) {
  const cols = [
    { n: "Uruguai", m: "UYU", d: r.resumo.UY },
    { n: "Brasil", m: "BRL", d: r.resumo.BR },
    { n: "Total", m: "BRL", d: r.resumo.total },
  ] as const;
  const linhas: Array<[string, (d: (typeof cols)[number]["d"]) => number, string?]> = [
    ["Faturamento", (d) => d.receita, "forte"],
    ["(−) Custo das peças", (d) => -d.custoPecas],
    ["(−) Taxas de pagamento", (d) => -d.taxas],
    ["(−) Frete e embalagem", (d) => -d.frete],
    ["= Lucro bruto", (d) => d.lucroBruto, "forte"],
    ["(−) Anúncios", (d) => -d.anuncios],
    ["(−) Despesas", (d) => -d.despesas],
    ["= Resultado", (d) => d.resultado, "total"],
  ];
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b p-3">
        <h2 className="font-semibold">Demonstrativo do mês</h2>
        <p className="text-xs text-muted-foreground">
          Cada país na sua moeda; o total em R$ usa a cotação do dia de cada venda
          {r.cotacoes.real ? ` (hoje R$ 1 = $U ${r.cotacoes.real.toLocaleString("pt-BR")})` : ""}.
          {r.moedaMeta && ` Meta Ads em ${r.moedaMeta}, lançado no Uruguai.`}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="p-3 text-left" />
              {cols.map((c) => (
                <th key={c.n} className="p-3 text-right">
                  {c.n} ({c.m === "BRL" ? "R$" : "$U"})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map(([nome, f, tipo]) => (
              <tr key={nome} className={cn("border-t", tipo === "total" && "bg-muted/40")}>
                <td className={cn("p-3", tipo && "font-semibold")}>{nome}</td>
                {cols.map((c) => {
                  const v = f(c.d);
                  return (
                    <td
                      key={c.n}
                      className={cn(
                        "whitespace-nowrap p-3 text-right tabular-nums",
                        tipo && "font-semibold",
                        tipo && v < 0 && "text-destructive",
                      )}
                    >
                      {dinheiro(v, c.m)}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="border-t text-xs text-muted-foreground">
              <td className="p-3">Vendas · ticket médio · margem bruta</td>
              {cols.map((c) => (
                <td key={c.n} className="whitespace-nowrap p-3 text-right">
                  {c.d.vendas} · {dinheiro(c.d.ticket, c.m)} · {pct(c.d.margemBruta)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// Últimos 12 meses (R$): faturamento e resultado, uma barra por mês
function Meses({ r, mes, escolher }: { r: Relatorio; mes: string; escolher: (m: string) => void }) {
  const max = Math.max(1, ...r.meses.map((m) => Math.max(m.receita, Math.abs(m.resultado))));
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b p-3">
        <h2 className="font-semibold">Tabela dos últimos 12 meses (R$)</h2>
        <p className="text-xs text-muted-foreground">Clique no mês para ver os detalhes.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="p-2 text-left">Mês</th>
              <th className="p-2 text-right">Vendas</th>
              <th className="p-2 text-right">Faturamento</th>
              <th className="p-2 text-right">Lucro bruto</th>
              <th className="p-2 text-right">Anúncios + despesas</th>
              <th className="p-2 text-right">Resultado</th>
              <th className="w-1/4 p-2 text-left">Faturamento × resultado</th>
            </tr>
          </thead>
          <tbody>
            {r.meses.map((m) => (
              <tr
                key={m.mes}
                onClick={() => escolher(m.mes)}
                className={cn(
                  "cursor-pointer border-t hover:bg-muted/40",
                  m.mes === mes && "bg-primary/5 font-semibold",
                )}
              >
                <td className="p-2 capitalize">{MES_CURTO(m.mes)}</td>
                <td className="p-2 text-right tabular-nums">{m.vendas}</td>
                <td className="whitespace-nowrap p-2 text-right tabular-nums">
                  {dinheiro(m.receita, "BRL")}
                </td>
                <td className="whitespace-nowrap p-2 text-right tabular-nums">
                  {dinheiro(m.lucroBruto, "BRL")}
                </td>
                <td className="whitespace-nowrap p-2 text-right tabular-nums">
                  {dinheiro(m.anuncios + m.despesas, "BRL")}
                </td>
                <td
                  className={cn(
                    "whitespace-nowrap p-2 text-right tabular-nums",
                    m.resultado < 0 && "text-destructive",
                  )}
                >
                  {dinheiro(m.resultado, "BRL")}
                </td>
                <td
                  className="p-2"
                  title={`Faturamento ${dinheiro(m.receita, "BRL")} · resultado ${dinheiro(m.resultado, "BRL")}`}
                >
                  <div className="space-y-0.5">
                    <div
                      className="h-2 rounded-r bg-primary/70"
                      style={{ width: `${(m.receita / max) * 100}%` }}
                    />
                    <div
                      className={cn(
                        "h-2 rounded-r",
                        m.resultado < 0 ? "bg-destructive/70" : "bg-emerald-600/70",
                      )}
                      style={{ width: `${(Math.abs(m.resultado) / max) * 100}%` }}
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="flex gap-4 border-t p-2 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded bg-primary/70" /> Faturamento
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded bg-emerald-600/70" /> Resultado (lucro)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-4 rounded bg-destructive/70" /> Resultado (prejuízo)
        </span>
      </p>
    </Card>
  );
}

function Agrupado({ titulo, linhas }: { titulo: string; linhas: Relatorio["porCanal"] }) {
  return (
    <Card className="overflow-hidden p-0">
      <h2 className="border-b p-3 font-semibold">
        {titulo} <span className="text-xs font-normal text-muted-foreground">(R$)</span>
      </h2>
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th className="p-2 text-left" />
            <th className="p-2 text-right">Vendas</th>
            <th className="p-2 text-right">Faturamento</th>
            <th className="p-2 text-right">Lucro bruto</th>
            <th className="p-2 text-right">Margem</th>
          </tr>
        </thead>
        <tbody>
          {!linhas.length && (
            <tr>
              <td colSpan={5} className="p-4 text-center text-muted-foreground">
                Nenhuma venda no mês.
              </td>
            </tr>
          )}
          {linhas.map((l) => (
            <tr key={l.nome} className="border-t">
              <td className="p-2">{NOMES[l.nome] ?? l.nome}</td>
              <td className="p-2 text-right tabular-nums">{l.vendas}</td>
              <td className="whitespace-nowrap p-2 text-right tabular-nums">
                {dinheiro(l.receita, "BRL")}
              </td>
              <td className="whitespace-nowrap p-2 text-right tabular-nums">
                {dinheiro(l.lucroBruto, "BRL")}
              </td>
              <td className="p-2 text-right tabular-nums">{pct(l.margemBruta)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function VendasDoMes({ vendas, abrir }: { vendas: VendaFin[]; abrir: (v: VendaFin) => void }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b p-3">
        <h2 className="font-semibold">Vendas do mês</h2>
        <p className="text-xs text-muted-foreground">
          Valores na moeda da venda. Em «Custos» você corrige o custo das peças, a taxa, o frete e a
          embalagem.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="p-2 text-left">Venda</th>
              <th className="p-2 text-left">Cliente</th>
              <th className="p-2 text-left">Canal · pagamento</th>
              <th className="p-2 text-right">Faturamento</th>
              <th className="p-2 text-right">Peças</th>
              <th className="p-2 text-right">Taxa</th>
              <th className="p-2 text-right">Frete/emb.</th>
              <th className="p-2 text-right">Lucro</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {!vendas.length && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-muted-foreground">
                  Nenhuma venda neste mês.
                </td>
              </tr>
            )}
            {vendas.map((v) => (
              <tr key={v.id} className="border-t align-top">
                <td className="p-2">
                  <p className="font-mono text-xs font-bold">{v.codigo}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(v.data).toLocaleDateString("pt-BR")}
                    {v.link_id ? ` · link #${v.link_id}` : ""}
                  </p>
                </td>
                <td className="p-2">
                  <p className="font-semibold">{v.cliente}</p>
                  <p className="text-xs text-muted-foreground">
                    {v.pais === "BR" ? "Brasil" : "Uruguai"}
                  </p>
                </td>
                <td className="p-2 text-xs">
                  {NOMES[v.canal ?? ""] ?? "—"} · {NOMES[v.metodo ?? ""] ?? "—"}
                </td>
                <td className="whitespace-nowrap p-2 text-right tabular-nums">
                  {dinheiro(v.receita, v.moeda)}
                </td>
                <td className="whitespace-nowrap p-2 text-right tabular-nums">
                  {dinheiro(v.custoPecas, v.moeda)}
                  {v.semCusto > 0 && (
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      {v.semCusto} sem custo
                    </p>
                  )}
                </td>
                <td className="whitespace-nowrap p-2 text-right tabular-nums">
                  {dinheiro(v.taxa, v.moeda)}
                </td>
                <td className="whitespace-nowrap p-2 text-right tabular-nums">
                  {dinheiro(v.frete, v.moeda)}
                </td>
                <td
                  className={cn(
                    "whitespace-nowrap p-2 text-right font-semibold tabular-nums",
                    v.lucro < 0 && "text-destructive",
                  )}
                >
                  {dinheiro(v.lucro, v.moeda)}
                  <p className="text-xs font-normal text-muted-foreground">{pct(v.margem)}</p>
                </td>
                <td className="p-2">
                  <Button size="sm" variant="outline" onClick={() => abrir(v)}>
                    <Receipt className="mr-1 h-3.5 w-3.5" /> Custos
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Pecas({ pecas }: { pecas: Relatorio["pecas"] }) {
  if (!pecas.length) return null;
  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b p-3">
        <h2 className="font-semibold">Peças que mais deram lucro no mês (R$)</h2>
        <p className="text-xs text-muted-foreground">
          Sem frete e taxas; desconto do link já descontado.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="p-2 text-left">Peça</th>
              <th className="p-2 text-right">Qtd</th>
              <th className="p-2 text-right">Faturamento</th>
              <th className="p-2 text-right">Custo</th>
              <th className="p-2 text-right">Lucro</th>
            </tr>
          </thead>
          <tbody>
            {pecas.map((p) => (
              <tr key={p.sku} className="border-t">
                <td className="p-2">
                  <p className="line-clamp-1">{p.nome}</p>
                  <p className="font-mono text-xs text-muted-foreground">
                    {p.codigo}
                    {p.semCusto && (
                      <span className="ml-2 font-sans text-amber-700 dark:text-amber-300">
                        sem custo
                      </span>
                    )}
                  </p>
                </td>
                <td className="p-2 text-right tabular-nums">{p.qtd}</td>
                <td className="whitespace-nowrap p-2 text-right tabular-nums">
                  {dinheiro(p.receita, "BRL")}
                </td>
                <td className="whitespace-nowrap p-2 text-right tabular-nums">
                  {dinheiro(p.custo, "BRL")}
                </td>
                <td className="whitespace-nowrap p-2 text-right font-semibold tabular-nums">
                  {dinheiro(p.lucro, "BRL")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Despesas({
  lista,
  mes,
  abrir,
}: {
  lista: Despesa[];
  mes: string;
  abrir: (d: Partial<Despesa>) => void;
}) {
  const qc = useQueryClient();
  const doMes = lista.filter((d) => d.noMes);
  const outras = lista.filter((d) => !d.noMes);
  const excluir = async (d: Despesa) => {
    if (!confirm(`Excluir a despesa «${d.descricao}»? Ela sai de todos os meses.`)) return;
    try {
      await excluirDespesaFn({ data: { id: d.id } });
      qc.invalidateQueries({ queryKey: ["financeiro"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
  };
  const linha = (d: Despesa) => (
    <tr key={d.id} className="border-t">
      <td className="p-2">
        <p className="font-semibold">{d.descricao}</p>
        <p className="text-xs text-muted-foreground">
          {NOMES[d.categoria] ?? d.categoria} ·{" "}
          {d.recorrente
            ? `todo mês desde ${MES_CURTO(d.mes)}${d.mes_fim ? ` até ${MES_CURTO(d.mes_fim)}` : ""}`
            : `só em ${MES_CURTO(d.mes)}`}
        </p>
      </td>
      <td className="p-2 text-xs">{d.moeda === "BRL" ? "Brasil" : "Uruguai"}</td>
      <td className="whitespace-nowrap p-2 text-right tabular-nums">
        {dinheiro(d.valor, d.moeda)}
      </td>
      <td className="whitespace-nowrap p-2 text-right">
        <Button size="sm" variant="ghost" onClick={() => abrir(d)}>
          Editar
        </Button>
        <Button size="icon" variant="ghost" aria-label="Excluir" onClick={() => excluir(d)}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </td>
    </tr>
  );
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-2 border-b p-3">
        <div className="flex-1">
          <h2 className="font-semibold">Despesas</h2>
          <p className="text-xs text-muted-foreground">
            Aluguel, salários, contador, internet, impostos, Google Ads… As fixas entram todo mês.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => abrir({ moeda: "UYU", categoria: "FIXA", recorrente: true, mes })}
        >
          <Plus className="mr-1 h-4 w-4" /> Despesa
        </Button>
      </div>
      <table className="w-full text-sm">
        <tbody>
          <tr className="bg-muted/50 text-xs text-muted-foreground">
            <td colSpan={4} className="p-2 font-semibold capitalize">
              Neste mês ({NOME_MES(mes)})
            </td>
          </tr>
          {!doMes.length && (
            <tr>
              <td colSpan={4} className="p-4 text-center text-muted-foreground">
                Nenhuma despesa neste mês.
              </td>
            </tr>
          )}
          {doMes.map(linha)}
          {!!outras.length && (
            <tr className="bg-muted/50 text-xs text-muted-foreground">
              <td colSpan={4} className="p-2 font-semibold">
                Outros meses
              </td>
            </tr>
          )}
          {outras.map(linha)}
        </tbody>
      </table>
    </Card>
  );
}

// ---------------------------------------------------------------- diálogos
function Campo({
  rotulo,
  children,
  dica,
}: {
  rotulo: string;
  children: React.ReactNode;
  dica?: string;
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{rotulo}</span>
      {children}
      {dica && <span className="block text-xs text-muted-foreground">{dica}</span>}
    </label>
  );
}
const SELECT = "h-9 w-full rounded-md border bg-background px-2 text-sm";
const numOuNulo = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

function DialogoCustos({ v, fechar }: { v: VendaFin; fechar: () => void }) {
  const qc = useQueryClient();
  const sim = v.moeda === "BRL" ? "R$" : "$U";
  const [custos, setCustos] = useState(
    v.itens.map((i) => (i.custo == null ? "" : String(i.custo))),
  );
  const [taxa, setTaxa] = useState(v.taxa == null ? "" : String(v.taxa));
  const [frete, setFrete] = useState(v.frete == null ? "" : String(v.frete));
  const [metodo, setMetodo] = useState(v.metodo ?? "");
  const [canal, setCanal] = useState(v.canal ?? "");
  const [cot, setCot] = useState(v.cotacao_brl == null ? "" : String(v.cotacao_brl));
  const [salvando, setSalvando] = useState(false);
  const custoPecas = v.itens.reduce((s, i, n) => s + i.qtd * (numOuNulo(custos[n]) ?? 0), 0);
  const lucro = v.receita - custoPecas - (numOuNulo(taxa) ?? 0) - (numOuNulo(frete) ?? 0);
  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarCustosVendaFn({
        data: {
          id: v.id,
          custos: custos.map(numOuNulo),
          taxa_pagamento: numOuNulo(taxa),
          frete_custo: numOuNulo(frete),
          metodo: metodo || null,
          canal: canal || null,
          cotacao_brl: numOuNulo(cot),
        },
      });
      toast.success("Custos salvos");
      qc.invalidateQueries({ queryKey: ["financeiro"] });
      fechar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Custos da venda {v.codigo} · {v.cliente}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="p-1 text-left">Peça</th>
                <th className="p-1 text-right">Qtd</th>
                <th className="p-1 text-right">Venda un.</th>
                <th className="w-32 p-1 text-right">Custo un. ({sim})</th>
              </tr>
            </thead>
            <tbody>
              {v.itens.map((i, n) => (
                <tr key={`${i.sku}-${n}`} className="border-t">
                  <td className="p-1">
                    <p className="line-clamp-1">{i.nome}</p>
                    <p className="font-mono text-xs text-muted-foreground">{i.codigo}</p>
                  </td>
                  <td className="p-1 text-right">{i.qtd}</td>
                  <td className="whitespace-nowrap p-1 text-right">{dinheiro(i.valor, v.moeda)}</td>
                  <td className="p-1">
                    <Input
                      inputMode="decimal"
                      value={custos[n]}
                      placeholder="sem custo"
                      onChange={(e) =>
                        setCustos(custos.map((c, k) => (k === n ? e.target.value : c)))
                      }
                      className="h-8 text-right"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-muted-foreground">
            O custo vem do «valor de compra» da peça (em R$, convertido para a moeda da venda).
            Deixe vazio se não souber.
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Campo
              rotulo={`Taxa do pagamento (${sim})`}
              dica="Calculada pelas taxas da forma de pagamento."
            >
              <Input inputMode="decimal" value={taxa} onChange={(e) => setTaxa(e.target.value)} />
            </Campo>
            <Campo rotulo={`Frete e embalagem pagos pela loja (${sim})`}>
              <Input inputMode="decimal" value={frete} onChange={(e) => setFrete(e.target.value)} />
            </Campo>
            <Campo rotulo="Canal da venda">
              <select className={SELECT} value={canal} onChange={(e) => setCanal(e.target.value)}>
                <option value="">—</option>
                {CANAIS.map((c) => (
                  <option key={c} value={c}>
                    {NOMES[c]}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="Forma de pagamento">
              <select className={SELECT} value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                <option value="">—</option>
                {METODOS.map((c) => (
                  <option key={c} value={c}>
                    {NOMES[c]}
                  </option>
                ))}
              </select>
            </Campo>
            {v.moeda === "UYU" && (
              <Campo
                rotulo="Cotação do dia (R$ 1 = $U)"
                dica="Usada para somar esta venda no total em R$."
              >
                <Input inputMode="decimal" value={cot} onChange={(e) => setCot(e.target.value)} />
              </Campo>
            )}
          </div>
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            Faturamento {dinheiro(v.receita, v.moeda)} − peças {dinheiro(custoPecas, v.moeda)} −
            taxa e frete ={" "}
            <b className={cn(lucro < 0 && "text-destructive")}>lucro {dinheiro(lucro, v.moeda)}</b>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={fechar}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-4 w-4" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DialogoDespesa({ d, fechar }: { d: Partial<Despesa>; fechar: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({
    descricao: d.descricao ?? "",
    categoria: d.categoria ?? "FIXA",
    valor: d.valor == null ? "" : String(d.valor),
    moeda: (d.moeda as "UYU" | "BRL") ?? "UYU",
    mes: d.mes ?? mesHoje(),
    recorrente: d.recorrente ?? true,
    mes_fim: d.mes_fim ?? "",
  });
  const [salvando, setSalvando] = useState(false);
  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarDespesaFn({
        data: {
          id: d.id,
          ...f,
          valor: Number(f.valor.replace(",", ".")),
          mes_fim: f.mes_fim || null,
        },
      });
      toast.success("Despesa salva");
      qc.invalidateQueries({ queryKey: ["financeiro"] });
      fechar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{d.id ? "Editar despesa" : "Nova despesa"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Campo rotulo="Descrição">
            <Input
              value={f.descricao}
              onChange={(e) => setF({ ...f, descricao: e.target.value })}
              placeholder="Ex.: aluguel do depósito"
            />
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo="Tipo">
              <select
                className={SELECT}
                value={f.categoria}
                onChange={(e) => setF({ ...f, categoria: e.target.value })}
              >
                {["FIXA", "ANUNCIOS", "PESSOAL", "IMPOSTOS", "OUTRA"].map((c) => (
                  <option key={c} value={c}>
                    {NOMES[c]}
                  </option>
                ))}
              </select>
            </Campo>
            <Campo rotulo="País / moeda">
              <select
                className={SELECT}
                value={f.moeda}
                onChange={(e) => setF({ ...f, moeda: e.target.value as "UYU" | "BRL" })}
              >
                <option value="UYU">Uruguai ($U)</option>
                <option value="BRL">Brasil (R$)</option>
              </select>
            </Campo>
          </div>
          <Campo rotulo={`Valor por mês (${f.moeda === "BRL" ? "R$" : "$U"})`}>
            <Input
              inputMode="decimal"
              value={f.valor}
              onChange={(e) => setF({ ...f, valor: e.target.value })}
            />
          </Campo>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={f.recorrente}
              onChange={(e) => setF({ ...f, recorrente: e.target.checked })}
            />
            Repete todo mês (despesa fixa)
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Campo rotulo={f.recorrente ? "A partir de" : "Mês"}>
              <Input
                type="month"
                value={f.mes}
                onChange={(e) => setF({ ...f, mes: e.target.value })}
              />
            </Campo>
            {f.recorrente && (
              <Campo rotulo="Até (opcional)">
                <Input
                  type="month"
                  value={f.mes_fim}
                  onChange={(e) => setF({ ...f, mes_fim: e.target.value })}
                />
              </Campo>
            )}
          </div>
          {f.categoria === "ANUNCIOS" && (
            <p className="text-xs text-muted-foreground">
              O Meta Ads já entra sozinho quando a conta está conectada; aqui é para Google Ads ou
              outros.
            </p>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={fechar}>
              Cancelar
            </Button>
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-1.5 h-4 w-4" />
              )}
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DialogoTaxas({ inicial, fechar }: { inicial: Relatorio["taxas"]; fechar: () => void }) {
  const qc = useQueryClient();
  const [t, setT] = useState(() =>
    Object.fromEntries(
      METODOS.map((m) => [
        m,
        { pct: String(inicial[m]?.pct ?? 0), fixo: String(inicial[m]?.fixo ?? 0) },
      ]),
    ),
  );
  const [salvando, setSalvando] = useState(false);
  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarTaxasFn({
        data: Object.fromEntries(
          METODOS.map((m) => [
            m,
            {
              pct: Number(t[m].pct.replace(",", ".")) || 0,
              fixo: Number(t[m].fixo.replace(",", ".")) || 0,
            },
          ]),
        ),
      });
      toast.success("Taxas salvas (valem para as próximas vendas)");
      qc.invalidateQueries({ queryKey: ["financeiro"] });
      fechar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Taxas das formas de pagamento</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          A taxa de cada venda nova = % do valor cobrado + valor fixo (em R$, convertido para a
          moeda da venda). Confira no contrato da dLocal e no painel do Stripe. Vendas já lançadas
          não mudam; corrija em «Custos».
        </p>
        <table className="w-full text-sm">
          <thead className="text-xs text-muted-foreground">
            <tr>
              <th className="p-1 text-left">Forma</th>
              <th className="w-24 p-1 text-right">%</th>
              <th className="w-24 p-1 text-right">Fixo (R$)</th>
            </tr>
          </thead>
          <tbody>
            {METODOS.map((m) => (
              <tr key={m} className="border-t">
                <td className="p-1">{NOMES[m]}</td>
                <td className="p-1">
                  <Input
                    inputMode="decimal"
                    className="h-8 text-right"
                    value={t[m].pct}
                    onChange={(e) => setT({ ...t, [m]: { ...t[m], pct: e.target.value } })}
                  />
                </td>
                <td className="p-1">
                  <Input
                    inputMode="decimal"
                    className="h-8 text-right"
                    value={t[m].fixo}
                    onChange={(e) => setT({ ...t, [m]: { ...t[m], fixo: e.target.value } })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={fechar}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1.5 h-4 w-4" />
            )}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
