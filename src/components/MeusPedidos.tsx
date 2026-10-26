// Minha conta → Meus pedidos: cada pedido com a etapa atual e a linha do tempo (abre ao tocar)
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronDown, Loader2, Package } from "lucide-react";
import { meusPedidosFn } from "@/lib/pedidos";
import { nomeEtapa } from "@/lib/pedidos-comum";
import { useT } from "@/lib/idioma";
import { cn } from "@/lib/utils";
import { LinhaDoTempoPedido } from "@/components/LinhaDoTempoPedido";

export function MeusPedidos() {
  const { t, idioma } = useT();
  const local = idioma === "pt" ? "pt-BR" : "es-UY";
  const [aberto, setAberto] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["meus-pedidos"],
    queryFn: () => meusPedidosFn(),
  });
  return (
    <div>
      <h2 className="text-xl font-extrabold text-zinc-900">{t("Mis pedidos", "Meus pedidos")}</h2>
      <p className="text-sm text-zinc-500">
        {t("Seguí cada etapa de tus pedidos.", "Acompanhe cada etapa dos seus pedidos.")}
      </p>
      {isLoading ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" /> {t("Cargando…", "Carregando…")}
        </p>
      ) : !data?.length ? (
        <p className="mt-4 rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-600 ring-1 ring-black/5">
          {t(
            "Cuando confirmemos un pedido tuyo, vas a seguirlo acá.",
            "Quando confirmarmos um pedido seu, você vai acompanhar aqui.",
          )}
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {data.map((p) => {
            const abre = aberto === p.codigo || data.length === 1;
            return (
              <li key={p.codigo} className="rounded-2xl ring-1 ring-black/5">
                <button
                  type="button"
                  onClick={() => setAberto(abre ? null : p.codigo)}
                  className="flex w-full items-center gap-3 p-4 text-left"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Package className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-bold text-zinc-900">
                      {t("Pedido", "Pedido")} {p.codigo}
                    </span>
                    <span className="block text-xs text-zinc-500">
                      {new Date(p.criado).toLocaleDateString(local)} · {p.itens.length}{" "}
                      {t("pieza(s)", "peça(s)")}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-xs font-bold",
                      p.cancelado
                        ? "bg-red-100 text-red-700"
                        : p.etapa === "ENTREGUE"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-900",
                    )}
                  >
                    {p.cancelado
                      ? t("Cancelado", "Cancelado")
                      : nomeEtapa(p.etapa, idioma, p.transportadora)}
                  </span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-zinc-400 transition",
                      abre && "rotate-180",
                    )}
                  />
                </button>
                {abre && (
                  <div className="border-t p-4">
                    <LinhaDoTempoPedido p={p} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
