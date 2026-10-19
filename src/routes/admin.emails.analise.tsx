import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Eye,
  Filter,
  Loader2,
  MessageCircle,
  MousePointerClick,
  Send,
  ShoppingBag,
  Smartphone,
  Table2,
  Globe,
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
import { EmailAbas } from "@/components/admin/EmailAbas";
import { resumoEmailsFn } from "@/lib/email-marketing";
import { statusEmailFn } from "@/lib/emails";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/emails/analise")({
  component: Analise,
});

// Cores das 3 séries (validadas: categóricas 1–3 da paleta de referência; a 3ª tem contraste
// baixo sobre o branco, por isso a legenda mostra os números e há a tabela por dia)
const COR = { enviados: "#2a78d6", abertos: "#eb6834", clicados: "#1baf7a" };
const pct = (a: number, b: number) =>
  b ? `${((a / b) * 100).toFixed(1).replace(".", ",")}%` : "—";
const n = (v: number) => v.toLocaleString("pt-BR");
const dinheiro = (r: Record<string, number>) =>
  Object.entries(r)
    .map(([m, v]) =>
      m === "BRL"
        ? `R$ ${v.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`
        : `$U ${v.toLocaleString("es-UY", { maximumFractionDigits: 0 })}`,
    )
    .join(" + ") || "—";
