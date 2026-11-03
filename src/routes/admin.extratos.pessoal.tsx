// Admin → Extrato do banco → Pessoal: para onde vai o dinheiro do dia a dia (mercado, PIX para
// pessoas, combustível, aluguel, plataformas, crédito…), com a média, os gastos que se repetem
// e dicas. Usa o mesmo extrato importado no Panorama.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Loader2,
  Repeat,
  Search,
  Store,
  Users,
  Wallet,
  X,
} from "lucide-react";
import {
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
import { cn } from "@/lib/utils";
import { buscarPessoaFn, classificarSubFn, pessoalFn } from "@/lib/extratos";
import { SUBS, type Sub } from "@/lib/extrato-categorias";
import { Abas, Mini, Variacao } from "@/components/admin/extrato/Mini";
import { brl, dataBR, mesLongo, nomeMes } from "@/lib/extrato-formato";

export const Route = createFileRoute("/admin/extratos/pessoal")({ component: PaginaPessoal });

type Dados = Awaited<ReturnType<typeof pessoalFn>>;

function PaginaPessoal() {
  const [ano, setAno] = useState(() => new Date().getFullYear());
  const [mes, setMes] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Sub | null>(null);
  const [pessoa, setPessoa] = useState("");
  const { data, isLoading, error } = useQuery({
    queryKey: ["pessoal", ano, mes],
    queryFn: () => pessoalFn({ data: { ano, mes } }),
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Wallet className="h-6 w-6 text-primary" /> Pessoal
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Como você gasta o seu dinheiro: mercado, PIX para pessoas, combustível, aluguel,
            plataformas, crédito e o resto. Entra aqui o que está como «Gasto pessoal» ou «Ajuda à
            família» no extrato.
          </p>
        </div>
        <div className="flex items-center rounded-md border">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Ano anterior"
            onClick={() => (setAno(ano - 1), setMes(null))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 text-sm font-semibold">{ano}</span>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Próximo ano"
            disabled={ano >= new Date().getFullYear()}
            onClick={() => (setAno(ano + 1), setMes(null))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </header>
      <Abas />

      {isLoading && (
        <div className="flex justify-center p-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

      {data && !data.meses.some((m) => m.importado) && (
        <Card className="p-6 text-sm text-muted-foreground">
          Ainda não tem extrato importado.{" "}
          <Link to="/admin/extratos" className="font-semibold text-primary hover:underline">
            Importe no Panorama
          </Link>{" "}
          e classifique os gastos do dia a dia como «Gasto pessoal».
        </Card>
      )}

      {data && data.meses.some((m) => m.importado) && (
        <>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setMes(null)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-semibold",
                !mes && "border-primary bg-primary text-primary-foreground",
              )}
            >
              Ano todo
            </button>
            {data.meses.map((m) => (
              <button
                key={m.mes}
                type="button"
                disabled={m.futuro || !m.importado}
                onClick={() => setMes(m.mes)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold capitalize disabled:opacity-40",
                  mes === m.mes && "border-primary bg-primary text-primary-foreground",
                )}
              >
                {nomeMes(m.mes)}
              </button>
            ))}
          </div>
          <Topo d={data} />
          <BuscaPessoa ano={ano} busca={pessoa} setBusca={setPessoa} />
          <div className="grid gap-4 xl:grid-cols-5">
            <div className="xl:col-span-3">
              <PorMes d={data} escolher={setMes} />
            </div>
            <div className="xl:col-span-2">
              <ParaOndeFoi d={data} filtro={filtro} filtrar={setFiltro} />
            </div>
          </div>
          <CardsSubs d={data} filtro={filtro} filtrar={setFiltro} />
          <Dicas d={data} />
          <div className="grid gap-4 xl:grid-cols-3">
            <Lista
              titulo="Para quem vai seu PIX"
              icone={Users}
              vazio="Nenhum PIX para pessoas no período."
              linhas={data.pessoas}
              abrir={(nome) => {
                setPessoa(nome);
                document.getElementById("busca-pessoa")?.scrollIntoView({ behavior: "smooth" });
              }}
            />
            <Lista
              titulo="Onde você mais gasta"
              icone={Store}
              vazio="Nada no período."
              linhas={data.lugares}
            />
            <Recorrentes d={data} />
          </div>
          <Movimentos d={data} filtro={filtro} filtrar={setFiltro} />
        </>
      )}
    </div>
  );
}

// Buscar pessoa: quanto foi enviado e recebido de alguém no ano, mês a mês, e cada PIX
const COR_ENVIADO = "#c4329b";
const COR_RECEBIDO = "#16a34a";
function BuscaPessoa({
  ano,
  busca,
  setBusca,
}: {
  ano: number;
  busca: string;
  setBusca: (s: string) => void;
}) {
  const [termo, setTermo] = useState(busca);
  const [nome, setNome] = useState<string | null>(null);
  // Espera parar de digitar
  useEffect(() => {
    const t = setTimeout(() => setTermo(busca.trim()), 350);
    return () => clearTimeout(t);
  }, [busca]);
  useEffect(() => setNome(null), [termo, ano]);
  const { data, isFetching } = useQuery({
    queryKey: ["pessoal-pessoa", ano, termo, nome],
    queryFn: () => buscarPessoaFn({ data: { ano, busca: termo, nome } }),
    enabled: termo.length >= 2,
    placeholderData: (p) => p,
  });
  const r = termo.length >= 2 ? data : null;
  const grafico = r?.meses.map((m) => ({ ...m, nome: nomeMes(m.mes) }));
  const temGrafico = !!r && (r.enviado > 0 || r.recebido > 0);

  return (
    <Card id="busca-pessoa" className="scroll-mt-4 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="mr-auto flex items-center gap-2 font-semibold">
          <Search className="h-4 w-4 text-primary" /> Buscar pessoa
        </h2>
        <div className="relative w-full sm:w-80">
          <Input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Nome de quem enviou ou recebeu…"
            className="pr-8"
          />
          {busca && (
            <button
              type="button"
              aria-label="Limpar busca"
              onClick={() => setBusca("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {!r && (
        <p className="mt-2 text-xs text-muted-foreground">
          Digite um nome para ver quanto você enviou e recebeu dessa pessoa em {ano}, mês a mês.
          Procura em todo o extrato do ano (pessoal e loja).
        </p>
      )}
      {r && !r.nomes.length && (
        <p className="mt-3 text-sm text-muted-foreground">
          Ninguém com «{termo}» no extrato de {ano}.
          {isFetching && <Loader2 className="ml-2 inline h-4 w-4 animate-spin" />}
        </p>
      )}
      {r && r.nomes.length > 0 && (
        <div className="mt-4 space-y-4">
          {r.nomes.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setNome(null)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold",
                  !r.nome && "border-primary bg-primary text-primary-foreground",
                )}
              >
                Todos ({r.nomes.length})
              </button>
              {r.nomes.map((n) => (
                <button
                  key={n.chave}
                  type="button"
                  onClick={() => setNome(r.nome === n.chave ? null : n.chave)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold",
                    r.nome === n.chave && "border-primary bg-primary text-primary-foreground",
                  )}
                  title={`Enviado ${brl(n.enviado)} · recebido ${brl(n.recebido)}`}
                >
                  {n.nome}
                </button>
              ))}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg border p-3">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <ArrowUpRight className="h-3.5 w-3.5" style={{ color: COR_ENVIADO }} /> Enviado em{" "}
                {ano}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{brl(r.enviado)}</p>
              <p className="text-xs text-muted-foreground">{r.vezesEnviado} envio(s)</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <ArrowDownLeft className="h-3.5 w-3.5" style={{ color: COR_RECEBIDO }} /> Recebido
                em {ano}
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{brl(r.recebido)}</p>
              <p className="text-xs text-muted-foreground">{r.vezesRecebido} recebimento(s)</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Saldo do ano
              </p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{brl(r.saldo)}</p>
              <p className="text-xs text-muted-foreground">
                {r.saldo < 0
                  ? "Você enviou mais do que recebeu"
                  : r.saldo > 0
                    ? "Você recebeu mais do que enviou"
                    : "Empatado"}
              </p>
            </div>
          </div>
          {temGrafico && (
            <div>
              <div className="mb-1 flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COR_ENVIADO }} />
                  Enviado
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm" style={{ background: COR_RECEBIDO }} />
                  Recebido
                </span>
              </div>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={grafico} barGap={2}>
                    <CartesianGrid vertical={false} stroke="rgba(127,127,127,.15)" />
                    <XAxis dataKey="nome" tickLine={false} axisLine={false} fontSize={12} />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      fontSize={11}
                      width={52}
                      tickFormatter={(v) =>
                        v >= 1000 ? `${(v / 1000).toLocaleString("pt-BR")} mil` : v
                      }
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(127,127,127,.08)" }}
                      content={({ active, payload }: any) =>
                        active && payload?.length ? (
                          <div className="rounded-md border bg-background px-3 py-2 text-xs shadow">
                            <p className="font-semibold capitalize">
                              {mesLongo(payload[0].payload.mes)}
                            </p>
                            <p>
                              Enviado: <b>{brl(payload[0].payload.enviado)}</b>
                            </p>
                            <p>
                              Recebido: <b>{brl(payload[0].payload.recebido)}</b>
                            </p>
                          </div>
                        ) : null
                      }
                    />
                    <Bar dataKey="enviado" fill={COR_ENVIADO} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="recebido" fill={COR_RECEBIDO} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
          <div className="max-h-96 overflow-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-2">Dia</th>
                  <th className="p-2">Nome</th>
                  <th className="p-2">Como está no extrato</th>
                  <th className="p-2 text-right">Valor</th>
                </tr>
              </thead>
              <tbody>
                {r.movimentos.map((m) => (
                  <tr key={m.id} className="border-t">
                    <td className="whitespace-nowrap p-2 tabular-nums">{dataBR(m.data)}</td>
                    <td className="min-w-40 p-2">
                      <p className="font-medium">{m.contraparte}</p>
                      <p className="text-xs text-muted-foreground">{m.tipo}</p>
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {m.categoriaNome}
                      {m.nota && ` · ${m.nota}`}
                    </td>
                    <td
                      className="whitespace-nowrap p-2 text-right font-semibold tabular-nums"
                      style={{ color: m.valor < 0 ? COR_ENVIADO : COR_RECEBIDO }}
                    >
                      {m.valor < 0 ? "− " : "+ "}
                      {brl(Math.abs(m.valor))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {r.totalMovimentos > r.movimentos.length && (
            <p className="text-center text-xs text-muted-foreground">
              Mostrando os {r.movimentos.length} mais recentes de {r.totalMovimentos}. Os totais e o
              gráfico contam todos.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

function Topo({ d }: { d: Dados }) {
  const periodo = d.mes ? `em ${mesLongo(d.mes)}` : `em ${d.ano}`;
  const maior = d.subs[0];
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Card className="p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Você gastou {periodo}
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums">{brl(d.total)}</p>
        {d.mes ? (
          <Variacao valor={d.total} media={d.mediaMes} bomSubir={false} />
        ) : (
          <p className="text-xs text-muted-foreground">Média de {brl(d.mediaMes, 0)} por mês</p>
        )}
      </Card>
      <Card className="p-4">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" /> Por dia
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums">{brl(d.porDia)}</p>
        <p className="text-xs text-muted-foreground">em média, {periodo}</p>
      </Card>
      <Card className="p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Onde mais foi
        </p>
        {maior ? (
          <>
            <p className="mt-1 flex items-center gap-2 text-xl font-bold">
              <span className="h-3 w-3 rounded-full" style={{ background: maior.cor }} />
              {maior.nome}
            </p>
            <p className="text-sm tabular-nums">
              {brl(maior.total)}{" "}
              <span className="text-xs text-muted-foreground">
                ({d.total ? Math.round((maior.total / d.total) * 100) : 0}% do gasto)
              </span>
            </p>
          </>
        ) : (
          <p className="mt-1 text-sm text-muted-foreground">—</p>
        )}
      </Card>
      <Card className="p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Entrou para você {periodo}
        </p>
        <p className="mt-1 text-3xl font-bold tabular-nums">{brl(d.entrouParaVoce)}</p>
        <p className="text-xs text-muted-foreground">Doações e serviços como pessoa física</p>
      </Card>
    </div>
  );
}

function PorMes({ d, escolher }: { d: Dados; escolher: (m: string) => void }) {
  const dados = d.meses
    .filter((m) => !m.futuro)
    .map((m) => ({ mes: m.mes, nome: nomeMes(m.mes), total: m.total, sel: m.mes === d.mes }));
  return (
    <Card className="p-5">
      <h2 className="font-semibold">Gasto pessoal mês a mês</h2>
      <p className="mb-3 text-xs text-muted-foreground">
        A linha tracejada é a média. Clique num mês para abrir.
      </p>
      <div className="h-60">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={dados}
            onClick={(e: any) => e?.activePayload?.[0] && escolher(e.activePayload[0].payload.mes)}
          >
            <CartesianGrid vertical={false} stroke="rgba(127,127,127,.15)" />
            <XAxis dataKey="nome" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={11}
              width={52}
              tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toLocaleString("pt-BR")} mil` : v)}
            />
            <Tooltip
              cursor={{ fill: "rgba(127,127,127,.08)" }}
              content={({ active, payload }: any) =>
                active && payload?.length ? (
                  <div className="rounded-md border bg-background px-3 py-2 text-xs shadow">
                    <p className="font-semibold capitalize">{mesLongo(payload[0].payload.mes)}</p>
                    <p>
                      Gasto pessoal: <b>{brl(payload[0].value)}</b>
                    </p>
                  </div>
                ) : null
              }
            />
            <Bar
              dataKey="total"
              radius={[4, 4, 0, 0]}
              fill="#c4329b"
              shape={(p: any) => (
                <rect
                  x={p.x}
                  y={p.y}
                  width={p.width}
                  height={p.height}
                  rx={4}
                  fill="#c4329b"
                  opacity={!d.mes || p.payload.sel ? 1 : 0.35}
                />
              )}
            />
            {d.mediaMes > 0 && (
              <ReferenceLine
                y={d.mediaMes}
                stroke="currentColor"
                strokeOpacity={0.5}
                strokeDasharray="4 4"
              />
            )}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted-foreground">Média: {brl(d.mediaMes)} por mês.</p>
    </Card>
  );
}

function ParaOndeFoi({
  d,
  filtro,
  filtrar,
}: {
  d: Dados;
  filtro: Sub | null;
  filtrar: (s: Sub | null) => void;
}) {
  const max = Math.max(1, ...d.subs.map((s) => s.total));
  return (
    <Card className="h-full p-5">
      <h2 className="font-semibold">Para onde foi</h2>
      <p className="mb-3 text-xs text-muted-foreground">Clique para ver só aquele tipo de gasto.</p>
      <ul className="space-y-2">
        {d.subs
          .filter((s) => s.total > 0)
          .map((s) => (
            <li key={s.sub}>
              <button
                type="button"
                onClick={() => filtrar(filtro === s.sub ? null : (s.sub as Sub))}
                className={cn(
                  "w-full rounded-md p-1 text-left hover:bg-muted/60",
                  filtro === s.sub && "bg-muted",
                )}
              >
                <span className="flex justify-between gap-2 text-sm">
                  <span className="font-medium">{s.nome}</span>
                  <span className="tabular-nums">
                    {brl(s.total, 0)}{" "}
                    <span className="text-xs text-muted-foreground">
                      {d.total ? Math.round((s.total / d.total) * 100) : 0}%
                    </span>
                  </span>
                </span>
                <span className="mt-1 block h-2 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${(s.total / max) * 100}%`, background: s.cor }}
                  />
                </span>
              </button>
            </li>
          ))}
      </ul>
    </Card>
  );
}

function CardsSubs({
  d,
  filtro,
  filtrar,
}: {
  d: Dados;
  filtro: Sub | null;
  filtrar: (s: Sub | null) => void;
}) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {d.subs.map((s) => (
        <button
          key={s.sub}
          type="button"
          onClick={() => filtrar(filtro === s.sub ? null : (s.sub as Sub))}
          className="text-left"
        >
          <Card
            className={cn(
              "flex h-full flex-col gap-1 p-4 transition hover:border-primary",
              filtro === s.sub && "border-primary ring-1 ring-primary",
            )}
          >
            <p className="flex items-center gap-2 text-sm font-semibold">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.cor }} />
              {s.nome}
            </p>
            <p className="text-xl font-bold tabular-nums">{brl(s.total)}</p>
            <p className="text-xs text-muted-foreground">
              {s.vezes} vez(es) · média {brl(s.mediaMes, 0)}/mês
            </p>
            {d.mes && <Variacao valor={s.total} media={s.mediaMes} bomSubir={false} />}
            <div className="mt-auto">
              <Mini
                serie={s.serie.filter((x) => x.mes <= `${d.ano}-12`)}
                cor={s.cor}
                destaque={d.mes}
              />
            </div>
          </Card>
        </button>
      ))}
    </div>
  );
}

function Dicas({ d }: { d: Dados }) {
  const dicas: string[] = [];
  const sub = (s: Sub) => d.subs.find((x) => x.sub === s);
  if (d.mes) {
    const subiu = d.subs
      .filter((s) => s.mediaMes > 50 && s.total > s.mediaMes * 1.3)
      .sort((a, b) => b.total - b.mediaMes - (a.total - a.mediaMes))[0];
    if (subiu)
      dicas.push(
        `${subiu.nome} foi o que mais subiu: ${brl(subiu.total, 0)} contra ${brl(subiu.mediaMes, 0)} de média (+${brl(subiu.total - subiu.mediaMes, 0)}).`,
      );
  }
  const plat = sub("PLATAFORMAS");
  if (plat?.mediaMes)
    dicas.push(
      `Plataformas e assinaturas: cerca de ${brl(plat.mediaMes, 0)} por mês, ${brl(plat.mediaMes * 12, 0)} no ano. Vale cancelar o que você não usa.`,
    );
  const laz = sub("LAZER");
  if (laz?.total)
    dicas.push(
      `Lazer e comer fora: ${laz.vezes} vez(es), ${brl(laz.total, 0)} (${brl(laz.total / Math.max(1, laz.vezes), 0)} em média cada).`,
    );
  const comb = sub("COMBUSTIVEL");
  if (comb?.total)
    dicas.push(
      `Combustível: ${comb.vezes} abastecida(s), ${brl(comb.total / Math.max(1, comb.vezes), 0)} em média cada.`,
    );
  const cred = sub("CREDITO");
  if (cred?.total)
    dicas.push(
      `Você pagou ${brl(cred.total, 0)} de cartão/crédito: os juros do crédito costumam ser os mais caros, priorize quitar.`,
    );
  const pes = sub("PESSOAS");
  if (pes?.total)
    dicas.push(
      `${pes.vezes} PIX para pessoas, ${brl(pes.total, 0)}. Se algum foi compra para a loja, troque para «Compra de peças» no Panorama.`,
    );
  const outros = sub("OUTROS");
  if (outros && d.total && outros.total / d.total > 0.15)
    dicas.push(
      `${Math.round((outros.total / d.total) * 100)}% está em «Outros». Dê um tipo a esses gastos (com «lembrar») para o retrato ficar mais fiel.`,
    );
  if (!dicas.length) return null;
  return (
    <Card className="p-4">
      <p className="mb-2 flex items-center gap-2 font-semibold">
        <Lightbulb className="h-4 w-4 text-amber-500" /> Dicas
      </p>
      <ul className="space-y-1.5 text-sm">
        {dicas.map((t) => (
          <li key={t} className="flex gap-2">
            <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" /> {t}
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Lista({
  titulo,
  icone: Icone,
  vazio,
  linhas,
  abrir,
}: {
  titulo: string;
  icone: typeof Users;
  vazio: string;
  linhas: Dados["pessoas"];
  abrir?: (nome: string) => void; // clicar no nome abre a busca da pessoa
}) {
  return (
    <Card className="overflow-hidden p-0">
      <h2 className="flex items-center gap-2 border-b p-3 font-semibold">
        <Icone className="h-4 w-4 text-primary" /> {titulo}
      </h2>
      <ul className="max-h-80 divide-y overflow-y-auto">
        {!linhas.length && <li className="p-4 text-sm text-muted-foreground">{vazio}</li>}
        {linhas.map((l) => (
          <li key={l.nome} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
            <span className="min-w-0">
              {abrir ? (
                <button
                  type="button"
                  onClick={() => abrir(l.nome)}
                  className="block max-w-full truncate text-left font-medium hover:text-primary hover:underline"
                  title="Ver tudo o que foi e veio desta pessoa"
                >
                  {l.nome}
                </button>
              ) : (
                <span className="block truncate font-medium">{l.nome}</span>
              )}
              <span className="text-xs text-muted-foreground">
                {SUBS[l.sub as Sub]?.nome} · {l.vezes}× · última {dataBR(l.ultima)}
              </span>
            </span>
            <span className="shrink-0 font-semibold tabular-nums">{brl(l.total, 0)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Recorrentes({ d }: { d: Dados }) {
  return (
    <Card className="overflow-hidden p-0">
      <h2 className="flex items-center gap-2 border-b p-3 font-semibold">
        <Repeat className="h-4 w-4 text-primary" /> Gastos que se repetem
      </h2>
      <p className="px-3 pt-2 text-xs text-muted-foreground">
        Aparecem em 3 meses ou mais no ano: contas fixas, assinaturas, lugares de sempre.
      </p>
      <ul className="max-h-80 divide-y overflow-y-auto">
        {!d.recorrentes.length && (
          <li className="p-4 text-sm text-muted-foreground">Nada que se repita ainda.</li>
        )}
        {d.recorrentes.map((l) => (
          <li key={l.nome} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
            <span className="min-w-0">
              <span className="block truncate font-medium">{l.nome}</span>
              <span className="text-xs text-muted-foreground">
                {SUBS[l.sub as Sub]?.nome} · em {l.meses} meses
              </span>
            </span>
            <span className="shrink-0 text-right tabular-nums">
              <b>{brl(l.porMes, 0)}</b>
              <span className="block text-xs text-muted-foreground">por mês</span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Movimentos({
  d,
  filtro,
  filtrar,
}: {
  d: Dados;
  filtro: Sub | null;
  filtrar: (s: Sub | null) => void;
}) {
  const qc = useQueryClient();
  const [lembrar, setLembrar] = useState(true);
  const [busca, setBusca] = useState("");
  const [salvando, setSalvando] = useState<number | null>(null);
  const lista = d.movimentos
    .filter((m) => !filtro || m.sub === filtro)
    .filter((m) => !busca || m.contraparte.toLowerCase().includes(busca.toLowerCase()))
    .slice()
    .reverse();
  const mostrar = lista.slice(0, 300);
  const mudar = async (id: number, sub: string) => {
    setSalvando(id);
    try {
      await classificarSubFn({ data: { id, sub, lembrar } });
      qc.invalidateQueries({ queryKey: ["pessoal"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSalvando(null);
    }
  };
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <h2 className="mr-auto font-semibold">
          Gastos{" "}
          {filtro && (
            <button
              type="button"
              className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-normal"
              onClick={() => filtrar(null)}
            >
              {SUBS[filtro].nome} ✕
            </button>
          )}
        </h2>
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar nome…"
          className="h-8 w-40"
        />
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={lembrar} onCheckedChange={setLembrar} />
          Lembrar para o mesmo nome
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-2">Dia</th>
              <th className="p-2">Onde / para quem</th>
              <th className="p-2 text-right">Valor</th>
              <th className="p-2">Tipo de gasto</th>
            </tr>
          </thead>
          <tbody>
            {!mostrar.length && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-muted-foreground">
                  Nenhum gasto.
                </td>
              </tr>
            )}
            {mostrar.map((m) => (
              <tr key={m.id} className="border-t">
                <td className="whitespace-nowrap p-2 tabular-nums">{dataBR(m.data)}</td>
                <td className="min-w-48 p-2">
                  <p className="font-medium">{m.contraparte}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.tipo}
                    {m.nota && ` · ${m.nota}`}
                  </p>
                </td>
                <td className="whitespace-nowrap p-2 text-right font-semibold tabular-nums">
                  {brl(m.valor)}
                </td>
                <td className="p-2">
                  {m.categoria === "DOACAO_FEITA" ? (
                    <span className="text-xs text-muted-foreground">Família (ajuda)</span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ background: SUBS[m.sub as Sub].cor }}
                      />
                      <select
                        aria-label="Tipo de gasto"
                        className="h-8 rounded-md border bg-background px-1.5 text-xs"
                        value={m.sub}
                        disabled={salvando === m.id}
                        onChange={(e) => mudar(m.id, e.target.value)}
                      >
                        {(Object.keys(SUBS) as Sub[])
                          .filter((s) => s !== "FAMILIA")
                          .map((s) => (
                            <option key={s} value={s}>
                              {SUBS[s].nome}
                            </option>
                          ))}
                      </select>
                      {m.origem === "palpite" && (
                        <span
                          className="text-[10px] text-muted-foreground"
                          title="Escolhido pelo nome; confira"
                        >
                          palpite
                        </span>
                      )}
                      {salvando === m.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {lista.length > mostrar.length && (
        <p className="border-t p-2 text-center text-xs text-muted-foreground">
          Mostrando 300 de {lista.length}. Escolha um mês para ver todos.
        </p>
      )}
    </Card>
  );
}
