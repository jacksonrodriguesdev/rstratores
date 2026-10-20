import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Film,
  Heart,
  Images,
  Instagram,
  Loader2,
  MessageCircle,
  Pencil,
  RefreshCw,
  Send,
  Trash2,
  Upload,
  X,
  AlertTriangle,
  Eye,
  Bookmark,
  Share2,
  Smartphone,
  Save,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  apagarPostFn,
  atualizarMetricasFn,
  cancelarAgendamentoFn,
  desconectarInstagramFn,
  listarPostsFn,
  publicarAgoraFn,
  salvarPostFn,
  statusInstagramFn,
  type PostForm,
  type PostInstagram,
} from "@/lib/instagram";
import { cn } from "@/lib/utils";

type Busca = { ig?: string; msg?: string; conta?: string };
export const Route = createFileRoute("/admin/instagram")({
  validateSearch: (s: Record<string, unknown>): Busca => ({
    ig: typeof s.ig === "string" ? s.ig : undefined,
    msg: typeof s.msg === "string" ? s.msg : undefined,
    conta: typeof s.conta === "string" ? s.conta : undefined,
  }),
  component: PaginaInstagram,
});

const TIPOS = [
  {
    k: "FEED",
    rotulo: "Post",
    icone: Instagram,
    dica: "1 imagem (quadrada, 4:5 ou horizontal) ou vídeo",
  },
  {
    k: "CARROSSEL",
    rotulo: "Carrossel",
    icone: Images,
    dica: "2 a 10 imagens/vídeos, no mesmo formato",
  },
  {
    k: "STORY",
    rotulo: "Story",
    icone: Smartphone,
    dica: "1 imagem ou vídeo em pé (9:16). Link e enquete: pelo app",
  },
  {
    k: "REELS",
    rotulo: "Reels",
    icone: Film,
    dica: "1 vídeo MP4 em pé (9:16), até 15 min. Música: pelo app",
  },
] as const;
const HASHTAGS = {
  pt: "#PreBlackFriday #AgroParts #PecasAgricolas #PecasParaTrator #Tratores #MasseyFerguson #Valtra #JohnDeere #NewHolland #AgroRS",
  es: "#PreBlackFriday #AgroParts #RepuestosAgricolas #RepuestosParaTractor #Tractores #MasseyFerguson #Valtra #JohnDeere #NewHolland #AgroUruguay",
};
const VAZIO: PostForm = { tipo: "FEED", legenda: "", comentario: "", midias: [] };
const src = (path: string) => `/uploads/${path}`;
const quando = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "";
const COR: Record<string, string> = {
  RASCUNHO: "bg-zinc-100 text-zinc-700",
  AGENDADO: "bg-sky-100 text-sky-800",
  PUBLICANDO: "bg-amber-100 text-amber-800",
  PUBLICADO: "bg-emerald-100 text-emerald-800",
  ERRO: "bg-red-100 text-red-700",
};

