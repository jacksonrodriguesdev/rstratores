// Gráficos do Admin → Financeiro: cards com tendência de 12 meses, rendimento financeiro
// (faturamento × gastos por tipo × resultado), acumulado do mês, composição dos gastos e a cascata
// «para onde foi o dinheiro». Tudo em R$. Cores: paleta categórica validada (claro e escuro),
// sempre na mesma ordem: faturamento, peças, taxas, frete, anúncios, despesas.
import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  LabelList,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowDownRight, ArrowUpRight, Minus, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type Mes = {
  mes: string;
  vendas: number;
  receita: number;
  vendaPecas: number;
  custoPecas: number;
  taxas: number;
  frete: number;
  anuncios: number;
  despesas: number;
  lucroBruto: number;
  resultado: number;
  margemBruta: number | null;
  margemLiquida: number | null;
  ticket: number;
  semCusto: number;
};
export type Dia = {
  dia: number;
  vendas: number;
  receita: number;
  custos: number;
  lucroBruto: number;
};

// ---------------------------------------------------------------- cores e formatos
const ESTILO = `
.fin-viz{--fat:#2a78d6;--pecas:#eb6834;--taxas:#1baf7a;--frete:#eda100;--ads:#e87ba4;--desp:#6250d6;--tinta:#1f2a22;--grade:rgba(0,0,0,.07)}
.dark .fin-viz{--fat:#3987e5;--pecas:#d95926;--taxas:#199e70;--frete:#c98500;--ads:#d55181;--desp:#9085e9;--tinta:#eef2ee;--grade:rgba(255,255,255,.08)}
`;
export const COR = {
  receita: "var(--fat)",
  custoPecas: "var(--pecas)",
  taxas: "var(--taxas)",
  frete: "var(--frete)",
  anuncios: "var(--ads)",
  despesas: "var(--desp)",
  tinta: "var(--tinta)",
};
export const GASTOS = [
  ["custoPecas", "Peças (valor pago)"],
  ["taxas", "Taxas de pagamento"],
  ["frete", "Frete e embalagem"],
  ["anuncios", "Anúncios"],
  ["despesas", "Despesas"],
] as const;
type ChaveGasto = (typeof GASTOS)[number][0];

export const brl = (v: number | null | undefined, casas = 2) =>
  v == null
    ? "—"
    : `${v < 0 ? "−" : ""}R$ ${Math.abs(v).toLocaleString("pt-BR", {
        minimumFractionDigits: casas,
        maximumFractionDigits: casas,
      })}`;
const compacto = (v: number) => {
  const a = Math.abs(v);
  const s =
    a >= 1e6
      ? `${(a / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`
      : a >= 1e3
        ? `${(a / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`
        : a.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
  return `${v < 0 ? "−" : ""}R$ ${s}`;
};
const pct = (v: number | null | undefined) =>
  v == null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
export const mesCurto = (m: string) => {
  const [a, n] = m.split("-").map(Number);
  return new Date(Date.UTC(a, n - 1, 15))
    .toLocaleDateString("pt-BR", { month: "short", year: "2-digit", timeZone: "UTC" })
    .replace(".", "")
    .replace(" de ", "/");
};
export const gastosTotais = (m: Mes) => m.custoPecas + m.taxas + m.frete + m.anuncios + m.despesas;

export function EstiloFinanceiro() {
  return <style>{ESTILO}</style>;
}

