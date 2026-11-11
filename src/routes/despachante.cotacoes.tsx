// Despachante → todas as cotações e embarques, com filtro por situação e busca
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { cotacoesDespFn } from "@/lib/despachante/despachante";
import { STATUS_COTACAO_PT, statusVisivel, usd } from "@/lib/b2b-comum";
import { Selo, tomStatus } from "@/components/b2b/B2bLayout";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/despachante/cotacoes")({ component: Cotacoes });

function Cotacoes() {
  const { data } = useQuery({ queryKey: ["desp-cotacoes"], queryFn: () => cotacoesDespFn() });
  const [filtro, setFiltro] = useState("ACEITA");
  const [q, setQ] = useState("");
  const lista = useMemo(
    () =>
      (data ?? []).filter(
        (c) =>
          (!filtro || statusVisivel(c) === filtro) &&
          (!q ||
            `${c.codigo} ${c.razao_social} ${c.rut} ${c.itens.map((i) => `${i.codigo} ${i.ncm ?? ""}`).join(" ")}`
              .toLowerCase()
              .includes(q.toLowerCase())),
      ),
    [data, filtro, q],
  );
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight">Cotações e embarques</h1>
      <div className="flex flex-wrap items-center gap-2">
        {[
          ["ACEITA", "Aceitas (embarques)"],
          ["COTADA", "Proposta enviada"],
          ["ENVIADA", "Novas"],
          ["VENCIDA", "Vencidas"],
          ["RECUSADA", "Recusadas"],
          ["", "Todas"],
        ].map(([k, r]) => (
          <button
            key={k}
            onClick={() => setFiltro(k)}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-sm font-medium",
              filtro === k
                ? "border-slate-950 bg-slate-950 text-white"
                : "border-slate-200 bg-white",
            )}
          >
            {r}
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Código, empresa, RUT, peça ou NCM"
            className="h-9 w-72 rounded-full border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-500"
          />
        </div>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        {!data ? (
          <Loader2 className="mx-auto my-10 h-6 w-6 animate-spin text-slate-400" />
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="p-3">Cotação</th>
                <th className="p-3">Empresa (UY)</th>
                <th className="p-3">Itens</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3">Situação</th>
              </tr>
            </thead>
            <tbody>
              {lista.map((c) => {
                const st = statusVisivel(c);
                const semNcm = c.itens.filter(
                  (i) => i.disponivel !== false && String(i.ncm ?? "").length !== 8,
                ).length;
                return (
                  <tr key={c.codigo} className="border-t hover:bg-slate-50">
                    <td className="p-3">
                      <Link
                        to="/despachante/cotacao/$codigo"
                        params={{ codigo: c.codigo }}
                        className="font-mono font-bold text-emerald-800 hover:underline"
                      >
                        {c.codigo}
                      </Link>
                      <p className="text-xs text-slate-500">
                        {new Date(c.created_at).toLocaleDateString("pt-BR")} · {c.incoterm}
                      </p>
                    </td>
                    <td className="p-3">
                      <p className="font-semibold">{c.razao_social}</p>
                      <p className="font-mono text-xs text-slate-500">RUT {c.rut}</p>
                    </td>
                    <td className="p-3 text-xs">
                      {c.itens.length} itens · {c.itens.reduce((s, i) => s + i.qtd, 0)} u.
                      {semNcm > 0 && (
                        <p className="font-semibold text-amber-700">{semNcm} sem NCM</p>
                      )}
                    </td>
                    <td className="p-3 text-right font-semibold">
                      {c.status === "ENVIADA" ? "—" : usd(c.total)}
                    </td>
                    <td className="p-3">
                      <Selo tom={tomStatus(st)}>{STATUS_COTACAO_PT[st]}</Selo>
                    </td>
                  </tr>
                );
              })}
              {!lista.length && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-slate-500">
                    Nada neste filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
