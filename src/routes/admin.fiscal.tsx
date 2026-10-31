// Admin → Fiscal: o MEI do Brasil explicado em cards. Limite do ano, DAS, notas fiscais
// automáticas, livro caixa e imposto de renda, com «Seu próximo passo» no topo.
// Só as vendas do Brasil entram aqui (o CNPJ não cobre o Uruguai).
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  BadgeCheck,
  CalendarClock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  ExternalLink,
  FileText,
  Gauge,
  Landmark,
  Loader2,
  MessageCircle,
  Printer,
  Receipt,
  Save,
  Settings,
  ShieldCheck,
  Sparkles,
  Wallet,
  XCircle,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
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
import { cn } from "@/lib/utils";
import {
  cancelarNotaFn,
  configFiscalFn,
  emitirNotaFn,
  marcarDasFn,
  painelFiscalFn,
  relatorioMensalFn,
  salvarConfigFiscalFn,
} from "@/lib/fiscal";
import {
  DAS_MEI,
  NOME_ATIVIDADE,
  NOME_STATUS,
  NCM_SUGERIDO,
  type AtividadeMei,
  type StatusNota,
} from "@/lib/fiscal-comum";

export const Route = createFileRoute("/admin/fiscal")({ component: PaginaFiscal });

type Painel = Awaited<ReturnType<typeof painelFiscalFn>>;

// Cores: receita com nota e sem nota (categóricas, mesma ordem sempre), limite em âmbar
const ESTILO = `
.fis-viz{--com:#2a78d6;--sem:#eb6834;--lim:#c98500;--grade:rgba(0,0,0,.07);--tinta:#1f2a22}
.dark .fis-viz{--com:#3987e5;--sem:#d95926;--lim:#eda100;--grade:rgba(255,255,255,.08);--tinta:#eef2ee}
`;
const brl = (v: number | null | undefined, casas = 2) =>
  v == null
    ? "—"
    : `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}`;
const curto = (v: number) =>
  Math.abs(v) >= 1000
    ? `R$ ${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`
    : `R$ ${Math.round(v)}`;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const nomeMes = (m: string) => MESES[Number(m.slice(5, 7)) - 1];
