import { useEffect, useState } from "react";
import { resolveImageUrl } from "@/lib/products";
import { Tractor, Car } from "lucide-react";
import { useSegment } from "@/components/SegmentContext";
import { cn } from "@/lib/utils";

type Props = {
  src: string | null | undefined;
  alt: string;
  className?: string;
};

export function ProductImage({ src, alt, className }: Props) {
  let currentSegment = "AGRICOLA";
  try {
    const segmentCtx = useSegment();
    currentSegment = segmentCtx.segment;
  } catch (e) {
    // silently fallback to AGRICOLA if used outside provider
  }

  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setError(false);
    setUrl(null);
    if (!src) return;
    resolveImageUrl(src)
      .then((u) => {
        if (!cancelled) setUrl(u);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [src]);

  const isPlaceholder = src?.toLowerCase().includes("redeparts");

  if (!src || error || isPlaceholder || (url === null && src && !src.startsWith("http"))) {
    const Icon = currentSegment === "AUTOMOTIVA" ? Car : Tractor;
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center bg-zinc-50 border-2 border-dashed border-zinc-200 text-zinc-400 p-4 rounded-xl",
          className,
        )}
      >
        <Icon className="h-10 w-10 mb-3 opacity-30 text-zinc-500" />
        <span className="text-[10px] font-medium text-center uppercase tracking-wider text-zinc-400 max-w-[180px] leading-snug">
          Não possuímos imagem desse produto catalogada ainda.
        </span>
      </div>
    );
  }

  return (
    <img
      src={url ?? undefined}
      alt={alt}
      loading="lazy"
      className={cn("h-full w-full object-cover", className)}
      onError={() => setError(true)}
    />
  );
}
