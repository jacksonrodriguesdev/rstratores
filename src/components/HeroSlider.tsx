import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { resolveImageUrls, type Product } from "@/lib/products";
import type { Banner } from "@/lib/banners";
import { cn } from "@/lib/utils";

type Props = {
  banners: Banner[];
  intervalMs?: number;
};

export function HeroSlider({ banners, intervalMs = 5500 }: Props) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (idx >= banners.length) {
      setIdx(0);
    }
  }, [banners.length, idx]);

  useEffect(() => {
    let cancelled = false;
    if (!banners.length) return;
    resolveImageUrls(banners.map((b) => b.image_path)).then((m) => {
      if (!cancelled) setUrls(m);
    });
    return () => {
      cancelled = true;
    };
  }, [banners]);

  useEffect(() => {
    if (banners.length <= 1) return;
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % banners.length);
    }, intervalMs);
    return () => clearInterval(t);
  }, [banners.length, intervalMs]);

  if (!banners.length) return null;

  const go = (dir: 1 | -1) => setIdx((i) => (i + dir + banners.length) % banners.length);

  return (
    <div className="relative h-[220px] w-full overflow-hidden bg-muted sm:h-[320px] md:h-[420px]">
      {banners.map((b, i) => {
        const url = urls[b.image_path];
        const content = (
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-700 ease-out",
              i === idx ? "opacity-100" : "opacity-0",
            )}
            style={{
              backgroundImage: url
                ? `linear-gradient(rgba(0,0,0,0.35), rgba(0,0,0,0.35)), url(${url})`
                : undefined,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        );
        return b.link_url ? (
          <a
            key={b.id}
            href={b.link_url}
            target="_blank"
            rel="noreferrer noopener"
            className="block"
          >
            {content}
          </a>
        ) : (
          <div key={b.id}>{content}</div>
        );
      })}

      {banners.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => go(-1)}
            aria-label="Anterior"
            className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 sm:block"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Próximo"
            className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 rounded-full bg-black/40 p-2 text-white hover:bg-black/60 sm:block"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <div className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Ir para slide ${i + 1}`}
                className={cn(
                  "h-2 rounded-full transition-all",
                  i === idx ? "w-6 bg-white" : "w-2 bg-white/60 hover:bg-white/80",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Re-export to satisfy tree-shaking when only Product type is imported elsewhere.
export type { Product };