const dataBR = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`;
const fmtCnpj = (c: string) => c.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");

function PaginaFiscal() {
  const [ano, setAno] = useState(() => new Date().getFullYear());
  const [config, setConfig] = useState(false);
  const [relatorio, setRelatorio] = useState<string | null>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["fiscal", ano],
    queryFn: () => painelFiscalFn({ data: { ano } }),
    // Nota «enviando à Receita»: confere de novo em alguns segundos
    refetchInterval: (q) =>
      q.state.data?.vendas.some((v) => v.nota?.status === "PROCESSANDO") ? 5000 : false,
  });

  if (isLoading)
    return (
      <div className="flex justify-center p-16">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  if (error || !data)
    return <p className="p-8 text-sm text-destructive">Erro ao abrir: {String(error)}</p>;

  return (
    <div className="fis-viz space-y-6">
      <style>{ESTILO}</style>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Landmark className="h-6 w-6 text-primary" /> Fiscal do MEI
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Seu CNPJ no Brasil em um lugar só: quanto ainda pode vender, o imposto do mês, as notas
            fiscais (que saem sozinhas) e o imposto de renda. Só entram as vendas do Brasil.
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            {data.config.cnpj ? (
              <span className="rounded-full bg-muted px-2.5 py-1 font-mono">
                {data.config.razao ? `${data.config.razao} · ` : ""}
                {fmtCnpj(data.config.cnpj)}
              </span>
            ) : (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-900">
                CNPJ ainda não cadastrado
              </span>
            )}
            <span
              className={cn(
                "rounded-full px-2.5 py-1 font-semibold",
                !data.config.temToken
                  ? "bg-zinc-200 text-zinc-700"
                  : data.config.ambiente === "producao"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-sky-100 text-sky-800",
              )}
            >
              {!data.config.temToken
                ? "Emissor de notas desligado"
                : data.config.ambiente === "producao"
                  ? "Notas valendo (produção)"
                  : "Notas em modo teste (sem valor fiscal)"}
            </span>
            {data.config.temToken && data.config.auto && (
              <span className="rounded-full bg-violet-100 px-2.5 py-1 font-semibold text-violet-800">
                <Sparkles className="mr-1 inline h-3 w-3" />
                Emissão automática ligada
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAno(ano - 1)}
              aria-label="Ano anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-sm font-semibold">{ano}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setAno(ano + 1)}
              disabled={ano >= new Date().getFullYear()}
              aria-label="Próximo ano"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <Button variant="outline" onClick={() => setConfig(true)}>
            <Settings className="mr-1.5 h-4 w-4" /> Configurar
          </Button>
        </div>
      </header>

      <ProximosPassos passos={data.passos} abrirConfig={() => setConfig(true)} />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <CardLimite d={data} />
        <CardDas d={data} />
        <CardNotas d={data} />
        <CardLucro d={data} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <GraficoLimite d={data} />
        <GraficoMeses d={data} abrirRelatorio={setRelatorio} />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <CardImpostoRenda d={data} />
        <Calendario d={data} />
      </div>

      <VendasComNota d={data} />

      {!data.config.temToken && <GuiaEmissor />}

      {config && <DialogoConfig fechar={() => setConfig(false)} />}
      {relatorio && <DialogoRelatorio mes={relatorio} fechar={() => setRelatorio(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------- próximo passo
function ProximosPassos({
  passos,
  abrirConfig,
}: {
  passos: Painel["passos"];
  abrirConfig: () => void;
}) {
  const icone = {
    urgente: <AlertTriangle className="h-5 w-5 text-red-600" />,
    fazer: <CircleDashed className="h-5 w-5 text-amber-600" />,
    ok: <CheckCircle2 className="h-5 w-5 text-emerald-600" />,
  };
  return (
    <Card className="overflow-hidden">
      <div className="border-b bg-gradient-to-r from-primary/10 to-transparent px-5 py-3">
        <h2 className="flex items-center gap-2 font-bold">
          <Sparkles className="h-4 w-4 text-primary" /> Seu próximo passo
        </h2>
      </div>
      <ol className="divide-y">
        {passos.map((p, i) => (
          <li key={p.id} className="flex gap-3 px-5 py-3">
            <span className="mt-0.5 shrink-0">{icone[p.nivel]}</span>
            <div className="min-w-0 flex-1">
              <p className={cn("font-semibold", i === 0 && p.nivel !== "ok" && "text-base")}>
                {p.titulo}
              </p>
              <p className="text-sm text-muted-foreground">{p.texto}</p>
            </div>
            {(p.id === "cnpj" || p.id === "emissor") && (
              <Button size="sm" variant="outline" onClick={abrirConfig} className="shrink-0">
                Fazer agora
              </Button>
            )}
            {p.id === "custos" && (
              <Link to="/admin/financeiro">
                <Button size="sm" variant="outline" className="shrink-0">
                  Abrir
                </Button>
              </Link>
            )}
          </li>
        ))}
      </ol>
    </Card>
  );
}

// ---------------------------------------------------------------- cards
function CardBase({
  icone,
  titulo,
  children,
  className,
}: {
  icone: React.ReactNode;
  titulo: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("flex flex-col gap-3 p-5", className)}>
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {icone} {titulo}
      </p>
      {children}
    </Card>
  );
}

const COR_NIVEL: Record<string, string> = {
  ok: "bg-emerald-500",
  atencao: "bg-amber-500",
  alerta: "bg-orange-500",
  passou: "bg-red-500",
  grave: "bg-red-700",
};
function CardLimite({ d }: { d: Painel }) {
  const l = d.limite;
  const largura = Math.min(100, l.pct);
  return (
    <CardBase icone={<Gauge className="h-4 w-4" />} titulo="Limite do MEI no ano">
      {l.valor ? (
        <>
          <p className="text-3xl font-bold tabular-nums">{l.pct.toFixed(0)}%</p>
          <div
            className="relative h-3 overflow-hidden rounded-full bg-muted"
            role="meter"
            aria-valuenow={l.pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Limite do MEI usado"
          >
            <div
              className={cn("h-full rounded-full", COR_NIVEL[l.nivel])}
              style={{ width: `${largura}%` }}
            />
          </div>
          <p className="text-sm">
            <b>{brl(l.usado)}</b> de {brl(l.valor, 0)}
          </p>
          <p className="text-xs text-muted-foreground">
            Pode vender ainda <b>{brl(Math.max(0, l.valor - l.usado))}</b> este ano.
            {l.estouraEm
              ? ` No ritmo atual, passa do limite em ${nomeMes(l.estouraEm)}.`
              : l.usado
                ? ` No ritmo atual, fecha o ano com ${curto(l.previsao)}.`
                : ""}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          Coloque a data de abertura do MEI em <b>Configurar</b> para calcular o limite (no primeiro
          ano ele é menor: R$ 6.750 por mês).
        </p>
      )}
    </CardBase>
  );
}

function CardDas({ d }: { d: Painel }) {
  const qc = useQueryClient();
  const p = d.das.proximo;
  const marcar = async (pago: boolean) => {
    if (!p) return;
    await marcarDasFn({ data: { competencia: p.competencia, pago } });
    qc.invalidateQueries({ queryKey: ["fiscal"] });
    toast.success("DAS marcado como pago");
  };
  return (
    <CardBase icone={<CalendarClock className="h-4 w-4" />} titulo="Imposto do mês (DAS)">
      {p ? (
        <>
          <p className="text-3xl font-bold tabular-nums">{brl(d.das.valor)}</p>
          <p className={cn("text-sm", p.atrasado && "font-semibold text-red-600")}>
            {p.atrasado ? "Atrasado! Venceu em " : "Vence em "}
            {dataBR(p.vence)} · referente a {nomeMes(p.competencia)}
          </p>
          <p className="text-xs text-muted-foreground">
            Valor fixo: não muda com quanto você vende. Inclui seu INSS (aposentadoria).
          </p>
          <div className="mt-auto flex flex-wrap gap-2">
            <a
              href="https://www8.receita.fazenda.gov.br/SimplesNacional/Aplicacoes/ATSPO/pgmei.app/Identificacao"
              target="_blank"
              rel="noreferrer"
            >
              <Button size="sm" variant="outline">
                Gerar guia <ExternalLink className="ml-1 h-3 w-3" />
              </Button>
            </a>
            <Button size="sm" onClick={() => marcar(true)}>
              <CheckCircle2 className="mr-1 h-4 w-4" /> Já paguei
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="flex items-center gap-2 text-lg font-semibold text-emerald-700">
            <BadgeCheck className="h-5 w-5" /> Tudo pago
          </p>
          <p className="text-xs text-muted-foreground">
            O próximo DAS ({brl(d.das.valor)}) aparece aqui no começo do mês.
          </p>
        </>
      )}
    </CardBase>
  );
}

function CardNotas({ d }: { d: Painel }) {
  const vendasAno = d.meses.reduce((s, m) => s + m.vendas, 0);
  return (
    <CardBase icone={<Receipt className="h-4 w-4" />} titulo="Notas fiscais">
      <p className="text-3xl font-bold tabular-nums">
        {d.notas.emitidas}
        <span className="text-base font-normal text-muted-foreground"> emitidas</span>
      </p>
      <p className="text-sm">
        {vendasAno} venda(s) no Brasil em {d.ano}
        {d.notas.recusadas ? (
          <span className="font-semibold text-red-600"> · {d.notas.recusadas} recusada(s)</span>
        ) : null}
      </p>
      <p className="text-xs text-muted-foreground">
        {d.config.temToken
          ? d.config.auto
            ? "Cada venda do Brasil com CPF/CNPJ e endereço completos ganha a nota sozinha, e o cliente recebe o PDF por e-mail."
            : "Emissão automática desligada: use o botão «Emitir nota» em cada venda."
          : "Conecte o emissor (passo a passo no fim da página) para as notas saírem sozinhas."}
      </p>
    </CardBase>
  );
}

function CardLucro({ d }: { d: Painel }) {
  return (
    <CardBase icone={<Wallet className="h-4 w-4" />} titulo={`Lucro em ${d.ano}`}>
      <p className={cn("text-3xl font-bold tabular-nums", d.ir.lucroAno < 0 && "text-red-600")}>
        {brl(d.ir.lucroAno)}
      </p>
      <p className="text-sm">Vendeu {brl(d.ir.receitaAno)} no Brasil</p>
      <p className="text-xs text-muted-foreground">
        Vendas menos o custo das peças, frete, taxas e despesas em reais. É o que você pode tirar
        para você.
      </p>
    </CardBase>
  );
}

// ---------------------------------------------------------------- gráficos
function Dica({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: p.color }} />
          {p.name}: <b className="tabular-nums">{brl(p.value)}</b>
        </p>
      ))}
    </div>
  );
}

function GraficoLimite({ d }: { d: Painel }) {
  // Vendido até hoje (área) e, daqui até dezembro, a previsão no ritmo atual (tracejada)
  const pontos = useMemo(() => {
    const hoje = d.hoje.slice(0, 7);
    let acum = 0;
    let prev = 0;
    return d.meses
      .filter((m) => m.mes >= d.limite.inicio)
      .map((m) => {
        const r2 = (v: number) => Math.round(v * 100) / 100;
        if (m.mes <= hoje) {
          acum += m.receita;
          prev = acum;
          return {
            mes: nomeMes(m.mes),
            acumulado: r2(acum),
            ...(m.mes === hoje && { previsao: r2(acum) }),
          };
        }
        prev += d.limite.mediaMes;
        return { mes: nomeMes(m.mes), previsao: r2(prev) };
      });
  }, [d]);
  return (
    <Card className="p-5">
      <h3 className="font-bold">Quanto do limite você já usou</h3>
      <p className="mb-3 text-xs text-muted-foreground">
        Vendas do Brasil somadas desde a abertura (ou janeiro). A linha azul tracejada é a previsão
        no ritmo atual; a laranja, o limite do MEI {d.ano}; a pontilhada, o máximo de 20% a mais.
      </p>
      <div className="h-64">
        <ResponsiveContainer>
          <AreaChart data={pontos} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--grade)" vertical={false} />
            <XAxis dataKey="mes" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis
              tickFormatter={curto}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              width={72}
              domain={[0, (max: number) => Math.max(max, d.limite.tolerancia || max) * 1.05]}
            />
            <Tooltip content={<Dica />} />
            <Area
              type="monotone"
              dataKey="acumulado"
              name="Vendido no ano"
              stroke="var(--com)"
              strokeWidth={2}
              fill="var(--com)"
              fillOpacity={0.15}
              dot={{ r: 4, strokeWidth: 2 }}
            />
            <Area
              type="monotone"
              dataKey="previsao"
              name="Previsão no ritmo atual"
              stroke="var(--com)"
              strokeWidth={2}
              strokeDasharray="5 5"
              fill="none"
              dot={false}
            />
            {!!d.limite.valor && (
              <ReferenceLine
                y={d.limite.valor}
                stroke="var(--lim)"
                strokeDasharray="6 4"
                strokeWidth={2}
                label={{
                  value: `Limite ${curto(d.limite.valor)}`,
                  position: "insideTopLeft",
                  fontSize: 11,
                  fill: "var(--tinta)",
                }}
              />
            )}
            {!!d.limite.valor && (
              <ReferenceLine y={d.limite.tolerancia} stroke="var(--lim)" strokeDasharray="2 4" />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function GraficoMeses({ d, abrirRelatorio }: { d: Painel; abrirRelatorio: (m: string) => void }) {
  // Do mês de abertura do MEI até dezembro
  const dados = d.meses
    .filter((m) => m.mes >= d.limite.inicio)
    .map((m) => ({ ...m, nome: nomeMes(m.mes) }));
  const mesAtual = d.hoje.slice(0, 7);
  const mesRel = d.meses.some((m) => m.mes === mesAtual) ? mesAtual : `${d.ano}-12`;
  return (
    <Card className="p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="font-bold">Vendas do Brasil mês a mês</h3>
          <p className="text-xs text-muted-foreground">
            Com nota fiscal e sem nota (venda a pessoa física dispensa).
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => abrirRelatorio(mesRel)}>
          <FileText className="mr-1 h-4 w-4" /> Relatório do mês
        </Button>
      </div>
      <div className="mb-2 flex gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--com)" }} /> Com nota
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: "var(--sem)" }} /> Sem nota
        </span>
      </div>
      <div className="h-56">
        <ResponsiveContainer>
          <BarChart data={dados} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="var(--grade)" vertical={false} />
            <XAxis dataKey="nome" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis
              tickFormatter={curto}
              tickLine={false}
              axisLine={false}
              fontSize={11}
              width={72}
            />
            <Tooltip content={<Dica />} cursor={{ fill: "var(--grade)" }} />
            <Bar
              dataKey="comNota"
              name="Com nota"
              stackId="a"
              fill="var(--com)"
              stroke="var(--background, #fff)"
              strokeWidth={1}
            />
            <Bar
              dataKey="semNota"
              name="Sem nota"
              stackId="a"
              fill="var(--sem)"
              radius={[4, 4, 0, 0]}
              stroke="var(--background, #fff)"
              strokeWidth={1}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- imposto de renda e calendário
function CardImpostoRenda({ d }: { d: Painel }) {
  const ir = d.ir;
  const linhas = [
    {
      t: "Você vendeu",
      v: ir.receitaAno,
      x: "É o número da declaração anual do MEI (DASN-SIMEI).",
    },
    {
      t: "Lucro (livro caixa)",
      v: ir.lucroAno,
      x: "Vendas menos custos e despesas. Este painel é o seu livro caixa.",
    },
    {
      t: "Pode tirar sem imposto",
      v: ir.isentoLivroCaixa,
      x: `Sem livro caixa seriam só 8% das vendas (${brl(ir.isentoPresumido)}). Com ele, o lucro inteiro comprovado fica isento.`,
    },
  ];
  return (
    <Card className="p-5 xl:col-span-2">
      <h3 className="flex items-center gap-2 font-bold">
        <ShieldCheck className="h-4 w-4 text-primary" /> Imposto de renda, em 3 números
      </h3>
      <p className="mb-4 text-xs text-muted-foreground">
        O MEI não paga imposto de renda sobre as vendas (já está no DAS). O que você retira para
        você entra na sua declaração pessoal: a parte isenta não paga nada.
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {linhas.map((l, i) => (
          <div
            key={l.t}
            className={cn(
              "rounded-xl border p-4",
              i === 2 && "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30",
            )}
          >
            <p className="text-xs font-semibold text-muted-foreground">{l.t}</p>
            <p className="my-1 text-xl font-bold tabular-nums">{brl(l.v)}</p>
            <p className="text-xs text-muted-foreground">{l.x}</p>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Declaração anual do MEI até <b>{dataBR(ir.prazoDasn)}</b> no Portal do Empreendedor. Se a
        parte tributável (o que retirar acima do isento, somado a outras rendas) passar do limite da
        Receita, você também faz a declaração de pessoa física.
      </p>
    </Card>
  );
}

function Calendario({ d }: { d: Painel }) {
  const qc = useQueryClient();
  const alternar = async (competencia: string, pago: boolean) => {
    await marcarDasFn({ data: { competencia, pago } });
    qc.invalidateQueries({ queryKey: ["fiscal"] });
  };
  return (
    <Card className="p-5">
      <h3 className="flex items-center gap-2 font-bold">
        <CalendarClock className="h-4 w-4 text-primary" /> Guias do DAS em {d.ano}
      </h3>
      <ul className="mt-3 space-y-2">
        {d.das.guias.map((g) => (
          <li key={g.competencia} className="flex items-center justify-between gap-2 text-sm">
            <span>
              <b className="capitalize">{nomeMes(g.competencia)}</b>{" "}
              <span className="text-xs text-muted-foreground">vence {dataBR(g.vence)}</span>
            </span>
            <button
              type="button"
              onClick={() => alternar(g.competencia, !g.pagoEm)}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                g.pagoEm
                  ? "bg-emerald-100 text-emerald-800"
                  : g.atrasado
                    ? "bg-red-100 text-red-700"
                    : "bg-amber-100 text-amber-800",
              )}
              title={g.pagoEm ? "Clique para desmarcar" : "Clique quando pagar"}
            >
              {g.pagoEm ? `Pago ${dataBR(g.pagoEm)}` : g.atrasado ? "Atrasado" : "A pagar"}
            </button>
          </li>
        ))}
        {!d.das.guias.length && (
          <li className="text-sm text-muted-foreground">Nenhuma guia neste ano.</li>
        )}
        <li className="flex items-center justify-between gap-2 border-t pt-2 text-sm">
          <span>
            <b>Declaração anual (DASN)</b>{" "}
            <span className="text-xs text-muted-foreground">até {dataBR(d.ir.prazoDasn)}</span>
          </span>
          <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-xs font-semibold text-sky-800">
            Uma vez por ano
          </span>
        </li>
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------- vendas e notas
const COR_STATUS: Record<StatusNota, string> = {
  PROCESSANDO: "bg-sky-100 text-sky-800",
  AUTORIZADA: "bg-emerald-100 text-emerald-800",
  ERRO: "bg-red-100 text-red-700",
  CANCELADA: "bg-zinc-200 text-zinc-600",
};
function VendasComNota({ d }: { d: Painel }) {
  const qc = useQueryClient();
  const [emitindo, setEmitindo] = useState<number | null>(null);
  const [cancelar, setCancelar] = useState<{ id: number; numero: string | null } | null>(null);
  const emitir = async (vendaId: number) => {
    setEmitindo(vendaId);
    try {
      const r = await emitirNotaFn({ data: { vendaId } });
      if (r.status === "AUTORIZADA") toast.success(`Nota ${r.numero ?? ""} emitida`);
      else if (r.status === "ERRO") toast.error(r.mensagem || "Nota recusada");
      else toast.info("Enviada à Receita: a resposta chega em instantes.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setEmitindo(null);
      qc.invalidateQueries({ queryKey: ["fiscal"] });
    }
  };
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3">
        <h3 className="flex items-center gap-2 font-bold">
          <Receipt className="h-4 w-4 text-primary" /> Vendas do Brasil e suas notas
        </h3>
        <Link to="/admin/vendas">
          <Button size="sm" variant="outline">
            Lançar venda
          </Button>
        </Link>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-3">Venda</th>
              <th className="p-3">Cliente</th>
              <th className="p-3 text-right">Valor</th>
              <th className="p-3">Nota fiscal</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {d.vendas.map((v) => (
              <tr
                key={v.id}
                className={cn("border-t align-top", v.status === "CANCELADA" && "opacity-50")}
              >
                <td className="p-3">
                  <p className="font-mono text-xs">{v.codigo}</p>
                  <p className="text-xs text-muted-foreground">{dataBR(v.data.slice(0, 10))}</p>
                </td>
                <td className="p-3">
                  <p className="font-medium">{v.cliente}</p>
                  <p className="text-xs text-muted-foreground">
                    {[v.cidade, v.uf].filter(Boolean).join(" – ")}
                    {v.doc ? ` · ${v.doc}` : ""}
                  </p>
                </td>
                <td className="p-3 text-right tabular-nums">
                  {v.moeda === "BRL" ? brl(v.total) : `$U ${Math.round(v.total)}`}
                </td>
                <td className="p-3">
                  {v.nota ? (
                    <div className="space-y-1">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                          COR_STATUS[v.nota.status],
                        )}
                      >
                        {v.nota.status === "PROCESSANDO" && (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        )}
                        {v.nota.status === "AUTORIZADA" && <CheckCircle2 className="h-3 w-3" />}
                        {v.nota.status === "ERRO" && <XCircle className="h-3 w-3" />}
                        {NOME_STATUS[v.nota.status]}
                        {v.nota.numero ? ` nº ${v.nota.numero}` : ""}
                      </span>
                      {v.nota.ambiente !== "producao" && (
                        <p className="text-[11px] text-sky-700">teste, sem valor fiscal</p>
                      )}
                      {v.nota.status === "AUTORIZADA" && (
                        <p className="text-[11px] text-muted-foreground">
                          {v.nota.automatica ? "Saiu sozinha" : "Emitida à mão"}
                          {v.nota.emailEnviado ? " · PDF enviado ao cliente" : ""}
                        </p>
                      )}
                      {v.nota.mensagem && v.nota.status === "ERRO" && (
                        <p className="max-w-xs text-xs text-red-700">{v.nota.mensagem}</p>
                      )}
                    </div>
                  ) : v.status === "CANCELADA" ? (
                    <span className="text-xs text-muted-foreground">Venda cancelada</span>
                  ) : v.falta.length ? (
                    <p className="max-w-xs text-xs text-amber-800">Falta: {v.falta.join(", ")}</p>
                  ) : (
                    <span className="text-xs text-muted-foreground">Pronta para emitir</span>
                  )}
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    {v.nota?.status === "AUTORIZADA" && v.nota.danfe && (
                      <>
                        <a href={v.nota.danfe} target="_blank" rel="noreferrer">
                          <Button size="sm" variant="outline">
                            <Printer className="mr-1 h-3.5 w-3.5" /> PDF
                          </Button>
                        </a>
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(`Olá ${v.cliente.split(" ")[0]}! Segue a nota fiscal da sua compra na AGRO PARTS: ${v.nota.danfe}`)}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <Button
                            size="sm"
                            variant="outline"
                            aria-label="Mandar a nota no WhatsApp"
                          >
                            <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                          </Button>
                        </a>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600"
                          onClick={() => setCancelar({ id: v.nota!.id, numero: v.nota!.numero })}
                        >
                          Cancelar
                        </Button>
                      </>
                    )}
                    {(!v.nota || v.nota.status === "ERRO" || v.nota.status === "CANCELADA") &&
                      v.status !== "CANCELADA" &&
                      d.config.temToken &&
                      !v.falta.length && (
                        <Button size="sm" onClick={() => emitir(v.id)} disabled={emitindo === v.id}>
                          {emitindo === v.id ? (
                            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Receipt className="mr-1 h-3.5 w-3.5" />
                          )}
                          {v.nota ? "Emitir de novo" : "Emitir nota"}
                        </Button>
                      )}
                  </div>
                </td>
              </tr>
            ))}
            {!d.vendas.length && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-sm text-muted-foreground">
                  Nenhuma venda do Brasil em {d.ano}. Lance em <b>Vendas</b> com o país «Brasil».
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {cancelar && <DialogoCancelar nota={cancelar} fechar={() => setCancelar(null)} />}
    </Card>
  );
}

function DialogoCancelar({
  nota,
  fechar,
}: {
  nota: { id: number; numero: string | null };
  fechar: () => void;
}) {
  const qc = useQueryClient();
  const [motivo, setMotivo] = useState("");
  const [indo, setIndo] = useState(false);
  const ir = async () => {
    setIndo(true);
    try {
      await cancelarNotaFn({ data: { id: nota.id, justificativa: motivo } });
      toast.success("Nota cancelada");
      qc.invalidateQueries({ queryKey: ["fiscal"] });
      fechar();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIndo(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && fechar()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cancelar a nota {nota.numero ?? ""}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Dá para cancelar até 24 horas depois de emitir. Escreva o motivo (a Receita pede pelo
          menos 15 letras), por exemplo: «Cliente desistiu da compra» ou «Valor da peça errado».
        </p>
        <Input
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          placeholder="Motivo do cancelamento"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={fechar}>
            Voltar
          </Button>
          <Button variant="destructive" onClick={ir} disabled={indo || motivo.trim().length < 15}>
            {indo && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Cancelar nota
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------- relatório mensal
function DialogoRelatorio({ mes, fechar }: { mes: string; fechar: () => void }) {
  const { data } = useQuery({
    queryKey: ["fiscal-relatorio", mes],
    queryFn: () => relatorioMensalFn({ data: { mes } }),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Relatório Mensal das Receitas Brutas</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground">
          O MEI precisa preencher este relatório todo mês e guardar junto com as notas de compra
          (não envia para ninguém). Imprima ou salve em PDF.
        </p>
        {data ? (
          <div
            id="relatorio-mei"
            className="space-y-3 rounded-lg border bg-white p-5 text-sm text-black"
          >
            <p className="text-center font-bold">RELATÓRIO MENSAL DAS RECEITAS BRUTAS</p>
            <p>
              CNPJ: <b>{data.cnpj ? fmtCnpj(data.cnpj) : "_______________"}</b>
              {data.razao ? ` · ${data.razao}` : ""}
            </p>
            <p>
              Período de apuração: <b className="capitalize">{data.nomeMes}</b>
            </p>
            <table className="w-full border-collapse text-sm">
              <tbody>
                {[
                  ["RECEITA BRUTA MENSAL – REVENDA DE MERCADORIAS (COMÉRCIO)", null],
                  [
                    "I – Revenda de mercadorias com dispensa de emissão de documento fiscal",
                    data.semNota,
                  ],
                  ["II – Revenda de mercadorias com documento fiscal emitido", data.comNota],
                  ["III – Total das receitas com revenda de mercadorias (I + II)", data.total],
                ].map(([t, v]) => (
                  <tr key={String(t)} className="border">
                    <td
                      className={cn("border p-2", v == null && "font-bold")}
                      colSpan={v == null ? 2 : 1}
                    >
                      {t}
                    </td>
                    {v != null && (
                      <td className="w-36 border p-2 text-right tabular-nums">
                        {brl(v as number)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs">
              Venda de produtos industrializados e prestação de serviços: R$ 0,00 (não se aplica).
            </p>
            <p className="pt-6">Local e data: Santa Vitória do Palmar – RS, ____/____/______</p>
            <p className="pt-6">Assinatura do empresário: ________________________________</p>
          </div>
        ) : (
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        )}
        <div className="flex justify-end gap-2">
          <Button
            onClick={() => {
              const el = document.getElementById("relatorio-mei");
              const w = window.open("", "_blank");
              if (!el || !w) return;
              w.document.write(
                `<!doctype html><html><head><meta charset="utf-8"><title>Relatório ${mes}</title><style>body{font-family:Arial,sans-serif;padding:32px}table{border-collapse:collapse;width:100%}td{border:1px solid #333;padding:8px}td:last-child{text-align:right}</style></head><body>${el.innerHTML}</body></html>`,
              );
              w.document.close();
              w.print();
            }}
          >
            <Printer className="mr-1 h-4 w-4" /> Imprimir / PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------- conectar o emissor
