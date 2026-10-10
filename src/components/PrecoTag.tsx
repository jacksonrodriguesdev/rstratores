import { useQuery } from "@tanstack/react-query";
import { getPrecosConfigFn } from "@/lib/produtos-admin";
import { fmtBRL, fmtUYU, precoVenda, type CamposPreco, type ConfigPrecos, type PrecoFinal } from "@/lib/precos";
import { cn } from "@/lib/utils";

// Preço da peça no site: $U (cotação do dia) em destaque e R$ menor. Em promoção, mostra o
// preço "de" riscado e o desconto. Sem preço, ou com "mostrar preços" desligado, não mostra nada.
export function usePrecos(inicial?: ConfigPrecos) {
  const { data } = useQuery({ queryKey: ["precos-config"], queryFn: () => getPrecosConfigFn(), staleTime: 10 * 60_000, initialData: inicial });
  return data;
}

export function usePreco(p: CamposPreco, inicial?: ConfigPrecos): PrecoFinal | null {
  const cfg = usePrecos(inicial);
  if (!cfg?.mostrar) return null;
  return precoVenda(p, cfg);
}

const principalDe = (pr: PrecoFinal) => (pr.uyu ? fmtUYU(pr.uyu) : fmtBRL(pr.brl!));

export function PrecoTag({ p, tamanho = "sm", className, inicial }: { p: CamposPreco; tamanho?: "sm" | "lg"; className?: string; inicial?: ConfigPrecos }) {
  const preco = usePreco(p, inicial);
  if (!preco) return null;
  return <PrecoVisual preco={preco} tamanho={tamanho} className={className} />;
}

export function PrecoVisual({ preco, tamanho = "sm", className }: { preco: PrecoFinal; tamanho?: "sm" | "lg"; className?: string }) {
  const promo = !!preco.desconto;
  const de = promo ? (preco.deUyu ? fmtUYU(preco.deUyu) : preco.deBrl ? fmtBRL(preco.deBrl) : null) : null;
  const segundo = preco.uyu && preco.brl ? fmtBRL(preco.brl) : null;
  const lg = tamanho === "lg";
  return (
    <div className={cn("flex flex-col", className)}>
      {promo && de && (
        <div className="flex items-center gap-2">
          <span className={cn("text-zinc-400 line-through", lg ? "text-base" : "text-xs")}>{de}</span>
          <span className={cn("rounded-md bg-red-600 font-extrabold text-white", lg ? "px-2 py-0.5 text-sm" : "px-1.5 py-px text-[10px]")}>-{preco.desconto}%</span>
        </div>
      )}
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className={cn("font-extrabold tracking-tight", promo ? "text-red-600" : "text-zinc-900", lg ? "text-3xl md:text-4xl" : "text-lg")}>{principalDe(preco)}</span>
        {segundo && <span className={cn("font-semibold text-zinc-500", lg ? "text-base" : "text-xs")}>{segundo}</span>}
      </div>
    </div>
  );
}

// Selo "-15%" para o canto da foto nos cards
export function SeloOferta({ p, className }: { p: CamposPreco; className?: string }) {
  const preco = usePreco(p);
  if (!preco?.desconto) return null;
  return <span className={cn("rounded-lg bg-red-600 px-2 py-1 text-xs font-extrabold text-white shadow", className)}>OFERTA -{preco.desconto}%</span>;
}
