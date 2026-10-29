import { useEffect, useMemo, useState } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Megaphone,
  Target,
  Users,
  MessageCircle,
  Percent,
  BarChart3,
  Filter,
  Globe2,
  Mail,
  Clock,
  Package,
  Bell,
  Receipt,
  Flame,
  RefreshCw,
  Smartphone,
  Eye,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { EChart } from "@/components/admin/EChart";
import { dashboardFn } from "@/lib/dashboard";
import { getStats } from "@/lib/products";
import { cn } from "@/lib/utils";
import { FiltroPeriodo, fmtData } from "./FiltroPeriodo";
import { Bloco, COR, Kpi, ListaBarras, Mini, num, pctTxt, variacao } from "./pecas";

type Moeda = "BRL" | "UYU";
const NOMES_FONTE: Record<string, string> = {
  direto: "Direto",
  google: "Google",
  instagram: "Instagram",
  facebook: "Facebook",
  whatsapp: "WhatsApp",
  email: "E-mail",
  bing: "Bing",
};
const NOMES_CANAL: Record<string, string> = {
  WHATSAPP: "WhatsApp",
  SITE: "Site",
  LINK: "Link de pagamento",
  BALCAO: "Balcão",
  TELEFONE: "Telefone",
  MERCADOLIVRE: "Mercado Livre",
  OUTRO: "Outro",
};
const ETAPA: Record<string, string> = {
  AGUARDANDO: "Aguardando",
  PEDIDO_FEITO: "Pedido feito",
  CHEGOU: "Chegou",
  EMBALANDO: "Embalando",
  DESPACHADO: "Despachado",
  ENTREGUE: "Entregue",
};

type GraficoId = "vendas" | "trafego" | "leads" | "emails";