// ---------------------------------------------------------------- cards
type Metrica = {
  chave: string;
  titulo: string;
  valor: (m: Mes) => number;
  cor: string;
  custo?: boolean; // subir é ruim
  sub: (m: Mes) => string;
  destaque?: boolean;
};
export const METRICAS: Metrica[] = [
  {
    chave: "receita",
    titulo: "Valor de venda",
    valor: (m) => m.receita,
    cor: COR.receita,
    sub: (m) => `${m.vendas} venda(s) · ticket ${brl(m.ticket)}`,
  },
  {
    chave: "custoPecas",
    titulo: "Valor pago pelas peças",
    valor: (m) => m.custoPecas,
    cor: COR.custoPecas,
    custo: true,
    sub: (m) =>
      m.vendaPecas
        ? `peças vendidas por ${brl(m.vendaPecas)} · margem ${pct(((m.vendaPecas - m.custoPecas) / m.vendaPecas) * 100)}`
        : "sem peças vendidas",
  },
  {
    chave: "anuncios",
    titulo: "Gastos em anúncios",
    valor: (m) => m.anuncios,
    cor: COR.anuncios,
    custo: true,
    sub: (m) =>
      m.anuncios
        ? `cada R$ 1 em anúncios → ${brl(m.receita / m.anuncios)} em vendas`
        : "sem gasto em anúncios",
  },
  {
    chave: "taxasFrete",
    titulo: "Taxas e frete",
    valor: (m) => m.taxas + m.frete,
    cor: COR.taxas,
    custo: true,
    sub: (m) => `taxas ${brl(m.taxas)} · frete ${brl(m.frete)}`,
  },
  {
    chave: "despesas",
    titulo: "Despesas",
    valor: (m) => m.despesas,
    cor: COR.despesas,
    custo: true,
    sub: () => "fixas e do mês",
  },
  {
    chave: "gastos",
    titulo: "Gastos totais",
    valor: gastosTotais,
    cor: COR.tinta,
    custo: true,
    sub: (m) => (m.receita ? `${pct((gastosTotais(m) / m.receita) * 100)} do faturamento` : "—"),
  },
  {
    chave: "lucroBruto",
    titulo: "Lucro bruto",
    valor: (m) => m.lucroBruto,
    cor: COR.tinta,
    sub: (m) => `margem bruta ${pct(m.margemBruta)}`,
  },
  {
    chave: "resultado",
    titulo: "Resultado líquido",
    valor: (m) => m.resultado,
    cor: COR.tinta,
    sub: (m) => `margem líquida ${pct(m.margemLiquida)}`,
    destaque: true,
  },
];

function Sparkline({ valores, cor }: { valores: number[]; cor: string }) {
  const w = 96;
  const h = 28;
  const min = Math.min(0, ...valores);
  const max = Math.max(...valores, min + 1);
  const x = (i: number) => (i / Math.max(1, valores.length - 1)) * (w - 6) + 3;
  const y = (v: number) => h - 3 - ((v - min) / (max - min)) * (h - 6);
  const pts = valores.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const ultimo = valores.length - 1;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden className="shrink-0">
      {min < 0 && <line x1={0} x2={w} y1={y(0)} y2={y(0)} stroke="var(--grade)" strokeWidth={1} />}
      <polyline
        points={pts}
        fill="none"
        stroke={cor}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle
        cx={x(ultimo)}
        cy={y(valores[ultimo] ?? 0)}
        r={3.5}
        fill={cor}
        stroke="var(--card)"
        strokeWidth={2}
      />
    </svg>
  );
}

export function CardsFinanceiros({
  meses,
  foco,
  focar,
}: {
  meses: Mes[];
  foco: string | null;
  focar: (c: string | null) => void;
}) {
  const atual = meses[meses.length - 1];
  const anterior = meses[meses.length - 2];
  return (
    <div className="fin-viz grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {METRICAS.map((m) => {
        const v = m.valor(atual);
        const a = anterior ? m.valor(anterior) : 0;
        const delta = a ? ((v - a) / Math.abs(a)) * 100 : null;
        const subiu = delta != null && delta > 0.5;
        const caiu = delta != null && delta < -0.5;
        const bom = m.custo ? caiu : subiu;
        const ruim = m.custo ? subiu : caiu;
        const ativo = foco === m.chave;
        return (
          <button
            key={m.chave}
            type="button"
            onClick={() => focar(ativo ? null : m.chave)}
            aria-pressed={ativo}
            className={cn(
              "group rounded-xl border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              ativo && "ring-2 ring-primary",
              m.destaque && "border-primary/40 bg-primary/[0.03]",
            )}
          >
            <div className="flex items-start gap-2">
              <span
                className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: m.cor }}
              />
              <p className="flex-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {m.titulo}
              </p>
              <Sparkline valores={meses.map(m.valor)} cor={m.cor} />
            </div>
            <p
              className={cn(
                "mt-1 text-2xl font-bold tabular-nums tracking-tight",
                v < 0 && "text-destructive",
              )}
            >
              {brl(v)}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs">
              {delta == null ? (
                <span className="text-muted-foreground">sem mês anterior</span>
              ) : (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 font-semibold",
                    bom && "text-emerald-700 dark:text-emerald-400",
                    ruim && "text-amber-700 dark:text-amber-400",
                    !bom && !ruim && "text-muted-foreground",
                  )}
                >
                  {subiu ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : caiu ? (
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  ) : (
                    <Minus className="h-3.5 w-3.5" />
                  )}
                  {pct(Math.abs(delta))} vs {mesCurto(anterior.mes)}
                </span>
              )}
            </div>
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{m.sub(atual)}</p>
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------- tooltip
function Caixa({
  titulo,
  linhas,
  rodape,
}: {
  titulo: string;
  linhas: Array<[string, string, string?]>;
  rodape?: React.ReactNode;
}) {
  return (
    <div className="min-w-[200px] rounded-lg border bg-popover p-3 text-xs text-popover-foreground shadow-lg">
      <p className="mb-1.5 font-semibold capitalize">{titulo}</p>
      {linhas.map(([nome, valor, cor]) => (
        <p key={nome} className="flex items-center gap-2 py-0.5">
          {cor ? (
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: cor }} />
          ) : (
            <span className="w-2.5" />
          )}
          <span className="flex-1 text-muted-foreground">{nome}</span>
          <span className="font-semibold tabular-nums">{valor}</span>
        </p>
      ))}
      {rodape && <div className="mt-1.5 border-t pt-1.5">{rodape}</div>}
    </div>
  );
}

