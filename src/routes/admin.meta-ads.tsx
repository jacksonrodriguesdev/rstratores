import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Eye,
  Facebook,
  Image as ImageIcon,
  Loader2,
  MapPin,
  MessageCircle,
  MousePointerClick,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Route as RouteIcon,
  Rocket,
  ShoppingBag,
  Target,
  Upload,
  Users,
  Wallet,
  Phone,
  Mail,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  alterarMetaFn,
  anunciosMetaFn,
  criarAnuncioMetaFn,
  estruturaMetaFn,
  listarLeadsFn,
  previaAnuncioFn,
  publicoMetaFn,
  salvarLeadFn,
  visaoMetaFn,
  type Lead,
} from "@/lib/meta-ads";
import { cn } from "@/lib/utils";
import { CampanhasProntas } from "@/components/admin/meta/CampanhasProntas";
import { AnunciosProntos } from "@/components/admin/meta/AnunciosProntos";
import { CatalogoMeta } from "@/components/admin/meta/CatalogoMeta";
import { DEPTOS as DEPTOS_UY } from "@/lib/locais-anuncio";

type BuscaMeta = { aba?: string; local?: string };
export const Route = createFileRoute("/admin/meta-ads")({
  validateSearch: (s: Record<string, unknown>): BuscaMeta => ({
    aba: typeof s.aba === "string" ? s.aba : undefined,
    local: typeof s.local === "string" ? s.local.slice(0, 60) : undefined,
  }),
  component: MetaAds,
});

// Cores (categóricas 1–3 da paleta validada; a 3ª tem contraste baixo, por isso há números e tabela)
const AZUL = "#2a78d6";
const LARANJA = "#eb6834";
const VERDE = "#1baf7a";
const ABAS = [
  ["geral", "Visão geral", BarChart3],
  ["campanhas", "Campanhas", Target],
  ["anuncios", "Anúncios", ImageIcon],
  ["publico", "Público e cidades", MapPin],
  ["leads", "Leads", Users],
  ["catalogo", "Catálogo", ShoppingBag],
  ["criar", "Criar anúncio", Rocket],
  ["conta", "Conta e saldo", Wallet],
] as const;
type Aba = (typeof ABAS)[number][0];

const n = (v: number | null | undefined, d = 0) =>
  v == null
    ? "—"
    : v.toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: d });
const pct = (v: number | null | undefined) => (v == null ? "—" : `${n(v, 2)}%`);
const div = (a: number, b: number) => (b > 0 ? a / b : null);

function MetaAds() {
  // ?aba=criar&local=Rocha (vindo do Criador de anúncios) abre direto nos anúncios do local
  const busca = Route.useSearch();
  const [aba, setAba] = useState<Aba>(
    ABAS.some((x) => x[0] === busca.aba) ? (busca.aba as Aba) : "geral",
  );
  const [dias, setDias] = useState(30);
  const {
    data: v,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["meta-visao", dias],
    queryFn: () => visaoMetaFn({ data: { dias } }),
  });
  const moeda = v?.configurado && v.conta.ok ? v.conta.v.moeda : "USD";
  const din = (x: number | null | undefined) =>
    x == null
      ? "—"
      : x.toLocaleString("pt-BR", {
          style: "currency",
          currency: moeda,
          maximumFractionDigits: x < 100 ? 2 : 0,
        });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Facebook className="h-6 w-6 text-blue-600" /> Meta Ads
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Anúncios do Facebook e Instagram: resultados, retorno no site, campanhas, leads e
            criação de anúncios.
            {v?.configurado && v.conta.ok && (
              <>
                {" "}
                Conta: <b>{v.conta.v.nome}</b> ({moeda}).
              </>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 14, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDias(d)}
              className={cn(
                "rounded-full border px-3 py-1 text-sm font-semibold",
                dias === d ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {d} dias
            </button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Atualizar"
          >
            <RefreshCw className={cn("h-4 w-4", isFetching && "animate-spin")} />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando os números da Meta…</p>
      ) : !v?.configurado ? (
        <Card className="flex gap-3 border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Conecte a conta de anúncios</p>
            <p>
              Em{" "}
              <Link to="/admin/instagram" className="font-semibold underline">
                Instagram e Facebook
              </Link>
              , clique em «Conectar Facebook» e escolha a conta de anúncios.
            </p>
          </div>
        </Card>
      ) : (
        <>
          <div className="flex flex-wrap gap-1 rounded-xl border bg-muted/40 p-1">
            {ABAS.map(([k, r, I]) => (
              <button
                key={k}
                onClick={() => setAba(k)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold",
                  aba === k
                    ? "bg-background text-primary shadow"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <I className="h-4 w-4" /> {r}
              </button>
            ))}
          </div>
          {aba === "geral" && <Geral v={v} din={din} />}
          {aba === "campanhas" && <Campanhas dias={dias} din={din} />}
          {aba === "anuncios" && <Anuncios dias={dias} din={din} />}
          {aba === "publico" && <Publico dias={dias} din={din} />}
          {aba === "leads" && <Leads />}
          {aba === "catalogo" && <CatalogoMeta dias={dias} />}
          {aba === "criar" && (
            <Criar moeda={moeda} aoCriar={() => setAba("campanhas")} localInicial={busca.local} />
          )}
          {aba === "conta" && <Conta v={v} din={din} />}
        </>
      )}
    </div>
  );
}

const Erro = ({ msg }: { msg: string }) => (
  <Card className="flex gap-2 border-red-200 bg-red-50 p-4 text-sm text-red-800">
    <AlertTriangle className="h-4 w-4 shrink-0" /> {msg}
  </Card>
);
function Kpi({
  icone: I,
  rotulo,
  valor,
  sub,
  destaque,
}: {
  icone: any;
  rotulo: string;
  valor: string;
  sub?: string;
  destaque?: boolean;
}) {
  return (
    <Card className={cn("p-3", destaque && "border-primary/40 bg-primary/5")}>
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
        <I className="h-3.5 w-3.5" /> {rotulo}
      </p>
      <p className="mt-1 text-xl font-bold">{valor}</p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </Card>
  );
}

