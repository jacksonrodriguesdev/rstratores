// Construtor de e-mail por blocos (Admin → E-mail marketing → campanha): tema, lista de blocos
// (subir, descer, duplicar, esconder, apagar) e o formulário de cada bloco.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  BadgeCheck,
  ChevronDown,
  Columns2,
  Copy,
  Eye,
  EyeOff,
  Heading,
  Image as ImageIcon,
  LayoutGrid,
  ListOrdered,
  Megaphone,
  MessageCircle,
  MousePointerClick,
  Package,
  Palette,
  PanelTop,
  PlaySquare,
  Plus,
  Quote,
  SeparatorHorizontal,
  Share2,
  Ticket,
  Timer,
  Trash2,
  Type,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CampoForm, EnvioImagemCtx } from "@/components/admin/CampoForm";
import { Produtos } from "@/components/admin/email-editor";
import {
  FONTES_PRODUTOS,
  TEMAS,
  TIPOS_EMAIL,
  novoBloco,
  novoIdBloco,
  temaDe,
  tipoEmail,
  type BlocoEmail,
  type TemaEmail,
} from "@/lib/email-blocos";
import type { ConteudoEmail } from "@/lib/email-template";
import { opcoesRegrasFn } from "@/lib/campanhas";
import { cn } from "@/lib/utils";

const ICONES: Record<string, any> = {
  Megaphone,
  PanelTop,
  Image: ImageIcon,
  Heading,
  Type,
  MousePointerClick,
  Ticket,
  Timer,
  Package,
  LayoutGrid,
  BadgeCheck,
  Columns2,
  ListOrdered,
  Quote,
  MessageCircle,
  PlaySquare,
  Share2,
  SeparatorHorizontal,
};
const Icone = ({ nome, className }: { nome: string; className?: string }) => {
  const I = ICONES[nome] ?? Type;
  return <I className={className} />;
};

