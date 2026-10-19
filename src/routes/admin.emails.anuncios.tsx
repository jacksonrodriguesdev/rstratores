import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Copy,
  Eye,
  ImageIcon,
  Loader2,
  Megaphone,
  MousePointerClick,
  Pencil,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmailAbas } from "@/components/admin/EmailAbas";
import { enviarImagemEmail } from "@/components/admin/EmailConstrutor";
import {
  apagarAnuncioFn,
  listarAnunciosFn,
  salvarAnuncioFn,
  type AnuncioForm,
  type AnuncioLista,
} from "@/lib/email-marketing";
import { CONTEUDO_PADRAO, renderEmail, urlAbsoluta } from "@/lib/email-template";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/emails/anuncios")({
  component: Anuncios,
});

const VAZIO: AnuncioForm = {
  nome: "",
  titulo: "",
  texto: "",
  imagem: "",
  link: "/black-friday",
  botao: "Ver ofertas",
  onde: "TODOS",
  peso: 1,
  ativo: false,
  inicio: null,
  fim: null,
};
const ONDE: Record<AnuncioForm["onde"], string> = {
  TODOS: "Campanhas e automações",
  CAMPANHAS: "Só campanhas",
  AUTOMACOES: "Só automações",
};
// Modelos prontos com o que o site tem hoje (o admin ajusta antes de ligar)
const MODELOS: Array<Partial<AnuncioForm> & { nome: string }> = [
  {
    nome: "Pre Black Friday",
    titulo: "🖤 Pre Black Friday: -20% en todo el sitio",
    texto:
      "La Black Friday empieza el 27/11, pero el descuento ya está en el precio de cada repuesto.",
    link: "/black-friday",
    botao: "Ver ofertas",
  },
  {
    nome: "Catálogos PDF",
    titulo: "📘 Catálogos de tractores en PDF",
    texto: "Encontrá el código de la pieza en el catálogo de tu marca y pedí por WhatsApp.",
    link: "/catalogos",
    botao: "Ver catálogos",
  },
  {
    nome: "Pedido rápido",
    titulo: "⚡ ¿Tenés la lista de códigos?",
    texto: "Pegala en el Pedido rápido y te cotizamos todo junto.",
    link: "/pedido-rapido",
    botao: "Hacer pedido",
  },
  {
    nome: "Cupones",
    titulo: "🎟️ Cupones de AGRO PARTS",
    texto: "Mirá los cupones vigentes y usalos en tu próximo pedido.",
    link: "/cupones",
    botao: "Ver cupones",
  },
];
const pct = (a: number, b: number) =>
  b ? `${((a / b) * 100).toFixed(1).replace(".", ",")}%` : "—";
const paraLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const z = (x: number) => String(x).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
};

function situacao(a: AnuncioLista) {
  const agora = Date.now();
  if (!a.ativo) return ["Pausado", "bg-zinc-100 text-zinc-700"];
  if (a.fim && new Date(a.fim).getTime() <= agora)
    return ["Encerrado", "bg-zinc-100 text-zinc-500"];
  if (a.inicio && new Date(a.inicio).getTime() > agora)
    return ["Programado", "bg-sky-100 text-sky-800"];
  return ["No ar", "bg-emerald-100 text-emerald-800"];
}

