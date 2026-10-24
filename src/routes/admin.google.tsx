import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Search,
  RefreshCw,
  Loader2,
  Link2,
  Unplug,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Target,
  FileText,
  Globe2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  estadoGscFn,
  relatorioGscFn,
  sincronizarGscFn,
  sitesGscFn,
  escolherSiteGscFn,
  desconectarGscFn,
} from "@/lib/search-console";
import { gerarPalavras } from "@/lib/palavras-chave";
import { cn } from "@/lib/utils";
import { leadsOrganicosFn, velocidadeFn } from "@/lib/analises";

// Admin → Posições no Google: dados do Search Console (cliques, impressões, posição média, buscas
// e páginas), importados todo dia e guardados para comparar períodos.
export const Route = createFileRoute("/admin/google")({
  validateSearch: z.object({ gsc: z.string().optional(), msg: z.string().optional() }),
  component: PosicoesGoogle,
});

const PAISES: Record<string, string> = {
  ury: "Uruguai",
  bra: "Brasil",
  arg: "Argentina",
  pry: "Paraguai",
  usa: "Estados Unidos",
  chl: "Chile",
  esp: "Espanha",
  prt: "Portugal",
  bol: "Bolívia",
  mex: "México",
  col: "Colômbia",
  per: "Peru",
};
const n = (v: number) => v.toLocaleString("pt-BR");
const pct = (v: number) => `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const pos = (v: number | null) =>
  v == null
    ? "—"
    : v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const dataBR = (d: string) => d.split("-").reverse().slice(0, 2).join("/");
const semAcento = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

function PosicoesGoogle() {
  const { gsc, msg } = Route.useSearch();
  const qc = useQueryClient();
  const [dias, setDias] = useState(28);
  const [pais, setPais] = useState("*");
  useEffect(() => {
    if (gsc === "ok") toast.success("Search Console conectado. Importando o histórico…");
    if (gsc === "erro") toast.error(msg || "Não foi possível conectar.");
  }, [gsc, msg]);

  const estado = useQuery({
    queryKey: ["gsc-estado"],
    queryFn: () => estadoGscFn(),
    refetchInterval: 20_000,
  });
  const conectado = !!estado.data?.conectado;
  const rel = useQuery({
    queryKey: ["gsc-rel", dias, pais],
    queryFn: () => relatorioGscFn({ data: { dias, pais } }),
    enabled: conectado,
    refetchInterval: (q) => (q.state.data ? false : 15_000), // enquanto importa
  });
  const [ocupado, setOcupado] = useState(false);
  const atualizar = async () => {
    setOcupado(true);
    try {
      const r = await sincronizarGscFn();
      toast.success(`Atualizado: ${r.dias} dias, ${n(r.consultas)} linhas de buscas`);
      qc.invalidateQueries({ queryKey: ["gsc-rel"] });
      qc.invalidateQueries({ queryKey: ["gsc-estado"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-zinc-900">
            <TrendingUp className="h-6 w-6 text-primary" /> Posições no Google
          </h1>
          <p className="text-sm text-zinc-500">
            Dados do Google Search Console: como o site aparece nas buscas, quais termos trazem
            clientes e quanto subimos.
          </p>
        </div>
        {conectado && (
          <div className="flex flex-wrap gap-2">
            {[7, 28, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDias(d)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-sm font-semibold",
                  dias === d
                    ? "bg-primary text-white"
                    : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
                )}
              >
                {d} dias
              </button>
            ))}
            <select
              value={pais}
              onChange={(e) => setPais(e.target.value)}
              className="rounded-full border bg-white px-3 py-1.5 text-sm font-semibold"
            >
              <option value="*">Todos os países</option>
              <option value="ury">Uruguai</option>
              <option value="bra">Brasil</option>
            </select>
          </div>
        )}
      </div>

      <Conexao estado={estado.data} atualizar={atualizar} ocupado={ocupado} />

      {conectado && rel.isLoading && (
        <p className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </p>
      )}
      {conectado && !rel.isLoading && !rel.data && (
        <Card className="flex items-center gap-3 p-5 text-sm text-zinc-600">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          Importando o histórico do Search Console (até 16 meses). Leva de 1 a 2 minutos; esta
          página atualiza sozinha.
        </Card>
      )}
      <LeadsGoogle dias={dias} />
      <Velocidade dias={dias} />
      {rel.data && <Relatorio r={rel.data} dias={dias} />}
    </div>
  );
}

// Leads do Google: quem chegou por busca orgânica e pediu preço (WhatsApp ou cotação).
// Dados do próprio site (não dependem do Search Console).
function LeadsGoogle({ dias }: { dias: number }) {
  const q = useQuery({
    queryKey: ["leads-organicos", dias],
    queryFn: () => leadsOrganicosFn({ data: { dias } }),
  });
  const r = q.data;
  if (!r) return null;
  const pct = (v: number) => `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
  return (
    <section className="space-y-4">
      <h2 className="flex items-center gap-2 text-lg font-bold text-zinc-900">
        <Target className="h-5 w-5 text-primary" /> Leads do Google (busca orgânica)
      </h2>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { rotulo: "Visitas pela busca", valor: n(r.sessoes) },
          { rotulo: "Leads (pediram preço)", valor: n(r.leads) },
          { rotulo: "Taxa de lead", valor: pct(r.taxa) },
          { rotulo: "Cliques no WhatsApp", valor: n(r.whatsapp) },
        ].map((k) => (
          <Card key={k.rotulo} className="p-4">
            <p className="text-xs font-semibold uppercase text-zinc-500">{k.rotulo}</p>
            <p className="mt-1 text-2xl font-extrabold text-zinc-900">{k.valor}</p>
          </Card>
        ))}
      </div>
      <Card className="p-4">
        <h3 className="font-bold text-zinc-900">Por dia</h3>
        <div className="mt-2 h-56">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={r.porDia.map((d) => ({
                ...d,
                dia: d.dia.slice(5).split("-").reverse().join("/"),
              }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" vertical={false} />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} minTickGap={16} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={32} />
              <Tooltip />
              <Legend />
              <Area
                dataKey="sessoes"
                name="Visitas pela busca"
                fill="#bbf7d0"
                stroke="#16a34a"
                strokeWidth={2}
              />
              <Line dataKey="leads" name="Leads" stroke="#d97706" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-4">
          <h3 className="font-bold text-zinc-900">Páginas que trazem leads</h3>
          <p className="text-xs text-zinc-500">
            A página que o Google mostrou (por onde a pessoa entrou).
          </p>
          <Tabela
            colunas={["Página", "Visitas", "Leads"]}
            linhas={r.paginas.map((p) => [
              <a
                key={p.pagina}
                href={p.pagina}
                target="_blank"
                rel="noreferrer"
                className="hover:underline"
              >
                {p.pagina}
              </a>,
              n(p.sessoes),
              n(p.leads),
            ])}
          />
        </Card>
        <Card className="p-4">
          <h3 className="font-bold text-zinc-900">Últimos leads</h3>
          <Tabela
            colunas={["Quando", "Entrou por", "Pediu"]}
            linhas={r.recentes.map((l) => [
              new Date(l.quando).toLocaleString("pt-BR", {
                dateStyle: "short",
                timeStyle: "short",
              }) + (l.cidade ? ` · ${l.cidade}` : ""),
              l.entrada,
              `${l.acao}: ${l.dado}`,
            ])}
          />
        </Card>
      </div>
    </section>
  );
}

function Conexao({
  estado,
  atualizar,
  ocupado,
}: {
  estado?: Awaited<ReturnType<typeof estadoGscFn>>;
  atualizar: () => void;
  ocupado: boolean;
}) {
  const qc = useQueryClient();
  const sites = useQuery({
    queryKey: ["gsc-sites"],
    queryFn: () => sitesGscFn(),
    enabled: !!estado?.conectado,
    retry: false,
  });
  if (!estado) return null;
  const callback =
    typeof window !== "undefined" ? `${window.location.origin}/api/admin/google/callback` : "";

  if (!estado.credencial)
    return (
      <Card className="border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
        <p className="flex items-center gap-2 font-bold">
          <AlertTriangle className="h-4 w-4" /> Falta a credencial do Google
        </p>
        <p className="mt-1">
          Configure GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET (as mesmas do “Entrar com Google”) nas
          variáveis da Hostinger.
        </p>
      </Card>
    );

  if (!estado.conectado)
    return (
      <Card className="p-5">
        <h2 className="text-lg font-extrabold text-zinc-900">Conectar ao Search Console</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Uma vez só, com a conta Google que é dona da propriedade agropartsuy.com no Search
          Console. O acesso é <b>só de leitura</b>.
        </p>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-zinc-700">
          <li>
            No <b>Google Cloud Console</b>, no mesmo projeto do “Entrar com Google”: APIs e serviços
            → Biblioteca → ative a <b>Google Search Console API</b>.
          </li>
          <li>
            Credenciais → abra o ID do cliente OAuth do site → em “URIs de redirecionamento
            autorizados” acrescente:{" "}
            <code className="select-all rounded bg-zinc-100 px-1.5 py-0.5 text-xs">{callback}</code>
          </li>
          <li>
            Se a tela de consentimento estiver em modo “Teste”, acrescente o seu e-mail em “Usuários
            de teste”. Se o Google avisar “app não verificado”, clique em Avançado → continuar (o
            app é o próprio site).
          </li>
          <li>Clique no botão abaixo e marque a permissão do Search Console.</li>
        </ol>
        <a href="/api/admin/google/conectar">
          <Button className="mt-4 gap-2">
            <Link2 className="h-4 w-4" /> Conectar ao Search Console
          </Button>
        </a>
        {estado.erro && <p className="mt-3 text-sm font-semibold text-red-600">{estado.erro}</p>}
      </Card>
    );

  return (
    <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 p-4 text-sm">
      <span className="flex items-center gap-2 font-bold text-emerald-700">
        <span className="h-2 w-2 rounded-full bg-emerald-500" /> Conectado
      </span>
      <span className="text-zinc-600">{estado.email}</span>
      {sites.data && sites.data.length > 1 ? (
        <select
          value={estado.site ?? ""}
          onChange={async (e) => {
            if (!confirm("Trocar de propriedade? O histórico será importado de novo.")) return;
            try {
              await escolherSiteGscFn({ data: { site: e.target.value } });
              qc.invalidateQueries();
            } catch (err: any) {
              toast.error(err.message);
            }
          }}
          className="rounded-lg border px-2 py-1 text-sm"
        >
          {sites.data.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      ) : (
        <span className="font-mono text-xs text-zinc-500">{estado.site}</span>
      )}
      <span className="text-zinc-500">
        Última importação:{" "}
        {estado.ultimaSync ? new Date(estado.ultimaSync).toLocaleString("pt-BR") : "em andamento…"}
      </span>
      {estado.erro && <span className="font-semibold text-red-600">{estado.erro}</span>}
      <div className="ml-auto flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className="gap-1.5"
          onClick={atualizar}
          disabled={ocupado}
        >
          <RefreshCw className={cn("h-4 w-4", ocupado && "animate-spin")} /> Atualizar agora
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 text-zinc-500"
          onClick={async () => {
            if (!confirm("Desconectar o Search Console? O histórico já importado continua aqui."))
              return;
            await desconectarGscFn();
            qc.invalidateQueries();
          }}
        >
          <Unplug className="h-4 w-4" /> Desconectar
        </Button>
      </div>
    </Card>
  );
}

type Rel = NonNullable<Awaited<ReturnType<typeof relatorioGscFn>>>;

function Variacao({
  a,
  b,
  inverso,
  formato,
}: {
  a: number | null;
  b: number | null;
  inverso?: boolean;
  formato: (v: number) => string;
}) {
  if (a == null || b == null) return <span className="text-xs text-zinc-400">sem comparação</span>;
  const d = a - b;
  if (Math.abs(d) < 1e-9) return <span className="text-xs text-zinc-400">igual</span>;
  const melhor = inverso ? d < 0 : d > 0;
  // Posição: subir no Google = número menor, então a seta acompanha o "melhor"
  const Icone = (inverso ? melhor : d > 0) ? ArrowUp : ArrowDown;
  const rel = b ? ` (${d > 0 ? "+" : ""}${Math.round((d / b) * 100)}%)` : "";
  return (
    <span
      className={cn(
        "flex items-center gap-0.5 text-xs font-bold",
        melhor ? "text-emerald-600" : "text-red-600",
      )}
    >
      <Icone className="h-3 w-3" />
      {formato(Math.abs(d))}
      {!inverso && rel}
    </span>
  );
}

function Relatorio({ r, dias }: { r: Rel; dias: number }) {
  const [busca, setBusca] = useState("");
  const [limite, setLimite] = useState(50);
  const consultas = useMemo(
    () =>
      r.consultas
        .filter((c) => !busca || semAcento(c.chave).includes(semAcento(busca)))
        .sort(
          (a, b) => b.atual.impressoes - a.atual.impressoes || b.atual.cliques - a.atual.cliques,
        ),
    [r.consultas, busca],
  );
  // Comparáveis: apareceu nos dois períodos
  const comparaveis = r.consultas.filter(
    (c) => c.atual.posicao != null && c.anterior.posicao != null,
  );
  const subiram = [...comparaveis]
    .map((c) => ({ ...c, d: c.anterior.posicao! - c.atual.posicao! }))
    .filter((c) => c.d > 0.5)
    .sort((a, b) => b.d - a.d)
    .slice(0, 10);
  const cairam = [...comparaveis]
    .map((c) => ({ ...c, d: c.atual.posicao! - c.anterior.posicao! }))
    .filter((c) => c.d > 0.5)
    .sort((a, b) => b.d - a.d)
    .slice(0, 10);
  const novas = r.consultas
    .filter((c) => c.atual.impressoes > 0 && c.anterior.impressoes === 0)
    .sort((a, b) => b.atual.impressoes - a.atual.impressoes)
    .slice(0, 15);
  const top10 = r.consultas.filter((c) => c.atual.posicao != null && c.atual.posicao <= 10).length;
  const top3 = r.consultas.filter((c) => c.atual.posicao != null && c.atual.posicao <= 3).length;

  // Palavras-alvo (Admin → Criador de anúncios): onde já aparecemos
  const alvos = useMemo(() => {
    const mapa = new Map(r.consultas.map((c) => [semAcento(c.chave), c]));
    return gerarPalavras()
      .filter((p) => p.prioridade === 1 && p.uso !== "Ads")
      .map((p) => ({
        termo: p.termo,
        mercado: p.mercado,
        achado: mapa.get(semAcento(p.termo)) ?? null,
      }))
      .sort((a, b) => (a.achado?.atual.posicao ?? 999) - (b.achado?.atual.posicao ?? 999))
      .slice(0, 60);
  }, [r.consultas]);

  const kpis = [
    { rotulo: "Cliques", a: r.atual.cliques, b: r.anterior.cliques, f: n, cor: "text-sky-700" },
    {
      rotulo: "Impressões",
      a: r.atual.impressoes,
      b: r.anterior.impressoes,
      f: n,
      cor: "text-violet-700",
    },
    { rotulo: "CTR", a: r.atual.ctr, b: r.anterior.ctr, f: pct, cor: "text-emerald-700" },
    {
      rotulo: "Posição média",
      a: r.atual.posicao,
      b: r.anterior.posicao,
      f: (v: number) => pos(v),
      cor: "text-amber-700",
      inverso: true,
    },
  ];

  return (
    <>
      <p className="text-xs text-zinc-500">
        Período: {dataBR(r.periodo.ini)} a {dataBR(r.periodo.fim)} · comparado com{" "}
        {dataBR(r.periodoAnterior.ini)} a {dataBR(r.periodoAnterior.fim)} · o Google fecha os
        números com ~2 dias de atraso
        {r.primeiroDia ? ` · histórico desde ${r.primeiroDia.split("-").reverse().join("/")}` : ""}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.rotulo} className="p-4">
            <p className="text-xs font-semibold uppercase text-zinc-500">{k.rotulo}</p>
            <p className={cn("text-3xl font-black", k.cor)}>{k.a == null ? "—" : k.f(k.a)}</p>
            <Variacao a={k.a} b={k.b} inverso={k.inverso} formato={k.f} />
          </Card>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-zinc-500">Buscas em que aparecemos</p>
          <p className="text-2xl font-black text-zinc-900">
            {n(r.consultas.filter((c) => c.atual.impressoes > 0).length)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-zinc-500">Na 1ª página (top 10)</p>
          <p className="text-2xl font-black text-emerald-700">{n(top10)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-semibold uppercase text-zinc-500">No top 3</p>
          <p className="text-2xl font-black text-emerald-700">{n(top3)}</p>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-2 font-bold text-zinc-900">Evolução por dia</h2>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={r.serie} margin={{ left: 0, right: 8, top: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
              <XAxis dataKey="dia" tickFormatter={dataBR} fontSize={11} />
              <YAxis yAxisId="q" fontSize={11} allowDecimals={false} />
              <YAxis yAxisId="p" orientation="right" reversed fontSize={11} domain={[1, "auto"]} />
              <Tooltip
                labelFormatter={(d) => dataBR(String(d))}
                formatter={(v: any, nome: string) => [
                  nome === "Posição média" ? pos(Number(v)) : n(Number(v)),
                  nome,
                ]}
              />
              <Legend />
              <Area
                yAxisId="q"
                dataKey="impressoes"
                name="Impressões"
                fill="#ede9fe"
                stroke="#7c3aed"
              />
              <Area yAxisId="q" dataKey="cliques" name="Cliques" fill="#e0f2fe" stroke="#0284c7" />
              <Line
                yAxisId="p"
                dataKey="posicao"
                name="Posição média"
                stroke="#d97706"
                dot={false}
                strokeWidth={2}
                connectNulls
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-zinc-500">
          Posição: quanto mais alto no gráfico, melhor (1 = primeiro resultado).
        </p>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Lista
          titulo="Buscas que mais subiram"
          icone={<TrendingUp className="h-4 w-4 text-emerald-600" />}
          vazio={`Nada para comparar ainda (precisa aparecer nos dois períodos de ${dias} dias).`}
          itens={subiram.map((c) => ({
            chave: c.chave,
            dir: `${pos(c.anterior.posicao)} → ${pos(c.atual.posicao)}`,
            cor: "text-emerald-700",
          }))}
        />
        <Lista
          titulo="Buscas que mais caíram"
          icone={<TrendingDown className="h-4 w-4 text-red-600" />}
          vazio="Nenhuma busca caiu de posição."
          itens={cairam.map((c) => ({
            chave: c.chave,
            dir: `${pos(c.anterior.posicao)} → ${pos(c.atual.posicao)}`,
            cor: "text-red-600",
          }))}
        />
      </div>
      <Lista
        titulo={`Buscas novas (apareceram nestes ${dias} dias)`}
        icone={<Sparkles className="h-4 w-4 text-violet-600" />}
        vazio="Nenhuma busca nova no período."
        itens={novas.map((c) => ({
          chave: c.chave,
          dir: `posição ${pos(c.atual.posicao)} · ${n(c.atual.impressoes)} impr.`,
          cor: "text-violet-700",
        }))}
      />

      <Card className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-bold text-zinc-900">
            <Search className="h-4 w-4 text-primary" /> Buscas ({n(consultas.length)})
          </h2>
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Filtrar termo…"
            className="w-60"
          />
        </div>
        <Tabela
          colunas={["Busca", "Cliques", "Impressões", "CTR", "Posição", "Variação"]}
          linhas={consultas
            .slice(0, limite)
            .map((c) => [
              c.chave,
              n(c.atual.cliques),
              n(c.atual.impressoes),
              pct(c.atual.ctr),
              pos(c.atual.posicao),
              <Variacao
                key="v"
                a={c.atual.posicao}
                b={c.anterior.posicao}
                inverso
                formato={(v) => pos(v)}
              />,
            ])}
        />
        {consultas.length > limite && (
          <button
            onClick={() => setLimite((l) => l + 100)}
            className="mt-2 text-sm font-semibold text-primary hover:underline"
          >
            Ver mais
          </button>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="flex items-center gap-2 font-bold text-zinc-900">
          <FileText className="h-4 w-4 text-primary" /> Páginas que aparecem no Google
        </h2>
        <Tabela
          colunas={["Página", "Cliques", "Impressões", "Posição", "Variação"]}
          linhas={[...r.paginas]
            .sort((a, b) => b.atual.impressoes - a.atual.impressoes)
            .slice(0, 40)
            .map((p) => [
              <a
                key="a"
                href={p.chave}
                target="_blank"
                rel="noreferrer noopener"
                className="text-primary hover:underline"
              >
                {p.chave.replace(/^https?:\/\/[^/]+/, "") || "/"}
              </a>,
              n(p.atual.cliques),
              n(p.atual.impressoes),
              pos(p.atual.posicao),
              <Variacao
                key="v"
                a={p.atual.posicao}
                b={p.anterior.posicao}
                inverso
                formato={(v) => pos(v)}
              />,
            ])}
        />
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="flex items-center gap-2 font-bold text-zinc-900">
            <Target className="h-4 w-4 text-primary" /> Palavras-alvo (prioridade 1)
          </h2>
          <p className="text-xs text-zinc-500">
            As do Criador de anúncios: onde já aparecemos e onde ainda não.
          </p>
          <ul className="mt-2 max-h-96 divide-y overflow-y-auto text-sm">
            {alvos.map((a) => (
              <li
                key={a.termo + a.mercado}
                className="flex items-center justify-between gap-2 py-1.5"
              >
                <span>
                  {a.termo} <span className="text-xs text-zinc-400">{a.mercado}</span>
                </span>
                {a.achado ? (
                  <span className="font-bold text-emerald-700">
                    posição {pos(a.achado.atual.posicao)}
                  </span>
                ) : (
                  <span className="text-xs text-zinc-400">ainda sem impressões</span>
                )}
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4">
          <h2 className="flex items-center gap-2 font-bold text-zinc-900">
            <Globe2 className="h-4 w-4 text-primary" /> Países
          </h2>
          <Tabela
            colunas={["País", "Cliques", "Impressões", "Posição"]}
            linhas={r.paises.map((p) => [
              PAISES[p.pais] ?? p.pais.toUpperCase(),
              n(p.cliques),
              n(p.impressoes),
              pos(p.posicao),
            ])}
          />
        </Card>
      </div>
    </>
  );
}

function Lista({
  titulo,
  icone,
  itens,
  vazio,
}: {
  titulo: string;
  icone: React.ReactNode;
  itens: Array<{ chave: string; dir: string; cor: string }>;
  vazio: string;
}) {
  return (
    <Card className="p-4">
      <h2 className="flex items-center gap-2 font-bold text-zinc-900">
        {icone} {titulo}
      </h2>
      {itens.length ? (
        <ul className="mt-2 divide-y text-sm">
          {itens.map((i) => (
            <li key={i.chave} className="flex justify-between gap-3 py-1.5">
              <span className="truncate">{i.chave}</span>
              <span className={cn("shrink-0 font-bold", i.cor)}>{i.dir}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-zinc-500">{vazio}</p>
      )}
    </Card>
  );
}

function Tabela({ colunas, linhas }: { colunas: string[]; linhas: React.ReactNode[][] }) {
  if (!linhas.length) return <p className="mt-2 text-sm text-zinc-500">Sem dados no período.</p>;
  return (
    <div className="mt-2 overflow-x-auto">
      <table className={cn("w-full text-sm", colunas.length > 4 && "min-w-[520px]")}>
        <thead>
          <tr className="border-b text-left text-xs uppercase text-zinc-500">
            {colunas.map((c, i) => (
              <th key={c} className={cn("py-2 pr-3", i > 0 && "text-right")}>
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l, i) => (
            <tr key={i} className="border-b last:border-0">
              {l.map((v, j) => (
                <td
                  key={j}
                  className={cn(
                    "py-1.5 pr-3",
                    j > 0 && "text-right tabular-nums [&>span]:justify-end",
                  )}
                >
                  {v}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Velocidade real (Core Web Vitals) medida no celular/computador de quem visita. O Google usa o
// percentil 75; verde = dentro do limite "bom" do Google.
function Velocidade({ dias }: { dias: number }) {
  const q = useQuery({
    queryKey: ["velocidade", dias],
    queryFn: () => velocidadeFn({ data: { dias } }),
  });
  const r = q.data;
  if (!r) return null;
  const L = r.limites;
  const cor = (v: number | null, lim: number) =>
    v == null
      ? "text-zinc-400"
      : v <= lim
        ? "text-emerald-700"
        : v <= lim * 1.6
          ? "text-amber-600"
          : "text-red-600";
  const seg = (v: number | null) =>
    v == null ? "—" : `${(v / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} s`;
  const ms = (v: number | null) => (v == null ? "—" : `${Math.round(v)} ms`);
  const cls = (v: number | null) =>
    v == null ? "—" : v.toLocaleString("pt-BR", { maximumFractionDigits: 3 });
  const linha = (
    rotulo: string,
    m: { visitas: number; lcp: number | null; cls: number | null; inp: number | null },
  ) => [
    rotulo,
    n(m.visitas),
    <span key="l" className={cn("font-bold", cor(m.lcp, L.lcp))}>
      {seg(m.lcp)}
    </span>,
    <span key="i" className={cn("font-bold", cor(m.inp, L.inp))}>
      {ms(m.inp)}
    </span>,
    <span key="c" className={cn("font-bold", cor(m.cls, L.cls))}>
      {cls(m.cls)}
    </span>,
  ];
  return (
    <Card className="p-4">
      <h2 className="flex items-center gap-2 font-bold text-zinc-900">
        <Sparkles className="h-5 w-5 text-primary" /> Velocidade real (o que o Google mede)
      </h2>
      <p className="text-xs text-zinc-500">
        Medida no aparelho de cada visitante (percentil 75). Bom para o Google: conteúdo principal
        em até 2,5 s (LCP), resposta ao toque em até 200 ms (INP) e tela sem pular (CLS até 0,1).
      </p>
      {r.geral.visitas === 0 ? (
        <p className="mt-2 text-sm text-zinc-500">
          Ainda sem medidas: começam a chegar com as próximas visitas.
        </p>
      ) : (
        <Tabela
          colunas={["Onde", "Visitas", "Aparece em (LCP)", "Responde em (INP)", "Pula (CLS)"]}
          linhas={[
            linha("Todas", r.geral),
            linha("Celular", r.celular),
            linha("Computador", r.computador),
            ...r.porTipo.map((t) => linha(t.tipo, t)),
          ]}
        />
      )}
    </Card>
  );
}
