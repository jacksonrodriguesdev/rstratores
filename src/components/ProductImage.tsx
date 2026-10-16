import { useEffect, useState } from "react";
import { Tractor, Car, ImageOff } from "lucide-react";
import { useLocation } from "@tanstack/react-router";
import { useIdioma } from "@/lib/idioma";
import { useSegment } from "@/components/SegmentContext";
import { cn } from "@/lib/utils";

type Props = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  // Exibida no placeholder quando o produto não tem foto.
  marca?: string | null;
  // Imagem principal da página (primeira dobra): baixa logo e com prioridade (melhora o LCP)
  prioridade?: boolean;
};

// Endereço público da foto (mesma regra de resolveImageUrl, mas sem esperar: sai no HTML do servidor)
const urlDaFoto = (src: string) =>
  src.startsWith("http") || src.startsWith("/") ? src : `/uploads/${src}`;

export function ProductImage({ src, alt, className, marca, prioridade }: Props) {
  let currentSegment = "AGRICOLA";
  try {
    const segmentCtx = useSegment();
    currentSegment = segmentCtx.segment;
  } catch (e) {
    // silently fallback to AGRICOLA if used outside provider
  }

  const idioma = useIdioma();
  const caminho = useLocation({ select: (l) => l.pathname });
  const url = src ? urlDaFoto(src) : null;
  const [error, setError] = useState(false);
  useEffect(() => setError(false), [src]);
  const carregamento = prioridade
    ? ({ loading: "eager", fetchPriority: "high" } as const)
    : ({ loading: "lazy" } as const);

  const isPlaceholder = src?.toLowerCase().includes("redeparts");

  const semFoto = !src || error || isPlaceholder;
  // Peça agrícola sem foto: aviso "este item ainda não possui imagem" (HTML, não imagem: nada de
  // logo como foto da peça). Em miniaturas pequenas fica só o ícone.
  if (semFoto && currentSegment !== "AUTOMOTIVA") {
    const pt = idioma === "pt" || caminho.startsWith("/admin");
    return (
      <div
        role="img"
        aria-label={`${alt} — ${pt ? "item ainda sem imagem" : "artículo aún sin imagen"}`}
        className={cn(
          "@container flex h-full w-full flex-col items-center justify-center gap-[6%] bg-[repeating-linear-gradient(-45deg,#f4f6f2_0_10px,#eef1ea_10px_20px)] p-[8%] text-center",
          className,
        )}
      >
        <span className="flex aspect-square w-[34%] max-w-20 items-center justify-center rounded-full bg-white text-zinc-400 shadow-sm ring-1 ring-black/5">
          <ImageOff className="h-1/2 w-1/2" strokeWidth={1.6} />
        </span>
        {/* Cartões: versão curta; página da peça: a frase inteira */}
        <span className="hidden text-[10px] font-bold uppercase leading-tight tracking-wide text-zinc-500 @[80px]:block @[220px]:hidden">
          {pt ? "Sem imagem" : "Sin imagen"}
        </span>
        <span className="hidden text-xs font-bold uppercase leading-tight tracking-wide text-zinc-500 @[220px]:block @[300px]:text-sm">
          {pt ? "Este item ainda não possui imagem" : "Este artículo aún no tiene imagen"}
        </span>
        {marca && (
          <span className="hidden text-[10px] font-semibold uppercase tracking-widest text-primary/70 @[200px]:block @[260px]:text-xs">
            {marca}
          </span>
        )}
      </div>
    );
  }

  if (semFoto || url === null) {
    const Icon = currentSegment === "AUTOMOTIVA" ? Car : Tractor;
    return (
      <div
        className={cn(
          "@container flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-primary/5 via-white to-primary/10 p-2",
          className,
        )}
      >
        <div className="flex items-center justify-center rounded-full bg-primary/10 p-[18%] @[120px]:p-4">
          <Icon className="h-full w-full text-primary/50 @[120px]:h-10 @[120px]:w-10" />
        </div>
        {marca && (
          <span className="hidden text-center text-[11px] font-black uppercase tracking-widest text-primary/70 @[120px]:block">
            {marca}
          </span>
        )}
        <span className="hidden text-[10px] font-medium uppercase tracking-wider text-zinc-400 @[120px]:block">
          Foto próximamente
        </span>
      </div>
    );
  }

  return (
    <img
      decoding="async"
      src={url}
      alt={alt}
      {...carregamento}
      className={cn("h-full w-full object-cover", className)}
      onError={() => setError(true)}
    />
  );
}