function GuiaEmissor() {
  const passos = [
    {
      t: "Inscrição estadual no RS",
      x: "Para emitir NF-e, o MEI precisa de inscrição estadual. Peça na Receita Estadual do RS (site receita.fazenda.rs.gov.br) ou na Sala do Empreendedor de Santa Vitória do Palmar, que faz de graça.",
    },
    {
      t: "Certificado digital A1 do CNPJ",
      x: "É a «assinatura» das notas. Compre o e-CNPJ modelo A1 (arquivo, vale 1 ano, cerca de R$ 150 a 250) em uma certificadora. A validação da sua identidade é por vídeo ou presencial.",
    },
    {
      t: "Conta na Focus NFe",
      x: "Crie a conta em focusnfe.com.br, cadastre a empresa (CNPJ e inscrição estadual) e envie o arquivo do certificado no painel dela. Ela manda as notas para a Receita.",
    },
    {
      t: "Cole o token aqui",
      x: "Na Focus, copie o token de homologação (teste) e cole em Configurar. Faça uma venda de teste: a nota sai «sem valor fiscal». Funcionou? Troque para o token de produção e o modo «valendo».",
    },
  ];
  return (
    <Card className="p-5">
      <h3 className="flex items-center gap-2 font-bold">
        <Sparkles className="h-4 w-4 text-primary" /> Para as notas saírem sozinhas: 4 passos, uma
        vez só
      </h3>
      <p className="mb-4 text-xs text-muted-foreground">
        Estes passos só você pode fazer (envolvem seus documentos). Depois disso, cada venda do
        Brasil com CPF/CNPJ e endereço completos gera a nota e o cliente recebe o PDF por e-mail.
      </p>
      <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {passos.map((p, i) => (
          <li key={p.t} className="rounded-xl border p-4">
            <span className="mb-2 inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {i + 1}
            </span>
            <p className="font-semibold">{p.t}</p>
            <p className="mt-1 text-xs text-muted-foreground">{p.x}</p>
          </li>
        ))}
      </ol>
    </Card>
  );
}

