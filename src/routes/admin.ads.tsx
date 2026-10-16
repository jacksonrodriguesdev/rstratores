import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Megaphone,
  RefreshCw,
  Pause,
  Play,
  Pencil,
  Check,
  X,
  Copy,
  Link2,
  Unplug,
  AlertTriangle,
  CheckCircle2,
  History,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  estadoAdsFn,
  salvarContasAdsFn,
  relatorioAdsFn,
  sincronizarAdsFn,
  statusCampanhaFn,
  orcamentoCampanhaFn,
  desconectarGoogleAdsFn,
} from "@/lib/ads";
import { cn } from "@/lib/utils";

// Admin → Central de Anúncios: Google Ads + Meta Ads lado a lado, cruzados com os pedidos pelo
// WhatsApp e as vendas registradas no site. Pausar/ativar e orçamento diário com confirmação.
export const Route = createFileRoute("/admin/ads")({
  validateSearch: z.object({ gads: z.string().optional(), msg: z.string().optional() }),
  component: CentralAnuncios,
});

const uyu = (v: number | null | undefined) =>
  v == null ? "—" : `$U ${Math.round(v).toLocaleString("es-UY")}`;
const moedaFmt = (v: number | null | undefined, m: string) =>
  v == null
    ? "—"
    : `${m === "UYU" ? "$U" : m === "BRL" ? "R$" : m === "USD" ? "US$" : m} ${v.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`;
const n = (v: number) => Math.round(v).toLocaleString("pt-BR");
const div = (a: number | null, b: number) => (a != null && b > 0 ? a / b : null);
const dataBR = (d: string) => d.split("-").reverse().slice(0, 2).join("/");
const NOME: Record<string, string> = { GOOGLE: "Google Ads", META: "Meta (Facebook/Instagram)" };
const COR: Record<string, string> = { GOOGLE: "#1e8e3e", META: "#0866ff" };

