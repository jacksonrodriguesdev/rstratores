import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  MoveHorizontal,
  Megaphone,
  PanelsLeftRight,
  Search,
  BarChart3,
  LayoutGrid,
  Tractor,
  Timer,
  Rows3,
  LayoutDashboard,
  ListOrdered,
  HelpCircle,
  FileText,
  MousePointerClick,
  Wrench,
  Layers,
  Box,
  Flame,
  ArrowDown,
  ArrowUp,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Plus,
  Save,
  Trash2,
  Upload,
  X,
  LayoutTemplate,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  listHomepageBlocks,
  createHomepageBlock,
  updateHomepageBlock,
  deleteHomepageBlock,
  type HomepageBlock,
} from "@/lib/homepage";
import { CORES_MARCA, TIPOS_NOVOS, tipoNovo, type Campo } from "@/lib/blocos-home";
import { BlocoNovo } from "@/components/home/BlocosNovos";
import { reduzirImagem } from "@/lib/imagem-cliente";
import { cn } from "@/lib/utils";

// Admin → Construtor da Home: monta a página inicial inteira. Lista na ordem da página (subir,
// descer, ligar/desligar, duplicar, apagar), galeria com os 15 componentes novos, formulário de
// cada um (gerado de src/lib/blocos-home.ts) e prévia na hora. Os blocos clássicos (banner, vitrine
// de peças…) também aparecem aqui para ordenar; a configuração deles segue em Admin → Homepage.
export const Route = createFileRoute("/admin/construtor")({
  component: Construtor,
});

const CLASSICOS: Record<string, string> = {
  HERO_SLIDER: "Slider principal (banners)",
  FEATURES_STRIP: "Barra de benefícios",
  CATEGORY_GRID: "Grade de categorias",
  PRODUCTS_CAROUSEL: "Carrossel de peças",
  PRODUCTS_GRID: "Grade de peças",
  PROMO_STRIP: "Faixa de promoção (imagem)",
  BRANDS_CAROUSEL: "Carrossel de marcas (clássico)",
  BUSCA_CODIGO: "Busca por código",
  PROMO_BANNERS_DUPLOS: "Banners duplos",
  CAROUSEL_MONTADORAS: "Montadoras",
  DEPOIMENTOS: "Avaliações do Google",
  NEWSLETTER_INSTAGRAM: "Newsletter e Instagram",
  ENVIO_DAC: "Envio (DAC / RS)",
  CATALOGOS_CTA: "Chamada dos catálogos",
  COTIZACION: "Somos distribuidores / cotização",
};
const nomeDo = (tipo: string) => tipoNovo(tipo)?.nome ?? CLASSICOS[tipo] ?? tipo;
// Só os ícones usados pelos componentes (importar todos deixaria o admin pesado)
const ICONES: Record<string, typeof Box> = {
  MoveHorizontal,
  Megaphone,
  PanelsLeftRight,
  Search,
  BarChart3,
  LayoutGrid,
  Tractor,
  Timer,
  Rows3,
  LayoutDashboard,
  ListOrdered,
  HelpCircle,
  FileText,
  MousePointerClick,
  Wrench,
  Layers,
  Flame,
};
const Icone = ({ nome, className }: { nome: string; className?: string }) => {
  const I = ICONES[nome] ?? Box;
  return <I className={className} />;
};
const ler = (s: string | null): Record<string, any> => {
  try {
    return s ? JSON.parse(s) : {};
  } catch {
    return {};
  }
};

