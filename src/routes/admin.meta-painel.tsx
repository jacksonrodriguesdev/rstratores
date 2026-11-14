import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  BarChart3,
  Users,
  Eye,
  MousePointerClick,
  Heart,
  MessageCircle,
  Share2,
  UserPlus,
  Facebook as FacebookIcon,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EChart } from "@/components/admin/EChart";
import { painelMetaFn, atualizarPainelMetaFn } from "@/lib/meta-painel";

export const Route = createFileRoute("/admin/meta-painel")({ component: PainelMeta });

const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("pt-BR"));
const PERIODOS = [
  { d: 7, label: "7 dias" },
  { d: 14, label: "14 dias" },
  { d: 30, label: "30 dias" },
];
const METRICAS = [
  { id: "alcance", label: "Alcance", cor: "#0ea5e9" },
  { id: "visitas", label: "Visitas ao perfil", cor: "#10b981" },
  { id: "novosSeguidores", label: "Novos seguidores", cor: "#8b5cf6" },
  { id: "curtidas", label: "Curtidas", cor: "#ef4444" },
  { id: "comentarios", label: "Comentários", cor: "#f59e0b" },
  { id: "compartilhamentos", label: "Compartilhamentos", cor: "#ec4899" },
] as const;

function PainelMeta() {
  const qc = useQueryClient();
  const [dias, setDias] = useState(30);
  const { data } = useQuery({
    queryKey: ["painel-meta", dias],
    queryFn: () => painelMetaFn({ data: { dias } }),
  });
  const [metrica, setMetrica] = useState<(typeof METRICAS)[number]["id"]>("alcance");
  const [atualizando, setAtualizando] = useState(false);

  const atualizar = async () => {
    setAtualizando(true);
    try {
      await atualizarPainelMetaFn();
      await qc.invalidateQueries({ queryKey: ["painel-meta"] });
      toast.success("Atualizado.");
    } finally {
      setAtualizando(false);
    }
  };

  const ig = data?.painel;
  const serie = ig?.serie ?? [];
  const fb = data?.facebook;
  const demo = data?.demografia;
  const sel = METRICAS.find((m) => m.id === metrica)!;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-pink-600" />
          <h1 className="text-2xl font-bold">Painel Meta</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {PERIODOS.map((p) => (
              <button
                key={p.d}
                onClick={() => setDias(p.d)}
                className={
                  "rounded-full px-3 py-1 text-xs font-medium " +
                  (dias === p.d ? "bg-primary text-white" : "bg-muted text-zinc-600")
                }
              >
                {p.label}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={atualizar} disabled={atualizando}>
            {atualizando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {data && !data.conectado && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Instagram não conectado. Conecte em <strong>Admin → Instagram</strong>.
        </Card>
      )}

      {ig && (
        <>
          {/* KPIs Instagram */}
          <div className="text-sm font-semibold text-muted-foreground">Instagram · {dias} dias</div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            {[
              { icon: Users, label: "Seguidores", v: ig.seguidores },
              { icon: UserPlus, label: "Novos", v: ig.totais.novosSeguidores },
              { icon: Eye, label: "Alcance", v: ig.totais.alcance },
              { icon: MousePointerClick, label: "Visitas", v: ig.totais.visitas },
              { icon: Heart, label: "Curtidas", v: ig.totais.curtidas },
              { icon: MessageCircle, label: "Comentários", v: ig.totais.comentarios },
              { icon: Share2, label: "Compart.", v: ig.totais.compartilhamentos },
            ].map((k) => (
              <Card key={k.label} className="p-3">
                <k.icon className="mb-1 h-4 w-4 text-muted-foreground" />
                <div className="text-xs text-muted-foreground">{k.label}</div>
                <div className="text-base font-bold">{n(k.v)}</div>
              </Card>
            ))}
          </div>

          {/* Evolução por dia */}
          <Card className="p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">Evolução por dia</span>
              <div className="flex flex-wrap gap-1">
                {METRICAS.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMetrica(m.id)}
                    className={
                      "rounded-full px-3 py-1 text-xs font-medium " +
                      (metrica === m.id ? "bg-primary text-white" : "bg-muted text-zinc-600")
                    }
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            {serie.length > 1 ? (
              <EChart
                height={260}
                option={{
                  grid: { left: 48, right: 16, top: 16, bottom: 28 },
                  tooltip: { trigger: "axis" },
                  xAxis: { type: "category", data: serie.map((s) => s.dia.slice(5)) },
                  yAxis: { type: "value" },
                  series: [
                    {
                      type: ["curtidas", "comentarios", "compartilhamentos"].includes(metrica)
                        ? "bar"
                        : "line",
                      smooth: true,
                      showSymbol: false,
                      data: serie.map((s) => (s as any)[metrica]),
                      lineStyle: { color: sel.cor, width: 2 },
                      itemStyle: { color: sel.cor },
                      areaStyle: { color: sel.cor, opacity: 0.12 },
                    },
                  ],
                }}
              />
            ) : (
              <p className="py-10 text-center text-xs text-muted-foreground">
                Sem dados no período.
              </p>
            )}
            <p className="mt-1 text-[11px] text-muted-foreground">
              Alcance, visitas e novos seguidores vêm da Meta por dia. Curtidas, comentários e
              compartilhamentos são somados pelos posts publicados no dia.
            </p>
          </Card>

          {/* Top posts */}
          <Card className="p-4">
            <div className="mb-3 text-sm font-semibold">Top posts (por engajamento)</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {ig.topPosts.map((p: any) => (
                <a
                  key={p.id}
                  href={p.link ?? "#"}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-3 rounded-lg border p-2 hover:bg-muted"
                >
                  {p.imagem ? (
                    <img src={p.imagem} alt="" className="h-14 w-14 rounded object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded bg-muted text-xs">
                      {p.tipo}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs text-muted-foreground">
                      {p.legenda || p.tipo} · {p.quando}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs font-semibold">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" /> {p.curtidas}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" /> {p.comentarios}
                      </span>
                      <span className="flex items-center gap-1">
                        <Share2 className="h-3 w-3" /> {p.compartilhamentos}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" /> {p.alcance}
                      </span>
                    </div>
                  </div>
                </a>
              ))}
              {!ig.topPosts.length && (
                <p className="text-xs text-muted-foreground">Sem posts no período.</p>
              )}
            </div>
          </Card>

          {/* Facebook */}
          {fb && (
            <Card className="p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <FacebookIcon className="h-4 w-4 text-blue-600" /> Facebook · {fb.nome}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  { label: "Seguidores", v: fb.seguidores },
                  { label: "Alcance", v: fb.alcance },
                  { label: "Engajamento", v: fb.engajamento },
                  { label: "Novos seguidores", v: fb.novosSeguidores },
                ].map((k) => (
                  <div key={k.label} className="rounded bg-muted p-2 text-center">
                    <div className="text-xs text-muted-foreground">{k.label}</div>
                    <div className="text-base font-bold">{n(k.v)}</div>
                  </div>
                ))}
              </div>
              {fb.serie && fb.serie.length > 1 && (
                <EChart
                  height={200}
                  option={{
                    grid: { left: 48, right: 16, top: 16, bottom: 28 },
                    tooltip: { trigger: "axis" },
                    xAxis: { type: "category", data: fb.serie.map((s: any) => s.dia.slice(5)) },
                    yAxis: { type: "value" },
                    series: [
                      {
                        type: "line",
                        smooth: true,
                        showSymbol: false,
                        data: fb.serie.map((s: any) => s.v),
                        lineStyle: { color: "#2563eb", width: 2 },
                        itemStyle: { color: "#2563eb" },
                        areaStyle: { color: "#2563eb", opacity: 0.12 },
                      },
                    ],
                  }}
                />
              )}
            </Card>
          )}

          {/* Demografia */}
          {demo && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Demo titulo="Cidades" dados={demo.cidade} />
              <Demo titulo="Países" dados={demo.pais} />
              <Demo titulo="Idade" dados={demo.idade} />
              <Demo titulo="Gênero" dados={demo.genero} />
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Demo({ titulo, dados }: { titulo: string; dados: { chave: string; valor: number }[] }) {
  const max = Math.max(1, ...dados.map((d) => d.valor));
  return (
    <Card className="p-4">
      <div className="mb-2 text-sm font-semibold">{titulo}</div>
      {dados.length ? (
        <div className="space-y-1.5">
          {dados.map((d) => (
            <div key={d.chave} className="text-xs">
              <div className="flex justify-between">
                <span className="truncate">{d.chave}</span>
                <span className="font-semibold">{d.valor.toLocaleString("pt-BR")}</span>
              </div>
              <div className="mt-0.5 h-1.5 rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-pink-500"
                  style={{ width: `${(d.valor / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Sem dados (a demografia precisa de 100+ seguidores).
        </p>
      )}
    </Card>
  );
}
