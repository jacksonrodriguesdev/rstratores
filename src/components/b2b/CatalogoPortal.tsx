// Portal da empresa: catálogo de exportación (categorias, busca e "Agregar a la cotización")
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Globe2, Loader2, PackageSearch, Plus, Search } from "lucide-react";
import { catalogoPortalFn } from "@/lib/exportacao/catalogo";
import { formatarNcm } from "@/lib/aduana/aduana-comum";
import { usd } from "@/lib/b2b-comum";
import { cn } from "@/lib/utils";

export function CatalogoPortal({
  adicionar,
}: {
  adicionar: (codigo: string, qtd: number) => void;
}) {
  const [q, setQ] = useState("");
  const [busca, setBusca] = useState("");
  const [categoria, setCategoria] = useState<number | null>(null);
  const [adicionados, setAdicionados] = useState<Set<number>>(new Set());
  const { data, isFetching, error } = useQuery({
    queryKey: ["b2b-catalogo", busca, categoria],
    queryFn: () => catalogoPortalFn({ data: { q: busca, categoria } }),
    retry: false,
  });
  if (error) return null;
  if (data && !data.produtos.length && !busca && categoria == null) return null; // catálogo ainda vazio
  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5">
        <div>
          <h2 className="text-lg font-bold">Catálogo de exportación</h2>
          <p className="text-sm text-slate-500">
            Piezas preparadas para exportar, con NCM y origen. Agregalas a tu cotización.
          </p>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setBusca(q.trim());
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Código, pieza o máquina…"
            className="h-10 w-64 rounded-full border border-slate-200 px-4 text-sm outline-none focus:border-emerald-500"
          />
          <button
            className="grid h-10 w-10 place-items-center rounded-full bg-slate-950 text-white"
            aria-label="Buscar"
          >
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </button>
        </form>
      </div>
      {!!data?.categorias.length && (
        <div className="flex gap-2 overflow-x-auto px-6 pt-4">
          {[{ id: null as number | null, nome_es: "Todas", produtos: 0 }, ...data.categorias].map(
            (c) => (
              <button
                key={String(c.id)}
                onClick={() => setCategoria(c.id)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-medium",
                  categoria === c.id
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 hover:border-slate-300",
                )}
              >
                {c.nome_es}
                {c.id != null && <span className="ml-1 opacity-60">{c.produtos}</span>}
              </button>
            ),
          )}
        </div>
      )}
      <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data?.produtos.map((p) => {
          const min = p.minimo ?? data.minimo;
          const ok = adicionados.has(p.id);
          return (
            <div key={p.id} className="flex flex-col rounded-2xl border border-slate-200 p-4">
              <div className="flex gap-3">
                {p.foto ? (
                  <img
                    src={p.foto}
                    alt=""
                    loading="lazy"
                    className="h-16 w-16 shrink-0 rounded-lg border border-slate-100 bg-white object-contain"
                  />
                ) : (
                  <span className="grid h-16 w-16 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400">
                    <PackageSearch className="h-5 w-5" />
                  </span>
                )}
                <div className="min-w-0">
                  <p className="line-clamp-2 text-sm font-semibold leading-snug">{p.nome}</p>
                  <p className="font-mono text-xs text-slate-500">{p.codigo}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                {p.marca && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">{p.marca}</span>
                )}
                {p.ncm && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono">
                    NCM {formatarNcm(p.ncm)}
                  </span>
                )}
                {p.mercosul && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">
                    <Globe2 className="h-3 w-3" /> Origen Mercosur
                  </span>
                )}
              </div>
              {p.aplicacao && (
                <p className="mt-2 line-clamp-2 text-xs text-slate-500">{p.aplicacao}</p>
              )}
              <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                <div className="text-xs text-slate-500">
                  {p.preco != null && (
                    <p className="text-base font-bold text-slate-900">{usd(p.preco)}</p>
                  )}
                  <p>
                    mín. {min} {p.unidade}
                    {p.embalagem ? ` · caja ${p.embalagem}` : ""}
                  </p>
                </div>
                <button
                  onClick={() => {
                    adicionar(p.codigo, Math.max(min, p.embalagem ?? 0));
                    setAdicionados((s) => new Set(s).add(p.id));
                  }}
                  className={cn(
                    "inline-flex h-9 items-center gap-1 rounded-full px-3.5 text-sm font-bold",
                    ok
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-slate-950 text-white hover:bg-slate-800",
                  )}
                >
                  {ok ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {ok ? "Agregado" : "Agregar"}
                </button>
              </div>
            </div>
          );
        })}
        {data && !data.produtos.length && (
          <p className="col-span-full py-6 text-center text-sm text-slate-500">
            Nada encontrado con ese filtro.
          </p>
        )}
      </div>
    </section>
  );
}
