import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, CheckCircle2, Lock, Unlock, ArrowRight, FileText, Wrench } from "lucide-react";
import { listarCatalogosFn, type Catalogo } from "@/lib/catalogos";
import { getSessionFn } from "@/lib/user-auth";
import { Reveal } from "@/components/home/Reveal";
import { cn } from "@/lib/utils";

// Chamada "Creá tu cuenta y accedé a todos los catálogos" (home e página de produto).
// Some sozinha quando não há catálogo publicado: não promete o que não existe.
const COR_MARCA: Record<string, string> = {
  "Massey Ferguson": "#c8102e", Valtra: "#d52b1e", "John Deere": "#367c2b", "New Holland": "#0a5bb5",
  "Case IH": "#b5121b", Ford: "#1a4fa3", Agrale: "#e07b00",
};
const corDe = (m?: string | null) => (m && COR_MARCA[m]) || "#0b7a3b";

function useCatalogos() {
  const cat = useQuery({ queryKey: ["catalogos-publicos"], queryFn: () => listarCatalogosFn(), staleTime: 5 * 60_000 });
  const ses = useQuery({ queryKey: ["auth_session"], queryFn: () => getSessionFn() });
  const lista = (cat.data ?? []) as Catalogo[];
  const marcas = [...new Set(lista.map((c) => c.marca).filter(Boolean))] as string[];
  return { lista, marcas, logado: !!ses.data, pronto: cat.isSuccess };
}

const CADASTRO = `/cadastro?redirect=${encodeURIComponent("/catalogos")}`;
const LOGIN = `/login?redirect=${encodeURIComponent("/catalogos")}`;

// Capa de manual desenhada (sem fotos de terceiros)
function Capa({ marca, tipo, className, style }: { marca: string; tipo: string; className?: string; style?: React.CSSProperties }) {
  const cor = corDe(marca);
  return (
    <div className={cn("absolute w-40 rounded-xl bg-white shadow-2xl ring-1 ring-black/5 md:w-48", className)} style={style}>
      <div className="h-2.5 rounded-t-xl" style={{ background: cor }} />
      <div className="p-3.5 md:p-4">
        <p className="text-[10px] font-extrabold uppercase tracking-wider" style={{ color: cor }}>{marca}</p>
        <p className="mt-1 text-sm font-extrabold leading-tight text-zinc-900">{tipo}</p>
        <div className="mt-3 space-y-1.5">
          {[100, 85, 92, 70, 80].map((w, i) => <div key={i} className="h-1.5 rounded-full bg-zinc-100" style={{ width: `${w}%` }} />)}
        </div>
        <div className="mt-3 flex items-center justify-between">
          <span className="rounded-md bg-red-50 px-1.5 py-0.5 text-[10px] font-extrabold text-red-600 ring-1 ring-red-100">PDF</span>
          <FileText className="h-4 w-4 text-zinc-300" />
        </div>
      </div>
    </div>
  );
}

