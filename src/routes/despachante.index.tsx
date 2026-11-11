// Painel do despachante: o que está pendente em cada etapa, itens que precisam de NCM/origem,
// provas de origem vencendo e o checklist do exportador.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  Check,
  CircleDashed,
  Loader2,
} from "lucide-react";
import { painelDespFn } from "@/lib/despachante/despachante";
import { ETAPAS, formatarNcm, PONTOS_FRONTEIRA } from "@/lib/aduana/aduana-comum";
import { usd } from "@/lib/b2b-comum";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/despachante/")({ component: Painel });

function Painel() {
  const { data } = useQuery({ queryKey: ["desp-painel"], queryFn: () => painelDespFn() });
  if (!data) return <Loader2 className="mx-auto mt-20 h-6 w-6 animate-spin text-slate-400" />;
  const n = data.numeros;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Painel do despachante</h1>
        <p className="text-sm text-slate-500">
          Exportações Brasil → Uruguai da AGRO PARTS Mayorista.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          [n.embarquesAbertos, "embarques em andamento", n.embarquesAbertos > 0],
          [n.aceitas, "propostas aceitas"],
          [n.propostas, "propostas aguardando o cliente"],
          [n.novas, "cotações novas (ainda sem preço)"],
        ].map(([v, r, d]) => (
          <div
            key={String(r)}
            className={cn(
              "rounded-2xl border bg-white p-4",
              d ? "border-emerald-300" : "border-slate-200",
            )}
          >
            <p className="text-2xl font-bold">{v as number}</p>
            <p className="text-xs text-slate-500">{r as string}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <h2 className="font-bold">Embarques em andamento</h2>
            <Link to="/despachante/cotacoes" className="text-sm font-semibold text-emerald-700">
              Ver todos →
            </Link>
          </div>
          {!data.embarques.length ? (
            <p className="p-8 text-center text-sm text-slate-500">Nenhum embarque em andamento.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {data.embarques.map((e) => (
                <li key={e.id}>
                  <Link
                    to="/despachante/cotacao/$codigo"
                    params={{ codigo: e.codigo }}
                    className="flex flex-wrap items-center gap-4 px-5 py-3 hover:bg-slate-50"
                  >
                    <div className="min-w-[110px]">
                      <p className="font-mono font-bold">{e.codigo}</p>
                      <p className="text-xs text-slate-500">{e.incoterm}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{e.razao_social}</p>
                      <p className="text-xs text-slate-500">
                        {e.fronteira ? PONTOS_FRONTEIRA[e.fronteira] : "—"} · {usd(e.total)}
                      </p>
                    </div>
                    <div className="w-40">
                      <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full bg-emerald-500"
                          style={{ width: `${(e.feitas / ETAPAS.length) * 100}%` }}
                        />
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">próxima: {e.proxima}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-bold">Pendências por etapa</h2>
          <ul className="mt-3 space-y-1.5 text-sm">
            {data.porEtapa.map((p) => (
              <li key={p.id} className="flex items-center justify-between">
                <span className="text-slate-600">{p.pt}</span>
                <span
                  className={cn(
                    "rounded-full px-2 text-xs font-bold",
                    p.pendentes ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-400",
                  )}
                >
                  {p.pendentes}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white">
          <h2 className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 font-bold">
            <AlertTriangle className="h-4 w-4 text-amber-600" /> Itens que precisam de classificação
          </h2>
          {!data.atencao.length ? (
            <p className="p-6 text-center text-sm text-slate-500">
              Tudo classificado nas propostas abertas e aceitas.
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto text-sm">
              {data.atencao.map((a, k) => (
                <li key={k} className="px-5 py-2.5">
                  <Link
                    to="/despachante/cotacao/$codigo"
                    params={{ codigo: a.codigo }}
                    className="hover:underline"
                  >
                    <span className="font-mono font-semibold">{a.codigo}</span> · linha {a.linha} ·{" "}
                    {a.peca}
                  </Link>
                  <p className="text-xs text-amber-700">
                    {a.motivo} · {a.empresa}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white">
          <h2 className="flex items-center gap-2 border-b border-slate-100 px-5 py-4 font-bold">
            <CalendarClock className="h-4 w-4 text-slate-500" /> Provas de origem vencendo (12
            meses)
          </h2>
          {!data.vencendo.length ? (
            <p className="p-6 text-center text-sm text-slate-500">
              Nenhuma prova vencendo nos próximos 30 dias.
            </p>
          ) : (
            <ul className="max-h-80 divide-y divide-slate-100 overflow-y-auto text-sm">
              {data.vencendo.map((v) => (
                <li key={v.sku} className="flex justify-between px-5 py-2.5">
                  <span>
                    <span className="font-mono">{v.sku}</span>{" "}
                    <span className="text-xs text-slate-500">
                      NCM {formatarNcm(v.ncm)} ·{" "}
                      {v.onde === "exportacao" ? "catálogo exportação" : "loja"}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "text-xs font-semibold",
                      v.vencida ? "text-red-700" : "text-amber-700",
                    )}
                  >
                    {v.vencida ? "vencida" : "vence em breve"} ·{" "}
                    {v.prova_data.split("-").reverse().join("/")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-bold">Exportador pronto para operar?</h2>
          <span className="text-sm text-slate-500">
            {data.prontidao.prontos} de {data.prontidao.total}
          </span>
        </div>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          {data.prontidao.itens.map((i) => (
            <li key={i.id} className="flex gap-2 text-sm">
              {i.ok ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <CircleDashed className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              )}
              <span className={i.ok ? "" : "text-slate-600"}>{i.titulo}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