// ---------------------------------------------------------------- rendimento financeiro
const SERIES = [["receita", "Faturamento"], ...GASTOS, ["resultado", "Resultado"]] as const;

export function GraficoRendimento({
  meses,
  dias,
  mes,
  foco,
  limparFoco,
  escolherMes,
}: {
  meses: Mes[];
  dias: Dia[];
  mes: string;
  foco: string | null;
  limparFoco: () => void;
  escolherMes: (m: string) => void;
}) {
  const [visao, setVisao] = useState<"meses" | "dias">("meses");
  const [ocultas, setOcultas] = useState<Set<string>>(new Set());
  const metrica = METRICAS.find((m) => m.chave === foco);
  const alternar = (k: string) => {
    const n = new Set(ocultas);
    if (n.has(k)) n.delete(k);
    else n.add(k);
    setOcultas(n);
  };
  const dadosMeses = meses.map((m) => ({
    ...m,
    rotulo: mesCurto(m.mes),
    foco: metrica?.valor(m) ?? 0,
  }));
  const media = metrica
    ? dadosMeses.reduce((s, d) => s + d.foco, 0) / Math.max(1, dadosMeses.length)
    : 0;
  const acumulado = useMemo(() => {
    let r = 0;
    let l = 0;
    let c = 0;
    return dias.map((d) => {
      r += d.receita;
      l += d.lucroBruto;
      c += d.custos;
      return { ...d, acReceita: r, acLucro: l, acCustos: c };
    });
  }, [dias]);
  const eixo = { fontSize: 11, fill: "currentColor" };

  return (
    <Card className="fin-viz overflow-hidden p-0">
      <div className="flex flex-wrap items-start gap-3 border-b p-4">
        <div className="flex-1">
          <h2 className="text-lg font-semibold">
            {metrica && visao === "meses" ? metrica.titulo : "Rendimento financeiro"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {visao === "dias"
              ? "Acumulado no mês, dia a dia (R$). Anúncios e despesas entram no fechamento do mês."
              : metrica
                ? `Últimos 12 meses (R$). Linha tracejada: média de ${brl(media)}.`
                : "Faturamento × gastos por tipo e o resultado de cada mês (R$). Clique numa barra para abrir o mês."}
          </p>
        </div>
        {metrica && visao === "meses" && (
          <button
            type="button"
            onClick={limparFoco}
            className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold hover:bg-muted"
          >
            <X className="h-3 w-3" /> Voltar ao rendimento
          </button>
        )}
        <div className="inline-flex rounded-lg border p-0.5 text-xs font-semibold">
          {(
            [
              ["meses", "12 meses"],
              ["dias", `Dias de ${mesCurto(mes)}`],
            ] as const
          ).map(([k, nome]) => (
            <button
              key={k}
              type="button"
              onClick={() => setVisao(k)}
              className={cn(
                "rounded-md px-3 py-1.5 capitalize transition",
                visao === k
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {nome}
            </button>
          ))}
        </div>
      </div>

      {visao === "meses" && !metrica && (
        <div className="flex flex-wrap gap-1.5 px-4 pt-3">
          {SERIES.map(([k, nome]) => {
            const off = ocultas.has(k);
            const cor = k === "resultado" ? COR.tinta : COR[k as keyof typeof COR];
            return (
              <button
                key={k}
                type="button"
                onClick={() => alternar(k)}
                aria-pressed={!off}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition",
                  off ? "opacity-45 line-through" : "hover:bg-muted",
                )}
              >
                {k === "resultado" ? (
                  <span className="h-0.5 w-3 rounded" style={{ background: cor }} />
                ) : (
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: cor }} />
                )}
                {nome}
              </button>
            );
          })}
        </div>
      )}

      <div className="h-[340px] px-2 pb-3 pt-2 text-muted-foreground">
        <ResponsiveContainer width="100%" height="100%">
          {visao === "dias" ? (
            <ComposedChart data={acumulado} margin={{ top: 12, right: 12, left: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="fin-ac-rec" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--fat)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--fat)" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--grade)" />
              <XAxis
                dataKey="dia"
                tick={eixo}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={eixo}
                tickLine={false}
                axisLine={false}
                width={72}
                tickFormatter={compacto}
              />
              <Tooltip
                cursor={{ stroke: "var(--tinta)", strokeOpacity: 0.25 }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as (typeof acumulado)[number];
                  return (
                    <Caixa
                      titulo={`Dia ${d.dia} de ${mesCurto(mes)}`}
                      linhas={[
                        ["Faturamento acumulado", brl(d.acReceita), COR.receita],
                        ["Custos acumulados", brl(d.acCustos), COR.custoPecas],
                        ["Lucro bruto acumulado", brl(d.acLucro), COR.tinta],
                      ]}
                      rodape={
                        <span className="text-muted-foreground">
                          No dia: {d.vendas} venda(s) · {brl(d.receita)}
                        </span>
                      }
                    />
                  );
                }}
              />
              <Area
                type="monotone"
                dataKey="acReceita"
                stroke="var(--fat)"
                strokeWidth={2}
                fill="url(#fin-ac-rec)"
              />
              <Line
                type="monotone"
                dataKey="acCustos"
                stroke="var(--pecas)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="acLucro"
                stroke="var(--tinta)"
                strokeWidth={2}
                dot={false}
                strokeDasharray="5 4"
              />
              <Bar
                dataKey="receita"
                fill="var(--fat)"
                fillOpacity={0.25}
                radius={[3, 3, 0, 0]}
                maxBarSize={10}
              />
            </ComposedChart>
          ) : metrica ? (
            <ComposedChart data={dadosMeses} margin={{ top: 20, right: 12, left: 4, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="var(--grade)" />
              <XAxis dataKey="rotulo" tick={eixo} tickLine={false} axisLine={false} />
              <YAxis
                tick={eixo}
                tickLine={false}
                axisLine={false}
                width={72}
                tickFormatter={compacto}
              />
              <ReferenceLine y={0} stroke="var(--tinta)" strokeOpacity={0.3} />
              <ReferenceLine
                y={media}
                stroke="var(--tinta)"
                strokeDasharray="4 4"
                strokeOpacity={0.6}
              />
              <Tooltip
                cursor={{ fill: "var(--grade)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as (typeof dadosMeses)[number];
                  return (
                    <Caixa
                      titulo={mesCurto(d.mes)}
                      linhas={[
                        [metrica.titulo, brl(d.foco), metrica.cor],
                        ["Média de 12 meses", brl(media)],
                      ]}
                      rodape={<span className="text-muted-foreground">{metrica.sub(d)}</span>}
                    />
                  );
                }}
              />
              <Bar
                dataKey="foco"
                radius={[4, 4, 0, 0]}
                maxBarSize={36}
                onClick={(d: any) => d?.mes && escolherMes(d.mes)}
                className="cursor-pointer"
              >
                {dadosMeses.map((d) => (
                  <Cell key={d.mes} fill={metrica.cor} fillOpacity={d.mes === mes ? 1 : 0.55} />
                ))}
                <LabelList
                  dataKey="foco"
                  position="top"
                  formatter={(v: number) => (v ? compacto(v) : "")}
                  style={{ fontSize: 10, fill: "currentColor" }}
                />
              </Bar>
            </ComposedChart>
          ) : (
            <ComposedChart
              data={dadosMeses}
              margin={{ top: 12, right: 12, left: 4, bottom: 0 }}
              barGap={2}
            >
              <CartesianGrid vertical={false} stroke="var(--grade)" />
              <XAxis dataKey="rotulo" tick={eixo} tickLine={false} axisLine={false} />
              <YAxis
                tick={eixo}
                tickLine={false}
                axisLine={false}
                width={72}
                tickFormatter={compacto}
              />
              <ReferenceLine y={0} stroke="var(--tinta)" strokeOpacity={0.3} />
              <Tooltip
                cursor={{ fill: "var(--grade)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const d = payload[0].payload as Mes;
                  const g = gastosTotais(d);
                  return (
                    <Caixa
                      titulo={mesCurto(d.mes)}
                      linhas={[
                        ["Faturamento", brl(d.receita), COR.receita],
                        ...GASTOS.map(
                          ([k, nome]) => [nome, brl(d[k]), COR[k]] as [string, string, string],
                        ),
                        ["Gastos totais", brl(g)],
                      ]}
                      rodape={
                        <p className="flex justify-between font-semibold">
                          <span>Resultado</span>
                          <span
                            className={cn("tabular-nums", d.resultado < 0 && "text-destructive")}
                          >
                            {brl(d.resultado)} · {pct(d.margemLiquida)}
                          </span>
                        </p>
                      }
                    />
                  );
                }}
              />
              {!ocultas.has("receita") && (
                <Bar
                  dataKey="receita"
                  stackId="fat"
                  fill="var(--fat)"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                  className="cursor-pointer"
                  onClick={(d: any) => d?.mes && escolherMes(d.mes)}
                >
                  {dadosMeses.map((d) => (
                    <Cell key={d.mes} fillOpacity={d.mes === mes ? 1 : 0.7} />
                  ))}
                </Bar>
              )}
              {GASTOS.filter(([k]) => !ocultas.has(k)).map(([k], i, lista) => (
                <Bar
                  key={k}
                  dataKey={k}
                  stackId="gastos"
                  fill={COR[k as ChaveGasto]}
                  stroke="var(--card)"
                  strokeWidth={1}
                  maxBarSize={28}
                  radius={i === lista.length - 1 ? [4, 4, 0, 0] : undefined}
                  className="cursor-pointer"
                  onClick={(d: any) => d?.mes && escolherMes(d.mes)}
                >
                  {dadosMeses.map((d) => (
                    <Cell key={d.mes} fillOpacity={d.mes === mes ? 1 : 0.7} />
                  ))}
                </Bar>
              ))}
              {!ocultas.has("resultado") && (
                <Line
                  type="monotone"
                  dataKey="resultado"
                  stroke="var(--tinta)"
                  strokeWidth={2}
                  dot={{ r: 3.5, fill: "var(--tinta)", stroke: "var(--card)", strokeWidth: 2 }}
                  activeDot={{ r: 5 }}
                />
              )}
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>
      {visao === "dias" && (
        <div className="flex flex-wrap gap-4 border-t px-4 py-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COR.receita }} />{" "}
            Faturamento acumulado (barras: do dia)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-0.5 w-3 rounded" style={{ background: COR.custoPecas }} /> Custos das
            vendas (peças, taxas, frete)
          </span>
          <span className="flex items-center gap-1.5">
            <span
              className="h-0.5 w-3 rounded border-t-2 border-dashed"
              style={{ borderColor: COR.tinta }}
            />{" "}
            Lucro bruto acumulado
          </span>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- composição dos gastos
export function ComposicaoGastos({ m }: { m: Mes }) {
  const total = gastosTotais(m);
  const [sobre, setSobre] = useState<string | null>(null);
  const itens = GASTOS.map(([k, nome]) => ({ k, nome, v: m[k], cor: COR[k] }));
  return (
    <Card className="fin-viz p-4">
      <h2 className="text-lg font-semibold">Para onde vão os gastos</h2>
      <p className="text-xs text-muted-foreground">
        {total
          ? `${brl(total)} no mês · ${m.receita ? `${pct((total / m.receita) * 100)} do faturamento` : "sem faturamento"}`
          : "Sem gastos no mês."}
      </p>
      <div className="mt-4 flex h-4 w-full gap-[2px] overflow-hidden rounded-full bg-muted">
        {total > 0 &&
          itens
            .filter((i) => i.v > 0)
            .map((i) => (
              <div
                key={i.k}
                title={`${i.nome}: ${brl(i.v)} (${pct((i.v / total) * 100)})`}
                onMouseEnter={() => setSobre(i.k)}
                onMouseLeave={() => setSobre(null)}
                className="h-full transition-opacity first:rounded-l-full last:rounded-r-full"
                style={{
                  width: `${(i.v / total) * 100}%`,
                  background: i.cor,
                  opacity: sobre && sobre !== i.k ? 0.35 : 1,
                }}
              />
            ))}
      </div>
      <ul className="mt-4 space-y-2.5">
        {itens.map((i) => {
          const p = total ? (i.v / total) * 100 : 0;
          return (
            <li
              key={i.k}
              onMouseEnter={() => setSobre(i.k)}
              onMouseLeave={() => setSobre(null)}
              className={cn(
                "rounded-md px-1 transition-opacity",
                sobre && sobre !== i.k && "opacity-50",
              )}
            >
              <div className="flex items-center gap-2 text-sm">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: i.cor }} />
                <span className="flex-1">{i.nome}</span>
                <span className="font-semibold tabular-nums">{brl(i.v)}</span>
                <span className="w-12 text-right text-xs tabular-nums text-muted-foreground">
                  {pct(p)}
                </span>
              </div>
              <div className="ml-[18px] mt-1 h-1.5 rounded-full bg-muted">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${p}%`, background: i.cor }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------- cascata
export function Cascata({ m }: { m: Mes }) {
  let corrente = m.receita;
  const passos: Array<{
    nome: string;
    faixa: [number, number];
    valor: number;
    cor: string;
    tipo: "total" | "custo";
  }> = [
    {
      nome: "Faturamento",
      faixa: [0, m.receita],
      valor: m.receita,
      cor: COR.receita,
      tipo: "total",
    },
  ];
  for (const [k, nome] of GASTOS) {
    const v = m[k];
    passos.push({
      nome: nome
        .replace(" (valor pago)", "")
        .replace(" de pagamento", "")
        .replace(" e embalagem", ""),
      faixa: [corrente - v, corrente],
      valor: -v,
      cor: COR[k],
      tipo: "custo",
    });
    corrente -= v;
  }
  passos.push({
    nome: "Resultado",
    faixa: [Math.min(0, corrente), Math.max(0, corrente)],
    valor: corrente,
    cor: corrente < 0 ? "var(--destructive)" : COR.tinta,
    tipo: "total",
  });
  const eixo = { fontSize: 11, fill: "currentColor" };
  return (
    <Card className="fin-viz overflow-hidden p-0">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Do faturamento ao resultado</h2>
        <p className="text-xs text-muted-foreground">
          Cada barra tira um gasto do que foi vendido no mês (R$).
        </p>
      </div>
      <div className="h-[300px] px-2 pb-2 pt-3 text-muted-foreground">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={passos} margin={{ top: 22, right: 12, left: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--grade)" />
            <XAxis dataKey="nome" tick={eixo} tickLine={false} axisLine={false} interval={0} />
            <YAxis
              tick={eixo}
              tickLine={false}
              axisLine={false}
              width={72}
              tickFormatter={compacto}
            />
            <ReferenceLine y={0} stroke="var(--tinta)" strokeOpacity={0.3} />
            <Tooltip
              cursor={{ fill: "var(--grade)" }}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as (typeof passos)[number];
                return (
                  <Caixa
                    titulo={d.nome}
                    linhas={[
                      [d.tipo === "custo" ? "Saiu" : "Valor", brl(d.valor), d.cor],
                      ...(m.receita && d.tipo === "custo"
                        ? ([
                            ["Do faturamento", pct((Math.abs(d.valor) / m.receita) * 100)],
                          ] as Array<[string, string]>)
                        : []),
                    ]}
                  />
                );
              }}
            />
            <Bar dataKey="faixa" radius={4} maxBarSize={56}>
              {passos.map((p) => (
                <Cell key={p.nome} fill={p.cor} />
              ))}
              <LabelList
                dataKey="valor"
                position="top"
                formatter={(v: number) => (v ? compacto(v) : "")}
                style={{ fontSize: 10, fill: "currentColor", fontWeight: 600 }}
              />
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
