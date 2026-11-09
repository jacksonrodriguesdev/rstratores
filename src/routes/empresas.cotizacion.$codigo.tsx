// AGRO PARTS Mayorista: uma cotação vista pela empresa (/empresas/cotizacion/<código>).
// Linha do tempo, itens, e — com a proposta pronta — preços, validade, aceitar/recusar e proforma.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  ArrowLeft,
  Check,
  Clock,
  FileText,
  Globe2,
  Loader2,
  Printer,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { B2bPagina, Selo, tomStatus } from "@/components/b2b/B2bLayout";
import {
  INCOTERMS,
  PAGAMENTOS,
  STATUS_COTACAO_ES,
  statusVisivel,
  totaisCotacao,
  usd,
} from "@/lib/b2b-comum";
import { cotacaoClienteFn, decidirCotacaoFn, repetirCotacaoFn } from "@/lib/b2b";
import { CustoEstimado, SeguimentoEmbarque, SeloPreferencia } from "@/components/b2b/ClienteAduana";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/empresas/cotizacion/$codigo")({
  head: ({ params }) => ({
    meta: [
      { title: `Cotización ${params.codigo} · AGRO PARTS Mayorista` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: PaginaCotacao,
});

const dataBr = (s: string) => s.split("-").reverse().join("/");

function PaginaCotacao() {
  const { codigo } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data, error, isLoading } = useQuery({
    queryKey: ["b2b-cotacao", codigo],
    queryFn: () => cotacaoClienteFn({ data: { codigo } }),
    retry: false,
  });
  const [decidindo, setDecidindo] = useState<"aceita" | "recusa" | null>(null);
  const [confirmar, setConfirmar] = useState<"aceita" | "recusa" | null>(null);
  const [erro, setErro] = useState("");

  if (isLoading)
    return (
      <B2bPagina>
        <div className="grid min-h-[60vh] place-items-center">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        </div>
      </B2bPagina>
    );
  if (error || !data)
    return (
      <B2bPagina>
        <div className="mx-auto max-w-md px-4 py-24 text-center">
          <h1 className="text-2xl font-extrabold">Cotización no encontrada</h1>
          <p className="mt-2 text-slate-600">{(error as Error)?.message}</p>
          <Link to="/empresas/portal" className="mt-6 inline-block font-bold text-emerald-700">
            Volver al portal
          </Link>
        </div>
      </B2bPagina>
    );

  const { cotacao: c, empresa } = data;
  const st = statusVisivel(c);
  const cotada = c.status !== "ENVIADA";
  const t = totaisCotacao(c.itens, c.frete);
  const indicativo = c.itens.reduce((s, i) => s + i.qtd * (i.sugerido ?? 0), 0);
  const mercosul = c.itens.filter((i) => i.disponivel !== false && i.origem === "MERCOSUL").length;
  const diasRestantes =
    c.validade && st === "COTADA"
      ? Math.ceil((new Date(`${c.validade}T23:59:59-03:00`).getTime() - Date.now()) / 86400_000)
      : null;

  const decidir = async (aceita: boolean) => {
    setDecidindo(aceita ? "aceita" : "recusa");
    setErro("");
    try {
      await decidirCotacaoFn({ data: { codigo, aceita } });
      await qc.invalidateQueries({ queryKey: ["b2b-cotacao", codigo] });
      qc.invalidateQueries({ queryKey: ["b2b-cotacoes"] });
      setConfirmar(null);
    } catch (e: any) {
      setErro(e.message);
    } finally {
      setDecidindo(null);
    }
  };
  const repetir = async () => {
    try {
      const r = await repetirCotacaoFn({ data: { codigo } });
      qc.invalidateQueries({ queryKey: ["b2b-cotacoes"] });
      navigate({ to: "/empresas/cotizacion/$codigo", params: { codigo: r.codigo } });
    } catch (e: any) {
      setErro(e.message);
    }
  };

  const etapas = [
    { t: "Lista recibida", feito: true, data: c.created_at },
    { t: "Propuesta enviada", feito: cotada && c.status !== "CANCELADA", data: c.respondida_em },
    {
      t: c.status === "RECUSADA" ? "Rechazada" : "Aceptada",
      feito: c.status === "ACEITA" || c.status === "RECUSADA",
      data: c.decidida_em,
    },
    {
      t: "Embarque",
      feito: data.embarque?.etapas.ENTREGUE?.status === "FEITO",
      data: data.embarque?.etapas.ENTREGUE?.data ?? null,
    },
  ];

  return (
    <B2bPagina>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <Link
          to="/empresas/portal"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Portal
        </Link>
        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Cotización</p>
            <h1 className="font-mono text-3xl font-extrabold tracking-tight">{c.codigo}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {empresa.razao_social} · {c.destino ?? "—"} · {c.incoterm}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Selo tom={tomStatus(st)} className="text-sm">
              {STATUS_COTACAO_ES[st]}
            </Selo>
            {cotada && c.status !== "CANCELADA" && (
              <a
                href={`/empresas/proforma/${c.codigo}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-sm font-semibold hover:bg-slate-50"
              >
                <Printer className="h-4 w-4" /> Proforma
              </a>
            )}
          </div>
        </div>

        {/* Linha do tempo */}
        <ol className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {etapas.map((e, k) => (
            <li
              key={k}
              className={cn(
                "rounded-2xl border p-4",
                e.feito ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-white",
              )}
            >
              <span
                className={cn(
                  "grid h-7 w-7 place-items-center rounded-full text-xs font-bold",
                  e.feito ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-400",
                )}
              >
                {e.feito ? <Check className="h-4 w-4" /> : k + 1}
              </span>
              <p className="mt-3 text-sm font-bold">{e.t}</p>
              <p className="text-xs text-slate-500">
                {e.data ? new Date(e.data).toLocaleDateString("es-UY") : "—"}
              </p>
            </li>
          ))}
        </ol>

        {st === "COTADA" && (
          <div className="mt-8 overflow-hidden rounded-3xl bg-slate-950 text-white">
            <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <p className="text-sm text-emerald-300">Propuesta lista para tu respuesta</p>
                <p className="mt-1 text-4xl font-extrabold tracking-tight">{usd(c.total)}</p>
                <p className="mt-2 text-sm text-slate-300">
                  {t.itens} ítems · {t.unidades.toLocaleString("es-UY")} u.
                  {t.peso ? ` · ~${t.peso} kg` : ""} · {c.incoterm}
                  {diasRestantes != null && (
                    <>
                      {" "}
                      · <Clock className="inline h-3.5 w-3.5" /> válida{" "}
                      {diasRestantes <= 1 ? "hasta hoy" : `${diasRestantes} días más`} (
                      {dataBr(c.validade!)})
                    </>
                  )}
                </p>
              </div>
              {confirmar ? (
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-sm font-semibold">
                    {confirmar === "aceita"
                      ? "¿Confirmás la compra por " + usd(c.total) + "?"
                      : "¿Rechazar esta propuesta?"}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => decidir(confirmar === "aceita")}
                      disabled={!!decidindo}
                      className={cn(
                        "inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-bold",
                        confirmar === "aceita"
                          ? "bg-emerald-500 text-slate-950"
                          : "bg-white text-slate-950",
                      )}
                    >
                      {decidindo && <Loader2 className="h-4 w-4 animate-spin" />} Sí, confirmar
                    </button>
                    <button
                      onClick={() => setConfirmar(null)}
                      className="h-10 rounded-full px-4 text-sm font-semibold text-slate-300 hover:bg-white/10"
                    >
                      Volver
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setConfirmar("aceita")}
                    className="inline-flex h-12 items-center gap-2 rounded-full bg-emerald-500 px-7 font-bold text-slate-950 hover:bg-emerald-400"
                  >
                    <ThumbsUp className="h-4 w-4" /> Aceptar propuesta
                  </button>
                  <button
                    onClick={() => setConfirmar("recusa")}
                    className="inline-flex h-12 items-center gap-2 rounded-full border border-white/20 px-5 font-semibold hover:bg-white/10"
                  >
                    <ThumbsDown className="h-4 w-4" /> Rechazar
                  </button>
                </div>
              )}
            </div>
            {erro && <p className="px-8 pb-4 text-sm text-rose-300">{erro}</p>}
          </div>
        )}

        {st === "ACEITA" && (
          <div className="mt-8 rounded-3xl border border-emerald-200 bg-emerald-50 p-6">
            <p className="text-lg font-bold text-emerald-900">¡Compra confirmada! Gracias.</p>
            <p className="mt-1 text-sm text-emerald-900/80">
              Te enviamos los datos de pago ({PAGAMENTOS[empresa.pagamento] ?? empresa.pagamento}) y
              preparamos la carga. Te avisamos en cada paso.
            </p>
          </div>
        )}
        {st === "ACEITA" && <SeguimentoEmbarque codigo={c.codigo} embarque={data.embarque} />}

        {(st === "VENCIDA" || st === "RECUSADA") && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-amber-200 bg-amber-50 p-6">
            <p className="text-sm text-amber-900">
              {st === "VENCIDA"
                ? "Esta propuesta venció. Pedí una nueva con la misma lista y te la actualizamos."
                : "Rechazaste esta propuesta. Si querés, la pedimos de nuevo con otras cantidades."}
            </p>
            <button
              onClick={repetir}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-bold text-white"
            >
              <RefreshCw className="h-4 w-4" /> Pedir actualización
            </button>
          </div>
        )}

        {st === "ENVIADA" && (
          <div className="mt-8 rounded-3xl border border-sky-200 bg-sky-50 p-6 text-sm text-sky-900">
            <p className="font-bold">Estamos preparando la propuesta.</p>
            <p className="mt-1">
              Revisamos disponibilidad, origen y precio de cada ítem. Te avisamos por e-mail cuando
              esté lista.
              {indicativo > 0 && ` Total indicativo de tu cuenta: ${usd(indicativo)}.`}
            </p>
          </div>
        )}

        {/* Itens */}
        <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold">Ítems ({c.itens.length})</h2>
            {cotada && mercosul > 0 && (
              <Selo tom="verde">
                <Globe2 className="h-3.5 w-3.5" /> {mercosul} con origen Mercosur
              </Selo>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <tr>
                  <th className="px-5 py-3">Pieza</th>
                  <th className="px-3 py-3">NCM</th>
                  <th className="px-3 py-3 text-right">Cant.</th>
                  {cotada && <th className="px-3 py-3 text-right">Unitario</th>}
                  {cotada && <th className="px-5 py-3 text-right">Total</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {c.itens.map((i) => {
                  const fora = cotada && i.disponivel === false;
                  return (
                    <tr key={i.linha} className={cn(fora && "opacity-50")}>
                      <td className="px-5 py-3">
                        <p className="font-semibold">
                          {i.nome ?? (i.descricao || "Código fuera del catálogo")}
                        </p>
                        <p className="flex flex-wrap gap-x-2 text-xs text-slate-500">
                          <span className="font-mono">{i.codigo}</span>
                          {i.marca && <span>· {i.marca}</span>}
                          {cotada && !fora && <SeloPreferencia i={i} />}
                          {fora && <span className="font-semibold">· No disponible</span>}
                          {i.obs && <span>· {i.obs}</span>}
                        </p>
                      </td>
                      <td className="px-3 py-3 font-mono text-xs">{i.ncm ?? "—"}</td>
                      <td className="px-3 py-3 text-right font-semibold">{i.qtd}</td>
                      {cotada && (
                        <td className="whitespace-nowrap px-3 py-3 text-right">
                          {fora ? "—" : usd(i.preco)}
                        </td>
                      )}
                      {cotada && (
                        <td className="whitespace-nowrap px-5 py-3 text-right font-semibold">
                          {fora || i.preco == null ? "—" : usd(i.qtd * i.preco)}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              {cotada && (
                <tfoot className="border-t border-slate-200 text-sm">
                  <tr>
                    <td colSpan={4} className="px-5 py-2 text-right text-slate-500">
                      Subtotal
                    </td>
                    <td className="px-5 py-2 text-right font-semibold">{usd(c.subtotal)}</td>
                  </tr>
                  {c.frete != null && (
                    <tr>
                      <td colSpan={4} className="px-5 py-2 text-right text-slate-500">
                        Flete ({c.incoterm})
                      </td>
                      <td className="px-5 py-2 text-right font-semibold">{usd(c.frete)}</td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={4} className="px-5 py-3 text-right font-bold">
                      Total
                    </td>
                    <td className="px-5 py-3 text-right text-lg font-extrabold">{usd(c.total)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {cotada && c.status !== "CANCELADA" && (
          <CustoEstimado itens={c.itens} frete={c.frete} taxas={data.taxas} />
        )}
        {cotada && (
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <Info r="Entrega" v={INCOTERMS[c.incoterm] ?? c.incoterm} />
            <Info r="Plazo" v={c.prazo ?? data.cfg.prazo} />
            <Info r="Pago" v={PAGAMENTOS[empresa.pagamento] ?? empresa.pagamento} />
          </div>
        )}
        {c.nota_cliente && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 text-sm">
            <p className="flex items-center gap-2 font-bold">
              <FileText className="h-4 w-4 text-emerald-600" /> Nota de AGRO PARTS
            </p>
            <p className="mt-2 whitespace-pre-line text-slate-600">{c.nota_cliente}</p>
          </div>
        )}
        {cotada && (
          <p className="mt-6 text-xs leading-relaxed text-slate-500">
            Precios en USD, sin IVA ni tributos de importación de Uruguay. La preferencia
            arancelaria del Mercosur aplica a los ítems con certificado de origen; confirmá cada NCM
            con tu despachante de aduana.
          </p>
        )}
      </div>
    </B2bPagina>
  );
}

const Info = ({ r, v }: { r: string; v: string }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-4">
    <p className="text-xs font-semibold text-slate-500">{r}</p>
    <p className="mt-1 text-sm">{v}</p>
  </div>
);
