// Carrinho de importação: o cliente adiciona do catálogo sem sair da página. Agrupa por montadora,
// edita quantidades, mostra cubagem + frete + desconto ao vivo e envia a cotação direto daqui.
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ShoppingCart,
  X,
  Minus,
  Plus,
  Trash2,
  Loader2,
  Send,
  Truck,
  Boxes,
  Factory,
} from "lucide-react";
import { estimarFreteFn } from "@/lib/cubagem/frete-portal";
import { configDescontosPortalFn } from "@/lib/exportacao/descontos-fn";
import {
  descontoVolume,
  descontoRegra,
  aplicarDesconto,
  proximaFaixa,
} from "@/lib/exportacao/descontos";
import { INCOTERMS, usd, fotoUrl } from "@/lib/b2b-comum";
import { cn } from "@/lib/utils";

export type ItemCarrito = {
  sku: string;
  codigo: string;
  linha: string;
  nome: string;
  marca: string | null;
  categoria: string | null;
  foto: string | null;
  preco_usd: number | null;
  peso_cubado_kg: number | null;
  qtd: number;
};

export function CarritoExport({
  itens,
  setQtd,
  remover,
  limpar,
  minimo,
  incotermInicial,
  destinoInicial,
  enviando,
  onEnviar,
}: {
  itens: ItemCarrito[];
  setQtd: (sku: string, qtd: number) => void;
  remover: (sku: string) => void;
  limpar: () => void;
  minimo: number;
  incotermInicial: string;
  destinoInicial: string;
  enviando: boolean;
  onEnviar: (dados: { incoterm: string; destino: string; mensagem: string }) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [incoterm, setIncoterm] = useState(incotermInicial);
  const [destino, setDestino] = useState(destinoInicial);
  const [mensagem, setMensagem] = useState("");

  const { data: desc } = useQuery({
    queryKey: ["b2b-descontos"],
    queryFn: () => configDescontosPortalFn(),
    staleTime: 10 * 60_000,
  });
  const itensFrete = useMemo(
    () => itens.filter((i) => i.qtd > 0).map((i) => ({ codigo: i.codigo, qtd: i.qtd })),
    [itens],
  );
  const { data: frete } = useQuery({
    queryKey: ["b2b-frete-cart", itensFrete],
    queryFn: () => estimarFreteFn({ data: { itens: itensFrete } }),
    enabled: itensFrete.length > 0,
  });

  const nItens = itens.length;
  const nUnidades = itens.reduce((s, i) => s + i.qtd, 0);
  const descAtivo = !!desc?.ativo;
  const qtdBase = desc?.base === "UNIDADES" ? nUnidades : nItens;
  const volumePct = descAtivo ? descontoVolume(qtdBase, desc!.faixas) : 0;
  const prox = descAtivo ? proximaFaixa(qtdBase, desc?.faixas ?? []) : null;

  // Preço de cada item com o maior desconto entre volume e regra
  const precoItem = (i: ItemCarrito) => {
    if (i.preco_usd == null) return null;
    const pct = descAtivo ? Math.max(volumePct, descontoRegra(i, desc!.regras)) : 0;
    return aplicarDesconto(i.preco_usd, pct);
  };
  const subtotal = itens.reduce((s, i) => s + (precoItem(i) ?? 0) * i.qtd, 0);
  const semPreco = itens.filter((i) => i.preco_usd == null).length;
  const cubagem = itens.reduce((s, i) => s + (i.peso_cubado_kg ?? 0) * i.qtd, 0);

  // Agrupa por montadora (marca)
  const grupos = useMemo(() => {
    const m = new Map<string, ItemCarrito[]>();
    for (const i of itens) {
      const k = i.marca?.trim() || "Otras marcas";
      (m.get(k) ?? m.set(k, []).get(k)!).push(i);
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [itens]);

  return (
    <>
      {/* Botão flutuante */}
      <button
        onClick={() => setAberto(true)}
        className={cn(
          "fixed bottom-5 right-5 z-[55] inline-flex items-center gap-2 rounded-full bg-emerald-600 px-5 py-3 font-bold text-white shadow-xl shadow-emerald-600/30 transition hover:bg-emerald-700 md:bottom-24",
          !nItens && "opacity-90",
        )}
      >
        <ShoppingCart className="h-5 w-5" />
        <span className="hidden sm:inline">Mi cotización</span>
        <span className="grid h-6 min-w-6 place-items-center rounded-full bg-white px-1.5 text-sm font-black text-emerald-700">
          {nItens}
        </span>
      </button>

      {/* Drawer */}
      {aberto && (
        <div className="fixed inset-0 z-[60]">
          <div className="absolute inset-0 bg-black/40" onClick={() => setAberto(false)} />
          <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-2xl animate-in slide-in-from-right duration-200">
            <header className="flex items-center justify-between border-b px-5 py-4">
              <div>
                <p className="flex items-center gap-2 text-lg font-black">
                  <ShoppingCart className="h-5 w-5 text-emerald-600" /> Mi cotización
                </p>
                <p className="text-xs text-slate-500">
                  {nItens} ítems · {nUnidades.toLocaleString("es-UY")} unidades
                </p>
              </div>
              <button
                onClick={() => setAberto(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </header>

            {!nItens ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center text-slate-400">
                <ShoppingCart className="h-10 w-10" />
                <p className="text-sm">Agregá piezas del catálogo y aparecen acá.</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-4 py-3 [scrollbar-width:thin]">
                {descAtivo && prox && (
                  <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    {volumePct > 0 && <b>¡{volumePct}% OFF por volumen! </b>}
                    Agregá <b>{Math.max(0, prox.min_itens - qtdBase)}</b>{" "}
                    {desc?.base === "UNIDADES" ? "unidades" : "ítems"} más → <b>{prox.pct}% OFF</b>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full rounded-full bg-amber-500 transition-all"
                        style={{ width: `${Math.min(100, (qtdBase / prox.min_itens) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
                {grupos.map(([marca, arr]) => (
                  <div key={marca} className="mb-4">
                    <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                      <Factory className="h-3.5 w-3.5" /> {marca}{" "}
                      <span className="opacity-50">{arr.length}</span>
                    </p>
                    <div className="space-y-2">
                      {arr.map((i) => {
                        const p = precoItem(i);
                        return (
                          <div
                            key={i.sku}
                            className="flex gap-3 rounded-xl border border-slate-200 p-2.5"
                          >
                            {i.foto ? (
                              <img
                                src={fotoUrl(i.foto)}
                                alt=""
                                className="h-12 w-12 shrink-0 rounded-lg border object-contain"
                              />
                            ) : (
                              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-400">
                                <Boxes className="h-5 w-5" />
                              </span>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-1 text-sm font-semibold">{i.nome}</p>
                              <p className="font-mono text-[11px] text-slate-500">{i.codigo}</p>
                              <div className="mt-1 flex items-center justify-between">
                                <div className="inline-flex items-center rounded-lg border">
                                  <button
                                    onClick={() => setQtd(i.sku, Math.max(1, i.qtd - 1))}
                                    className="grid h-7 w-7 place-items-center text-slate-500 hover:bg-slate-100"
                                  >
                                    <Minus className="h-3.5 w-3.5" />
                                  </button>
                                  <input
                                    value={i.qtd}
                                    onChange={(e) =>
                                      setQtd(i.sku, Math.max(1, Number(e.target.value) || 1))
                                    }
                                    className="h-7 w-10 border-x text-center text-sm outline-none"
                                  />
                                  <button
                                    onClick={() => setQtd(i.sku, i.qtd + 1)}
                                    className="grid h-7 w-7 place-items-center text-slate-500 hover:bg-slate-100"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                                <div className="text-right">
                                  {p != null ? (
                                    <p className="text-sm font-bold">{usd(p * i.qtd)}</p>
                                  ) : (
                                    <p className="text-[11px] text-slate-400">A cotizar</p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              onClick={() => remover(i.sku)}
                              className="self-start rounded-lg p-1 text-slate-300 hover:bg-rose-50 hover:text-rose-600"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!!nItens && (
              <footer className="space-y-3 border-t bg-slate-50 p-4">
                <dl className="space-y-1 text-sm">
                  <Linha r="Subtotal (con descuentos)" v={usd(subtotal)} forte />
                  {volumePct > 0 && (
                    <Linha r={`Descuento por volumen`} v={`${volumePct}% aplicado`} verde />
                  )}
                  <Linha
                    r={
                      <span className="inline-flex items-center gap-1">
                        <Boxes className="h-3.5 w-3.5" /> Cubaje del pedido
                      </span>
                    }
                    v={`${Math.round(cubagem * 100) / 100} kg`}
                  />
                  <Linha
                    r={
                      <span className="inline-flex items-center gap-1">
                        <Truck className="h-3.5 w-3.5" /> Flete estimado
                      </span>
                    }
                    v={frete?.configurada ? usd(frete.frete) : "a confirmar"}
                  />
                  {semPreco > 0 && (
                    <p className="text-[11px] text-slate-500">
                      {semPreco} ítem(s) se cotizan a pedido (sin precio indicativo).
                    </p>
                  )}
                </dl>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={incoterm}
                    onChange={(e) => setIncoterm(e.target.value)}
                    className="h-9 rounded-lg border bg-white px-2 text-sm"
                  >
                    {Object.entries(INCOTERMS).map(([k, t]) => (
                      <option key={k} value={k}>
                        {t}
                      </option>
                    ))}
                  </select>
                  <input
                    value={destino}
                    onChange={(e) => setDestino(e.target.value)}
                    placeholder="Destino"
                    className="h-9 rounded-lg border bg-white px-2 text-sm"
                  />
                </div>
                <textarea
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  rows={2}
                  placeholder="Mensaje (opcional)…"
                  className="w-full rounded-lg border bg-white p-2 text-sm"
                />
                <div className="flex gap-2">
                  <button
                    onClick={limpar}
                    className="rounded-lg border px-3 text-sm text-slate-500 hover:bg-slate-100"
                  >
                    Vaciar
                  </button>
                  <button
                    onClick={() => onEnviar({ incoterm, destino, mensagem })}
                    disabled={enviando}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {enviando ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Enviar cotización
                  </button>
                </div>
                <p className="text-center text-[11px] text-slate-500">
                  Mínimo {minimo} u. por ítem · respondemos con la propuesta formal en USD.
                </p>
              </footer>
            )}
          </aside>
        </div>
      )}
    </>
  );
}

function Linha({
  r,
  v,
  forte,
  verde,
}: {
  r: React.ReactNode;
  v: React.ReactNode;
  forte?: boolean;
  verde?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-slate-500">{r}</dt>
      <dd
        className={cn(
          "font-semibold",
          forte && "text-base font-black",
          verde && "text-emerald-700",
        )}
      >
        {v}
      </dd>
    </div>
  );
}
