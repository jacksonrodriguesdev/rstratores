import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Loader2, Wand2, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { getPostAutoFn, salvarPostAutoFn, gerarPostAgoraFn } from "@/lib/posts-auto";

export const Route = createFileRoute("/admin/posts-auto")({ component: PostsAutoAdmin });

function PostsAutoAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["posts-auto"], queryFn: () => getPostAutoFn() });
  const [cfg, setCfg] = useState<NonNullable<typeof data> | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [gerando, setGerando] = useState(false);
  useEffect(() => {
    if (data && !cfg) setCfg(data);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const salvar = async () => {
    if (!cfg) return;
    setSalvando(true);
    try {
      await salvarPostAutoFn({ data: cfg });
      await qc.invalidateQueries({ queryKey: ["posts-auto"] });
      toast.success("Salvo.");
    } finally {
      setSalvando(false);
    }
  };
  const gerarAgora = async () => {
    setGerando(true);
    try {
      await gerarPostAgoraFn();
      toast.success("Post gerado! Veja na fila do Instagram.");
    } catch (e: any) {
      toast.error(e.message || "Não foi possível gerar.");
    } finally {
      setGerando(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4">
      <div className="flex items-center gap-2">
        <Sparkles className="h-6 w-6 text-amber-500" />
        <h1 className="text-2xl font-bold">Posts automáticos (Instagram)</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Todo dia o sistema escolhe um <strong>produto com foto</strong>, monta a legenda em espanhol
        (+ hashtags no 1º comentário) e cria 1 post. Você decide se ele fica como{" "}
        <strong>rascunho para aprovar</strong> ou publica sozinho.
      </p>

      {cfg && (
        <Card className="space-y-5 p-5">
          <label className="flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold">Gerar 1 post por dia</div>
              <div className="text-xs text-muted-foreground">Liga o robô diário.</div>
            </div>
            <Switch checked={cfg.ativo} onCheckedChange={(v) => setCfg({ ...cfg, ativo: v })} />
          </label>

          <div className="space-y-1">
            <span className="text-sm font-medium">O que fazer com o post do dia</span>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["RASCUNHO", "Rascunho para aprovar", "Fica na fila; você publica com 1 clique."],
                  ["AUTO", "Publicar sozinho", "Agenda e publica no horário, sem você tocar."],
                ] as const
              ).map(([v, t, d]) => (
                <button
                  key={v}
                  onClick={() => setCfg({ ...cfg, modo: v })}
                  className={
                    "rounded-lg border-2 p-3 text-left " +
                    (cfg.modo === v ? "border-primary bg-primary/5" : "border-muted")
                  }
                >
                  <div className="text-sm font-semibold">{t}</div>
                  <div className="text-xs text-muted-foreground">{d}</div>
                </button>
              ))}
            </div>
          </div>

          <label className="block space-y-1">
            <span className="flex items-center gap-1.5 text-sm font-medium">
              <Clock className="h-3.5 w-3.5" /> Horário (hora do dia, Uruguai)
            </span>
            <Input
              type="number"
              min={0}
              max={23}
              value={cfg.hora}
              onChange={(e) =>
                setCfg({
                  ...cfg,
                  hora: Math.min(23, Math.max(0, Math.round(Number(e.target.value) || 0))),
                })
              }
              className="w-28"
            />
            <span className="text-xs text-muted-foreground">
              No modo "Publicar sozinho", posta nesse horário.
            </span>
          </label>

          <div className="flex flex-wrap gap-2">
            <Button onClick={salvar} disabled={salvando}>
              {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Salvar
            </Button>
            <Button variant="outline" onClick={gerarAgora} disabled={gerando}>
              {gerando ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Wand2 className="mr-2 h-4 w-4" />
              )}
              Gerar post agora (preview)
            </Button>
            <Link
              to="/admin/instagram"
              search={{ tela: "publicacoes" } as never}
              className="inline-flex items-center rounded-md border px-3 text-sm hover:bg-muted"
            >
              Ver a fila
            </Link>
          </div>
        </Card>
      )}

      <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
        Precisa do <strong>Instagram conectado</strong> (Admin → Instagram). As fotos usadas são as
        dos produtos do catálogo (as que têm foto própria). Em breve dá pra rotacionar também as
        artes de campanha que já criamos.
      </p>
    </div>
  );
}