// ---------------------------------------------------------------- configurar
function DialogoConfig({ fechar }: { fechar: () => void }) {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["fiscal-config"], queryFn: () => configFiscalFn() });
  const [f, setF] = useState<any>(null);
  const [token, setToken] = useState("");
  const [salvando, setSalvando] = useState(false);
  useEffect(() => {
    if (data && !f) setF(data);
  }, [data, f]);
  if (!f)
    return (
      <Dialog open onOpenChange={(o) => !o && fechar()}>
        <DialogContent>
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        </DialogContent>
      </Dialog>
    );
  const set = (p: any) => setF((x: any) => ({ ...x, ...p }));
  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarConfigFiscalFn({
        data: {
          cnpj: f.cnpj,
          razao: f.razao,
          abertura: f.abertura,
          atividade: f.atividade,
          ie: f.ie,
          ambiente: f.ambiente,
          auto: f.auto,
          emailCliente: f.emailCliente,
          ncmPadrao: f.ncmPadrao,
          ncmCategorias: f.ncmCategorias,
          ...(token.trim() && { token: token.trim() }),
        },
      });
      toast.success("Configuração salva");
      qc.invalidateQueries({ queryKey: ["fiscal"] });
      qc.invalidateQueries({ queryKey: ["fiscal-config"] });
      fechar();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSalvando(false);
    }
  };
  const categorias = Object.keys({ ...NCM_SUGERIDO, ...f.ncmCategorias });
  return (
    <Dialog open onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Configurar o fiscal</DialogTitle>
        </DialogHeader>
        <section className="space-y-3">
          <h4 className="text-sm font-bold">Seu MEI (está no cartão CNPJ)</h4>
          <div className="grid gap-3 sm:grid-cols-2">
            <Rotulo r="CNPJ">
              <Input
                value={f.cnpj}
                onChange={(e) => set({ cnpj: e.target.value })}
                placeholder="00.000.000/0001-00"
              />
            </Rotulo>
            <Rotulo r="Data de abertura">
              <Input
                type="date"
                value={f.abertura}
                onChange={(e) => set({ abertura: e.target.value })}
              />
            </Rotulo>
            <Rotulo r="Nome empresarial" className="sm:col-span-2">
              <Input value={f.razao} onChange={(e) => set({ razao: e.target.value })} />
            </Rotulo>
            <div className="space-y-1 sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">
                Atividades do CNPJ (definem o valor do DAS)
              </span>
              <div className="grid gap-2 sm:grid-cols-3">
                {(Object.keys(DAS_MEI) as AtividadeMei[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => set({ atividade: k })}
                    className={cn(
                      "rounded-lg border p-2 text-left text-sm",
                      f.atividade === k && "border-primary bg-primary/5 ring-1 ring-primary",
                    )}
                  >
                    <b>{NOME_ATIVIDADE[k]}</b>
                    <span className="block text-xs text-muted-foreground">
                      DAS {brl(DAS_MEI[k])}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <Rotulo r="Inscrição estadual (RS)">
              <Input
                value={f.ie}
                onChange={(e) => set({ ie: e.target.value })}
                placeholder="quando tiver"
              />
            </Rotulo>
          </div>
        </section>
        <section className="space-y-3 border-t pt-4">
          <h4 className="text-sm font-bold">Emissor de notas (Focus NFe)</h4>
          <Rotulo
            r={
              data?.tokenDoAmbiente
                ? "Token (definido no servidor)"
                : data?.temToken
                  ? `Token salvo (termina em …${data.tokenFinal}). Cole outro para trocar`
                  : "Token da Focus NFe"
            }
          >
            <Input
              type="password"
              autoComplete="off"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              disabled={data?.tokenDoAmbiente}
            />
          </Rotulo>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["homologacao", "Modo teste", "Notas sem valor fiscal, para conferir"],
                ["producao", "Valendo", "Notas de verdade, na Receita"],
              ] as const
            ).map(([k, t, x]) => (
              <button
                key={k}
                type="button"
                onClick={() => set({ ambiente: k })}
                className={cn(
                  "rounded-lg border p-3 text-left",
                  f.ambiente === k && "border-primary bg-primary/5 ring-1 ring-primary",
                )}
              >
                <p className="text-sm font-semibold">{t}</p>
                <p className="text-xs text-muted-foreground">{x}</p>
              </button>
            ))}
          </div>
          <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <span>
              <span className="block text-sm font-semibold">Emitir sozinho</span>
              <span className="text-xs text-muted-foreground">
                Venda do Brasil salva com CPF/CNPJ e endereço completos → nota emitida na hora
              </span>
            </span>
            <Switch checked={f.auto} onCheckedChange={(v) => set({ auto: v })} />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-lg border p-3">
            <span>
              <span className="block text-sm font-semibold">Mandar a nota ao cliente</span>
              <span className="text-xs text-muted-foreground">
                PDF e XML por e-mail, quando a venda tem e-mail
              </span>
            </span>
            <Switch checked={f.emailCliente} onCheckedChange={(v) => set({ emailCliente: v })} />
          </label>
        </section>
        <section className="space-y-3 border-t pt-4">
          <h4 className="text-sm font-bold">NCM das peças (código fiscal da mercadoria)</h4>
          <p className="text-xs text-muted-foreground">
            As peças do catálogo ainda não têm NCM próprio, então vale o da categoria. Para o MEI o
            imposto não muda; confirme os códigos com um contador quando puder.
          </p>
          <Rotulo r="Padrão (todas as outras peças)">
            <Input value={f.ncmPadrao} onChange={(e) => set({ ncmPadrao: e.target.value })} />
          </Rotulo>
          <div className="grid gap-2 sm:grid-cols-2">
            {categorias.map((c) => (
              <Rotulo key={c} r={c}>
                <Input
                  value={f.ncmCategorias[c] ?? ""}
                  onChange={(e) =>
                    set({ ncmCategorias: { ...f.ncmCategorias, [c]: e.target.value } })
                  }
                />
              </Rotulo>
            ))}
          </div>
        </section>
        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="ghost" onClick={fechar}>
            Fechar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1 h-4 w-4" />
            )}
            Salvar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Rotulo({
  r,
  children,
  className,
}: {
  r: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-1", className)}>
      <span className="text-xs font-medium text-muted-foreground">{r}</span>
      {children}
    </label>
  );
}
