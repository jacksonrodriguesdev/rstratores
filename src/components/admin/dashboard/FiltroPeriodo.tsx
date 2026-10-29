import { useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// Datas no horário do Uruguai (AAAA-MM-DD)
export const hojeUY = () => new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
const somarDias = (d: string, n: number) =>
  new Date(Date.parse(`${d}T12:00:00Z`) + n * 86400_000).toISOString().slice(0, 10);
const inicioMes = (d: string) => `${d.slice(0, 8)}01`;
const fimMesAnterior = (d: string) => somarDias(inicioMes(d), -1);

export const ATALHOS: Array<{ id: string; rotulo: string; calc: () => [string, string] }> = [
  { id: "hoje", rotulo: "Hoje", calc: () => [hojeUY(), hojeUY()] },
  { id: "ontem", rotulo: "Ontem", calc: () => [somarDias(hojeUY(), -1), somarDias(hojeUY(), -1)] },
  { id: "7d", rotulo: "7 dias", calc: () => [somarDias(hojeUY(), -6), hojeUY()] },
  { id: "30d", rotulo: "30 dias", calc: () => [somarDias(hojeUY(), -29), hojeUY()] },
  { id: "mes", rotulo: "Este mês", calc: () => [inicioMes(hojeUY()), hojeUY()] },
  {
    id: "mes_ant",
    rotulo: "Mês passado",
    calc: () => [inicioMes(fimMesAnterior(hojeUY())), fimMesAnterior(hojeUY())],
  },
  { id: "90d", rotulo: "90 dias", calc: () => [somarDias(hojeUY(), -89), hojeUY()] },
  { id: "ano", rotulo: "12 meses", calc: () => [somarDias(hojeUY(), -364), hojeUY()] },
];

export const fmtData = (d: string, ano = false) =>
  new Date(`${d}T12:00:00Z`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    ...(ano && { year: "numeric" }),
    timeZone: "UTC",
  });

const paraDate = (d: string) => new Date(`${d}T12:00:00`);
const deDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Barra de período: atalhos + calendário com intervalo livre (até 1 ano)
export function FiltroPeriodo({
  de,
  ate,
  atalho,
  aoMudar,
}: {
  de: string;
  ate: string;
  atalho: string | null;
  aoMudar: (de: string, ate: string, atalho: string | null) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [sel, setSel] = useState<{ from?: Date; to?: Date } | undefined>();
  const hoje = hojeUY();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1 rounded-xl border bg-background p-1 shadow-sm">
        {ATALHOS.map((a) => (
          <button
            key={a.id}
            onClick={() => {
              const [d, t] = a.calc();
              aoMudar(d, t, a.id);
            }}
            className={cn(
              "rounded-lg px-2.5 py-1.5 text-xs font-semibold transition",
              atalho === a.id
                ? "bg-primary text-primary-foreground shadow"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {a.rotulo}
          </button>
        ))}
      </div>
      <Popover
        open={aberto}
        onOpenChange={(v) => {
          setAberto(v);
          if (v) setSel({ from: paraDate(de), to: paraDate(ate) });
        }}
      >
        <PopoverTrigger asChild>
          <button
            className={cn(
              "flex h-9 items-center gap-2 rounded-xl border bg-background px-3 text-sm font-semibold shadow-sm hover:bg-muted",
              !atalho && "border-primary text-primary",
            )}
          >
            <CalendarDays className="h-4 w-4" />
            {de === ate ? fmtData(de, true) : `${fmtData(de)} – ${fmtData(ate, true)}`}
            <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0">
          <Calendar
            mode="range"
            locale={ptBR}
            numberOfMonths={2}
            selected={sel as any}
            onSelect={(r: any) => setSel(r)}
            defaultMonth={sel?.from}
            disabled={{ after: paraDate(hoje) }}
          />
          <div className="flex items-center justify-between gap-2 border-t p-3 text-xs">
            <span className="text-muted-foreground">
              {sel?.from
                ? sel.to
                  ? `${fmtData(deDate(sel.from))} – ${fmtData(deDate(sel.to), true)}`
                  : `${fmtData(deDate(sel.from), true)} – escolha o fim`
                : "Escolha o início"}
            </span>
            <button
              disabled={!sel?.from}
              onClick={() => {
                if (!sel?.from) return;
                const d = deDate(sel.from);
                const t = deDate(sel.to ?? sel.from);
                aoMudar(d, t > hoje ? hoje : t, null);
                setAberto(false);
              }}
              className="rounded-lg bg-primary px-3 py-1.5 font-bold text-primary-foreground disabled:opacity-50"
            >
              Aplicar
            </button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
