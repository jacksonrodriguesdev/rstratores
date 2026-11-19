// Vitrine de importação: todo o catálogo liberado, navegável por linha, montadora e categoria.
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Globe2,
  Loader2,
  PackageSearch,
  Plus,
  Search,
  Sparkles,
  Tag,
  Tractor,
  Truck,
  Factory,
} from "lucide-react";
import { facetsExportacaoFn, vitrineExportacaoFn } from "@/lib/exportacao/vitrine";
import { ModalProduto } from "@/components/b2b/ModalProduto";
import type { LinhaExp, ItemVitrine } from "@/lib/exportacao/vitrine.server";
import { configDescontosPortalFn } from "@/lib/exportacao/descontos-fn";
import { descontoRegra, aplicarDesconto } from "@/lib/exportacao/descontos";
import { formatarNcm } from "@/lib/aduana/aduana-comum";
import { usd, fotoUrl } from "@/lib/b2b-comum";
import { cn } from "@/lib/utils";

const LINHAS: Array<{ id: LinhaExp; nome: string; icon: typeof Tractor }> = [
  { id: "AGRICOLA", nome: "Agrícola", icon: Tractor },
  { id: "DIESEL", nome: "Diesel", icon: Factory },
  { id: "CAMINHOES", nome: "Camiones", icon: Truck },
];

