import { useEffect, useState } from "react";
import { Tractor, Car } from "lucide-react";
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

  const url = src ? urlDaFoto(src) : null;
  const [error, setError] = useState(false);
  useEffect(() => setError(false), [src]);
  const carregamento = prioridade
    ? ({ loading: "eager", fetchPriority: "high" } as const)
    : ({ loading: "lazy" } as const);

  const isPlaceholder = src?.toLowerCase().includes("redeparts");

  const semFoto = !src || error || isPlaceholder;
  // Peça agrícola sem foto: imagem com a logo da AGRO PARTS (public/img/sem-foto.jpg, 500×500,
  // gerada por marketing/sem-foto/gerar.cjs). Não vai para o banco: o Google Shopping recusa logo como foto.
  if (semFoto && currentSegment !== "AUTOMOTIVA") {
    return (
      <img
        decoding="async"
        src="/img/sem-foto.jpg?v=2"
        alt={alt}
        {...carregamento}
        className={cn("h-full w-full object-contain", className)}
      />
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
