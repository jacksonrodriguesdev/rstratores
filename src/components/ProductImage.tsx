import { useEffect, useState } from "react";
import { resolveImageUrl } from "@/lib/products";
import { Tractor, Car } from "lucide-react";
import { useSegment } from "@/components/SegmentContext";
import { cn } from "@/lib/utils";

type Props = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  // Exibida no placeholder quando o produto não tem foto.
  marca?: string | null;
};

export function ProductImage({ src, alt, className, marca }: Props) {
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
    <img decoding="async"
      src={url ?? undefined}
      alt={alt}
      loading="lazy"
      className={cn("h-full w-full object-cover", className)}
      onError={() => setError(true)}
    />
  );
}