// ---------------------------------------------------------------- visão geral
const METRICAS: Array<[string, string, "din" | "n" | "pct"]> = [
  ["gasto", "Gasto", "din"],
  ["impressoes", "Impressões", "n"],
  ["alcance", "Alcance", "n"],
  ["cliquesLink", "Cliques no link", "n"],
  ["visitasPagina", "Visitas à página", "n"],
  ["leads", "Leads", "n"],
  ["conversas", "Conversas", "n"],
  ["ctr", "CTR", "pct"],
  ["cpc", "Custo por clique", "din"],
];
function Geral({ v, din }: { v: any; din: (x: number | null) => string }) {
  const [met, setMet] = useState("gasto");
  if (!v.geral.ok) return <Erro msg={v.geral.erro} />;
  const t = v.geral.v.total;
  const r = v.retorno.ok ? v.retorno.v : null;
  const def = METRICAS.find((m) => m[0] === met)!;
  const fmt = (x: number) => (def[2] === "din" ? din(x) : def[2] === "pct" ? pct(x) : n(x));
  const resultados = t.leads + t.conversas;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Kpi icone={Wallet} rotulo="Gasto" valor={din(t.gasto)} destaque />
        <Kpi
          icone={Eye}
          rotulo="Alcance"
          valor={n(t.alcance)}
          sub={`${n(t.impressoes)} impressões · freq. ${n(t.frequencia, 1)}`}
        />
        <Kpi
          icone={MousePointerClick}
          rotulo="Cliques no link"
          valor={n(t.cliquesLink)}
          sub={`CTR ${pct(t.ctr)}`}
        />
        <Kpi
          icone={MousePointerClick}
          rotulo="Custo por clique"
          valor={din(div(t.gasto, t.cliquesLink))}
          sub={`CPM ${din(t.cpm)}`}
        />
        <Kpi
          icone={Eye}
          rotulo="Visitas à página"
          valor={n(t.visitasPagina)}
          sub="contadas pela Meta"
        />
        <Kpi
          icone={Users}
          rotulo="Leads + conversas"
          valor={n(resultados)}
          sub={`${n(t.leads)} leads · ${n(t.conversas)} conversas`}
        />
        <Kpi
          icone={Target}
          rotulo="Custo por resultado"
          valor={din(div(t.gasto, resultados))}
          destaque
        />
        <Kpi
          icone={ShoppingBag}
          rotulo="Compras (pixel)"
          valor={n(t.compras)}
          sub={t.valorCompras ? din(t.valorCompras) : undefined}
        />
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <h2 className="mr-2 font-semibold">Por dia</h2>
          {METRICAS.map(([k, rot]) => (
            <button
              key={k}
              onClick={() => setMet(k)}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                met === k ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {rot}
            </button>
          ))}
        </div>
        <div className="mt-3 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={v.geral.v.serie} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="dia"
                tickFormatter={(d) => `${d.slice(8, 10)}/${d.slice(5, 7)}`}
                fontSize={11}
                tickLine={false}
                axisLine={false}
                minTickGap={16}
              />
              <YAxis
                fontSize={11}
                tickLine={false}
                axisLine={false}
                width={64}
                tickFormatter={(x) => (def[2] === "din" ? n(x) : fmt(x))}
              />
              <Tooltip
                labelFormatter={(d) => String(d).split("-").reverse().join("/")}
                formatter={(x: number) => [fmt(x), def[1]]}
                contentStyle={{ borderRadius: 10, fontSize: 12 }}
              />
              <Area
                isAnimationActive={false}
                type="monotone"
                dataKey={met}
                stroke={AZUL}
                strokeWidth={2}
                fill={AZUL}
                fillOpacity={0.12}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold">Retorno no site (quem chegou por anúncio pago do Meta)</h2>
        <p className="text-xs text-muted-foreground">
          Medido pelo próprio site, independente da Meta: confirma se o anúncio trouxe gente que
          agiu.
        </p>
        {!r ? (
          <p className="mt-2 text-sm text-red-700">{v.retorno.erro}</p>
        ) : (
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
            <Kpi
              icone={Users}
              rotulo="Sessões"
              valor={n(r.sessoes)}
              sub={`${n(r.visitantes)} visitantes`}
            />
            <Kpi
              icone={MessageCircle}
              rotulo="WhatsApp"
              valor={n(r.whatsapp)}
              sub={`custo ${din(div(t.gasto, r.whatsapp))} cada`}
              destaque
            />
            <Kpi icone={MessageCircle} rotulo="Cotações" valor={n(r.cotacoes)} />
            <Kpi icone={ShoppingBag} rotulo="Carrinhos" valor={n(r.carrinhos)} />
            <Kpi
              icone={Users}
              rotulo="Cadastros"
              valor={n(r.cadastros)}
              sub={`custo ${din(div(t.gasto, r.cadastros))} cada`}
            />
            <Kpi icone={ShoppingBag} rotulo="Vendas (link)" valor={n(r.vendas)} />
            <Kpi
              icone={Wallet}
              rotulo="Receita"
              valor={
                Object.entries(r.receita)
                  .map(([m, x]) => `${m === "BRL" ? "R$" : "$U"} ${n(x as number)}`)
                  .join(" + ") || "—"
              }
              sub="links pagos por quem veio de anúncio"
            />
          </div>
        )}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- campanhas
const COR_ST: Record<string, string> = {
  ATIVA: "bg-emerald-100 text-emerald-800",
  PAUSADA: "bg-zinc-100 text-zinc-700",
  REMOVIDA: "bg-red-100 text-red-700",
  OUTRO: "bg-amber-100 text-amber-800",
};
function Campanhas({ dias, din }: { dias: number; din: (x: number | null) => string }) {
  const qc = useQueryClient();
  const [abertas, setAbertas] = useState<Set<string>>(new Set());
  const [soAtivas, setSoAtivas] = useState(false);
  const { data, isLoading, error } = useQuery({
    queryKey: ["meta-estrutura", dias],
    queryFn: () => estruturaMetaFn({ data: { dias } }),
  });
  const mudar = async (o: {
    id: string;
    nome: string;
    tipo: string;
    ativo?: boolean;
    orcamento?: number;
  }) => {
    try {
      await alterarMetaFn({ data: o });
      toast.success(
        o.orcamento !== undefined ? "Orçamento alterado" : o.ativo ? "Ativado" : "Pausado",
      );
      qc.invalidateQueries({ queryKey: ["meta-estrutura"] });
      qc.invalidateQueries({ queryKey: ["meta-anuncios"] });
    } catch (e: any) {
      toast.error(e?.message || "A Meta recusou");
    }
  };
  const orcamento = (o: { id: string; nome: string; tipo: string; atual: number | null }) => {
    const x = window.prompt(`Novo orçamento diário de «${o.nome}»`, o.atual ? String(o.atual) : "");
    if (x == null) return;
    const v = Number(x.replace(",", "."));
    if (!(v > 0)) return toast.error("Valor inválido");
    mudar({ id: o.id, nome: o.nome, tipo: o.tipo, orcamento: v });
  };
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando campanhas…</p>;
  if (error) return <Erro msg={(error as any).message} />;
  const lista = (data ?? []).filter((c: any) => !soAtivas || c.status === "ATIVA");
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center gap-3 border-b p-3 text-sm">
        <label className="flex items-center gap-2">
          <Switch checked={soAtivas} onCheckedChange={setSoAtivas} /> Só ativas
        </label>
        <span className="text-muted-foreground">
          {lista.length} campanhas · clique para ver os conjuntos de anúncios
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Campanha / conjunto</th>
              <th className="p-3">Status</th>
              <th className="p-3 text-right">Orçamento/dia</th>
              <th className="p-3 text-right">Gasto</th>
              <th className="p-3 text-right">Cliques link</th>
              <th className="p-3 text-right">CTR</th>
              <th className="p-3 text-right">Leads/conv.</th>
              <th className="p-3 text-right">Custo/result.</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {lista.map((c: any) => {
              const on = abertas.has(c.id);
              const res = c.numeros.leads + c.numeros.conversas;
              return [
                <tr key={c.id} className="border-t bg-background hover:bg-muted/30">
                  <td className="p-3">
                    <button
                      className="flex items-center gap-1.5 text-left font-semibold"
                      onClick={() =>
                        setAbertas((s) => {
                          const x = new Set(s);
                          if (x.has(c.id)) x.delete(c.id);
                          else x.add(c.id);
                          return x;
                        })
                      }
                    >
                      {on ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}{" "}
                      {c.nome}
                    </button>
                    <p className="pl-6 text-[11px] text-muted-foreground">
                      {c.objetivo?.replace("OUTCOME_", "")} · {c.conjuntos.length} conjunto(s)
                      {c.conta && ` · conta ${c.conta}`}
                    </p>
                  </td>
                  <td className="p-3">
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        COR_ST[c.status],
                      )}
                      title={c.statusOrigem}
                    >
                      {c.status.toLowerCase()}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {c.orcamentoDiario != null ? (
                      <button
                        className="font-semibold text-primary hover:underline"
                        onClick={() =>
                          orcamento({
                            id: c.id,
                            nome: c.nome,
                            tipo: "Campanha",
                            atual: c.orcamentoDiario,
                          })
                        }
                      >
                        {din(c.orcamentoDiario)}
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {c.vitalicio ? "vitalício" : "nos conjuntos"}
                      </span>
                    )}
                  </td>
                  <td className="p-3 text-right font-semibold">{din(c.numeros.gasto)}</td>
                  <td className="p-3 text-right">{n(c.numeros.cliquesLink)}</td>
                  <td className="p-3 text-right">{pct(c.numeros.ctr)}</td>
                  <td className="p-3 text-right">{n(res)}</td>
                  <td className="p-3 text-right">{din(div(c.numeros.gasto, res))}</td>
                  <td className="p-3 text-right">
                    {c.status !== "REMOVIDA" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          window.confirm(
                            `${c.status === "ATIVA" ? "Pausar" : "Ativar"} a campanha «${c.nome}»?`,
                          ) &&
                          mudar({
                            id: c.id,
                            nome: c.nome,
                            tipo: "Campanha",
                            ativo: c.status !== "ATIVA",
                          })
                        }
                      >
                        {c.status === "ATIVA" ? (
                          <Pause className="h-4 w-4" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </td>
                </tr>,
                ...(on
                  ? c.conjuntos.map((a: any) => {
                      const r2 = a.numeros.leads + a.numeros.conversas;
                      return (
                        <tr key={a.id} className="border-t bg-muted/20 text-[13px]">
                          <td className="p-2 pl-10">
                            <p>{a.nome}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {[a.publico, a.otimizacao].filter(Boolean).join(" · ")}
                            </p>
                          </td>
                          <td className="p-2">
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                COR_ST[a.status],
                              )}
                              title={a.statusOrigem}
                            >
                              {a.status.toLowerCase()}
                            </span>
                          </td>
                          <td className="p-2 text-right">
                            {a.orcamentoDiario != null ? (
                              <button
                                className="font-semibold text-primary hover:underline"
                                onClick={() =>
                                  orcamento({
                                    id: a.id,
                                    nome: a.nome,
                                    tipo: "Conjunto",
                                    atual: a.orcamentoDiario,
                                  })
                                }
                              >
                                {din(a.orcamentoDiario)}
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {a.vitalicio ? "vitalício" : "na campanha"}
                              </span>
                            )}
                          </td>
                          <td className="p-2 text-right">{din(a.numeros.gasto)}</td>
                          <td className="p-2 text-right">{n(a.numeros.cliquesLink)}</td>
                          <td className="p-2 text-right">{pct(a.numeros.ctr)}</td>
                          <td className="p-2 text-right">{n(r2)}</td>
                          <td className="p-2 text-right">{din(div(a.numeros.gasto, r2))}</td>
                          <td className="p-2 text-right">
                            {a.status !== "REMOVIDA" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  mudar({
                                    id: a.id,
                                    nome: a.nome,
                                    tipo: "Conjunto",
                                    ativo: a.status !== "ATIVA",
                                  })
                                }
                              >
                                {a.status === "ATIVA" ? (
                                  <Pause className="h-4 w-4" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  : []),
              ];
            })}
            {!lista.length && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-muted-foreground">
                  Nenhuma campanha.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- anúncios
function Anuncios({ dias, din }: { dias: number; din: (x: number | null) => string }) {
  const qc = useQueryClient();
  const [previa, setPrevia] = useState<{ id: string; nome: string } | null>(null);
  const [ordem, setOrdem] = useState<"recentes" | "gasto" | "resultado">("recentes");
  const { data, isLoading, error } = useQuery({
    queryKey: ["meta-anuncios", dias],
    queryFn: () => anunciosMetaFn({ data: { dias } }),
  });
  const lista = useMemo(() => {
    const l = [...(data ?? [])];
    if (ordem === "gasto") l.sort((a: any, b: any) => b.numeros.gasto - a.numeros.gasto);
    if (ordem === "resultado")
      l.sort(
        (a: any, b: any) =>
          b.numeros.leads +
          b.numeros.conversas +
          b.numeros.cliquesLink / 100 -
          (a.numeros.leads + a.numeros.conversas + a.numeros.cliquesLink / 100),
      );
    return l;
  }, [data, ordem]);
  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando anúncios…</p>;
  if (error) return <Erro msg={(error as any).message} />;
  return (
    <div className="space-y-3">
      <div className="flex gap-1.5 text-xs">
        {(["recentes", "gasto", "resultado"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setOrdem(k)}
            className={cn(
              "rounded-full border px-3 py-1 font-semibold",
              ordem === k ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {k === "recentes" ? "Mais recentes" : k === "gasto" ? "Mais gasto" : "Melhor resultado"}
          </button>
        ))}
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {lista.map((a: any) => {
          const res = a.numeros.leads + a.numeros.conversas;
          return (
            <Card key={a.id} className="flex flex-col overflow-hidden">
              <div className="relative aspect-[1.4] bg-muted">
                {a.imagem ? (
                  <img
                    src={a.imagem}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <ImageIcon className="m-auto h-10 w-10 text-muted-foreground/40" />
                )}
                <span
                  className={cn(
                    "absolute left-2 top-2 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                    COR_ST[a.status],
                  )}
                  title={a.statusOrigem}
                >
                  {a.status.toLowerCase()}
                </span>
              </div>
              <div className="flex flex-1 flex-col p-3">
                <p className="truncate text-sm font-semibold" title={a.nome}>
                  {a.nome}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {a.campanha} · {a.criado ? new Date(a.criado).toLocaleDateString("pt-BR") : ""}
                  {a.conta && ` · ${a.conta}`}
                </p>
                {a.titulo && <p className="mt-1 line-clamp-1 text-sm">{a.titulo}</p>}
                {a.texto && <p className="line-clamp-2 text-xs text-muted-foreground">{a.texto}</p>}
                <div className="mt-2 grid grid-cols-4 gap-1 rounded-lg bg-muted/50 p-2 text-center text-[11px]">
                  <div>
                    <p className="text-sm font-bold">{din(a.numeros.gasto)}</p>gasto
                  </div>
                  <div>
                    <p className="text-sm font-bold">{n(a.numeros.cliquesLink)}</p>cliques
                  </div>
                  <div>
                    <p className="text-sm font-bold">{pct(a.numeros.ctr)}</p>CTR
                  </div>
                  <div>
                    <p className="text-sm font-bold">{n(res)}</p>result.
                  </div>
                </div>
                <div className="mt-auto flex gap-1 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => setPrevia({ id: a.id, nome: a.nome })}
                  >
                    <Eye className="mr-1 h-4 w-4" /> Prévia
                  </Button>
                  {a.status !== "REMOVIDA" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={async () => {
                        try {
                          await alterarMetaFn({
                            data: {
                              id: a.id,
                              nome: a.nome,
                              tipo: "Anúncio",
                              ativo: a.status !== "ATIVA",
                            },
                          });
                          toast.success(
                            a.status === "ATIVA" ? "Anúncio pausado" : "Anúncio ativado",
                          );
                          qc.invalidateQueries({ queryKey: ["meta-anuncios"] });
                        } catch (e: any) {
                          toast.error(e?.message || "A Meta recusou");
                        }
                      }}
                    >
                      {a.status === "ATIVA" ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
        {!lista.length && <p className="text-sm text-muted-foreground">Nenhum anúncio.</p>}
      </div>
      <Dialog open={!!previa} onOpenChange={(x) => !x && setPrevia(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="truncate">{previa?.nome}</DialogTitle>
          </DialogHeader>
          {previa && <Previa id={previa.id} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function Previa({ id }: { id: string }) {
  const [formato, setFormato] = useState("MOBILE_FEED_STANDARD");
  const { data, isLoading, error } = useQuery({
    queryKey: ["meta-previa", id, formato],
    queryFn: () => previaAnuncioFn({ data: { id, formato } }),
  });
  return (
    <div>
      <div className="flex flex-wrap gap-1 text-xs">
        {[
          ["MOBILE_FEED_STANDARD", "Feed Facebook"],
          ["INSTAGRAM_STANDARD", "Feed Instagram"],
          ["INSTAGRAM_STORY", "Story Instagram"],
          ["DESKTOP_FEED_STANDARD", "Computador"],
        ].map(([k, r]) => (
          <button
            key={k}
            onClick={() => setFormato(k)}
            className={cn(
              "rounded-full border px-2.5 py-1 font-semibold",
              formato === k
                ? "border-primary bg-primary text-primary-foreground"
                : "hover:bg-muted",
            )}
          >
            {r}
          </button>
        ))}
      </div>
      <div className="mt-3 flex h-[560px] items-center justify-center rounded-lg bg-muted/40">
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : error ? (
          <p className="p-4 text-sm text-red-700">{(error as any).message}</p>
        ) : (
          <iframe title="Prévia" src={data!.src} className="h-full w-full rounded-lg" />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- público, cidades e rotas
function Barras({
  titulo,
  dados,
  campo,
  fmt,
  cor = AZUL,
}: {
  titulo: string;
  dados: any[];
  campo: string;
  fmt: (x: number) => string;
  cor?: string;
}) {
  const lista = dados.slice(0, 12);
  return (
    <Card className="p-4">
      <h3 className="text-sm font-semibold">{titulo}</h3>
      {!lista.length ? (
        <p className="mt-2 text-xs text-muted-foreground">Sem dados no período.</p>
      ) : (
        <div style={{ height: Math.max(140, lista.length * 30 + 20) }} className="mt-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={lista} layout="vertical" margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
              <XAxis
                type="number"
                fontSize={10}
                tickLine={false}
                axisLine={false}
                tickFormatter={(x) => n(x)}
              />
              <YAxis
                type="category"
                dataKey="rotulo"
                width={150}
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                formatter={(x: number) => [fmt(x), titulo]}
                contentStyle={{ borderRadius: 10, fontSize: 12 }}
                cursor={{ fill: "var(--muted)" }}
              />
              <Bar isAnimationActive={false} dataKey={campo} fill={cor} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
}
function Publico({ dias, din }: { dias: number; din: (x: number | null) => string }) {
  const [campo, setCampo] = useState<"gasto" | "cliquesLink" | "leads">("gasto");
  const { data, isLoading } = useQuery({
    queryKey: ["meta-publico", dias],
    queryFn: () => publicoMetaFn({ data: { dias } }),
  });
  if (isLoading || !data)
    return <p className="text-sm text-muted-foreground">Carregando público…</p>;
  const p = data.publico.ok ? data.publico.v : null;
  const s = data.site.ok ? data.site.v : null;
  const fmt = (x: number) => (campo === "gasto" ? din(x) : n(x));
  const rot = campo === "gasto" ? "Gasto" : campo === "cliquesLink" ? "Cliques no link" : "Leads";
  return (
    <div className="space-y-4">
      {!p ? (
        <Erro msg={(data.publico as any).erro} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="mr-1 text-sm font-semibold">Ver por:</span>
            {(["gasto", "cliquesLink", "leads"] as const).map((k) => (
              <button
                key={k}
                onClick={() => setCampo(k)}
                className={cn(
                  "rounded-full border px-3 py-1 font-semibold",
                  campo === k
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                {k === "gasto" ? "Gasto" : k === "cliquesLink" ? "Cliques no link" : "Leads"}
              </button>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card className="p-4">
              <h3 className="text-sm font-semibold">Idade e gênero (cliques)</h3>
              <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: AZUL }} /> Homens
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: LARANJA }} />{" "}
                  Mulheres
                </span>
              </div>
              <div className="mt-2 h-60">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={p.idade} margin={{ left: -10, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="rotulo" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 10, fontSize: 12 }}
                      cursor={{ fill: "var(--muted)" }}
                    />
                    <Bar
                      isAnimationActive={false}
                      dataKey="Homens"
                      fill={AZUL}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      isAnimationActive={false}
                      dataKey="Mulheres"
                      fill={LARANJA}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Barras
              titulo={`${rot} por departamento/região (Meta)`}
              dados={p.regiao}
              campo={campo}
              fmt={fmt}
            />
            <Barras
              titulo={`${rot} por posicionamento`}
              dados={p.posicao}
              campo={campo}
              fmt={fmt}
            />
            <Barras titulo={`${rot} por aparelho`} dados={p.aparelho} campo={campo} fmt={fmt} />
          </div>
        </>
      )}

      <h2 className="pt-2 text-lg font-bold">No site: cidades e rotas de quem veio do anúncio</h2>
      {!s ? (
        <Erro msg={(data.site as any).erro} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="overflow-hidden p-0">
            <h3 className="flex items-center gap-2 border-b p-3 text-sm font-semibold">
              <MapPin className="h-4 w-4 text-primary" /> Cidades
            </h3>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/80 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-2">Cidade</th>
                    <th className="p-2 text-right">Sessões</th>
                    <th className="p-2 text-right">WhatsApp/cotação</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {s.cidades.map((c: any) => {
                    const max = s.cidades[0]?.sessoes || 1;
                    return (
                      <tr key={c.cidade} className="border-t">
                        <td className="p-2">
                          {c.cidade}
                          {c.regiao && (
                            <span className="text-xs text-muted-foreground"> · {c.regiao}</span>
                          )}
                        </td>
                        <td className="p-2 text-right font-semibold">{n(c.sessoes)}</td>
                        <td className="p-2 text-right">{n(c.whatsapp)}</td>
                        <td className="w-28 p-2">
                          <div
                            className="h-2 rounded-full"
                            style={{ width: `${(c.sessoes / max) * 100}%`, background: VERDE }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                  {!s.cidades.length && (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-muted-foreground">
                        Ninguém chegou por anúncio pago no período.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <RouteIcon className="h-4 w-4 text-primary" /> Rotas no site (entrada → próximas
              páginas)
            </h3>
            <p className="text-xs text-muted-foreground">
              {n(s.sessoes)} sessões · {n(s.umaPagina)} saíram na primeira página (
              {pct(div(s.umaPagina * 100, s.sessoes))})
            </p>
            <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">
              Páginas de entrada
            </p>
            <ul className="mt-1 space-y-1 text-sm">
              {s.entradas.map((e: any) => (
                <li key={e.k} className="flex justify-between gap-2">
                  <span className="truncate" title={e.k}>
                    {e.k}
                  </span>
                  <b>{n(e.v)}</b>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs font-semibold uppercase text-muted-foreground">
              Rotas mais comuns
            </p>
            <ul className="mt-1 space-y-1 text-sm">
              {s.rotas.map((e: any) => (
                <li key={e.k} className="flex justify-between gap-2">
                  <span className="truncate text-muted-foreground" title={e.k}>
                    {e.k}
                  </span>
                  <b>{n(e.v)}</b>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- leads
const ETAPAS: Array<[string, string, string]> = [
  ["NOVO", "Novos", "bg-sky-100 text-sky-800"],
  ["CONTATADO", "Contatados", "bg-violet-100 text-violet-800"],
  ["NEGOCIANDO", "Negociando", "bg-amber-100 text-amber-800"],
  ["GANHO", "Ganhos", "bg-emerald-100 text-emerald-800"],
  ["PERDIDO", "Perdidos", "bg-zinc-100 text-zinc-600"],
];
const ORIGEM: Record<string, string> = {
  FORMULARIO: "Formulário do anúncio",
  WHATSAPP: "WhatsApp (site)",
  COTACAO: "Cotação (site)",
  CADASTRO: "Cadastro (site)",
};
function Leads() {
  const qc = useQueryClient();
  const [sinc, setSinc] = useState(false);
  const [etapa, setEtapa] = useState("NOVO");
  const [origem, setOrigem] = useState("");
  const [busca, setBusca] = useState("");
  const [aberto, setAberto] = useState<Lead | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["meta-leads"],
    queryFn: () => listarLeadsFn({ data: { sincronizar: true } }),
  });
  const atualizar = async () => {
    setSinc(true);
    try {
      const r = await listarLeadsFn({ data: { sincronizar: true } });
      qc.setQueryData(["meta-leads"], r);
      toast.success(`${r.sinc?.novos ?? 0} leads novos`);
      r.sinc?.avisos.forEach((a) => toast.warning(a, { duration: 10_000 }));
    } finally {
      setSinc(false);
    }
  };
  const leads = data?.leads ?? [];
  const lista = leads.filter(
    (l) =>
      l.status === etapa &&
      (!origem || l.origem === origem) &&
      (!busca ||
        [l.nome, l.email, l.telefone, l.cidade, l.campanha].some((x) =>
          x?.toLowerCase().includes(busca.toLowerCase()),
        )),
  );
  const mover = async (l: Lead, status: string) => {
    await salvarLeadFn({ data: { id: l.id, status } });
    qc.setQueryData(["meta-leads"], (d: any) => ({
      ...d,
      leads: d.leads.map((x: Lead) => (x.id === l.id ? { ...x, status } : x)),
    }));
  };
  const wa = (t: string) => `https://api.whatsapp.com/send?phone=${t.replace(/\D/g, "")}`;
  return (
    <div className="space-y-3">
      {data?.sinc?.avisos?.map((a) => (
        <p key={a} className="flex gap-2 rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          <AlertTriangle className="h-4 w-4 shrink-0" /> {a}. Para trazer os formulários dos
          anúncios, adicione ao app o caso de uso «Capturar e gerenciar leads de anúncios» e clique
          em «Reconectar» no Facebook.
        </p>
      ))}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {ETAPAS.map(([k, r, cls]) => (
          <button
            key={k}
            onClick={() => setEtapa(k)}
            className={cn("rounded-xl border p-3 text-left", etapa === k && "ring-2 ring-primary")}
          >
            <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", cls)}>
              {r}
            </span>
            <p className="mt-1 text-2xl font-bold">{leads.filter((l) => l.status === k).length}</p>
            {k === "GANHO" && (
              <p className="text-[11px] text-muted-foreground">
                {n(
                  leads.filter((l) => l.status === "GANHO").reduce((s, l) => s + (l.valor ?? 0), 0),
                )}{" "}
                em vendas
              </p>
            )}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar nome, e-mail, telefone, cidade…"
          className="max-w-xs"
        />
        <select
          value={origem}
          onChange={(e) => setOrigem(e.target.value)}
          className="h-10 rounded-md border bg-background px-3 text-sm"
        >
          <option value="">Todas as origens</option>
          {Object.entries(ORIGEM).map(([k, r]) => (
            <option key={k} value={k}>
              {r}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          onClick={atualizar}
          disabled={sinc || isLoading}
          className="ml-auto"
        >
          {sinc || isLoading ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 h-4 w-4" />
          )}{" "}
          Buscar leads novos
        </Button>
      </div>
      <Card className="overflow-hidden p-0">
        <ul className="divide-y">
          {lista.map((l) => (
            <li key={l.id} className="flex flex-wrap items-center gap-3 p-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {l.nome || "Sem nome"}{" "}
                  <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                    {ORIGEM[l.origem] ?? l.origem}
                  </span>
                </p>
                <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  <span>
                    {new Date(l.quando).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                  {l.cidade && (
                    <span>
                      <MapPin className="mr-0.5 inline h-3 w-3" />
                      {l.cidade}
                    </span>
                  )}
                  {l.telefone && (
                    <span>
                      <Phone className="mr-0.5 inline h-3 w-3" />
                      {l.telefone}
                    </span>
                  )}
                  {l.email && (
                    <span>
                      <Mail className="mr-0.5 inline h-3 w-3" />
                      {l.email}
                    </span>
                  )}
                  {l.campanha && <span>campanha: {l.campanha}</span>}
                </p>
                {l.nota && <p className="mt-0.5 line-clamp-1 text-xs italic">{l.nota}</p>}
              </div>
              {l.telefone && (
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="border-green-300 text-green-700"
                >
                  <a href={wa(l.telefone)} target="_blank" rel="noreferrer">
                    <MessageCircle className="mr-1 h-4 w-4" /> WhatsApp
                  </a>
                </Button>
              )}
              <select
                value={l.status}
                onChange={(e) => mover(l, e.target.value)}
                className="h-9 rounded-md border bg-background px-2 text-sm"
              >
                {ETAPAS.map(([k, r]) => (
                  <option key={k} value={k}>
                    {r.replace(/s$/, "")}
                  </option>
                ))}
              </select>
              <Button size="sm" variant="ghost" onClick={() => setAberto(l)}>
                Detalhes
              </Button>
            </li>
          ))}
          {!lista.length && (
            <li className="p-8 text-center text-sm text-muted-foreground">
              {isLoading ? "Buscando…" : "Nenhum lead nesta etapa."}
            </li>
          )}
        </ul>
      </Card>
      <Dialog open={!!aberto} onOpenChange={(x) => !x && setAberto(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{aberto?.nome || "Lead"}</DialogTitle>
          </DialogHeader>
          {aberto && (
            <LeadDetalhe
              l={aberto}
              aoSalvar={() => {
                setAberto(null);
                qc.invalidateQueries({ queryKey: ["meta-leads"] });
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
function LeadDetalhe({ l, aoSalvar }: { l: Lead; aoSalvar: () => void }) {
  const [nota, setNota] = useState(l.nota ?? "");
  const [valor, setValor] = useState(l.valor != null ? String(l.valor) : "");
  return (
    <div className="space-y-3 text-sm">
      <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-xs">
        {l.detalhe || "—"}
      </pre>
      {l.anuncio && <p className="text-xs text-muted-foreground">Anúncio: {l.anuncio}</p>}
      <label className="block text-xs font-semibold text-muted-foreground">
        Anotações
        <textarea
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
        />
      </label>
      <label className="block text-xs font-semibold text-muted-foreground">
        Valor da venda (se fechou)
        <Input
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          inputMode="decimal"
          className="mt-1"
        />
      </label>
      <Button
        className="w-full"
        onClick={async () => {
          await salvarLeadFn({
            data: { id: l.id, nota, valor: valor.trim() ? Number(valor.replace(",", ".")) : null },
          });
          toast.success("Lead salvo");
          aoSalvar();
        }}
      >
        Salvar
      </Button>
    </div>
  );
}

// ---------------------------------------------------------------- criar anúncio
const BOTOES: Array<[string, string]> = [
  ["SHOP_NOW", "Comprar agora"],
  ["LEARN_MORE", "Saiba mais"],
  ["GET_QUOTE", "Pedir orçamento"],
  ["CONTACT_US", "Fale conosco"],
  ["SEE_MORE", "Ver mais"],
];
// Rótulo + campo (fora do formulário: dentro dele o campo perderia o foco a cada tecla)
// Data no formato do campo datetime-local (horário do computador)
const dataLocal = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
const C = ({ r, children }: { r: string; children: React.ReactNode }) => (
  <label className="block text-xs font-semibold text-muted-foreground">
    {r}
    <div className="mt-1">{children}</div>
  </label>
);
function Criar({
  moeda,
  aoCriar,
  localInicial,
}: {
  moeda: string;
  aoCriar: () => void;
  localInicial?: string;
}) {
  const [modo, setModo] = useState<"prontos" | "campanhas">("prontos");
  // Veio de um anúncio pronto: o formulário mostra só valor, datas e ativar
  const [pronto, setPronto] = useState(false);
  const [detalhes, setDetalhes] = useState(false);
  const [f, setF] = useState({
    regioes: [] as string[],
    nome: "",
    objetivo: "TRAFEGO" as "TRAFEGO" | "WHATSAPP",
    orcamentoDiario: "",
    inicio: "",
    fim: "",
    idadeMin: "25",
    idadeMax: "65",
    genero: "TODOS" as "TODOS" | "HOMENS" | "MULHERES",
    texto: "",
    titulo: "",
    descricao: "",
    link: "https://agropartsuy.com/black-friday",
    botao: "SHOP_NOW",
    ativar: false,
  });
  const [img, setImg] = useState<{ b64: string; url: string } | null>(null);
  const [indo, setIndo] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const set = (p: Partial<typeof f>) => setF({ ...f, ...p });
  const escolher = async (arq: File) => {
    const bmp = await createImageBitmap(arq);
    const k = Math.min(1, 1440 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    const g = c.getContext("2d")!;
    g.fillStyle = "#fff";
    g.fillRect(0, 0, c.width, c.height);
    g.drawImage(bmp, 0, 0, c.width, c.height);
    const url = c.toDataURL("image/jpeg", 0.9);
    setImg({ url, b64: url.split(",")[1] });
  };
  const criar = async () => {
    if (
      !window.confirm(
        f.ativar
          ? "Criar e ATIVAR o anúncio agora (vai começar a gastar)?"
          : "Criar o anúncio PAUSADO (você ativa depois em Campanhas)?",
      )
    )
      return;
    setIndo(true);
    try {
      await criarAnuncioMetaFn({
        data: {
          ...f,
          orcamentoDiario: Number(f.orcamentoDiario.replace(",", ".")),
          idadeMin: Number(f.idadeMin),
          idadeMax: Number(f.idadeMax),
          inicio: f.inicio ? new Date(f.inicio).toISOString() : null,
          fim: f.fim ? new Date(f.fim).toISOString() : null,
          imagemBase64: img?.b64 ?? "",
        },
      });
      toast.success(
        f.ativar
          ? "Anúncio criado e ativo"
          : "Anúncio criado (pausado). A Meta ainda revisa antes de rodar.",
      );
      aoCriar();
    } catch (e: any) {
      toast.error(e?.message || "A Meta recusou", { duration: 12_000 });
    } finally {
      setIndo(false);
    }
  };
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-3 xl:col-span-2">
        <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
          {(
            [
              ["prontos", "Anúncios prontos de hoje (por departamento, peça e ideia)"],
              ["campanhas", "Campanhas estratégicas do Criador"],
            ] as const
          ).map(([k, r]) => (
            <button
              key={k}
              type="button"
              onClick={() => setModo(k)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-semibold",
                modo === k
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r}
            </button>
          ))}
        </div>
        {modo === "prontos" ? (
          <AnunciosProntos
            localInicial={localInicial}
            aplicar={(p) => {
              setF((x) => ({ ...x, ...p }));
              setPronto(true);
              setDetalhes(false);
            }}
            aplicarImagem={setImg}
          />
        ) : (
          <CampanhasProntas
            aplicar={(p) => {
              setF((x) => ({ ...x, ...p, regioes: [] }));
              setPronto(true);
              setDetalhes(false);
            }}
            aplicarImagem={setImg}
          />
        )}
      </div>
      {pronto && !detalhes ? (
        <Card id="form-anuncio" className="scroll-mt-4 space-y-4 p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
              ✔ Anúncio pronto — falta só o valor, a data e ativar
            </p>
            <p className="mt-1 font-bold">{f.nome}</p>
            <p className="text-xs text-muted-foreground">
              {f.objetivo === "WHATSAPP" ? "Conversas no WhatsApp" : "Visitas ao site"} · Público:{" "}
              {f.regioes.length ? `Uruguai — ${f.regioes.join(", ")}` : "todo o Uruguai"} · idade{" "}
              {f.idadeMin}–{f.idadeMax}
            </p>
          </div>
          <C r={`Valor por dia (${moeda})`}>
            <Input
              autoFocus
              value={f.orcamentoDiario}
              onChange={(e) => set({ orcamentoDiario: e.target.value })}
              inputMode="decimal"
              placeholder="Ex.: 300"
              className="h-12 text-lg font-bold"
            />
          </C>
          <div className="grid grid-cols-2 gap-2">
            <C r="Começa (vazio = agora)">
              <Input
                type="datetime-local"
                value={f.inicio}
                onChange={(e) => set({ inicio: e.target.value })}
              />
            </C>
            <C r="Termina">
              <Input
                type="datetime-local"
                value={f.fim}
                onChange={(e) => set({ fim: e.target.value })}
              />
            </C>
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="self-center font-semibold text-muted-foreground">Duração:</span>
            {(
              [
                ["7 dias", 7],
                ["15 dias", 15],
                ["30 dias", 30],
              ] as const
            ).map(([r, d]) => (
              <button
                key={r}
                type="button"
                onClick={() => set({ fim: dataLocal(new Date(Date.now() + d * 86_400_000)) })}
                className="rounded-md bg-muted px-2 py-1 font-semibold hover:bg-muted/70"
              >
                {r}
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                const a = new Date().getFullYear();
                set({ fim: dataLocal(new Date(a, 10, 30, 23, 59)) });
              }}
              className="rounded-md bg-muted px-2 py-1 font-semibold hover:bg-muted/70"
            >
              Até o fim da Black (30/11)
            </button>
            <button
              type="button"
              onClick={() => set({ fim: "" })}
              className="rounded-md bg-muted px-2 py-1 font-semibold hover:bg-muted/70"
            >
              Sem data para acabar
            </button>
          </div>
          <label className="flex items-center justify-between rounded-lg bg-amber-50 p-3 text-sm">
            <span>
              <b>Ativar já</b> (desligado: cria pausado para você conferir antes)
            </span>
            <Switch checked={f.ativar} onCheckedChange={(v) => set({ ativar: v })} />
          </label>
          <Button size="lg" className="w-full" onClick={criar} disabled={indo || !img}>
            {indo ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Plus className="mr-2 h-5 w-5" />
            )}{" "}
            {f.ativar ? "Criar e ativar" : "Criar anúncio (pausado)"}
          </Button>
          <button
            type="button"
            onClick={() => setDetalhes(true)}
            className="w-full text-center text-xs font-semibold text-muted-foreground underline"
          >
            Editar texto, título, link, imagem e público
          </button>
        </Card>
      ) : (
        <Card id="form-anuncio" className="scroll-mt-4 space-y-4 p-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <C r="Nome do anúncio (interno)">
              <Input
                value={f.nome}
                onChange={(e) => set({ nome: e.target.value })}
                placeholder="Pre Black · Filtros"
              />
            </C>
            <C r="Objetivo">
              <select
                value={f.objetivo}
                onChange={(e) => set({ objetivo: e.target.value as any })}
                className="h-10 w-full rounded-md border bg-background px-3 text-sm"
              >
                <option value="TRAFEGO">Visitas ao site (link)</option>
                <option value="WHATSAPP">Conversas no WhatsApp</option>
              </select>
            </C>
            <C r={`Orçamento diário (${moeda})`}>
              <Input
                value={f.orcamentoDiario}
                onChange={(e) => set({ orcamentoDiario: e.target.value })}
                inputMode="decimal"
              />
            </C>
            <div className="grid grid-cols-2 gap-2">
              <C r="Começa (opcional)">
                <Input
                  type="datetime-local"
                  value={f.inicio}
                  onChange={(e) => set({ inicio: e.target.value })}
                />
              </C>
              <C r="Termina (opcional)">
                <Input
                  type="datetime-local"
                  value={f.fim}
                  onChange={(e) => set({ fim: e.target.value })}
                />
              </C>
            </div>
          </div>
          <div className="rounded-lg bg-muted/40 p-3">
            <p className="text-xs font-semibold text-muted-foreground">
              Público:{" "}
              <b className="text-foreground">
                {f.regioes.length ? `Uruguai — ${f.regioes.join(", ")}` : "todo o Uruguai"}
              </b>{" "}
              (a loja só anuncia para o Uruguai)
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {f.regioes.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => set({ regioes: f.regioes.filter((x) => x !== r) })}
                  className="rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-foreground"
                  title="Tirar"
                >
                  {r} ×
                </button>
              ))}
              <select
                value=""
                onChange={(e) =>
                  e.target.value && set({ regioes: [...new Set([...f.regioes, e.target.value])] })
                }
                className="h-8 rounded-md border bg-background px-2 text-xs"
                aria-label="Adicionar departamento"
              >
                <option value="">+ departamento</option>
                {DEPTOS_UY.filter((d) => !f.regioes.includes(d)).map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
              {!!f.regioes.length && (
                <button
                  type="button"
                  onClick={() => set({ regioes: [] })}
                  className="text-xs font-semibold text-muted-foreground underline"
                >
                  todo o Uruguai
                </button>
              )}
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <C r="Idade mínima">
                <Input
                  type="number"
                  min={18}
                  max={65}
                  value={f.idadeMin}
                  onChange={(e) => set({ idadeMin: e.target.value })}
                />
              </C>
              <C r="Idade máxima">
                <Input
                  type="number"
                  min={18}
                  max={65}
                  value={f.idadeMax}
                  onChange={(e) => set({ idadeMax: e.target.value })}
                />
              </C>
              <C r="Gênero">
                <select
                  value={f.genero}
                  onChange={(e) => set({ genero: e.target.value as any })}
                  className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                >
                  <option value="TODOS">Todos</option>
                  <option value="HOMENS">Homens</option>
                  <option value="MULHERES">Mulheres</option>
                </select>
              </C>
            </div>
          </div>
          <C r="Imagem (1080×1350 ou 1080×1080; os cards da pré-Black servem)">
            <input
              ref={ref}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && escolher(e.target.files[0])}
            />
            <Button type="button" variant="outline" onClick={() => ref.current?.click()}>
              <Upload className="mr-1.5 h-4 w-4" /> {img ? "Trocar imagem" : "Escolher imagem"}
            </Button>
          </C>
          <C r="Texto principal">
            <textarea
              value={f.texto}
              onChange={(e) => set({ texto: e.target.value })}
              rows={4}
              className="w-full rounded-md border bg-background p-2.5 text-sm"
              placeholder="🖤 Pre Black Friday: -20% en todo el sitio. Repuestos para tu tractor con código original."
            />
          </C>
          <div className="grid gap-3 sm:grid-cols-2">
            <C r="Título">
              <Input
                value={f.titulo}
                onChange={(e) => set({ titulo: e.target.value })}
                placeholder="-20% en repuestos agrícolas"
              />
            </C>
            <C r="Descrição (opcional)">
              <Input
                value={f.descricao}
                onChange={(e) => set({ descricao: e.target.value })}
                placeholder="Cotizá por WhatsApp"
              />
            </C>
            {f.objetivo === "TRAFEGO" && (
              <>
                <C r="Link">
                  <Input value={f.link} onChange={(e) => set({ link: e.target.value })} />
                </C>
                <C r="Botão">
                  <select
                    value={f.botao}
                    onChange={(e) => set({ botao: e.target.value })}
                    className="h-10 w-full rounded-md border bg-background px-3 text-sm"
                  >
                    {BOTOES.map(([k, r]) => (
                      <option key={k} value={k}>
                        {r}
                      </option>
                    ))}
                  </select>
                </C>
              </>
            )}
          </div>
          {f.objetivo === "WHATSAPP" && (
            <p className="text-xs text-amber-700">
              Para conversas no WhatsApp, o número da loja precisa estar ligado à página do Facebook
              (Configurações da página → WhatsApp).
            </p>
          )}
          <label className="flex items-center justify-between rounded-lg bg-amber-50 p-3 text-sm">
            <span>
              <b>Ativar já</b> (desligado: cria pausado para você conferir antes)
            </span>
            <Switch checked={f.ativar} onCheckedChange={(v) => set({ ativar: v })} />
          </label>
          <Button size="lg" className="w-full" onClick={criar} disabled={indo}>
            {indo ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Plus className="mr-2 h-5 w-5" />
            )}{" "}
            Criar anúncio
          </Button>
          <p className="text-xs text-muted-foreground">
            Evite «el mejor precio» ou «la mayor tienda»: a Meta pode recusar promessas sem prova.
          </p>
        </Card>
      )}
      <Card className="self-start overflow-hidden p-0">
        <p className="border-b bg-muted/50 px-4 py-2 text-xs font-semibold text-muted-foreground">
          Prévia aproximada
        </p>
        <div className="p-4">
          <div className="overflow-hidden rounded-xl border bg-white text-zinc-900">
            <p className="flex items-center gap-2 p-2.5 text-xs font-semibold">
              <Facebook className="h-4 w-4 text-blue-600" /> AGRO PARTS{" "}
              <span className="font-normal text-zinc-500">· Patrocinado</span>
            </p>
            <p className="whitespace-pre-line px-2.5 pb-2 text-xs">
              {f.texto || "Texto principal"}
            </p>
            <div className="aspect-square bg-zinc-100">
              {img && <img src={img.url} alt="" className="h-full w-full object-cover" />}
            </div>
            <div className="flex items-center justify-between gap-2 bg-zinc-50 p-2.5">
              <div className="min-w-0">
                <p className="truncate text-[10px] uppercase text-zinc-500">
                  {f.objetivo === "WHATSAPP"
                    ? "WhatsApp"
                    : f.link.replace(/^https?:\/\//, "").split("/")[0]}
                </p>
                <p className="truncate text-sm font-semibold">{f.titulo || "Título"}</p>
              </div>
              <span className="shrink-0 rounded bg-zinc-200 px-3 py-1.5 text-xs font-semibold">
                {f.objetivo === "WHATSAPP"
                  ? "Enviar mensagem"
                  : BOTOES.find((b) => b[0] === f.botao)?.[1]}
              </span>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- conta e saldo
function Conta({ v, din }: { v: any; din: (x: number | null) => string }) {
  if (!v.conta.ok) return <Erro msg={v.conta.erro} />;
  const c = v.conta.v;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icone={Wallet} rotulo="Status da conta" valor={c.status} destaque={!c.ativa} />
        <Kpi icone={Wallet} rotulo="Gasto total da conta" valor={din(c.gastoTotal)} />
        <Kpi
          icone={CreditCard}
          rotulo="A pagar (saldo)"
          valor={din(c.saldoDevido)}
          sub="cobrado na forma de pagamento"
        />
        <Kpi
          icone={Target}
          rotulo="Limite de gasto"
          valor={c.limiteGasto != null ? din(c.limiteGasto) : "Sem limite"}
        />
      </div>
      <Card className="space-y-3 p-5 text-sm">
        <p>
          <b>Forma de pagamento:</b> {c.pagamento ?? "—"}
        </p>
        <p className="text-muted-foreground">
          Adicionar fundos, trocar o cartão ou pagar o saldo só é possível no Gerenciador de
          Anúncios: a Meta não deixa sites externos movimentarem dinheiro da conta. Os botões abaixo
          abrem a página certa.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <a href={c.linkPagamento} target="_blank" rel="noreferrer">
              <CreditCard className="mr-1.5 h-4 w-4" /> Pagamentos e fundos{" "}
              <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </a>
          </Button>
          <Button asChild variant="outline">
            <a href={c.linkGerenciador} target="_blank" rel="noreferrer">
              Abrir o Gerenciador de Anúncios <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Conta {c.id} · fuso {c.fuso ?? "—"}
        </p>
      </Card>
      {c.outras?.map((o: any) => (
        <Card key={o.id} className="space-y-2 p-5 text-sm">
          <p className="font-bold">
            Outra conta: {o.nome || o.id}{" "}
            <span className="font-normal text-muted-foreground">
              ({o.id} · {o.moeda})
            </span>
          </p>
          <p>
            {o.status} · gasto total{" "}
            {o.gastoTotal != null ? `${o.gastoTotal.toFixed(2)} ${o.moeda}` : "—"} · a pagar{" "}
            {o.saldoDevido != null ? `${o.saldoDevido.toFixed(2)} ${o.moeda}` : "—"} · pagamento{" "}
            {o.pagamento ?? "—"}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <a href={o.linkPagamento} target="_blank" rel="noreferrer">
                Pagamentos e fundos <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
            <Button asChild size="sm" variant="outline">
              <a href={o.linkGerenciador} target="_blank" rel="noreferrer">
                Gerenciador <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
              </a>
            </Button>
          </div>
        </Card>
      ))}
      {c.semAcesso?.map((s: any) => (
        <Card key={s.id} className="border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          A conta {s.id} não entrou na soma: {s.erro}. Confira se o token (ou a conexão do Facebook)
          tem acesso a ela.
        </Card>
      ))}
    </div>
  );
}
