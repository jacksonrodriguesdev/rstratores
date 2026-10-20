// Banco de posts: cada peça com foto própria e preço vira um post pronto (arte + legenda +
// hashtags). Seleção em lote → rascunhos, agendamento automático nos melhores horários ou ZIP.
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarClock,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  FileArchive,
  Loader2,
  Save,
  Search,
  Square,
  StopCircle,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { bancoPostsFn, filtrosBancoFn } from "@/lib/estudio";
import { salvarPostFn } from "@/lib/instagram";
import { hash, hashtags, legenda, tomDaPeca, TONS, type Tom } from "@/lib/estudio-textos";
import { cn } from "@/lib/utils";
import { gerarArte, paraJpg, type Formato, type Modelo, type OpcoesArte } from "./artes";
import {
  baixarBlob,
  Campo,
  enviarBlob,
  horariosAgenda,
  miniatura,
  Opcoes,
  PreviaArte,
  useEstudio,
} from "./comum";

type Item = Awaited<ReturnType<typeof bancoPostsFn>>["itens"][number];
type Estilo = {
  modelo: Modelo | "variar";
  formato: Formato;
  idioma: "es" | "pt";
  mostrar: OpcoesArte["mostrar"];
  desconto: number;
  tom: Tom | "variar";
  selo: string;
};
const MODELOS_UM: Modelo[] = ["amarelo", "escuro", "verde"];
const modeloDe = (e: Estilo, sku: string): Modelo =>
  e.modelo === "variar" ? MODELOS_UM[hash(sku) % 3] : e.modelo;
const tomDe = (e: Estilo, sku: string): Tom => (e.tom === "variar" ? tomDaPeca(sku) : e.tom);
const peca = (i: Item) => ({ ...i, codigo: i.codigo, preco: i.preco });
function opcoesDe(e: Estilo, i: Item): OpcoesArte {
  return {
    modelo: modeloDe(e, i.sku),
    formato: e.formato,
    idioma: e.idioma,
    mostrar: e.mostrar === "preco" && !i.preco ? "desconto" : e.mostrar,
    desconto: e.desconto || null,
    selo: e.selo,
    chamada: e.idioma === "pt" ? "Peças para o seu trator" : "Repuestos para tu tractor",
    produtos: [
      {
        nome: e.idioma === "pt" ? i.nomePt || i.nome : i.nome,
        codigo: i.codigo,
        marca: i.marca,
        foto: i.foto,
        preco: i.preco,
      },
    ],
  };
}
const legendaDe = (e: Estilo, i: Item) =>
  legenda(peca(i), e.idioma, tomDe(e, i.sku), { preco: e.mostrar === "preco" });
const tagsDe = (e: Estilo, i: Item) => hashtags(i, e.idioma).join(" ");

// Miniaturas das artes, geradas uma por vez (fila) para não travar o navegador
const fila: Array<() => Promise<void>> = [];
let rodando = 0;
// 4 ao mesmo tempo: a espera é quase toda o download da foto
async function rodarFila() {
  while (rodando < 4 && fila.length) {
    rodando++;
    (async () => {
      while (fila.length) await fila.shift()!().catch(() => {});
      rodando--;
    })();
  }
}
function Miniatura({ e, i }: { e: Estilo; i: Item }) {
  const [src, setSrc] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const chave = JSON.stringify([e, i.sku]);
  useEffect(() => {
    setSrc(null);
    let vivo = true;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver((ents) => {
      if (!ents[0].isIntersecting) return;
      obs.disconnect();
      fila.push(async () => {
        if (!vivo) return;
        const c = await gerarArte(opcoesDe(e, i));
        const p = document.createElement("canvas");
        p.width = 300;
        p.height = Math.round((300 * c.height) / c.width);
        p.getContext("2d")!.drawImage(c, 0, 0, p.width, p.height);
        if (vivo) setSrc(p.toDataURL("image/jpeg", 0.75));
      });
      rodarFila();
    });
    obs.observe(el);
    return () => {
      vivo = false;
      obs.disconnect();
    };
  }, [chave]);
  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden rounded-lg bg-muted",
        e.formato === "story"
          ? "aspect-[9/16]"
          : e.formato === "quadrado"
            ? "aspect-square"
            : "aspect-[4/5]",
      )}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center">
          {i.foto ? (
            <img
              src={miniatura(i.foto)}
              alt=""
              className="h-1/2 w-1/2 object-contain opacity-40"
              loading="lazy"
            />
          ) : null}
          <Loader2 className="absolute h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