export function Dashboard({
  de,
  ate,
  atalho,
  aoMudar,
}: {
  de: string;
  ate: string;
  atalho: string | null;
  aoMudar: (de: string, ate: string, atalho: string | null) => void;
}) {
  const [moeda, setMoeda] = useState<Moeda>("BRL");
  const [grafico, setGrafico] = useState<GraficoId>("vendas");
  useEffect(() => {
    try {
      const m = localStorage.getItem("dash_moeda");
      if (m === "UYU" || m === "BRL") setMoeda(m);
    } catch {
      /* sem localStorage */
    }
  }, []);
  const trocarMoeda = (m: Moeda) => {
    setMoeda(m);
    try {
      localStorage.setItem("dash_moeda", m);
    } catch {
      /* sem localStorage */
    }
  };

  const { data, isLoading, isFetching, refetch, error } = useQuery({
    queryKey: ["dashboard", de, ate],
    queryFn: () => dashboardFn({ data: { de, ate } }),
    placeholderData: keepPreviousData,
    refetchInterval: 5 * 60_000,
  });
  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: getStats });

  // Valores vêm em R$; em $U usa a cotação do dia
  const cot = data?.cotacao ?? null;
  const conv = (v: number) => (moeda === "UYU" && cot ? v * cot : v);
  const din = (v: number, compacto = false) => {
    const x = conv(v);
    const pre = moeda === "UYU" && cot ? "$U " : "R$ ";
    if (compacto && Math.abs(x) >= 10_000)
      return pre + x.toLocaleString("pt-BR", { notation: "compact", maximumFractionDigits: 1 });
    return pre + num(x, Math.abs(x) < 100 ? 2 : 0);
  };

  const a = data?.atual;
  const t = a?.total;
  const p = data?.anterior.total;
  const serie = a?.serie ?? [];
  const sp = (k: keyof (typeof serie)[number], f: (v: number) => number = (v) => v) =>
    serie.map((s) => ({ dia: s.dia, v: f(Number(s[k])) }));

  const roas = t && t.ads ? t.receita / t.ads : null;
  const roasAntes = p && p.ads ? p.receita / p.ads : null;
  const conversao = t && t.sessoes ? (t.sessLead / t.sessoes) * 100 : null;
  const conversaoAntes = p && p.sessoes ? (p.sessLead / p.sessoes) * 100 : null;
  const vendaPorVisitante = t && t.unicos ? (t.vendas / t.unicos) * 100 : null;
  const ticket = t && t.vendas ? t.receita / t.vendas : 0;
  const ticketAntes = p && p.vendas ? p.receita / p.vendas : 0;
  const margem = t && t.receita ? (t.lucro / t.receita) * 100 : null;

  const opcaoGrafico = useMemo(() => {
    if (!serie.length) return null;
    const dias = serie.map((s) => fmtData(s.dia));
    const base = {
      animationDuration: 500,
      grid: { left: 8, right: 12, top: 40, bottom: serie.length > 45 ? 48 : 8, containLabel: true },
      legend: {
        top: 0,
        left: 0,
        icon: "roundRect",
        itemWidth: 10,
        itemHeight: 10,
        textStyle: { fontSize: 12 },
      },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow", shadowStyle: { color: "rgba(0,0,0,0.04)" } },
        backgroundColor: "#fff",
        borderColor: "#e4e4e7",
        textStyle: { color: "#18181b", fontSize: 12 },
      },
      xAxis: {
        type: "category",
        data: dias,
        axisLine: { lineStyle: { color: "#e4e4e7" } },
        axisTick: { show: false },
        axisLabel: { color: "#71717a", fontSize: 11, hideOverlap: true },
      },
      dataZoom:
        serie.length > 45 ? [{ type: "slider", height: 18, bottom: 8 }, { type: "inside" }] : [],
    };
    const eixoY = (fmt: (v: number) => string) => ({
      type: "value",
      splitLine: { lineStyle: { color: "#f1f1f3" } },
      axisLabel: { color: "#71717a", fontSize: 11, formatter: fmt },
    });
    const linha = (name: string, data: number[], cor: string) => ({
      name,
      type: "line",
      data,
      smooth: true,
      symbol: "circle",
      symbolSize: 6,
      showSymbol: serie.length <= 31,
      lineStyle: { width: 2, color: cor },
      itemStyle: { color: cor, borderColor: "#fff", borderWidth: 2 },
    });
    const barra = (name: string, data: number[], cor: string, stack?: string) => ({
      name,
      type: "bar",
      data,
      stack,
      barMaxWidth: 22,
      itemStyle: { color: cor, borderRadius: stack ? 0 : [4, 4, 0, 0] },
    });
    const vf = (v: number) => din(v, true);
    if (grafico === "vendas")
      return {
        ...base,
        tooltip: { ...base.tooltip, valueFormatter: (v: number) => din(v) },
        yAxis: eixoY(vf),
        series: [
          barra(
            "Faturamento",
            serie.map((s) => conv(s.receita)),
            COR.azul,
          ),
          barra(
            "Lucro bruto",
            serie.map((s) => conv(s.lucro)),
            COR.agua,
          ),
          linha(
            "Gasto em anúncios",
            serie.map((s) => conv(s.ads)),
            COR.laranja,
          ),
        ],
      };
    if (grafico === "trafego")
      return {
        ...base,
        tooltip: {
          ...base.tooltip,
          axisPointer: { type: "line" },
          valueFormatter: (v: number) => num(v),
        },
        yAxis: eixoY((v) => num(v)),
        series: [
          linha(
            "Páginas vistas",
            serie.map((s) => s.visitas),
            COR.azul,
          ),
          linha(
            "Sessões",
            serie.map((s) => s.sessoes),
            COR.laranja,
          ),
          linha(
            "Visitantes",
            serie.map((s) => s.visitantes),
            COR.agua,
          ),
        ],
      };
    if (grafico === "leads")
      return {
        ...base,
        tooltip: { ...base.tooltip, valueFormatter: (v: number) => num(v) },
        yAxis: eixoY((v) => num(v)),
        series: [
          barra(
            "WhatsApp (pedidos)",
            serie.map((s) => s.whatsapp),
            COR.azul,
            "l",
          ),
          barra(
            "Contatos pop-up",
            serie.map((s) => s.contatos),
            COR.laranja,
            "l",
          ),
          barra(
            "Cotações",
            serie.map((s) => s.cotacoes),
            COR.agua,
            "l",
          ),
          barra(
            "Cadastros",
            serie.map((s) => s.cadastros),
            COR.amarelo,
            "l",
          ),
        ],
      };
    return {
      ...base,
      tooltip: { ...base.tooltip, valueFormatter: (v: number) => num(v) },
      yAxis: eixoY((v) => num(v)),
      series: [
        barra(
          "Enviados",
          serie.map((s) => s.emails),
          COR.azul,
        ),
        linha(
          "Abertos",
          serie.map((s) => s.abertos),
          COR.laranja,
        ),
        linha(
          "Clicados",
          serie.map((s) => s.cliques),
          COR.agua,
        ),
      ],
    };
  }, [serie, grafico, moeda, cot]); // eslint-disable-line react-hooks/exhaustive-deps

  const det = a?.detalhe;
  const pend = data?.pendencias;
  const ads = a?.ads;

  return (
    <div className="space-y-5">
      {/* Cabeçalho e filtros */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Painel</h1>
          <p className="text-sm text-muted-foreground">
            {fmtData(de, true)}
            {de !== ate && ` a ${fmtData(ate, true)}`} · comparado com{" "}
            {data
              ? `${fmtData(data.antes.de)} a ${fmtData(data.antes.ate, true)}`
              : "o período anterior"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FiltroPeriodo de={de} ate={ate} atalho={atalho} aoMudar={aoMudar} />
          <div className="flex rounded-xl border bg-background p-1 text-xs font-bold shadow-sm">
            {(["BRL", "UYU"] as const).map((m) => (
              <button
                key={m}
                onClick={() => trocarMoeda(m)}
                disabled={m === "UYU" && !cot}
                className={cn(
                  "rounded-lg px-2.5 py-1.5",
                  moeda === m
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
                title={m === "UYU" && cot ? `R$ 1 = $U ${num(cot, 2)}` : undefined}
              >
                {m === "BRL" ? "R$" : "$U"}
              </button>
            ))}
          </div>
          <button
            onClick={() => refetch()}
            className="flex h-9 w-9 items-center justify-center rounded-xl border bg-background shadow-sm hover:bg-muted"
            aria-label="Atualizar"
            title="Atualizar"
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50 p-4 text-sm text-red-800">
          Não foi possível carregar o painel: {(error as Error).message}
        </Card>
      )}

      {/* Pendências: o que espera a equipe agora */}
      {pend && (
        <div className="flex flex-wrap gap-2 text-xs">
          {(
            [
              [pend.cotacoes, "cotações novas", "/admin/cotacoes", Receipt],
              [pend.contatos, "contatos de WhatsApp novos", "/admin/popup", MessageCircle],
              [pend.avisos, "avisos de preço para enviar", "/admin/captura#avisos", Bell],
              [pend.aguardando, "pedidos aguardando", "/admin/vendas", ShoppingBag],
              [pend.embalar, "pedidos para embalar", "/admin/vendas", Package],
            ] as const
          ).map(([n, rotulo, to, I]) => (
            <Link
              key={rotulo}
              to={to.split("#")[0] as any}
              search={(to.includes("#") ? { aba: "avisos" } : undefined) as any}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-semibold transition hover:shadow-sm",
                n > 0
                  ? "border-amber-300 bg-amber-50 text-amber-900"
                  : "bg-background text-muted-foreground",
              )}
            >
              <I className="h-3.5 w-3.5" />
              <b className="tabular-nums">{n}</b> {rotulo}
            </Link>
          ))}
        </div>
      )}

      {/* KPIs */}
      <div
        className={cn(
          "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4",
          isFetching && data && "opacity-70 transition-opacity",
        )}
      >
        {isLoading || !t || !p ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="h-[150px] animate-pulse bg-muted/40" />
          ))
        ) : (
          <>
            <Kpi
              rotulo="Faturamento"
              valor={din(t.receita)}
              sub={`${num(t.vendas)} ${t.vendas === 1 ? "venda" : "vendas"} · ticket ${din(ticket)}`}
              v={variacao(t.receita, p.receita)}
              icone={DollarSign}
              cor={COR.azul}
              spark={sp("receita", conv)}
              fmt={(v) => din(v)}
            />
            <Kpi
              rotulo="Lucro bruto"
              valor={din(t.lucro)}
              sub={`margem ${pctTxt(margem)} · após anúncios ${din(t.lucro - t.ads)}`}
              v={variacao(t.lucro, p.lucro)}
              icone={TrendingUp}
              cor={COR.agua}
              spark={sp("lucro", conv)}
              fmt={(v) => din(v)}
            />
            <Kpi
              rotulo="Vendas"
              valor={num(t.vendas)}
              sub={`ticket médio ${din(ticket)} (antes ${din(ticketAntes)})`}
              v={variacao(t.vendas, p.vendas)}
              icone={ShoppingBag}
              cor={COR.violeta}
              spark={sp("vendas")}
              fmt={(v) => num(v)}
              barras
            />
            <Kpi
              rotulo="Gasto em anúncios"
              valor={din(t.ads)}
              sub={`Google ${din(t.adsGoogle)} · Meta ${din(t.adsMeta)}`}
              v={variacao(t.ads, p.ads)}
              inverter
              icone={Megaphone}
              cor={COR.laranja}
              spark={sp("ads", conv)}
              fmt={(v) => din(v)}
            />
            <Kpi
              rotulo="ROAS"
              valor={roas == null ? "—" : `${num(roas, 2)}×`}
              sub={
                roas == null
                  ? "sem gasto em anúncios no período"
                  : `cada R$ 1 em anúncio virou R$ ${num(roas, 2)} em vendas`
              }
              v={roas != null && roasAntes != null ? variacao(roas, roasAntes) : null}
              icone={Target}
              cor={COR.verdeMarca}
              spark={serie.map((s) => ({ dia: s.dia, v: s.ads ? s.receita / s.ads : 0 }))}
              fmt={(v) => `${num(v, 2)}×`}
            />
            <Kpi
              rotulo="Visitantes"
              valor={num(t.unicos)}
              sub={`${num(t.sessoes)} sessões · ${num(t.visitas)} páginas`}
              v={variacao(t.unicos, p.unicos)}
              icone={Users}
              cor={COR.azul}
              spark={sp("visitantes")}
              fmt={(v) => num(v)}
            />
            <Kpi
              rotulo="Pedidos no WhatsApp"
              valor={num(t.whatsapp)}
              sub={`+ ${num(t.contatos)} contatos pop-up · ${num(t.cotacoes)} cotações`}
              v={variacao(t.whatsapp, p.whatsapp)}
              icone={MessageCircle}
              cor="#25a35a"
              spark={sp("whatsapp")}
              fmt={(v) => num(v)}
              barras
            />
            <Kpi
              rotulo="Taxa de conversão"
              valor={pctTxt(conversao)}
              sub={`sessões que pediram · vendas/visitantes ${pctTxt(vendaPorVisitante, 2)}`}
              v={
                conversao != null && conversaoAntes != null
                  ? variacao(conversao, conversaoAntes)
                  : null
              }
              icone={Percent}
              cor={COR.violeta}
              spark={serie.map((s) => ({
                dia: s.dia,
                v: s.sessoes ? (s.whatsapp / s.sessoes) * 100 : 0,
              }))}
              fmt={(v) => pctTxt(v)}
            />
          </>
        )}
      </div>

      {/* Gráfico principal */}
      <Card className="p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="mr-auto text-sm font-bold">Evolução por dia</h3>
          <div className="flex flex-wrap rounded-lg bg-muted p-0.5 text-xs font-semibold">
            {(
              [
                ["vendas", "Vendas × anúncios"],
                ["trafego", "Tráfego"],
                ["leads", "Leads"],
                ["emails", "E-mails"],
              ] as const
            ).map(([id, rotulo]) => (
              <button
                key={id}
                onClick={() => setGrafico(id)}
                className={cn(
                  "rounded-md px-2.5 py-1",
                  grafico === id
                    ? "bg-background shadow"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {rotulo}
              </button>
            ))}
          </div>
        </div>
        {opcaoGrafico ? (
          <EChart option={opcaoGrafico} height={320} />
        ) : (
          <div className="h-[320px] animate-pulse rounded-lg bg-muted/40" />
        )}
      </Card>

      {a && t && det && ads && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {/* Funil */}
          <Bloco titulo="Funil de conversão" icone={Filter} link="/admin/analises">
            {(() => {
              const passos = [
                ["Sessões", det.funil[0]],
                ["Viram uma peça", det.funil[1]],
                ["Carrinho", det.funil[2]],
                ["Pediram no WhatsApp", det.funil[3]],
                ["Vendas", t.vendas],
              ] as const;
              const topoN = Math.max(passos[0][1], 1);
              return (
                <div className="space-y-1.5">
                  {passos.map(([rotulo, n], i) => (
                    <div key={rotulo}>
                      <div className="flex justify-between text-xs">
                        <span>{rotulo}</span>
                        <span className="tabular-nums">
                          <b>{num(n)}</b>
                          {i > 0 && (
                            <span className="ml-1 text-muted-foreground">
                              {pctTxt(passos[i - 1][1] ? (n / passos[i - 1][1]) * 100 : null, 0)}
                            </span>
                          )}
                        </span>
                      </div>
                      <div className="mt-0.5 h-5 overflow-hidden rounded bg-muted">
                        <div
                          className="h-full rounded transition-all"
                          style={{
                            width: `${Math.max(1.5, (n / topoN) * 100)}%`,
                            background: [COR.azul, "#4a8fe0", "#6aa6ea", "#25a35a", COR.agua][i],
                          }}
                        />
                      </div>
                    </div>
                  ))}
                  <p className="pt-1 text-[11px] text-muted-foreground">
                    % em relação ao passo anterior. Rejeição:{" "}
                    {pctTxt(t.sessoes ? (t.rejeitadas / t.sessoes) * 100 : null, 0)} das sessões
                    saíram sem fazer nada.
                  </p>
                </div>
              );
            })()}
          </Bloco>

          {/* Anúncios */}
          <Bloco titulo="Anúncios" icone={Megaphone} link="/admin/ads">
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-xs">
                <thead className="bg-muted/60 text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium" />
                    <th className="px-2 py-1.5 text-right font-medium">Gasto</th>
                    <th className="px-2 py-1.5 text-right font-medium">Cliques</th>
                    <th className="px-2 py-1.5 text-right font-medium">CPC</th>
                    <th className="px-2 py-1.5 text-right font-medium">CTR</th>
                    <th className="px-2 py-1.5 text-right font-medium">Leads</th>
                  </tr>
                </thead>
                <tbody className="divide-y tabular-nums">
                  {(
                    [
                      ["Google", ads.GOOGLE, COR.azul],
                      ["Meta", ads.META, COR.laranja],
                    ] as const
                  ).map(([nome, x, cor]) => (
                    <tr key={nome}>
                      <td className="px-2 py-1.5 font-semibold">
                        <span
                          className="mr-1.5 inline-block h-2 w-2 rounded-full"
                          style={{ background: cor }}
                        />
                        {nome}
                      </td>
                      <td className="px-2 py-1.5 text-right">{din(x.gasto)}</td>
                      <td className="px-2 py-1.5 text-right">{num(x.cliques)}</td>
                      <td className="px-2 py-1.5 text-right">
                        {x.cliques ? din(x.gasto / x.cliques) : "—"}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {pctTxt(x.impressoes ? (x.cliques / x.impressoes) * 100 : null, 2)}
                      </td>
                      <td className="px-2 py-1.5 text-right">{num(x.leads)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <EChart
              height={110}
              option={{
                grid: { left: 0, right: 0, top: 8, bottom: 0 },
                tooltip: { trigger: "axis", valueFormatter: (v: number) => din(v) },
                xAxis: { type: "category", show: false, data: a.serie.map((s) => fmtData(s.dia)) },
                yAxis: { type: "value", show: false },
                series: [
                  {
                    name: "Google",
                    type: "bar",
                    stack: "a",
                    data: a.serie.map((s) => conv(s.adsGoogle)),
                    itemStyle: { color: COR.azul },
                  },
                  {
                    name: "Meta",
                    type: "bar",
                    stack: "a",
                    data: a.serie.map((s) => conv(s.adsMeta)),
                    itemStyle: { color: COR.laranja, borderRadius: [3, 3, 0, 0] },
                  },
                ],
              }}
            />
            <p className="mt-1 text-[11px] text-muted-foreground">
              Custo por pedido no WhatsApp: <b>{t.whatsapp ? din(t.ads / t.whatsapp) : "—"}</b> ·
              por venda: <b>{t.vendas ? din(t.ads / t.vendas) : "—"}</b>
              {a.semCambio && " · falta a cotação de uma moeda: parte do gasto não foi somada"}
            </p>
          </Bloco>

          {/* Tráfego */}
          <Bloco titulo="De onde vêm as visitas" icone={Globe2} link="/admin/visitantes">
            <ListaBarras
              itens={det.fontes.map((f) => ({
                nome: NOMES_FONTE[f.nome] ?? f.nome,
                valor: f.valor,
              }))}
              fmt={(v) => `${num(v)} pág.`}
            />
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Mini
                rotulo="Celular"
                valor={pctTxt(t.sessoes ? (t.sessMobile / t.sessoes) * 100 : null, 0)}
                sub="das sessões"
              />
              <Mini
                rotulo="Em português"
                valor={pctTxt(
                  (() => {
                    const tot = det.idiomas.reduce((s, x) => s + x.valor, 0);
                    const pt = det.idiomas.find((x) => x.nome === "pt")?.valor ?? 0;
                    return tot ? (pt / tot) * 100 : null;
                  })(),
                  0,
                )}
                sub="páginas /pt"
              />
              <Mini
                rotulo="Páginas/sessão"
                valor={t.sessoes ? num(t.visitas / t.sessoes, 1) : "—"}
              />
            </div>
          </Bloco>

          {/* Vendas */}
          <Bloco
            titulo="Vendas por canal"
            icone={ShoppingBag}
            link="/admin/financeiro"
            linkTexto="Financeiro"
          >
            <ListaBarras
              itens={det.canais.map((c) => ({
                nome: NOMES_CANAL[c.nome] ?? c.nome,
                valor: c.valor,
              }))}
              cor={COR.violeta}
              fmt={(v) => din(v)}
              vazio="Nenhuma venda no período"
            />
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(["UY", "BR"] as const).map((pais) => {
                const x = det.porPais.find((y) => y.pais === pais);
                return (
                  <Mini
                    key={pais}
                    rotulo={pais === "UY" ? "Uruguai" : "Brasil"}
                    valor={din(x?.receita ?? 0)}
                    sub={`${num(x?.vendas ?? 0)} vendas`}
                  />
                );
              })}
            </div>
            {a.semCusto > 0 && (
              <p className="mt-2 text-[11px] text-amber-700">
                {a.semCusto} {a.semCusto === 1 ? "item sem" : "itens sem"} preço de compra: o lucro
                desses está alto demais.
              </p>
            )}
          </Bloco>

          {/* E-mails */}
          <Bloco titulo="E-mails" icone={Mail} link="/admin/emails/analise">
            <div className="grid grid-cols-3 gap-2">
              <Mini rotulo="Enviados" valor={num(t.emails)} />
              <Mini
                rotulo="Abertura"
                valor={pctTxt(t.emails ? (t.abertos / t.emails) * 100 : null, 0)}
                sub={`${num(t.abertos)} abertos`}
              />
              <Mini
                rotulo="Cliques"
                valor={pctTxt(t.emails ? (t.cliques / t.emails) * 100 : null, 1)}
                sub={`${num(t.cliques)} clicaram`}
              />
            </div>
            <EChart
              height={120}
              option={{
                grid: { left: 0, right: 0, top: 12, bottom: 0 },
                tooltip: { trigger: "axis" },
                xAxis: { type: "category", show: false, data: a.serie.map((s) => fmtData(s.dia)) },
                yAxis: { type: "value", show: false },
                series: [
                  {
                    name: "Enviados",
                    type: "bar",
                    data: a.serie.map((s) => s.emails),
                    itemStyle: { color: "#c9dcf5", borderRadius: [3, 3, 0, 0] },
                  },
                  {
                    name: "Abertos",
                    type: "line",
                    smooth: true,
                    showSymbol: false,
                    data: a.serie.map((s) => s.abertos),
                    lineStyle: { color: COR.azul, width: 2 },
                    itemStyle: { color: COR.azul },
                  },
                ],
              }}
            />
          </Bloco>

          {/* Horário */}
          <Bloco titulo="Horário das visitas (Uruguai)" icone={Clock}>
            <EChart
              height={150}
              option={{
                grid: { left: 0, right: 0, top: 8, bottom: 18 },
                tooltip: {
                  trigger: "axis",
                  formatter: (x: any) => `${x[0].name}h · <b>${num(x[0].value)}</b> páginas`,
                },
                xAxis: {
                  type: "category",
                  data: det.horas.map((_, i) => String(i)),
                  axisTick: { show: false },
                  axisLine: { show: false },
                  axisLabel: { fontSize: 10, color: "#71717a", interval: 2 },
                },
                yAxis: { type: "value", show: false },
                series: [
                  {
                    type: "bar",
                    data: det.horas.map((v) => ({
                      value: v,
                      itemStyle: {
                        color: v === Math.max(...det.horas) && v > 0 ? COR.laranja : COR.azul,
                        borderRadius: [3, 3, 0, 0],
                      },
                    })),
                  },
                ],
              }}
            />
            <p className="text-[11px] text-muted-foreground">
              Pico às <b>{det.horas.indexOf(Math.max(...det.horas))}h</b>: bom horário para anúncios
              e respostas rápidas no WhatsApp.
            </p>
          </Bloco>

          {/* Peças */}
          <Bloco titulo="Peças mais vendidas" icone={TrendingUp}>
            <ListaBarras
              itens={det.vendidas.map((x) => ({
                nome: x.nome,
                valor: x.receita,
                extra: `· ${num(x.qtd)} un.`,
              }))}
              cor={COR.agua}
              fmt={(v) => din(v)}
              vazio="Nenhuma venda no período"
            />
          </Bloco>
          <Bloco titulo="Peças mais vistas" icone={Eye} link="/admin/interesse">
            <ListaBarras
              itens={det.vistas.map((x) => ({
                nome: x.nome,
                valor: x.vezes,
                href: `/produto/${encodeURIComponent(x.sku)}`,
              }))}
              cor={COR.azul}
              fmt={(v) => `${num(v)}×`}
            />
          </Bloco>

          {/* Últimas vendas */}
          <Bloco titulo="Últimas vendas" icone={Receipt} link="/admin/vendas">
            {det.ultimas.length ? (
              <ul className="divide-y text-xs">
                {det.ultimas.map((v) => (
                  <li key={v.codigo} className="flex items-center gap-2 py-1.5">
                    <span className="w-6 rounded bg-muted text-center text-[10px] font-bold">
                      {v.pais === "BR" ? "BR" : "UY"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{v.cliente}</span>
                      <span className="text-muted-foreground">
                        {new Date(v.quando).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        · {ETAPA[v.etapa] ?? v.etapa}
                      </span>
                    </span>
                    <b className="tabular-nums">
                      {v.moeda === "BRL" ? "R$" : "$U"} {num(v.total)}
                    </b>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Nenhuma venda no período
              </p>
            )}
          </Bloco>

          {/* Captação e catálogo */}
          <Bloco titulo="Captação" icone={Flame} link="/admin/captura">
            <div className="grid grid-cols-2 gap-2">
              <Mini
                rotulo="Contatos pelo pop-up"
                valor={num(t.contatos)}
                sub={`antes ${num(p!.contatos)}`}
              />
              <Mini
                rotulo="Cadastros"
                valor={num(t.cadastros)}
                sub={`antes ${num(p!.cadastros)}`}
              />
              <Mini
                rotulo="Cotações pelo site"
                valor={num(t.cotacoes)}
                sub={`antes ${num(p!.cotacoes)}`}
              />
              <Mini rotulo="Carrinhos" valor={num(t.carrinho)} sub={`antes ${num(p!.carrinho)}`} />
            </div>
          </Bloco>
          <Bloco titulo="Catálogo" icone={Package} link="/admin/produtos">
            <div className="grid grid-cols-3 gap-2">
              <Mini rotulo="Peças" valor={stats.data ? num(stats.data.pecas) : "…"} />
              <Mini
                rotulo="Com foto"
                valor={
                  stats.data
                    ? pctTxt((stats.data.comFoto / Math.max(1, stats.data.pecas)) * 100, 0)
                    : "…"
                }
                sub={stats.data ? num(stats.data.comFoto) : undefined}
              />
              <Mini rotulo="Categorias" valor={stats.data ? num(stats.data.categorias) : "…"} />
            </div>
            <p className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
              <Smartphone className="h-3 w-3" /> Atualizado sozinho a cada 5 minutos ·{" "}
              {data &&
                new Date(data.geradoEm).toLocaleTimeString("pt-BR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
            </p>
          </Bloco>
        </div>
      )}
    </div>
  );
}
