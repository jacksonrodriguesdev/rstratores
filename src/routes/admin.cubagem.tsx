import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Boxes, Download, RefreshCw, Save, Search, Calculator, Info, Truck } from "lucide-react";
import {
  coberturaCubagemFn,
  listarCubagemFn,
  familiasCubagemFn,
  editarCubagemFn,
  reclassificarCubagemFn,
  recalcularMediasFn,
  exportarCubagemFn,
  tarifaFreteAdminFn,
  salvarTarifaFreteFn,
} from "@/lib/cubagem/cubagem-admin";
import { formatarNcm } from "@/lib/aduana/aduana-comum";

export const Route = createFileRoute("/admin/cubagem")({
  head: () => ({ meta: [{ title: "Cubagem / Logística — AGRO PARTS" }] }),
  component: CubagemPage,
});

type Filtro = {
  catalogo?: string;
  familia?: string;
  confianca?: string;
  soFallback?: boolean;
  busca?: string;
  pagina?: number;
  porPagina?: number;
};
type Linha = Awaited<ReturnType<typeof listarCubagemFn>>["rows"][number];

const n2 = (v: number | null) => (v == null ? "—" : Number.isInteger(v) ? String(v) : v.toFixed(2));

function CubagemPage() {
  const qc = useQueryClient();
  const [f, setF] = useState<Filtro>({ pagina: 1, porPagina: 50 });
  const [busca, setBusca] = useState("");
  const [trabalhando, setTrabalhando] = useState<string | null>(null);

  const { data: cob } = useQuery({
    queryKey: ["cubagem-cob"],
    queryFn: () => coberturaCubagemFn(),
  });
  const { data: familias } = useQuery({
    queryKey: ["cubagem-fam"],
    queryFn: () => familiasCubagemFn(),
  });
  const { data, isFetching } = useQuery({
    queryKey: ["cubagem-lista", f],
    queryFn: () => listarCubagemFn({ data: f }),
  });

  const atualizar = () => {
    qc.invalidateQueries({ queryKey: ["cubagem-lista"] });
    qc.invalidateQueries({ queryKey: ["cubagem-cob"] });
    qc.invalidateQueries({ queryKey: ["cubagem-fam"] });
  };
  const set = (patch: Partial<Filtro>) => setF((v) => ({ ...v, ...patch, pagina: 1 }));

  const reclassificar = async () => {
    if (
      !confirm("Reclassificar TODOS os produtos (gera a base de novo)? Pode levar alguns minutos.")
    )
      return;
    setTrabalhando("Reclassificando todos os produtos…");
    try {
      await reclassificarCubagemFn();
      atualizar();
    } finally {
      setTrabalhando(null);
    }
  };
  const recalcular = async () => {
    if (
      !confirm(
        "Recalcular as médias por NCM (base Pellegrino) e repopular? Pode levar alguns minutos.",
      )
    )
      return;
    setTrabalhando("Recalculando médias por NCM e repopulando…");
    try {
      await recalcularMediasFn();
      atualizar();
    } finally {
      setTrabalhando(null);
    }
  };
  const exportar = async () => {
    setTrabalhando("Gerando CSV…");
    try {
      const { csv } = await exportarCubagemFn({
        data: { catalogo: f.catalogo, soFallback: f.soFallback },
      });
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cubagem_logistica${f.catalogo ? "_" + f.catalogo.toLowerCase() : ""}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setTrabalhando(null);
    }
  };

  const total = data?.total ?? 0;
  const paginas = Math.max(1, Math.ceil(total / (f.porPagina || 50)));
  const pct = (x?: number) => (cob?.total ? (((x ?? 0) / cob.total) * 100).toFixed(1) + "%" : "—");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight">
            <Boxes className="h-6 w-6 text-primary" /> Cubagem / Logística
          </h1>
          <p className="text-sm text-muted-foreground">
            Base por produto: NCM, peso, medidas, diâmetro e cubagem — para orçamento de frete e
            acordo Mercosul.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={recalcular}
            disabled={!!trabalhando}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            <Calculator className="h-4 w-4" /> Recalcular médias
          </button>
          <button
            onClick={reclassificar}
            disabled={!!trabalhando}
            className="inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" /> Reclassificar tudo
          </button>
          <button
            onClick={exportar}
            disabled={!!trabalhando}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Exportar CSV
          </button>
        </div>
      </div>

      {trabalhando && (
        <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm text-primary">
          <RefreshCw className="h-4 w-4 animate-spin" /> {trabalhando}
        </div>
      )}

      {/* Cartões de cobertura */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Card titulo="Produtos" valor={cob ? cob.total.toLocaleString("pt-BR") : "…"} />
        <Card
          titulo="Com cubagem"
          valor={pct(cob?.comCubagem)}
          sub={cob ? cob.comCubagem.toLocaleString("pt-BR") : ""}
        />
        <Card
          titulo="Medido real"
          valor={pct(cob?.medidoProprio)}
          sub={cob ? cob.medidoProprio.toLocaleString("pt-BR") : ""}
        />
        <Card
          titulo="A rever (fallback)"
          valor={pct(cob?.fallback)}
          sub={cob ? cob.fallback.toLocaleString("pt-BR") : ""}
          alerta
        />
        <Card
          titulo="Mercosul ACE 02"
          valor={pct(cob?.ace02)}
          sub={cob ? cob.ace02.toLocaleString("pt-BR") : ""}
          bom
        />
        <Card
          titulo="ACE 18 (geral)"
          valor={pct(cob?.ace18)}
          sub={cob ? cob.ace18.toLocaleString("pt-BR") : ""}
        />
      </div>

      <div className="flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        NCM e cubagem são de referência (classificação por tipo de peça + média por NCM). Confirme a
        NCM com o contador/despachante em operação fiscal. Peso cubado usa 300 kg/m³ (rodoviário).
      </div>

      <TarifaFreteCard />

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && set({ busca })}
            placeholder="Código, SKU, nome ou NCM…"
            className="w-64 rounded-lg border bg-background py-2 pl-9 pr-3 text-sm"
          />
        </div>
        <select
          value={f.catalogo ?? ""}
          onChange={(e) => set({ catalogo: e.target.value || undefined })}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">Todas as linhas</option>
          <option value="AGRICOLA">Agrícola</option>
          <option value="CAMINHOES">Caminhões</option>
          <option value="DIESEL">Diesel</option>
        </select>
        <select
          value={f.familia ?? ""}
          onChange={(e) => set({ familia: e.target.value || undefined })}
          className="max-w-[220px] rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">Todas as famílias</option>
          {familias?.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
        <select
          value={f.confianca ?? ""}
          onChange={(e) => set({ confianca: e.target.value || undefined })}
          className="rounded-lg border bg-background px-3 py-2 text-sm"
        >
          <option value="">Confiança</option>
          <option value="ALTA">Alta (medido)</option>
          <option value="ESTIMADA">Estimada</option>
        </select>
        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={!!f.soFallback}
            onChange={(e) => set({ soFallback: e.target.checked || undefined })}
          />
          Só "a rever"
        </label>
      </div>

      {/* Tabela item por item */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Produto</th>
              <th className="px-3 py-2">Família</th>
              <th className="px-3 py-2">NCM</th>
              <th className="px-3 py-2">Merc.</th>
              <th className="px-3 py-2">Peso</th>
              <th className="px-3 py-2">C×L×A (cm)</th>
              <th className="px-3 py-2">Ø</th>
              <th className="px-3 py-2">m³</th>
              <th className="px-3 py-2">Cubado</th>
              <th className="px-3 py-2">Fonte</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {data?.rows.map((r) => (
              <LinhaItem key={r.catalogo + "|" + r.sku} r={r} onSalvo={atualizar} />
            ))}
            {!data?.rows.length && !isFetching && (
              <tr>
                <td colSpan={11} className="px-3 py-8 text-center text-muted-foreground">
                  Nada encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total.toLocaleString("pt-BR")} itens {isFetching && "· carregando…"}
        </span>
        <div className="flex items-center gap-2">
          <button
            disabled={(f.pagina || 1) <= 1}
            onClick={() => setF((v) => ({ ...v, pagina: (v.pagina || 1) - 1 }))}
            className="rounded-lg border px-3 py-1.5 disabled:opacity-40"
          >
            Anterior
          </button>
          <span>
            {f.pagina || 1} / {paginas}
          </span>
          <button
            disabled={(f.pagina || 1) >= paginas}
            onClick={() => setF((v) => ({ ...v, pagina: (v.pagina || 1) + 1 }))}
            className="rounded-lg border px-3 py-1.5 disabled:opacity-40"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}

function Card({
  titulo,
  valor,
  sub,
  bom,
  alerta,
}: {
  titulo: string;
  valor: string;
  sub?: string;
  bom?: boolean;
  alerta?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {titulo}
      </p>
      <p
        className={
          "text-xl font-black " +
          (bom ? "text-emerald-600" : alerta ? "text-amber-600" : "text-foreground")
        }
      >
        {valor}
      </p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function TarifaFreteCard() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["frete-tarifa"], queryFn: () => tarifaFreteAdminFn() });
  const [v, setV] = useState<{
    porKg: string;
    taxaFixa: string;
    minimo: string;
    moeda: string;
  } | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const atual = v ?? {
    porKg: String(data?.porKg ?? ""),
    taxaFixa: String(data?.taxaFixa ?? ""),
    minimo: String(data?.minimo ?? ""),
    moeda: data?.moeda ?? "USD",
  };
  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarTarifaFreteFn({
        data: {
          porKg: Number(atual.porKg) || 0,
          taxaFixa: Number(atual.taxaFixa) || 0,
          minimo: Number(atual.minimo) || 0,
          moeda: atual.moeda,
        },
      });
      qc.invalidateQueries({ queryKey: ["frete-tarifa"] });
      setSalvo(true);
      setTimeout(() => setSalvo(false), 2500);
    } finally {
      setSalvando(false);
    }
  };
  const inp = "h-9 w-28 rounded-lg border bg-background px-2 text-sm";
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <Truck className="h-5 w-5 text-primary" />
        <div>
          <p className="font-bold">Tarifa da transportadora (frete por kg cubado)</p>
          <p className="text-xs text-muted-foreground">
            O logista vê o frete estimado no portal de importação com base nesta tarifa.
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="text-xs font-medium text-muted-foreground">
          Moeda
          <select
            value={atual.moeda}
            onChange={(e) => setV({ ...atual, moeda: e.target.value })}
            className="mt-1 block h-9 rounded-lg border bg-background px-2 text-sm"
          >
            <option value="USD">USD</option>
            <option value="BRL">BRL</option>
          </select>
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Por kg cubado
          <input
            type="number"
            step="0.01"
            value={atual.porKg}
            onChange={(e) => setV({ ...atual, porKg: e.target.value })}
            className={"mt-1 block " + inp}
          />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Taxa fixa
          <input
            type="number"
            step="0.01"
            value={atual.taxaFixa}
            onChange={(e) => setV({ ...atual, taxaFixa: e.target.value })}
            className={"mt-1 block " + inp}
          />
        </label>
        <label className="text-xs font-medium text-muted-foreground">
          Frete mínimo
          <input
            type="number"
            step="0.01"
            value={atual.minimo}
            onChange={(e) => setV({ ...atual, minimo: e.target.value })}
            className={"mt-1 block " + inp}
          />
        </label>
        <button
          onClick={salvar}
          disabled={salvando}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Save className="h-4 w-4" /> {salvo ? "Salvo!" : "Salvar tarifa"}
        </button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Fórmula: frete = máximo( mínimo , taxa fixa + por-kg × peso cubado do pedido ).
      </p>
    </div>
  );
}

