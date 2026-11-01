// Peças pequenas do Extrato do banco: abas, gráfico de linha mini (12 meses) e variação
import { Link, useLocation } from "@tanstack/react-router";
import { LayoutDashboard, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { cn } from "@/lib/utils";
import { brl, nomeMes } from "@/lib/extrato-formato";

export function Abas() {
  const { pathname } = useLocation();
  const abas = [
    {
      to: "/admin/extratos",
      rotulo: "Panorama",
      icone: LayoutDashboard,
      ativo: !/pessoal/.test(pathname),
    },
    {
      to: "/admin/extratos/pessoal",
      rotulo: "Pessoal",
      icone: Wallet,
      ativo: /pessoal/.test(pathname),
    },
  ] as const;
  return (
    <nav className="flex gap-1 border-b">
      {abas.map((a) => (
        <Link
          key={a.to}
          to={a.to}
          className={cn(
            "-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-semibold",
            a.ativo
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground",
          )}
        >
          <a.icone className="h-4 w-4" /> {a.rotulo}
        </Link>
      ))}
    </nav>
  );
}

// Linha pequena dos 12 meses; o mês escolhido ganha um ponto
export function Mini({
  serie,
  cor,
  destaque,
}: {
  serie: Array<{ mes: string; valor: number }>;
  cor: string;
  destaque?: string | null;
}) {
  const id = `g${cor.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <div className="h-12">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={serie} margin={{ top: 4, right: 2, bottom: 0, left: 2 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cor} stopOpacity={0.35} />
              <stop offset="100%" stopColor={cor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip
            cursor={false}
            content={({ active, payload }: any) =>
              active && payload?.length ? (
                <div className="rounded border bg-background px-2 py-1 text-xs shadow">
                  <span className="capitalize">{nomeMes(payload[0].payload.mes)}</span>:{" "}
                  <b>{brl(payload[0].value, 0)}</b>
                </div>
              ) : null
            }
          />
          <Area
            type="monotone"
            dataKey="valor"
            stroke={cor}
            strokeWidth={2}
            fill={`url(#${id})`}
            isAnimationActive={false}
            dot={(p: any) =>
              p.payload.mes === destaque ? (
                <circle
                  key={p.key}
                  cx={p.cx}
                  cy={p.cy}
                  r={3.5}
                  fill={cor}
                  stroke="var(--card, #fff)"
                  strokeWidth={2}
                />
              ) : (
                <g key={p.key} />
              )
            }
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// "+23% da média" (gastar mais é ruim quando `bomSubir` é falso)
export function Variacao({
  valor,
  media,
  bomSubir = true,
}: {
  valor: number;
  media: number;
  bomSubir?: boolean;
}) {
  if (!media) return <span className="text-xs text-muted-foreground">sem média ainda</span>;
  const pct = Math.round(((valor - media) / media) * 100);
  if (Math.abs(pct) < 3)
    return <span className="text-xs text-muted-foreground">na média ({brl(media, 0)})</span>;
  const bom = pct > 0 === bomSubir;
  const Icone = pct > 0 ? TrendingUp : TrendingDown;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold",
        bom ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400",
      )}
      title={`Média por mês: ${brl(media)}`}
    >
      <Icone className="h-3.5 w-3.5" />
      {pct > 0 ? "+" : ""}
      {pct}% da média
    </span>
  );
}
