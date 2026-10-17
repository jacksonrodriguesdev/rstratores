// Campanha no ar (Black Friday…): barra de contagem no topo de todas as páginas, hero da home e
// vitrine de ofertas. Os dados vêm do layout raiz (loader), então tudo sai no HTML do servidor.
import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Flame, Zap } from "lucide-react";
import type { CampanhaPublica } from "@/lib/campanha-comum";
import { useT } from "@/lib/idioma";
import { cn } from "@/lib/utils";
import { CardLoja } from "@/components/CardPeca";
import type { Product } from "@/lib/products";

export function useCampanha(): CampanhaPublica | null {
  return useRouterState({
    select: (s): CampanhaPublica | null =>
      (s.matches.find((m) => m.routeId === "__root__")?.loaderData as any)?.campanha ?? null,
  }) as CampanhaPublica | null;
}

const txt = (c: Record<string, any>, k: string, idioma: "es" | "pt") =>
  String((idioma === "pt" ? c[`${k}_pt`] || c[k] : c[k]) ?? "");

// Contagem regressiva. No servidor e no 1º desenho mostra "--" (o HTML é igual nos dois lados)
export function useRestante(alvo: string | null | undefined) {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    if (!alvo) return;
    const fim = new Date(alvo).getTime();
    const tick = () => setMs(Math.max(0, fim - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [alvo]);
  if (ms == null) return null;
  const s = Math.floor(ms / 1000);
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}
const dois = (n: number) => String(n).padStart(2, "0");

export function Contagem({ alvo, tamanho = "sm" }: { alvo: string; tamanho?: "sm" | "lg" }) {
  const { t } = useT();
  const r = useRestante(alvo);
  const caixas: Array<[string, string]> = [
    [r ? String(r.d) : "--", t("días", "dias")],
    [r ? dois(r.h) : "--", "h"],
    [r ? dois(r.m) : "--", "min"],
    [r ? dois(r.s) : "--", "s"],
  ];
  const lg = tamanho === "lg";
  return (
    <span
      className={cn("inline-flex items-center", lg ? "gap-2 md:gap-3" : "gap-1")}
      role="timer"
      aria-live="off"
    >
      {caixas.map(([v, rot], i) => (
        <span
          key={i}
          className={cn(
            "flex flex-col items-center rounded-lg bg-white/10 ring-1 ring-[#f2c94c]/30",
            lg ? "min-w-16 px-3 py-2 md:min-w-20 md:px-4 md:py-3" : "min-w-9 px-1.5 py-0.5",
          )}
        >
          <span
            className={cn(
              "font-mono font-black tabular-nums leading-none text-[#f2c94c]",
              lg ? "text-3xl md:text-5xl" : "text-sm",
            )}
          >
            {v}
          </span>
          <span
            className={cn(
              "font-semibold uppercase text-white/70",
              lg ? "mt-1 text-xs" : "text-[9px] leading-none",
            )}
          >
            {rot}
          </span>
        </span>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------- barra do topo (todas as páginas)
export function BarraCampanha() {
  const c = useCampanha();
  const { idioma, href } = useT();
  if (!c || !c.config.mostrar_barra) return null;
  const pre = c.fase === "PRE";
  const texto = txt(c.config, pre ? "barra_pre" : "barra_black", idioma);
  return (
    <a
      href={href("/black-friday")}
      className="relative block overflow-hidden border-b border-[#f2c94c]/25 bg-black text-white"
    >
      {/* brilho dourado passando */}
      <span aria-hidden className="ap-ticker absolute inset-0 overflow-hidden opacity-40">
        <span className="animate-brilho absolute inset-y-0 left-0 w-[200%] bg-[linear-gradient(90deg,transparent_0%,rgba(242,201,76,.25)_25%,transparent_50%,rgba(242,201,76,.25)_75%,transparent_100%)]" />
      </span>
      <span className="relative mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-3 gap-y-1 px-3 py-1.5 text-center text-[12px] font-bold md:text-sm">
        <span className="flex items-center gap-1.5 text-[#f2c94c]">
          {pre ? <Zap className="h-4 w-4" /> : <Flame className="h-4 w-4" />}
          <span className="font-black tracking-wider">{c.config.selo}</span>
        </span>
        <span>{texto}</span>
        <Contagem alvo={c.alvo} />
        {!pre && c.maxPct > 0 && (
          <span className="rounded-full bg-[#f2c94c] px-2 py-0.5 text-[11px] font-black text-black">
            {idioma === "pt" ? "até" : "hasta"} -{c.maxPct}%
          </span>
        )}
        {c.previa && (
          <span className="rounded bg-red-600 px-1.5 text-[10px] font-bold">PRÉVIA ADMIN</span>
        )}
      </span>
    </a>
  );
}

// ---------------------------------------------------------------- hero (home e página da campanha)
export function HeroCampanha({ c, h1 = false }: { c: CampanhaPublica; h1?: boolean }) {
  const { idioma, href, t } = useT();
  const pre = c.fase === "PRE";
  const Titulo = h1 ? "h1" : "h2";
  return (
    <section className="relative overflow-hidden bg-black text-white">
      <div aria-hidden className="absolute inset-0">
        <div className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#f2c94c]/20 blur-3xl" />
        <div className="absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-red-600/20 blur-3xl" />
        <div className="absolute inset-0 opacity-[0.06] [background-image:repeating-linear-gradient(-45deg,#fff_0_2px,transparent_2px_26px)]" />
      </div>
      <div className="relative mx-auto max-w-7xl px-4 py-10 text-center md:py-16">
        <p className="inline-flex items-center gap-2 rounded-full border border-[#f2c94c]/40 px-4 py-1 text-xs font-black uppercase tracking-[0.3em] text-[#f2c94c]">
          {pre ? t("Pre Black Friday", "Pré Black Friday") : t("Ya empezó", "Já começou")}
        </p>
        <Titulo className="mt-4 text-4xl font-black uppercase leading-none tracking-tight md:text-7xl">
          <span className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
            {txt(c.config, "titulo", idioma)}
          </span>
        </Titulo>
        <p className="mx-auto mt-4 max-w-2xl text-base text-white/80 md:text-lg">
          {txt(c.config, "subtitulo", idioma)}
        </p>
        {c.maxPct > 0 && (
          <p className="mt-5 text-2xl font-black md:text-4xl">
            {t("hasta", "até")} <span className="text-[#f2c94c]">-{c.maxPct}%</span>
            {pre && (
              <span className="ml-2 align-middle text-sm font-bold text-white/60">
                {t("en la pre black", "na pré black")}
              </span>
            )}
          </p>
        )}
        <div className="mt-6 flex flex-col items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-white/60">
            {pre ? t("Empieza en", "Começa em") : t("Termina en", "Termina em")}
          </span>
          <Contagem alvo={c.alvo} tamanho="lg" />
        </div>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <a
            href={href("/black-friday")}
            className="inline-flex items-center gap-2 rounded-xl bg-[#f2c94c] px-6 py-3 font-black text-black shadow-lg shadow-[#f2c94c]/20 transition hover:brightness-110"
          >
            {pre
              ? t("Ver las ofertas de la pre", "Ver as ofertas da pré")
              : t("Ver ofertas", "Ver ofertas")}{" "}
            <ArrowRight className="h-5 w-5" />
          </a>
          <a
            href={href("/cupones")}
            className="inline-flex items-center gap-2 rounded-xl border-2 border-white/30 px-6 py-3 font-bold transition hover:bg-white/10"
          >
            {t("Cupones", "Cupons")}
          </a>
        </div>
      </div>
    </section>
  );
}

// Hero da home: só quando a campanha pediu "inserir na home"
export function HeroCampanhaHome() {
  const c = useCampanha();
  if (!c || !c.config.inserir_na_home) return null;
  return <HeroCampanha c={c} />;
}

// ---------------------------------------------------------------- vitrine de ofertas (home)
export function OfertasCampanha({ titulo }: { titulo?: string }) {
  const c = useCampanha();
  const { t } = useT();
  const { data } = useQuery({
    queryKey: ["ofertas-campanha", c?.id, c?.fase],
    queryFn: () =>
      import("@/lib/campanhas").then((m) => m.ofertasCampanhaFn({ data: { limite: 12 } })),
    enabled: !!c,
    staleTime: 5 * 60_000,
  });
  if (!c || !data?.length) return null;
  return (
    <section
      className="overflow-hidden rounded-2xl bg-black p-4 text-white shadow-sm md:p-6"
      aria-label={titulo || "Black Friday"}
    >
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xl font-black uppercase md:text-2xl">
          <Flame className="h-6 w-6 text-[#f2c94c]" />{" "}
          {titulo || t("Ofertas Black Friday", "Ofertas Black Friday")}
        </h2>
        <Contagem alvo={c.alvo} />
      </div>
      <ListaOfertas pecas={data} />
    </section>
  );
}

export function ListaOfertas({ pecas, grade }: { pecas: Product[]; grade?: boolean }) {
  return grade ? (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {pecas.map((p, i) => (
        <CardLoja key={p.sku} p={p} prioridade={i < 2} />
      ))}
    </div>
  ) : (
    <div className="scrollbar-none -mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto px-1 pb-1">
      {pecas.map((p) => (
        <div key={p.sku} className="w-44 shrink-0 snap-start text-zinc-900 md:w-52">
          <CardLoja p={p} />
        </div>
      ))}
    </div>
  );
}