// Imagem → JPG (a API do Instagram só aceita JPEG), lado maior até 1440 px
async function paraJpg(arq: File): Promise<File> {
  const bmp = await createImageBitmap(arq);
  const k = Math.min(1, 1440 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  const g = c.getContext("2d")!;
  g.fillStyle = "#fff";
  g.fillRect(0, 0, c.width, c.height);
  g.drawImage(bmp, 0, 0, c.width, c.height);
  const blob: Blob | null = await new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.9));
  if (!blob) throw new Error("Não foi possível converter a imagem");
  return new File([blob], arq.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
}
async function enviar(arq: File) {
  const f = arq.type.startsWith("image/") ? await paraJpg(arq) : arq;
  const fd = new FormData();
  fd.append("file", f);
  const r = await fetch("/api/admin/instagram/upload", { method: "POST", body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.path) throw new Error(j.error || "Falha no envio");
  return { path: j.path as string, tipo: j.tipo as "IMAGE" | "VIDEO" };
}

function PaginaInstagram() {
  const busca = Route.useSearch();
  const qc = useQueryClient();
  const [form, setForm] = useState<PostForm>(VAZIO);
  const [aba, setAba] = useState<"AGENDADO" | "PUBLICADO" | "RASCUNHO" | "ERRO">("AGENDADO");
  const { data: st, refetch: refetchSt } = useQuery({
    queryKey: ["ig-status"],
    queryFn: () => statusInstagramFn(),
  });
  const { data: posts } = useQuery({
    queryKey: ["ig-posts"],
    queryFn: () => listarPostsFn(),
    refetchInterval: (q) => (q.state.data?.some((p) => p.status === "PUBLICANDO") ? 3000 : 60_000),
  });
  const atualizar = () => qc.invalidateQueries({ queryKey: ["ig-posts"] });

  useEffect(() => {
    if (busca.ig === "ok")
      toast.success(`Instagram conectado${busca.conta ? `: @${busca.conta}` : ""}`);
    if (busca.ig === "erro") toast.error(busca.msg || "Não foi possível conectar");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const editar = (p: PostInstagram) => {
    setForm({
      id: p.id,
      tipo: p.tipo,
      legenda: p.legenda,
      comentario: p.comentario,
      midias: p.midias,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const lista = (posts ?? []).filter((p) =>
    aba === "ERRO"
      ? p.status === "ERRO"
      : aba === "PUBLICADO"
        ? p.status === "PUBLICADO" || p.status === "PUBLICANDO"
        : p.status === aba,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Instagram className="h-6 w-6 text-primary" /> Instagram
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Publique posts, carrosséis, stories e Reels no Instagram da loja pelo painel, na hora ou
          agendados, e acompanhe curtidas, comentários e alcance de cada um.
        </p>
      </div>

      <Conexao st={st} atualizar={() => refetchSt()} />

      {st?.conectado && (
        <Compositor
          form={form}
          setForm={setForm}
          username={st.username}
          foto={st.foto}
          aoSalvar={(p) => {
            setForm(VAZIO);
            setAba(
              p.status === "AGENDADO"
                ? "AGENDADO"
                : p.status === "RASCUNHO"
                  ? "RASCUNHO"
                  : p.status === "ERRO"
                    ? "ERRO"
                    : "PUBLICADO",
            );
            atualizar();
            refetchSt();
          }}
        />
      )}

      {!!posts?.length && (
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center gap-1 border-b p-2">
            {(["AGENDADO", "PUBLICADO", "RASCUNHO", "ERRO"] as const).map((k) => {
              const n = (posts ?? []).filter((p) =>
                k === "PUBLICADO"
                  ? p.status === "PUBLICADO" || p.status === "PUBLICANDO"
                  : p.status === k,
              ).length;
              return (
                <button
                  key={k}
                  onClick={() => setAba(k)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-sm font-semibold",
                    aba === k ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                  )}
                >
                  {k === "AGENDADO"
                    ? "Agendados"
                    : k === "PUBLICADO"
                      ? "Publicados"
                      : k === "RASCUNHO"
                        ? "Rascunhos"
                        : "Com erro"}{" "}
                  ({n})
                </button>
              );
            })}
            {aba === "PUBLICADO" && (
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto"
                onClick={async () => {
                  const r = await atualizarMetricasFn();
                  toast.success(`Números de ${r.atualizados} publicações atualizados`);
                  atualizar();
                }}
              >
                <RefreshCw className="mr-1.5 h-4 w-4" /> Atualizar números
              </Button>
            )}
          </div>
          <ul className="divide-y">
            {lista.map((p) => (
              <ItemPost key={p.id} p={p} editar={() => editar(p)} atualizar={atualizar} />
            ))}
            {!lista.length && (
              <li className="p-8 text-center text-sm text-muted-foreground">Nada aqui.</li>
            )}
          </ul>
        </Card>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- conexão
function Conexao({ st, atualizar }: { st: any; atualizar: () => void }) {
  if (!st) return <Card className="p-5 text-sm text-muted-foreground">Carregando…</Card>;
  if (!st.configurado)
    return (
      <Card className="space-y-3 border-amber-200 bg-amber-50/60 p-5 text-sm">
        <p className="flex items-center gap-2 font-semibold text-amber-900">
          <AlertTriangle className="h-5 w-5" /> Falta criar o app na Meta (uma vez só)
        </p>
        <ol className="list-decimal space-y-1.5 pl-5 text-amber-950">
          <li>
            No app do Instagram:{" "}
            <b>Configurações → Tipo de conta → Mudar para conta profissional</b> (Empresa).
          </li>
          <li>
            Em <b>developers.facebook.com</b>, entre com sua conta e clique em <b>Criar app</b> →
            caso de uso <b>«Gerenciar mensagens e conteúdo no Instagram»</b>.
          </li>
          <li>
            No app: <b>Instagram → Configuração da API com login do Instagram</b>. Em «Configurar
            login comercial do Instagram», cadastre o URL de redirecionamento:{" "}
            <code className="rounded bg-amber-100 px-1">{st.callback}</code>
          </li>
          <li>
            Na mesma tela, em «Gerar tokens de acesso», <b>adicione a conta @rsagroparts</b> como
            testadora e aceite o convite no app do Instagram (Configurações → Apps e sites).
          </li>
          <li>
            Copie o <b>ID do app do Instagram</b> e a <b>Chave secreta do app do Instagram</b> e
            coloque no hPanel da Hostinger como{" "}
            <code className="rounded bg-amber-100 px-1">INSTAGRAM_APP_ID</code> e{" "}
            <code className="rounded bg-amber-100 px-1">INSTAGRAM_APP_SECRET</code>. A chave secreta
            vai só no hPanel, nunca em chat ou e-mail.
          </li>
          <li>
            Reinicie o app na Hostinger, volte aqui e clique em <b>Conectar Instagram</b>.
          </li>
        </ol>
      </Card>
    );
  if (!st.conectado)
    return (
      <Card className="flex flex-wrap items-center gap-4 p-5">
        <Instagram className="h-10 w-10 text-pink-600" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold">Conecte o Instagram da loja</p>
          <p className="text-muted-foreground">
            Você entra com o Instagram na tela da Meta; o site guarda só a autorização
            (criptografada).
          </p>
        </div>
        <Button asChild size="lg">
          <a href="/api/admin/instagram/conectar">
            <Instagram className="mr-2 h-5 w-5" /> Conectar Instagram
          </a>
        </Button>
      </Card>
    );
  const dias = st.expira ? Math.max(0, Math.round((st.expira - Date.now()) / 86400_000)) : null;
  return (
    <Card className="flex flex-wrap items-center gap-4 p-5">
      {st.foto ? (
        <img
          src={st.foto}
          alt=""
          className="h-14 w-14 rounded-full ring-2 ring-pink-500 ring-offset-2"
        />
      ) : (
        <Instagram className="h-12 w-12 text-pink-600" />
      )}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 font-semibold">
          @{st.username} <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        </p>
        <p className="text-sm text-muted-foreground">
          {st.seguidores != null && <>{st.seguidores.toLocaleString("pt-BR")} seguidores · </>}
          {st.posts != null && <>{st.posts} publicações · </>}
          {dias != null && <>autorização renova sozinha (vence em {dias} dias)</>}
        </p>
        {st.limite && (
          <p className="text-xs text-muted-foreground">
            Publicações pela API nas últimas 24 h: {st.limite.usados} de {st.limite.total}
          </p>
        )}
        {st.erro && (
          <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
            <AlertTriangle className="h-3.5 w-3.5" /> {st.erro}
          </p>
        )}
      </div>
      <div className="flex gap-2">
        <Button asChild variant="outline" size="sm">
          <a href="/api/admin/instagram/conectar">Reconectar</a>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600"
          onClick={async () => {
            if (
              !window.confirm(
                "Desconectar o Instagram? Os agendados não vão sair até conectar de novo.",
              )
            )
              return;
            await desconectarInstagramFn();
            toast.success("Instagram desconectado");
            atualizar();
          }}
        >
          Desconectar
        </Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- compositor
function Compositor({
  form,
  setForm,
  username,
  foto,
  aoSalvar,
}: {
  form: PostForm;
  setForm: (f: PostForm) => void;
  username: string | null;
  foto: string | null;
  aoSalvar: (p: PostInstagram) => void;
}) {
  const [subindo, setSubindo] = useState(0);
  const [indo, setIndo] = useState<string | null>(null);
  const [data, setData] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const [tam, setTam] = useState<Record<string, number>>({}); // proporção de cada imagem (largura/altura)
  const tipo = TIPOS.find((t) => t.k === form.tipo)!;
  const set = (p: Partial<PostForm>) => setForm({ ...form, ...p });
  const max = form.tipo === "CARROSSEL" ? 10 : 1;
  const hashtags = (form.legenda.match(/#[\p{L}\p{N}_]+/gu) ?? []).length;

  const adicionar = async (arqs: FileList) => {
    const lista = [...arqs].slice(0, max - (max === 1 ? 0 : form.midias.length));
    setSubindo(lista.length);
    const novas: PostForm["midias"] = [];
    for (const a of lista) {
      try {
        novas.push(await enviar(a));
      } catch (e: any) {
        toast.error(`${a.name}: ${e.message}`);
      }
      setSubindo((n) => n - 1);
    }
    setForm({
      ...form,
      midias: max === 1 ? novas.slice(0, 1) : [...form.midias, ...novas].slice(0, 10),
    });
    if (ref.current) ref.current.value = "";
  };
  const mover = (i: number, d: number) => {
    const m = [...form.midias];
    const j = i + d;
    if (j < 0 || j >= m.length) return;
    [m[i], m[j]] = [m[j], m[i]];
    set({ midias: m });
  };
  // Formato aceito pela Meta: feed de 4:5 (0,8) a 1,91:1; story/reels em pé
  const avisoFormato = form.midias
    .filter((m) => m.tipo === "IMAGE" && tam[m.path])
    .some((m) => (form.tipo === "STORY" ? false : tam[m.path] < 0.79 || tam[m.path] > 1.92));

  const salvar = async (acao: "rascunho" | "agendar" | "publicar") => {
    if (acao === "publicar" && !window.confirm(`Publicar agora no @${username}?`)) return;
    setIndo(acao);
    try {
      const p = await salvarPostFn({
        data: {
          ...form,
          acao,
          quando: acao === "agendar" && data ? new Date(data).toISOString() : null,
        },
      });
      if (acao === "publicar") {
        if (p.status === "PUBLICADO") toast.success("Publicado no Instagram!");
        else toast.error(p.erro || "Não publicou");
      } else
        toast.success(
          acao === "agendar" ? "Agendado: o site publica sozinho na hora" : "Rascunho salvo",
        );
      aoSalvar(p);
    } catch (e: any) {
      toast.error(e?.message || "Falha");
    } finally {
      setIndo(null);
    }
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <Card className="space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">{form.id ? "Editar publicação" : "Nova publicação"}</h2>
          {form.id && (
            <button
              onClick={() => setForm(VAZIO)}
              className="text-xs font-semibold text-muted-foreground hover:underline"
            >
              Começar outra
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TIPOS.map((t) => (
            <button
              key={t.k}
              onClick={() =>
                set({
                  tipo: t.k,
                  midias: t.k === "CARROSSEL" ? form.midias : form.midias.slice(0, 1),
                })
              }
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border p-3 text-sm font-semibold",
                form.tipo === t.k ? "border-primary bg-primary/5 text-primary" : "hover:bg-muted",
              )}
            >
              <t.icone className="h-5 w-5" /> {t.rotulo}
            </button>
          ))}
        </div>
        <p className="-mt-2 text-xs text-muted-foreground">{tipo.dica}</p>

        <div>
          <input
            ref={ref}
            type="file"
            multiple={max > 1}
            accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime"
            className="hidden"
            onChange={(e) => e.target.files?.length && adicionar(e.target.files)}
          />
          <div className="flex flex-wrap gap-2">
            {form.midias.map((m, i) => (
              <div
                key={m.path}
                className="group relative h-28 w-24 overflow-hidden rounded-lg border bg-muted"
              >
                {m.tipo === "VIDEO" ? (
                  <video src={src(m.path)} className="h-full w-full object-cover" muted />
                ) : (
                  <img
                    src={src(m.path)}
                    alt=""
                    className="h-full w-full object-cover"
                    onLoad={(e) => {
                      // Lê agora: o evento não existe mais quando o React aplica o estado
                      const prop = e.currentTarget.naturalWidth / e.currentTarget.naturalHeight;
                      setTam((t) => ({ ...t, [m.path]: prop }));
                    }}
                  />
                )}
                <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-black/50 p-0.5 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => mover(i, -1)}
                    className="p-1 text-white"
                    aria-label="Para a esquerda"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => set({ midias: form.midias.filter((_, k) => k !== i) })}
                    className="p-1 text-white"
                    aria-label="Remover"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => mover(i, 1)}
                    className="p-1 text-white"
                    aria-label="Para a direita"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {(max > 1 ? form.midias.length < max : true) && (
              <button
                onClick={() => ref.current?.click()}
                disabled={subindo > 0}
                className="flex h-28 w-24 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-xs text-muted-foreground hover:border-primary hover:text-primary"
              >
                {subindo ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Upload className="h-5 w-5" />
                )}
                {subindo
                  ? `Enviando ${subindo}…`
                  : max === 1 && form.midias.length
                    ? "Trocar"
                    : "Adicionar"}
              </button>
            )}
          </div>
          {avisoFormato && (
            <p className="mt-2 flex items-center gap-1 text-xs text-amber-700">
              <AlertTriangle className="h-3.5 w-3.5" /> O feed aceita de 4:5 (em pé) a 1,91:1
              (deitada). Os cards 1080×1350 servem.
            </p>
          )}
        </div>

        {form.tipo !== "STORY" && (
          <div>
            <div className="flex items-baseline justify-between text-xs font-semibold text-muted-foreground">
              <span>Legenda</span>
              <span
                className={cn(form.legenda.length > 2200 || hashtags > 30 ? "text-red-600" : "")}
              >
                {form.legenda.length}/2200 · {hashtags}/30 hashtags
              </span>
            </div>
            <textarea
              value={form.legenda}
              onChange={(e) => set({ legenda: e.target.value })}
              rows={7}
              className="mt-1 w-full rounded-md border bg-background p-2.5 text-sm"
              placeholder="Escreva a legenda (as descrições prontas da pré-Black estão em marketing/pre-black-amarelo)"
            />
          </div>
        )}
        {form.tipo !== "STORY" && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-muted-foreground">
              <span>Primeiro comentário (opcional, bom para as hashtags)</span>
              <span className="flex gap-1.5">
                <button
                  onClick={() => set({ comentario: HASHTAGS.pt })}
                  className="rounded-full border px-2 py-0.5 hover:bg-muted"
                >
                  Hashtags PT
                </button>
                <button
                  onClick={() => set({ comentario: HASHTAGS.es })}
                  className="rounded-full border px-2 py-0.5 hover:bg-muted"
                >
                  Hashtags ES
                </button>
              </span>
            </div>
            <textarea
              value={form.comentario}
              onChange={(e) => set({ comentario: e.target.value })}
              rows={2}
              className="mt-1 w-full rounded-md border bg-background p-2.5 text-sm"
            />
          </div>
        )}

        <div className="flex flex-wrap items-end gap-2 border-t pt-4">
          <Button
            size="lg"
            onClick={() => salvar("publicar")}
            disabled={!!indo || !form.midias.length}
          >
            {indo === "publicar" ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <Send className="mr-2 h-5 w-5" />
            )}{" "}
            Publicar agora
          </Button>
          <div className="flex items-end gap-2">
            <label className="text-xs font-semibold text-muted-foreground">
              Agendar para
              <Input
                type="datetime-local"
                value={data}
                onChange={(e) => setData(e.target.value)}
                className="mt-1"
              />
            </label>
            <Button
              variant="outline"
              size="lg"
              onClick={() => salvar("agendar")}
              disabled={!!indo || !data || !form.midias.length}
            >
              {indo === "agendar" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CalendarClock className="mr-2 h-4 w-4" />
              )}{" "}
              Agendar
            </Button>
          </div>
          <Button variant="ghost" onClick={() => salvar("rascunho")} disabled={!!indo}>
            <Save className="mr-1.5 h-4 w-4" /> Salvar rascunho
          </Button>
        </div>
      </Card>

      {/* Prévia no celular */}
      <Card className="self-start overflow-hidden p-0">
        <p className="border-b bg-muted/50 px-4 py-2 text-xs font-semibold text-muted-foreground">
          Prévia
        </p>
        <div className="flex justify-center bg-zinc-100 p-4">
          <div className="w-[300px] overflow-hidden rounded-[28px] border-[6px] border-zinc-900 bg-white shadow-xl">
            {form.tipo === "STORY" || form.tipo === "REELS" ? (
              <div className="relative aspect-[9/16] bg-black">
                {form.midias[0] &&
                  (form.midias[0].tipo === "VIDEO" ? (
                    <video
                      src={src(form.midias[0].path)}
                      className="h-full w-full object-cover"
                      muted
                      autoPlay
                      loop
                    />
                  ) : (
                    <img
                      src={src(form.midias[0].path)}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ))}
                <div className="absolute inset-x-0 top-0 flex items-center gap-2 p-3 text-xs font-semibold text-white">
                  {foto && <img src={foto} alt="" className="h-7 w-7 rounded-full" />} {username}
                </div>
                {form.tipo === "REELS" && (
                  <p className="absolute inset-x-0 bottom-0 line-clamp-3 bg-gradient-to-t from-black/70 p-3 text-xs text-white">
                    {form.legenda}
                  </p>
                )}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 p-2.5 text-xs font-semibold">
                  {foto && <img src={foto} alt="" className="h-7 w-7 rounded-full" />} {username}
                </div>
                <div className="relative aspect-[4/5] bg-zinc-100">
                  {form.midias[0] &&
                    (form.midias[0].tipo === "VIDEO" ? (
                      <video
                        src={src(form.midias[0].path)}
                        className="h-full w-full object-cover"
                        muted
                      />
                    ) : (
                      <img
                        src={src(form.midias[0].path)}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ))}
                  {form.midias.length > 1 && (
                    <span className="absolute right-2 top-2 rounded-full bg-black/60 px-2 text-[11px] font-semibold text-white">
                      1/{form.midias.length}
                    </span>
                  )}
                </div>
                <div className="flex gap-3 p-2.5">
                  <Heart className="h-5 w-5" />
                  <MessageCircle className="h-5 w-5" />
                  <Send className="h-5 w-5" />
                </div>
                <p className="line-clamp-4 whitespace-pre-line px-2.5 pb-3 text-xs">
                  <b>{username}</b> {form.legenda}
                </p>
              </>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

// ---------------------------------------------------------------- lista
function ItemPost({
  p,
  editar,
  atualizar,
}: {
  p: PostInstagram;
  editar: () => void;
  atualizar: () => void;
}) {
  const [indo, setIndo] = useState(false);
  const acao = async (fn: () => Promise<unknown>, ok: string) => {
    setIndo(true);
    try {
      await fn();
      toast.success(ok);
    } catch (e: any) {
      toast.error(e?.message || "Falha");
    } finally {
      setIndo(false);
      atualizar();
    }
  };
  const m = p.metricas;
  const capa = p.midias[0];
  return (
    <li className="flex flex-wrap items-center gap-3 p-3">
      <div className="h-16 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
        {capa &&
          (capa.tipo === "VIDEO" ? (
            <video src={src(capa.path)} className="h-full w-full object-cover" muted />
          ) : (
            <img src={src(capa.path)} alt="" className="h-full w-full object-cover" />
          ))}
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm">
          <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", COR[p.status])}>
            {p.status === "PUBLICANDO" ? "Publicando…" : p.status.toLowerCase()}
          </span>
          <b>{TIPOS.find((t) => t.k === p.tipo)?.rotulo}</b>
          {p.midias.length > 1 && (
            <span className="text-xs text-muted-foreground">{p.midias.length} mídias</span>
          )}
          <span className="text-xs text-muted-foreground">
            {p.status === "AGENDADO"
              ? `sai em ${quando(p.agendado_para)}`
              : p.publicado_em
                ? `publicado em ${quando(p.publicado_em)}`
                : ""}
          </span>
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {p.legenda || (p.tipo === "STORY" ? "Story" : "(sem legenda)")}
        </p>
        {p.erro && <p className="text-xs text-red-600">{p.erro}</p>}
        {m && (
          <p className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
            {m.curtidas != null && (
              <span className="flex items-center gap-1">
                <Heart className="h-3.5 w-3.5" /> {m.curtidas}
              </span>
            )}
            {m.comentarios != null && (
              <span className="flex items-center gap-1">
                <MessageCircle className="h-3.5 w-3.5" /> {m.comentarios}
              </span>
            )}
            {m.alcance != null && (
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" /> {m.alcance} alcance
              </span>
            )}
            {m.views != null && (
              <span className="flex items-center gap-1">
                <Film className="h-3.5 w-3.5" /> {m.views} views
              </span>
            )}
            {m.salvos != null && (
              <span className="flex items-center gap-1">
                <Bookmark className="h-3.5 w-3.5" /> {m.salvos}
              </span>
            )}
            {m.compartilhamentos != null && (
              <span className="flex items-center gap-1">
                <Share2 className="h-3.5 w-3.5" /> {m.compartilhamentos}
              </span>
            )}
          </p>
        )}
      </div>
      <div className="flex gap-1">
        {p.permalink && (
          <Button asChild size="sm" variant="ghost">
            <a href={p.permalink} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-1 h-4 w-4" /> Ver
            </a>
          </Button>
        )}
        {["RASCUNHO", "AGENDADO", "ERRO"].includes(p.status) && (
          <>
            <Button size="sm" variant="outline" onClick={editar} disabled={indo}>
              <Pencil className="mr-1 h-4 w-4" /> Editar
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={indo}
              onClick={() =>
                window.confirm("Publicar agora?") &&
                acao(() => publicarAgoraFn({ data: { id: p.id } }), "Publicado no Instagram!")
              }
            >
              {indo ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1 h-4 w-4" />
              )}{" "}
              {p.status === "ERRO" ? "Tentar de novo" : "Publicar agora"}
            </Button>
          </>
        )}
        {p.status === "AGENDADO" && (
          <Button
            size="sm"
            variant="ghost"
            disabled={indo}
            onClick={() =>
              acao(
                () => cancelarAgendamentoFn({ data: { id: p.id } }),
                "Agendamento cancelado (virou rascunho)",
              )
            }
          >
            Cancelar
          </Button>
        )}
        {p.status !== "PUBLICANDO" && (
          <Button
            size="sm"
            variant="ghost"
            className="text-red-600"
            disabled={indo}
            title={p.status === "PUBLICADO" ? "Tira do painel (continua no Instagram)" : "Apagar"}
            onClick={() =>
              window.confirm(
                p.status === "PUBLICADO"
                  ? "Tirar do painel? O post continua no Instagram."
                  : "Apagar?",
              ) && acao(() => apagarPostFn({ data: { id: p.id } }), "Removido do painel")
            }
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </li>
  );
}
