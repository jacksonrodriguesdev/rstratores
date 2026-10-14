import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { z } from "zod";
import {
  BarChart3, Activity, Box, Mountain, Package, Grid3x3, MousePointerClick, ArrowDownToLine, Filter, Share2, Radio, Loader2, ExternalLink,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { EChart } from "@/components/admin/EChart";
import {
  resumoFn, calorFn, regioesFn, produtosFn, produtoRegiaoFn, cliquesFn, rolagemFn, funilFn, canaisFn, tempoRealFn,
} from "@/lib/analises";
import { cn } from "@/lib/utils";

// Admin → Análises: 10 ferramentas sobre o comportamento dos visitantes (src/lib/analises.server.ts)
const ABAS = [
  { id: "resumo", nome: "Resumo e métricas", icone: Activity, desc: "Visitas, visitantes, sessões, tempo e rejeição" },
  { id: "calor", nome: "Mapa de calor 3D", icone: Box, desc: "Dia da semana × hora (horário do Uruguai)" },
  { id: "regioes", nome: "Relevo 3D das regiões", icone: Mountain, desc: "De onde acessam, em 3D, e as cidades" },
  { id: "produtos", nome: "Peças mais acessadas", icone: Package, desc: "Vistas, carrinho, WhatsApp e conversão" },
  { id: "peca-regiao", nome: "Peça × região", icone: Grid3x3, desc: "Quais peças cada região mais olha" },
  { id: "cliques", nome: "Mapa de cliques", icone: MousePointerClick, desc: "Onde as pessoas clicam em cada página" },
  { id: "rolagem", nome: "Rolagem das páginas", icone: ArrowDownToLine, desc: "Até onde descem em cada página" },
  { id: "funil", nome: "Funil de vendas", icone: Filter, desc: "Da visita ao pedido, por canal" },
  { id: "canais", nome: "Canais, aparelhos e idioma", icone: Share2, desc: "De onde vêm e com o quê acessam" },
  { id: "tempo-real", nome: "Tempo real", icone: Radio, desc: "Quem está no site agora" },
] as const;
type Aba = (typeof ABAS)[number]["id"];

export const Route = createFileRoute("/admin/analises")({
  validateSearch: z.object({ aba: z.string().optional(), dias: z.coerce.number().optional() }),
  component: AnalisesPage,
});

const DIAS = [
  [1, "Hoje"],
  [7, "7 dias"],
  [30, "30 dias"],
  [90, "90 dias"],
] as const;
const VERDE = "#0b7a3b";
const n = (v: number) => v.toLocaleString("pt-BR");
const pct = (v: number) => `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const nomePagina = (p: string) =>
  ({ "/": "Início", "/loja": "Loja", "/produto/*": "Páginas de peças", "/catalogos": "Catálogos", "/catalogos/*": "Páginas de catálogo", "/cotizar": "Cotizar", "/pedido-rapido": "Pedido rápido", "/ayuda": "Ajuda", "/cadastro": "Cadastro", "/cuenta": "Minha conta", "/repuestos": "Repuestos" } as Record<string, string>)[p] ??
  (p.startsWith("/repuestos/") ? `Repuestos ${p.slice(11).replace(/[/-]/g, " ")}` : p);
const curto = (s: string, max = 34) => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

function AnalisesPage() {
  const busca = Route.useSearch();
  const navigate = useNavigate();
  const aba = (ABAS.some((a) => a.id === busca.aba) ? busca.aba : "resumo") as Aba;
  const dias = busca.dias ?? 30;
  const ir = (mudar: { aba?: Aba; dias?: number }) => navigate({ to: "/admin/analises", search: { aba, dias, ...mudar } as never, replace: true });
  const atual = ABAS.find((a) => a.id === aba)!;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><BarChart3 className="h-6 w-6 text-primary" /> Análises</h1>
          <p className="mt-1 text-sm text-muted-foreground">10 ferramentas sobre o que os visitantes fazem no site. Visitas do admin não contam.</p>
        </div>
        {aba !== "tempo-real" && (
          <div className="flex rounded-lg border bg-card p-1">
            {DIAS.map(([d, rotulo]) => (
              <button key={d} onClick={() => ir({ dias: d })} className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition", dias === d ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                {rotulo}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {ABAS.map((a, i) => (
          <button
            key={a.id}
            onClick={() => ir({ aba: a.id })}
            className={cn("flex items-start gap-3 rounded-xl border p-3 text-left transition", aba === a.id ? "border-primary bg-primary/5 ring-1 ring-primary" : "bg-card hover:border-primary/40")}
          >
            <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", aba === a.id ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary")}>
              <a.icone className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold leading-tight">{i + 1}. {a.nome}</span>
              <span className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">{a.desc}</span>
            </span>
          </button>
        ))}
      </div>

      <div>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold"><atual.icone className="h-5 w-5 text-primary" /> {atual.nome}</h2>
        {aba === "resumo" && <Resumo dias={dias} />}
        {aba === "calor" && <Calor dias={dias} />}
        {aba === "regioes" && <Regioes dias={dias} />}
        {aba === "produtos" && <Produtos dias={dias} />}
        {aba === "peca-regiao" && <PecaRegiao dias={dias} />}
        {aba === "cliques" && <Cliques dias={dias} />}
        {aba === "rolagem" && <Rolagem dias={dias} />}
        {aba === "funil" && <Funil dias={dias} />}
        {aba === "canais" && <Canais dias={dias} />}
        {aba === "tempo-real" && <TempoReal />}
      </div>
    </div>
  );
}

// ---------- peças comuns
function Carregando({ d }: { d: unknown }) {
  if (d) return null;
  return (
    <Card className="flex h-64 items-center justify-center text-muted-foreground">
      <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Calculando…
    </Card>
  );
}
function Vazio({ children }: { children: ReactNode }) {
  return <Card className="p-8 text-center text-sm text-muted-foreground">{children}</Card>;
}
function Kpi({ rotulo, valor, sub, destaque }: { rotulo: string; valor: string; sub?: ReactNode; destaque?: boolean }) {
  return (
    <Card className={cn("p-4", destaque && "border-primary/40 bg-primary/5")}>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{rotulo}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{valor}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}
function Painel({ titulo, children, className, acao }: { titulo: string; children: ReactNode; className?: string; acao?: ReactNode }) {
  return (
    <Card className={cn("p-4", className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{titulo}</h3>
        {acao}
      </div>
      {children}
    </Card>
  );
}
const tempo = (seg: number) => (seg < 60 ? `${Math.round(seg)} s` : `${Math.floor(seg / 60)} min ${Math.round(seg % 60)} s`);

// ---------------------------------------------------------------- 1. Resumo
function Resumo({ dias }: { dias: number }) {
  const { data: d } = useQuery({ queryKey: ["an-resumo", dias], queryFn: () => resumoFn({ data: { dias } }) });
  if (!d) return <Carregando d={d} />;
  const variacao = d.visitasAntes ? (d.visitas - d.visitasAntes) / d.visitasAntes : null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Kpi rotulo="Visitas" valor={n(d.visitas)} destaque sub={variacao == null ? "período anterior sem dados" : <span className={variacao >= 0 ? "text-emerald-700" : "text-red-600"}>{variacao >= 0 ? "▲" : "▼"} {pct(Math.abs(variacao))} vs. período anterior</span>} />
        <Kpi rotulo="Visitantes" valor={n(d.visitantes)} sub={`${n(d.novos)} novos · ${n(d.recorrentes)} voltaram`} />
        <Kpi rotulo="Sessões" valor={n(d.sessoes)} />
        <Kpi rotulo="Páginas por sessão" valor={d.paginasPorSessao.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} />
        <Kpi rotulo="Tempo no site" valor={tempo(d.duracaoMedia)} sub="mediana das sessões com mais de 1 página" />
        <Kpi rotulo="Rejeição" valor={pct(d.rejeicao)} sub="saíram sem fazer nada" />
        <Kpi rotulo="Pedidos no WhatsApp" valor={n(d.whatsapp)} sub={`${n(d.carrinho)} itens no carrinho`} />
        <Kpi rotulo="Buscas" valor={n(d.buscas)} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Painel titulo="Por dia">
          <EChart
            height={300}
            option={{
              tooltip: { trigger: "axis" },
              legend: { bottom: 0 },
              grid: { left: 40, right: 16, top: 16, bottom: 48 },
              xAxis: { type: "category", data: d.serie.map((s) => s.dia.slice(5).split("-").reverse().join("/")) },
              yAxis: { type: "value" },
              series: [
                { name: "Visitas", type: "line", smooth: true, areaStyle: { opacity: 0.15 }, data: d.serie.map((s) => s.visitas), color: VERDE },
                { name: "Visitantes", type: "line", smooth: true, data: d.serie.map((s) => s.visitantes), color: "#2563eb" },
                { name: "WhatsApp + carrinho", type: "bar", data: d.serie.map((s) => s.acoes), color: "#f59e0b" },
              ],
            }}
          />
        </Painel>
        <Painel titulo="Páginas mais vistas">
          <EChart
            height={300}
            option={{
              tooltip: {},
              grid: { left: 120, right: 30, top: 8, bottom: 20 },
              xAxis: { type: "value" },
              yAxis: { type: "category", inverse: true, data: d.paginasTop.map((p) => curto(nomePagina(p.pagina), 20)) },
              series: [{ type: "bar", data: d.paginasTop.map((p) => p.visitas), color: VERDE, label: { show: true, position: "right" } }],
            }}
          />
        </Painel>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- 2. Calor 3D
function Calor({ dias }: { dias: number }) {
  const { data: d } = useQuery({ queryKey: ["an-calor", dias], queryFn: () => calorFn({ data: { dias } }) });
  const [modo, setModo] = useState<"3d" | "2d">("3d");
  if (!d) return <Carregando d={d} />;
  if (!d.total) return <Vazio>Sem visitas no período.</Vazio>;
  const max = Math.max(1, ...d.matriz.flat());
  const pontos = d.matriz.flatMap((linha, dia) => linha.map((v, hora) => [hora, dia, v]));
  const horas = Array.from({ length: 24 }, (_, h) => `${h}h`);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi rotulo="Horário de pico" valor={`${DIAS_SEMANA[d.pico.dia]} ${d.pico.hora}h`} sub={`${n(d.pico.visitas)} visitas`} destaque />
        <Kpi rotulo="Melhor hora (média)" valor={`${d.porHora.indexOf(Math.max(...d.porHora))}h`} />
        <Kpi rotulo="Melhor dia" valor={DIAS_SEMANA[d.porDia.indexOf(Math.max(...d.porDia))]} />
        <Kpi rotulo="Visitas no período" valor={n(d.total)} />
      </div>
      <Painel
        titulo="Visitas por dia da semana e hora — use o mouse para girar e o scroll para aproximar"
        acao={
          <div className="flex rounded-md border p-0.5 text-xs">
            {(["3d", "2d"] as const).map((m) => (
              <button key={m} onClick={() => setModo(m)} className={cn("rounded px-2 py-1 font-semibold", modo === m ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{m.toUpperCase()}</button>
            ))}
          </div>
        }
      >
        {modo === "3d" ? (
          <EChart
            key="3d"
            gl
            height={520}
            option={{
              tooltip: { formatter: (p: any) => `${DIAS_SEMANA[p.value[1]]} ${p.value[0]}h: <b>${p.value[2]}</b> visitas` },
              visualMap: { max, inRange: { color: ["#e0f2e9", "#7ccf9f", "#22a35a", "#0b7a3b", "#f59e0b", "#dc2626"] }, calculable: true, left: 0, bottom: 10 },
              xAxis3D: { type: "category", data: horas, name: "Hora" },
              yAxis3D: { type: "category", data: DIAS_SEMANA, name: "" },
              zAxis3D: { type: "value", name: "Visitas" },
              grid3D: { boxWidth: 220, boxDepth: 80, viewControl: { alpha: 28, beta: 30, distance: 230 }, light: { main: { intensity: 1.2, shadow: true }, ambient: { intensity: 0.35 } } },
              series: [{ type: "bar3D", data: pontos, shading: "lambert", bevelSize: 0.2, label: { show: false }, emphasis: { label: { show: true, fontSize: 14 } } }],
            }}
          />
        ) : (
          <EChart
            key="2d"
            height={360}
            option={{
              tooltip: { formatter: (p: any) => `${DIAS_SEMANA[p.value[1]]} ${p.value[0]}h: <b>${p.value[2]}</b> visitas` },
              grid: { left: 50, right: 20, top: 10, bottom: 70 },
              xAxis: { type: "category", data: horas, splitArea: { show: true } },
              yAxis: { type: "category", data: DIAS_SEMANA, splitArea: { show: true } },
              visualMap: { max, calculable: true, orient: "horizontal", left: "center", bottom: 0, inRange: { color: ["#f0fdf4", "#22a35a", "#f59e0b", "#dc2626"] } },
              series: [{ type: "heatmap", data: pontos, label: { show: true, formatter: (p: any) => (p.value[2] ? p.value[2] : "") } }],
            }}
          />
        )}
      </Painel>
      <p className="text-xs text-muted-foreground">Dica: programe anúncios e posts para os horários com mais visitas.</p>
    </div>
  );
}

// ---------------------------------------------------------------- 3. Relevo 3D das regiões
function Regioes({ dias }: { dias: number }) {
  const { data: d } = useQuery({ queryKey: ["an-regioes", dias], queryFn: () => regioesFn({ data: { dias } }) });
  if (!d) return <Carregando d={d} />;
  if (!d.cidades.length) return <Vazio>Sem visitas com localização no período.</Vazio>;
  // Só a região onde há visitas (Uruguai + RS): cada barra é um quadrado de ~25 km
  const comCoord = d.celulas;
  const max = Math.max(1, ...comCoord.map((c) => c.visitas));
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
        <Painel titulo="Relevo das visitas (latitude × longitude × visitas) — gire com o mouse">
          {comCoord.length ? (
            <EChart
              gl
              height={520}
              option={{
                tooltip: { formatter: (p: any) => `${p.data.cidade}<br/><b>${p.data.value[2]}</b> visitas · ${p.data.visitantes} visitantes` },
                visualMap: { max, inRange: { color: ["#bbf7d0", "#22a35a", "#0b7a3b", "#f59e0b", "#dc2626"] }, left: 0, bottom: 10, calculable: true },
                xAxis3D: { type: "value", name: "Longitude", min: Math.floor(Math.min(...comCoord.map((c) => c.lon))) - 1, max: Math.ceil(Math.max(...comCoord.map((c) => c.lon))) + 1 },
                yAxis3D: { type: "value", name: "Latitude", min: Math.floor(Math.min(...comCoord.map((c) => c.lat))) - 1, max: Math.ceil(Math.max(...comCoord.map((c) => c.lat))) + 1 },
                zAxis3D: { type: "value", name: "Visitas" },
                grid3D: { boxWidth: 160, boxDepth: 160, viewControl: { alpha: 35, beta: 20, distance: 260 }, light: { main: { intensity: 1.2, shadow: true }, ambient: { intensity: 0.3 } } },
                series: [
                  {
                    type: "bar3D",
                    barSize: 2.2,
                    shading: "lambert",
                    data: comCoord.map((c) => ({ value: [c.lon, c.lat, c.visitas], cidade: c.cidade, visitantes: c.visitantes })),
                    label: { show: false, formatter: (p: any) => p.data.cidade },
                    emphasis: { label: { show: true, fontSize: 13 } },
                  },
                ],
              }}
            />
          ) : (
            <p className="p-6 text-sm text-muted-foreground">As visitas do período não têm coordenadas.</p>
          )}
        </Painel>
        <Painel titulo="Mapa">
          <EChart
            mapa
            height={520}
            option={{
              tooltip: { formatter: (p: any) => (p.data ? `${p.data.name}: <b>${p.data.value[2]}</b> visitas` : "") },
              geo: { map: "world", roam: true, center: [-55.5, -31.5], zoom: 9, itemStyle: { areaColor: "#f4f7f2", borderColor: "#a3b8a8" }, emphasis: { disabled: true } },
              series: [
                {
                  type: "effectScatter",
                  coordinateSystem: "geo",
                  data: d.cidades.filter((c) => c.lat != null).map((c) => ({ name: c.cidade, value: [c.lon, c.lat, c.visitas] })),
                  symbolSize: (v: number[]) => Math.max(6, Math.min(40, Math.sqrt(v[2]) * 4)),
                  itemStyle: { color: VERDE },
                  rippleEffect: { scale: 2.5 },
                },
              ],
            }}
          />
        </Painel>
      </div>
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Painel titulo="Cidades">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-card text-left text-xs uppercase text-muted-foreground">
                <tr><th className="py-2">Cidade</th><th>Região</th><th>País</th><th className="text-right">Visitas</th><th className="text-right">Visitantes</th></tr>
              </thead>
              <tbody className="divide-y">
                {d.cidades.map((c, i) => (
                  <tr key={i}><td className="py-1.5 font-medium">{c.cidade}</td><td>{c.regiao}</td><td>{c.pais}</td><td className="text-right tabular-nums">{n(c.visitas)}</td><td className="text-right tabular-nums">{n(c.visitantes)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Painel>
        <Painel titulo="Países">
          <EChart
            height={320}
            option={{ tooltip: { trigger: "item" }, series: [{ type: "pie", radius: ["40%", "70%"], data: d.paises.map((p) => ({ name: p.pais === "—" ? "Desconhecido" : p.pais, value: p.visitas })), label: { formatter: "{b}: {d}%" } }] }}
          />
        </Painel>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- 4. Peças mais acessadas
function Produtos({ dias }: { dias: number }) {
  const { data: d } = useQuery({ queryKey: ["an-produtos", dias], queryFn: () => produtosFn({ data: { dias } }) });
  if (!d) return <Carregando d={d} />;
  if (!d.lista.length) return <Vazio>Nenhuma peça foi vista no período.</Vazio>;
  const top = d.lista.slice(0, 15);
  const img = (p: string) => (p.startsWith("http") || p.startsWith("/") ? p : `/uploads/${p}`);
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{n(d.totalPecasVistas)} peças diferentes foram vistas no período.</p>
      <Painel titulo="As 15 mais vistas">
        <EChart
          height={420}
          option={{
            tooltip: { trigger: "axis", axisPointer: { type: "shadow" } },
            legend: { bottom: 0 },
            grid: { left: 230, right: 30, top: 8, bottom: 40 },
            xAxis: { type: "value" },
            yAxis: { type: "category", inverse: true, data: top.map((p) => curto(p.nome, 36)) },
            series: [
              { name: "Vistas", type: "bar", stack: "a", data: top.map((p) => p.vistas), color: VERDE },
              { name: "Carrinho", type: "bar", stack: "b", data: top.map((p) => p.carrinho), color: "#2563eb" },
              { name: "WhatsApp", type: "bar", stack: "b", data: top.map((p) => p.whatsapp), color: "#25D366" },
            ],
          }}
        />
      </Painel>
      <Painel titulo="Todas (top 50)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr><th className="py-2">Peça</th><th className="text-right">Vistas</th><th className="text-right">Visitantes</th><th className="text-right">Carrinho</th><th className="text-right">WhatsApp</th><th className="text-right">Conversão</th><th>Região que mais vê</th><th className="text-right">% /pt</th></tr>
            </thead>
            <tbody className="divide-y">
              {d.lista.map((p) => (
                <tr key={p.sku}>
                  <td className="py-2">
                    <a href={`/produto/${encodeURIComponent(p.sku)}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-primary">
                      {p.imagem ? <img src={img(p.imagem)} alt="" className="h-9 w-9 rounded border object-contain" /> : <span className="h-9 w-9 rounded border bg-muted" />}
                      <span className="max-w-[320px]"><span className="line-clamp-1 font-medium">{p.nome}</span><span className="text-xs text-muted-foreground">{p.sku}</span></span>
                    </a>
                  </td>
                  <td className="text-right tabular-nums">{n(p.vistas)}</td>
                  <td className="text-right tabular-nums">{n(p.visitantes)}</td>
                  <td className="text-right tabular-nums">{n(p.carrinho)}</td>
                  <td className="text-right tabular-nums">{n(p.whatsapp)}</td>
                  <td className={cn("text-right tabular-nums", p.conversao >= 0.1 && "font-semibold text-emerald-700")}>{pct(p.conversao)}</td>
                  <td className="text-xs">{p.regiao}</td>
                  <td className="text-right text-xs tabular-nums">{pct(p.brasil)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Painel>
    </div>
  );
}

