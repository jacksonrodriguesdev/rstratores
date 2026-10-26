import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import { z } from "zod";
import {
  Megaphone,
  Stethoscope,
  MapPin,
  Users,
  Rocket,
  Target,
  Package,
  Type,
  CalendarDays,
  Copy,
  Check,
  Loader2,
  ExternalLink,
  AlertTriangle,
  CheckCircle2,
  Lightbulb,
  SearchX,
  KeyRound,
  Download,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { EChart } from "@/components/admin/EChart";
import { criadorAnunciosFn } from "@/lib/anuncios";
import type { CriadorAnuncios } from "@/lib/anuncios.server";
import { fmtUYU, fmtBRL } from "@/lib/precos";
import { cn } from "@/lib/utils";
import { gerarPalavras, csvGoogleAds, NEGATIVAS_PADRAO, type Grupo } from "@/lib/palavras-chave";

// Admin → Criador de anúncios: estratégia de Meta e Google a partir dos dados do site
const ABAS = [
  { id: "diagnostico", nome: "Diagnóstico", icone: Stethoscope },
  { id: "onde", nome: "Onde anunciar", icone: MapPin },
  { id: "perfis", nome: "Perfis de clientes", icone: Users },
  { id: "campanhas", nome: "Campanhas prontas", icone: Rocket },
  { id: "metricas", nome: "Métricas e metas", icone: Target },
  { id: "produtos", nome: "Peças para anunciar", icone: Package },
  { id: "textos", nome: "Textos da página inicial", icone: Type },
  { id: "calendario", nome: "Calendário agrícola", icone: CalendarDays },
  { id: "palavras", nome: "Palavras-chave (SEO + Google)", icone: KeyRound },
] as const;
type Aba = (typeof ABAS)[number]["id"];

export const Route = createFileRoute("/admin/anuncios")({
  validateSearch: z.object({ aba: z.string().optional(), dias: z.coerce.number().optional() }),
  component: CriadorPage,
});

const VERDE = "#0b7a3b";
const n = (v: number) => v.toLocaleString("pt-BR");
const pct = (v: number) => `${(v * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}%`;
const usd = (v: number) =>
  `US$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const img = (p: string) => (p.startsWith("http") || p.startsWith("/") ? p : `/uploads/${p}`);

function CriadorPage() {
  const busca = Route.useSearch();
  const navigate = useNavigate();
  const aba = (ABAS.some((a) => a.id === busca.aba) ? busca.aba : "diagnostico") as Aba;
  const dias = busca.dias ?? 90;
  const ir = (m: { aba?: Aba; dias?: number }) =>
    navigate({ to: "/admin/anuncios", search: { aba, dias, ...m } as never, replace: true });
  const { data: d, isError } = useQuery({
    queryKey: ["criador-anuncios", dias],
    queryFn: () => criadorAnunciosFn({ data: { dias } }),
    staleTime: 5 * 60_000,
  });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Megaphone className="h-6 w-6 text-primary" /> Criador de anúncios
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Estratégia para Meta (Instagram/Facebook) e Google montada com os dados do site: de onde
            vêm os visitantes, que peças olham, o que buscam e quando pedem no WhatsApp.
          </p>
        </div>
        <div className="flex rounded-lg border bg-card p-1">
          {[
            [30, "30 dias"],
            [90, "90 dias"],
            [180, "6 meses"],
            [365, "1 ano"],
          ].map(([v, r]) => (
            <button
              key={v}
              onClick={() => ir({ dias: v as number })}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition",
                dias === v
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {ABAS.map((a, i) => (
          <button
            key={a.id}
            onClick={() => ir({ aba: a.id })}
            className={cn(
              "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition",
              aba === a.id
                ? "border-primary bg-primary text-primary-foreground"
                : "bg-card hover:border-primary/40",
            )}
          >
            <a.icone className="h-4 w-4" /> {i + 1}. {a.nome}
          </button>
        ))}
      </div>

      {isError ? (
        <Card className="p-8 text-center text-sm text-red-600">
          Não foi possível calcular. Tente de novo em instantes.
        </Card>
      ) : !d ? (
        <Card className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Analisando visitas, buscas e catálogo…
        </Card>
      ) : (
        <>
          {aba === "diagnostico" && <Diagnostico d={d} ir={ir} />}
          {aba === "onde" && <Onde d={d} />}
          {aba === "perfis" && <Perfis d={d} />}
          {aba === "campanhas" && <Campanhas d={d} />}
          {aba === "metricas" && <Metricas d={d} />}
          {aba === "produtos" && <Produtos d={d} />}
          {aba === "textos" && <Textos d={d} />}
          {aba === "calendario" && <Calendario d={d} />}
          {aba === "palavras" && <Palavras d={d} />}
        </>
      )}
    </div>
  );
}

// ---------- peças comuns
function Copiar({ texto, rotulo }: { texto: string; rotulo?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(texto).then(() => {
          setOk(true);
          setTimeout(() => setOk(false), 1500);
        });
      }}
      className="inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary"
      title="Copiar"
    >
      {ok ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}{" "}
      {rotulo ?? (ok ? "Copiado" : "Copiar")}
    </button>
  );
}
function Kpi({ rotulo, valor, sub }: { rotulo: string; valor: string; sub?: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{rotulo}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{valor}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </Card>
  );
}
function Painel({
  titulo,
  children,
  className,
  acao,
}: {
  titulo: ReactNode;
  children: ReactNode;
  className?: string;
  acao?: ReactNode;
}) {
  return (
    <Card className={cn("p-4", className)}>
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold">{titulo}</h3>
        {acao}
      </div>
      {children}
    </Card>
  );
}
function Selo({ p }: { p: string }) {
  const cor =
    p === "Alta"
      ? "bg-emerald-600 text-white"
      : p === "Média"
        ? "bg-amber-100 text-amber-800"
        : p === "Opcional"
          ? "bg-sky-100 text-sky-800"
          : "bg-muted text-muted-foreground";
  return <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", cor)}>{p}</span>;
}
function Barra({ v, cor = VERDE }: { v: number; cor?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.min(100, Math.max(2, v * 100))}%`, background: cor }}
      />
    </div>
  );
}
const Linha = ({ titulo, children }: { titulo: string; children: ReactNode }) => (
  <div className="text-sm">
    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {titulo}:{" "}
    </span>
    {children}
  </div>
);