function CentralAnuncios() {
  const { gads, msg } = Route.useSearch();
  const qc = useQueryClient();
  const [dias, setDias] = useState(30);
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => {
    if (gads === "ok") toast.success("Google Ads conectado. Importando as campanhas…");
    if (gads === "erro") toast.error(msg || "Não foi possível conectar o Google Ads.");
  }, [gads, msg]);

  const estado = useQuery({
    queryKey: ["ads-estado"],
    queryFn: () => estadoAdsFn(),
    refetchInterval: 30_000,
  });
  const rel = useQuery({
    queryKey: ["ads-rel", dias],
    queryFn: () => relatorioAdsFn({ data: { dias } }),
    refetchInterval: 60_000,
  });
  const recarregar = () => {
    qc.invalidateQueries({ queryKey: ["ads-rel"] });
    qc.invalidateQueries({ queryKey: ["ads-estado"] });
  };
  const atualizar = async () => {
    setOcupado(true);
    try {
      const r = await sincronizarAdsFn();
      const erros = Object.entries(r).filter(([, v]) => v?.erro);
      if (erros.length) erros.forEach(([p, v]) => toast.error(`${NOME[p]}: ${v.erro}`));
      else toast.success("Dados atualizados");
      recarregar();
    } finally {
      setOcupado(false);
    }
  };

  const algumaConta = estado.data && (estado.data.google.pronto || estado.data.meta.pronto);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-zinc-900">
            <Megaphone className="h-6 w-6 text-primary" /> Central de Anúncios
          </h1>
          <p className="text-sm text-zinc-500">
            Google Ads e Meta num lugar só: quanto gastamos, quantos pedidos e vendas vieram de cada
            campanha, e controle de pausa e orçamento.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {[7, 14, 30, 90].map((d) => (
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
          {algumaConta && (
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              onClick={atualizar}
              disabled={ocupado}
            >
              <RefreshCw className={cn("h-4 w-4", ocupado && "animate-spin")} /> Atualizar agora
            </Button>
          )}
        </div>
      </div>

      {estado.data && <Contas e={estado.data} aoMudar={recarregar} />}
      {rel.isLoading ? (
        <p className="flex items-center gap-2 text-sm text-zinc-500">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
        </p>
      ) : rel.data && rel.data.campanhas.length ? (
        <Painel r={rel.data} aoMudar={recarregar} />
      ) : algumaConta ? (
        <Card className="p-5 text-sm text-zinc-600">
          Nenhuma campanha importada ainda. Clique em <b>Atualizar agora</b> (a primeira importação
          traz 90 dias).
        </Card>
      ) : null}
    </div>
  );
}

// ---------------------------------------------------------------- Contas
function Contas({
  e,
  aoMudar,
}: {
  e: Awaited<ReturnType<typeof estadoAdsFn>>;
  aoMudar: () => void;
}) {
  const [campos, setCampos] = useState(e.campos);
  const [salvando, setSalvando] = useState(false);
  const [aberto, setAberto] = useState(!e.google.pronto || !e.meta.pronto);
  useEffect(() => setCampos(e.campos), [e.campos]);
  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarContasAdsFn({ data: campos });
      toast.success("Contas salvas");
      aoMudar();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSalvando(false);
    }
  };
  const campo = (k: keyof typeof campos, rotulo: string, ph: string, ajuda?: string) => (
    <label className="block text-sm font-semibold text-zinc-700">
      {rotulo}
      <Input
        value={campos[k]}
        onChange={(ev) => setCampos((c) => ({ ...c, [k]: ev.target.value }))}
        placeholder={ph}
        className="mt-1 font-mono text-sm"
        autoComplete="off"
      />
      {ajuda && <span className="mt-0.5 block text-xs font-normal text-zinc-500">{ajuda}</span>}
    </label>
  );
  const Selo = ({
    pronto,
    erro,
    ultima,
    conta,
  }: {
    pronto: boolean;
    erro: string | null;
    ultima: string | null;
    conta: { nome: string; moeda: string } | null;
  }) =>
    erro ? (
      <p className="flex items-start gap-1.5 text-sm font-semibold text-red-600">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {erro}
      </p>
    ) : pronto ? (
      <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
        <CheckCircle2 className="h-4 w-4" />{" "}
        {conta ? `${conta.nome} · ${conta.moeda}` : "Configurado"}
        {ultima && (
          <span className="font-normal text-zinc-500">
            · atualizado {new Date(ultima).toLocaleString("pt-BR")}
          </span>
        )}
      </p>
    ) : (
      <p className="text-sm text-amber-700">Falta configurar</p>
    );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-zinc-900">Google Ads</h2>
          <button
            onClick={() => setAberto((a) => !a)}
            className="text-xs font-semibold text-primary"
          >
            {aberto ? "fechar" : "configurar"}
          </button>
        </div>
        <Selo
          pronto={e.google.pronto}
          erro={e.google.erro}
          ultima={e.google.ultimaSync}
          conta={e.google.conta}
        />
        {aberto && (
          <div className="mt-3 space-y-3">
            <ol className="list-decimal space-y-1 pl-5 text-xs text-zinc-600">
              <li>
                Crie uma <b>conta de gerente (MCC)</b> em ads.google.com/home/tools/manager-accounts
                e vincule a conta da AGRO PARTS a ela.
              </li>
              <li>
                Na MCC: Ferramentas → <b>Centro de API</b> → copie o <b>token de desenvolvedor</b>.
                Se aparecer “Acesso de teste”, peça o acesso <b>Explorador</b> (é
                automático/rápido).
              </li>
              <li>Preencha abaixo e salve; depois clique em “Conectar conta Google”.</li>
            </ol>
            {campo(
              "mkt_gads_customer_id",
              "ID da conta do Google Ads",
              "123-456-7890",
              "No topo do Google Ads, ao lado do nome da conta.",
            )}
            {campo(
              "mkt_gads_login_customer_id",
              "ID da conta de gerente (MCC)",
              "987-654-3210",
              "Opcional se a conta não for gerenciada por uma MCC.",
            )}
            {campo(
              "mkt_gads_dev_token",
              "Token de desenvolvedor",
              "cole aqui (fica só no servidor)",
            )}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={salvar} disabled={salvando}>
                Salvar
              </Button>
              {e.google.conectado ? (
                <>
                  <span className="self-center text-xs text-zinc-500">
                    Conectado: {e.google.email}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1 text-zinc-500"
                    onClick={async () => {
                      if (!confirm("Desconectar a conta Google do Google Ads?")) return;
                      await desconectarGoogleAdsFn();
                      aoMudar();
                    }}
                  >
                    <Unplug className="h-4 w-4" /> Desconectar
                  </Button>
                </>
              ) : (
                <a href="/api/admin/google/conectar?para=ads">
                  <Button size="sm" variant="outline" className="gap-1.5">
                    <Link2 className="h-4 w-4" /> Conectar conta Google
                  </Button>
                </a>
              )}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-extrabold text-zinc-900">Meta (Facebook / Instagram)</h2>
          <button
            onClick={() => setAberto((a) => !a)}
            className="text-xs font-semibold text-primary"
          >
            {aberto ? "fechar" : "configurar"}
          </button>
        </div>
        <Selo
          pronto={e.meta.pronto}
          erro={e.meta.erro}
          ultima={e.meta.ultimaSync}
          conta={e.meta.conta}
        />
        {aberto && (
          <div className="mt-3 space-y-3">
            <ol className="list-decimal space-y-1 pl-5 text-xs text-zinc-600">
              <li>
                business.facebook.com → Configurações do negócio → <b>Usuários do sistema</b> → crie
                um (Admin) e dê acesso à conta de anúncios.
              </li>
              <li>
                “Gerar token” → marque <b>ads_read</b> e <b>ads_management</b> (para pausar e mudar
                orçamento) → validade “Nunca”.
              </li>
              <li>Cole abaixo. O token fica só no servidor; nunca mande por chat.</li>
            </ol>
            {campo(
              "mkt_meta_ad_account",
              "Conta de anúncios",
              "act_1234567890",
              "Gerenciador de Anúncios → ID da conta.",
            )}
            {campo(
              "mkt_meta_ads_token",
              "Token do usuário do sistema",
              "cole aqui (fica só no servidor)",
            )}
            <Button size="sm" onClick={salvar} disabled={salvando}>
              Salvar
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- Painel
type Rel = Awaited<ReturnType<typeof relatorioAdsFn>>;

function Delta({ a, b, inverso }: { a: number | null; b: number | null; inverso?: boolean }) {
  if (a == null || b == null || b === 0) return null;
  const d = (a - b) / b;
  const bom = inverso ? d < 0 : d > 0;
  return (
    <span className={cn("text-xs font-bold", bom ? "text-emerald-600" : "text-red-600")}>
      {d > 0 ? "▲" : "▼"} {Math.abs(Math.round(d * 100))}% vs período anterior
    </span>
  );
}

function Painel({ r, aoMudar }: { r: Rel; aoMudar: () => void }) {
  const t = r.totais;
  const kpis = [
    {
      rotulo: "Investido",
      valor: uyu(t.gastoUYU),
      delta: <Delta a={t.gastoUYU} b={r.anterior.gastoUYU} />,
      cor: "text-zinc-900",
    },
    {
      rotulo: "Cliques",
      valor: n(t.cliques),
      extra: `CPC ${uyu(div(t.gastoUYU, t.cliques))}`,
      delta: <Delta a={t.cliques} b={r.anterior.cliques} />,
      cor: "text-sky-700",
    },
    {
      rotulo: "Pedidos no WhatsApp (site)",
      valor: n(t.leadsSite),
      extra: `custo por pedido ${uyu(div(t.gastoUYU, t.leadsSite))}`,
      cor: "text-emerald-700",
    },
    {
      rotulo: "Leads contados pelas plataformas",
      valor: n(t.leadsPlataforma),
      extra: `custo por lead ${uyu(div(t.gastoUYU, t.leadsPlataforma))}`,
      delta: <Delta a={t.leadsPlataforma} b={r.anterior.leadsPlataforma} />,
      cor: "text-violet-700",
    },
    {
      rotulo: "Vendas fechadas (site)",
      valor: n(t.vendasSite),
      extra: `custo por venda ${uyu(div(t.gastoUYU, t.vendasSite))}`,
      cor: "text-emerald-700",
    },
    {
      rotulo: "Receita das vendas",
      valor: uyu(t.receitaSite),
      extra: `retorno (ROAS) ${t.gastoUYU ? `${(t.receitaSite / t.gastoUYU).toFixed(1)}×` : "—"}`,
      cor: "text-amber-700",
    },
  ];
  return (
    <>
      <p className="text-xs text-zinc-500">
        {dataBR(r.periodo.ini)} a {dataBR(r.periodo.fim)} · valores em $U pela cotação do dia
        {Object.entries(r.taxas)
          .filter(([m]) => m !== "UYU")
          .map(([m, v]) => ` · 1 ${m} = $U ${v ? Number(v).toFixed(2) : "?"}`)
          .join("")}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((k) => (
          <Card key={k.rotulo} className="p-4">
            <p className="text-xs font-semibold uppercase text-zinc-500">{k.rotulo}</p>
            <p className={cn("text-3xl font-black", k.cor)}>{k.valor}</p>
            {k.extra && <p className="text-xs text-zinc-500">{k.extra}</p>}
            {k.delta}
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <Card className="p-4">
          <h2 className="mb-2 font-bold text-zinc-900">Investimento por dia ($U)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={r.serie}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                <XAxis dataKey="dia" tickFormatter={dataBR} fontSize={11} />
                <YAxis fontSize={11} />
                <Tooltip
                  labelFormatter={(d) => dataBR(String(d))}
                  formatter={(v: any, nome: string) => [uyu(Number(v)), nome]}
                />
                <Legend />
                <Bar dataKey="GOOGLE" name="Google Ads" stackId="a" fill={COR.GOOGLE} />
                <Bar dataKey="META" name="Meta" stackId="a" fill={COR.META} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card className="p-4">
          <h2 className="mb-2 font-bold text-zinc-900">Por plataforma</h2>
          {r.porPlataforma.map((p) => (
            <div key={p.plataforma} className="border-b py-2 text-sm last:border-0">
              <p className="font-bold" style={{ color: COR[p.plataforma] }}>
                {NOME[p.plataforma]}
              </p>
              <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-zinc-600">
                <span>Investido</span>
                <b className="text-right">{uyu(p.gastoUYU)}</b>
                <span>Cliques</span>
                <b className="text-right">{n(p.cliques)}</b>
                <span>Pedidos WhatsApp</span>
                <b className="text-right">{n(p.leadsSite)}</b>
                <span>Vendas / receita</span>
                <b className="text-right">
                  {n(p.vendasSite)} / {uyu(p.receitaSite)}
                </b>
              </div>
            </div>
          ))}
        </Card>
      </div>

      <Campanhas r={r} aoMudar={aoMudar} />
      <Utm soltas={r.utmSoltas} />
      <Historico acoes={r.acoes} />
    </>
  );
}

function Campanhas({ r, aoMudar }: { r: Rel; aoMudar: () => void }) {
  const [filtro, setFiltro] = useState<"" | "GOOGLE" | "META">("");
  const [editando, setEditando] = useState<string | null>(null);
  const [valor, setValor] = useState("");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const lista = r.campanhas.filter((c) => !filtro || c.plataforma === filtro);

  const status = async (c: Rel["campanhas"][number]) => {
    const ativar = c.status !== "ATIVA";
    if (
      !confirm(
        `${ativar ? "ATIVAR" : "PAUSAR"} a campanha “${c.nome}” no ${NOME[c.plataforma]}?\n\n${ativar ? "Ela volta a gastar o orçamento diário." : "Os anúncios param de aparecer até você ativar de novo."}`,
      )
    )
      return;
    setOcupado(c.id);
    try {
      await statusCampanhaFn({ data: { plataforma: c.plataforma, id: c.id, ativa: ativar } });
      toast.success(ativar ? "Campanha ativada" : "Campanha pausada");
      aoMudar();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setOcupado(null);
    }
  };

  const orcamento = async (c: Rel["campanhas"][number]) => {
    const v = Number(valor.replace(/\./g, "").replace(",", "."));
    if (!(v > 0)) return toast.error("Valor inválido");
    if (
      !confirm(
        `Mudar o orçamento diário de “${c.nome}”\nde ${moedaFmt(c.orcamentoDiario, c.moeda)} para ${moedaFmt(v, c.moeda)}?${c.compartilhado ? "\n\nAtenção: este orçamento é compartilhado com outras campanhas." : ""}`,
      )
    )
      return;
    setOcupado(c.id);
    const enviar = (confirmarAlto: boolean) =>
      orcamentoCampanhaFn({
        data: { plataforma: c.plataforma, id: c.id, valor: v, confirmarAlto },
      });
    try {
      try {
        await enviar(false);
      } catch (e: any) {
        if (!String(e.message).startsWith("CONFIRMAR:")) throw e;
        if (
          !confirm(
            `${String(e.message).replace("CONFIRMAR: ", "Atenção: ")}\n\nConfirma mesmo assim?`,
          )
        )
          return;
        await enviar(true);
      }
      toast.success("Orçamento atualizado");
      setEditando(null);
      aoMudar();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setOcupado(null);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-zinc-900">Campanhas ({lista.length})</h2>
        <div className="flex gap-1">
          {(["", "GOOGLE", "META"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold",
                filtro === f ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700",
              )}
            >
              {f ? NOME[f].split(" ")[0] : "Todas"}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm [&_td.text-right]:whitespace-nowrap [&_th]:whitespace-nowrap">
          <thead>
            <tr className="border-b text-left text-xs uppercase text-zinc-500">
              <th className="py-2 pr-2">Campanha</th>
              <th className="pr-2">Situação</th>
              <th className="pr-2 text-right">Orçamento/dia</th>
              <th className="pr-2 text-right">Investido</th>
              <th className="pr-2 text-right">Cliques</th>
              <th className="pr-2 text-right">CPC</th>
              <th className="pr-2 text-right" title="Leads/conversões contados pela plataforma">
                Leads (plat.)
              </th>
              <th
                className="pr-2 text-right"
                title="Pedidos pelo WhatsApp registrados no site com a UTM desta campanha"
              >
                WhatsApp (site)
              </th>
              <th className="pr-2 text-right">Custo/pedido</th>
              <th className="pr-2 text-right">Vendas</th>
              <th className="pr-2 text-right">Receita</th>
              <th className="pr-2 text-right">ROAS</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((c) => (
              <tr key={c.plataforma + c.id} className="border-b align-top last:border-0">
                <td className="py-2 pr-2">
                  <span
                    className="mr-1.5 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold text-white"
                    style={{ background: COR[c.plataforma] }}
                  >
                    {c.plataforma === "GOOGLE" ? "G" : "META"}
                  </span>
                  <span className="font-semibold text-zinc-900">{c.nome}</span>
                  <span className="block text-[11px] text-zinc-400">
                    ID {c.id}
                    {c.objetivo ? ` · ${c.objetivo}` : ""}
                  </span>
                </td>
                <td className="pr-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-bold",
                      c.status === "ATIVA" && "bg-emerald-100 text-emerald-800",
                      c.status === "PAUSADA" && "bg-amber-100 text-amber-800",
                      (c.status === "REMOVIDA" || c.status === "OUTRO") &&
                        "bg-zinc-200 text-zinc-600",
                    )}
                  >
                    {c.status === "ATIVA"
                      ? "Ativa"
                      : c.status === "PAUSADA"
                        ? "Pausada"
                        : c.status === "REMOVIDA"
                          ? "Removida"
                          : "Outro"}
                  </span>
                  {c.status !== "REMOVIDA" && (
                    <button
                      onClick={() => status(c)}
                      disabled={ocupado === c.id}
                      className="ml-1 inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-semibold text-primary hover:bg-primary/10"
                    >
                      {c.status === "ATIVA" ? (
                        <Pause className="h-3 w-3" />
                      ) : (
                        <Play className="h-3 w-3" />
                      )}
                      {c.status === "ATIVA" ? "Pausar" : "Ativar"}
                    </button>
                  )}
                </td>
                <td className="pr-2 text-right">
                  {editando === c.plataforma + c.id ? (
                    <span className="inline-flex items-center gap-1">
                      <Input
                        value={valor}
                        onChange={(e) => setValor(e.target.value)}
                        className="h-7 w-24 text-right"
                        inputMode="decimal"
                        autoFocus
                      />
                      <button
                        onClick={() => orcamento(c)}
                        disabled={ocupado === c.id}
                        className="text-emerald-600"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button onClick={() => setEditando(null)} className="text-zinc-400">
                        <X className="h-4 w-4" />
                      </button>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      {c.orcamentoDiario != null ? (
                        moedaFmt(c.orcamentoDiario, c.moeda)
                      ) : (
                        <span className="text-xs text-zinc-400">nos conjuntos</span>
                      )}
                      {c.orcamentoEditavel && (
                        <button
                          onClick={() => {
                            setEditando(c.plataforma + c.id);
                            setValor(String(c.orcamentoDiario ?? "").replace(".", ","));
                          }}
                          className="text-zinc-400 hover:text-primary"
                          title="Mudar orçamento diário"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </span>
                  )}
                  {c.compartilhado && (
                    <span className="block text-[10px] text-amber-700">compartilhado</span>
                  )}
                </td>
                <td className="pr-2 text-right font-semibold">
                  {uyu(c.gastoUYU)}
                  {c.moeda !== "UYU" && (
                    <span className="block text-[11px] font-normal text-zinc-400">
                      {moedaFmt(c.gasto, c.moeda)}
                    </span>
                  )}
                </td>
                <td className="pr-2 text-right">{n(c.cliques)}</td>
                <td className="pr-2 text-right">{uyu(div(c.gastoUYU, c.cliques))}</td>
                <td className="pr-2 text-right">{n(c.leadsPlataforma)}</td>
                <td className="pr-2 text-right font-semibold text-emerald-700">{n(c.leadsSite)}</td>
                <td className="pr-2 text-right">{uyu(div(c.gastoUYU, c.leadsSite))}</td>
                <td className="pr-2 text-right">{n(c.vendasSite)}</td>
                <td className="pr-2 text-right">{uyu(c.receitaSite)}</td>
                <td className="pr-2 text-right font-bold">
                  {c.gastoUYU ? `${(c.receitaSite / c.gastoUYU).toFixed(1)}×` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-xs text-zinc-500">
        “WhatsApp (site)” e “Vendas” vêm do próprio site, pela UTM da visita: configure as UTMs
        abaixo para cada campanha aparecer aqui.
      </p>
    </Card>
  );
}

function Utm({ soltas }: { soltas: Rel["utmSoltas"] }) {
  const google = "utm_source=google&utm_medium=cpc&utm_campaign={campaignid}";
  const meta = "utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.id}}";
  const copiar = (t: string) =>
    navigator.clipboard.writeText(t).then(() => toast.success("Copiado"));
  return (
    <Card className="p-4">
      <h2 className="font-bold text-zinc-900">
        UTMs: como ligar cada campanha aos pedidos do site
      </h2>
      <div className="mt-2 grid gap-3 text-sm md:grid-cols-2">
        <div className="rounded-xl bg-zinc-50 p-3">
          <p className="font-semibold">
            Google Ads → Conta → Configurações → Opções de URL da conta → “Sufixo do URL final”
          </p>
          <code className="mt-1 block break-all text-xs">{google}</code>
          <button
            onClick={() => copiar(google)}
            className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary"
          >
            <Copy className="h-3 w-3" /> Copiar
          </button>
        </div>
        <div className="rounded-xl bg-zinc-50 p-3">
          <p className="font-semibold">Meta → cada anúncio → Rastreamento → “Parâmetros de URL”</p>
          <code className="mt-1 block break-all text-xs">{meta}</code>
          <button
            onClick={() => copiar(meta)}
            className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary"
          >
            <Copy className="h-3 w-3" /> Copiar
          </button>
        </div>
      </div>
      {soltas.length > 0 && (
        <>
          <p className="mt-3 text-sm font-semibold text-amber-800">
            UTMs com visitas/pedidos que não batem com nenhuma campanha (nome ou ID diferente):
          </p>
          <ul className="mt-1 text-sm text-zinc-600">
            {soltas.map((s) => (
              <li key={s.utm}>
                <code>{s.utm}</code> — {s.visitas} visitas, {s.leads} pedidos, {s.vendas} vendas
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

function Historico({ acoes }: { acoes: Rel["acoes"] }) {
  if (!acoes.length) return null;
  return (
    <Card className="p-4">
      <h2 className="flex items-center gap-2 font-bold text-zinc-900">
        <History className="h-4 w-4 text-primary" /> Alterações feitas pelo painel
      </h2>
      <ul className="mt-2 space-y-1 text-sm">
        {acoes.map((a) => (
          <li key={a.id} className="flex flex-wrap gap-x-2">
            <span className="w-32 shrink-0 text-xs text-zinc-400">
              {new Date(a.quando).toLocaleString("pt-BR")}
            </span>
            <b>{a.acao === "PAUSAR" ? "Pausou" : a.acao === "ATIVAR" ? "Ativou" : "Orçamento"}</b>
            <span>{a.nome}</span>
            <span className="text-zinc-500">
              ({a.plataforma === "GOOGLE" ? "Google" : "Meta"}
              {a.acao === "ORCAMENTO" ? `: ${a.de} → ${a.para}` : ""})
            </span>
            {!a.ok && <span className="text-red-600">falhou: {a.erro}</span>}
          </li>
        ))}
      </ul>
    </Card>
  );
}