function LinhaItem({ r, onSalvo }: { r: Linha; onSalvo: () => void }) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState({
    ncm: r.ncm ?? "",
    peso_kg: r.peso_kg ?? "",
    comp_cm: r.comp_cm ?? "",
    larg_cm: r.larg_cm ?? "",
    alt_cm: r.alt_cm ?? "",
    diam_cm: r.diam_cm ?? "",
  });
  const [salvando, setSalvando] = useState(false);
  const salvar = async () => {
    setSalvando(true);
    try {
      await editarCubagemFn({
        data: {
          catalogo: r.catalogo,
          sku: r.sku,
          ncm: v.ncm === "" ? null : String(v.ncm),
          peso_kg: v.peso_kg === "" ? null : Number(v.peso_kg),
          comp_cm: v.comp_cm === "" ? null : Number(v.comp_cm),
          larg_cm: v.larg_cm === "" ? null : Number(v.larg_cm),
          alt_cm: v.alt_cm === "" ? null : Number(v.alt_cm),
          diam_cm: v.diam_cm === "" ? null : Number(v.diam_cm),
        },
      });
      setEdit(false);
      onSalvo();
    } finally {
      setSalvando(false);
    }
  };
  const inp = "w-16 rounded border bg-background px-1.5 py-1 text-xs";

  if (edit)
    return (
      <tr className="border-t bg-primary/5 align-top">
        <td className="px-3 py-2">
          <p className="font-medium">{r.nome || r.codigo}</p>
          <p className="text-xs text-muted-foreground">
            {r.catalogo} · {r.codigo}
          </p>
        </td>
        <td className="px-3 py-2 text-xs">{r.familia}</td>
        <td className="px-3 py-2">
          <input
            value={v.ncm}
            onChange={(e) => setV({ ...v, ncm: e.target.value })}
            className="w-24 rounded border bg-background px-1.5 py-1 text-xs"
          />
        </td>
        <td className="px-3 py-2 text-xs">{r.acordo ?? "—"}</td>
        <td className="px-3 py-2">
          <input
            value={v.peso_kg}
            onChange={(e) => setV({ ...v, peso_kg: e.target.value })}
            className={inp}
          />
        </td>
        <td className="px-3 py-2">
          <div className="flex gap-1">
            <input
              value={v.comp_cm}
              onChange={(e) => setV({ ...v, comp_cm: e.target.value })}
              className={inp}
            />
            <input
              value={v.larg_cm}
              onChange={(e) => setV({ ...v, larg_cm: e.target.value })}
              className={inp}
            />
            <input
              value={v.alt_cm}
              onChange={(e) => setV({ ...v, alt_cm: e.target.value })}
              className={inp}
            />
          </div>
        </td>
        <td className="px-3 py-2">
          <input
            value={v.diam_cm}
            onChange={(e) => setV({ ...v, diam_cm: e.target.value })}
            className={inp}
          />
        </td>
        <td className="px-3 py-2 text-xs text-muted-foreground" colSpan={2}>
          recalcula ao salvar
        </td>
        <td className="px-3 py-2"></td>
        <td className="px-3 py-2">
          <div className="flex gap-1">
            <button
              onClick={salvar}
              disabled={salvando}
              className="inline-flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs font-semibold text-white disabled:opacity-50"
            >
              <Save className="h-3 w-3" /> Salvar
            </button>
            <button onClick={() => setEdit(false)} className="rounded border px-2 py-1 text-xs">
              Cancelar
            </button>
          </div>
        </td>
      </tr>
    );

  return (
    <tr className="border-t hover:bg-muted/30">
      <td className="px-3 py-2">
        <p className="font-medium">{r.nome || r.codigo}</p>
        <p className="text-xs text-muted-foreground">
          {r.catalogo} · {r.codigo}
        </p>
      </td>
      <td className="px-3 py-2 text-xs">{r.familia}</td>
      <td className="px-3 py-2 font-mono text-xs">{r.ncm ? formatarNcm(r.ncm) : "—"}</td>
      <td className="px-3 py-2">
        <span
          className={
            "rounded px-1.5 py-0.5 text-[11px] font-semibold " +
            (r.acordo === "ACE02"
              ? "bg-emerald-100 text-emerald-700"
              : r.acordo === "ACE18"
                ? "bg-sky-100 text-sky-700"
                : "bg-muted text-muted-foreground")
          }
        >
          {r.acordo ?? "—"}
        </span>
      </td>
      <td className="px-3 py-2">{n2(r.peso_kg)}</td>
      <td className="px-3 py-2 text-xs">
        {r.comp_cm ? `${n2(r.comp_cm)}×${n2(r.larg_cm)}×${n2(r.alt_cm)}` : "—"}
      </td>
      <td className="px-3 py-2">{n2(r.diam_cm)}</td>
      <td className="px-3 py-2">{r.volume_m3 == null ? "—" : r.volume_m3.toFixed(4)}</td>
      <td className="px-3 py-2 font-semibold">{n2(r.peso_cubado_kg)}</td>
      <td className="px-3 py-2">
        <span
          className={
            "text-[11px] " + (r.confianca === "ALTA" ? "text-emerald-600" : "text-muted-foreground")
          }
        >
          {r.fonte}
        </span>
      </td>
      <td className="px-3 py-2">
        <button
          onClick={() => setEdit(true)}
          className="rounded border px-2 py-1 text-xs hover:bg-muted"
        >
          Editar
        </button>
      </td>
    </tr>
  );
}
