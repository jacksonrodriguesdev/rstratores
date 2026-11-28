import { useEffect, useState, type ReactNode } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search, Megaphone, RefreshCw, BadgeCheck, Tractor } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { MaquinaCard } from "@/components/marketplace/MaquinaCard";
import { useT } from "@/lib/idioma";
import { listarAnunciosFn, facetasFn, TIPOS_MAQUINA, DEPARTAMENTOS_UY } from "@/lib/marketplace";
import { listActiveBanners, type Banner } from "@/lib/banners";

const urlImg = (p: string) => (p.startsWith("http") || p.startsWith("/") ? p : `/uploads/${p}`);

type Busca = {
  tipo?: string;
  marca?: string;
  dep?: string;
  q?: string;
  orden?: string;
  pag?: number;
};

export const Route = createFileRoute("/marketplace/")({
  validateSearch: (s: Record<string, unknown>): Busca => ({
    tipo: s.tipo ? String(s.tipo) : undefined,
    marca: s.marca ? String(s.marca) : undefined,
    dep: s.dep ? String(s.dep) : undefined,
    q: s.q ? String(s.q) : undefined,
    orden: s.orden ? String(s.orden) : undefined,
    pag: s.pag ? Number(s.pag) : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [lista, facetas, banners] = await Promise.all([
      listarAnunciosFn({
        data: {
          tipo: deps.tipo ?? null,
          marca: deps.marca ?? null,
          departamento: deps.dep ?? null,
          q: deps.q ?? null,
          orden: (deps.orden as any) ?? null,
          pagina: deps.pag ?? 1,
        },
      }),
      facetasFn(),
      listActiveBanners("marketplace").catch(() => [] as Banner[]),
    ]);
    return { lista, facetas, banners };
  },
  head: () => ({
    meta: [
      { title: "Marketplace de máquinas agrícolas en Uruguay | AGRO PARTS" },
      {
        name: "description",
        content:
          "Compra y vende tractores, cosechadoras, pulverizadoras e implementos usados y nuevos en todo Uruguay. Marketplace de AGRO PARTS.",
      },
    ],
  }),
  component: Pagina,
});

function Pagina() {
  const { lista, facetas, banners } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const { idioma } = useT();
  const es = idioma !== "pt";

  const setFiltro = (patch: Partial<Busca>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch, pag: undefined }) as any });

  return (
    <div className="min-h-screen bg-slate-50">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-4 py-6">
        {/* Barra: título curto + Anunciar */}
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold text-slate-800 md:text-2xl">
              {es ? "Marketplace de máquinas" : "Marketplace de máquinas"}
            </h1>
            <p className="text-xs text-slate-500 md:text-sm">
              {es
                ? "Comprá y vendé maquinaria agrícola en todo Uruguay."
                : "Compre e venda maquinário agrícola em todo o Uruguai."}
            </p>
          </div>
          <Link
            to="/login"
            search={{ redirect: "/panel" } as never}
            className="flex shrink-0 items-center gap-1.5 rounded-full bg-amber-400 px-4 py-2.5 text-sm font-extrabold text-[#06321b] shadow transition hover:bg-amber-300"
          >
            <Megaphone className="h-4 w-4" /> {es ? "Anunciar" : "Anunciar"}
          </Link>
        </div>

        {/* Hero (banners do admin, tipo "marketplace") */}
        <MarketplaceHero banners={banners} es={es} />

        {/* Chips de tipo */}
        <div className="mb-4 flex flex-wrap gap-2">
          <Chip ativo={!search.tipo} onClick={() => setFiltro({ tipo: undefined })}>
            {es ? "Todos" : "Todos"}
          </Chip>
          {TIPOS_MAQUINA.map((t) => (
            <Chip key={t.id} ativo={search.tipo === t.id} onClick={() => setFiltro({ tipo: t.id })}>
              {es ? t.es : t.pt}
            </Chip>
          ))}
        </div>

        <div className="grid gap-5 md:grid-cols-[220px_1fr]">
          {/* Filtros */}
          <aside className="space-y-3 rounded-xl border bg-white p-4 h-fit">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
              <input
                defaultValue={search.q ?? ""}
                onKeyDown={(e) => {
                  if (e.key === "Enter") setFiltro({ q: (e.target as HTMLInputElement).value });
                }}
                placeholder={es ? "Buscar…" : "Buscar…"}
                className="w-full rounded-lg border py-2 pl-8 pr-2 text-sm"
              />
            </div>
            <Select
              label={es ? "Marca" : "Marca"}
              value={search.marca ?? ""}
              onChange={(v) => setFiltro({ marca: v || undefined })}
              options={facetas.marcas}
            />
            <Select
              label={es ? "Departamento" : "Departamento"}
              value={search.dep ?? ""}
              onChange={(v) => setFiltro({ dep: v || undefined })}
              options={DEPARTAMENTOS_UY}
            />
            <Select
              label={es ? "Ordenar" : "Ordenar"}
              value={search.orden ?? ""}
              onChange={(v) => setFiltro({ orden: v || undefined })}
              options={[
                { v: "recientes", t: es ? "Recientes" : "Recentes" },
                { v: "precio_asc", t: es ? "Menor precio" : "Menor preço" },
                { v: "precio_desc", t: es ? "Mayor precio" : "Maior preço" },
              ]}
            />
          </aside>

          {/* Resultados */}
          <section>
            <p className="mb-3 text-sm text-slate-600">
              <strong>{lista.total}</strong> {es ? "máquinas en venta" : "máquinas à venda"}
            </p>
            {lista.itens.length === 0 ? (
              <div className="rounded-xl border bg-white p-10 text-center text-slate-500">
                {es
                  ? "No hay máquinas con esos filtros todavía."
                  : "Nenhuma máquina com esses filtros ainda."}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
                {lista.itens.map((a) => (
                  <MaquinaCard key={a.id} a={a} es={es} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

// Hero animado padrão (sem imagem de banner): estilo "anunciar grátis", marca AGRO PARTS.
function HeroAnimado({ es }: { es: boolean }) {
  return (
    <div className="relative mb-4 aspect-[288/170] overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-600 via-emerald-700 to-emerald-900 text-white md:aspect-[1135/350]">
      <style>{`@keyframes mkt-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}`}</style>
      <div className="pointer-events-none absolute -right-16 -top-24 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-28 left-1/3 h-72 w-72 rounded-full bg-amber-300/10 blur-2xl" />

      <div className="relative flex h-full items-center justify-between gap-3 px-5 md:px-12">
        <div className="max-w-[64%] md:max-w-[56%]">
          <span className="inline-flex animate-pulse items-center gap-1 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-950 md:text-sm">
            <BadgeCheck className="h-3 w-3 md:h-4 md:w-4" /> {es ? "GRATIS" : "GRÁTIS"}
          </span>
          <h2 className="mt-1.5 text-base font-extrabold leading-tight md:mt-3 md:text-4xl">
            {es ? "Anunciá tu máquina gratis" : "Anuncie sua máquina grátis"}
          </h2>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-emerald-50/90 md:mt-2 md:text-lg">
            <RefreshCw className="h-3 w-3 animate-[spin_3s_linear_infinite] md:h-5 md:w-5" />
            {es
              ? "Renová con 1 clic. Sin costos, hasta venderla."
              : "Renove com 1 clique. Sem custos, até vender."}
          </p>
          <Link
            to="/login"
            search={{ redirect: "/panel" } as never}
            className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-xs font-extrabold text-emerald-800 shadow transition hover:bg-emerald-50 md:mt-4 md:px-6 md:py-3 md:text-base"
          >
            <Megaphone className="h-3.5 w-3.5 md:h-5 md:w-5" />{" "}
            {es ? "Anunciar gratis" : "Anunciar grátis"}
          </Link>
        </div>

        <div className="relative hidden shrink-0 sm:block">
          <div
            style={{ animation: "mkt-float 3s ease-in-out infinite" }}
            className="text-7xl leading-none md:text-[150px]"
          >
            🚜
          </div>
          <div className="absolute -left-4 top-1 rounded-xl bg-white/95 px-2.5 py-1.5 text-emerald-800 shadow-lg md:px-3 md:py-2">
            <div className="flex items-center gap-1 text-[9px] font-bold md:text-xs">
              <Tractor className="h-3 w-3 md:h-4 md:w-4" /> {es ? "Tu máquina" : "Sua máquina"}
            </div>
            <div className="text-[8px] text-emerald-600 md:text-[11px]">
              {es ? "publicada ✓" : "publicada ✓"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MarketplaceHero({ banners, es }: { banners: Banner[]; es: boolean }) {
  const [i, setI] = useState(0);
  const n = banners.length;
  useEffect(() => {
    if (n < 2) return;
    const id = setInterval(() => setI((v) => (v + 1) % n), 5000);
    return () => clearInterval(id);
  }, [n]);

  if (n === 0) {
    // Hero animado padrão (quando não há banner de imagem cadastrado no admin).
    return <HeroAnimado es={es} />;
  }

  const b = banners[i];
  const img = (
    <picture>
      {b.image_path_mobile && (
        <source media="(max-width: 768px)" srcSet={urlImg(b.image_path_mobile)} />
      )}
      <img
        src={urlImg(b.image_path)}
        alt={b.titulo ?? "Marketplace"}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </picture>
  );

  return (
    <div className="relative mb-4 aspect-[288/170] overflow-hidden rounded-2xl bg-slate-200 md:aspect-[1135/350]">
      {b.link_url ? (
        <a href={b.link_url} className="absolute inset-0 block">
          {img}
        </a>
      ) : (
        img
      )}
      {n > 1 && (
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
          {banners.map((_, d) => (
            <button
              key={d}
              aria-label={`banner ${d + 1}`}
              onClick={() => setI(d)}
              className={`h-1.5 rounded-full transition-all ${d === i ? "w-5 bg-white" : "w-1.5 bg-white/60"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Chip({
  children,
  ativo,
  onClick,
}: {
  children: ReactNode;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        ativo ? "bg-emerald-700 text-white" : "bg-white text-slate-600 hover:bg-slate-100 border"
      }`}
    >
      {children}
    </button>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<string | { v: string; t: string }>;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border bg-white px-2 py-2 text-sm"
      >
        <option value="">—</option>
        {options.map((o) =>
          typeof o === "string" ? (
            <option key={o} value={o}>
              {o}
            </option>
          ) : (
            <option key={o.v} value={o.v}>
              {o.t}
            </option>
          ),
        )}
      </select>
    </div>
  );
}
