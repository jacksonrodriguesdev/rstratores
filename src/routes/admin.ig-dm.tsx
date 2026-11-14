import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Instagram, Loader2, RefreshCw, Send, Check, Trash2, Copy, Gift } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  listarCampanhasDmFn,
  postsRecentesIgFn,
  salvarCampanhaDmFn,
  ativarCampanhaDmFn,
  excluirCampanhaDmFn,
  sincronizarComentariosFn,
  comentariosDaCampanhaFn,
  enviarDmLogFn,
  marcarManualFn,
} from "@/lib/instagram-dm";

export const Route = createFileRoute("/admin/ig-dm")({ component: IgDmAdmin });

type Form = {
  id?: number;
  nome: string;
  media_id: string | null;
  permalink: string | null;
  palavra: string;
  dm_texto: string;
  resposta_publica: string;
  premio: "CASHBACK" | "CUPOM";
  valor: number;
  validade_dias: number;
  ativo: boolean;
};
const VAZIO: Form = {
  nome: "",
  media_id: null,
  permalink: null,
  palavra: "eu quiero",
  dm_texto: "¡Gracias por comentar! 🎁 Activá tu regalo acá: {{link}}",
  resposta_publica: "¡Listo! Te mandé un DM 📩",
  premio: "CASHBACK",
  valor: 500,
  validade_dias: 30,
  ativo: false,
};

