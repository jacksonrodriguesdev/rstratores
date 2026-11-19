// Painel de descontos de exportação: faixas por volume + regras por linha/marca/categoria/item.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Loader2, Plus, Save, Trash2, Percent, Tag } from "lucide-react";
import {
  configDescontosAdminFn,
  salvarGeralDescontosFn,
  salvarFaixasFn,
  adicionarRegraFn,
  apagarRegraFn,
} from "@/lib/exportacao/descontos-fn";
import type { FaixaDesconto, TipoRegra } from "@/lib/exportacao/descontos";

const TIPOS: Array<{ id: TipoRegra; nome: string; dica: string }> = [
  { id: "LINHA", nome: "Linha", dica: "AGRICOLA, CAMINHOES ou DIESEL" },
  { id: "MARCA", nome: "Marca", dica: "Ex.: John Deere, Massey Ferguson" },
  { id: "CATEGORIA", nome: "Categoria", dica: "Ex.: Filtros, Rolamentos e Mancais" },
  { id: "ITEM", nome: "Código", dica: "Código exato da peça" },
];

export function DescontosExportacao() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["desc-config"],
    queryFn: () => configDescontosAdminFn(),
  });
  const [faixas, setFaixas] = useState<FaixaDesconto[]>([]);
  const [ativo, setAtivo] = useState(false);
  const [base, setBase] = useState("ITENS");
  const [regra, setRegra] = useState({ tipo: "MARCA" as TipoRegra, alvo: "", pct: "" });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (data) {
      setFaixas(data.faixas);
      setAtivo(data.ativo);
      setBase(data.base);
    }
  }, [data]);

  const recarregar = () => qc.invalidateQueries({ queryKey: ["desc-config"] });
  const salvarGeral = async (patch: { ativo?: boolean; base?: string }) => {
    await salvarGeralDescontosFn({ data: patch });
    recarregar();
  };
  const salvarFaixas = async () => {
    setMsg("");
    await salvarFaixasFn({ data: { faixas } });
    recarregar();
    setMsg("Faixas salvas.");
    setTimeout(() => setMsg(""), 2500);
  };
  const addRegra = async () => {
    setMsg("");
    try {
      await adicionarRegraFn({
        data: { tipo: regra.tipo, alvo: regra.alvo, pct: Number(regra.pct) },
      });
      setRegra({ tipo: regra.tipo, alvo: "", pct: "" });
      recarregar();
    } catch (e: any) {
      setMsg(e.message);
    }
  };
  const delRegra = async (id: number) => {
    await apagarRegraFn({ data: { id } });
    recarregar();
  };

  if (isLoading)
    return <Loader2 className="mx-auto my-8 h-6 w-6 animate-spin text-muted-foreground" />;

  const inp = "h-9 rounded-lg border bg-background px-2 text-sm";
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
        <div>
          <p className="flex items-center gap-2 font-bold">
            <Percent className="h-5 w-5 text-primary" /> Descontos de exportação
          </p>
          <p className="text-sm text-muted-foreground">
            Faixas por volume + descontos extras por linha, marca, categoria ou peça. Aplicados ao
            preço indicativo do portal.
          </p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => {
              setAtivo(e.target.checked);
              void salvarGeral({ ativo: e.target.checked });
            }}
          />
          Ativar descontos
        </label>
      </div>

      {/* Faixas por volume */}
      <div className="rounded-xl border bg-card p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="font-bold">Faixas por volume</p>
          <label className="text-xs text-muted-foreground">
            Contar por{" "}
            <select
              value={base}
              onChange={(e) => {
                setBase(e.target.value);
                void salvarGeral({ base: e.target.value });
              }}
              className="ml-1 h-8 rounded-lg border bg-background px-2 text-sm"
            >
              <option value="ITENS">itens distintos</option>
              <option value="UNIDADES">unidades totais</option>
            </select>
          </label>
        </div>
        <div className="space-y-2">
          {faixas.map((f, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">A partir de</span>
              <input
                type="number"
                min={1}
                value={f.min_itens}
                onChange={(e) =>
                  setFaixas((xs) =>
                    xs.map((x, k) =>
                      k === i ? { ...x, min_itens: Number(e.target.value) || 0 } : x,
                    ),
                  )
                }
                className={inp + " w-20"}
              />
              <span className="text-muted-foreground">
                {base === "UNIDADES" ? "un." : "itens"} →
              </span>
              <input
                type="number"
                min={0}
                step="0.5"
                value={f.pct}
                onChange={(e) =>
                  setFaixas((xs) =>
                    xs.map((x, k) => (k === i ? { ...x, pct: Number(e.target.value) || 0 } : x)),
                  )
                }
                className={inp + " w-20"}
              />
              <span className="text-muted-foreground">% OFF</span>
              <button
                onClick={() => setFaixas((xs) => xs.filter((_, k) => k !== i))}
                className="ml-1 grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {!faixas.length && (
            <p className="text-sm text-muted-foreground">
              Nenhuma faixa ainda. Ex.: 10 itens → 5%.
            </p>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            onClick={() => setFaixas((xs) => [...xs, { min_itens: 10, pct: 5 }])}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
          >
            <Plus className="h-4 w-4" /> Adicionar faixa
          </button>
          <button
            onClick={salvarFaixas}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-white"
          >
            <Save className="h-4 w-4" /> Salvar faixas
          </button>
        </div>
      </div>

      {/* Regras por alvo */}
      <div className="rounded-xl border bg-card p-4">
        <p className="mb-1 flex items-center gap-2 font-bold">
          <Tag className="h-4 w-4 text-primary" /> Descontos por linha, marca, categoria ou peça
        </p>
        <p className="mb-3 text-xs text-muted-foreground">
          Quando uma regra casa com o item, vale o maior desconto entre a faixa de volume e a regra.
        </p>
        <div className="mb-3 flex flex-wrap items-end gap-2">
          <label className="text-xs font-medium text-muted-foreground">
            Tipo
            <select
              value={regra.tipo}
              onChange={(e) => setRegra({ ...regra, tipo: e.target.value as TipoRegra })}
              className={"mt-1 block " + inp}
            >
              {TIPOS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                </option>
              ))}
            </select>
          </label>
          <label className="flex-1 text-xs font-medium text-muted-foreground">
            Alvo{" "}
            <span className="opacity-60">({TIPOS.find((t) => t.id === regra.tipo)?.dica})</span>
            <input
              value={regra.alvo}
              onChange={(e) => setRegra({ ...regra, alvo: e.target.value })}
              className={"mt-1 block w-full " + inp}
            />
          </label>
          <label className="text-xs font-medium text-muted-foreground">
            % OFF
            <input
              type="number"
              min={0}
              step="0.5"
              value={regra.pct}
              onChange={(e) => setRegra({ ...regra, pct: e.target.value })}
              className={"mt-1 block w-20 " + inp}
            />
          </label>
          <button
            onClick={addRegra}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-4 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" /> Adicionar
          </button>
        </div>
        <ul className="divide-y divide-border rounded-lg border">
          {data?.regras.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
              <span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">
                  {r.tipo}
                </span>{" "}
                {r.alvo} → <b>{r.pct}% OFF</b>
              </span>
              <button
                onClick={() => delRegra(r.id!)}
                className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
          {!data?.regras.length && (
            <li className="px-3 py-3 text-sm text-muted-foreground">Nenhuma regra ainda.</li>
          )}
        </ul>
      </div>

      {msg && <p className="text-sm font-medium text-primary">{msg}</p>}
    </div>
  );
}
