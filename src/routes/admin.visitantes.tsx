import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Globe2, Users, MousePointerClick, MessageCircle, MapPin, Smartphone, Megaphone, Radio, Percent } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EChart } from "@/components/admin/EChart";
import { getVisitantesFn, type Visitantes } from "@/lib/visitantes";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/visitantes")({
  component: VisitantesPage,
});

const PERIODOS = [1, 7, 30, 90];
const VERDES = ["#0b7a3b", "#25a35a", "#f2b705", "#1f6fb5", "#c8102e", "#7c4dbd", "#e07b00", "#4fb3a9", "#8a8f98", "#5c3d1e"];
const nomePais = (() => {
  let dn: Intl.DisplayNames | null = null;
  try {
    dn = new Intl.DisplayNames(["pt-BR"], { type: "region" });
  } catch {
    dn = null;
  }
  return (code: string | null, fallback = "—") => (code && dn ? dn.of(code) ?? code : fallback);
})();
const bandeira = (code: string | null) =>
  code && code.length === 2 ? String.fromCodePoint(...[...code.toUpperCase()].map((c) => 127397 + c.charCodeAt(0))) : "🌐";
const ROTULO_FONTE: Record<string, string> = {
  direto: "Direto / digitou o site",
  google: "Google",
  instagram: "Instagram",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  bing: "Bing",
  "sem dado": "Sem dado (antes do rastreio)",
};
const fonteNome = (f: string) => ROTULO_FONTE[f] ?? f;
const fmt = (n: number) => n.toLocaleString("pt-BR");
const taxa = (a: number, b: number) => (b ? `${((a / b) * 100).toFixed(1)}%` : "—");
const tooltipBase = { backgroundColor: "rgba(15,30,20,.92)", borderWidth: 0, textStyle: { color: "#fff" } };

// Painel de visitantes: de onde vêm (país, departamento, cidade), por qual canal chegam
// (Google, Instagram, campanha...) e quais origens viram conversa no WhatsApp.
function VisitantesPage() {
  const [dias, setDias] = useState(30);
  const [zoom, setZoom] = useState<"uy" | "sul" | "mundo">("uy");
  // O tráfego pago é segmentado para o Uruguai: o painel abre filtrado no Uruguai
  const [soUruguai, setSoUruguai] = useState(true);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["visitantes", dias, soUruguai],
    queryFn: () => getVisitantesFn({ data: { dias, pais: soUruguai ? "UY" : null } }),
    refetchInterval: 60_000,
  });

  const cards = [
    { label: "Visitantes únicos", valor: data && fmt(data.resumo.visitantes), icon: Users, cor: "text-emerald-700 bg-emerald-50" },
    { label: "Sessões", valor: data && fmt(data.resumo.sessoes), sub: data && `${data.resumo.paginasPorSessao} páginas/sessão`, icon: MousePointerClick, cor: "text-sky-700 bg-sky-50" },
    { label: "Conversas no WhatsApp", valor: data && fmt(data.resumo.sessoesComWhatsapp), sub: data && `${fmt(data.resumo.cliquesWhatsapp)} cliques`, icon: MessageCircle, cor: "text-[#128C4B] bg-[#25D366]/10" },
    { label: "Conversão", valor: data && `${data.resumo.conversao}%`, sub: "sessões que chamaram no WhatsApp", icon: Percent, cor: "text-amber-700 bg-amber-50" },
    { label: "Do Uruguai", valor: data && `${data.resumo.pctUruguay}%`, sub: data && `${data.resumo.pctComLocal}% com local identificado`, icon: MapPin, cor: "text-blue-700 bg-blue-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Globe2 className="h-6 w-6 text-primary" /> Visitantes
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            De onde vêm os clientes, por qual canal chegam e quais origens viram conversa no WhatsApp. Atualiza
            sozinho a cada minuto. Suas visitas como admin não entram.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          {([[true, "🇺🇾 Só Uruguai"], [false, "Todos os países"]] as const).map(([v, r]) => (
            <button key={r} onClick={() => setSoUruguai(v)} className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition", soUruguai === v ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>
              {r}
            </button>
          ))}
        </div>
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          {PERIODOS.map((d) => (
            <button
              key={d}
              onClick={() => setDias(d)}
              className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition", dias === d ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
            >
              {d === 1 ? "Hoje" : `${d} dias`}
            </button>
          ))}
        </div>
        </div>
      </div>

      {isError && <Card className="p-4 text-sm text-destructive">Não foi possível carregar os dados.</Card>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <div className="flex items-center gap-2">
              <span className={cn("flex h-8 w-8 items-center justify-center rounded-full", c.cor)}>
                <c.icon className="h-4 w-4" />
              </span>
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.label}</span>
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums">{isLoading ? "…" : c.valor ?? 0}</div>
            {c.sub && <div className="text-xs text-muted-foreground">{c.sub}</div>}
          </Card>
        ))}
      </div>

      {data && !soUruguai && data.pagoForaDoPais > 0 && (
        <Card className="border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <b>{fmt(data.pagoForaDoPais)} sessões de anúncio vieram de fora do Uruguai.</b> Confira a segmentação de local das
          campanhas: no Google, «Presença: pessoas no local»; na Meta, «Pessoas que moram ou estiveram recentemente no local».
        </Card>
      )}
      {data && <Paineis data={data} zoom={zoom} setZoom={setZoom} />}
    </div>
  );
}

