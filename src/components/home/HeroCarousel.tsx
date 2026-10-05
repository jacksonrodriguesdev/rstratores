import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { resolveImageUrls } from "@/lib/products";
import type { Banner } from "@/lib/banners";
import { cn } from "@/lib/utils";

const INTERVALO_MS = 5500;

// Banner principal com arrasto (toque/mouse), troca automática e indicadores.
// Celular: cartão arredondado com margem (visual de app). Desktop: largura total.
export function HeroCarousel({
  banners,
  titulo,
  subtitulo,
  tag,
}: {
  banners: Banner[];
  titulo?: string | null;
  subtitulo?: string;
  tag?: string;
}) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [emblaRef, api] = useEmblaCarousel({ loop: banners.length > 1 });
  const [atual, setAtual] = useState(0);
  const [pausado, setPausado] = useState(false);

  useEffect(() => {
    resolveImageUrls(banners.map((b) => b.image_path)).then(setUrls);
  }, [banners]);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => setAtual(api.selectedScrollSnap());
    const onDown = () => setPausado(true);
    const onUp = () => setPausado(false);
    api.on("select", onSelect).on("pointerDown", onDown).on("pointerUp", onUp);
    onSelect();
    return () => {
      api.off("select", onSelect).off("pointerDown", onDown).off("pointerUp", onUp);
    };
  }, [api]);

  // Autoplay: pausa enquanto o usuário arrasta ou está com o mouse em cima.
  useEffect(() => {
    if (!api || pausado || banners.length < 2) return;
    const t = setInterval(() => api.scrollNext(), INTERVALO_MS);
    return () => clearInterval(t);
  }, [api, pausado, banners.length]);

  const ir = useCallback((i: number) => api?.scrollTo(i), [api]);

  return (
    <div
      className="relative px-3 pt-3 md:px-0 md:pt-0"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <div className="overflow-hidden rounded-2xl md:rounded-none" ref={emblaRef}>
        <div className="flex touch-pan-y">
          {banners.map((b, i) => {
            const img = (
              <img
                src={urls[b.image_path]}
                alt=""
                loading={i === 0 ? "eager" : "lazy"}
                className="h-[170px] w-full bg-zinc-200 object-cover sm:h-[240px] md:h-[400px]"
              />
            );
            return (
              <div key={b.id} className="relative min-w-0 flex-[0_0_100%]">
                {b.link_url ? (
                  <a href={b.link_url} className="block">
                    {img}
                  </a>
                ) : (
                  img
                )}
              </div>
            );
          })}
        </div>
      </div>

      {(titulo || subtitulo || tag) && (
        <div className="pointer-events-none absolute inset-0 flex items-center px-6 md:px-0">
          <div className="mx-auto w-full max-w-7xl md:px-8">
            <div className="max-w-md rounded-2xl bg-black/35 p-4 text-white backdrop-blur-sm md:p-6">
              {tag && (
                <span className="mb-2 inline-block rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase text-zinc-900">
                  {tag}
                </span>
              )}
              {titulo && <h1 className="text-xl font-extrabold leading-tight md:text-4xl">{titulo}</h1>}
              {subtitulo && <p className="mt-1 text-sm text-white/90 md:text-base">{subtitulo}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Desktop: degradê para o fundo cinza, onde os cartões de atalho se sobrepõem */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-32 bg-gradient-to-b from-transparent to-zinc-100 md:block" />

      {banners.length > 1 && (
        <>
          <button
            onClick={() => api?.scrollPrev()}
            aria-label="Banner anterior"
            className="absolute left-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-800 shadow-lg transition hover:bg-white md:flex"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            onClick={() => api?.scrollNext()}
            aria-label="Próximo banner"
            className="absolute right-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-800 shadow-lg transition hover:bg-white md:flex"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5 md:bottom-24">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => ir(i)}
                aria-label={`Ir para o banner ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === atual ? "w-6 bg-white" : "w-1.5 bg-white/60",
                )}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
