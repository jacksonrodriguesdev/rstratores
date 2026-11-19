// Modal de detalhe do produto no portal de importação: galeria, descrição, compatibilidade,
// ficha técnica, cubagem e "Agregar al carrito" com quantidade.
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { X, Loader2, Plus, Minus, Check, Globe2, Boxes, PackageSearch } from "lucide-react";
import { produtoExportacaoFn } from "@/lib/exportacao/vitrine";
import type { ItemVitrine } from "@/lib/exportacao/vitrine.server";
import { formatarNcm } from "@/lib/aduana/aduana-comum";
import { usd, fotoUrl } from "@/lib/b2b-comum";

export function ModalProduto({
  item,
  minimo,
  onFechar,
  onAgregar,
}: {
  item: ItemVitrine;
  minimo: number;
  onFechar: () => void;
  onAgregar: (item: ItemVitrine, qtd: number) => void;
}) {
  const [qtd, setQtd] = useState(Math.max(1, minimo));
  const [foto, setFoto] = useState(0);
  const [feito, setFeito] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["exp-produto", item.linha, item.sku],
    queryFn: () => produtoExportacaoFn({ data: { sku: item.sku, linha: item.linha } }),
  });
  const imgs = (data?.imagens?.length ? data.imagens : item.foto ? [item.foto] : [])
    .map(fotoUrl)
    .filter(Boolean);
  const preco = data?.preco_usd ?? item.preco_usd;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/50" onClick={onFechar} />
      <div className="absolute inset-0 flex items-end justify-center sm:items-center sm:p-4">
        <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-in slide-in-from-bottom duration-200 sm:rounded-3xl">
          <header className="flex items-center justify-between border-b px-5 py-3">
            <p className="font-mono text-sm font-semibold text-slate-500">{item.codigo}</p>
            <button onClick={onFechar} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
              <X className="h-5 w-5" />
            </button>
          </header>

          <div className="grid flex-1 gap-5 overflow-y-auto p-5 md:grid-cols-2">
            {/* Galeria */}
            <div>
              <div className="grid aspect-square place-items-center overflow-hidden rounded-2xl border bg-white">
                {imgs[foto] ? (
                  <img src={imgs[foto]} alt="" className="h-full w-full object-contain" />
                ) : (
                  <PackageSearch className="h-16 w-16 text-slate-300" />
                )}
              </div>
              {imgs.length > 1 && (
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {imgs.map((u, i) => (
                    <button
                      key={i}
                      onClick={() => setFoto(i)}
                      className={
                        "h-14 w-14 shrink-0 overflow-hidden rounded-lg border bg-white " +
                        (i === foto ? "ring-2 ring-emerald-500" : "")
                      }
                    >
                      <img src={u} alt="" className="h-full w-full object-contain" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Info */}
            <div className="min-w-0">
              <h2 className="text-lg font-bold leading-snug">{data?.nome ?? item.nome}</h2>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px]">
                {(data?.marca ?? item.marca) && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5">
                    {data?.marca ?? item.marca}
                  </span>
                )}
                {(data?.ncm ?? item.ncm) && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono">
                    NCM {formatarNcm(data?.ncm ?? item.ncm)}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-800">
                  <Globe2 className="h-3 w-3" /> Exportación Uruguay
                </span>
              </div>

              {preco != null ? (
                <p className="mt-3 text-2xl font-black">{usd(preco)}</p>
              ) : (
                <p className="mt-3 text-sm font-semibold text-slate-400">Precio a cotizar</p>
              )}

              {(data?.peso_cubado_kg != null || data?.comp_cm != null) && (
                <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                  <Boxes className="h-3.5 w-3.5" />
                  {data?.peso_cubado_kg != null && `${data.peso_cubado_kg} kg cub.`}
                  {data?.comp_cm != null && ` · ${data.comp_cm}×${data.larg_cm}×${data.alt_cm} cm`}
                </p>
              )}

              {isLoading ? (
                <Loader2 className="mt-4 h-5 w-5 animate-spin text-slate-400" />
              ) : (
                <>
                  {data?.descricao && (
                    <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                      {data.descricao}
                    </p>
                  )}
                  {!!data?.aplicacoes?.length && (
                    <div className="mt-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Compatibilidad
                      </p>
                      <ul className="mt-1 space-y-0.5 text-sm text-slate-600">
                        {data.aplicacoes.slice(0, 8).map((a, i) => (
                          <li key={i}>
                            {a.montadora} {a.veiculo}
                            {a.ano ? ` (${a.ano})` : ""}
                            {a.motor ? ` · ${a.motor}` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {!data?.aplicacoes?.length && data?.aplicacaoTexto && (
                    <div className="mt-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                        Compatibilidad
                      </p>
                      <p className="mt-1 text-sm text-slate-600">{data.aplicacaoTexto}</p>
                    </div>
                  )}
                  {!!data?.fichas?.length && (
                    <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                      {data.fichas.slice(0, 10).map((f, i) => (
                        <div
                          key={i}
                          className="flex justify-between gap-2 border-b border-slate-100 py-0.5"
                        >
                          <dt className="text-slate-500">{f.chave}</dt>
                          <dd className="text-right font-medium">{f.valor}</dd>
                        </div>
                      ))}
                    </dl>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Rodapé: quantidade + agregar */}
          <footer className="flex items-center justify-between gap-3 border-t bg-slate-50 px-5 py-3">
            <div className="inline-flex items-center rounded-lg border bg-white">
              <button
                onClick={() => setQtd((q) => Math.max(1, q - 1))}
                className="grid h-10 w-10 place-items-center text-slate-500 hover:bg-slate-100"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                value={qtd}
                onChange={(e) => setQtd(Math.max(1, Number(e.target.value) || 1))}
                className="h-10 w-14 border-x text-center font-semibold outline-none"
              />
              <button
                onClick={() => setQtd((q) => q + 1)}
                className="grid h-10 w-10 place-items-center text-slate-500 hover:bg-slate-100"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              onClick={() => {
                onAgregar(item, qtd);
                setFeito(true);
                setTimeout(onFechar, 500);
              }}
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-full bg-emerald-600 font-bold text-white hover:bg-emerald-700"
            >
              {feito ? <Check className="h-5 w-5" /> : <Plus className="h-4 w-4" />}
              {feito ? "Agregado" : "Agregar al carrito"}
            </button>
          </footer>
        </div>
      </div>
    </div>
  );
}
