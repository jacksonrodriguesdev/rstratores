import type { ReactNode } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { MaquinaCard } from "@/components/marketplace/MaquinaCard";
import { useT } from "@/lib/idioma";
import { listarAnunciosFn, facetasFn, TIPOS_MAQUINA, DEPARTAMENTOS_UY } from "@/lib/marketplace";

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
    const [lista, facetas] = await Promise.all([
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
    ]);
    return { lista, facetas };
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
  const { lista, facetas } = Route.useLoaderData();
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
        {/* Cabeçalho */}
        <div className="mb-5 rounded-2xl bg-gradient-to-br from-sky-700 via-sky-800 to-blue-950 p-6 text-white">
          <h1 className="text-2xl font-extrabold md:text-3xl">
            {es ? "Marketplace de máquinas" : "Marketplace de máquinas"}
          </h1>
          <p className="mt-1 text-sm text-white/85">
            {es
              ? "Tractores, cosechadoras, pulverizadoras e implementos en venta en todo Uruguay."
              : "Tratores, colheitadeiras, pulverizadores e implementos à venda em todo o Uruguai."}
          </p>
        </div>

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