export function VitrineExportacao({
  minimo,
  adicionar,
}: {
  minimo: number;
  adicionar: (item: ItemVitrine, qtd: number) => void;
}) {
  const [linha, setLinha] = useState<LinhaExp>("AGRICOLA");
  const [marca, setMarca] = useState<string | null>(null);
  const [categoria, setCategoria] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [addMap, setAddMap] = useState<Record<string, boolean>>({});
  const [verProduto, setVerProduto] = useState<ItemVitrine | null>(null);

  const { data: facets } = useQuery({
    queryKey: ["exp-facets"],
    queryFn: () => facetsExportacaoFn(),
    staleTime: 10 * 60_000,
  });
  const { data: desc } = useQuery({
    queryKey: ["exp-descontos"],
    queryFn: () => configDescontosPortalFn(),
    staleTime: 10 * 60_000,
  });
  const descAtivo = !!desc?.ativo;
  const faixasOrd = (desc?.faixas ?? []).slice().sort((a, b) => a.min_itens - b.min_itens);
  const filtro = {
    linha,
    marca: marca ?? undefined,
    categoria: categoria ?? undefined,
    busca,
    pagina,
    porPagina: 24,
  };
  const { data, isFetching } = useQuery({
    queryKey: ["exp-vitrine", filtro],
    queryFn: () => vitrineExportacaoFn({ data: filtro }),
    placeholderData: keepPreviousData,
  });

  const trocarLinha = (l: LinhaExp) => {
    setLinha(l);
    setMarca(null);
    setCategoria(null);
    setPagina(1);
  };
  const total = data?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / 24));
  const cats = facets?.categorias[linha] ?? [];

  return (
    <section
      id="catalogo-importacion"
      className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
    >
      {/* Capa */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950 px-6 py-7 text-white">
        <Globe2 className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 text-white/5" />
        <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-300">
          <Sparkles className="h-3.5 w-3.5" /> Catálogo de importación
        </p>
        <h2 className="mt-1 text-2xl font-black tracking-tight">
          Elegí por marca, línea o categoría
        </h2>
        <p className="mt-1 max-w-xl text-sm text-slate-300">
          Todo el catálogo disponible para exportar al Uruguay — con NCM, origen Mercosur y flete
          estimado. Agregá a tu cotización y nosotros preparamos la propuesta.
        </p>
        {/* Linhas */}
        <div className="mt-5 flex flex-wrap gap-2">
          {LINHAS.map((l) => {
            const n = facets?.linhas.find((x) => x.linha === l.id)?.n;
            const on = linha === l.id;
            return (
              <button
                key={l.id}
                onClick={() => trocarLinha(l.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold transition",
                  on
                    ? "bg-white text-slate-950 shadow"
                    : "bg-white/10 text-white hover:bg-white/20",
                )}
              >
                <l.icon className="h-4 w-4" />
                {l.nome}
                {n != null && (
                  <span className={cn("text-xs", on ? "text-slate-500" : "text-slate-300")}>
                    {n.toLocaleString("es-UY")}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-5 p-6">
        {/* Descontos por volume */}
        {descAtivo && faixasOrd.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <Sparkles className="h-4 w-4 text-emerald-600" />
            <b>Descuentos por volumen:</b>
            {faixasOrd.map((f) => (
              <span
                key={f.min_itens}
                className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold"
              >
                {f.min_itens}+ {desc?.base === "UNIDADES" ? "un." : "ítems"} = {f.pct}% OFF
              </span>
            ))}
          </div>
        )}

        {/* Montadoras (só agrícola) */}
        {linha === "AGRICOLA" && !!facets?.montadoras.length && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
              <Factory className="h-3.5 w-3.5" /> Marcas
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
              <Chip
                ativo={marca == null}
                onClick={() => {
                  setMarca(null);
                  setPagina(1);
                }}
              >
                Todas
              </Chip>
              {facets.montadoras.map((m) => (
                <Chip
                  key={m.marca}
                  ativo={marca === m.marca}
                  onClick={() => {
                    setMarca(marca === m.marca ? null : m.marca);
                    setPagina(1);
                  }}
                >
                  {m.marca} <span className="opacity-50">{m.n}</span>
                </Chip>
              ))}
            </div>
          </div>
        )}

        {/* Categorias (slider) */}
        {!!cats.length && (
          <div>
            <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
              <Tag className="h-3.5 w-3.5" /> Categorías
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
              <Chip
                ativo={categoria == null}
                onClick={() => {
                  setCategoria(null);
                  setPagina(1);
                }}
              >
                Todas
              </Chip>
              {cats.map((c) => (
                <Chip
                  key={c.nome}
                  ativo={categoria === c.nome}
                  onClick={() => {
                    setCategoria(categoria === c.nome ? null : c.nome);
                    setPagina(1);
                  }}
                >
                  {c.nome} <span className="opacity-50">{c.n}</span>
                </Chip>
              ))}
            </div>
          </div>
        )}

        {/* Busca */}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setBusca(q.trim());
            setPagina(1);
          }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Código, pieza o máquina…"
              className="h-11 w-full rounded-full border border-slate-200 pl-10 pr-4 text-sm outline-none focus:border-emerald-500"
            />
          </div>
          <button className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-slate-950 text-white">
            {isFetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </button>
        </form>

        {/* Grade de produtos */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data?.itens.map((p) => {
            const ok = addMap[p.sku];
            const rpct = descAtivo
              ? descontoRegra(
                  { linha: p.linha, marca: p.marca, categoria: p.categoria, codigo: p.codigo },
                  desc!.regras,
                )
              : 0;
            return (
              <div
                key={p.sku}
                onClick={() => setVerProduto(p)}
                className="group flex cursor-pointer flex-col rounded-2xl border border-slate-200 p-4 transition hover:border-emerald-300 hover:shadow-md"
              >
                <div className="flex gap-3">
                  {p.foto ? (
                    <img
                      src={fotoUrl(p.foto)}
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
                  {p.peso_cubado_kg != null && (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5">
                      {p.peso_cubado_kg} kg cub.
                    </span>
                  )}
                </div>
                <div className="mt-auto flex items-end justify-between gap-2 pt-3">
                  <div>
                    {p.preco_usd != null ? (
                      rpct > 0 ? (
                        <>
                          <p className="text-[11px] text-slate-400 line-through">
                            {usd(p.preco_usd)}
                          </p>
                          <p className="text-base font-bold text-emerald-700">
                            {usd(aplicarDesconto(p.preco_usd, rpct))}
                            <span className="ml-1 rounded bg-emerald-100 px-1 text-[10px] font-bold text-emerald-700">
                              -{rpct}%
                            </span>
                          </p>
                        </>
                      ) : (
                        <p className="text-base font-bold text-slate-900">{usd(p.preco_usd)}</p>
                      )
                    ) : (
                      <p className="text-xs font-semibold text-slate-400">A cotizar</p>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      adicionar(p, Math.max(1, minimo));
                      setAddMap((m) => ({ ...m, [p.sku]: true }));
                    }}
                    className={cn(
                      "inline-flex h-9 items-center gap-1 rounded-full px-3.5 text-sm font-bold transition",
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
        </div>

        {data && !data.itens.length && (
          <p className="py-10 text-center text-sm text-slate-500">
            Nada encontrado con ese filtro.
          </p>
        )}

        {/* Paginação */}
        {total > 24 && (
          <div className="flex items-center justify-between pt-1 text-sm text-slate-500">
            <span>{total.toLocaleString("es-UY")} piezas</span>
            <div className="flex items-center gap-2">
              <button
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => p - 1)}
                className="grid h-9 w-9 place-items-center rounded-full border disabled:opacity-40"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span>
                {pagina} / {paginas}
              </span>
              <button
                disabled={pagina >= paginas}
                onClick={() => setPagina((p) => p + 1)}
                className="grid h-9 w-9 place-items-center rounded-full border disabled:opacity-40"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {verProduto && (
        <ModalProduto
          item={verProduto}
          minimo={minimo}
          onFechar={() => setVerProduto(null)}
          onAgregar={(it, qtd) => {
            adicionar(it, qtd);
            setAddMap((m) => ({ ...m, [it.sku]: true }));
          }}
        />
      )}
    </section>
  );
}

function Chip({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition",
        ativo
          ? "border-slate-950 bg-slate-950 text-white"
          : "border-slate-200 text-slate-700 hover:border-slate-300",
      )}
    >
      {children}
    </button>
  );
}