function IgDmAdmin() {
  const qc = useQueryClient();
  const { data: campanhas } = useQuery({
    queryKey: ["ig-dm"],
    queryFn: () => listarCampanhasDmFn(),
  });
  const { data: posts } = useQuery({ queryKey: ["ig-posts"], queryFn: () => postsRecentesIgFn() });
  const [f, setF] = useState<Form>(VAZIO);
  const [salvando, setSalvando] = useState(false);
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }));

  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarCampanhaDmFn({ data: f });
      await qc.invalidateQueries({ queryKey: ["ig-dm"] });
      toast.success(f.id ? "Campanha atualizada." : "Campanha criada.");
      setF(VAZIO);
    } catch (e: any) {
      toast.error(e.message || "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-4">
      <div className="flex items-center gap-2">
        <Instagram className="h-6 w-6 text-pink-600" />
        <h1 className="text-2xl font-bold">Instagram: comentário → DM</h1>
      </div>
      <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
        Quem comentar a palavra-chave no post recebe um DM com o link do prêmio (cashback na
        carteira). <strong>O envio automático do DM exige a permissão de mensagens da Meta</strong>{" "}
        (App Review). Enquanto não sai, use o botão <em>Sincronizar</em> para ver quem comentou e
        enviar o DM manualmente — já funciona hoje.
      </p>

      {/* Formulário */}
      <Card className="space-y-4 p-5">
        <div className="font-semibold">{f.id ? `Editando campanha #${f.id}` : "Nova campanha"}</div>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Nome</span>
          <Input value={f.nome} onChange={(e) => set({ nome: e.target.value })} />
        </label>

        {/* Escolher o post do Instagram */}
        <div className="space-y-1">
          <span className="text-sm font-medium">Post do Instagram</span>
          {posts && posts.length > 0 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {posts.map((p: any) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => set({ media_id: p.id, permalink: p.permalink })}
                  className={
                    "w-24 shrink-0 overflow-hidden rounded-lg border-2 text-left " +
                    (f.media_id === p.id ? "border-pink-500" : "border-transparent")
                  }
                  title={p.legenda}
                >
                  {p.foto ? (
                    <img src={p.foto} alt="" className="h-24 w-24 object-cover" />
                  ) : (
                    <div className="flex h-24 w-24 items-center justify-center bg-muted text-xs">
                      {p.tipo}
                    </div>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Nenhum post encontrado (ou Instagram não conectado). Você pode colar o ID do post
              manualmente abaixo.
            </p>
          )}
          <Input
            placeholder="ID do post (media_id)"
            value={f.media_id ?? ""}
            onChange={(e) => set({ media_id: e.target.value || null })}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Palavra-chave do comentário</span>
            <Input value={f.palavra} onChange={(e) => set({ palavra: e.target.value })} />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Resposta pública ao comentário (opcional)</span>
            <Input
              value={f.resposta_publica}
              onChange={(e) => set({ resposta_publica: e.target.value })}
            />
          </label>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Mensagem do DM</span>
          <textarea
            className="min-h-20 w-full rounded-md border px-3 py-2 text-sm"
            value={f.dm_texto}
            onChange={(e) => set({ dm_texto: e.target.value })}
          />
          <span className="text-xs text-muted-foreground">
            Use <code>{"{{link}}"}</code> onde entra o link do prêmio.
          </span>
        </label>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block space-y-1">
            <span className="flex items-center gap-1 text-sm font-medium">
              <Gift className="h-3.5 w-3.5" /> Cashback (UYU)
            </span>
            <Input
              type="number"
              min={0}
              value={f.valor}
              onChange={(e) => set({ valor: Math.max(0, Math.round(Number(e.target.value) || 0)) })}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Validade (dias)</span>
            <Input
              type="number"
              min={1}
              value={f.validade_dias}
              onChange={(e) =>
                set({ validade_dias: Math.max(1, Math.round(Number(e.target.value) || 30)) })
              }
            />
          </label>
          <label className="flex items-center justify-between gap-2 pt-6">
            <span className="text-sm font-medium">Ativa</span>
            <Switch checked={f.ativo} onCheckedChange={(v) => set({ ativo: v })} />
          </label>
        </div>

        <div className="flex gap-2">
          <Button onClick={salvar} disabled={salvando || !f.nome || !f.palavra}>
            {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {f.id ? "Salvar" : "Criar campanha"}
          </Button>
          {f.id && (
            <Button variant="outline" onClick={() => setF(VAZIO)}>
              Cancelar
            </Button>
          )}
        </div>
      </Card>

      {/* Lista de campanhas */}
      <div className="space-y-4">
        {campanhas?.map((c) => (
          <CampanhaCard
            key={c.id}
            c={c}
            aoEditar={() =>
              setF({
                id: c.id,
                nome: c.nome,
                media_id: c.media_id,
                permalink: c.permalink,
                palavra: c.palavra,
                dm_texto: c.dm_texto,
                resposta_publica: c.resposta_publica ?? "",
                premio: c.premio === "CUPOM" ? "CUPOM" : "CASHBACK",
                valor: c.valor,
                validade_dias: c.validade_dias,
                ativo: c.ativo,
              })
            }
          />
        ))}
        {campanhas && !campanhas.length && (
          <p className="text-center text-sm text-muted-foreground">Nenhuma campanha ainda.</p>
        )}
      </div>
    </div>
  );
}

function CampanhaCard({ c, aoEditar }: { c: any; aoEditar: () => void }) {
  const qc = useQueryClient();
  const [aberto, setAberto] = useState(false);
  const [sinc, setSinc] = useState(false);
  const { data: comentarios } = useQuery({
    queryKey: ["ig-dm-coment", c.id],
    queryFn: () => comentariosDaCampanhaFn({ data: { id: c.id } }),
    enabled: aberto,
  });

  const sincronizar = async () => {
    setSinc(true);
    try {
      const r = await sincronizarComentariosFn({ data: { id: c.id } });
      if ((r as any).erro) toast.error((r as any).erro);
      else toast.success(`${(r as any).novos} novos comentários.`);
      await qc.invalidateQueries({ queryKey: ["ig-dm-coment", c.id] });
      await qc.invalidateQueries({ queryKey: ["ig-dm"] });
    } finally {
      setSinc(false);
    }
  };
  const toggle = async (v: boolean) => {
    await ativarCampanhaDmFn({ data: { id: c.id, ativo: v } });
    await qc.invalidateQueries({ queryKey: ["ig-dm"] });
  };
  const excluir = async () => {
    if (!confirm("Excluir esta campanha?")) return;
    await excluirCampanhaDmFn({ data: { id: c.id } });
    await qc.invalidateQueries({ queryKey: ["ig-dm"] });
  };

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="font-semibold">
          {c.nome} <span className="text-xs text-muted-foreground">· "{c.palavra}"</span>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={c.ativo} onCheckedChange={toggle} />
          <Button size="icon" variant="ghost" onClick={aoEditar} title="Editar">
            ✏️
          </Button>
          <Button size="icon" variant="ghost" onClick={excluir} title="Excluir">
            <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-600" />
          </Button>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-2 text-center text-xs">
        {[
          ["Comentários", c.comentarios],
          ["DMs", c.dms],
          ["Cadastros", c.cadastros],
          ["Resgates", c.resgates],
        ].map(([l, v]) => (
          <div key={l as string} className="rounded bg-muted p-2">
            <div className="text-muted-foreground">{l}</div>
            <div className="text-base font-bold">{v as number}</div>
          </div>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
        <button
          className="flex items-center gap-1 rounded border px-2 py-1 hover:bg-muted"
          onClick={() => {
            navigator.clipboard?.writeText(c.link);
            toast.success("Link copiado.");
          }}
        >
          <Copy className="h-3 w-3" /> {c.link}
        </button>
        <Button size="sm" variant="outline" onClick={sincronizar} disabled={sinc}>
          {sinc ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
          )}
          Sincronizar comentários
        </Button>
        <button className="underline" onClick={() => setAberto((x) => !x)}>
          {aberto ? "ocultar" : "ver quem comentou"}
        </button>
      </div>

      {aberto && (
        <div className="mt-3 space-y-1">
          {comentarios?.map((l) => (
            <LinhaComentario key={l.id} l={l} campanhaId={c.id} />
          ))}
          {comentarios && !comentarios.length && (
            <p className="text-xs text-muted-foreground">
              Ninguém comentou a palavra-chave ainda. Clique em "Sincronizar".
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

function LinhaComentario({ l, campanhaId }: { l: any; campanhaId: number }) {
  const qc = useQueryClient();
  const [enviando, setEnviando] = useState(false);
  const enviar = async () => {
    setEnviando(true);
    try {
      const r = await enviarDmLogFn({ data: { id: l.id } });
      if ((r as any).ok) toast.success("DM enviado.");
      else toast.error((r as any).erro || "Falha (permissão de mensagens pendente?).");
      await qc.invalidateQueries({ queryKey: ["ig-dm-coment", campanhaId] });
    } finally {
      setEnviando(false);
    }
  };
  const manual = async () => {
    await marcarManualFn({ data: { id: l.id } });
    await qc.invalidateQueries({ queryKey: ["ig-dm-coment", campanhaId] });
  };
  const cor =
    l.status === "ENVIADO" || l.status === "MANUAL"
      ? "text-emerald-600"
      : l.status === "ERRO"
        ? "text-red-600"
        : "text-muted-foreground";
  return (
    <div className="flex items-center justify-between gap-2 rounded border p-2 text-sm">
      <div className="min-w-0">
        <span className="font-medium">@{l.username ?? "—"}</span>{" "}
        <span className="text-xs text-muted-foreground">{l.texto}</span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={"text-xs font-semibold " + cor}>{l.status}</span>
        {l.status !== "ENVIADO" && l.status !== "MANUAL" && (
          <>
            <Button size="sm" variant="outline" onClick={enviar} disabled={enviando}>
              {enviando ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Send className="h-3.5 w-3.5" />
              )}
            </Button>
            <Button size="sm" variant="ghost" onClick={manual} title="Marquei como enviado">
              <Check className="h-3.5 w-3.5" />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