// ---------------------------------------------------------------- 5. Peça × região
function PecaRegiao({ dias }: { dias: number }) {
  const [sku, setSku] = useState<string | undefined>();
  const { data: d } = useQuery({ queryKey: ["an-peca-regiao", dias, sku], queryFn: () => produtoRegiaoFn({ data: { dias, sku } }) });
  if (!d) return <Carregando d={d} />;
  if (d.modo === "peca") {
    return (
      <div className="space-y-4">
        <button onClick={() => setSku(undefined)} className="text-sm font-semibold text-primary hover:underline">← Voltar para todas as peças</button>
        <Painel titulo={`${d.nome} — ${n(d.total)} vistas`} acao={<a href={`/produto/${encodeURIComponent(d.sku)}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-primary">Abrir peça <ExternalLink className="h-3 w-3" /></a>}>
          <div className="grid gap-4 lg:grid-cols-2">
            <EChart
              mapa
              height={420}
              option={{
                tooltip: { formatter: (p: any) => (p.data ? `${p.data.name}: <b>${p.data.value[2]}</b>` : "") },
                geo: { map: "world", roam: true, center: [-55.5, -31.5], zoom: 9, itemStyle: { areaColor: "#f4f7f2", borderColor: "#a3b8a8" }, emphasis: { disabled: true } },
                series: [{ type: "effectScatter", coordinateSystem: "geo", data: d.cidades.filter((c) => c.lat != null).map((c) => ({ name: c.cidade, value: [c.lon, c.lat, c.visitas] })), symbolSize: (v: number[]) => Math.max(8, Math.min(40, v[2] * 6)), itemStyle: { color: "#f59e0b" } }],
              }}
            />
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">Cidade</th><th>Região</th><th>País</th><th className="text-right">Vistas</th></tr></thead>
              <tbody className="divide-y">
                {d.cidades.map((c, i) => <tr key={i}><td className="py-1.5 font-medium">{c.cidade}</td><td>{c.regiao}</td><td>{c.pais}</td><td className="text-right tabular-nums">{c.visitas}</td></tr>)}
              </tbody>
            </table>
          </div>
        </Painel>
      </div>
    );
  }
  if (!d.skus.length) return <Vazio>Nenhuma peça foi vista no período.</Vazio>;
  const pontos = d.matriz.flatMap((linha, i) => linha.map((v, j) => [j, i, v]));
  const max = Math.max(1, ...d.matriz.flat());
  return (
    <div className="space-y-4">
      <Painel titulo="As 12 peças mais vistas × as 10 regiões que mais acessam — clique numa barra para ver as cidades daquela peça">
        <EChart
          gl
          height={560}
          aoClicar={(p) => p?.value && setSku(d.skus[p.value[1]]?.sku)}
          option={{
            tooltip: { formatter: (p: any) => `${d.skus[p.value[1]]?.nome}<br/>${d.regioes[p.value[0]]}: <b>${p.value[2]}</b> vistas` },
            visualMap: { max, inRange: { color: ["#e0f2e9", "#22a35a", "#0b7a3b", "#f59e0b", "#dc2626"] }, left: 0, bottom: 10, calculable: true },
            xAxis3D: { type: "category", data: d.regioes.map((r) => curto(r, 14)), name: "" },
            yAxis3D: { type: "category", data: d.skus.map((s) => curto(s.nome, 18)), name: "" },
            zAxis3D: { type: "value", name: "Vistas" },
            grid3D: { boxWidth: 170, boxDepth: 150, viewControl: { alpha: 30, beta: 35, distance: 280 }, axisLabel: { textStyle: { fontSize: 10 } }, light: { main: { intensity: 1.2, shadow: true }, ambient: { intensity: 0.3 } } },
            series: [{ type: "bar3D", data: pontos, shading: "lambert", bevelSize: 0.2, emphasis: { label: { show: true } } }],
          }}
        />
      </Painel>
      <Painel titulo="Tabela">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr><th className="py-2 text-left">Peça</th>{d.regioes.map((r) => <th key={r} className="px-1 text-right">{curto(r, 12)}</th>)}</tr></thead>
            <tbody className="divide-y">
              {d.skus.map((s, i) => (
                <tr key={s.sku} className="cursor-pointer hover:bg-muted/50" onClick={() => setSku(s.sku)}>
                  <td className="py-1.5 font-medium">{curto(s.nome, 40)}</td>
                  {d.matriz[i].map((v, j) => <td key={j} className="px-1 text-right tabular-nums" style={{ background: v ? `rgba(11,122,59,${0.08 + (v / max) * 0.5})` : undefined }}>{v || ""}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Painel>
    </div>
  );
}

// ---------------------------------------------------------------- 6. Mapa de cliques
function Cliques({ dias }: { dias: number }) {
  const [pagina, setPagina] = useState<string | undefined>();
  const [modo, setModo] = useState<"2d" | "3d">("2d");
  const { data: d } = useQuery({ queryKey: ["an-cliques", dias, pagina], queryFn: () => cliquesFn({ data: { dias, pagina } }) });
  if (!d) return <Carregando d={d} />;
  if (!d.paginas.length)
    return <Vazio>Ainda não há cliques registrados. O mapa de cliques começou a ser gravado agora: volte em algumas horas, depois que o site receber visitas.</Vazio>;
  const max = Math.max(1, ...d.grade.map((g) => g[2]));
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">Página:</span>
        <select value={d.pagina} onChange={(e) => setPagina(e.target.value)} className="h-9 rounded-md border bg-background px-2 text-sm">
          {d.paginas.map((p) => <option key={p.pagina} value={p.pagina}>{nomePagina(p.pagina)} ({p.cliques} cliques)</option>)}
        </select>
        <span className="text-xs text-muted-foreground">{n(d.total)} cliques · {pct(d.total ? d.celular / d.total : 0)} no celular</span>
      </div>
      <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
        <Painel
          titulo="Onde clicam (a página inteira, de cima para baixo)"
          acao={
            <div className="flex rounded-md border p-0.5 text-xs">
              {(["2d", "3d"] as const).map((m) => <button key={m} onClick={() => setModo(m)} className={cn("rounded px-2 py-1 font-semibold", modo === m ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>{m.toUpperCase()}</button>)}
            </div>
          }
        >
          {modo === "2d" ? (
            <EChart
              key="2d"
              height={620}
              option={{
                tooltip: { formatter: (p: any) => `${p.value[2]} cliques<br/>${p.value[0] * 5}–${p.value[0] * 5 + 5}% da largura · ${p.value[1] * 2}–${p.value[1] * 2 + 2}% da altura` },
                grid: { left: 40, right: 10, top: 10, bottom: 50 },
                xAxis: { type: "category", data: Array.from({ length: 20 }, (_, i) => `${i * 5}%`), axisLabel: { interval: 3 } },
                yAxis: { type: "category", inverse: true, data: Array.from({ length: 50 }, (_, i) => `${i * 2}%`), axisLabel: { interval: 4 }, name: "topo ↓ fim" },
                visualMap: { max, orient: "horizontal", left: "center", bottom: 0, inRange: { color: ["rgba(255,255,255,0)", "#fde68a", "#f59e0b", "#dc2626"] } },
                series: [{ type: "heatmap", data: d.grade, emphasis: { itemStyle: { borderColor: "#000", borderWidth: 1 } } }],
              }}
            />
          ) : (
            <EChart
              key="3d"
              gl
              height={620}
              option={{
                tooltip: { formatter: (p: any) => `${p.value[2]} cliques` },
                visualMap: { max, inRange: { color: ["#fde68a", "#f59e0b", "#dc2626"] }, left: 0, bottom: 10 },
                xAxis3D: { type: "value", name: "Largura", min: 0, max: 19 },
                yAxis3D: { type: "value", name: "Altura", min: 0, max: 49, inverse: true },
                zAxis3D: { type: "value", name: "Cliques" },
                grid3D: { boxWidth: 80, boxDepth: 160, viewControl: { alpha: 40, beta: 15, distance: 240 } },
                series: [{ type: "bar3D", data: d.grade, barSize: 3, shading: "lambert" }],
              }}
            />
          )}
        </Painel>
        <Painel titulo="O que mais clicam nesta página">
          <table className="w-full text-sm">
            <tbody className="divide-y">
              {d.alvos.map((a) => (
                <tr key={a.alvo}>
                  <td className="py-1.5"><span className="mr-1 rounded bg-muted px-1 font-mono text-[10px]">{a.alvo.split(":")[0]}</span>{a.alvo.split(":").slice(1).join(":") || "(sem texto)"}</td>
                  <td className="text-right tabular-nums">{a.cliques}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-3 text-xs text-muted-foreground">Posição em % da largura da tela e da altura total da página. Para ver a gravação da tela, use o Microsoft Clarity (Integrações).</p>
        </Painel>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- 7. Rolagem
function Rolagem({ dias }: { dias: number }) {
  const { data: d } = useQuery({ queryKey: ["an-rolagem", dias], queryFn: () => rolagemFn({ data: { dias } }) });
  if (!d) return <Carregando d={d} />;
  if (!d.paginas.length) return <Vazio>Ainda não há dados de rolagem. Começou a ser gravado agora: volte depois que o site receber visitas.</Vazio>;
  const ps = d.paginas;
  return (
    <div className="space-y-4">
      <Painel titulo="Quantos chegam a cada parte da página">
        <EChart
          height={Math.max(260, ps.length * 34)}
          option={{
            tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, valueFormatter: (v: number) => `${v}%` },
            legend: { bottom: 0 },
            grid: { left: 170, right: 20, top: 8, bottom: 40 },
            xAxis: { type: "value", max: 100, axisLabel: { formatter: "{value}%" } },
            yAxis: { type: "category", inverse: true, data: ps.map((p) => curto(nomePagina(p.pagina), 26)) },
            series: [
              { name: "25%", type: "bar", data: ps.map((p) => Math.round(p.a25 * 100)), color: "#bbf7d0" },
              { name: "50%", type: "bar", data: ps.map((p) => Math.round(p.a50 * 100)), color: "#4ade80" },
              { name: "75%", type: "bar", data: ps.map((p) => Math.round(p.a75 * 100)), color: "#16a34a" },
              { name: "Fim", type: "bar", data: ps.map((p) => Math.round(p.a100 * 100)), color: "#0b7a3b" },
            ],
          }}
        />
      </Painel>
      <Painel titulo="Tabela">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">Página</th><th className="text-right">Visitas medidas</th><th className="text-right">Rolagem média</th><th className="text-right">Chegam ao fim</th></tr></thead>
          <tbody className="divide-y">
            {ps.map((p) => <tr key={p.pagina}><td className="py-1.5 font-medium">{nomePagina(p.pagina)}</td><td className="text-right tabular-nums">{n(p.visitas)}</td><td className="text-right tabular-nums">{Math.round(p.media)}%</td><td className="text-right tabular-nums">{pct(p.a100)}</td></tr>)}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted-foreground">Se pouca gente chega ao fim, o que está lá embaixo (ex.: formulário de cotação, catálogos) quase não é visto: vale subir.</p>
      </Painel>
    </div>
  );
}

// ---------------------------------------------------------------- 8. Funil
function Funil({ dias }: { dias: number }) {
  const { data: d } = useQuery({ queryKey: ["an-funil", dias], queryFn: () => funilFn({ data: { dias } }) });
  if (!d) return <Carregando d={d} />;
  if (!d.total[0]) return <Vazio>Sem visitas no período.</Vazio>;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[2fr_3fr]">
        <Painel titulo="Todas as sessões">
          <EChart
            height={380}
            option={{
              tooltip: { trigger: "item", formatter: (p: any) => `${p.name}: <b>${n(p.value)}</b> (${pct(p.value / d.total[0])})` },
              series: [
                {
                  type: "funnel",
                  sort: "none",
                  minSize: "38%",
                  left: 10,
                  right: 10,
                  label: { position: "inside", formatter: (p: any) => `${p.name}\n${n(p.value)} · ${pct(p.value / d.total[0])}`, fontSize: 12 },
                  data: d.etapas.map((e, i) => ({ name: e, value: d.total[i], itemStyle: { color: ["#0b7a3b", "#22a35a", "#2563eb", "#25D366", "#f59e0b"][i] } })),
                },
              ],
            }}
          />
        </Painel>
        <Painel titulo="Por canal de origem">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground">
                <tr><th className="py-2">Canal</th>{d.etapas.map((e) => <th key={e} className="px-1 text-right">{e.split(" ").slice(0, 2).join(" ")}</th>)}</tr>
              </thead>
              <tbody className="divide-y">
                {d.canais.map((c) => (
                  <tr key={c.canal}>
                    <td className="py-1.5 font-medium capitalize">{c.canal}</td>
                    {c.valores.map((v, i) => (
                      <td key={i} className="px-1 text-right tabular-nums">
                        {n(v)}
                        {i > 0 && c.valores[0] ? <span className="block text-[10px] text-muted-foreground">{pct(v / c.valores[0])}</span> : null}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Compare os canais: o que traz menos visitas pode trazer mais pedidos.</p>
        </Painel>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- 9. Canais, aparelhos e idioma
function Canais({ dias }: { dias: number }) {
  const { data: d } = useQuery({ queryKey: ["an-canais", dias], queryFn: () => canaisFn({ data: { dias } }) });
  if (!d) return <Carregando d={d} />;
  const pizza = (dados: Array<{ nome: string; visitas: number }>) => ({
    tooltip: { trigger: "item" },
    legend: { bottom: 0, type: "scroll" },
    series: [{ type: "pie", radius: ["38%", "68%"], center: ["50%", "45%"], data: dados.map((x) => ({ name: x.nome, value: x.visitas })), label: { formatter: "{d}%" } }],
  });
  const barras = (dados: Array<{ nome: string; visitas: number }>) => ({
    tooltip: {},
    grid: { left: 110, right: 30, top: 8, bottom: 20 },
    xAxis: { type: "value" },
    yAxis: { type: "category", inverse: true, data: dados.map((x) => curto(x.nome, 16)) },
    series: [{ type: "bar", data: dados.map((x) => x.visitas), color: VERDE, label: { show: true, position: "right" } }],
  });
  return (
    <div className="space-y-4">
      <Painel titulo="Visitas por canal, dia a dia">
        <EChart
          height={320}
          option={{
            tooltip: { trigger: "axis" },
            legend: { bottom: 0 },
            grid: { left: 40, right: 16, top: 16, bottom: 48 },
            xAxis: { type: "category", data: d.dias.map((x) => x.slice(5).split("-").reverse().join("/")) },
            yAxis: { type: "value" },
            series: d.series.map((s) => ({ name: s.nome, type: "line", stack: "t", areaStyle: {}, smooth: true, data: s.valores })),
          }}
        />
      </Painel>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Painel titulo="Aparelhos"><EChart height={280} option={pizza(d.aparelhos)} /></Painel>
        <Painel titulo="Idioma do site (espanhol × /pt)"><EChart height={280} option={pizza(d.idiomaSite)} /></Painel>
        <Painel titulo="Países"><EChart height={280} option={pizza(d.paises)} /></Painel>
        <Painel titulo="Navegadores"><EChart height={280} option={barras(d.navegadores)} /></Painel>
        <Painel titulo="Sistemas"><EChart height={280} option={barras(d.sistemas)} /></Painel>
      </div>
      <p className="text-xs text-muted-foreground">O idioma do site começou a ser gravado agora; visitas anteriores aparecem como Espanhol.</p>
    </div>
  );
}

// ---------------------------------------------------------------- 10. Tempo real
function TempoReal() {
  const { data: d, dataUpdatedAt } = useQuery({ queryKey: ["an-tempo-real"], queryFn: () => tempoRealFn(), refetchInterval: 15_000 });
  if (!d) return <Carregando d={d} />;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="border-primary/40 bg-primary/5 p-4">
          <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" /><span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-600" /></span>
            No site agora
          </p>
          <p className="mt-1 text-4xl font-bold tabular-nums">{d.ativos}</p>
          <p className="text-xs text-muted-foreground">últimos 5 minutos</p>
        </Card>
        <Kpi rotulo="Visitantes (30 min)" valor={n(d.visitantes30)} />
        <Kpi rotulo="Páginas vistas (30 min)" valor={n(d.porMinuto.reduce((a, b) => a + b, 0))} />
        <Kpi rotulo="Atualizado" valor={new Date(dataUpdatedAt).toLocaleTimeString("pt-BR")} sub="a cada 15 segundos" />
      </div>
      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <Painel titulo="Páginas vistas por minuto (últimos 30)">
          <EChart
            height={220}
            option={{
              tooltip: { trigger: "axis" },
              grid: { left: 30, right: 10, top: 10, bottom: 30 },
              xAxis: { type: "category", data: d.porMinuto.map((_, i) => (i === 29 ? "agora" : `-${29 - i}m`)), axisLabel: { interval: 4 } },
              yAxis: { type: "value", minInterval: 1 },
              series: [{ type: "bar", data: d.porMinuto, color: VERDE }],
            }}
          />
        </Painel>
        <Painel titulo="Páginas agora">
          <ul className="space-y-1 text-sm">
            {d.paginas.length ? d.paginas.map((p) => <li key={p.pagina} className="flex justify-between"><span>{nomePagina(p.pagina)}</span><b className="tabular-nums">{p.visitas}</b></li>) : <li className="text-muted-foreground">Ninguém nos últimos 30 minutos.</li>}
          </ul>
        </Painel>
      </div>
      <Painel titulo="Últimas páginas vistas">
        <div className="max-h-[420px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-card text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">Quando</th><th>Página</th><th>Cidade</th><th>Aparelho</th><th>Canal</th><th>Idioma</th><th>Visitante</th></tr></thead>
            <tbody className="divide-y">
              {d.ultimas.map((u, i) => (
                <tr key={i}>
                  <td className="whitespace-nowrap py-1.5 text-xs">{new Date(u.quando).toLocaleTimeString("pt-BR")}</td>
                  <td className="max-w-[320px] truncate">{u.pagina}</td>
                  <td className="text-xs">{u.cidade}</td>
                  <td className="text-xs">{u.aparelho}</td>
                  <td className="text-xs capitalize">{u.canal}</td>
                  <td className="text-xs">{u.idioma === "pt" ? "🇧🇷 PT" : "🇺🇾 ES"}</td>
                  <td className="font-mono text-xs text-muted-foreground">{u.visitante}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Painel>
    </div>
  );
}
