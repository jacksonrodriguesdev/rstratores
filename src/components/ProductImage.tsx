import { useEffect, useState } from "react";
import { resolveImageUrl } from "@/lib/products";
import { Tractor } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  src: string | null | undefined;
  alt: string;
  className?: string;
};

export function ProductImage({ src, alt, className }: Props) {
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

  if (!src || error || (url === null && src && !src.startsWith("http"))) {
    return (
      <div className={cn("flex items-center justify-center bg-muted text-muted-foreground", className)}>
        <Tractor className="h-8 w-8 opacity-40" />
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
