// Linha do tempo do pedido: etapas feitas (com data), a atual em destaque e as próximas.
import { Check, Package } from "lucide-react";
import { ETAPAS, indiceEtapa, nomeEtapa } from "@/lib/pedidos-comum";
import { useT } from "@/lib/idioma";
import { cn } from "@/lib/utils";

export type PedidoResumo = {
  codigo: string;
  etapa: string;
  cancelado: boolean;
  transportadora: string | null;
  rastreio: string | null;
  criado: string;
  itens: Array<{ nome: string; codigo: string; qtd: number }>;
  historico: Array<{ etapa: string; nota: string | null; quando: string }>;
};

export function LinhaDoTempoPedido({
  p,
  compacto = false,
}: {
  p: PedidoResumo;
  compacto?: boolean;
}) {
  const { t, idioma } = useT();
  const local = idioma === "pt" ? "pt-BR" : "es-UY";
  const atual = indiceEtapa(p.etapa);
  // Última vez que cada etapa foi marcada (data e observação)
  const quando = (id: string) => [...p.historico].reverse().find((h) => h.etapa === id);
  const fmt = (s: string) =>
    new Date(s).toLocaleString(local, {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });

  if (p.cancelado)
    return (
      <p className="rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700 ring-1 ring-red-200">
        {t("Este pedido fue cancelado.", "Este pedido foi cancelado.")}
      </p>
    );

  return (
    <div>
      {/* Barra de progresso */}
      <div className="mb-4 h-2 overflow-hidden rounded-full bg-zinc-100">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${((atual + 1) / ETAPAS.length) * 100}%` }}
        />
      </div>
      <ol className="relative space-y-0">
        {ETAPAS.map((e, i) => {
          const feita = i < atual;
          const agora = i === atual;
          const h = quando(e.id);
          return (
            <li key={e.id} className="relative flex gap-3 pb-5 last:pb-0">
              {i < ETAPAS.length - 1 && (
                <span
                  className={cn(
                    "absolute left-[15px] top-8 h-[calc(100%-24px)] w-0.5",
                    i < atual ? "bg-primary" : "bg-zinc-200",
                  )}
                />
              )}
              <span
                className={cn(
                  "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-4 ring-white",
                  feita && "bg-primary text-white",
                  agora && "bg-amber-400 text-zinc-950",
                  !feita && !agora && "bg-zinc-200 text-zinc-500",
                )}
              >
                {feita ? (
                  <Check className="h-4 w-4" />
                ) : agora ? (
                  <Package className="h-4 w-4" />
                ) : (
                  <span className="text-xs font-bold">{i + 1}</span>
                )}
              </span>
              <div className="min-w-0 pt-1">
                <p className={cn("text-sm font-bold", !feita && !agora && "text-zinc-400")}>
                  {nomeEtapa(e.id, idioma, p.transportadora)}
                </p>
                {(feita || agora) && h && <p className="text-xs text-zinc-500">{fmt(h.quando)}</p>}
                {agora && !compacto && (
                  <p className="mt-1 text-sm text-zinc-700">
                    {idioma === "pt" ? e.textoPt : e.textoEs}
                  </p>
                )}
                {agora && h?.nota && <p className="mt-1 text-sm text-zinc-700">{h.nota}</p>}
                {e.id === "DESPACHADO" && (feita || agora) && p.rastreio && (
                  <p className="mt-1 text-sm">
                    {t("Seguimiento", "Rastreio")}: <b className="font-mono">{p.rastreio}</b>
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
