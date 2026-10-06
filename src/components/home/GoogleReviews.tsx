import { useQuery } from "@tanstack/react-query";
import useEmblaCarousel from "embla-carousel-react";
import { Star } from "lucide-react";
import { Section } from "@/components/home/Reveal";
import { getAvaliacoesGoogleFn, type AvaliacoesGoogle } from "@/lib/google-reviews";
import { cn } from "@/lib/utils";

// Logo "G" oficial do Google (4 cores), usado para identificar a origem das avaliações.
export function GoogleLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-label="Google" role="img">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.5z" />
    </svg>
  );
}

function Estrelas({ nota, className }: { nota: number; className?: string }) {
  return (
    <div className={cn("flex gap-0.5", className)} aria-label={`${nota} de 5 estrelas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn("h-4 w-4", i <= Math.round(nota) ? "fill-[#FBBC04] text-[#FBBC04]" : "text-zinc-300")}
        />
      ))}
    </div>
  );
}

const CORES_AVATAR = ["bg-emerald-600", "bg-sky-600", "bg-amber-600", "bg-rose-600", "bg-violet-600"];

// Config do bloco (admin > Homepage > Avaliações): avaliações copiadas do perfil no Google,
// usadas quando a Places API não está configurada.
type ConfigManual = {
  googleUrl?: string;
  nota?: number;
  total?: number;
  avaliacoes?: AvaliacoesGoogle["avaliacoes"];
};

export function GoogleReviews({ config, titulo }: { config: ConfigManual; titulo?: string | null }) {
  const { data: api } = useQuery({
    queryKey: ["avaliacoes_google"],
    queryFn: () => getAvaliacoesGoogleFn(),
    staleTime: 60 * 60 * 1000,
  });
  const [emblaRef] = useEmblaCarousel({ align: "start", dragFree: true, containScroll: "trimSnaps" });

  const dados: AvaliacoesGoogle =
    api && api.avaliacoes.length > 0
      ? api
      : {
          origem: "manual",
          nota: config.nota ?? null,
          total: config.total ?? null,
          link: config.googleUrl || null,
          avaliacoes: (config.avaliacoes ?? []).filter((a) => a.autor && a.texto),
        };
  const link = dados.link || config.googleUrl || null;

  // Sem avaliações e sem link do perfil: não há o que mostrar (nunca exibimos avaliações inventadas).
  if (dados.avaliacoes.length === 0 && !link) return null;

  return (
    <Section className="overflow-hidden">
      <div className="flex flex-col gap-5 md:flex-row md:items-stretch md:gap-8">
        {/* Resumo */}
        <div className="flex shrink-0 flex-col justify-center gap-3 md:w-64">
          <div className="flex items-center gap-2">
            <GoogleLogo className="h-7 w-7" />
            <h2 className="text-lg font-bold text-zinc-900">{titulo || "Opiniones en Google"}</h2>
          </div>
          {dados.nota != null && (
            <div className="flex items-end gap-3">
              <span className="text-5xl font-extrabold leading-none text-zinc-900">
                {dados.nota.toFixed(1).replace(".", ",")}
              </span>
              <div className="pb-1">
                <Estrelas nota={dados.nota} />
                {dados.total != null && (
                  <span className="text-xs text-zinc-500">{dados.total} opiniones</span>
                )}
              </div>
            </div>
          )}
          {dados.avaliacoes.length === 0 && (
            <p className="text-sm text-zinc-600">
              ¿Compraste con nosotros? Tu opinión ayuda a otros productores a encontrarnos.
            </p>
          )}
          {link && (
            <div className="flex gap-2">
              <a
                href={link}
                target="_blank"
                rel="noreferrer noopener"
                className="flex-1 rounded-full bg-[#1a73e8] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[#1765cc] active:scale-95"
              >
                {dados.avaliacoes.length ? "Opinar en Google" : "Dejar mi opinión"}
              </a>
            </div>
          )}
        </div>

        {/* Avaliações */}
        {dados.avaliacoes.length > 0 && (
          <div className="min-w-0 flex-1 overflow-hidden" ref={emblaRef}>
            <div className="flex gap-3">
              {dados.avaliacoes.map((a, i) => (
                <article
                  key={i}
                  className="relative flex min-w-0 flex-[0_0_85%] flex-col gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 sm:flex-[0_0_48%] lg:flex-[0_0_32%]"
                >
                  <GoogleLogo className="absolute right-4 top-4 h-5 w-5" />
                  <div className="flex items-center gap-3 pr-6">
                    {a.foto ? (
                      <img decoding="async" src={a.foto} alt="" className="h-10 w-10 rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                      <span
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-full font-bold text-white",
                          CORES_AVATAR[i % CORES_AVATAR.length],
                        )}
                      >
                        {a.autor.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <div className="min-w-0">
                      {a.linkAutor ? (
                        <a
                          href={a.linkAutor}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="block truncate text-sm font-semibold text-zinc-900 hover:underline"
                        >
                          {a.autor}
                        </a>
                      ) : (
                        <span className="block truncate text-sm font-semibold text-zinc-900">{a.autor}</span>
                      )}
                      {a.quando && <span className="text-xs text-zinc-500">{a.quando}</span>}
                    </div>
                  </div>
                  <Estrelas nota={a.nota} />
                  <p className="line-clamp-5 text-sm leading-relaxed text-zinc-700">{a.texto}</p>
                </article>
              ))}
            </div>
          </div>
        )}
      </div>
    </Section>
  );
}