function Construtor() {
  const qc = useQueryClient();
  const { data: blocos = [], isLoading } = useQuery({
    queryKey: ["construtor"],
    queryFn: () => listHomepageBlocks(),
  });
  const [ordem, setOrdem] = useState<HomepageBlock[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [galeria, setGaleria] = useState(false);
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => setOrdem([...blocos].sort((a, b) => a.position - b.position)), [blocos]);
  const recarregar = () => {
    qc.invalidateQueries({ queryKey: ["construtor"] });
    qc.invalidateQueries({ queryKey: ["homepage_blocks"] });
  };
  const atual = ordem.find((b) => b.id === sel) ?? null;

  // Subir/descer: troca as posições e grava a ordem inteira (0, 1, 2…)
  const mover = async (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= ordem.length) return;
    const nova = [...ordem];
    [nova[i], nova[j]] = [nova[j], nova[i]];
    setOrdem(nova);
    try {
      await Promise.all(
        nova.map((b, pos) =>
          b.position !== pos ? updateHomepageBlock({ data: { id: b.id, position: pos } }) : null,
        ),
      );
      recarregar();
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  const alternar = async (b: HomepageBlock) => {
    setOrdem((o) => o.map((x) => (x.id === b.id ? { ...x, active: !b.active } : x)));
    await updateHomepageBlock({ data: { id: b.id, active: !b.active } });
    recarregar();
  };
  const adicionar = async (tipo: string, config?: Record<string, unknown>) => {
    setOcupado(true);
    try {
      const t = tipoNovo(tipo);
      const novo = await createHomepageBlock({
        data: {
          type: tipo,
          active: false, // nasce desligado: liga quando estiver pronto
          position: ordem.length,
          title: t?.nome ?? CLASSICOS[tipo] ?? tipo,
          config: JSON.stringify(config ?? t?.padrao ?? {}),
        },
      });
      setGaleria(false);
      recarregar();
      setSel(novo.id);
      toast.success("Componente adicionado (desligado). Ajuste e ligue quando estiver pronto.");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setOcupado(false);
    }
  };
  const apagar = async (b: HomepageBlock) => {
    if (!confirm(`Apagar “${nomeDo(b.type)}” da página inicial?`)) return;
    await deleteHomepageBlock({ data: { id: b.id } });
    if (sel === b.id) setSel(null);
    recarregar();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-zinc-900">
            <LayoutTemplate className="h-6 w-6 text-primary" /> Construtor da Home
          </h1>
          <p className="text-sm text-zinc-500">
            Monte a página inicial: escolha componentes, ordene, personalize cores e textos
            (espanhol e português) e veja a prévia na hora.
          </p>
        </div>
        <div className="flex gap-2">
          <a href="/" target="_blank" rel="noreferrer">
            <Button variant="outline" className="gap-1.5">
              <ExternalLink className="h-4 w-4" /> Ver a home
            </Button>
          </a>
          <Button onClick={() => setGaleria(true)} className="gap-1.5">
            <Plus className="h-4 w-4" /> Adicionar componente
          </Button>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
        {/* Ordem da página */}
        <Card className="h-fit p-3">
          <p className="px-1 pb-2 text-xs font-bold uppercase text-zinc-500">
            Ordem na página (de cima para baixo)
          </p>
          {isLoading ? (
            <p className="flex items-center gap-2 p-3 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </p>
          ) : (
            <ol className="space-y-1.5">
              {ordem.map((b, i) => {
                const novo = !!tipoNovo(b.type);
                return (
                  <li
                    key={b.id}
                    className={cn(
                      "flex items-center gap-2 rounded-xl px-2 py-2 ring-1 transition",
                      sel === b.id ? "bg-primary/5 ring-primary" : "ring-zinc-200 hover:bg-zinc-50",
                      !b.active && "opacity-55",
                    )}
                  >
                    <span className="flex flex-col">
                      <button
                        onClick={() => mover(i, -1)}
                        disabled={i === 0}
                        className="text-zinc-400 hover:text-zinc-900 disabled:opacity-30"
                        aria-label="Subir"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => mover(i, 1)}
                        disabled={i === ordem.length - 1}
                        className="text-zinc-400 hover:text-zinc-900 disabled:opacity-30"
                        aria-label="Descer"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </span>
                    <button
                      onClick={() => setSel(b.id)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <span
                        className={cn(
                          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
                          novo ? "bg-primary/10 text-primary" : "bg-zinc-100 text-zinc-500",
                        )}
                      >
                        <Icone nome={tipoNovo(b.type)?.icone ?? "Layers"} className="h-4 w-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-zinc-900">
                          {nomeDo(b.type)}
                        </span>
                        <span className="block truncate text-[11px] text-zinc-500">
                          {novo ? ler(b.config).titulo || ler(b.config).texto || "—" : "clássico"}
                        </span>
                      </span>
                    </button>
                    <Switch
                      checked={b.active}
                      onCheckedChange={() => alternar(b)}
                      aria-label="Ligar ou desligar"
                    />
                  </li>
                );
              })}
              {!ordem.length && <li className="p-3 text-sm text-zinc-500">Nenhum bloco ainda.</li>}
            </ol>
          )}
        </Card>

        {/* Editor + prévia */}
        <div className="min-w-0">
          {!atual ? (
            <Card className="flex flex-col items-center justify-center gap-3 p-10 text-center text-sm text-zinc-500">
              <LayoutTemplate className="h-10 w-10 text-zinc-300" />
              Escolha um bloco na lista para editar, ou adicione um componente novo.
            </Card>
          ) : tipoNovo(atual.type) ? (
            <Editor
              key={atual.id}
              bloco={atual}
              aoSalvar={recarregar}
              aoApagar={() => apagar(atual)}
              aoDuplicar={() => adicionar(atual.type, ler(atual.config))}
            />
          ) : (
            <Card className="p-6">
              <h2 className="text-lg font-extrabold">{nomeDo(atual.type)}</h2>
              <p className="mt-1 text-sm text-zinc-600">
                Bloco clássico: aqui você ordena e liga/desliga. As imagens e opções dele ficam no
                editor clássico.
              </p>
              <div className="mt-4 flex gap-2">
                <a href="/admin/homepage">
                  <Button variant="outline">Abrir editor clássico</Button>
                </a>
                <Button
                  variant="ghost"
                  className="gap-1.5 text-red-600"
                  onClick={() => apagar(atual)}
                >
                  <Trash2 className="h-4 w-4" /> Apagar
                </Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      <Dialog open={galeria} onOpenChange={setGaleria}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar componente</DialogTitle>
            <DialogDescription>
              Todos saem no HTML (o Google lê), carregam rápido e funcionam em espanhol e português.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {TIPOS_NOVOS.map((t) => (
              <button
                key={t.id}
                disabled={ocupado}
                onClick={() => adicionar(t.id)}
                className="flex gap-3 rounded-2xl p-4 text-left ring-1 ring-zinc-200 transition hover:bg-primary/5 hover:ring-primary disabled:opacity-50"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icone nome={t.icone} className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-bold text-zinc-900">
                    {t.nome}
                    {t.largura === "total" && (
                      <span className="ml-1.5 rounded bg-zinc-100 px-1.5 text-[10px] font-semibold text-zinc-500">
                        largura total
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs text-zinc-500">{t.desc}</span>
                </span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs font-bold uppercase text-zinc-500">Clássicos</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(CLASSICOS).map(([id, nome]) => (
              <button
                key={id}
                disabled={ocupado}
                onClick={() => adicionar(id)}
                className="rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ring-zinc-200 hover:bg-zinc-50"
              >
                {nome}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------------------------------------------------------------- Editor de um bloco novo
function Editor({
  bloco,
  aoSalvar,
  aoApagar,
  aoDuplicar,
}: {
  bloco: HomepageBlock;
  aoSalvar: () => void;
  aoApagar: () => void;
  aoDuplicar: () => void;
}) {
  const tipo = tipoNovo(bloco.type)!;
  const [c, setC] = useState<Record<string, any>>(() => ({ ...tipo.padrao, ...ler(bloco.config) }));
  const [salvando, setSalvando] = useState(false);
  const inicial = useMemo(
    () => JSON.stringify({ ...tipo.padrao, ...ler(bloco.config) }),
    [bloco.config, tipo],
  );
  const mudou = JSON.stringify(c) !== inicial;
  const salvar = async () => {
    setSalvando(true);
    try {
      await updateHomepageBlock({
        data: { id: bloco.id, config: JSON.stringify(c), title: tipo.nome },
      });
      toast.success("Salvo. A home já mostra a nova versão.");
      aoSalvar();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSalvando(false);
    }
  };
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-zinc-900">
              <Icone nome={tipo.icone} className="h-5 w-5 text-primary" /> {tipo.nome}
            </h2>
            <p className="text-xs text-zinc-500">{tipo.desc}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="gap-1" onClick={aoDuplicar}>
              <Copy className="h-4 w-4" /> Duplicar
            </Button>
            <Button variant="ghost" size="sm" className="gap-1 text-red-600" onClick={aoApagar}>
              <Trash2 className="h-4 w-4" /> Apagar
            </Button>
            <Button size="sm" className="gap-1.5" onClick={salvar} disabled={salvando || !mudou}>
              {salvando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}{" "}
              Salvar
            </Button>
          </div>
        </div>
        {!bloco.active && (
          <p className="mt-3 flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <EyeOff className="h-4 w-4" /> Desligado: não aparece no site. Ligue na lista quando
            estiver pronto.
          </p>
        )}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {tipo.campos.map((f) => (
            <CampoForm
              key={f.k}
              campo={f}
              valor={c[f.k]}
              valorPt={c[`${f.k}_pt`]}
              aoMudar={(k, v) => setC((o) => ({ ...o, [k]: v }))}
            />
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <p className="flex items-center gap-1.5 border-b bg-zinc-50 px-4 py-2 text-xs font-bold uppercase text-zinc-500">
          <Eye className="h-4 w-4" /> Prévia (espanhol)
          {mudou && (
            <span className="ml-auto normal-case text-amber-700">alterações não salvas</span>
          )}
        </p>
        <div className="bg-zinc-100 p-3 md:p-4">
          <BlocoNovo tipo={bloco.type} config={JSON.stringify(c)} />
        </div>
      </Card>
    </div>
  );
}

const CAMPO_CLS = "mt-1";
function CampoForm({
  campo: f,
  valor,
  valorPt,
  aoMudar,
}: {
  campo: Campo;
  valor: any;
  valorPt?: any;
  aoMudar: (k: string, v: any) => void;
}) {
  const largo = f.tipo === "lista" || f.tipo === "textarea";
  const rotulo = (
    <span className="text-sm font-semibold text-zinc-700">
      {f.rotulo}
      {f.ajuda && <span className="block text-xs font-normal text-zinc-500">{f.ajuda}</span>}
    </span>
  );
  const wrap = (filho: React.ReactNode) => (
    <label className={cn("block", largo && "md:col-span-2")}>
      {rotulo}
      {filho}
    </label>
  );

  if (f.tipo === "bool")
    return (
      <label className="flex items-center gap-3 md:col-span-2">
        <Switch checked={!!valor} onCheckedChange={(v) => aoMudar(f.k, v)} />
        {rotulo}
      </label>
    );
  if (f.tipo === "select")
    return wrap(
      <select
        value={valor ?? f.opcoes[0][0]}
        onChange={(e) => aoMudar(f.k, e.target.value)}
        className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
      >
        {f.opcoes.map(([v, r]) => (
          <option key={v} value={v}>
            {r}
          </option>
        ))}
      </select>,
    );
  if (f.tipo === "cor")
    return wrap(
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        <input
          type="color"
          value={/^#[0-9a-f]{6}$/i.test(valor ?? "") ? valor : "#000000"}
          onChange={(e) => aoMudar(f.k, e.target.value)}
          className="h-9 w-12 cursor-pointer rounded border"
        />
        <Input
          value={valor ?? ""}
          onChange={(e) => aoMudar(f.k, e.target.value)}
          className="h-9 w-24 font-mono text-xs"
        />
        {CORES_MARCA.map(([hex, nome]) => (
          <button
            key={hex}
            type="button"
            title={nome}
            onClick={() => aoMudar(f.k, hex)}
            className={cn(
              "h-6 w-6 rounded-full ring-1 ring-black/10",
              valor === hex && "ring-2 ring-primary ring-offset-1",
            )}
            style={{ background: hex }}
          />
        ))}
      </div>,
    );
  if (f.tipo === "lista")
    return wrap(
      <Lista
        campo={f}
        valor={Array.isArray(valor) ? valor : []}
        aoMudar={(v) => aoMudar(f.k, v)}
      />,
    );
  if (f.tipo === "imagem")
    return wrap(<CampoImagem valor={valor} aoMudar={(v) => aoMudar(f.k, v)} />);
  if (f.tipo === "datahora")
    return wrap(
      <Input
        type="datetime-local"
        value={paraLocal(valor)}
        onChange={(e) => aoMudar(f.k, e.target.value ? new Date(e.target.value).toISOString() : "")}
        className={CAMPO_CLS}
      />,
    );

  // texto / textarea / link / numero (bilíngue: espanhol + português)
  const entrada = (v: any, k: string, ph?: string) =>
    f.tipo === "textarea" ? (
      <textarea
        value={v ?? ""}
        onChange={(e) => aoMudar(k, e.target.value)}
        rows={4}
        placeholder={ph}
        className="mt-1 block w-full rounded-md border px-3 py-2 text-sm"
      />
    ) : (
      <Input
        type={f.tipo === "numero" ? "number" : "text"}
        value={v ?? ""}
        placeholder={ph ?? (f.tipo === "link" ? "/loja ou https://…" : undefined)}
        onChange={(e) => aoMudar(k, f.tipo === "numero" ? Number(e.target.value) : e.target.value)}
        className={CAMPO_CLS}
      />
    );
  if ("bilingue" in f && f.bilingue)
    return (
      <div className={cn(largo && "md:col-span-2")}>
        {rotulo}
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <span className="text-[11px] font-bold text-zinc-400">🇺🇾 ES</span>
            {entrada(valor, f.k)}
          </div>
          <div>
            <span className="text-[11px] font-bold text-zinc-400">
              🇧🇷 PT (vazio = usa o espanhol)
            </span>
            {entrada(valorPt, `${f.k}_pt`)}
          </div>
        </div>
      </div>
    );
  return wrap(entrada(valor, f.k));
}

// Data ISO → valor do campo datetime-local (no fuso do navegador)
function paraLocal(v: unknown) {
  if (typeof v !== "string" || !v) return "";
  const d = new Date(v);
  if (!Number.isFinite(d.getTime())) return "";
  const z = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T${z(d.getHours())}:${z(d.getMinutes())}`;
}

function Lista({
  campo,
  valor,
  aoMudar,
}: {
  campo: Extract<Campo, { tipo: "lista" }>;
  valor: any[];
  aoMudar: (v: any[]) => void;
}) {
  const mudar = (i: number, k: string, v: any) =>
    aoMudar(valor.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const mover = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= valor.length) return;
    const n = [...valor];
    [n[i], n[j]] = [n[j], n[i]];
    aoMudar(n);
  };
  return (
    <div className="mt-1 space-y-2">
      {valor.map((item, i) => (
        <div key={i} className="rounded-xl bg-zinc-50 p-3 ring-1 ring-black/5">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-500">#{i + 1}</span>
            <span className="flex gap-1">
              <button
                type="button"
                onClick={() => mover(i, -1)}
                className="rounded p-1 text-zinc-400 hover:bg-white hover:text-zinc-800"
                aria-label="Subir"
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => mover(i, 1)}
                className="rounded p-1 text-zinc-400 hover:bg-white hover:text-zinc-800"
                aria-label="Descer"
              >
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => aoMudar(valor.filter((_, j) => j !== i))}
                className="rounded p-1 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                aria-label="Remover"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            {campo.campos.map((f) => (
              <CampoForm
                key={f.k}
                campo={f}
                valor={item[f.k]}
                valorPt={item[`${f.k}_pt`]}
                aoMudar={(k, v) => mudar(i, k, v)}
              />
            ))}
          </div>
        </div>
      ))}
      {valor.length < campo.max && (
        <button
          type="button"
          onClick={() => aoMudar([...valor, {}])}
          className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
        >
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      )}
    </div>
  );
}

function CampoImagem({ valor, aoMudar }: { valor: any; aoMudar: (v: string) => void }) {
  const [enviando, setEnviando] = useState(false);
  const url =
    typeof valor === "string" && valor
      ? valor.startsWith("http") || valor.startsWith("/")
        ? valor
        : `/uploads/${valor}`
      : "";
  const enviar = async (arq: File) => {
    setEnviando(true);
    try {
      const fd = new FormData();
      fd.append("file", await reduzirImagem(arq, 1600));
      fd.append("kind", "hero");
      const r = await fetch("/api/admin/banners/upload", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.path) throw new Error(j.error || "Falha no envio");
      aoMudar(j.path);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setEnviando(false);
    }
  };
  return (
    <div className="mt-1 flex items-center gap-3">
      {url ? (
        <img src={url} alt="" className="h-14 w-20 rounded-lg object-cover ring-1 ring-black/10" />
      ) : (
        <span className="flex h-14 w-20 items-center justify-center rounded-lg bg-zinc-100 text-[10px] text-zinc-400">
          sem imagem
        </span>
      )}
      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold hover:bg-zinc-50">
        {enviando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}{" "}
        Enviar
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && enviar(e.target.files[0])}
        />
      </label>
      {url && (
        <button
          type="button"
          onClick={() => aoMudar("")}
          className="text-xs text-red-600 hover:underline"
        >
          remover
        </button>
      )}
    </div>
  );
}
