import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Users, UserPlus, MapPin, Mail, Download, Search, MessageCircle, ShoppingCart, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EChart } from "@/components/admin/EChart";
import { listarClientesFn, COORD_DEPTO, type Cliente } from "@/lib/clientes";
import { downloadFile } from "@/lib/upload";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/clientes")({
  component: ClientesPage,
});

const fmt = (n: number) => n.toLocaleString("pt-BR");
const data = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");
const tooltipBase = { backgroundColor: "rgba(15,30,20,.92)", borderWidth: 0, textStyle: { color: "#fff" } };
const SEM_LOCAL = "Sem localização";
const whats = (tel: string) => `https://wa.me/${tel.replace(/\D/g, "")}`;

// Admin → Clientes: todos os cadastros, mapa por departamento/cidade e lista com filtros.
function ClientesPage() {
  const { data: clientes, isLoading, isError } = useQuery({ queryKey: ["clientes"], queryFn: () => listarClientesFn() });
  const [busca, setBusca] = useState("");
  const [depto, setDepto] = useState<string | null>(null);
  const [zoom, setZoom] = useState<"uy" | "sul">("uy");

  const lista = clientes ?? [];
  const resumo = useMemo(() => {
    const desde = Date.now() - 30 * 86400_000;
    return {
      total: lista.length,
      novos: lista.filter((c) => new Date(c.criado).getTime() >= desde).length,
      comLocal: lista.filter((c) => c.departamento).length,
      emails: lista.filter((c) => c.recebeEmails).length,
      telefone: lista.filter((c) => c.telefone).length,
    };
  }, [lista]);

  const porDepto = useMemo(() => contar(lista, (c) => c.departamento ?? SEM_LOCAL), [lista]);
  const porCidade = useMemo(() => contar(lista.filter((c) => c.cidade), (c) => c.cidade!), [lista]);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return lista.filter(
      (c) =>
        (!depto || (c.departamento ?? SEM_LOCAL) === depto) &&
        (!q || [c.nome, c.email, c.telefone, c.cidade, c.departamento].some((v) => v?.toLowerCase().includes(q))),
    );
  }, [lista, busca, depto]);

  const mapa = useMemo(() => {
    // Pontos por local exato (cidade do IP ou capital do departamento)
    const pontos = new Map<string, { lon: number; lat: number; nomes: string[]; rotulo: string }>();
    for (const c of lista) {
      if (c.lat == null || c.lon == null) continue;
      const k = `${c.lon.toFixed(2)},${c.lat.toFixed(2)}`;
      const p = pontos.get(k) ?? { lon: c.lon, lat: c.lat, nomes: [], rotulo: [c.cidade, c.departamento].filter(Boolean).join(" · ") };
      p.nomes.push(c.nome);
      pontos.set(k, p);
    }
    const max = Math.max(1, ...[...pontos.values()].map((p) => p.nomes.length));
    const deptos = porDepto.filter(([d]) => COORD_DEPTO[d]);
    return {
      tooltip: {
        ...tooltipBase,
        formatter: (p: any) =>
          p.data?.nomes
            ? `<b>${p.data.rotulo || "—"}</b><br/>${p.data.nomes.length} cliente(s)<br/><span style="opacity:.75">${p.data.nomes.slice(0, 8).join("<br/>")}${p.data.nomes.length > 8 ? "<br/>…" : ""}</span>`
            : p.data?.depto
              ? `<b>${p.data.depto}</b><br/>${p.data.value[2]} cliente(s)`
              : p.name,
      },
      geo: {
        map: "world",
        roam: true,
        center: zoom === "uy" ? [-55.6, -32.7] : [-56, -31],
        zoom: zoom === "uy" ? 26 : 9,
        scaleLimit: { min: 1, max: 60 },
        itemStyle: { areaColor: "#eef2ee", borderColor: "#9fb3a5", borderWidth: 0.6 },
        emphasis: { itemStyle: { areaColor: "#dcefe2" }, label: { show: false } },
        regions: [{ name: "Uruguay", itemStyle: { areaColor: "#d9efe0", borderColor: "#0b7a3b", borderWidth: 1.2 } }],
      },
      series: [
        {
          // Nome do departamento com o total
          type: "scatter",
          coordinateSystem: "geo",
          symbolSize: 0,
          data: deptos.map(([d, n]) => ({ value: [...COORD_DEPTO[d], n], depto: d })),
          label: { show: zoom === "uy", formatter: (p: any) => `${p.data.depto} · ${p.data.value[2]}`, position: "right", distance: 22, fontSize: 11, fontWeight: 700, color: "#1d3b28" },
          zlevel: 1,
        },
        {
          type: "effectScatter",
          coordinateSystem: "geo",
          rippleEffect: { scale: 2.4, brushType: "stroke" },
          itemStyle: { color: "#0b7a3b", shadowBlur: 8, shadowColor: "rgba(0,0,0,.3)" },
          data: [...pontos.values()].map((p) => ({ value: [p.lon, p.lat, p.nomes.length], nomes: p.nomes, rotulo: p.rotulo })),
          symbolSize: (v: number[]) => 9 + 24 * Math.sqrt(v[2] / max),
          zlevel: 2,
        },
      ],
    };
  }, [lista, porDepto, zoom]);

  const barras = useMemo(() => {
    const itens = porDepto.slice(0, 20);
    return {
      tooltip: { ...tooltipBase, trigger: "axis", axisPointer: { type: "shadow" } },
      grid: { left: 10, right: 40, top: 10, bottom: 10, containLabel: true },
      xAxis: { type: "value", minInterval: 1, splitLine: { lineStyle: { type: "dashed" } } },
      yAxis: { type: "category", inverse: true, data: itens.map(([d]) => d), axisTick: { show: false } },
      series: [{
        type: "bar", barMaxWidth: 20, label: { show: true, position: "right" },
        data: itens.map(([d, n]) => ({ value: n, itemStyle: { color: d === SEM_LOCAL ? "#c3c9c5" : d === depto ? "#f2b705" : "#0b7a3b", borderRadius: [0, 6, 6, 0] } })),
      }],
    };
  }, [porDepto, depto]);

  const exportar = () => {
    const cab = ["Nome", "E-mail", "Telefone", "Departamento", "Cidade", "País", "Local por", "Cadastro", "Último login", "Google", "Recebe e-mails", "Carrinhos", "Catálogos"];
    const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const linhas = filtrados.map((c) =>
      [c.nome, c.email, c.telefone, c.departamento, c.cidade, c.pais, c.origemLocal, data(c.criado), data(c.ultimoLogin), c.google ? "sim" : "não", c.recebeEmails ? "sim" : "não", c.carrinhos, c.catalogos].map(esc).join(";"),
    );
    downloadFile([cab.map(esc).join(";"), ...linhas].join("\n"), `clientes-${new Date().toISOString().slice(0, 10)}.csv`);
  };

  const cards = [
    { label: "Clientes cadastrados", valor: resumo.total, icon: Users, cor: "text-emerald-700 bg-emerald-50" },
    { label: "Novos (30 dias)", valor: resumo.novos, icon: UserPlus, cor: "text-sky-700 bg-sky-50" },
    { label: "Com localização", valor: resumo.comLocal, sub: resumo.total ? `${Math.round((resumo.comLocal / resumo.total) * 100)}% do total` : "", icon: MapPin, cor: "text-blue-700 bg-blue-50" },
    { label: "Com telefone", valor: resumo.telefone, icon: MessageCircle, cor: "text-[#128C4B] bg-[#25D366]/10" },
    { label: "Aceitam e-mails", valor: resumo.emails, icon: Mail, cor: "text-amber-700 bg-amber-50" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Clientes</h1>
        <p className="text-sm text-muted-foreground">Todos os cadastros da loja, de onde são e o que fizeram no site.</p>
      </div>

      {isError && <Card className="p-4 text-sm text-red-600">Não foi possível carregar os clientes.</Card>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label} className="flex items-center gap-3 p-4">
            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", c.cor)}><c.icon className="h-5 w-5" /></span>
            <div className="min-w-0">
              <p className="text-2xl font-bold leading-tight">{isLoading ? "…" : fmt(c.valor)}</p>
              <p className="truncate text-xs text-muted-foreground">{c.label}</p>
              {c.sub && <p className="text-[11px] text-muted-foreground/80">{c.sub}</p>}
            </div>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
            <h2 className="flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4 text-primary" /> Mapa de clientes</h2>
            <div className="flex gap-1 rounded-lg border p-1 text-sm">
              {([["uy", "Uruguai"], ["sul", "Região (Brasil e Argentina)"]] as const).map(([k, r]) => (
                <button key={k} onClick={() => setZoom(k)} className={cn("rounded-md px-3 py-1", zoom === k ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>{r}</button>
              ))}
            </div>
          </div>
          {clientes && <EChart option={mapa} height={520} mapa key={zoom} />}
          <p className="border-t px-4 py-2 text-xs text-muted-foreground">
            Cada ponto é um local com clientes (tamanho pela quantidade). Usa o departamento do cadastro; sem ele, a cidade aproximada pelo IP. Arraste e use a roda do mouse para dar zoom.
          </p>
        </Card>
        <div className="space-y-6">
          <Card className="p-4">
            <h2 className="mb-1 font-semibold">Por departamento</h2>
            <p className="mb-2 text-xs text-muted-foreground">Clique num departamento abaixo para filtrar a lista.</p>
            {clientes && (
              <EChart option={barras} height={Math.max(160, porDepto.slice(0, 20).length * 26)} />
            )}
            <div className="mt-2 flex flex-wrap gap-1.5">
              {porDepto.map(([d, n]) => (
                <button key={d} onClick={() => setDepto(depto === d ? null : d)}
                  className={cn("rounded-full border px-2.5 py-0.5 text-xs", depto === d ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>
                  {d} <b>{n}</b>
                </button>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <h2 className="mb-2 font-semibold">Cidades</h2>
            {porCidade.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma cidade informada ainda.</p> : (
              <ul className="space-y-1 text-sm">
                {porCidade.slice(0, 12).map(([c, n]) => (
                  <li key={c} className="flex justify-between gap-2"><span className="truncate">{c}</span><b>{n}</b></li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-2 border-b p-4">
          <h2 className="mr-auto font-semibold">
            Lista de clientes <span className="font-normal text-muted-foreground">({fmt(filtrados.length)}{depto ? ` em ${depto}` : ""})</span>
          </h2>
          {depto && <button onClick={() => setDepto(null)} className="rounded-full bg-muted px-3 py-1 text-xs">Limpar filtro: {depto} ✕</button>}
          <label className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Nome, e-mail, telefone, cidade…"
              className="h-9 w-64 rounded-lg border bg-background pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30" />
          </label>
          <button onClick={exportar} disabled={!filtrados.length} className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm hover:bg-muted disabled:opacity-50">
            <Download className="h-4 w-4" /> Exportar CSV
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">Cliente</th>
                <th className="px-4 py-2.5">Contato</th>
                <th className="px-4 py-2.5">Local</th>
                <th className="px-4 py-2.5">Cadastro</th>
                <th className="px-4 py-2.5">Último login</th>
                <th className="px-4 py-2.5 text-center">Atividade</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Carregando…</td></tr>}
              {!isLoading && filtrados.length === 0 && <tr><td colSpan={6} className="p-6 text-center text-muted-foreground">Nenhum cliente encontrado.</td></tr>}
              {filtrados.map((c) => <Linha key={c.id} c={c} />)}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Linha({ c }: { c: Cliente }) {
  return (
    <tr className="hover:bg-muted/30">
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          {c.avatar ? (
            <img src={c.avatar} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              {c.nome.split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="font-medium">{c.nome}</p>
            <p className="text-xs text-muted-foreground">{c.google ? "Entrou com Google" : "Cadastro com e-mail"}{!c.recebeEmails && " · não recebe e-mails"}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-2.5">
        <a href={`mailto:${c.email}`} className="block text-xs hover:underline">{c.email}</a>
        {c.telefone && (
          <a href={whats(c.telefone)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-[#128C4B] hover:underline">
            <MessageCircle className="h-3 w-3" /> {c.telefone}
          </a>
        )}
      </td>
      <td className="px-4 py-2.5">
        {c.departamento || c.cidade ? (
          <>
            <p>{c.departamento ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
              {c.cidade}
              {c.origemLocal === "ip" && <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-800" title="Aproximado pelo IP da última visita">pelo IP</span>}
            </p>
          </>
        ) : (
          <span className="text-xs text-muted-foreground">Não informado</span>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-2.5">{data(c.criado)}</td>
      <td className="whitespace-nowrap px-4 py-2.5">{data(c.ultimoLogin)}</td>
      <td className="px-4 py-2.5">
        <div className="flex justify-center gap-3 text-xs text-muted-foreground">
          <span title="Carrinhos" className={cn("inline-flex items-center gap-1", c.carrinhos && "text-foreground")}><ShoppingCart className="h-3.5 w-3.5" />{c.carrinhos}</span>
          <span title="Catálogos abertos" className={cn("inline-flex items-center gap-1", c.catalogos && "text-foreground")}><BookOpen className="h-3.5 w-3.5" />{c.catalogos}</span>
        </div>
      </td>
    </tr>
  );
}

function contar(lista: Cliente[], chave: (c: Cliente) => string): Array<[string, number]> {
  const m = new Map<string, number>();
  for (const c of lista) m.set(chave(c), (m.get(chave(c)) ?? 0) + 1);
  // "Sem localização" sempre por último
  return [...m.entries()].sort((a, b) => (a[0] === SEM_LOCAL ? 1 : b[0] === SEM_LOCAL ? -1 : b[1] - a[1]));
}
