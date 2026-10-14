import { BandeiraBrasil, BandeiraUruguay } from "@/components/Bandeiras";
import { comPrefixo, tirarPrefixo, useIdioma, type Idioma } from "@/lib/idioma";
import { cn } from "@/lib/utils";

// Guarda a escolha (o aviso "ver em português" não volta a aparecer) e abre a mesma página no outro idioma
export function trocarIdioma(novo: Idioma) {
  try {
    localStorage.setItem("idioma_escolhido", novo);
  } catch {
    /* modo privado */
  }
  const { pathname, search, hash } = window.location;
  window.location.href = comPrefixo(tirarPrefixo(pathname), novo) + search + hash;
}

// ES | PT, com bandeira. variante "escura": sobre o header verde
export function SeletorIdioma({ className, variante = "escura" }: { className?: string; variante?: "escura" | "clara" }) {
  const idioma = useIdioma();
  const opcao = (i: Idioma, Bandeira: typeof BandeiraUruguay, rotulo: string, nome: string) => (
    <button
      type="button"
      onClick={() => i !== idioma && trocarIdioma(i)}
      aria-pressed={i === idioma}
      aria-label={nome}
      title={nome}
      className={cn(
        "flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-bold transition",
        i === idioma
          ? variante === "escura" ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
          : variante === "escura" ? "text-white/70 hover:text-white" : "text-zinc-500 hover:text-zinc-900",
      )}
    >
      <Bandeira className="h-3 w-[18px] rounded-[2px]" /> {rotulo}
    </button>
  );
  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {opcao("es", BandeiraUruguay, "ES", "Español")}
      {opcao("pt", BandeiraBrasil, "PT", "Português")}
    </div>
  );
}
