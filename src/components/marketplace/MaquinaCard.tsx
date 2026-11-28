import { useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BadgeCheck, ChevronLeft, ChevronRight, MapPin, Tractor } from "lucide-react";
import type { AnuncioCard } from "@/lib/marketplace";

const urlFoto = (p: string) => (p.startsWith("http") || p.startsWith("/") ? p : `/uploads/${p}`);

// Card de máquina com slider de fotos: dá pra trocar a imagem (setas/bolinhas/arrastar)
// sem entrar no anúncio. Clicar na foto (ou no corpo) abre o anúncio.
export function MaquinaCard({ a, es }: { a: AnuncioCard; es: boolean }) {
  const fotos = a.fotos && a.fotos.length ? a.fotos : a.foto ? [a.foto] : [];
  const [i, setI] = useState(0);
  const toqueX = useRef<number | null>(null);
  const n = fotos.length;

  const ir = (d: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setI((v) => (n ? (v + d + n) % n : 0));
  };

  const preco =
    a.precoConsultar || a.preco == null
      ? es
        ? "Consultar"
        : "Consultar"
      : `${a.moeda === "USD" ? "US$" : "$U"} ${a.preco.toLocaleString("es-UY")}`;

  const specs = [
    a.ano,
    a.horasKm ? `${a.horasKm.toLocaleString("es-UY")} ${a.unidadeUso ?? ""}`.trim() : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      to="/maquina/$id"
      params={{ id: String(a.id) }}
      className="group flex flex-col overflow-hidden rounded-xl border bg-white transition hover:shadow-lg"
    >
      {/* Slider */}
      <div
        className="relative aspect-[4/3] select-none bg-slate-100"
        onTouchStart={(e) => (toqueX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (toqueX.current == null || n < 2) return;
          const dx = e.changedTouches[0].clientX - toqueX.current;
          if (Math.abs(dx) > 40) ir(dx < 0 ? 1 : -1);
          toqueX.current = null;
        }}
      >
        {n > 0 ? (
          <img
            src={urlFoto(fotos[i])}
            alt={a.titulo}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-300">
            <Tractor className="h-10 w-10" />
          </div>
        )}

        {/* badges */}
        <div className="absolute left-2 top-2 flex gap-1">
          {a.destaque && (
            <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-900 shadow">
              {es ? "DESTACADO" : "DESTAQUE"}
            </span>
          )}
        </div>
        {n > 1 && (
          <span className="absolute right-2 top-2 rounded-full bg-black/55 px-1.5 py-0.5 text-[10px] font-semibold text-white">
            {i + 1}/{n}
          </span>
        )}

        {/* setas (aparecem no hover) */}
        {n > 1 && (
          <>
            <button
              type="button"
              aria-label="anterior"
              onClick={(e) => ir(-1, e)}
              className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-1 text-slate-700 opacity-0 shadow transition group-hover:opacity-100 hover:bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="siguiente"
              onClick={(e) => ir(1, e)}
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-white/85 p-1 text-slate-700 opacity-0 shadow transition group-hover:opacity-100 hover:bg-white"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            {/* bolinhas */}
            <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
              {fotos.slice(0, 8).map((_, d) => (
                <button
                  key={d}
                  type="button"
                  aria-label={`foto ${d + 1}`}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setI(d);
                  }}
                  className={`h-1.5 rounded-full transition-all ${
                    d === i ? "w-4 bg-white" : "w-1.5 bg-white/60"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-3">
        <h3 className="line-clamp-2 min-h-[2.3em] text-sm font-bold leading-tight text-slate-800">
          {a.titulo}
        </h3>
        {specs && <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{specs}</p>}
        <p className="mt-1 text-lg font-extrabold text-emerald-700">{preco}</p>
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-500">
          {a.empresa ? (
            <span className="flex items-center gap-1">
              @{a.empresa.handle}
              {a.empresa.verificada && <BadgeCheck className="h-3.5 w-3.5 text-sky-500" />}
            </span>
          ) : (
            <span />
          )}
          {a.departamento && (
            <span className="flex items-center gap-0.5">
              <MapPin className="h-3 w-3" /> {a.departamento}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