// ---------------------------------------------------------------- 1. Diagnóstico
function Diagnostico({ d, ir }: { d: CriadorAnuncios; ir: (m: { aba?: Aba }) => void }) {
  const g = d.geral;
  const icone = {
    bom: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
    atencao: <AlertTriangle className="h-4 w-4 text-amber-600" />,
    acao: <Lightbulb className="h-4 w-4 text-sky-600" />,
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Kpi rotulo="Visitas" valor={n(g.visitas)} sub={`${n(g.sessoes)} sessões`} />
        <Kpi
          rotulo="Pedidos no WhatsApp"
          valor={n(g.leads)}
          sub={`${pct(g.taxaLead)} das sessões`}
        />
        <Kpi rotulo="No celular" valor={pct(g.celular)} />
        <Kpi rotulo="Em português" valor={pct(g.portugues)} />
        <Kpi
          rotulo="Melhor horário"
          valor={g.faixaHoras.split(",")[0] || "—"}
          sub={g.melhoresDias.join(", ")}
        />
        <Kpi
          rotulo="Campanhas sugeridas"
          valor={String(d.campanhas.length)}
          sub="prontas para copiar"
        />
      </div>
      <div className="grid gap-4 xl:grid-cols-[3fr_2fr]">
        <Painel titulo="O que os dados dizem">
          <ul className="space-y-2.5">
            {d.diagnostico.map((x, i) => (
              <li key={i} className="flex gap-2 text-sm">
                {icone[x.tipo]}
                <span className="flex-1">{x.texto}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => ir({ aba: "campanhas" })}
              className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground"
            >
              Ver campanhas prontas →
            </button>
            <button
              onClick={() => ir({ aba: "onde" })}
              className="rounded-md border px-3 py-2 text-sm font-semibold"
            >
              Onde anunciar
            </button>
          </div>
        </Painel>
        <Painel titulo="Visitas por hora (horário do Uruguai)">
          <EChart
            height={240}
            option={{
              tooltip: { trigger: "axis" },
              grid: { left: 30, right: 8, top: 10, bottom: 24 },
              xAxis: {
                type: "category",
                data: g.horas.map((_, h) => `${h}h`),
                axisLabel: { interval: 2 },
              },
              yAxis: { type: "value", minInterval: 1 },
              series: [{ type: "bar", data: g.horas, color: VERDE }],
            }}
          />
        </Painel>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Painel titulo="Marcas: interesse no site × peças com foto no catálogo">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="py-1.5">Marca</th>
                <th className="text-right">Visitas</th>
                <th className="text-right">Pedidos</th>
                <th className="text-right">Buscas</th>
                <th className="text-right">Peças c/ foto</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {d.marcas.map((m) => (
                <tr key={m.marca}>
                  <td className="py-1.5 font-medium">{m.marca}</td>
                  <td className="text-right tabular-nums">{n(m.vistas)}</td>
                  <td className="text-right tabular-nums">{n(m.leads)}</td>
                  <td className="text-right tabular-nums">{n(m.buscas)}</td>
                  <td className="text-right tabular-nums">{n(m.pecasComFoto)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Painel>
        <Painel
          titulo={
            <span className="flex items-center gap-1.5">
              <SearchX className="h-4 w-4 text-amber-600" /> Buscas sem resultado (demanda que ainda
              não atendemos)
            </span>
          }
        >
          {d.semResultado.length ? (
            <>
              <div className="flex flex-wrap gap-1.5">
                {d.semResultado.map((t) => (
                  <span
                    key={t.termo}
                    className="rounded-full border bg-amber-50 px-2 py-0.5 text-xs"
                  >
                    {t.termo} <b>×{t.vezes}</b>
                  </span>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                Cadastre estas peças (ou sinônimos) antes de anunciar esses termos: anúncio que leva
                a "nada encontrado" é dinheiro perdido.
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma busca sem resultado no período.</p>
          )}
        </Painel>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- 2. Onde anunciar
function Onde({ d }: { d: CriadorAnuncios }) {
  const [sel, setSel] = useState<string | null>(null);
  const lista = d.ondeAnunciar;
  const atual = lista.find((l) => l.chave === sel) ?? lista[0];
  const comVisitas = lista.filter((l) => l.visitas > 0);
  return (
    <div className="space-y-4">
      <Card className="border-sky-200 bg-sky-50 p-3 text-sm text-sky-900">
        Regra atual: anúncios pagos só para pessoas <b>no Uruguai</b>. O Rio Grande do Sul aparece
        como <b>opcional</b>.
      </Card>
      {comVisitas.length > 0 && (
        <Painel titulo="Fatia sugerida do orçamento por departamento (pelo interesse medido)">
          <EChart
            height={Math.max(160, comVisitas.filter((l) => l.pais === "UY").length * 28)}
            option={{
              tooltip: {
                trigger: "axis",
                axisPointer: { type: "shadow" },
                valueFormatter: (v: number) => `${v}%`,
              },
              grid: { left: 130, right: 40, top: 6, bottom: 20 },
              xAxis: { type: "value", axisLabel: { formatter: "{value}%" } },
              yAxis: {
                type: "category",
                inverse: true,
                data: comVisitas.filter((l) => l.pais === "UY").map((l) => l.nome),
              },
              series: [
                {
                  type: "bar",
                  data: comVisitas
                    .filter((l) => l.pais === "UY")
                    .map((l) => Math.round(l.fatiaOrcamento * 1000) / 10),
                  color: VERDE,
                  label: { show: true, position: "right", formatter: "{c}%" },
                },
              ],
            }}
          />
        </Painel>
      )}
      <div className="grid gap-4 xl:grid-cols-[2fr_3fr]">
        <Painel titulo="Departamentos e RS (clique para ver o detalhe)">
          <div className="max-h-[640px] space-y-1 overflow-y-auto pr-1">
            {lista.map((l) => (
              <button
                key={l.chave}
                onClick={() => setSel(l.chave)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border p-2.5 text-left transition",
                  atual?.chave === l.chave
                    ? "border-primary bg-primary/5"
                    : "hover:border-primary/40",
                )}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{l.nome}</span>
                    <Selo p={l.prioridade} />
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{l.perfil}</p>
                </div>
                <div className="text-right text-xs tabular-nums">
                  <b className="text-sm">{n(l.visitas)}</b> visitas
                  <br />
                  {n(l.leads)} pedidos
                </div>
              </button>
            ))}
          </div>
        </Painel>
        {atual && (
          <Painel
            titulo={
              <span className="flex items-center gap-2 text-base">
                {atual.nome} <Selo p={atual.prioridade} />
              </span>
            }
          >
            <div className="space-y-3">
              <p className="rounded-md bg-muted/60 p-2.5 text-sm">{atual.motivo}</p>
              {atual.pais === "UY" && (
                <a
                  href={`/admin/meta-ads?aba=criar&local=${encodeURIComponent(atual.nome)}`}
                  className="flex items-center justify-center gap-2 rounded-lg bg-[#1877F2] px-3 py-2 text-sm font-bold text-white hover:opacity-90"
                >
                  Criar no Meta: anúncios prontos para {atual.nome} →
                </a>
              )}
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Mini r="Visitas" v={n(atual.visitas)} />
                <Mini r="Pedidos WhatsApp" v={n(atual.leads)} />
                <Mini r="Conversão" v={pct(atual.conversao)} />
                <Mini r="No celular" v={pct(atual.celular)} />
              </div>
              <Linha titulo="Perfil agrícola">{atual.perfil}</Linha>
              <Linha titulo="Máquinas típicas">{atual.maquinas}</Linha>
              {atual.cidades.length > 0 && (
                <Linha titulo="Cidades">
                  {atual.cidades.map((c) => `${c.nome} (${c.valor})`).join(", ")}
                </Linha>
              )}
              {atual.marcas.length > 0 && (
                <Linha titulo="Marcas que mais olham">
                  {atual.marcas.map((c) => c.nome).join(", ")}
                </Linha>
              )}
              {atual.termos.length > 0 && (
                <Linha titulo="O que buscam">
                  {atual.termos.map((c) => `"${c.nome}"`).join(", ")}
                </Linha>
              )}
              {atual.clientes > 0 && <Linha titulo="Clientes cadastrados">{atual.clientes}</Linha>}
              <div>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Peças para anunciar aqui
                </p>
                {atual.pecas.length ? (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {atual.pecas.map((p) => (
                      <PecaMini key={p.sku} p={p} extra={`${p.vistas} visitas daqui`} />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Sem peças vistas daqui ainda: use as de "Peças para anunciar" e o foco do
                    calendário agrícola ({atual.maquinas}).
                  </p>
                )}
              </div>
              <div className="rounded-md border border-dashed p-2.5 text-xs">
                <b>Como segmentar:</b> Meta → Localizações → "Pessoas que moram neste local" →{" "}
                {atual.pais === "RS"
                  ? `${atual.cidades[0]?.nome ?? "cidade"}, Rio Grande do Sul (+40 km), idioma português`
                  : `${atual.nome}, Uruguay (departamento)`}
                . Google Ads → Locais → "Presença: pessoas que estão no local ou que vão
                regularmente".
              </div>
            </div>
          </Painel>
        )}
      </div>
    </div>
  );
}
const Mini = ({ r, v }: { r: string; v: string }) => (
  <div className="rounded-md border p-2">
    <p className="text-[10px] uppercase text-muted-foreground">{r}</p>
    <p className="font-bold tabular-nums">{v}</p>
  </div>
);
function PecaMini({
  p,
  extra,
}: {
  p: {
    sku: string;
    nome: string;
    imagem: string | null;
    uyu: number | null;
    brl: number | null;
    link: string;
  };
  extra?: string;
}) {
  return (
    <a
      href={p.link}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-2 rounded-md border p-2 hover:border-primary"
    >
      {p.imagem ? (
        <img
          src={img(p.imagem)}
          alt=""
          className="h-10 w-10 shrink-0 rounded border object-contain"
        />
      ) : (
        <span className="h-10 w-10 shrink-0 rounded border bg-muted" />
      )}
      <span className="min-w-0 text-xs">
        <span className="line-clamp-2 font-medium">{p.nome}</span>
        <span className="text-muted-foreground">
          {p.uyu ? fmtUYU(p.uyu) : p.brl ? fmtBRL(p.brl) : ""}
          {extra ? ` · ${extra}` : ""}
        </span>
      </span>
    </a>
  );
}

// ---------------------------------------------------------------- 3. Perfis
function Perfis({ d }: { d: CriadorAnuncios }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Grupos de visitantes identificados pelo comportamento no site (uma sessão pode estar em mais
        de um). Use cada perfil como um público/conjunto de anúncios separado.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {d.perfis.map((p) => (
          <Card key={p.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold">{p.nome}</h3>
                <p className="text-xs text-muted-foreground">{p.quem}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold tabular-nums">{pct(p.fatia)}</p>
                <p className="text-[10px] uppercase text-muted-foreground">das sessões</p>
              </div>
            </div>
            <Barra v={p.fatia} />
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Mini r="Sessões" v={n(p.sessoes)} />
              <Mini r="No celular" v={pct(p.celular)} />
              <Mini r="Pedem no WhatsApp" v={pct(p.conversao)} />
            </div>
            <div className="mt-3 space-y-1.5">
              {p.locais.length > 0 && (
                <Linha titulo="De onde">{p.locais.map((x) => x.nome).join(", ")}</Linha>
              )}
              {p.horas && <Linha titulo="Horário">{p.horas}</Linha>}
              {p.canais.length > 0 && (
                <Linha titulo="Chegam por">{p.canais.map((x) => x.nome).join(", ")}</Linha>
              )}
              {p.marcas.length > 0 && (
                <Linha titulo="Marcas">{p.marcas.map((x) => x.nome).join(", ")}</Linha>
              )}
              <Linha titulo="Dor">{p.dor}</Linha>
              <Linha titulo="Mensagem">{p.mensagem}</Linha>
              <Linha titulo="Formato">{p.formato}</Linha>
              <Linha titulo="Oferta">{p.oferta}</Linha>
            </div>
            <div className="mt-3 rounded-md bg-muted/60 p-2.5">
              <div className="mb-1 flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase text-muted-foreground">
                  Texto de exemplo ({p.idioma === "pt" ? "português" : "espanhol UY"})
                </span>
                <Copiar texto={p.exemplo} />
              </div>
              <p className="text-sm">{p.exemplo}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- 4. Campanhas
function Campanhas({ d }: { d: CriadorAnuncios }) {
  const [orcamento, setOrcamento] = useState(300);
  const [abertas, setAbertas] = useState<Record<string, boolean>>({
    [d.campanhas[0]?.id ?? ""]: true,
  });
  const [filtro, setFiltro] = useState<"todas" | "Meta" | "Google">("todas");
  const pesoTotal = d.campanhas.reduce((a, c) => a + c.peso, 0) || 1;
  const lista = d.campanhas.filter((c) => filtro === "todas" || c.plataforma === filtro);
  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-4 p-4">
        <label className="flex items-center gap-2 text-sm font-medium">
          Orçamento mensal total
          <span className="flex items-center rounded-md border bg-background px-2">
            <span className="text-muted-foreground">US$</span>
            <input
              type="number"
              min={0}
              step={50}
              value={orcamento}
              onChange={(e) => setOrcamento(Math.max(0, Number(e.target.value) || 0))}
              className="h-9 w-24 bg-transparent px-1 text-right tabular-nums outline-none"
            />
          </span>
        </label>
        <span className="text-xs text-muted-foreground">
          Dividido entre as campanhas pela prioridade (as opcionais ficam fora). Comece com 3–4
          campanhas "Alta" e some as outras depois de 2 semanas.
        </span>
        <div className="ml-auto flex rounded-md border p-0.5 text-xs">
          {(["todas", "Meta", "Google"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={cn(
                "rounded px-2.5 py-1 font-semibold capitalize",
                filtro === f ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {f}
            </button>
          ))}
        </div>
      </Card>
      {lista.map((c) => {
        const mensal = (c.peso / pesoTotal) * orcamento;
        const aberta = !!abertas[c.id];
        return (
          <Card
            key={c.id}
            className={cn("overflow-hidden", c.prioridade === "Opcional" && "opacity-90")}
          >
            <button
              onClick={() => setAbertas((a) => ({ ...a, [c.id]: !a[c.id] }))}
              className="flex w-full flex-wrap items-center gap-3 p-4 text-left"
            >
              <span
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-bold",
                  c.plataforma === "Meta"
                    ? "bg-[#1877F2]/10 text-[#1877F2]"
                    : "bg-[#EA4335]/10 text-[#c5221f]",
                )}
              >
                {c.plataforma}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{c.nome}</span>
                <span className="text-xs text-muted-foreground">
                  {c.tipo} · {c.objetivo}
                </span>
              </span>
              <Selo p={c.prioridade} />
              <span className="text-right text-sm tabular-nums">
                {c.peso ? (
                  <>
                    <b>{usd(mensal / 30)}</b>/dia
                    <br />
                    <span className="text-xs text-muted-foreground">{usd(mensal)}/mês</span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">fora do orçamento</span>
                )}
              </span>
            </button>
            {aberta && (
              <div className="space-y-4 border-t bg-muted/20 p-4">
                <p className="text-sm">
                  <b>Por quê:</b> {c.porque}
                </p>
                {c.plataforma === "Meta" && c.idioma === "es" && (
                  <a
                    href="/admin/meta-ads?aba=criar"
                    className="inline-flex items-center gap-2 rounded-lg bg-[#1877F2] px-3 py-2 text-sm font-bold text-white hover:opacity-90"
                  >
                    Criar no Meta Ads (campanha pronta, só aceitar) →
                  </a>
                )}
                {c.aviso && (
                  <p className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 p-2 text-sm text-amber-900">
                    <AlertTriangle className="h-4 w-4 shrink-0" /> {c.aviso}
                  </p>
                )}
                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-1.5">
                    <Linha titulo="Locais">{c.locais.join("; ")}</Linha>
                    <Linha titulo="Público">{c.publico.join("; ")}</Linha>
                    <Linha titulo="Horário">{c.horario}</Linha>
                    <Linha titulo="Idioma">
                      {c.idioma === "pt" ? "Português (Brasil)" : "Espanhol (Uruguai)"}
                    </Linha>
                    <div className="flex items-center gap-2 pt-1">
                      <Linha titulo="Link com UTM">
                        <a
                          href={c.link}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all text-primary hover:underline"
                        >
                          {c.link}
                        </a>
                      </Linha>
                      <Copiar texto={c.link} />
                    </div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Metas (KPIs)
                    </p>
                    <table className="w-full text-sm">
                      <tbody className="divide-y">
                        {c.kpis.map((k) => (
                          <tr key={k.nome}>
                            <td className="py-1">{k.nome}</td>
                            <td className="text-right font-semibold">{k.meta}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <Bloco
                  titulo={c.plataforma === "Google" ? "Títulos (máx. 30 caracteres)" : "Títulos"}
                  itens={c.titulos}
                  max={c.plataforma === "Google" ? 30 : 40}
                />
                {c.textos.length > 0 && (
                  <Bloco
                    titulo="Texto principal"
                    itens={c.textos}
                    max={c.plataforma === "Meta" ? 125 : 0}
                  />
                )}
                <Bloco
                  titulo={
                    c.plataforma === "Google" ? "Descrições (máx. 90 caracteres)" : "Descrição"
                  }
                  itens={c.descricoes}
                  max={c.plataforma === "Google" ? 90 : 0}
                />
                {c.palavras && (
                  <Bloco
                    titulo='Palavras-chave (uma por linha; [ ] = exata, " " = frase)'
                    itens={[c.palavras.join("\n")]}
                  />
                )}
                {c.negativas && (
                  <Bloco titulo="Palavras negativas" itens={[c.negativas.join("\n")]} />
                )}
                {c.produtos.length > 0 && (
                  <div>
                    <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Peças para o criativo
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {c.produtos.map((p) => (
                        <a
                          key={p.sku}
                          href={p.link}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full border bg-background px-2.5 py-1 text-xs hover:border-primary"
                        >
                          {p.nome}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        );
      })}
      <p className="text-xs text-muted-foreground">
        Os valores de referência (CTR, custo por clique e por conversa) são pontos de partida para o
        setor agrícola no Uruguai: ajuste com os números reais depois de 2 semanas rodando. Use
        fotos próprias ou licenciadas nos criativos.
      </p>
    </div>
  );
}
function Bloco({ titulo, itens, max = 0 }: { titulo: string; itens: string[]; max?: number }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {titulo}
        </p>
        {itens.length > 1 && <Copiar texto={itens.join("\n")} rotulo="Copiar todos" />}
      </div>
      <div className="space-y-1.5">
        {itens.map((t, i) => (
          <div key={i} className="flex items-start gap-2 rounded-md border bg-background p-2">
            <p className="flex-1 whitespace-pre-line text-sm">{t}</p>
            {max > 0 && !t.includes("\n") && (
              <span
                className={cn(
                  "shrink-0 text-[10px] tabular-nums",
                  t.length > max ? "font-bold text-red-600" : "text-muted-foreground",
                )}
              >
                {t.length}/{max}
              </span>
            )}
            <Copiar texto={t} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- 5. Métricas
const Campo = ({
  r,
  v,
  set,
  pre,
  suf,
  step = 1,
}: {
  r: string;
  v: number;
  set: (x: number) => void;
  pre?: string;
  suf?: string;
  step?: number;
}) => (
  <label className="text-sm">
    <span className="text-xs font-medium text-muted-foreground">{r}</span>
    <span className="mt-1 flex items-center rounded-md border bg-background px-2">
      {pre && <span className="text-xs text-muted-foreground">{pre}</span>}
      <input
        type="number"
        step={step}
        value={v}
        onChange={(e) => set(Number(e.target.value) || 0)}
        className="h-9 w-full bg-transparent px-1 text-right tabular-nums outline-none"
      />
      {suf && <span className="text-xs text-muted-foreground">{suf}</span>}
    </span>
  </label>
);
function Metricas({ d }: { d: CriadorAnuncios }) {
  const m = d.metricas;
  const [orc, setOrc] = useState(300);
  const [cot, setCot] = useState(40);
  const [ticket, setTicket] = useState(Math.round(m.ticketReal ?? m.ticketEstimado ?? 3000));
  const [margem, setMargem] = useState(m.margemPadrao || 40);
  const [fecha, setFecha] = useState(25);
  const [cpl, setCpl] = useState(2.5);
  const lucroVenda = (ticket * margem) / (100 + margem);
  const cpaMax = lucroVenda / cot;
  const cplMax = cpaMax * (fecha / 100);
  const leads = cpl > 0 ? orc / cpl : 0;
  const vendas = leads * (fecha / 100);
  const receita = vendas * ticket;
  const roas = orc > 0 ? receita / (orc * cot) : 0;
  const lucro = vendas * lucroVenda - orc * cot;
  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[2fr_3fr]">
        <Painel titulo="Calculadora: quanto posso pagar por cliente?">
          <div className="grid grid-cols-2 gap-3">
            <Campo r="Orçamento mensal" v={orc} set={setOrc} pre="US$" step={50} />
            <Campo r="Cotação do dólar" v={cot} set={setCot} pre="$U" step={0.5} />
            <Campo
              r={m.ticketReal ? "Ticket médio (vendas 'Ganho')" : "Ticket médio (estimado)"}
              v={ticket}
              set={setTicket}
              pre="$U"
              step={100}
            />
            <Campo r="Margem média" v={margem} set={setMargem} suf="%" />
            <Campo r="Conversas que viram venda" v={fecha} set={setFecha} suf="%" />
            <Campo
              r="Custo por conversa (real ou meta)"
              v={cpl}
              set={setCpl}
              pre="US$"
              step={0.1}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Margem padrão configurada em Precificação: {m.margemPadrao}% · vendas marcadas "Ganho":{" "}
            {m.vendasGanhas}.
          </p>
        </Painel>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          <Kpi
            rotulo="Lucro bruto por venda"
            valor={fmtUYU(lucroVenda)}
            sub={usd(lucroVenda / cot)}
          />
          <Kpi rotulo="Custo máximo por venda" valor={usd(cpaMax)} sub="acima disso, prejuízo" />
          <Kpi
            rotulo="Custo máximo por conversa"
            valor={usd(cplMax)}
            sub={`com ${fecha}% de fechamento`}
          />
          <Kpi rotulo="Conversas esperadas/mês" valor={n(Math.round(leads))} />
          <Kpi
            rotulo="Vendas esperadas/mês"
            valor={n(Math.round(vendas * 10) / 10)}
            sub={fmtUYU(receita)}
          />
          <Card
            className={cn(
              "p-4",
              roas >= 1 ? "border-emerald-300 bg-emerald-50" : "border-red-200 bg-red-50",
            )}
          >
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              ROAS · resultado
            </p>
            <p className="mt-1 text-2xl font-bold tabular-nums">
              {roas.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}x
            </p>
            <p className="text-xs">
              {lucro >= 0 ? "Lucro" : "Prejuízo"} de {fmtUYU(Math.abs(lucro))}/mês
            </p>
          </Card>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Painel titulo="Metas para os anúncios do Meta (Instagram/Facebook)">
          <Metas
            linhas={[
              ["CTR do link", "≥ 1%", "Abaixo de 0,7%: troque a imagem/vídeo"],
              ["Custo por clique (CPC)", "≤ US$ 0,25", "Público pequeno demais ou criativo fraco"],
              [
                "Custo por conversa no WhatsApp",
                `≤ ${usd(Math.min(cplMax || 2.5, 3))}`,
                "É a métrica principal",
              ],
              ["Frequência (7 dias)", "≤ 3", "Acima disso, troque o criativo"],
              ["Conversas → venda", `≥ ${fecha}%`, "Marque as vendas em Carrinhos/Cotações"],
            ]}
          />
        </Painel>
        <Painel titulo="Metas para o Google Ads">
          <Metas
            linhas={[
              ["CTR (pesquisa)", "≥ 5%", "Abaixo: títulos mais parecidos com a busca"],
              ["Custo por clique", "≤ US$ 0,50", "Use correspondência de frase/exata"],
              [
                "Taxa de conversão",
                `≥ ${pct(Math.max(0.04, m.taxaLeadAtual))}`,
                `Hoje o site converte ${pct(m.taxaLeadAtual)}`,
              ],
              ["Custo por conversão", `≤ ${usd(cplMax || 5)}`, "Conversão = clique no WhatsApp"],
              ["Parcela de impressões", "≥ 60%", "Se menor, falta orçamento ou lance"],
            ]}
          />
        </Painel>
      </div>
      <Painel titulo="Como medir (já está pronto no site)">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>
            Todo clique no WhatsApp vira "Lead" no Pixel do Meta, na API de Conversões e no Google
            Ads (Admin → Integrações).
          </li>
          <li>
            Use os links com UTM das campanhas: em Admin → Análises → Funil você vê visitas,
            carrinho e WhatsApp por canal.
          </li>
          <li>
            Marque as vendas fechadas como "Ganho" com o valor em Carrinhos: isso envia a compra ao
            Meta e permite calcular o ROAS real.
          </li>
          <li>
            Revise a cada 7 dias: pause anúncios com custo por conversa acima de {usd(cplMax || 3)}{" "}
            e aumente 20% o orçamento dos que estão abaixo.
          </li>
        </ul>
      </Painel>
    </div>
  );
}
function Metas({ linhas }: { linhas: string[][] }) {
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-xs uppercase text-muted-foreground">
        <tr>
          <th className="py-1">Métrica</th>
          <th>Meta</th>
          <th>Se não bater</th>
        </tr>
      </thead>
      <tbody className="divide-y">
        {linhas.map(([a, b, c]) => (
          <tr key={a}>
            <td className="py-1.5 font-medium">{a}</td>
            <td className="whitespace-nowrap font-semibold text-primary">{b}</td>
            <td className="text-xs text-muted-foreground">{c}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

// ---------------------------------------------------------------- 6. Produtos
function Produtos({ d }: { d: CriadorAnuncios }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Peças com foto e preço, ordenadas pelo interesse real (pedidos no WhatsApp valem mais que
        visitas). Quando há poucos dados, completamos com promoções e as marcas mais procuradas.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {d.produtos.map((p, i) => (
          <Card key={p.sku} className="flex gap-3 p-3">
            <span className="w-5 shrink-0 text-sm font-bold text-muted-foreground">{i + 1}</span>
            {p.imagem ? (
              <img
                src={img(p.imagem)}
                alt=""
                className="h-20 w-20 shrink-0 rounded border object-contain"
              />
            ) : (
              <span className="h-20 w-20 shrink-0 rounded border bg-muted" />
            )}
            <div className="min-w-0 flex-1 text-sm">
              <p className="line-clamp-2 font-semibold">{p.nome}</p>
              <p className="text-xs text-muted-foreground">
                {p.marca ?? ""} · {p.sku}
              </p>
              <p className="mt-0.5 font-bold text-primary">
                {p.uyu ? fmtUYU(p.uyu) : ""}
                {p.brl ? (
                  <span className="ml-1 text-xs font-normal text-muted-foreground">
                    {fmtBRL(p.brl)}
                  </span>
                ) : null}
                {p.desconto ? (
                  <span className="ml-1 rounded bg-red-100 px-1 text-[10px] text-red-700">
                    −{p.desconto}%
                  </span>
                ) : null}
              </p>
              <p
                className={cn(
                  "mt-1 text-xs",
                  p.origem === "interesse" ? "text-emerald-700" : "text-muted-foreground",
                )}
              >
                {p.motivo}
              </p>
              <div className="mt-1.5 flex gap-1.5">
                <a
                  href={p.link}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                >
                  Abrir <ExternalLink className="h-3 w-3" />
                </a>
                <Copiar
                  texto={`🚜 ${p.nome}${p.uyu ? ` — ${fmtUYU(p.uyu)}` : ""}. Consultá por WhatsApp.`}
                  rotulo="Texto"
                />
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- 7. Textos da home
function Textos({ d }: { d: CriadorAnuncios }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Variações de título e subtítulo para o topo da página inicial (ou banners). Teste uma por
        vez durante 2 semanas e compare a taxa de pedidos no WhatsApp em Análises → Resumo.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        {d.textosHome.map((t, i) => (
          <Card key={i} className="overflow-hidden">
            <div className="flex items-center justify-between border-b bg-muted/40 px-4 py-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {t.publico} · {t.idioma === "pt" ? "PT" : "ES"}
              </span>
              <Copiar texto={`${t.titulo}\n${t.subtitulo}\n[${t.botao}]`} rotulo="Copiar tudo" />
            </div>
            <div className="bg-gradient-to-br from-[#0b3d22] to-[#0b7a3b] p-5 text-white">
              <p className="text-xl font-extrabold leading-tight">{t.titulo}</p>
              <p className="mt-2 text-sm text-white/85">{t.subtitulo}</p>
              <span className="mt-3 inline-block rounded-md bg-[#f5b301] px-3 py-1.5 text-sm font-bold text-[#1a1a1a]">
                {t.botao}
              </span>
            </div>
            <div className="flex flex-wrap gap-3 px-4 py-2 text-[11px] text-muted-foreground">
              <span>Título: {t.titulo.length} caracteres</span>
              <span>Subtítulo: {t.subtitulo.length}</span>
            </div>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Para aplicar: Admin → Página inicial (blocos) ou Banners.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- 8. Calendário
function Calendario({ d }: { d: CriadorAnuncios }) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        O que as máquinas estão fazendo em cada mês no Uruguai (e no RS, parecido). Anuncie as peças{" "}
        <b>um mês antes</b> da safra: o produtor compra quando prepara a máquina.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {d.calendario.map((c) => (
          <Card key={c.mes} className={cn("p-4", c.atual && "border-primary ring-1 ring-primary")}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold">{c.nome}</h3>
              {c.atual && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                  agora
                </span>
              )}
            </div>
            <p className="mt-1 text-sm">{c.safra}</p>
            <p className="mt-1.5 text-xs">
              <b>Peças:</b> {c.foco}
            </p>
            <div className="mt-2 flex items-center justify-between gap-2 rounded-md bg-muted/60 px-2 py-1.5">
              <span className="text-xs italic">"{c.ideia}"</span>
              <Copiar texto={c.ideia} />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- 9. Palavras-chave
const SITE = "https://agropartsuy.com";
const GRUPOS: Grupo[] = [
  "Autoridade",
  "Local",
  "Fronteira",
  "Marca",
  "Categoria",
  "Marca + categoria",
  "Modelo",
  "Buscas reais",
  "Conteúdo",
];
const DESC_GRUPO: Record<Grupo, string> = {
  Autoridade: '"Mayor tienda / maior loja", distribuidora, loja online: a marca como referência',
  Local: "Cada departamento, cidade e região com sua própria página",
  Fronteira: "Brasileiro que procura peças no Uruguai / Chuí",
  Marca: "Repuestos Massey, John Deere, Valtra...",
  Categoria: "Filtros, embragues, hidráulica...",
  "Marca + categoria": "Filtros John Deere, embrague Massey...",
  Modelo: "Cauda longa: embrague MF 290, bomba hidráulica Valtra 785",
  "Buscas reais": "O que os visitantes já digitaram na busca do site",
  Conteúdo: "Perguntas: viram artigos/guias (tráfego orgânico)",
};
function Palavras({ d }: { d: CriadorAnuncios }) {
  const todas = useMemo(() => gerarPalavras({ buscasReais: d.buscasReais }), [d.buscasReais]);
  const [mercado, setMercado] = useState<"todos" | "UY" | "RS">("todos");
  const [grupo, setGrupo] = useState<Grupo | "todos">("todos");
  const [prio, setPrio] = useState<0 | 1 | 2>(0);
  const [q, setQ] = useState("");
  const [limite, setLimite] = useState(200);
  const lista = todas.filter(
    (p) =>
      (mercado === "todos" || p.mercado === mercado) &&
      (grupo === "todos" || p.grupo === grupo) &&
      (!prio || p.prioridade <= prio) &&
      (!q || p.termo.includes(q.toLowerCase())),
  );
  const baixar = (nome: string, texto: string) => {
    const url = URL.createObjectURL(new Blob(["﻿" + texto], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = nome;
    a.click();
    URL.revokeObjectURL(url);
  };
  const conta = (g: Grupo) =>
    todas.filter((p) => p.grupo === g && (mercado === "todos" || p.mercado === mercado)).length;
  const pecas = d.marcas.reduce((a, m) => a + m.pecasComFoto, 0);
  return (
    <div className="space-y-4">
      <Card className="border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <b>Importante:</b> "mayor tienda / maior loja" funciona como <b>palavra-chave</b> (é o que o
        cliente digita), mas no <b>texto do anúncio</b> o Google exige comprovação de terceiros para
        superlativos ("el mayor", "el mejor"). No anúncio use fatos verificáveis: "+
        {n(Math.floor(pecas / 1000) * 1000)} repuestos online", "Cotizá por WhatsApp",
        "Distribuidores en Uruguay".
      </Card>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
        {GRUPOS.map((g) => (
          <button
            key={g}
            onClick={() => setGrupo(grupo === g ? "todos" : g)}
            className={cn(
              "rounded-xl border p-3 text-left transition",
              grupo === g
                ? "border-primary bg-primary/5 ring-1 ring-primary"
                : "bg-card hover:border-primary/40",
            )}
          >
            <p className="flex items-center justify-between text-sm font-semibold">
              {g} <span className="tabular-nums text-primary">{n(conta(g))}</span>
            </p>
            <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{DESC_GRUPO[g]}</p>
          </button>
        ))}
      </div>
      <Card className="flex flex-wrap items-center gap-2 p-3">
        <div className="flex rounded-md border p-0.5 text-xs">
          {(
            [
              ["todos", "Todos"],
              ["UY", "Uruguai (es)"],
              ["RS", "RS (pt)"],
            ] as const
          ).map(([v, r]) => (
            <button
              key={v}
              onClick={() => setMercado(v)}
              className={cn(
                "rounded px-2.5 py-1 font-semibold",
                mercado === v ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <div className="flex rounded-md border p-0.5 text-xs">
          {(
            [
              [0, "Todas"],
              [1, "Prioridade 1"],
              [2, "Prioridade 1 e 2"],
            ] as const
          ).map(([v, r]) => (
            <button
              key={v}
              onClick={() => setPrio(v)}
              className={cn(
                "rounded px-2.5 py-1 font-semibold",
                prio === v ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filtrar (ex.: rocha, massey)"
          className="h-8 w-52 rounded-md border bg-background px-2 text-sm"
        />
        <span className="text-sm text-muted-foreground">
          <b className="text-foreground">{n(lista.length)}</b> palavras
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <button
            onClick={() => baixar(`palavras-google-ads-${mercado}.csv`, csvGoogleAds(lista, SITE))}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
          >
            <Download className="h-4 w-4" /> CSV p/ Google Ads Editor
          </button>
          <Copiar texto={lista.map((p) => p.termo).join("\n")} rotulo="Copiar lista" />
          <Copiar
            texto={[
              ...(mercado !== "RS" ? NEGATIVAS_PADRAO.es : []),
              ...(mercado !== "UY" ? NEGATIVAS_PADRAO.pt : []),
            ].join("\n")}
            rotulo="Copiar negativas"
          />
        </div>
      </Card>
      <Card className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Palavra-chave</th>
              <th>Grupo</th>
              <th className="text-center">Prior.</th>
              <th>Corresp.</th>
              <th>Página de destino</th>
              <th>Campanha · grupo de anúncios</th>
              <th>Uso</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {lista.slice(0, limite).map((p) => (
              <tr key={`${p.idioma}${p.termo}`} className="hover:bg-muted/30">
                <td className="px-3 py-1.5 font-medium">
                  {p.termo}{" "}
                  <span className="ml-1 rounded bg-muted px-1 text-[10px] uppercase text-muted-foreground">
                    {p.idioma}
                  </span>
                </td>
                <td className="text-xs">{p.grupo}</td>
                <td className="text-center">
                  <span
                    className={cn(
                      "inline-block h-5 w-5 rounded-full text-center text-[11px] font-bold leading-5",
                      p.prioridade === 1
                        ? "bg-emerald-600 text-white"
                        : p.prioridade === 2
                          ? "bg-amber-100 text-amber-800"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {p.prioridade}
                  </span>
                </td>
                <td className="text-xs">{p.correspondencia}</td>
                <td className="max-w-[260px] truncate text-xs">
                  {p.destino ? (
                    <a
                      href={p.destino}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline"
                    >
                      {p.destino}
                    </a>
                  ) : (
                    <span className="text-amber-700">criar artigo</span>
                  )}
                </td>
                <td className="text-xs text-muted-foreground">
                  {p.campanha} · {p.grupoAnuncio}
                </td>
                <td className="text-xs">{p.uso}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {lista.length > limite && (
          <div className="p-3 text-center">
            <button
              onClick={() => setLimite((l) => l + 500)}
              className="text-sm font-semibold text-primary hover:underline"
            >
              Mostrar mais ({n(lista.length - limite)} restantes)
            </button>
          </div>
        )}
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Painel titulo="Como usar no Google Ads">
          <ol className="list-decimal space-y-1 pl-5 text-sm">
            <li>Filtre "Uruguai (es)" e "Prioridade 1 e 2" e baixe o CSV.</li>
            <li>
              No Google Ads Editor: Conta → Importar → Do arquivo. Ele cria campanhas e grupos de
              anúncios com as palavras e a página certa de cada uma.
            </li>
            <li>
              Em cada campanha: local "Uruguai (presença)", idioma espanhol, lance "Maximizar
              conversões" (conversão = clique no WhatsApp).
            </li>
            <li>
              Adicione as negativas como lista compartilhada e use os títulos/descrições da aba
              Campanhas prontas.
            </li>
            <li>
              Depois de 2 semanas, veja os "Termos de pesquisa": passe os bons para correspondência
              exata e os ruins para negativas.
            </li>
          </ol>
        </Painel>
        <Painel titulo="Como funciona no Google orgânico (SEO)">
          <ul className="list-disc space-y-1 pl-5 text-sm">
            <li>
              Cada grupo já tem sua página no site: <b>48 páginas por local</b>{" "}
              (/repuestos-agricolas/…), páginas por marca, por categoria, por marca + categoria e
              cada peça.
            </li>
            <li>
              Todas em espanhol e português (/pt), com hreflang, dados estruturados (FAQ, lista de
              produtos, trilha) e no sitemap.
            </li>
            <li>
              Os termos de "Conteúdo" pedem artigos/guias: próxima etapa para atrair quem ainda está
              pesquisando.
            </li>
            <li>
              Peça avaliações no Google Meu Negócio citando a cidade do cliente: ajuda nas buscas
              locais.
            </li>
          </ul>
        </Painel>
      </div>
    </div>
  );
}
