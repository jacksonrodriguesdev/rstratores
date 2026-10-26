// Sininho do cabeçalho (cliente logado): avisos das etapas do pedido. Confere a cada 60 s;
// ao abrir, marca como lidos.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { marcarLidasFn, notificacoesFn } from "@/lib/pedidos";
import { useT } from "@/lib/idioma";
import { cn } from "@/lib/utils";

export function SinoNotificacoes({ className }: { className?: string }) {
  const { t, idioma } = useT();
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notificacoes"],
    queryFn: () => notificacoesFn(),
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
  const n = data?.naoLidas ?? 0;
  const local = idioma === "pt" ? "pt-BR" : "es-UY";
  return (
    <DropdownMenu
      onOpenChange={async (aberto) => {
        if (aberto && n > 0) {
          await marcarLidasFn().catch(() => {});
          setTimeout(() => qc.invalidateQueries({ queryKey: ["notificacoes"] }), 4000);
        }
      }}
    >
      <DropdownMenuTrigger
        aria-label={t(`Notificaciones (${n} sin leer)`, `Notificações (${n} não lidas)`)}
        className={cn(
          "relative flex h-10 w-10 items-center justify-center rounded-full text-white hover:bg-white/10",
          className,
        )}
      >
        <Bell className={cn("h-5 w-5", n > 0 && "animate-pulse")} />
        {n > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[11px] font-bold text-white ring-2 ring-[#0b3d22]">
            {n > 9 ? "9+" : n}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <DropdownMenuLabel className="px-3 py-2">
          {t("Notificaciones", "Notificações")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-0" />
        <div className="max-h-96 overflow-y-auto">
          {!data?.lista.length ? (
            <p className="p-4 text-sm text-zinc-500">
              {t(
                "Acá vas a ver las novedades de tus pedidos.",
                "Aqui você vai ver as novidades dos seus pedidos.",
              )}
            </p>
          ) : (
            data.lista.map((x) => (
              <Link
                key={x.id}
                to={(x.link || "/cuenta") as any}
                className={cn(
                  "block border-b px-3 py-2.5 last:border-0 hover:bg-zinc-50",
                  !x.lida && "bg-amber-50",
                )}
              >
                <p className="flex items-start gap-2 text-sm font-semibold text-zinc-900">
                  {!x.lida && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-500" />}
                  {x.titulo}
                </p>
                {x.texto && <p className="mt-0.5 line-clamp-2 text-xs text-zinc-600">{x.texto}</p>}
                <p className="mt-0.5 text-[11px] text-zinc-400">
                  {new Date(x.quando).toLocaleString(local, {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </Link>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
