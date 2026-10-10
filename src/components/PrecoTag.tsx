import { useQuery } from "@tanstack/react-query";
import { getPrecosConfigFn } from "@/lib/produtos-admin";
import { fmtBRL, fmtUYU, precoVenda, type CamposPreco, type ConfigPrecos } from "@/lib/precos";
import { cn } from "@/lib/utils";

// Preço da peça no site: $U (cotação do dia) em destaque e R$ menor.
// Sem preço, ou com "mostrar preços" desligado no admin, não mostra nada.
export function usePrecos(inicial?: ConfigPrecos) {
  const { data } = useQuery({ queryKey: ["precos-config"], queryFn: () => getPrecosConfigFn(), staleTime: 10 * 60_000, initialData: inicial });
  return data;
}

export function usePreco(p: CamposPreco, inicial?: ConfigPrecos) {
  const cfg = usePrecos(inicial);
  if (!cfg?.mostrar) return null;
  return precoVenda(p, cfg);
}

export function PrecoTag({ p, tamanho = "sm", className, inicial }: { p: CamposPreco; tamanho?: "sm" | "lg"; className?: string; inicial?: ConfigPrecos }) {
  const preco = usePreco(p, inicial);
  if (!preco) return null;
  const principal = preco.uyu ? fmtUYU(preco.uyu) : fmtBRL(preco.brl!);
  const segundo = preco.uyu && preco.brl ? fmtBRL(preco.brl) : null;
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2", className)}>
      <span className={cn("font-extrabold tracking-tight text-zinc-900", tamanho === "lg" ? "text-3xl md:text-4xl" : "text-lg")}>{principal}</span>
      {segundo && <span className={cn("font-semibold text-zinc-500", tamanho === "lg" ? "text-base" : "text-xs")}>{segundo}</span>}
    </div>
  );
}
