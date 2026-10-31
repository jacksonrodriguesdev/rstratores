import { useQuery } from "@tanstack/react-query";
import { getPrecosConfigFn } from "@/lib/produtos-admin";
import {
  fmtBRL,
  fmtUYU,
  precoVenda,
  precoDoPais,
  type CamposPreco,
  type ConfigPrecos,
  type PrecoFinal,
} from "@/lib/precos";
import { cn } from "@/lib/utils";
import { useIdioma, type Idioma } from "@/lib/idioma";

// Preço da peça no site, na moeda do país da página: $U na versão em espanhol (Uruguai), R$ na
// versão em português (Brasil). Nunca as duas. Em promoção, mostra o preço "de" riscado e o
// desconto. Sem preço na moeda do país, ou com "mostrar preços" desligado, não mostra nada.
export function usePrecos(inicial?: ConfigPrecos) {
  const { data } = useQuery({
    queryKey: ["precos-config"],
    queryFn: () => getPrecosConfigFn(),
    staleTime: 10 * 60_000,
    initialData: inicial,
  });
  return data;
}

export function usePreco(p: CamposPreco, inicial?: ConfigPrecos): PrecoFinal | null {
  const cfg = usePrecos(inicial);
  const idioma = useIdioma();
  if (!cfg?.mostrar) return null;
  return precoDoPais(precoVenda(p, cfg), idioma);
}

// pr já vem de precoDoPais (só a moeda do país)
export const principalDe = (pr: PrecoFinal, idioma: Idioma = "es") =>
  idioma === "pt" ? fmtBRL(pr.brl!) : fmtUYU(pr.uyu!);

export function PrecoTag({
  p,
  tamanho = "sm",
  className,
  inicial,
}: {
  p: CamposPreco;
  tamanho?: "sm" | "lg";
  className?: string;
  inicial?: ConfigPrecos;
}) {
  const preco = usePreco(p, inicial);
  if (!preco) return null;
  return <PrecoVisual preco={preco} tamanho={tamanho} className={className} />;
}

export function PrecoVisual({
  preco,
  tamanho = "sm",
  className,
}: {
  preco: PrecoFinal;
  tamanho?: "sm" | "lg";
  className?: string;
}) {
  const idioma = useIdioma();
  const pt = idioma === "pt";
  const promo = !!preco.desconto;
  const de = promo
    ? pt
      ? preco.deBrl
        ? fmtBRL(preco.deBrl)
        : null
      : preco.deUyu
        ? fmtUYU(preco.deUyu)
        : null
    : null;
  const lg = tamanho === "lg";
  return (
    <div className={cn("flex flex-col", className)}>
      {promo && de && (
        <div className="flex items-center gap-2">
          <span className={cn("text-zinc-400 line-through", lg ? "text-base" : "text-xs")}>
            {de}
          </span>
          <span
            className={cn(
              "rounded-md font-extrabold",
              preco.selo ? "bg-black text-[#f2c94c]" : "bg-red-600 text-white",
              lg ? "px-2 py-0.5 text-sm" : "px-1.5 py-px text-[10px]",
            )}
          >
            {preco.selo ? `${preco.selo} ` : ""}-{preco.desconto}%
          </span>
        </div>
      )}
      <div className="flex flex-wrap items-baseline gap-x-2">
        <span
          className={cn(
            "font-extrabold tracking-tight",
            promo ? "text-red-600" : "text-zinc-900",
            lg ? "text-3xl md:text-4xl" : "text-lg",
          )}
        >
          {principalDe(preco, idioma)}
        </span>
      </div>
    </div>
  );
}

// Selo "-15%" para o canto da foto nos cards
export function SeloOferta({ p, className }: { p: CamposPreco; className?: string }) {
  const preco = usePreco(p);
  if (!preco?.desconto) return null;
  // Desconto da campanha: selo preto e dourado ("BLACK -30%")
  if (preco.selo)
    return (
      <span
        className={cn(
          "rounded-lg bg-black px-2 py-1 text-xs font-black tracking-wide text-[#f2c94c] shadow ring-1 ring-[#f2c94c]/40",
          className,
        )}
      >
        {preco.selo} -{preco.desconto}%
      </span>
    );
  return (
    <span
      className={cn(
        "rounded-lg bg-red-600 px-2 py-1 text-xs font-extrabold text-white shadow",
        className,
      )}
    >
      OFERTA -{preco.desconto}%
    </span>
  );
}
