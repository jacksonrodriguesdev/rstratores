// Despachante → classificação fiscal e origem: catálogo de exportação (NCM, origem, prova, TEC) e
// peças da loja que entram nas cotações (registro de origem).
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Save, Search } from "lucide-react";
import { catalogoAdminFn, salvarClassificacaoFn } from "@/lib/exportacao/catalogo";
import {
  acordoDaNcm,
  origemValida,
  PROVAS,
  STATUS_ORIGEM_PT,
  type StatusOrigem,
} from "@/lib/aduana/aduana-comum";
import { RegistroOrigem } from "@/components/b2b/AdminAduana";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/despachante/produtos")({ component: Produtos });

function Produtos() {
  const [aba, setAba] = useState<"exportacao" | "loja">("exportacao");
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Produtos, NCM e origem</h1>
        <p className="text-sm text-slate-500">
          A NCM define o acordo (ACE 02 ou ACE 18) e o requisito de origem. Origem comprovada exige
          prova (declaração do produtor ou do fornecedor), válida por 12 meses; guarde por 5 anos.
        </p>
      </div>
      <div className="flex gap-2">
        {[
          ["exportacao", "Catálogo de exportação"],
          ["loja", "Peças da loja (cotações)"],
        ].map(([k, r]) => (
          <button
            key={k}
            onClick={() => setAba(k as any)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium",
              aba === k ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white",
            )}
          >
            {r}
          </button>
        ))}
      </div>
      {aba === "exportacao" ? <CatalogoClassificacao /> : <RegistroOrigem />}
    </div>
  );
}

function CatalogoClassificacao() {
  const [q, setQ] = useState("");
  const [busca, setBusca] = useState("");
  const [pendencia, setPendencia] = useState("");
  const { data, isFetching } = useQuery({
    queryKey: ["desp-catalogo", busca, pendencia],
    queryFn: () => catalogoAdminFn({ data: { q: busca, pendencia } }),
  });
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-3">
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
            placeholder="Código, nome, NCM…"
            className="h-9 w-64 rounded-md border border-slate-200 px-3 text-sm"
          />
          <button
            className="grid h-9 w-9 place-items-center rounded-md bg-slate-100"
            aria-label="Buscar"
          >
            <Search className="h-4 w-4" />
          </button>
        </form>
        <select
          className="h-9 rounded-md border border-slate-200 px-2 text-sm"
          value={pendencia}
          onChange={(e) => setPendencia(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="SEM_NCM">Sem NCM</option>
          <option value="SEM_ORIGEM">Origem não comprovada</option>
          <option value="SEM_PESO">Sem peso</option>
        </select>
        {isFetching && <Loader2 className="h-4 w-4 animate-spin text-slate-400" />}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="p-2">Produto</th>
              <th className="p-2">NCM / acordo</th>
              <th className="p-2">Fabricante / país</th>
              <th className="p-2">Situação</th>
              <th className="p-2">Prova</th>
              <th className="p-2">TEC %</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {data?.produtos.map((p) => (
              <LinhaProduto key={p.id} p={p} />
            ))}
            {data && !data.produtos.length && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  Nenhum produto neste filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

type P = Awaited<ReturnType<typeof catalogoAdminFn>>["produtos"][number];
function LinhaProduto({ p }: { p: P }) {
  const qc = useQueryClient();
  const [f, setF] = useState(p);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => setF(p), [p]);
  const mudou = [
    "ncm",
    "fabricante",
    "pais_origem",
    "origem_status",
    "prova",
    "prova_data",
    "prova_ref",
    "aec",
  ].some((k) => (f as any)[k] !== (p as any)[k]);
  const a = acordoDaNcm(f.ncm);
  const vencida =
    f.origem_status === "COMPROVADA" &&
    f.prova_data &&
    !origemValida({ status: "COMPROVADA", prova_data: f.prova_data });
  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarClassificacaoFn({ data: f as any });
      qc.invalidateQueries({ queryKey: ["desp-catalogo"] });
      toast.success("Classificação salva");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSalvando(false);
    }
  };
  const inp = "h-8 rounded-md border border-slate-200 bg-white px-2 text-xs";
  return (
    <tr className="border-t align-top">
      <td className="max-w-[240px] p-2">
        <p className="line-clamp-2 font-semibold">{p.nome_es}</p>
        <p className="font-mono text-slate-500">
          {p.codigo} {p.marca && `· ${p.marca}`}
        </p>
        {p.nome_pt && <p className="text-slate-400">{p.nome_pt}</p>}
      </td>
      <td className="p-2">
        <input
          className={cn(inp, "w-24 font-mono")}
          value={f.ncm ?? ""}
          placeholder="8 dígitos"
          onChange={(e) => setF({ ...f, ncm: e.target.value })}
        />
        <p className="mt-1 text-[10px] text-slate-500">
          {a ? (a.acordo === "ACE02" ? "ACE 02 · 76º PA" : "ACE 18 · ROM") : "—"}
        </p>
      </td>
      <td className="p-2">
        <input
          className={cn(inp, "w-32")}
          value={f.fabricante ?? ""}
          onChange={(e) => setF({ ...f, fabricante: e.target.value })}
        />
        <select
          className={cn(inp, "mt-1 block")}
          value={f.pais_origem ?? ""}
          onChange={(e) => setF({ ...f, pais_origem: e.target.value || null })}
        >
          <option value="">—</option>
          <option value="BR">Brasil</option>
          <option value="AR">Argentina</option>
          <option value="UY">Uruguai</option>
          <option value="PY">Paraguai</option>
          <option value="XX">Fora do Mercosul</option>
        </select>
      </td>
      <td className="p-2">
        <select
          className={inp}
          value={f.origem_status}
          onChange={(e) => setF({ ...f, origem_status: e.target.value as StatusOrigem })}
        >
          {Object.entries(STATUS_ORIGEM_PT).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        {vencida && <p className="mt-1 font-semibold text-red-700">prova vencida</p>}
      </td>
      <td className="p-2">
        <select
          className={cn(inp, "w-40")}
          value={f.prova ?? ""}
          onChange={(e) => setF({ ...f, prova: e.target.value || null })}
        >
          <option value="">—</option>
          {Object.entries(PROVAS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <div className="mt-1 flex gap-1">
          <input
            type="date"
            className={cn(inp, "w-32")}
            value={f.prova_data ?? ""}
            onChange={(e) => setF({ ...f, prova_data: e.target.value || null })}
          />
          <input
            className={cn(inp, "w-24")}
            placeholder="nº/ref."
            value={f.prova_ref ?? ""}
            onChange={(e) => setF({ ...f, prova_ref: e.target.value })}
          />
        </div>
      </td>
      <td className="p-2">
        <input
          className={cn(inp, "w-14")}
          value={f.aec ?? ""}
          inputMode="decimal"
          onChange={(e) =>
            setF({ ...f, aec: e.target.value === "" ? null : (e.target.value as any) })
          }
        />
      </td>
      <td className="p-2">
        <button
          disabled={!mudou || salvando}
          onClick={salvar}
          className={cn(
            "grid h-8 w-8 place-items-center rounded-md",
            mudou ? "bg-emerald-700 text-white" : "text-slate-300",
          )}
          aria-label="Salvar"
        >
          {salvando ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
        </button>
      </td>
    </tr>
  );
}
