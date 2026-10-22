// Meta Ads → Criar: os anúncios prontos do dia (milhares), feitos com os dados do Criador de
// anúncios e do site: departamento × peça × ângulo. Um clique preenche o formulário (texto,
// título, link, objetivo, botão, departamento como público) e monta a imagem da peça.
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Info,
  Loader2,
  MapPin,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { anunciosProntosFn } from "@/lib/meta-ads";
import { cn } from "@/lib/utils";
import { nomeLimpo } from "@/lib/estudio-textos";
import { gerarArte, type Modelo } from "@/components/admin/estudio/artes";
import type { Preenchimento } from "./CampanhasProntas";

type Resp = Awaited<ReturnType<typeof anunciosProntosFn>>;
type Item = Resp["itens"][number];
const MODELO_DO_ANGULO: Record<string, Modelo> = {
  oferta: "amarelo",
  whatsapp: "escuro",
  codigo: "escuro",
  temporada: "verde",
  maquina: "verde",
};
const COR_PRIORIDADE: Record<string, string> = {
  Alta: "bg-emerald-100 text-emerald-800",
  Média: "bg-sky-100 text-sky-800",
  Baixa: "bg-zinc-100 text-zinc-600",
};
const miniatura = (u: string) => `/api/admin/estudio/foto?u=${encodeURIComponent(u)}`;

async function arte(a: Item, campanha: string | null) {
  const p = a.peca;
  return gerarArte({
    modelo: MODELO_DO_ANGULO[a.angulo] ?? "escuro",
    formato: "feed",
    idioma: "es",
    mostrar: a.angulo === "oferta" && p.desconto ? "desconto" : "nada",
    desconto: p.desconto || null,
    selo: campanha
      ? campanha.toUpperCase()
      : a.local.regioes.length
        ? a.local.nome.toUpperCase()
        : "AGRO PARTS",
    chamada: a.local.regioes.length ? `Repuestos en ${a.local.nome}` : "Repuestos para tu tractor",
    produtos: [
      {
        nome: nomeLimpo(p),
        codigo: p.codigo,
        marca: p.marca,
        foto: p.fotos[0],
        preco: p.uyu ? { uyu: p.uyu, brl: null, desconto: p.desconto } : null,
      },
    ],
  });
}

