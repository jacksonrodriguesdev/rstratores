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
  Facebook,
  Users,
  TrendingUp,
  MousePointerClick,
  BarChart3,
  Settings,
  Sparkles,
  CalendarDays,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Estudio } from "@/components/admin/estudio/Hub";
import { Switch } from "@/components/ui/switch";
import { Link } from "@tanstack/react-router";
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
  statusFacebookFn,
  escolherFacebookFn,
  desconectarFacebookFn,
  desempenhoRedesFn,
  type PostForm,
  type PostInstagram,
} from "@/lib/instagram";
import { cn } from "@/lib/utils";

type Busca = { ig?: string; fb?: string; msg?: string; conta?: string; tela?: string; f?: string };
const TELAS = ["estudio", "publicar", "publicacoes", "calendario", "numeros"] as const;
export const Route = createFileRoute("/admin/instagram")({
  validateSearch: (s: Record<string, unknown>): Busca => ({
    ig: typeof s.ig === "string" ? s.ig : undefined,
    msg: typeof s.msg === "string" ? s.msg : undefined,
    conta: typeof s.conta === "string" ? s.conta : undefined,
    fb: typeof s.fb === "string" ? s.fb : undefined,
    tela: typeof s.tela === "string" ? s.tela : undefined,
    f: typeof s.f === "string" ? s.f.slice(0, 30) : undefined,
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
  const [tela, setTela] = useState<
    "estudio" | "publicar" | "publicacoes" | "calendario" | "numeros"
  >("estudio");
  const [config, setConfig] = useState(false);
  // Menu lateral: ?tela=calendario abre a aba; ?f=banco abre a ferramenta do Estúdio
  useEffect(() => {
    const t = TELAS.find((x) => x === busca.tela);
    if (t) setTela(t);
  }, [busca.tela, busca.f]);
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

  const { data: fb, refetch: refetchFb } = useQuery({
    queryKey: ["fb-status"],
    queryFn: () => statusFacebookFn(),
  });

  useEffect(() => {
    if (busca.ig === "ok")
      toast.success(`Instagram conectado${busca.conta ? `: @${busca.conta}` : ""}`);
    if (busca.ig === "erro") toast.error(busca.msg || "Não foi possível conectar");
    if (busca.fb === "ok")
      toast.success("Facebook conectado: escolha a página e a conta de anúncios");
    if (busca.fb === "erro") toast.error(busca.msg || "Não foi possível conectar o Facebook");
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const editar = (p: PostInstagram) => {
    setForm({
      id: p.id,
      tipo: p.tipo,
      legenda: p.legenda,
      comentario: p.comentario,
      midias: p.midias,
      facebook: p.facebook,
    });
    setTela("publicar");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const lista = (posts ?? []).filter((p) =>
    aba === "ERRO"
      ? p.status === "ERRO"
      : aba === "PUBLICADO"
        ? p.status === "PUBLICADO" || p.status === "PUBLICANDO"
        : p.status === aba,
  );

  const n = (k: string) =>
    (posts ?? []).filter((p) =>
      k === "PUBLICADO" ? p.status === "PUBLICADO" || p.status === "PUBLICANDO" : p.status === k,
    ).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Instagram className="h-6 w-6 text-primary" /> Instagram e Facebook
          </h1>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <Chip ok={!!st?.conectado} icone={Instagram}>
              {st?.conectado ? `@${st.username}` : "Instagram desconectado"}
            </Chip>
            <Chip ok={!!fb?.pagina} icone={Facebook}>
              {fb?.pagina?.nome ?? "Página do Facebook não escolhida"}
            </Chip>
          </div>
        </div>
        <Button variant="outline" onClick={() => setConfig(true)}>
          <Settings className="mr-1.5 h-4 w-4" /> Configurações
        </Button>
      </div>

      <Dialog open={config} onOpenChange={setConfig}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" /> Contas conectadas
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Conexao st={st} atualizar={() => refetchSt()} />
            <ConexaoFacebook fb={fb} atualizar={() => refetchFb()} />
          </div>
        </DialogContent>
      </Dialog>

      {st && !st.conectado && (
        <Card className="flex flex-wrap items-center gap-3 border-amber-200 bg-amber-50/60 p-4 text-sm">
          <AlertTriangle className="h-5 w-5 text-amber-700" />
          <span className="flex-1 text-amber-950">
            O Instagram não está conectado: dá para criar artes no Estúdio, mas publicar só depois
            de conectar.
          </span>
          <Button size="sm" onClick={() => setConfig(true)}>
            Conectar
          </Button>
        </Card>
      )}

      <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
        {(
          [
            ["estudio", "Estúdio", Sparkles],
            ["publicar", form.id ? "Editar publicação" : "Publicar", Send],
            [
              "publicacoes",
              `Publicações${n("AGENDADO") ? ` (${n("AGENDADO")} agend.)` : ""}`,
              Images,
            ],
            ["calendario", "Calendário", CalendarDays],
            ["numeros", "Números", BarChart3],
          ] as const
        ).map(([k, r, I]) => (
          <button
            key={k}
            onClick={() => setTela(k)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold",
              tela === k
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <I className="h-4 w-4" /> {r}
            {k === "publicar" && !!form.midias.length && (
              <span className="rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                {form.midias.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tela === "estudio" && (
        <Estudio
          inicial={busca.f}
          posts={posts ?? []}
          usarNoPost={(midias, legenda, tipo, comentario) => {
            setForm({ ...VAZIO, tipo, midias, legenda, comentario: comentario ?? "" });
            setTela("publicar");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />
      )}

      {tela === "publicar" &&
        (st?.conectado ? (
          <Compositor
            form={form}
            setForm={setForm}
            username={st.username}
            foto={st.foto}
            paginaFacebook={fb?.pagina?.nome ?? null}
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
              setTela("publicacoes");
              atualizar();
              refetchSt();
            }}
          />
        ) : (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Conecte o Instagram em <b>Configurações</b> para publicar.
          </Card>
        ))}

      {tela === "publicacoes" && (
        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center gap-1 border-b p-2">
            {(["AGENDADO", "PUBLICADO", "RASCUNHO", "ERRO"] as const).map((k) => (
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
                ({n(k)})
              </button>
            ))}
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

      {tela === "calendario" && <Calendario posts={posts ?? []} abrir={editar} />}

      {tela === "numeros" &&
        (st?.conectado ? (
          <Desempenho />
        ) : (
          <Card className="p-8 text-center text-sm text-muted-foreground">
            Conecte o Instagram em <b>Configurações</b> para ver os números.
          </Card>
        ))}
    </div>
  );
}

function Chip({ ok, icone: I, children }: { ok: boolean; icone: any; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-semibold",
        ok ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-600",
      )}
    >
      <I className="h-3.5 w-3.5" /> {children}
      {ok && <CheckCircle2 className="h-3.5 w-3.5" />}
    </span>
  );
}

// ---------------------------------------------------------------- calendário
// Próximas 2 semanas (e a anterior): agendados, publicados e com erro em cada dia
function Calendario({
  posts,
  abrir,
}: {
  posts: PostInstagram[];
  abrir: (p: PostInstagram) => void;
}) {
  const [semana, setSemana] = useState(0);
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const ini = new Date(hoje);
  ini.setDate(ini.getDate() - ((ini.getDay() + 6) % 7) + semana * 7); // segunda-feira
  const dias = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(ini);
    d.setDate(d.getDate() + i);
    return d;
  });
  const doDia = (d: Date) =>
    posts
      .filter((p) => {
        const q = p.publicado_em || p.agendado_para;
        if (!q) return false;
        const x = new Date(q);
        return x.toDateString() === d.toDateString();
      })
      .sort((a, b) =>
        String(a.publicado_em || a.agendado_para).localeCompare(
          String(b.publicado_em || b.agendado_para),
        ),
      );
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={() => setSemana((s) => s - 1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="outline" onClick={() => setSemana(0)}>
          Hoje
        </Button>
        <Button size="sm" variant="outline" onClick={() => setSemana((s) => s + 1)}>
          <ArrowRight className="h-4 w-4" />
        </Button>
        <p className="ml-2 text-sm font-semibold">
          {dias[0].toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} –{" "}
          {dias[13].toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {dias.map((d) => {
          const ps = doDia(d);
          const eHoje = d.getTime() === hoje.getTime();
          return (
            <div
              key={d.toISOString()}
              className={cn(
                "min-h-28 rounded-lg border p-2",
                eHoje && "border-primary bg-primary/5",
                d < hoje && "opacity-70",
              )}
            >
              <p className="text-[11px] font-bold uppercase text-muted-foreground">
                {d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit" })}
              </p>
              <div className="mt-1 space-y-1">
                {ps.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => abrir(p)}
                    className={cn(
                      "flex w-full items-center gap-1.5 rounded p-1 text-left text-[11px]",
                      COR[p.status],
                    )}
                    title={p.legenda.slice(0, 200)}
                  >
                    {p.midias[0] && p.midias[0].tipo === "IMAGE" ? (
                      <img
                        src={src(p.midias[0].path)}
                        alt=""
                        className="h-7 w-7 rounded object-cover"
                      />
                    ) : (
                      <Film className="h-4 w-4" />
                    )}
                    <span className="min-w-0 flex-1">
                      <b>
                        {new Date(p.publicado_em || p.agendado_para!).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </b>{" "}
                      <span className="line-clamp-1">{p.legenda || p.tipo}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Clique numa publicação para abrir no editor. Dica: o Estúdio mostra as horas com mais gente
        no site.
      </p>
    </Card>
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
  paginaFacebook,
  aoSalvar,
}: {
  form: PostForm;
  setForm: (f: PostForm) => void;
  username: string | null;
  foto: string | null;
  paginaFacebook: string | null;
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
        {
          <label
            className={cn(
              "flex items-center justify-between gap-3 rounded-lg p-3 text-sm",
              paginaFacebook ? "bg-blue-50" : "bg-muted/40 text-muted-foreground",
            )}
          >
            <span className="flex items-center gap-2">
              <Facebook className="h-4 w-4 text-blue-600" />
              {paginaFacebook ? (
                <>
                  Publicar também na página <b>{paginaFacebook}</b>
                  {form.tipo === "STORY" ? " (como story)" : " (legenda + hashtags)"}
                </>
              ) : (
                "Para publicar também no Facebook, conecte o Facebook acima"
              )}
            </span>
            <Switch
              checked={!!form.facebook && !!paginaFacebook}
              disabled={!paginaFacebook}
              onCheckedChange={(v) => set({ facebook: v })}
            />
          </label>
        }

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

// ---------------------------------------------------------------- Facebook (página e anúncios)
function ConexaoFacebook({ fb, atualizar }: { fb: any; atualizar: () => void }) {
  const [salvando, setSalvando] = useState(false);
  if (!fb) return null;
  const escolher = async (o: { pagina?: string; conta?: string }) => {
    setSalvando(true);
    try {
      await escolherFacebookFn({ data: o });
      toast.success("Salvo");
      atualizar();
    } catch (e: any) {
      toast.error(e?.message || "Falha");
    } finally {
      setSalvando(false);
    }
  };
  if (!fb.configurado)
    return (
      <Card className="space-y-2 border-blue-200 bg-blue-50/60 p-5 text-sm">
        <p className="flex items-center gap-2 font-semibold text-blue-900">
          <Facebook className="h-5 w-5" /> Facebook: página e anúncios (falta configurar)
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-blue-950">
          <li>
            No app <b>agropartsapp</b> (developers.facebook.com):{" "}
            <b>Login do Facebook para Empresas → Configurações</b> → em «URIs de redirecionamento do
            OAuth válidos» coloque <code className="rounded bg-blue-100 px-1">{fb.callback}</code>
          </li>
          <li>
            Em <b>Configurações do app → Básico</b>: copie o <b>ID do app</b> e a{" "}
            <b>Chave secreta do app</b> para o hPanel como{" "}
            <code className="rounded bg-blue-100 px-1">META_APP_ID</code> e{" "}
            <code className="rounded bg-blue-100 px-1">META_APP_SECRET</code> (só no hPanel) e
            reinicie o app.
          </li>
          <li>
            Volte aqui e clique em <b>Conectar Facebook</b>.
          </li>
        </ol>
      </Card>
    );
  if (!fb.conectado)
    return (
      <Card className="flex flex-wrap items-center gap-4 p-5">
        <Facebook className="h-10 w-10 text-blue-600" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold">Conecte o Facebook (página e anúncios)</p>
          <p className="text-muted-foreground">
            Para publicar também na página, ver os números dela e controlar os anúncios na Central
            de Anúncios, sem colar token.
          </p>
        </div>
        <Button asChild size="lg" className="bg-blue-600 hover:bg-blue-700">
          <a href="/api/admin/facebook/conectar">
            <Facebook className="mr-2 h-5 w-5" /> Conectar Facebook
          </a>
        </Button>
      </Card>
    );
  const dias = fb.expira ? Math.max(0, Math.round((fb.expira - Date.now()) / 86400_000)) : null;
  return (
    <Card className="space-y-3 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <Facebook className="h-8 w-8 text-blue-600" />
        <div className="min-w-0 flex-1 text-sm">
          <p className="flex items-center gap-2 font-semibold">
            Facebook conectado{" "}
            {fb.usuario && (
              <span className="font-normal text-muted-foreground">({fb.usuario})</span>
            )}
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </p>
          {dias != null && (
            <p
              className={cn(
                "text-xs",
                dias < 10 ? "font-semibold text-amber-700" : "text-muted-foreground",
              )}
            >
              A conexão dos anúncios vale mais {dias} dias
              {dias < 10 ? ": clique em Reconectar" : ""} (a da página não vence).
            </p>
          )}
        </div>
        <Button asChild variant="outline" size="sm">
          <a href="/api/admin/facebook/conectar">Reconectar</a>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600"
          onClick={async () => {
            if (!window.confirm("Desconectar o Facebook (página e anúncios)?")) return;
            await desconectarFacebookFn();
            atualizar();
          }}
        >
          Desconectar
        </Button>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs font-semibold text-muted-foreground">
          Página do Facebook
          <select
            value={fb.pagina?.id ?? ""}
            disabled={salvando}
            onChange={(e) => escolher({ pagina: e.target.value })}
            className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">
              {fb.paginas.length ? "Escolha a página…" : "Nenhuma página encontrada"}
            </option>
            {fb.paginas.map((p: any) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Conta de anúncios (Central de Anúncios)
          <select
            value={fb.contaAds ?? ""}
            disabled={salvando}
            onChange={(e) => escolher({ conta: e.target.value })}
            className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="">
              {fb.contas.length ? "Escolha a conta…" : "Nenhuma conta de anúncios encontrada"}
            </option>
            {fb.contas.map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.nome} ({c.moeda})
              </option>
            ))}
          </select>
        </label>
      </div>
      {fb.contaAds && (
        <p className="text-xs text-muted-foreground">
          Gasto, campanhas, pausar/ativar e orçamento:{" "}
          <Link to="/admin/ads" className="font-semibold text-primary hover:underline">
            Central de Anúncios →
          </Link>
        </p>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- desempenho das redes
function Desempenho() {
  const [aberto, setAberto] = useState(false);
  const [dias, setDias] = useState(28);
  const { data, isFetching, refetch } = useQuery({
    queryKey: ["redes-desempenho", dias],
    queryFn: () => desempenhoRedesFn({ data: { dias } }),
    enabled: aberto,
    staleTime: 10 * 60_000,
  });
  const n = (v: number | null | undefined) => (v == null ? "—" : v.toLocaleString("pt-BR"));
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="flex items-center gap-2 font-semibold">
          <BarChart3 className="h-4 w-4 text-primary" /> Desempenho das redes
        </h2>
        {aberto && (
          <div className="ml-2 flex gap-1">
            {[7, 14, 28].map((d) => (
              <button
                key={d}
                onClick={() => setDias(d)}
                className={cn(
                  "rounded-full border px-3 py-0.5 text-xs font-semibold",
                  dias === d
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                {d} dias
              </button>
            ))}
          </div>
        )}
        <Button
          size="sm"
          variant="outline"
          className="ml-auto"
          onClick={() => (aberto ? refetch() : setAberto(true))}
          disabled={isFetching}
        >
          {isFetching ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-1.5 h-4 w-4" />
          )}
          {aberto ? "Atualizar" : "Ver números"}
        </Button>
      </div>
      {aberto && data && (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <Rede
            titulo="Instagram"
            icone={<Instagram className="h-4 w-4 text-pink-600" />}
            erro={data.instagram.ok ? null : data.instagram.erro}
            kpis={
              data.instagram.ok
                ? [
                    ["Seguidores", n(data.instagram.seguidores), Users],
                    ["Alcance", n(data.instagram.alcance), Eye],
                    ["Visitas ao perfil", n(data.instagram.visitas), MousePointerClick],
                    ["Interações", n(data.instagram.interacoes), Heart],
                  ]
                : []
            }
            posts={
              data.instagram.ok
                ? data.instagram.recentes.map((r: any) => ({
                    id: r.id,
                    imagem: r.imagem,
                    texto: r.legenda || r.tipo,
                    link: r.link,
                    quando: r.quando,
                    a: r.curtidas,
                    b: r.comentarios,
                    c: null,
                  }))
                : []
            }
          />
          <Rede
            titulo="Página do Facebook"
            icone={<Facebook className="h-4 w-4 text-blue-600" />}
            erro={data.facebook.ok ? null : data.facebook.erro}
            kpis={
              data.facebook.ok
                ? [
                    ["Seguidores", n(data.facebook.seguidores), Users],
                    ["Alcance", n(data.facebook.alcance), Eye],
                    ["Engajamento", n(data.facebook.engajamento), Heart],
                    ["Novos seguidores", n(data.facebook.novosSeguidores), TrendingUp],
                  ]
                : []
            }
            posts={
              data.facebook.ok
                ? data.facebook.posts.map((p: any) => ({
                    id: p.id,
                    imagem: p.imagem,
                    texto: p.texto || "(sem texto)",
                    link: p.link,
                    quando: p.quando,
                    a: p.reacoes,
                    b: p.comentarios,
                    c: p.compartilhamentos,
                  }))
                : []
            }
          />
        </div>
      )}
      {aberto && data && (
        <p className="mt-3 text-xs text-muted-foreground">
          Últimos {data.dias} dias. A Meta pode levar até 48 h para fechar os números.
        </p>
      )}
    </Card>
  );
}

function Rede({
  titulo,
  icone,
  erro,
  kpis,
  posts,
}: {
  titulo: string;
  icone: React.ReactNode;
  erro: string | null;
  kpis: Array<[string, string, any]>;
  posts: Array<{
    id: string;
    imagem: string | null;
    texto: string;
    link: string | null;
    quando: string;
    a: number;
    b: number;
    c: number | null;
  }>;
}) {
  return (
    <div className="rounded-xl border p-4">
      <p className="flex items-center gap-2 text-sm font-semibold">
        {icone} {titulo}
      </p>
      {erro ? (
        <p className="mt-2 text-sm text-muted-foreground">{erro}</p>
      ) : (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {kpis.map(([r, v, I]) => (
              <div key={r} className="rounded-lg bg-muted/50 p-2">
                <p className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground">
                  <I className="h-3.5 w-3.5" /> {r}
                </p>
                <p className="text-lg font-bold">{v}</p>
              </div>
            ))}
          </div>
          <ul className="mt-3 max-h-80 divide-y overflow-y-auto">
            {posts.map((p) => (
              <li key={p.id} className="flex items-center gap-3 py-2">
                <div className="h-11 w-11 shrink-0 overflow-hidden rounded-md bg-muted">
                  {p.imagem && (
                    <img
                      src={p.imagem}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{p.texto}</p>
                  <p className="flex gap-3 text-xs text-muted-foreground">
                    <span>{p.quando ? new Date(p.quando).toLocaleDateString("pt-BR") : ""}</span>
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3" /> {p.a}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" /> {p.b}
                    </span>
                    {p.c != null && (
                      <span className="flex items-center gap-1">
                        <Share2 className="h-3 w-3" /> {p.c}
                      </span>
                    )}
                  </p>
                </div>
                {p.link && (
                  <a
                    href={p.link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                    aria-label="Abrir"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </li>
            ))}
            {!posts.length && (
              <li className="py-3 text-sm text-muted-foreground">Nenhuma publicação recente.</li>
            )}
          </ul>
        </>
      )}
    </div>
  );
}