export function Banco({ modo = "banco" }: { modo?: "banco" | "fila" | "zip" }) {
  const qc = useQueryClient();
  const { horarios, posts, usarNoPost } = useEstudio();
  const [f, setF] = useState({
    pagina: 0,
    marca: "",
    categoria: "",
    q: "",
    ordem: "estoque" as const as any,
    soNovas: modo === "fila",
    comDesconto: false,
  });
  const [q, setQ] = useState("");
  const [e, setE] = useState<Estilo>({
    modelo: "variar",
    formato: "feed",
    idioma: "es",
    mostrar: "desconto",
    desconto: 20,
    tom: "variar",
    selo: "PRE BLACK FRIDAY",
  });
  const [sel, setSel] = useState<Map<string, Item>>(new Map());
  const [ver, setVer] = useState<Item | null>(null);
  const { data: filtros } = useQuery({
    queryKey: ["banco-filtros"],
    queryFn: () => filtrosBancoFn(),
    staleTime: 10 * 60_000,
  });
  const { data, isFetching } = useQuery({
    queryKey: ["banco", f],
    queryFn: () => bancoPostsFn({ data: f }),
    placeholderData: (a) => a,
  });
  const paginas = data ? Math.ceil(data.total / data.tamanho) : 0;
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, pagina: 0, ...p }));
  const alternar = (i: Item) =>
    setSel((m) => {
      const n = new Map(m);
      if (n.has(i.sku)) n.delete(i.sku);
      else n.set(i.sku, i);
      return n;
    });
  const todosPagina = () =>
    setSel((m) => {
      const n = new Map(m);
      const tudo = (data?.itens ?? []).every((i) => n.has(i.sku));
      for (const i of data?.itens ?? []) {
        if (tudo) n.delete(i.sku);
        else n.set(i.sku, i);
      }
      return n;
    });

  // ------------------------------------------------ lote
  const [acao, setAcao] = useState<"rascunho" | "agendar" | "zip">(
    modo === "zip" ? "zip" : modo === "fila" ? "agendar" : "rascunho",
  );
  const amanha = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const [inicio, setInicio] = useState(amanha);
  const [porDia, setPorDia] = useState(2);
  const [horas, setHoras] = useState<number[]>([]);
  const [facebook, setFacebook] = useState(true);
  const [prog, setProg] = useState<{ feito: number; total: number; erros: number } | null>(null);
  const parar = useRef(false);
  useEffect(() => {
    if (!horas.length && horarios?.topHoras?.length)
      setHoras(horarios.topHoras.map((h) => Math.max(7, Math.min(21, h - 1))));
    else if (!horas.length) setHoras([9, 12, 19]);
  }, [horarios]);
  const ocupados = useMemo(
    () =>
      posts.filter((p) => p.status === "AGENDADO" && p.agendado_para).map((p) => p.agendado_para!),
    [posts],
  );
  const lista = [...sel.values()];
  const slots =
    acao === "agendar"
      ? horariosAgenda({ inicio, porDia, horas, quantidade: lista.length, ocupados })
      : [];

  const rodar = async () => {
    if (!lista.length) return toast.error("Selecione as peças");
    parar.current = false;
    setProg({ feito: 0, total: lista.length, erros: 0 });
    let zip: any = null;
    if (acao === "zip") {
      const JSZip = (await import("jszip")).default;
      zip = new JSZip();
    }
    let erros = 0;
    const legendasTxt: string[] = [];
    for (const [n, i] of lista.entries()) {
      if (parar.current) break;
      try {
        const b = await paraJpg(await gerarArte(opcoesDe(e, i)));
        const leg = legendaDe(e, i);
        const nome = `${String(n + 1).padStart(3, "0")}-${i.codigo}-${e.idioma}`.replace(
          /[^\w.-]+/g,
          "_",
        );
        if (zip) {
          zip.file(`${nome}.jpg`, b);
          legendasTxt.push(
            `=== ${nome}.jpg ===\n${leg}\n\nPrimeiro comentário:\n${tagsDe(e, i)}\n`,
          );
        } else {
          const m = await enviarBlob(b, `${nome}.jpg`);
          await salvarPostFn({
            data: {
              tipo: e.formato === "story" ? "STORY" : "FEED",
              legenda: e.formato === "story" ? "" : leg,
              comentario: e.formato === "story" ? "" : tagsDe(e, i),
              midias: [m],
              facebook: facebook && e.formato !== "story",
              acao: acao === "agendar" ? "agendar" : "rascunho",
              quando: acao === "agendar" ? slots[n]?.toISOString() : null,
            },
          });
        }
      } catch (err: any) {
        erros++;
        if (erros <= 3) toast.error(`${i.codigo}: ${err.message}`);
      }
      setProg({ feito: n + 1, total: lista.length, erros });
    }
    if (zip) {
      zip.file("LEGENDAS.txt", legendasTxt.join("\n"));
      baixarBlob(
        await zip.generateAsync({ type: "blob" }),
        `agroparts-posts-${e.idioma}-${new Date().toISOString().slice(0, 10)}.zip`,
      );
    }
    qc.invalidateQueries({ queryKey: ["ig-posts"] });
    qc.invalidateQueries({ queryKey: ["banco"] });
    toast.success(
      acao === "zip"
        ? "ZIP baixado com as artes e as legendas"
        : acao === "agendar"
          ? `Agendado! Veja na aba Calendário${erros ? ` (${erros} com erro)` : ""}`
          : `Rascunhos salvos na aba Publicações${erros ? ` (${erros} com erro)` : ""}`,
    );
    setSel(new Map());
    setTimeout(() => setProg(null), 2500);
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho com números */}
      <div className="grid gap-3 sm:grid-cols-4">
        <Numero n={filtros?.total} r="posts prontos no banco" destaque />
        <Numero n={data?.total} r="com o filtro atual" />
        <Numero n={data?.postados} r="peças já publicadas" />
        <Numero n={sel.size} r="selecionadas" />
      </div>

      <Card className="space-y-3 p-3">
        <div className="flex flex-wrap gap-2">
          <form
            className="flex min-w-[220px] flex-1 gap-2"
            onSubmit={(ev) => {
              ev.preventDefault();
              set({ q: q.trim() });
            }}
          >
            <Input
              value={q}
              onChange={(ev) => setQ(ev.target.value)}
              placeholder="Nome, código ou SKU…"
            />
            <Button type="submit" variant="secondary" size="icon" aria-label="Buscar">
              <Search className="h-4 w-4" />
            </Button>
          </form>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={f.marca}
            onChange={(ev) => set({ marca: ev.target.value })}
            aria-label="Marca"
          >
            <option value="">Todas as marcas</option>
            {filtros?.marcas.map((m) => (
              <option key={m.nome} value={m.nome}>
                {m.nome} ({m.n.toLocaleString("pt-BR")})
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={f.categoria}
            onChange={(ev) => set({ categoria: ev.target.value })}
            aria-label="Categoria"
          >
            <option value="">Todas as categorias</option>
            {filtros?.categorias.map((m) => (
              <option key={m.nome} value={m.nome === "—" ? "" : m.nome}>
                {m.nome} ({m.n.toLocaleString("pt-BR")})
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border bg-background px-2 text-sm"
            value={f.ordem}
            onChange={(ev) => set({ ordem: ev.target.value as any })}
            aria-label="Ordem"
          >
            <option value="estoque">Mais estoque</option>
            <option value="menor">Menor preço</option>
            <option value="maior">Maior preço</option>
            <option value="novas">Mais novas</option>
            <option value="mistura">Misturado</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={f.soNovas}
              onChange={(ev) => set({ soNovas: ev.target.checked })}
            />{" "}
            Só peças nunca postadas
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={f.comDesconto}
              onChange={(ev) => set({ comDesconto: ev.target.checked })}
            />{" "}
            Só com desconto no site
          </label>
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        {/* Estilo das artes */}
        <div className="grid gap-3 border-t pt-3 md:grid-cols-3 xl:grid-cols-6">
          <Campo r="Modelo">
            <Opcoes
              v={e.modelo}
              set={(v) => setE({ ...e, modelo: v })}
              ops={
                [
                  ["variar", "Variar"],
                  ["amarelo", "Amarelo"],
                  ["escuro", "Preto/ouro"],
                  ["verde", "Verde"],
                ] as const
              }
            />
          </Campo>
          <Campo r="Formato">
            <Opcoes
              v={e.formato}
              set={(v) => setE({ ...e, formato: v })}
              ops={
                [
                  ["feed", "4:5"],
                  ["quadrado", "1:1"],
                  ["story", "Story"],
                ] as const
              }
            />
          </Campo>
          <Campo r="Idioma">
            <Opcoes
              v={e.idioma}
              set={(v) => setE({ ...e, idioma: v })}
              ops={
                [
                  ["es", "ES"],
                  ["pt", "PT"],
                ] as const
              }
            />
          </Campo>
          <Campo r="Mostrar">
            <Opcoes
              v={e.mostrar}
              set={(v) => setE({ ...e, mostrar: v })}
              ops={
                [
                  ["desconto", "%"],
                  ["preco", "Preço"],
                  ["nada", "Nada"],
                ] as const
              }
            />
          </Campo>
          <Campo r="Tom da legenda">
            <select
              className="h-8 w-full rounded-md border bg-background px-2 text-xs"
              value={e.tom}
              onChange={(ev) => setE({ ...e, tom: ev.target.value as any })}
            >
              <option value="variar">Variar sozinho</option>
              {TONS.map(([k, r]) => (
                <option key={k} value={k}>
                  {r}
                </option>
              ))}
            </select>
          </Campo>
          <Campo r="Desconto (%) / selo">
            <div className="flex gap-1">
              <Input
                className="h-8 w-16 text-xs"
                type="number"
                value={e.desconto}
                onChange={(ev) => setE({ ...e, desconto: Number(ev.target.value) || 0 })}
              />
              <Input
                className="h-8 text-xs"
                value={e.selo}
                onChange={(ev) => setE({ ...e, selo: ev.target.value.slice(0, 30) })}
              />
            </div>
          </Campo>
        </div>
      </Card>

      {/* Grade de posts */}
      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" onClick={todosPagina}>
          <CheckSquare className="mr-1.5 h-4 w-4" /> Marcar a página
        </Button>
        {!!sel.size && (
          <Button size="sm" variant="ghost" onClick={() => setSel(new Map())}>
            <X className="mr-1 h-4 w-4" /> Limpar seleção
          </Button>
        )}
        <div className="ml-auto flex items-center gap-1 text-sm">
          <Button
            size="icon"
            variant="outline"
            disabled={!f.pagina}
            onClick={() => setF((x) => ({ ...x, pagina: x.pagina - 1 }))}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="px-2 tabular-nums">
            {f.pagina + 1} / {paginas.toLocaleString("pt-BR")}
          </span>
          <Button
            size="icon"
            variant="outline"
            disabled={f.pagina + 1 >= paginas}
            onClick={() => setF((x) => ({ ...x, pagina: x.pagina + 1 }))}
            aria-label="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
        {(data?.itens ?? []).map((i) => {
          const s = sel.has(i.sku);
          return (
            <div
              key={i.sku}
              className={cn(
                "group overflow-hidden rounded-xl border bg-card p-1.5 transition",
                s && "ring-2 ring-primary",
              )}
            >
              <button
                className="relative block w-full"
                onClick={() => alternar(i)}
                aria-label={`Selecionar ${i.codigo}`}
              >
                <Miniatura e={e} i={i} />
                <span className="absolute left-1.5 top-1.5 rounded bg-white/90 p-0.5">
                  {s ? (
                    <CheckSquare className="h-4 w-4 text-primary" />
                  ) : (
                    <Square className="h-4 w-4 text-zinc-500" />
                  )}
                </span>
                {i.postado && (
                  <span className="absolute right-1.5 top-1.5 rounded bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    JÁ POSTADA
                  </span>
                )}
              </button>
              <div className="flex items-start gap-1 px-0.5 pt-1.5">
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-[11px] font-bold">
                    {e.idioma === "pt" ? i.nomePt : i.nome}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {i.codigo} · {i.preco ? (e.idioma === "pt" ? i.preco.brl : i.preco.uyu) : "—"} ·{" "}
                    {TONS.find((t) => t[0] === tomDe(e, i.sku))?.[1].split(" ")[0]}
                  </p>
                </div>
                <button
                  onClick={() => setVer(i)}
                  className="rounded p-1 hover:bg-muted"
                  aria-label="Ver post"
                >
                  <Eye className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Barra do lote */}
      {(!!sel.size || prog) && (
        <Card className="sticky bottom-3 z-10 space-y-3 border-primary/40 p-3 shadow-xl">
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-sm font-bold">{sel.size} post(s) selecionado(s)</p>
            <Opcoes
              v={acao}
              set={setAcao}
              ops={
                [
                  ["rascunho", "Salvar como rascunhos"],
                  ["agendar", "Agendar automático"],
                  ["zip", "Baixar ZIP"],
                ] as const
              }
            />
            {acao !== "zip" && e.formato !== "story" && (
              <label className="flex items-center gap-1.5 text-xs">
                <input
                  type="checkbox"
                  checked={facebook}
                  onChange={(ev) => setFacebook(ev.target.checked)}
                />{" "}
                Também no Facebook
              </label>
            )}
          </div>
          {acao === "agendar" && (
            <div className="flex flex-wrap items-end gap-3 text-xs">
              <Campo r="A partir de">
                <Input
                  type="date"
                  className="h-8 text-xs"
                  value={inicio}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(ev) => setInicio(ev.target.value)}
                />
              </Campo>
              <Campo r="Posts por dia">
                <Opcoes
                  v={porDia}
                  set={setPorDia}
                  ops={
                    [
                      [1, "1"],
                      [2, "2"],
                      [3, "3"],
                      [4, "4"],
                    ] as const
                  }
                />
              </Campo>
              <Campo r="Horas (horário do Uruguai)">
                <div className="flex flex-wrap gap-1">
                  {[7, 8, 9, 10, 11, 12, 13, 14, 17, 18, 19, 20, 21].map((h) => (
                    <button
                      key={h}
                      onClick={() =>
                        setHoras((l) => (l.includes(h) ? l.filter((x) => x !== h) : [...l, h]))
                      }
                      className={cn(
                        "rounded px-1.5 py-0.5 font-semibold",
                        horas.includes(h) ? "bg-primary text-primary-foreground" : "bg-muted",
                      )}
                    >
                      {h}h
                    </button>
                  ))}
                </div>
              </Campo>
              {!!slots.length && (
                <p className="text-muted-foreground">
                  <CalendarClock className="mr-1 inline h-3.5 w-3.5" />
                  {slots[0].toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}{" "}
                  até{" "}
                  {slots[slots.length - 1].toLocaleString("pt-BR", {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </p>
              )}
            </div>
          )}
          {prog ? (
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${(prog.feito / prog.total) * 100}%` }}
                />
              </div>
              <span className="text-xs tabular-nums">
                {prog.feito}/{prog.total}
                {prog.erros ? ` · ${prog.erros} erro(s)` : ""}
              </span>
              {prog.feito < prog.total && (
                <Button size="sm" variant="outline" onClick={() => (parar.current = true)}>
                  <StopCircle className="mr-1 h-4 w-4" /> Parar
                </Button>
              )}
            </div>
          ) : (
            <Button onClick={rodar}>
              {acao === "zip" ? (
                <FileArchive className="mr-1.5 h-4 w-4" />
              ) : acao === "agendar" ? (
                <CalendarClock className="mr-1.5 h-4 w-4" />
              ) : (
                <Save className="mr-1.5 h-4 w-4" />
              )}
              {acao === "zip"
                ? `Baixar ${sel.size} artes + legendas`
                : acao === "agendar"
                  ? `Agendar ${sel.size} posts`
                  : `Criar ${sel.size} rascunhos`}
            </Button>
          )}
          <p className="text-[11px] text-muted-foreground">
            As artes são geradas aqui no navegador (deixe a aba aberta até terminar). Hashtags vão
            no primeiro comentário.
          </p>
        </Card>
      )}

      {ver && (
        <Dialog open onOpenChange={(o) => !o && setVer(null)}>
          <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="line-clamp-1">
                {e.idioma === "pt" ? ver.nomePt : ver.nome}
              </DialogTitle>
            </DialogHeader>
            <VerPost
              e={e}
              i={ver}
              usar={(m) => {
                usarNoPost(
                  m,
                  legendaDe(e, ver),
                  e.formato === "story" ? "STORY" : "FEED",
                  tagsDe(e, ver),
                );
                setVer(null);
              }}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

function VerPost({ e, i, usar }: { e: Estilo; i: Item; usar: (m: any[]) => void }) {
  const [leg, setLeg] = useState(legendaDe(e, i));
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <PreviaArte
        gerar={() => gerarArte(opcoesDe(e, i))}
        chave={JSON.stringify([e, i.sku])}
        nome={`post-${i.codigo}`}
        comentario={tagsDe(e, i)}
        legenda={leg}
        tipo={e.formato === "story" ? "STORY" : "FEED"}
      />
      <div className="space-y-2">
        <Campo r="Legenda">
          <Textarea rows={12} value={leg} onChange={(ev) => setLeg(ev.target.value)} />
        </Campo>
        <Campo r="Primeiro comentário (hashtags)">
          <p className="rounded-md bg-muted p-2 text-xs">{tagsDe(e, i)}</p>
        </Campo>
        <div className="flex flex-wrap gap-1">
          {TONS.map(([k, r]) => (
            <button
              key={k}
              onClick={() =>
                setLeg(legenda(peca(i), e.idioma, k, { preco: e.mostrar === "preco" }))
              }
              className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold hover:bg-muted/70"
            >
              {r}
            </button>
          ))}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={async () => {
            const m = await enviarBlob(
              await paraJpg(await gerarArte(opcoesDe(e, i))),
              `post-${i.codigo}.jpg`,
            );
            usar([m]);
            toast.success("No compositor com legenda e hashtags");
          }}
        >
          <Download className="mr-1.5 h-4 w-4" /> Abrir no compositor com esta legenda
        </Button>
      </div>
    </div>
  );
}

function Numero({ n, r, destaque }: { n?: number; r: string; destaque?: boolean }) {
  return (
    <Card className={cn("p-3", destaque && "border-primary/40 bg-primary/5")}>
      <p className={cn("text-2xl font-black tabular-nums", destaque && "text-primary")}>
        {n == null ? "…" : n.toLocaleString("pt-BR")}
      </p>
      <p className="text-xs text-muted-foreground">{r}</p>
    </Card>
  );
}