// Miniaturas geradas aos poucos (4 de cada vez)
const fila: Array<() => Promise<void>> = [];
let rodando = 0;
function rodarFila() {
  while (rodando < 4 && fila.length) {
    rodando++;
    (async () => {
      while (fila.length) await fila.shift()!().catch(() => {});
      rodando--;
    })();
  }
}
function Miniatura({ a, campanha }: { a: Item; campanha: string | null }) {
  const [src, setSrc] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    setSrc(null);
    let vivo = true;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver((e) => {
      if (!e[0].isIntersecting) return;
      obs.disconnect();
      fila.push(async () => {
        if (!vivo) return;
        const c = await arte(a, campanha);
        const m = document.createElement("canvas");
        m.width = 280;
        m.height = Math.round((280 * c.height) / c.width);
        m.getContext("2d")!.drawImage(c, 0, 0, m.width, m.height);
        if (vivo) setSrc(m.toDataURL("image/jpeg", 0.75));
      });
      rodarFila();
    });
    obs.observe(el);
    return () => {
      vivo = false;
      obs.disconnect();
    };
  }, [a.id]);
  return (
    <div ref={ref} className="relative aspect-[4/5] overflow-hidden rounded-lg bg-muted">
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center">
          <img
            src={miniatura(a.peca.fotos[0])}
            alt=""
            className="h-1/2 w-1/2 object-contain opacity-40"
            loading="lazy"
          />
          <Loader2 className="absolute h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}

export function AnunciosProntos({
  aplicar,
  aplicarImagem,
  localInicial,
}: {
  aplicar: (p: Preenchimento & { regioes: string[] }) => void;
  aplicarImagem: (img: { b64: string; url: string } | null) => void;
  localInicial?: string;
}) {
  const [f, setF] = useState({
    pagina: 0,
    local: localInicial ?? "",
    marca: "",
    categoria: "",
    angulo: "",
    objetivo: "",
    q: "",
  });
  const [q, setQ] = useState("");
  const [usando, setUsando] = useState<string | null>(null);
  const [abrir, setAbrir] = useState<string | null>(null);
  useEffect(() => {
    if (localInicial !== undefined) setF((x) => ({ ...x, local: localInicial, pagina: 0 }));
  }, [localInicial]);
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ["meta-prontos", f],
    queryFn: () =>
      anunciosProntosFn({
        data: {
          pagina: f.pagina,
          local: f.local || undefined,
          marca: f.marca || undefined,
          categoria: f.categoria || undefined,
          angulo: f.angulo || undefined,
          objetivo: (f.objetivo || undefined) as any,
          q: f.q || undefined,
        },
      }),
    placeholderData: (x) => x,
    staleTime: 10 * 60_000,
  });
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, pagina: 0, ...p }));
  const paginas = data ? Math.ceil(data.total / data.tamanho) : 0;

  const usar = async (a: Item) => {
    setUsando(a.id);
    try {
      aplicar({
        nome: `${a.local.nome} · ${a.peca.codigo} · ${data?.angulos[a.angulo as keyof Resp["angulos"]] ?? a.angulo} · ${new Date().toLocaleDateString("pt-BR")}`.slice(
          0,
          200,
        ),
        objetivo: a.objetivo,
        texto: a.texto,
        titulo: a.titulo,
        descricao: a.descricao,
        link: a.link,
        botao: a.botao,
        regioes: a.local.regioes,
      });
      const c = await arte(a, data?.campanha ?? null);
      const url = c.toDataURL("image/jpeg", 0.9);
      aplicarImagem({ url, b64: url.split(",")[1] });
      toast.success("Anúncio no formulário: confira e clique em Criar anúncio");
      document
        .getElementById("form-anuncio")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUsando(null);
    }
  };

  return (
    <Card className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Zap className="h-5 w-5 text-amber-500" />
        <p className="font-bold">Anúncios prontos de hoje</p>
        {data && (
          <span className="text-sm text-muted-foreground">
            <b className="text-foreground">{data.totalDia.toLocaleString("pt-BR")}</b> anúncios ·{" "}
            {data.pecas} peças · {data.facetas.locais.length} locais · época de {data.epoca}
            {data.campanha ? ` · ${data.campanha}` : ""} · atualizados em{" "}
            {new Date(data.dia + "T12:00:00").toLocaleDateString("pt-BR")}
          </span>
        )}
        <Link
          to="/admin/anuncios"
          className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
        >
          Estratégia completa (Criador de anúncios) <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {/* Estratégia do Criador: onde e quando */}
      {data && (
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <MapPin className="h-3.5 w-3.5" /> Onde anunciar
            </span>
            {data.estrategia.ondeAnunciar.map((l) => (
              <button
                key={l.nome}
                type="button"
                title={`${l.motivo} · ${l.visitas} visitas · ${l.leads} pedidos · ${l.cidades.join(", ")}`}
                onClick={() => set({ local: f.local === l.nome ? "" : l.nome })}
                className={cn(
                  "rounded-full px-2.5 py-1 text-xs font-semibold",
                  f.local === l.nome
                    ? "bg-primary text-primary-foreground"
                    : (COR_PRIORIDADE[l.prioridade] ?? "bg-muted"),
                )}
              >
                {l.nome}
              </button>
            ))}
          </div>
          {!!data.estrategia.faixaHoras && (
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> Mais pedidos:{" "}
              <b className="text-foreground">{data.estrategia.faixaHoras}</b>
              {data.estrategia.melhoresDias?.length
                ? ` · ${data.estrategia.melhoresDias.slice(0, 2).join(", ")}`
                : ""}
            </p>
          )}
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <form
          className="flex min-w-[200px] flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            set({ q: q.trim() });
          }}
        >
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Peça, código…" />
          <Button type="submit" size="icon" variant="secondary" aria-label="Buscar">
            <Search className="h-4 w-4" />
          </Button>
        </form>
        <Seletor
          v={f.local}
          set={(v) => set({ local: v })}
          todos="Todos os locais"
          ops={data?.facetas.locais}
          rotulo="Local"
        />
        <Seletor
          v={f.marca}
          set={(v) => set({ marca: v })}
          todos="Todas as marcas"
          ops={data?.facetas.marcas}
          rotulo="Marca"
        />
        <Seletor
          v={f.categoria}
          set={(v) => set({ categoria: v })}
          todos="Todas as categorias"
          ops={data?.facetas.categorias}
          rotulo="Categoria"
        />
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={f.objetivo}
          onChange={(e) => set({ objetivo: e.target.value })}
          aria-label="Objetivo"
        >
          <option value="">WhatsApp e visitas</option>
          <option value="WHATSAPP">Só WhatsApp</option>
          <option value="TRAFEGO">Só visitas ao site</option>
        </select>
      </div>
      {data && (
        <div className="flex flex-wrap gap-1">
          <Chip on={!f.angulo} set={() => set({ angulo: "" })}>
            Todos os tipos
          </Chip>
          {data.facetas.angulos.map((x) => (
            <Chip key={x.nome} on={f.angulo === x.nome} set={() => set({ angulo: x.nome })}>
              {data.angulos[x.nome as keyof Resp["angulos"]] ?? x.nome} (
              {x.n.toLocaleString("pt-BR")})
            </Chip>
          ))}
        </div>
      )}

      {isLoading && (
        <p className="flex items-center gap-2 py-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Montando os anúncios de hoje com os dados do
          site…
        </p>
      )}
      {error && <p className="text-sm text-red-600">{String((error as any).message)}</p>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
        {data?.itens.map((a) => (
          <div key={a.id} className="flex flex-col overflow-hidden rounded-xl border bg-card">
            <Miniatura a={a} campanha={data.campanha} />
            <div className="flex flex-1 flex-col gap-1.5 p-3">
              <div className="flex flex-wrap items-center gap-1 text-[10px] font-bold">
                <span className="inline-flex items-center gap-0.5 rounded bg-primary/10 px-1.5 py-0.5 text-primary">
                  <MapPin className="h-3 w-3" /> {a.local.nome}
                </span>
                <span className="rounded bg-muted px-1.5 py-0.5">
                  {data.angulos[a.angulo as keyof Resp["angulos"]] ?? a.angulo}
                </span>
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5",
                    a.objetivo === "WHATSAPP"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-sky-100 text-sky-800",
                  )}
                >
                  {a.objetivo === "WHATSAPP" ? "WhatsApp" : "Visitas"}
                </span>
                <span className="ml-auto text-muted-foreground" title="Pontuação (dados do site)">
                  {a.score}
                </span>
              </div>
              <p className="line-clamp-1 text-sm font-bold">{a.titulo}</p>
              <p className="line-clamp-3 whitespace-pre-line text-xs text-muted-foreground">
                {a.texto}
              </p>
              <button
                type="button"
                onClick={() => setAbrir(abrir === a.id ? null : a.id)}
                className="flex items-center gap-1 text-left text-[11px] font-semibold text-muted-foreground hover:text-foreground"
              >
                <Info className="h-3 w-3" /> Por que este anúncio
              </button>
              {abrir === a.id && (
                <ul className="list-disc space-y-0.5 pl-4 text-[11px] text-muted-foreground">
                  {a.motivos.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              )}
              <Button size="sm" className="mt-auto" onClick={() => usar(a)} disabled={!!usando}>
                {usando === a.id ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-1.5 h-4 w-4" />
                )}
                Usar este anúncio
              </Button>
            </div>
          </div>
        ))}
      </div>
      {data && !data.itens.length && (
        <p className="py-6 text-center text-sm text-muted-foreground">
          Nenhum anúncio com esses filtros.
        </p>
      )}

      {paginas > 1 && (
        <div className="flex items-center justify-center gap-2 text-sm">
          <Button
            size="icon"
            variant="outline"
            disabled={!f.pagina}
            onClick={() => setF((x) => ({ ...x, pagina: x.pagina - 1 }))}
            aria-label="Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="tabular-nums">
            {f.pagina + 1} / {paginas.toLocaleString("pt-BR")} ·{" "}
            {data!.total.toLocaleString("pt-BR")} anúncios
          </span>
          <Button
            size="icon"
            variant="outline"
            disabled={f.pagina + 1 >= paginas}
            onClick={() => setF((x) => ({ ...x, pagina: x.pagina + 1 }))}
            aria-label="Próxima"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      )}
    </Card>
  );
}

function Seletor({
  v,
  set,
  todos,
  ops,
  rotulo,
}: {
  v: string;
  set: (v: string) => void;
  todos: string;
  ops?: Array<{ nome: string; n: number }>;
  rotulo: string;
}) {
  return (
    <select
      className="h-9 max-w-[200px] rounded-md border bg-background px-2 text-sm"
      value={v}
      onChange={(e) => set(e.target.value)}
      aria-label={rotulo}
    >
      <option value="">{todos}</option>
      {ops?.map((o) => (
        <option key={o.nome} value={o.nome}>
          {o.nome} ({o.n.toLocaleString("pt-BR")})
        </option>
      ))}
    </select>
  );
}
function Chip({ on, set, children }: { on: boolean; set: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={set}
      className={cn(
        "rounded-md px-2 py-1 text-xs font-semibold",
        on ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70",
      )}
    >
      {children}
    </button>
  );
}