const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function Analise() {
  const [dias, setDias] = useState(30);
  const [tabela, setTabela] = useState(false);
  const { data: st } = useQuery({ queryKey: ["email-status"], queryFn: () => statusEmailFn() });
  const { data: r, isLoading } = useQuery({
    queryKey: ["email-analise", dias],
    queryFn: () => resumoEmailsFn({ data: { dias } }),
  });
  const t = r?.total;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <BarChart3 className="h-6 w-6 text-primary" /> Análise de e-mails
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Aberturas, cliques e o que os e-mails geraram no site (visita, WhatsApp e compra pelo
            link de pagamento) em campanhas, automações e lembretes de carrinho.
          </p>
        </div>
        <EmailAbas atual="analise" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {[7, 30, 90, 180].map((d) => (
          <button
            key={d}
            onClick={() => setDias(d)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-semibold",
              dias === d ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {d} dias
          </button>
        ))}
        {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      {st && !st.webhook && (
        <Card className="flex gap-3 border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Aberturas e cliques precisam do webhook do Resend.</p>
            <p className="mt-1">
              No Resend: Webhooks → Add endpoint →{" "}
              <code className="rounded bg-amber-100 px-1">
                {st.origem}/api/public/resend-webhook
              </code>{" "}
              (eventos delivered, opened, clicked, bounced, complained) e coloque o Signing secret
              em <code className="rounded bg-amber-100 px-1">RESEND_WEBHOOK_SECRET</code> na
              Hostinger.
            </p>
          </div>
        </Card>
      )}

      {t && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
          <Kpi
            icone={Send}
            rotulo="Enviados"
            valor={n(t.enviados)}
            sub={`${pct(t.entregues, t.enviados)} entregues`}
          />
          <Kpi
            icone={Eye}
            rotulo="Abertura"
            valor={pct(t.abertos, t.enviados)}
            sub={`${n(t.abertos)} e-mails`}
          />
          <Kpi
            icone={MousePointerClick}
            rotulo="Cliques"
            valor={pct(t.clicados, t.enviados)}
            sub={`${n(t.clicados)} e-mails`}
          />
          <Kpi
            icone={MousePointerClick}
            rotulo="Clique / abertura"
            valor={pct(t.clicados, t.abertos)}
            sub="de quem abriu"
          />
          <Kpi
            icone={Globe}
            rotulo="Visitaram o site"
            valor={n(t.visitaram)}
            sub="até 7 dias depois"
          />
          <Kpi
            icone={MessageCircle}
            rotulo="WhatsApp"
            valor={n(t.whatsapp)}
            sub="até 7 dias depois"
          />
          <Kpi
            icone={ShoppingBag}
            rotulo="Compraram"
            valor={n(t.compraram)}
            sub="link pago em 14 dias"
          />
          <Kpi
            icone={ShoppingBag}
            rotulo="Vendas"
            valor={dinheiro(t.receita)}
            sub={`${n(t.rebotes)} rebotes/spam`}
            pequeno
          />
        </div>
      )}

      {r && (
        <Card className="p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">
              Por dia (e-mails enviados no dia e o que fizeram com eles)
            </h2>
            <div className="flex items-center gap-4 text-xs">
              {(["enviados", "abertos", "clicados"] as const).map((k) => (
                <span key={k} className="flex items-center gap-1.5 text-muted-foreground">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: COR[k] }} />
                  {k === "enviados" ? "Enviados" : k === "abertos" ? "Abertos" : "Clicados"}{" "}
                  <b className="text-foreground">{n(r.serie.reduce((s, d) => s + d[k], 0))}</b>
                </span>
              ))}
              <button
                onClick={() => setTabela(!tabela)}
                className="flex items-center gap-1 rounded-md border px-2 py-1 font-semibold hover:bg-muted"
              >
                <Table2 className="h-3.5 w-3.5" /> {tabela ? "Gráfico" : "Tabela"}
              </button>
            </div>
          </div>
          {tabela ? (
            <div className="mt-3 max-h-80 overflow-y-auto rounded-lg border text-sm">
              <table className="w-full">
                <thead className="sticky top-0 bg-muted/80 text-left text-xs text-muted-foreground">
                  <tr>
                    <th className="p-2">Dia</th>
                    <th className="p-2 text-right">Enviados</th>
                    <th className="p-2 text-right">Abertos</th>
                    <th className="p-2 text-right">Clicados</th>
                  </tr>
                </thead>
                <tbody>
                  {[...r.serie].reverse().map((d) => (
                    <tr key={d.dia} className="border-t">
                      <td className="p-2">{d.dia.split("-").reverse().join("/")}</td>
                      <td className="p-2 text-right">{n(d.enviados)}</td>
                      <td className="p-2 text-right">{n(d.abertos)}</td>
                      <td className="p-2 text-right">{n(d.clicados)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-3 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={r.serie} margin={{ left: -10, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="dia"
                    tickFormatter={(d) => d.slice(8, 10) + "/" + d.slice(5, 7)}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={16}
                  />
                  <YAxis allowDecimals={false} fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip
                    labelFormatter={(d) => String(d).split("-").reverse().join("/")}
                    formatter={(v: number, k: string) => [
                      n(v),
                      k === "enviados" ? "Enviados" : k === "abertos" ? "Abertos" : "Clicados",
                    ]}
                    contentStyle={{ borderRadius: 10, fontSize: 12 }}
                  />
                  {(["enviados", "abertos", "clicados"] as const).map((k) => (
                    <Area
                      key={k}
                      type="monotone"
                      dataKey={k}
                      stroke={COR[k]}
                      strokeWidth={2}
                      fill={COR[k]}
                      fillOpacity={0.08}
                      dot={false}
                      activeDot={{ r: 4 }}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      )}

      {r && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-4">
            <h2 className="font-semibold">Melhor horário para abrir (Uruguai)</h2>
            <p className="text-xs text-muted-foreground">
              Quantos e-mails foram abertos em cada hora: use para agendar o envio.
            </p>
            <div className="mt-3 h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={r.horas.map((v, h) => ({ h: `${h}h`, v }))}
                  margin={{ left: -20, right: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="h" fontSize={10} tickLine={false} axisLine={false} interval={2} />
                  <YAxis allowDecimals={false} fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip
                    formatter={(v: number) => [n(v), "Aberturas"]}
                    contentStyle={{ borderRadius: 10, fontSize: 12 }}
                    cursor={{ fill: "var(--muted)" }}
                  />
                  <Bar dataKey="v" fill={COR.enviados} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
          <Card className="p-4">
            <h2 className="font-semibold">Dia da semana e aparelho</h2>
            <div className="mt-3 grid grid-cols-7 gap-1.5">
              {r.semana.map((v, i) => {
                const max = Math.max(1, ...r.semana);
                return (
                  <div key={i} className="text-center text-xs" title={`${n(v)} aberturas`}>
                    <div className="flex h-28 items-end justify-center rounded-md bg-muted/40">
                      <div
                        className="w-6 rounded-t"
                        style={{ height: `${(v / max) * 100}%`, background: COR.enviados }}
                      />
                    </div>
                    <p className="mt-1 font-semibold">{SEMANA[i]}</p>
                    <p className="text-muted-foreground">{n(v)}</p>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-sm">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              {Object.keys(r.aparelhos).length ? (
                Object.entries(r.aparelhos)
                  .sort((a, b) => b[1] - a[1])
                  .map(([k, v]) => (
                    <span key={k} className="rounded-full bg-muted px-3 py-0.5">
                      {k}: <b>{pct(v, r.cliquesRegistrados)}</b>
                    </span>
                  ))
              ) : (
                <span className="text-xs text-muted-foreground">
                  Aparece depois dos primeiros cliques.
                </span>
              )}
            </div>
          </Card>
        </div>
      )}

      {r && (
        <Card className="overflow-hidden p-0">
          <h2 className="border-b p-4 font-semibold">Campanhas e automações</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-3">E-mail</th>
                  <th className="p-3 text-right">Enviados</th>
                  <th className="p-3 text-right">Abertura</th>
                  <th className="p-3 text-right">Cliques</th>
                  <th className="p-3 text-right">Visitaram</th>
                  <th className="p-3 text-right">WhatsApp</th>
                  <th className="p-3 text-right">Compraram</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {r.ranking.map((g) => (
                  <tr key={g.chave} className="border-t">
                    <td className="p-3">
                      <span
                        className={cn(
                          "mr-2 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                          g.tipo === "campanha"
                            ? "bg-sky-100 text-sky-800"
                            : g.tipo === "automacao"
                              ? "bg-violet-100 text-violet-800"
                              : "bg-zinc-100 text-zinc-700",
                        )}
                      >
                        {g.tipo === "campanha"
                          ? "campanha"
                          : g.tipo === "automacao"
                            ? "automação"
                            : "carrinho"}
                      </span>
                      {g.nome}
                    </td>
                    <td className="p-3 text-right">{n(g.enviados)}</td>
                    <td className="p-3 text-right">{pct(g.abertos, g.enviados)}</td>
                    <td className="p-3 text-right">{pct(g.clicados, g.enviados)}</td>
                    <td className="p-3 text-right">{n(g.visitaram)}</td>
                    <td className="p-3 text-right">{n(g.whatsapp)}</td>
                    <td className="p-3 text-right">{n(g.compraram)}</td>
                    <td className="p-3 text-right">
                      {g.id && (
                        <Link
                          to="/admin/emails/funil"
                          search={g.tipo === "campanha" ? { campanha: g.id } : { automacao: g.id }}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                        >
                          <Filter className="h-3.5 w-3.5" /> Funil
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
                {!r.ranking.length && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-muted-foreground">
                      Nenhum e-mail enviado nesse período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {r && (
        <Card className="overflow-hidden p-0">
          <h2 className="border-b p-4 font-semibold">Links mais clicados</h2>
          {r.links.length ? (
            <ul className="divide-y text-sm">
              {r.links.map((l) => (
                <li
                  key={`${l.anuncio ? "a:" : ""}${l.url}`}
                  className="flex items-center gap-3 px-4 py-2"
                >
                  <span className="w-12 shrink-0 text-right font-bold">{n(l.cliques)}</span>
                  <span className="min-w-0 flex-1 truncate text-muted-foreground" title={l.url}>
                    {l.url}
                  </span>
                  {l.anuncio && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                      ANÚNCIO
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Os links clicados aparecem aqui a partir de agora (o webhook grava cada clique).
            </p>
          )}
        </Card>
      )}
    </div>
  );
}

function Kpi({
  icone: I,
  rotulo,
  valor,
  sub,
  pequeno,
}: {
  icone: any;
  rotulo: string;
  valor: string;
  sub: string;
  pequeno?: boolean;
}) {
  return (
    <Card className="p-3">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase text-muted-foreground">
        <I className="h-3.5 w-3.5" /> {rotulo}
      </p>
      <p className={cn("mt-1 font-bold", pequeno ? "text-base" : "text-2xl")}>{valor}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </Card>
  );
}