function Anuncios() {
  const qc = useQueryClient();
  const [editando, setEditando] = useState<AnuncioForm | null>(null);
  const { data: lista, isLoading } = useQuery({
    queryKey: ["email-anuncios"],
    queryFn: () => listarAnunciosFn(),
  });
  const atualizar = () => qc.invalidateQueries({ queryKey: ["email-anuncios"] });

  const apagar = async (a: AnuncioLista) => {
    if (!window.confirm(`Apagar o anúncio "${a.nome}"? Os números dele somem também.`)) return;
    await apagarAnuncioFn({ data: { id: a.id } });
    toast.success("Anúncio apagado");
    atualizar();
  };
  const noAr = lista?.filter((a) => a.noAr) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Megaphone className="h-6 w-6 text-primary" /> Anúncios por e-mail
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Um destaque que entra sozinho no fim das campanhas e automações (antes do rodapé),
            enquanto estiver ligado e dentro do período. Com vários no ar, eles se revezam pelo
            peso.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <EmailAbas atual="anuncios" />
          <Button size="lg" onClick={() => setEditando({ ...VAZIO })}>
            <Plus className="mr-2 h-5 w-5" /> Novo anúncio
          </Button>
        </div>
      </div>

      <Card className="flex flex-wrap items-center gap-3 p-4 text-sm">
        <span
          className={cn(
            "rounded-full px-3 py-1 font-semibold",
            noAr.length ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-700",
          )}
        >
          {noAr.length ? `${noAr.length} no ar agora` : "Nenhum anúncio no ar"}
        </span>
        <span className="text-muted-foreground">
          Uma campanha pode ficar sem anúncio: no editor dela, desligue «Incluir o anúncio».
        </span>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : !lista?.length ? (
        <Card className="p-8 text-center">
          <Megaphone className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="mt-2 font-semibold">Nenhum anúncio ainda. Comece com um modelo:</p>
          <div className="mx-auto mt-4 grid max-w-3xl gap-2 sm:grid-cols-2">
            {MODELOS.map((m) => (
              <button
                key={m.nome}
                onClick={() => setEditando({ ...VAZIO, ...m })}
                className="rounded-xl border p-3 text-left hover:border-primary hover:bg-primary/5"
              >
                <p className="font-semibold">{m.titulo}</p>
                <p className="text-xs text-muted-foreground">{m.texto}</p>
              </button>
            ))}
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((a) => {
            const [rot, cls] = situacao(a);
            return (
              <Card key={a.id} className="flex flex-col overflow-hidden">
                <div className="flex aspect-[2/1] items-center justify-center bg-muted/40">
                  {a.imagem ? (
                    <img
                      src={urlAbsoluta(a.imagem, "")}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="h-10 w-10 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <div className="flex items-center gap-2">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", cls)}>
                      {rot}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {ONDE[a.onde]} · peso {a.peso}
                    </span>
                  </div>
                  <p className="mt-2 font-semibold leading-snug">{a.titulo}</p>
                  <p className="line-clamp-2 text-sm text-muted-foreground">{a.texto}</p>
                  <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-muted/50 p-2 text-center text-xs">
                    <div>
                      <p className="text-base font-bold">{a.exibicoes.toLocaleString("pt-BR")}</p>
                      <p className="text-muted-foreground">exibições</p>
                    </div>
                    <div>
                      <p className="flex items-center justify-center gap-1 text-base font-bold">
                        <Eye className="h-3.5 w-3.5" />
                        {pct(a.abertos, a.exibicoes)}
                      </p>
                      <p className="text-muted-foreground">viram</p>
                    </div>
                    <div>
                      <p className="flex items-center justify-center gap-1 text-base font-bold">
                        <MousePointerClick className="h-3.5 w-3.5" />
                        {a.cliques}
                      </p>
                      <p className="text-muted-foreground">cliques · {pct(a.cliques, a.abertos)}</p>
                    </div>
                  </div>
                  <div className="mt-auto flex gap-1 pt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setEditando({ ...a })}
                    >
                      <Pencil className="mr-1.5 h-4 w-4" /> Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      title="Duplicar"
                      onClick={() =>
                        setEditando({
                          ...a,
                          id: undefined,
                          nome: `${a.nome} (cópia)`,
                          ativo: false,
                        })
                      }
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600"
                      title="Apagar"
                      onClick={() => apagar(a)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!editando} onOpenChange={(v) => !v && setEditando(null)}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editando?.id ? "Editar anúncio" : "Novo anúncio"}</DialogTitle>
            <DialogDescription>
              Aparece no fim do e-mail, com o rótulo «Destacado». Texto em espanhol (os clientes do
              Uruguai).
            </DialogDescription>
          </DialogHeader>
          {editando && (
            <Editor
              inicial={editando}
              aoSalvar={() => {
                setEditando(null);
                atualizar();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Editor({ inicial, aoSalvar }: { inicial: AnuncioForm; aoSalvar: () => void }) {
  const [a, setA] = useState<AnuncioForm>(inicial);
  const [salvando, setSalvando] = useState(false);
  const [subindo, setSubindo] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  const set = <K extends keyof AnuncioForm>(k: K, v: AnuncioForm[K]) =>
    setA((o) => ({ ...o, [k]: v }));

  const html = useMemo(
    () =>
      renderEmail(
        {
          ...CONTEUDO_PADRAO,
          destaque: "",
          titulo: "Así aparece al final de los e-mails",
          texto:
            "Este es el contenido de la campaña o automatización. El anuncio entra abajo, antes del pie.",
          produtos: [],
          botaoTexto: "",
          whatsapp: false,
        },
        {
          origem: typeof window !== "undefined" ? window.location.origin : "",
          nome: "Juan",
          urlBaixa: "#",
          campanha: "previa",
          anuncio: {
            id: inicial.id ?? 0,
            titulo: a.titulo || "Título del anuncio",
            texto: a.texto,
            imagem: a.imagem || null,
            link: a.link || "/",
            botao: a.botao,
          },
        },
      ),
    [a, inicial.id],
  );

  const subir = async (f: File) => {
    setSubindo(true);
    try {
      set("imagem", await enviarImagemEmail(f));
    } catch (e: any) {
      toast.error(e?.message || "Falha no envio");
    } finally {
      setSubindo(false);
      if (ref.current) ref.current.value = "";
    }
  };
  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarAnuncioFn({ data: a });
      toast.success(a.ativo ? "Anúncio salvo e no ar" : "Anúncio salvo (desligado)");
      aoSalvar();
    } catch (e: any) {
      toast.error(e?.message || "Falha ao salvar");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-3">
        <label className="flex items-center justify-between gap-3 rounded-lg bg-primary/5 p-3 text-sm font-semibold">
          Ligado (entra nos e-mails)
          <Switch checked={a.ativo} onCheckedChange={(v) => set("ativo", v)} />
        </label>
        <Campo rotulo="Nome interno">
          <Input
            value={a.nome}
            onChange={(e) => set("nome", e.target.value)}
            placeholder="Ex.: Pre Black outubro"
          />
        </Campo>
        <Campo rotulo="Título">
          <Input value={a.titulo} onChange={(e) => set("titulo", e.target.value)} />
        </Campo>
        <Campo rotulo="Texto (opcional)">
          <textarea
            value={a.texto}
            onChange={(e) => set("texto", e.target.value)}
            rows={3}
            className="w-full rounded-md border bg-background p-2.5 text-sm"
          />
        </Campo>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="Link">
            <Input
              value={a.link}
              onChange={(e) => set("link", e.target.value)}
              placeholder="/black-friday"
            />
          </Campo>
          <Campo rotulo="Texto do botão">
            <Input value={a.botao} onChange={(e) => set("botao", e.target.value)} />
          </Campo>
        </div>
        <Campo rotulo="Imagem (opcional, 1200 × 500, JPG/PNG/GIF)">
          <input
            ref={ref}
            type="file"
            accept="image/jpeg,image/png,image/gif"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && subir(e.target.files[0])}
          />
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => ref.current?.click()}
              disabled={subindo}
            >
              {subindo ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-1.5 h-4 w-4" />
              )}{" "}
              {a.imagem ? "Trocar" : "Enviar"}
            </Button>
            {a.imagem && (
              <button
                type="button"
                onClick={() => set("imagem", "")}
                className="text-xs text-red-600 hover:underline"
              >
                remover
              </button>
            )}
          </div>
        </Campo>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo rotulo="Onde aparece">
            <select
              value={a.onde}
              onChange={(e) => set("onde", e.target.value as AnuncioForm["onde"])}
              className="h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              {Object.entries(ONDE).map(([v, r]) => (
                <option key={v} value={v}>
                  {r}
                </option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Peso no rodízio (1 a 10)">
            <Input
              type="number"
              min={1}
              max={10}
              value={a.peso}
              onChange={(e) => set("peso", Number(e.target.value) || 1)}
            />
          </Campo>
          <Campo rotulo="Começa em (opcional)">
            <Input
              type="datetime-local"
              value={paraLocal(a.inicio)}
              onChange={(e) =>
                set("inicio", e.target.value ? new Date(e.target.value).toISOString() : null)
              }
            />
          </Campo>
          <Campo rotulo="Termina em (opcional)">
            <Input
              type="datetime-local"
              value={paraLocal(a.fim)}
              onChange={(e) =>
                set("fim", e.target.value ? new Date(e.target.value).toISOString() : null)
              }
            />
          </Campo>
        </div>
        <Button className="w-full" size="lg" onClick={salvar} disabled={salvando}>
          {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Salvar anúncio
        </Button>
      </div>
      <div className="overflow-hidden rounded-xl border">
        <p className="border-b bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground">
          Prévia no e-mail
        </p>
        <iframe
          title="Prévia do anúncio"
          srcDoc={html}
          sandbox=""
          className="h-[620px] w-full bg-white"
        />
      </div>
    </div>
  );
}

const Campo = ({ rotulo, children }: { rotulo: string; children: React.ReactNode }) => (
  <label className="block text-xs font-semibold text-muted-foreground">
    {rotulo}
    <div className="mt-1">{children}</div>
  </label>
);