export function CatalogosCtaBlock() {
  const { lista, marcas, logado, pronto } = useCatalogos();
  if (!pronto || lista.length === 0) return null;
  // Capas da pilha: tipos e marcas reais, completando com as marcas que mais vendem
  const capas = [...lista.slice(0, 3).map((c) => ({ marca: c.marca || "AGRO PARTS", tipo: c.tipo }))];
  for (const m of ["Massey Ferguson", "John Deere", "Valtra"]) if (capas.length < 3 && !capas.some((c) => c.marca === m)) capas.push({ marca: m, tipo: "Catálogo de piezas" });

  return (
    <Reveal>
      <section className="relative overflow-hidden rounded-2xl bg-[#06321b] text-white shadow-sm" aria-labelledby="cta-catalogos">
        <div aria-hidden className="absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(-28deg,#fff_0_2px,transparent_2px_42px)]" />
        <div aria-hidden className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl" />
        <div aria-hidden className="absolute -bottom-32 right-10 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" />

        <div className="relative grid items-center gap-6 p-5 md:grid-cols-[1.15fr_1fr] md:gap-10 md:p-10">
          <div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#06321b]">
                <Wrench className="h-3.5 w-3.5" /> Para mecánicos y talleres
              </span>
              {/* No celular a pilha de manuais some; fica só o ícone */}
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/15 md:hidden">
                {logado ? <Unlock className="h-4 w-4 text-emerald-300" /> : <Lock className="h-4 w-4 text-amber-300" />}
              </span>
            </div>
            <h2 id="cta-catalogos" className="mt-3 text-2xl font-extrabold leading-tight md:text-[2.4rem] md:leading-[1.1]">
              {logado ? "Tus catálogos de mantenimiento y piezas, a un clic" : "Creá tu cuenta y accedé a todos nuestros catálogos"}
            </h2>
            <p className="mt-3 max-w-xl text-sm text-white/80 md:text-base">
              Manuales de mantenimiento y catálogos de piezas de tractores y cosechadoras, en PDF.
              {logado ? " Ya tenés acceso con tu cuenta." : " Gratis: solo necesitás registrarte."}
            </p>

            <ul className="mt-5 grid gap-2 text-sm sm:grid-cols-2">
              {[
                `${lista.length} ${lista.length === 1 ? "catálogo disponible" : "catálogos disponibles"}`,
                "Encontrá el código exacto de la pieza",
                "Abrilos desde el celular o la PC",
                "Cotizá la pieza al instante por WhatsApp",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2 text-white/90"><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-300" /> {t}</li>
              ))}
            </ul>

            {marcas.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {marcas.slice(0, 6).map((m) => (
                  <span key={m} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold ring-1 ring-white/15">
                    <span className="h-2 w-2 rounded-full" style={{ background: corDe(m) }} /> {m}
                  </span>
                ))}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
              {logado ? (
                <Link to="/catalogos" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 font-extrabold text-[#06321b] shadow-lg shadow-black/20 transition hover:bg-amber-300 active:scale-[0.98]">
                  <BookOpen className="h-5 w-5" /> Ver catálogos <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <>
                  <a href={CADASTRO} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-amber-400 px-6 font-extrabold text-[#06321b] shadow-lg shadow-black/20 transition hover:bg-amber-300 active:scale-[0.98]">
                    Crear cuenta gratis <ArrowRight className="h-4 w-4" />
                  </a>
                  <a href={LOGIN} className="inline-flex h-12 items-center justify-center rounded-xl px-5 text-sm font-bold text-white ring-1 ring-white/30 transition hover:bg-white/10">
                    Ya tengo cuenta
                  </a>
                </>
              )}
            </div>
            {!logado && <p className="mt-3 text-xs text-white/55">Te lleva menos de un minuto. Sin costo y sin compromiso de compra.</p>}
          </div>

          {/* Pilha de manuais */}
          <Link to="/catalogos" aria-label="Ver catálogos" className="group relative mx-auto hidden h-72 w-full max-w-sm md:block">
            <Capa marca={capas[2].marca} tipo={capas[2].tipo} className="left-[8%] top-6 -rotate-[10deg] opacity-90 transition duration-500 group-hover:-translate-x-2 group-hover:-rotate-[13deg]" />
            <Capa marca={capas[1].marca} tipo={capas[1].tipo} className="right-[6%] top-4 rotate-[8deg] opacity-95 transition duration-500 group-hover:translate-x-2 group-hover:rotate-[11deg]" />
            <Capa marca={capas[0].marca} tipo={capas[0].tipo} className="left-1/2 top-0 -translate-x-1/2 transition duration-500 group-hover:-translate-y-2" />
            <span className="absolute bottom-0 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-white px-4 py-2 text-sm font-extrabold text-[#06321b] shadow-xl">
              {logado ? <Unlock className="h-4 w-4 text-emerald-600" /> : <Lock className="h-4 w-4 text-amber-500" />}
              {logado ? "Acceso liberado" : "Solo para clientes registrados"}
            </span>
          </Link>
        </div>
      </section>
    </Reveal>
  );
}

// Versão compacta para a página de produto
export function CatalogosCtaCompacto({ marca }: { marca?: string | null }) {
  const { lista, marcas, logado, pronto } = useCatalogos();
  if (!pronto || lista.length === 0) return null;
  const daMarca = marca ? marcas.find((m) => marca.toLowerCase().includes(m.toLowerCase()) || m.toLowerCase().includes(marca.toLowerCase())) : undefined;
  const cor = corDe(daMarca);
  return (
    <div className="mt-6 flex flex-col gap-3 overflow-hidden rounded-xl border bg-white p-4 sm:flex-row sm:items-center">
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: cor }}>
        <BookOpen className="h-6 w-6" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-bold text-zinc-900">{daMarca ? `¿Necesitás el catálogo ${daMarca}?` : "¿Necesitás el manual de tu tractor?"}</p>
        <p className="text-sm text-zinc-600">
          {logado ? "Abrí nuestros catálogos de mantenimiento y piezas en PDF." : `Creá tu cuenta gratis y accedé a ${lista.length} ${lista.length === 1 ? "catálogo" : "catálogos"} de mantenimiento y piezas.`}
        </p>
      </div>
      <a href={logado ? "/catalogos" : CADASTRO} className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-white hover:bg-primary/90">
        {logado ? "Ver catálogos" : "Acceder gratis"} <ArrowRight className="h-4 w-4" />
      </a>
    </div>
  );
}
