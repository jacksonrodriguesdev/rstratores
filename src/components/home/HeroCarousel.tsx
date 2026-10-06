import { useCallback, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Banner } from "@/lib/banners";
import { cn } from "@/lib/utils";

const INTERVALO_MS = 5500;

const urlImagem = (p: string) => (p.startsWith("http") || p.startsWith("/") ? p : `/uploads/${p}`);

// "hero": topo da home (largura total no desktop). "faixa": faixa promocional entre seções.
const ESTILOS = {
  hero: {
    caixa: "relative px-3 pt-3 md:px-0 md:pt-0",
    trilho: "rounded-2xl md:rounded-none",
    img: "h-[170px] sm:h-[240px] md:h-[400px]",
    pontos: "bottom-3 md:bottom-24",
  },
  faixa: {
    caixa: "relative",
    trilho: "rounded-2xl shadow-sm",
    img: "aspect-[800/300] md:aspect-[1600/250]",
    pontos: "bottom-2",
  },
};

// Banner principal com arrasto (toque/mouse), troca automática e indicadores.
// Celular: cartão arredondado com margem (visual de app). Desktop: largura total.
export function HeroCarousel({
  banners,
  titulo,
  subtitulo,
  tag,
  variante = "hero",
}: {
  banners: Banner[];
  titulo?: string | null;
  subtitulo?: string;
  tag?: string;
  variante?: keyof typeof ESTILOS;
}) {
  const estilo = ESTILOS[variante];
  const [emblaRef, api] = useEmblaCarousel({ loop: banners.length > 1 });
  const [atual, setAtual] = useState(0);
  const [pausado, setPausado] = useState(false);

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
      className={estilo.caixa}
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
    >
      <div className={cn("overflow-hidden", estilo.trilho)} ref={emblaRef}>
        <div className="flex touch-pan-y">
          {banners.map((b, i) => {
            // Arte de celular (opcional) entra abaixo de 768 px; senão usa a do computador.
            const img = (
              <picture>
                {b.image_path_mobile && (
                  <source media="(max-width: 767px)" srcSet={urlImagem(b.image_path_mobile)} />
                )}
                <img decoding="async"
                  src={urlImagem(b.image_path)}
                  alt={b.titulo ?? ""}
                  loading={i === 0 && variante === "hero" ? "eager" : "lazy"}
                  className={cn("w-full bg-zinc-200 object-cover", estilo.img)}
                />
              </picture>
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

      {variante === "hero" && (titulo || subtitulo || tag) && (
        <div className="pointer-events-none absolute inset-0 flex items-center px-6 md:px-0">
          <div className="mx-auto w-full max-w-7xl md:px-8">
            <div className="max-w-md rounded-2xl bg-black/35 p-4 text-white backdrop-blur-sm md:p-6">
              {tag && (
                <span className="mb-2 inline-block rounded-full bg-accent px-3 py-1 text-[11px] font-bold uppercase text-zinc-900">
                  {tag}
                </span>
              )}
              {titulo && <h2 className="text-xl font-extrabold leading-tight md:text-4xl">{titulo}</h2>}
              {subtitulo && <p className="mt-1 text-sm text-white/90 md:text-base">{subtitulo}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Desktop: degradê para o fundo cinza, onde os cartões de atalho se sobrepõem */}
      {variante === "hero" && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 hidden h-32 bg-gradient-to-b from-transparent to-zinc-100 md:block" />
      )}

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
            aria-label="Banner siguiente"
            className="absolute right-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-zinc-800 shadow-lg transition hover:bg-white md:flex"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <div className={cn("absolute left-1/2 flex -translate-x-1/2 gap-1.5", estilo.pontos)}>
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