function Paineis({ data, zoom, setZoom }: { data: Visitantes; zoom: "uy" | "sul" | "mundo"; setZoom: (z: "uy" | "sul" | "mundo") => void }) {
  const maxCidade = Math.max(1, ...data.cidades.map((c) => c.visitantes));

  const mapa = useMemo(
    () => ({
      tooltip: {
        ...tooltipBase,
        formatter: (p: any) =>
          p.seriesType === "effectScatter"
            ? `<b>${p.data.cidade}</b><br/>${p.data.regiao ?? ""}<br/>${fmt(p.data.value[2])} visitantes · ${fmt(p.data.whatsapp)} no WhatsApp`
            : p.data
              ? `<b>${p.data.rotulo}</b><br/>${fmt(p.data.value)} visitantes`
              : p.name,
      },
      visualMap: {
        show: false,
        seriesIndex: 0,
        min: 0,
        max: Math.max(1, ...data.paises.map((p) => p.visitantes)),
        inRange: { color: ["#d9efe0", "#0b7a3b"] },
      },
      geo: {
        map: "world",
        roam: true,
        center: zoom === "uy" ? [-55.9, -32.6] : zoom === "sul" ? [-58, -24] : [0, 15],
        zoom: zoom === "uy" ? 13 : zoom === "sul" ? 4 : 1.1,
        scaleLimit: { min: 1, max: 40 },
        itemStyle: { areaColor: "#eef2ee", borderColor: "#9fb3a5", borderWidth: 0.6 },
        emphasis: { itemStyle: { areaColor: "#bfe3c9" }, label: { show: false } },
      },
      series: [
        {
          type: "map",
          geoIndex: 0,
          data: data.paises.map((p) => ({ name: p.nome, value: p.visitantes, rotulo: `${bandeira(p.code)} ${nomePais(p.code, p.nome)}` })),
        },
        {
          type: "effectScatter",
          coordinateSystem: "geo",
          rippleEffect: { scale: 2.6, brushType: "stroke" },
          itemStyle: { color: "#f2b705", shadowBlur: 8, shadowColor: "rgba(0,0,0,.3)" },
          data: data.cidades
            .filter((c) => c.lat != null && c.lon != null)
            .map((c) => ({ value: [c.lon, c.lat, c.visitantes], cidade: c.city, regiao: [c.region, nomePais(c.code, "")].filter(Boolean).join(", "), whatsapp: c.whatsapp })),
          symbolSize: (v: number[]) => 8 + 26 * Math.sqrt(v[2] / maxCidade),
          zlevel: 2,
        },
      ],
    }),
    [data, zoom, maxCidade],
  );

  const linha = useMemo(
    () => ({
      tooltip: { ...tooltipBase, trigger: "axis" },
      legend: { top: 0 },
      grid: { left: 40, right: 40, top: 40, bottom: 30 },
      xAxis: { type: "category", data: data.porDia.map((d) => d.dia.slice(5).split("-").reverse().join("/")), axisTick: { show: false } },
      yAxis: [{ type: "value", minInterval: 1, splitLine: { lineStyle: { color: "#eef1ee" } } }, { type: "value", minInterval: 1, splitLine: { show: false } }],
      series: [
        { name: "Visitantes", type: "line", smooth: true, symbol: "none", data: data.porDia.map((d) => d.visitantes), lineStyle: { width: 3, color: "#0b7a3b" }, itemStyle: { color: "#0b7a3b" }, areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(11,122,59,.28)" }, { offset: 1, color: "rgba(11,122,59,0)" }] } } },
        { name: "Páginas vistas", type: "line", smooth: true, symbol: "none", data: data.porDia.map((d) => d.visitas), lineStyle: { width: 2, color: "#1f6fb5", type: "dashed" }, itemStyle: { color: "#1f6fb5" } },
        { name: "Conversas WhatsApp", type: "bar", yAxisIndex: 1, barMaxWidth: 14, data: data.porDia.map((d) => d.whatsapp), itemStyle: { color: "#25D366", borderRadius: [4, 4, 0, 0] } },
      ],
    }),
    [data],
  );

  const pizza = (itens: Array<{ nome: string; valor: number }>, raio: [string, string] = ["45%", "72%"]) => ({
    tooltip: { ...tooltipBase, trigger: "item", formatter: "{b}<br/>{c} sessões ({d}%)" },
    color: VERDES,
    legend: { type: "scroll", bottom: 0 },
    series: [{ type: "pie", radius: raio, center: ["50%", "45%"], itemStyle: { borderColor: "#fff", borderWidth: 2, borderRadius: 6 }, label: { formatter: "{d}%" }, data: itens.map((i) => ({ name: i.nome, value: i.valor })) }],
  });

  const barras = (itens: Array<{ nome: string; valor: number }>, cor = "#0b7a3b") => ({
    tooltip: { ...tooltipBase, trigger: "axis", axisPointer: { type: "shadow" } },
    grid: { left: 8, right: 40, top: 8, bottom: 8, containLabel: true },
    xAxis: { type: "value", minInterval: 1, splitLine: { lineStyle: { color: "#eef1ee" } } },
    yAxis: { type: "category", inverse: true, data: itens.map((i) => i.nome), axisTick: { show: false }, axisLabel: { width: 160, overflow: "truncate" } },
    series: [{ type: "bar", data: itens.map((i) => i.valor), itemStyle: { color: cor, borderRadius: [0, 6, 6, 0] }, barMaxWidth: 22, label: { show: true, position: "right" } }],
  });

  const calor = useMemo(() => {
    const pontos: number[][] = [];
    data.horario.forEach((linha, d) => linha.forEach((v, h) => pontos.push([h, d, v])));
    return {
      tooltip: { ...tooltipBase, formatter: (p: any) => `${["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"][p.value[1]]} ${p.value[0]}h: ${p.value[2]} sessões` },
      grid: { left: 40, right: 10, top: 10, bottom: 40 },
      xAxis: { type: "category", data: Array.from({ length: 24 }, (_, h) => `${h}h`), splitArea: { show: true } },
      yAxis: { type: "category", data: ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"], splitArea: { show: true } },
      visualMap: { min: 0, max: Math.max(1, ...pontos.map((p) => p[2])), calculable: false, orient: "horizontal", left: "center", bottom: 0, itemHeight: 120, inRange: { color: ["#f3f7f3", "#7cc596", "#0b7a3b"] }, show: false },
      series: [{ type: "heatmap", data: pontos, itemStyle: { borderColor: "#fff", borderWidth: 2, borderRadius: 3 } }],
    };
  }, [data]);

  const opcoes = useMemo(
    () => ({
      fontes: pizza(data.fontes.map((f) => ({ nome: fonteNome(f.fonte), valor: f.sessoes }))),
      cidades: barras(data.cidades.slice(0, 12).map((c) => ({ nome: c.city, valor: c.visitantes }))),
      regioes: barras(data.regioes.slice(0, 12).map((r) => ({ nome: `${r.region} (${r.code ?? "?"})`, valor: r.visitantes })), "#1f6fb5"),
      dispositivos: pizza(data.dispositivos.map((d) => ({ nome: d.nome, valor: d.sessoes })), ["40%", "70%"]),
      navegadores: barras(data.navegadores.map((d) => ({ nome: d.nome, valor: d.sessoes })), "#7c4dbd"),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data],
  );

  return (
    <>
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
          <h2 className="flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4 text-primary" /> Mapa de visitantes</h2>
          <div className="flex gap-1 rounded-lg border p-1 text-sm">
            {([["uy", "Uruguai"], ["sul", "América do Sul"], ["mundo", "Mundo"]] as const).map(([k, r]) => (
              <button key={k} onClick={() => setZoom(k)} className={cn("rounded-md px-3 py-1", zoom === k ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>{r}</button>
            ))}
          </div>
        </div>
        <EChart option={mapa} height={460} mapa key={zoom} />
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">
          Pontos amarelos = cidades (tamanho pelo número de visitantes). Localização aproximada pelo IP. Arraste e use a roda do mouse para dar zoom.
        </p>
      </Card>

      <Card className="p-4">
        <h2 className="mb-2 font-semibold">Visitantes por dia</h2>
        <EChart option={linha} height={300} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-2 flex items-center gap-2 font-semibold"><Radio className="h-4 w-4 text-primary" /> Por onde chegam</h2>
          <EChart option={opcoes.fontes} height={300} />
        </Card>
        <Card className="p-4">
          <h2 className="mb-2 font-semibold">Origem que vira venda</h2>
          <p className="mb-3 text-xs text-muted-foreground">Sessões de cada canal e quantas chamaram no WhatsApp.</p>
          <Tabela
            cab={["Canal", "Tipo", "Sessões", "Visitantes", "WhatsApp", "Conv."]}
            linhas={data.fontes.map((f) => [fonteNome(f.fonte), f.meio, fmt(f.sessoes), fmt(f.visitantes), fmt(f.whatsapp), taxa(f.whatsapp, f.sessoes)])}
          />
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-1 flex items-center gap-2 font-semibold"><Megaphone className="h-4 w-4 text-primary" /> Tráfego pago por departamento</h2>
        <p className="mb-3 text-xs text-muted-foreground">Sessões vindas de anúncios (Google Ads, Meta) e quantas viraram conversa no WhatsApp. Use para ajustar a verba por região.</p>
        <Tabela
          cab={["Departamento", "Sessões pagas", "Visitantes", "WhatsApp", "Conv."]}
          linhas={data.pagoPorRegiao.map((r) => [`${bandeira(r.code)} ${r.region}`, fmt(r.sessoes), fmt(r.visitantes), fmt(r.whatsapp), taxa(r.whatsapp, r.sessoes)])}
        />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-2 font-semibold">Cidades</h2>
          <EChart option={opcoes.cidades} height={360} />
        </Card>
        <Card className="p-4">
          <h2 className="mb-2 font-semibold">Departamentos / estados</h2>
          <EChart option={opcoes.regioes} height={360} />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-4 lg:col-span-2">
          <h2 className="mb-2 font-semibold">Todas as cidades</h2>
          <div className="max-h-[420px] overflow-auto">
            <Tabela
              cab={["Cidade", "Departamento", "País", "Visitantes", "Sessões", "WhatsApp", "Conv."]}
              linhas={data.cidades.map((c) => [c.city, c.region ?? "—", `${bandeira(c.code)} ${nomePais(c.code)}`, fmt(c.visitantes), fmt(c.sessoes), fmt(c.whatsapp), taxa(c.whatsapp, c.sessoes)])}
            />
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-2 font-semibold">Países</h2>
          <Tabela cab={["País", "Visitantes", "WhatsApp"]} linhas={data.paises.map((p) => [`${bandeira(p.code)} ${nomePais(p.code, p.nome)}`, fmt(p.visitantes), fmt(p.whatsapp)])} />
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-1 flex items-center gap-2 font-semibold"><Megaphone className="h-4 w-4 text-primary" /> Campanhas (UTM)</h2>
        <p className="mb-3 text-xs text-muted-foreground">Links com utm_campaign (ex.: os links do kit de anúncios). Mostra quais campanhas trazem conversa no WhatsApp.</p>
        {data.campanhas.length ? (
          <Tabela cab={["Campanha", "Canal", "Tipo", "Sessões", "Visitantes", "WhatsApp", "Conv."]} linhas={data.campanhas.map((c) => [c.campanha, fonteNome(c.fonte), c.meio, fmt(c.sessoes), fmt(c.visitantes), fmt(c.whatsapp), taxa(c.whatsapp, c.sessoes)])} />
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">Nenhuma visita por link de campanha neste período.</p>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-4">
          <h2 className="mb-2 flex items-center gap-2 font-semibold"><Smartphone className="h-4 w-4 text-primary" /> Aparelhos</h2>
          <EChart option={opcoes.dispositivos} height={260} />
        </Card>
        <Card className="p-4">
          <h2 className="mb-2 font-semibold">Navegadores</h2>
          <EChart option={opcoes.navegadores} height={260} />
        </Card>
        <Card className="p-4">
          <h2 className="mb-2 font-semibold">Dia e hora (Uruguai)</h2>
          <EChart option={calor} height={260} />
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-2 font-semibold">Páginas de entrada</h2>
          <Tabela cab={["Página", "Sessões"]} linhas={data.entradas.map((p) => [p.path, fmt(p.sessoes)])} />
        </Card>
        <Card className="p-4">
          <h2 className="mb-2 font-semibold">Páginas mais vistas</h2>
          <Tabela cab={["Página", "Visitas"]} linhas={data.paginas.map((p) => [p.path, fmt(p.visitas)])} />
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-2 flex items-center gap-2 font-semibold"><span className="h-2 w-2 animate-pulse rounded-full bg-[#25D366]" /> Últimas visitas</h2>
        <div className="max-h-[420px] overflow-auto">
          <Tabela
            cab={["Quando", "Local", "Canal", "Aparelho", "Página", "Visitante"]}
            linhas={data.recentes.map((r) => [
              new Date(r.quando).toLocaleString("pt-BR", { timeZone: "America/Montevideo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }),
              r.city ? `${bandeira(r.code)} ${r.city}${r.region ? `, ${r.region}` : ""}` : `${bandeira(r.code)} ${nomePais(r.code, "Desconhecido")}`,
              r.fonte ? fonteNome(r.fonte) : "—",
              [r.device, r.browser].filter(Boolean).join(" · ") || "—",
              r.path,
              r.visitante,
            ])}
          />
        </div>
      </Card>
      <p className="text-xs text-muted-foreground">
        Localização por IP com a base IP Geolocation by <a href="https://db-ip.com" target="_blank" rel="noreferrer" className="underline">DB-IP</a> (CC BY 4.0). O IP não é guardado.
      </p>
    </>
  );
}

function Tabela({ cab, linhas }: { cab: string[]; linhas: (string | number)[][] }) {
  if (!linhas.length) return <p className="py-4 text-center text-sm text-muted-foreground">Sem dados neste período.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
            {cab.map((c, i) => <th key={c} className={cn("px-2 py-2 font-medium", i > 0 && "text-right", i === 0 && "text-left")}>{c}</th>)}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, k) => (
            <tr key={k} className="border-b last:border-0 hover:bg-muted/40">
              {l.map((v, i) => <td key={i} className={cn("px-2 py-1.5", i > 0 ? "text-right tabular-nums" : "max-w-[260px] truncate font-medium")}>{v}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
