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
  Image as ImageIcon,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EChart } from "@/components/admin/EChart";
import { painelMetaFn, atualizarPainelMetaFn } from "@/lib/meta-painel";

export const Route = createFileRoute("/admin/meta-painel")({ component: PainelMeta });

const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("pt-BR"));
const METRICAS = [
  { id: "seguidores", label: "Seguidores", cor: "#8b5cf6" },
  { id: "alcance", label: "Alcance", cor: "#0ea5e9" },
  { id: "visitas", label: "Visitas ao perfil", cor: "#10b981" },
  { id: "interacoes", label: "Interações", cor: "#f59e0b" },
] as const;

function PainelMeta() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["painel-meta"], queryFn: () => painelMetaFn() });
  const [metrica, setMetrica] = useState<(typeof METRICAS)[number]["id"]>("seguidores");
  const [atualizando, setAtualizando] = useState(false);

  const atualizar = async () => {
    setAtualizando(true);
    try {
      await atualizarPainelMetaFn();
      await qc.invalidateQueries({ queryKey: ["painel-meta"] });
      toast.success("Painel atualizado.");
    } finally {
      setAtualizando(false);
    }
  };

  const d = data?.desempenho;
  const serie = data?.serie ?? [];
  const demo = data?.demografia;
  const sel = METRICAS.find((m) => m.id === metrica)!;

  const topPosts = [...(d?.recentes ?? [])]
    .filter((p) => p.tipo !== "STORY")
    .sort((a, b) => b.curtidas + b.comentarios - (a.curtidas + a.comentarios))
    .slice(0, 8);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-6 w-6 text-pink-600" />
          <h1 className="text-2xl font-bold">Painel Meta (Instagram)</h1>
        </div>
        <Button variant="outline" size="sm" onClick={atualizar} disabled={atualizando}>
          {atualizando ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Atualizar agora
        </Button>
      </div>

      {data && !data.conectado && (
        <Card className="p-6 text-center text-sm text-muted-foreground">
          Instagram não conectado. Conecte em <strong>Admin → Instagram</strong> para ver os
          números.
        </Card>
      )}

      {d && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { icon: Users, label: "Seguidores", v: d.seguidores },
              { icon: Eye, label: "Alcance (28d)", v: d.alcance },
              { icon: MousePointerClick, label: "Visitas (28d)", v: d.visitas },
              { icon: Heart, label: "Interações (28d)", v: d.interacoes },
              { icon: MessageCircle, label: "Contas engajadas", v: d.engajadas },
              { icon: ImageIcon, label: "Posts", v: d.posts },
            ].map((k) => (
              <Card key={k.label} className="p-3">
                <k.icon className="mb-1 h-4 w-4 text-muted-foreground" />
                <div className="text-xs text-muted-foreground">{k.label}</div>
                <div className="text-lg font-bold">{n(k.v)}</div>
              </Card>
            ))}
          </div>

          {/* Evolução */}
          <Card className="p-4">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold">Evolução (últimos dias)</span>
              <div className="flex gap-1">
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
                      type: "line",
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
                Ainda juntando o histórico — a evolução aparece após alguns dias de retratos diários
                (ou clique em "Atualizar agora").
              </p>
            )}
          </Card>

          {/* Top posts */}
          <Card className="p-4">
            <div className="mb-3 text-sm font-semibold">Top posts (por engajamento)</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {topPosts.map((p) => (
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
                      {p.legenda || p.tipo}
                    </div>
                    <div className="mt-1 flex gap-3 text-xs font-semibold">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" /> {p.curtidas}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageCircle className="h-3 w-3" /> {p.comentarios}
                      </span>
                    </div>
                  </div>
                </a>
              ))}
              {!topPosts.length && (
                <p className="text-xs text-muted-foreground">Sem posts recentes.</p>
              )}
            </div>
          </Card>

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
