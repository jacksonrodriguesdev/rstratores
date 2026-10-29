import { Link } from "@tanstack/react-router";
import { Area, AreaChart, Bar, BarChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { ArrowDownRight, ArrowUpRight, ChevronRight, Minus, type LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

// Paleta validada (dataviz): categóricas 1–3 passam no teste de daltonismo em qualquer par
export const COR = {
  azul: "#2a78d6",
  laranja: "#eb6834",
  agua: "#1baf7a",
  amarelo: "#eda100",
  violeta: "#6250d6",
  verdeMarca: "#0b7a3b",
};

export const num = (v: number, d = 0) =>
  v.toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: d });
export const pctTxt = (v: number | null, d = 1) => (v == null ? "—" : `${num(v, d)}%`);
// Variação % entre o período e o anterior (null quando não dá para comparar)
export const variacao = (a: number, b: number) =>
  b ? ((a - b) / Math.abs(b)) * 100 : a ? null : 0;

export function Variacao({ v, inverter }: { v: number | null; inverter?: boolean }) {
  if (v == null)
    return <span className="text-[11px] font-semibold text-muted-foreground">novo</span>;
  const zero = Math.abs(v) < 0.5;
  const bom = inverter ? v < 0 : v > 0;
  const I = zero ? Minus : v > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-bold",
        zero
          ? "bg-muted text-muted-foreground"
          : bom
            ? "bg-emerald-100 text-emerald-800"
            : "bg-red-100 text-red-700",
      )}
      title="Comparado ao período anterior do mesmo tamanho"
    >
      <I className="h-3 w-3" />
      {zero ? "0%" : `${num(Math.abs(v), Math.abs(v) < 10 ? 1 : 0)}%`}
    </span>
  );
}

// Minigráfico (área) do card: valores por dia, com dica ao passar o mouse
export function Sparkline({
  dados,
  cor,
  fmt,
  barras,
}: {
  dados: Array<{ dia: string; v: number }>;
  cor: string;
  fmt: (v: number) => string;
  barras?: boolean;
}) {
  const id = `g${cor.slice(1)}`;
  const dica = (
    <Tooltip
      cursor={
        barras
          ? { fill: "rgba(0,0,0,0.04)" }
          : { stroke: cor, strokeWidth: 1, strokeDasharray: "3 3" }
      }
      content={({ active, payload }) =>
        active && payload?.[0] ? (
          <div className="rounded-md border bg-popover px-2 py-1 text-[11px] shadow">
            <span className="text-muted-foreground">
              {new Date(`${payload[0].payload.dia}T12:00:00Z`).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "short",
                timeZone: "UTC",
              })}
              :{" "}
            </span>
            <b>{fmt(Number(payload[0].value))}</b>
          </div>
        ) : null
      }
    />
  );
  return (
    <div className="h-12 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {barras ? (
          <BarChart data={dados} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <YAxis hide domain={[0, "auto"]} />
            {dica}
            <Bar dataKey="v" fill={cor} radius={[2, 2, 0, 0]} isAnimationActive={false} />
          </BarChart>
        ) : (
          <AreaChart data={dados} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={cor} stopOpacity={0.28} />
                <stop offset="100%" stopColor={cor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={[0, "auto"]} />
            {dica}
            <Area
              type="monotone"
              dataKey="v"
              stroke={cor}
              strokeWidth={2}
              fill={`url(#${id})`}
              isAnimationActive={false}
              dot={false}
            />
          </AreaChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

export function Kpi({
  rotulo,
  valor,
  sub,
  v,
  inverter,
  icone: I,
  cor,
  spark,
  fmt,
  barras,
}: {
  rotulo: string;
  valor: string;
  sub?: React.ReactNode;
  v: number | null;
  inverter?: boolean;
  icone: LucideIcon;
  cor: string;
  spark?: Array<{ dia: string; v: number }>;
  fmt: (v: number) => string;
  barras?: boolean;
}) {
  return (
    <Card className="group relative overflow-hidden p-4 transition hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: `${cor}1a`, color: cor }}
          >
            <I className="h-4 w-4" />
          </span>
          {rotulo}
        </span>
        <Variacao v={v} inverter={inverter} />
      </div>
      <p className="mt-2 text-2xl font-extrabold tracking-tight tabular-nums">{valor}</p>
      {sub && <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>}
      {spark && spark.length > 1 && (
        <div className="-mx-1 mt-2">
          <Sparkline dados={spark} cor={cor} fmt={fmt} barras={barras} />
        </div>
      )}
    </Card>
  );
}

export function Bloco({
  titulo,
  icone: I,
  link,
  linkTexto = "Ver mais",
  children,
  className,
  extra,
}: {
  titulo: string;
  icone: LucideIcon;
  link?: string;
  linkTexto?: string;
  children: React.ReactNode;
  className?: string;
  extra?: React.ReactNode;
}) {
  return (
    <Card className={cn("flex flex-col p-4", className)}>
      <div className="mb-3 flex items-center gap-2">
        <I className="h-4 w-4 text-primary" />
        <h3 className="mr-auto text-sm font-bold">{titulo}</h3>
        {extra}
        {link && (
          <Link
            to={link as any}
            className="inline-flex items-center text-xs font-semibold text-muted-foreground hover:text-primary"
          >
            {linkTexto} <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
      <div className="flex flex-1 flex-col">{children}</div>
    </Card>
  );
}

// Número pequeno com rótulo (dentro dos blocos)
export function Mini({ rotulo, valor, sub }: { rotulo: string; valor: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <p className="text-[11px] text-muted-foreground">{rotulo}</p>
      <p className="text-base font-bold tabular-nums">{valor}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

// Lista com barra proporcional (fontes, canais, peças)
export function ListaBarras({
  itens,
  cor = COR.azul,
  fmt = (v) => num(v),
  vazio = "Sem dados no período",
}: {
  itens: Array<{ nome: string; valor: number; extra?: string; href?: string }>;
  cor?: string;
  fmt?: (v: number) => string;
  vazio?: string;
}) {
  const max = Math.max(...itens.map((i) => i.valor), 1);
  if (!itens.length)
    return <p className="py-4 text-center text-xs text-muted-foreground">{vazio}</p>;
  return (
    <ul className="space-y-2">
      {itens.map((i) => (
        <li key={i.nome} className="text-xs">
          <div className="mb-0.5 flex items-center justify-between gap-2">
            {i.href ? (
              <a
                href={i.href}
                target="_blank"
                rel="noreferrer"
                className="truncate hover:text-primary"
              >
                {i.nome}
              </a>
            ) : (
              <span className="truncate">{i.nome}</span>
            )}
            <span className="shrink-0 font-semibold tabular-nums">
              {fmt(i.valor)}
              {i.extra && <span className="ml-1 font-normal text-muted-foreground">{i.extra}</span>}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(2, (i.valor / max) * 100)}%`, background: cor }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