// E-mail não mostra WEBP no Outlook: reduz no navegador para JPG (GIF animado passa direto)
async function enviarImagemEmail(arq: File): Promise<string> {
  let f = arq;
  if (arq.type !== "image/gif") {
    try {
      const bmp = await createImageBitmap(arq);
      const esc = Math.min(1, 1200 / bmp.width);
      const c = document.createElement("canvas");
      c.width = Math.round(bmp.width * esc);
      c.height = Math.round(bmp.height * esc);
      const g = c.getContext("2d")!;
      g.fillStyle = "#fff";
      g.fillRect(0, 0, c.width, c.height);
      g.drawImage(bmp, 0, 0, c.width, c.height);
      const blob: Blob | null = await new Promise((ok) => c.toBlob(ok, "image/jpeg", 0.86));
      if (blob)
        f = new File([blob], arq.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
    } catch {
      /* formato que o navegador não abre: manda como está */
    }
  }
  const fd = new FormData();
  fd.append("file", f);
  const r = await fetch("/api/admin/emails/upload", { method: "POST", body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.path) throw new Error(j.error || "Falha no envio");
  return j.path;
}

// Resumo de uma linha do bloco (na lista fechada)
function resumo(b: BlocoEmail) {
  const d = b.d;
  const t =
    d.titulo || d.texto || d.codigo || (d.pessoal ? "Cupom pessoal de cada cliente" : "") || d.alt;
  if (b.tipo === "PRODUTOS")
    return `${FONTES_PRODUTOS.find(([v]) => v === d.fonte)?.[1] ?? ""}${d.alvo ? `: ${d.alvo}` : ""}`;
  if (b.tipo === "CONTAGEM" && d.alvo)
    return `${d.titulo} · ${new Date(d.alvo).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}`;
  return typeof t === "string" ? t.replace(/\*\*/g, "").slice(0, 80) : "";
}

export function ConstrutorEmail({
  c,
  setC,
  cupons,
}: {
  c: ConteudoEmail;
  setC: (f: (o: ConteudoEmail) => ConteudoEmail) => void;
  cupons?: string[];
}) {
  const blocos = c.blocos ?? [];
  const [aberto, setAberto] = useState<string | null>(blocos[0]?.id ?? null);
  const [inserirEm, setInserirEm] = useState<number | null>(null);
  const setBlocos = (f: (b: BlocoEmail[]) => BlocoEmail[]) =>
    setC((o) => ({ ...o, blocos: f(o.blocos ?? []) }));
  const mudar = (id: string, k: string, v: any) =>
    setBlocos((bs) => bs.map((b) => (b.id === id ? { ...b, d: { ...b.d, [k]: v } } : b)));
  const mover = (i: number, d: number) =>
    setBlocos((bs) => {
      const j = i + d;
      if (j < 0 || j >= bs.length) return bs;
      const n = [...bs];
      [n[i], n[j]] = [n[j], n[i]];
      return n;
    });
  const adicionar = (tipo: string) => {
    const b = novoBloco(tipo);
    setBlocos((bs) => {
      const n = [...bs];
      n.splice(inserirEm ?? n.length, 0, b);
      return n;
    });
    setAberto(b.id);
    setInserirEm(null);
  };

  return (
    <EnvioImagemCtx.Provider
      value={{ enviar: enviarImagemEmail, aceita: "image/jpeg,image/png,image/gif" }}
    >
      <div className="space-y-4">
        <PainelTema c={c} setC={setC} />

        <Card className="p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-semibold">
              <LayoutGrid className="h-4 w-4 text-primary" /> Blocos do e-mail
              <span className="text-xs font-normal text-muted-foreground">
                ({blocos.length}) · na ordem em que aparecem
              </span>
            </h2>
            <button
              type="button"
              onClick={() => setInserirEm(blocos.length)}
              className="flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90"
            >
              <Plus className="h-4 w-4" /> Bloco
            </button>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Variáveis: <code>{"{{nombre}}"}</code> (primeiro nome) ·{" "}
            <code>{"{{departamento}}"}</code> · <code>{"{{mi_cupon}}"}</code> (cupom de boas-vindas
            do cliente)
          </p>

          <ol className="mt-3 space-y-2">
            {blocos.map((b, i) => {
              const tipo = tipoEmail(b.tipo);
              const on = aberto === b.id;
              const cod =
                b.tipo === "CUPOM"
                  ? String(b.d.codigo ?? "")
                      .trim()
                      .toUpperCase()
                  : "";
              const cupomFalta = !!cod && !cod.includes("{{") && !!cupons && !cupons.includes(cod);
              return (
                <li key={b.id} className="group">
                  <div
                    className={cn(
                      "rounded-xl border bg-background transition",
                      on && "border-primary shadow-sm ring-1 ring-primary/20",
                      b.oculto && "opacity-60",
                    )}
                  >
                    <div className="flex items-center gap-2 p-2">
                      <button
                        type="button"
                        onClick={() => setAberto(on ? null : b.id)}
                        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-left"
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icone nome={tipo?.icone ?? "Type"} className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-1.5 text-sm font-semibold">
                            {tipo?.nome ?? b.tipo}
                            {b.oculto && (
                              <span className="rounded bg-zinc-200 px-1.5 text-[10px] font-bold text-zinc-600">
                                ESCONDIDO
                              </span>
                            )}
                            {cupomFalta && <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {resumo(b)}
                          </span>
                        </span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 shrink-0 text-muted-foreground transition",
                            on && "rotate-180",
                          )}
                        />
                      </button>
                      <div className="flex shrink-0 items-center">
                        <BotaoIcone titulo="Subir" onClick={() => mover(i, -1)} desligado={i === 0}>
                          <ArrowUp className="h-3.5 w-3.5" />
                        </BotaoIcone>
                        <BotaoIcone
                          titulo="Descer"
                          onClick={() => mover(i, 1)}
                          desligado={i === blocos.length - 1}
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </BotaoIcone>
                        <BotaoIcone
                          titulo="Duplicar"
                          onClick={() =>
                            setBlocos((bs) => {
                              const n = [...bs];
                              n.splice(i + 1, 0, {
                                ...structuredClone(b),
                                id: novoIdBloco(),
                              });
                              return n;
                            })
                          }
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </BotaoIcone>
                        <BotaoIcone
                          titulo={b.oculto ? "Mostrar" : "Esconder"}
                          onClick={() =>
                            setBlocos((bs) =>
                              bs.map((x) => (x.id === b.id ? { ...x, oculto: !x.oculto } : x)),
                            )
                          }
                        >
                          {b.oculto ? (
                            <EyeOff className="h-3.5 w-3.5" />
                          ) : (
                            <Eye className="h-3.5 w-3.5" />
                          )}
                        </BotaoIcone>
                        <BotaoIcone
                          titulo="Apagar"
                          perigo
                          onClick={() => {
                            if (window.confirm(`Apagar o bloco "${tipo?.nome ?? b.tipo}"?`))
                              setBlocos((bs) => bs.filter((x) => x.id !== b.id));
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </BotaoIcone>
                      </div>
                    </div>
                    {on && (
                      <div className="border-t p-3">
                        {cupomFalta && (
                          <p className="mb-3 flex gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900">
                            <AlertTriangle className="h-4 w-4 shrink-0" /> O cupom {cod} não existe
                            (ou está desligado) em Campanhas e cupons. Crie antes de enviar, senão a
                            equipe não consegue aplicar o desconto.
                          </p>
                        )}
                        {b.tipo === "PRODUTOS" ? (
                          <FormProdutos b={b} mudar={(k, v) => mudar(b.id, k, v)} />
                        ) : (
                          <div className="grid gap-3 md:grid-cols-2">
                            {tipo?.campos.map((f) => (
                              <CampoForm
                                key={f.k}
                                campo={f}
                                valor={b.d[f.k]}
                                aoMudar={(k, v) => mudar(b.id, k, v)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setInserirEm(i + 1)}
                    className="mx-auto -my-1 flex h-5 items-center gap-1 rounded-full px-2 text-[11px] font-semibold text-muted-foreground opacity-0 transition hover:bg-primary/10 hover:text-primary group-hover:opacity-100"
                  >
                    <Plus className="h-3 w-3" /> inserir aqui
                  </button>
                </li>
              );
            })}
          </ol>
          {!blocos.length && (
            <button
              type="button"
              onClick={() => setInserirEm(0)}
              className="mt-3 flex h-24 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed text-sm text-muted-foreground hover:border-primary hover:text-primary"
            >
              <Plus className="h-5 w-5" /> Adicionar o primeiro bloco
            </button>
          )}
        </Card>
      </div>

      <Dialog open={inserirEm !== null} onOpenChange={(v) => !v && setInserirEm(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Adicionar bloco</DialogTitle>
            <DialogDescription>
              Escolha o tipo. Depois dá para mover para onde quiser.
            </DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[65vh] gap-2 overflow-y-auto sm:grid-cols-2 lg:grid-cols-3">
            {TIPOS_EMAIL.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => adicionar(t.id)}
                className="flex gap-3 rounded-xl border p-3 text-left transition hover:border-primary hover:bg-primary/5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icone nome={t.icone} className="h-4 w-4" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{t.nome}</span>
                  <span className="block text-xs text-muted-foreground">{t.desc}</span>
                </span>
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </EnvioImagemCtx.Provider>
  );
}

function BotaoIcone({
  titulo,
  onClick,
  desligado,
  perigo,
  children,
}: {
  titulo: string;
  onClick: () => void;
  desligado?: boolean;
  perigo?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={titulo}
      aria-label={titulo}
      disabled={desligado}
      onClick={onClick}
      className={cn(
        "rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-25",
        perigo && "hover:bg-red-50 hover:text-red-600",
      )}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------- tema
const CAMPOS_TEMA: Array<[keyof TemaEmail, string]> = [
  ["fundo", "Fundo em volta"],
  ["cartao", "Fundo do e-mail"],
  ["topo", "Faixa da logo"],
  ["topoTexto", "Texto da faixa"],
  ["titulo", "Títulos"],
  ["texto", "Textos"],
  ["suave", "Caixas"],
  ["destaque", "Selos / detalhes"],
];

function PainelTema({
  c,
  setC,
}: {
  c: ConteudoEmail;
  setC: (f: (o: ConteudoEmail) => ConteudoEmail) => void;
}) {
  const t = temaDe(c);
  const [mais, setMais] = useState(false);
  const setT = (k: keyof TemaEmail, v: any) =>
    setC((o) => ({ ...o, tema: { ...temaDe(o), [k]: v } }));
  const atual = TEMAS.find(
    (x) => x.tema.cartao === t.cartao && x.tema.topo === t.topo && x.cor === c.cor,
  );
  return (
    <Card className="p-4">
      <h2 className="flex items-center gap-2 font-semibold">
        <Palette className="h-4 w-4 text-primary" /> Visual
      </h2>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {TEMAS.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() =>
              setC((o) => ({ ...o, cor: x.cor, tema: { ...x.tema, idioma: temaDe(o).idioma } }))
            }
            className={cn(
              "overflow-hidden rounded-xl border text-left transition hover:scale-[1.02]",
              atual?.id === x.id && "ring-2 ring-primary ring-offset-1",
            )}
            title={x.nome}
          >
            <span className="block h-4" style={{ background: x.tema.topo }} />
            <span className="block space-y-1 p-2" style={{ background: x.tema.cartao }}>
              <span className="block h-1.5 w-3/4 rounded" style={{ background: x.tema.titulo }} />
              <span
                className="block h-1 w-full rounded opacity-50"
                style={{ background: x.tema.texto }}
              />
              <span className="block h-3 w-1/2 rounded" style={{ background: x.cor }} />
            </span>
            <span
              className="block truncate px-2 pb-1.5 text-[10px] font-semibold"
              style={{ background: x.tema.cartao, color: x.tema.titulo }}
            >
              {x.nome}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold text-muted-foreground">
          Cor principal (botões)
          <div className="mt-1 flex items-center gap-2">
            <input
              type="color"
              value={/^#[0-9a-f]{6}$/i.test(c.cor) ? c.cor : "#0b7a3b"}
              onChange={(e) => setC((o) => ({ ...o, cor: e.target.value }))}
              className="h-9 w-12 cursor-pointer rounded border"
            />
            <Input
              value={c.cor}
              onChange={(e) => setC((o) => ({ ...o, cor: e.target.value }))}
              className="h-9 font-mono text-xs"
            />
          </div>
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Letra dos títulos
          <select
            value={t.fonte}
            onChange={(e) => setT("fonte", e.target.value)}
            className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
          >
            <option value="moderna">Moderna</option>
            <option value="impacto">Impacto (forte)</option>
            <option value="classica">Clássica (serifa)</option>
          </select>
        </label>
        <label className="text-xs font-semibold text-muted-foreground">
          Idioma dos textos fixos
          <select
            value={t.idioma}
            onChange={(e) => setT("idioma", e.target.value)}
            className="mt-1 h-9 w-full rounded-md border bg-background px-2 text-sm"
          >
            <option value="es">Espanhol (Uruguai)</option>
            <option value="pt">Português (Brasil)</option>
          </select>
        </label>
      </div>
      <button
        type="button"
        onClick={() => setMais(!mais)}
        className="mt-3 flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
      >
        <ChevronDown className={cn("h-3.5 w-3.5 transition", mais && "rotate-180")} /> Todas as
        cores e cantos
      </button>
      {mais && (
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {CAMPOS_TEMA.map(([k, r]) => (
            <label key={k} className="text-[11px] font-semibold text-muted-foreground">
              {r}
              <div className="mt-1 flex items-center gap-1.5">
                <input
                  type="color"
                  value={String(t[k])}
                  onChange={(e) => setT(k, e.target.value)}
                  className="h-8 w-10 cursor-pointer rounded border"
                />
                <span className="font-mono text-[10px]">{String(t[k])}</span>
              </div>
            </label>
          ))}
          <label className="text-[11px] font-semibold text-muted-foreground">
            Cantos ({t.cantos}px)
            <input
              type="range"
              min={0}
              max={28}
              value={t.cantos}
              onChange={(e) => setT("cantos", Number(e.target.value))}
              className="mt-2 w-full"
            />
          </label>
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- produtos
function FormProdutos({ b, mudar }: { b: BlocoEmail; mudar: (k: string, v: any) => void }) {
  const d = b.d;
  const { data: op } = useQuery({
    queryKey: ["opcoes-regras"],
    queryFn: () => opcoesRegrasFn(),
    enabled: d.fonte === "categoria" || d.fonte === "marca",
    staleTime: 600_000,
  });
  const lista = d.fonte === "categoria" ? op?.categorias : op?.marcas;
  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm font-semibold text-zinc-700">
          Título
          <Input
            value={d.titulo ?? ""}
            onChange={(e) => mudar("titulo", e.target.value)}
            className="mt-1"
          />
        </label>
        <label className="block text-sm font-semibold text-zinc-700">
          Quais peças
          <select
            value={d.fonte}
            onChange={(e) => mudar("fonte", e.target.value)}
            className="mt-1 block h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            {FONTES_PRODUTOS.map(([v, r]) => (
              <option key={v} value={v}>
                {r}
              </option>
            ))}
          </select>
        </label>
        {(d.fonte === "categoria" || d.fonte === "marca") && (
          <label className="block text-sm font-semibold text-zinc-700">
            {d.fonte === "categoria" ? "Categoria" : "Marca"}
            <select
              value={d.alvo ?? ""}
              onChange={(e) => mudar("alvo", e.target.value)}
              className="mt-1 block h-10 w-full rounded-md border bg-background px-3 text-sm"
            >
              <option value="">Escolha…</option>
              {d.alvo && !lista?.includes(d.alvo) && <option value={d.alvo}>{d.alvo}</option>}
              {lista?.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>
        )}
        {d.fonte !== "manual" && (
          <label className="block text-sm font-semibold text-zinc-700">
            Quantas (até 12)
            <Input
              type="number"
              min={1}
              max={12}
              value={d.limite ?? 6}
              onChange={(e) =>
                mudar("limite", Math.min(12, Math.max(1, Number(e.target.value) || 1)))
              }
              className="mt-1"
            />
          </label>
        )}
        <label className="block text-sm font-semibold text-zinc-700">
          Por linha
          <select
            value={String(d.colunas ?? "2")}
            onChange={(e) => mudar("colunas", e.target.value)}
            className="mt-1 block h-10 w-full rounded-md border bg-background px-3 text-sm"
          >
            <option value="1">1 (grande)</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </select>
        </label>
        <label className="block text-sm font-semibold text-zinc-700">
          Texto do link no cartão
          <Input
            value={d.botao ?? ""}
            onChange={(e) => mudar("botao", e.target.value)}
            placeholder="Pedir ahora / Cotizar"
            className="mt-1"
          />
        </label>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <label className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 p-3 text-sm">
          Mostrar preços (do dia, com promoção e Black Friday)
          <Switch checked={d.precos !== false} onCheckedChange={(v) => mudar("precos", v)} />
        </label>
        <label className="flex items-start justify-between gap-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          <span>
            <b>Mostrar fotos</b>
            <span className="block text-xs">
              Só fotos próprias ou autorizadas. Desligado: o cartão mostra o código.
            </span>
          </span>
          <Switch checked={!!d.fotos} onCheckedChange={(v) => mudar("fotos", v)} />
        </label>
      </div>
      {d.fonte === "manual" ? (
        <Produtos lista={d.produtos ?? []} aoMudar={(p) => mudar("produtos", p)} />
      ) : (
        <p className="rounded-lg bg-primary/5 p-3 text-xs text-muted-foreground">
          As peças são escolhidas sozinhas <b>na hora do envio</b>, já com o preço do dia (a prévia
          ao lado mostra as de hoje). Só entram peças com preço.
        </p>
      )}
    </div>
  );
}
