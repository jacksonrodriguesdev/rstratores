// Estúdio de publicações e anúncios: o que anunciar (pelo que acontece no site), arte pronta
// gerada no navegador com fotos próprias das peças, legenda, publicação e anúncio pausado no Meta.
import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Clock,
  Download,
  Flame,
  Loader2,
  MapPin,
  Megaphone,
  MessageCircle,
  Search,
  Send,
  ShoppingCart,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Eye,
  Wallet,
  X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { estudioFn, buscarPecasEstudioFn } from "@/lib/estudio";
import { criarAnuncioMetaFn } from "@/lib/meta-ads";
import { cn } from "@/lib/utils";
import { gerarArte, paraJpg, type Formato, type Modelo, type OpcoesArte } from "./artes";

type Peca = {
  sku: string;
  codigo: string;
  nome: string;
  nomePt: string;
  marca: string | null;
  fotos: string[];
  preco: { uyu: string; brl: string | null; deUyu?: string | null; desconto: number } | null;
  legendas: { es: string[]; pt: string[] };
  sinais?: {
    views: number;
    visitantes: number;
    whatsapp: number;
    carrinho: number;
    busca: number;
    tendencia: number;
  };
  pontos?: number;
  regioes?: Array<{ nome: string; v: number }>;
  cidades?: Array<{ nome: string; v: number }>;
  paises?: Array<{ nome: string; v: number }>;
  ideias?: Array<{
    tipo: string;
    titulo: string;
    porque: string;
    formato: string;
    objetivo: string;
  }>;
};
export type Midia = { path: string; tipo: "IMAGE" | "VIDEO" };

const MODELOS: Array<{ k: Modelo; rotulo: string; fundo: string }> = [
  { k: "amarelo", rotulo: "Pré-Black amarelo", fundo: "bg-yellow-400" },
  { k: "escuro", rotulo: "Preto e ouro", fundo: "bg-zinc-900" },
  { k: "verde", rotulo: "Verde campo", fundo: "bg-emerald-800" },
  { k: "grade", rotulo: "Vitrine (até 4)", fundo: "bg-gradient-to-br from-zinc-900 to-zinc-700" },
];
const FORMATOS: Array<{ k: Formato; rotulo: string }> = [
  { k: "feed", rotulo: "Feed 4:5" },
  { k: "quadrado", rotulo: "Quadrado 1:1" },
  { k: "story", rotulo: "Story 9:16" },
];
const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

async function enviarBlob(b: Blob, nome: string): Promise<Midia> {
  const fd = new FormData();
  fd.append("file", new File([b], nome, { type: "image/jpeg" }));
  const r = await fetch("/api/admin/instagram/upload", { method: "POST", body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.path) throw new Error(j.error || "Falha no envio");
  return { path: j.path, tipo: "IMAGE" };
}
const base64 = (b: Blob) =>
  new Promise<string>((ok, erro) => {
    const fr = new FileReader();
    fr.onload = () => ok(String(fr.result).replace(/^data:[^,]+,/, ""));
    fr.onerror = () => erro(new Error("Falha ao ler a imagem"));
    fr.readAsDataURL(b);
  });
const miniatura = (u: string) => `/api/admin/estudio/foto?u=${encodeURIComponent(u)}`;

export function PainelRecomendacoes({
  usarNoPost,
}: {
  usarNoPost: (midias: Midia[], legenda: string, tipo: "FEED" | "CARROSSEL" | "STORY") => void;
}) {
  const [dias, setDias] = useState(30);
  const { data, isLoading, error } = useQuery({
    queryKey: ["estudio", dias],
    queryFn: () => estudioFn({ data: { dias } }),
    staleTime: 5 * 60_000,
  });
  const [escolhidas, setEscolhidas] = useState<Peca[]>([]);
  const [fotoDe, setFotoDe] = useState<Record<string, string | null>>({});
  const [q, setQ] = useState("");
  const [busca, setBusca] = useState("");
  const { data: achadas, isFetching: buscando } = useQuery({
    queryKey: ["estudio-busca", busca],
    queryFn: () => buscarPecasEstudioFn({ data: { q: busca } }),
    enabled: busca.length >= 2,
  });
  const recs = (data?.produtos ?? []) as Peca[];

  const alternar = (p: Peca) =>
    setEscolhidas((l) =>
      l.some((x) => x.sku === p.sku) ? l.filter((x) => x.sku !== p.sku) : [...l, p].slice(-4),
    );

  return (
    <div className="space-y-5">
      {/* Resumo: quando postar e quanto investir */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Horarios h={data?.horarios} />
        <Orcamento o={data?.orcamento} recs={recs} />
        <Card className="p-4">
          <p className="flex items-center gap-2 text-sm font-bold">
            <Sparkles className="h-4 w-4 text-primary" /> Como o Estúdio decide
          </p>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Cada peça ganha pontos pelo que aconteceu no site nos últimos {dias} dias: visita (1),
            pessoa diferente (2), busca pelo código (3), carrinho (6) e pedido no WhatsApp (12). As
            fotos usadas nas artes são só as da agrotrator e as enviadas por você.
          </p>
          <div className="mt-3 flex gap-1">
            {[7, 30, 90].map((d) => (
              <button
                key={d}
                onClick={() => setDias(d)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-semibold",
                  dias === d ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70",
                )}
              >
                {d} dias
              </button>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Esquerda: recomendações + busca */}
        <div className="space-y-4">
          <Card className="p-3">
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                setBusca(q.trim());
              }}
            >
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar qualquer peça (nome, código, SKU)…"
              />
              <Button type="submit" variant="secondary">
                {buscando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </form>
            {busca.length >= 2 && (
              <div className="mt-3 max-h-72 space-y-1 overflow-y-auto">
                {(achadas ?? []).map((p) => {
                  const peca: Peca = { ...p, fotos: p.foto ? [p.foto] : [] };
                  const sel = escolhidas.some((x) => x.sku === p.sku);
                  return (
                    <button
                      key={p.sku}
                      onClick={() => alternar(peca)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg p-2 text-left text-sm hover:bg-muted",
                        sel && "bg-primary/10 ring-1 ring-primary",
                      )}
                    >
                      <Foto u={p.foto} />
                      <span className="min-w-0 flex-1">
                        <span className="line-clamp-1 font-semibold">{p.nome}</span>
                        <span className="text-xs text-muted-foreground">
                          {p.codigo} {p.preco ? `· ${p.preco.uyu}` : "· sem preço"}
                        </span>
                      </span>
                    </button>
                  );
                })}
                {achadas && !achadas.length && (
                  <p className="p-3 text-center text-xs text-muted-foreground">Nada encontrado.</p>
                )}
              </div>
            )}
          </Card>

          <div>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-bold">
              <Flame className="h-4 w-4 text-orange-500" /> Peças para anunciar agora
              <span className="font-normal text-muted-foreground">
                (clique para escolher; até 4 por arte)
              </span>
            </h3>
            {isLoading && (
              <Card className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Analisando visitas, WhatsApp e buscas…
              </Card>
            )}
            {error && (
              <Card className="p-4 text-sm text-red-600">{String((error as any).message)}</Card>
            )}
            {data && !recs.length && (
              <Card className="p-6 text-sm text-muted-foreground">
                Ainda não há movimento nas páginas das peças neste período. Use a busca acima.
              </Card>
            )}
            <div className="space-y-2">
              {recs.map((p, i) => (
                <ItemRecomendacao
                  key={p.sku}
                  p={p}
                  pos={i + 1}
                  max={recs[0]?.pontos ?? 1}
                  sel={escolhidas.some((x) => x.sku === p.sku)}
                  alternar={() => alternar(p)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Direita: gerador */}
        <div className="xl:sticky xl:top-4 xl:self-start">
          <Gerador
            pecas={escolhidas}
            fotoDe={fotoDe}
            setFoto={(sku, u) => setFotoDe((m) => ({ ...m, [sku]: u }))}
            remover={(sku) => setEscolhidas((l) => l.filter((x) => x.sku !== sku))}
            orcamento={data?.orcamento?.diario ?? null}
            usarNoPost={usarNoPost}
          />
        </div>
      </div>
    </div>
  );
}

function Foto({ u, grande }: { u?: string | null; grande?: boolean }) {
  const t = grande ? "h-16 w-16" : "h-11 w-11";
  if (!u)
    return (
      <span
        className={cn(
          t,
          "flex shrink-0 items-center justify-center rounded-md bg-muted text-[9px] font-bold text-muted-foreground",
        )}
      >
        SEM FOTO
      </span>
    );
  return (
    <img
      src={miniatura(u)}
      alt=""
      loading="lazy"
      className={cn(t, "shrink-0 rounded-md border bg-white object-contain")}
    />
  );
}

function ItemRecomendacao({
  p,
  pos,
  max,
  sel,
  alternar,
}: {
  p: Peca;
  pos: number;
  max: number;
  sel: boolean;
  alternar: () => void;
}) {
  const [aberto, setAberto] = useState(pos <= 2);
  const s = p.sinais!;
  const onde = [...(p.cidades ?? []), ...(p.regioes ?? [])].slice(0, 3);
  const doBrasil = (p.paises ?? [])[0]?.nome === "BR";
  return (
    <Card className={cn("overflow-hidden p-0 transition", sel && "ring-2 ring-primary")}>
      <div className="flex items-start gap-3 p-3">
        <span className="mt-1 w-5 text-center text-sm font-black text-muted-foreground">{pos}</span>
        <button onClick={alternar} title="Usar na arte">
          <Foto u={p.fotos[0]} grande />
        </button>
        <div className="min-w-0 flex-1">
          <button onClick={alternar} className="text-left">
            <p className="line-clamp-2 text-sm font-bold leading-tight">{p.nome}</p>
          </button>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {p.codigo}
            {p.marca ? ` · ${p.marca}` : ""}
            {p.preco ? ` · ${p.preco.uyu}` : " · sem preço"}
            {p.preco?.desconto ? ` · -${p.preco.desconto}%` : ""}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
            <Sinal icone={Eye} v={s.views} r="visitas" />
            {!!s.whatsapp && <Sinal icone={MessageCircle} v={s.whatsapp} r="WhatsApp" forte />}
            {!!s.carrinho && <Sinal icone={ShoppingCart} v={s.carrinho} r="carrinho" />}
            {!!s.busca && <Sinal icone={Search} v={s.busca} r="buscas" />}
            {s.tendencia !== 0 && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
                  s.tendencia > 0 ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-600",
                )}
              >
                {s.tendencia > 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {s.tendencia > 0 ? "+" : ""}
                {s.tendencia}% na semana
              </span>
            )}
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary"
              style={{ width: `${Math.max(4, ((p.pontos ?? 0) / max) * 100)}%` }}
            />
          </div>
        </div>
        <Button size="sm" variant={sel ? "default" : "outline"} onClick={alternar}>
          {sel ? "Na arte" : "Usar"}
        </Button>
      </div>
      <button
        onClick={() => setAberto((a) => !a)}
        className="w-full border-t bg-muted/30 px-3 py-1.5 text-left text-xs font-semibold text-muted-foreground hover:bg-muted/60"
      >
        {aberto ? "Esconder ideias" : `${p.ideias?.length ?? 0} ideia(s) de anúncio`}
        {!!onde.length && (
          <span className="ml-2 font-normal">
            <MapPin className="mr-0.5 inline h-3 w-3" />
            {onde.map((o) => o.nome).join(", ")}
          </span>
        )}
      </button>
      {aberto && (
        <ul className="space-y-2 border-t p-3">
          {(p.ideias ?? []).map((i) => (
            <li key={i.tipo} className="rounded-lg border bg-background p-2.5">
              <p className="flex items-center gap-2 text-xs font-bold">
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[10px]",
                    i.objetivo === "WHATSAPP"
                      ? "bg-emerald-100 text-emerald-800"
                      : i.objetivo === "TRAFEGO"
                        ? "bg-sky-100 text-sky-800"
                        : "bg-zinc-100 text-zinc-700",
                  )}
                >
                  {i.objetivo === "WHATSAPP"
                    ? "WhatsApp"
                    : i.objetivo === "TRAFEGO"
                      ? "Tráfego"
                      : "Orgânico"}
                </span>
                {i.titulo}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{i.porque}</p>
              <p className="mt-1 text-[11px] font-semibold">Formato: {i.formato}</p>
            </li>
          ))}
          {doBrasil && (
            <li className="rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900">
              A maioria das visitas desta peça vem do Brasil. Os anúncios pagos são só para o
              Uruguai: para o RS, use publicação orgânica.
            </li>
          )}
        </ul>
      )}
    </Card>
  );
}

function Sinal({ icone: I, v, r, forte }: { icone: any; v: number; r: string; forte?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold",
        forte ? "bg-emerald-600 text-white" : "bg-muted text-foreground",
      )}
    >
      <I className="h-3 w-3" /> {v} {r}
    </span>
  );
}

export function Horarios({
  h,
}: {
  h?: { horas: number[]; semana: number[]; topHoras: number[]; topDias: string[] };
}) {
  const max = Math.max(1, ...(h?.horas ?? [0]));
  const maxS = Math.max(1, ...(h?.semana ?? [0]));
  return (
    <Card className="p-4">
      <p className="flex items-center gap-2 text-sm font-bold">
        <Clock className="h-4 w-4 text-primary" /> Melhor hora para postar
      </p>
      {!h ? (
        <p className="mt-3 text-xs text-muted-foreground">Carregando…</p>
      ) : (
        <>
          {!h.topHoras.length && (
            <p className="mt-1 text-xs text-muted-foreground">
              Ainda sem visitas suficientes neste período.
            </p>
          )}
          {!!h.topHoras.length && (
            <p className="mt-1 text-xs text-muted-foreground">
              Mais gente no site às{" "}
              <b className="text-foreground">{h.topHoras.map((x) => `${x}h`).join(", ")}</b> e{" "}
              <b className="text-foreground">{h.topDias.join(" e ")}</b> (horário do Uruguai).
              Publique um pouco antes.
            </p>
          )}
          <div
            className="mt-3 flex h-16 items-end gap-[2px]"
            role="img"
            aria-label="Visitas por hora"
          >
            {h.horas.map((v, i) => (
              <div
                key={i}
                title={`${i}h: ${v} visitas`}
                className={cn(
                  "flex-1 rounded-t-[2px]",
                  h.topHoras.includes(i) ? "bg-primary" : "bg-primary/25 hover:bg-primary/50",
                )}
                style={{ height: `${Math.max(3, (v / max) * 100)}%` }}
              />
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>0h</span>
            <span>6h</span>
            <span>12h</span>
            <span>18h</span>
            <span>23h</span>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1">
            {h.semana.map((v, i) => (
              <div key={i} title={`${DIAS_SEMANA[i]}: ${v} visitas`} className="text-center">
                <div
                  className="mx-auto h-6 rounded bg-primary"
                  style={{ opacity: 0.15 + (v / maxS) * 0.85 }}
                />
                <span className="text-[10px] text-muted-foreground">{DIAS_SEMANA[i]}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  );
}

export function Orcamento({
  o,
  recs,
}: {
  o?: { cpc: number | null; moeda: string | null; diario: number | null; base: string };
  recs: Peca[];
}) {
  const fmt = (v: number) =>
    v.toLocaleString("es-UY", {
      style: "currency",
      currency: o?.moeda || "USD",
      maximumFractionDigits: 2,
    });
  // Onde está o interesse (Uruguai): soma das regiões das peças recomendadas
  const regioes = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of recs)
      if ((p.paises ?? [])[0]?.nome !== "BR")
        for (const r of p.regioes ?? []) m.set(r.nome, (m.get(r.nome) ?? 0) + r.v);
    return [...m].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [recs]);
  const total = regioes.reduce((s, r) => s + r[1], 0) || 1;
  return (
    <Card className="p-4">
      <p className="flex items-center gap-2 text-sm font-bold">
        <Wallet className="h-4 w-4 text-primary" /> Quanto e onde investir
      </p>
      {!o ? (
        <p className="mt-3 text-xs text-muted-foreground">Carregando…</p>
      ) : o.diario ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Sugestão: <b className="text-lg text-foreground">{fmt(o.diario)}/dia</b> por anúncio
          (custo por clique real {fmt(o.cpc!)} × ~25 cliques). Comece com 3 a 5 dias e compare.
        </p>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">
          Sem histórico de cliques ({o.base}). Comece com um valor baixo e acompanhe na Central de
          Anúncios.
        </p>
      )}
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Interesse por região (Uruguai)
      </p>
      <ul className="mt-1 space-y-1">
        {regioes.map(([n, v]) => (
          <li key={n} className="flex items-center gap-2 text-xs">
            <span className="w-28 truncate">{n}</span>
            <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full rounded-full bg-primary"
                style={{ width: `${(v / total) * 100}%` }}
              />
            </span>
            <span className="w-8 text-right tabular-nums text-muted-foreground">
              {Math.round((v / total) * 100)}%
            </span>
          </li>
        ))}
        {!regioes.length && (
          <li className="text-xs text-muted-foreground">Sem dados de região ainda.</li>
        )}
      </ul>
    </Card>
  );
}

// ---------------------------------------------------------------- gerador
function Gerador({
  pecas,
  fotoDe,
  setFoto,
  remover,
  orcamento,
  usarNoPost,
}: {
  pecas: Peca[];
  fotoDe: Record<string, string | null>;
  setFoto: (sku: string, u: string | null) => void;
  remover: (sku: string) => void;
  orcamento: number | null;
  usarNoPost: (midias: Midia[], legenda: string, tipo: "FEED" | "CARROSSEL" | "STORY") => void;
}) {
  const [modelo, setModelo] = useState<Modelo>("amarelo");
  const [variante, setVariante] = useState<"auto" | "desconto" | "preco" | "whatsapp" | "codigo">(
    "auto",
  );
  const [formato, setFormato] = useState<Formato>("feed");
  const [idioma, setIdioma] = useState<"es" | "pt">("es");
  const [mostrar, setMostrar] = useState<OpcoesArte["mostrar"]>("desconto");
  const [desconto, setDesconto] = useState<number | "">(20);
  const [selo, setSelo] = useState("PRE BLACK FRIDAY");
  const [chamada, setChamada] = useState("");
  const [legenda, setLegenda] = useState("");
  const [previa, setPrevia] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const [indo, setIndo] = useState<string | null>(null);
  const [anuncio, setAnuncio] = useState(false);
  const ultimo = useRef<HTMLCanvasElement | null>(null);
  const vez = useRef(0);

  const lote = modelo === "grade" ? pecas.slice(0, 4) : pecas;
  const opcoes = (ps: Peca[]): OpcoesArte => ({
    variante: variante === "auto" ? undefined : variante,
    modelo,
    formato,
    idioma,
    mostrar,
    desconto: desconto === "" ? null : Number(desconto),
    selo,
    chamada: chamada || (idioma === "pt" ? "Peças para o seu trator" : "Repuestos para tu tractor"),
    produtos: ps.map((p) => ({
      nome: idioma === "pt" ? p.nomePt || p.nome : p.nome,
      codigo: p.codigo,
      marca: p.marca,
      foto: fotoDe[p.sku] !== undefined ? fotoDe[p.sku] : (p.fotos[0] ?? null),
      preco: p.preco,
    })),
  });
  const chave = JSON.stringify([
    modelo,
    variante,
    formato,
    idioma,
    mostrar,
    desconto,
    selo,
    chamada,
    pecas.map((p) => p.sku),
    fotoDe,
  ]);

  // Prévia ao vivo (da primeira peça, ou da vitrine)
  useEffect(() => {
    if (!pecas.length) {
      setPrevia(null);
      return;
    }
    const minha = ++vez.current;
    setGerando(true);
    const t = setTimeout(async () => {
      try {
        const c = await gerarArte(opcoes(modelo === "grade" ? lote : [pecas[0]]));
        if (minha !== vez.current) return;
        ultimo.current = c;
        setPrevia(c.toDataURL("image/jpeg", 0.8));
      } catch (e: any) {
        if (minha === vez.current) toast.error(e.message);
      } finally {
        if (minha === vez.current) setGerando(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [chave]); // eslint-disable-line react-hooks/exhaustive-deps

  // Legenda sugerida da primeira peça
  useEffect(() => {
    const p = pecas[0];
    if (!p) return setLegenda("");
    const tags =
      idioma === "pt"
        ? "\n\n#AgroParts #PecasAgricolas #PecasParaTrator #AgroRS"
        : "\n\n#AgroParts #RepuestosAgricolas #RepuestosParaTractor #AgroUruguay";
    setLegenda((idioma === "pt" ? p.legendas.pt[0] : p.legendas.es[0]) + tags);
  }, [pecas[0]?.sku, idioma]); // eslint-disable-line react-hooks/exhaustive-deps

  // Uma arte por peça (ou uma vitrine) → JPG
  const artes = async () => {
    const grupos = modelo === "grade" ? [lote] : pecas.map((p) => [p]);
    const out: Blob[] = [];
    for (const g of grupos) out.push(await paraJpg(await gerarArte(opcoes(g))));
    return out;
  };
  const baixar = async () => {
    setIndo("baixar");
    try {
      const bs = await artes();
      bs.forEach((b, i) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download =
          `agroparts-${formato}-${idioma}-${modelo === "grade" ? "vitrine" : pecas[i].codigo}.jpg`.replace(
            /[^\w.-]/g,
            "_",
          );
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIndo(null);
    }
  };
  const paraPost = async () => {
    setIndo("post");
    try {
      const bs = await artes();
      const midias: Midia[] = [];
      for (const [i, b] of bs.entries())
        midias.push(await enviarBlob(b, `estudio-${Date.now()}-${i}.jpg`));
      const tipo = formato === "story" ? "STORY" : midias.length > 1 ? "CARROSSEL" : "FEED";
      usarNoPost(formato === "story" ? midias.slice(0, 1) : midias, legenda, tipo);
      toast.success(
        formato === "story" && midias.length > 1
          ? "Story montado com a primeira arte (o Instagram aceita 1 por story)"
          : "Arte enviada para o compositor: revise e publique ou agende",
      );
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIndo(null);
    }
  };

  return (
    <Card className="overflow-hidden p-0">
      <div className="border-b bg-gradient-to-r from-yellow-400 via-amber-400 to-orange-500 px-4 py-3">
        <p className="flex items-center gap-2 font-black text-zinc-900">
          <Sparkles className="h-4 w-4" /> Criador de artes
        </p>
        <p className="text-xs text-zinc-800">
          Escolha as peças à esquerda. A arte sai em 1080 px, com a foto recortada e a logo.
        </p>
      </div>
      <div className="grid gap-4 p-4 md:grid-cols-[1fr_minmax(0,260px)]">
        <div className="space-y-3">
          <div className="relative flex min-h-[320px] items-center justify-center rounded-xl bg-[repeating-conic-gradient(#f4f4f5_0_25%,#fff_0_50%)] bg-[length:20px_20px]">
            {previa ? (
              <img
                src={previa}
                alt="Prévia da arte"
                className={cn(
                  "rounded-lg shadow-xl",
                  formato === "story" ? "max-h-[560px]" : "max-h-[480px]",
                )}
              />
            ) : (
              <p className="px-6 text-center text-sm text-muted-foreground">
                Escolha uma peça recomendada ou busque uma para ver a arte aqui.
              </p>
            )}
            {gerando && (
              <span className="absolute right-3 top-3 rounded-full bg-black/70 px-2 py-1 text-xs text-white">
                <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> gerando
              </span>
            )}
          </div>
          {modelo !== "grade" && pecas.length > 1 && (
            <p className="text-xs text-muted-foreground">
              Prévia da 1ª peça. Serão geradas {pecas.length} artes (vira carrossel no post).
            </p>
          )}
          {/* Peças escolhidas e foto de cada uma */}
          <div className="space-y-2">
            {pecas.map((p) => (
              <div key={p.sku} className="rounded-lg border p-2">
                <div className="flex items-center gap-2">
                  <p className="line-clamp-1 flex-1 text-xs font-bold">{p.nome}</p>
                  <button onClick={() => remover(p.sku)} title="Tirar da arte">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </button>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {p.fotos.map((u) => {
                    const atual = fotoDe[p.sku] !== undefined ? fotoDe[p.sku] : p.fotos[0];
                    return (
                      <button
                        key={u}
                        onClick={() => setFoto(p.sku, u)}
                        className={cn(
                          "rounded-md",
                          atual === u && "ring-2 ring-primary ring-offset-1",
                        )}
                      >
                        <Foto u={u} />
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setFoto(p.sku, null)}
                    className={cn(
                      "h-11 rounded-md border px-2 text-[10px] font-bold",
                      (fotoDe[p.sku] === null || !p.fotos.length) &&
                        "ring-2 ring-primary ring-offset-1",
                    )}
                  >
                    SÓ O<br />
                    CÓDIGO
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <Campo r="Modelo">
            <div className="grid grid-cols-2 gap-1.5">
              {MODELOS.map((m) => (
                <button
                  key={m.k}
                  onClick={() => setModelo(m.k)}
                  className={cn(
                    "rounded-lg border p-1.5 text-left text-[11px] font-semibold",
                    modelo === m.k && "ring-2 ring-primary",
                  )}
                >
                  <span className={cn("mb-1 block h-5 rounded", m.fundo)} />
                  {m.rotulo}
                </button>
              ))}
            </div>
          </Campo>
          {modelo === "amarelo" && (
            <Campo r="Variação">
              <Opcoes
                v={variante}
                set={setVariante}
                ops={[
                  ["auto", "Automática"],
                  ["desconto", "% desconto"],
                  ["preco", "Preço"],
                  ["whatsapp", "WhatsApp"],
                  ["codigo", "Código"],
                ]}
              />
            </Campo>
          )}
          <Campo r="Formato">
            <Opcoes v={formato} set={setFormato} ops={FORMATOS.map((f) => [f.k, f.rotulo])} />
          </Campo>
          <Campo r="Idioma">
            <Opcoes
              v={idioma}
              set={setIdioma}
              ops={[
                ["es", "Espanhol (UY)"],
                ["pt", "Português (RS)"],
              ]}
            />
          </Campo>
          <Campo r="Mostrar na arte">
            <Opcoes
              v={mostrar}
              set={setMostrar}
              ops={[
                ["desconto", "% de desconto"],
                ["preco", "Preço"],
                ["nada", "Nenhum"],
              ]}
            />
          </Campo>
          {mostrar === "desconto" && (
            <Campo r="Desconto da campanha (%) se a peça não tiver">
              <Input
                type="number"
                min={1}
                max={90}
                value={desconto}
                onChange={(e) => setDesconto(e.target.value === "" ? "" : Number(e.target.value))}
              />
            </Campo>
          )}
          <Campo r="Selo">
            <Input value={selo} onChange={(e) => setSelo(e.target.value.slice(0, 30))} />
          </Campo>
          {modelo !== "amarelo" && (
            <Campo r="Frase principal">
              <Input
                value={chamada}
                placeholder={
                  idioma === "pt" ? "Peças para o seu trator" : "Repuestos para tu tractor"
                }
                onChange={(e) => setChamada(e.target.value.slice(0, 60))}
              />
            </Campo>
          )}
        </div>
      </div>

      {!!pecas.length && (
        <div className="space-y-3 border-t p-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-bold">Legenda</p>
            {(idioma === "pt" ? pecas[0].legendas.pt : pecas[0].legendas.es).map((l, i) => (
              <button
                key={i}
                onClick={() => setLegenda(l)}
                className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold hover:bg-muted/70"
              >
                Variação {i + 1}
              </button>
            ))}
          </div>
          <Textarea rows={6} value={legenda} onChange={(e) => setLegenda(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <Button onClick={paraPost} disabled={!!indo}>
              {indo === "post" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-4 w-4" />
              )}
              Usar no post
            </Button>
            <Button
              variant="secondary"
              onClick={() => setAnuncio(true)}
              disabled={!!indo || formato === "story"}
              title={formato === "story" ? "Para anúncio use Feed 4:5 ou Quadrado" : undefined}
            >
              <Megaphone className="mr-1.5 h-4 w-4" /> Criar anúncio com esta arte
            </Button>
            <Button variant="outline" onClick={baixar} disabled={!!indo}>
              {indo === "baixar" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-1.5 h-4 w-4" />
              )}
              Baixar JPG
            </Button>
          </div>
        </div>
      )}
      {anuncio && pecas[0] && (
        <DialogoAnuncio
          peca={pecas[0]}
          arte={() => gerarArte(opcoes(modelo === "grade" ? lote : [pecas[0]])).then(paraJpg)}
          texto={legenda}
          idioma={idioma}
          orcamento={orcamento}
          fechar={() => setAnuncio(false)}
        />
      )}
    </Card>
  );
}

function Campo({ r, children }: { r: string; children: React.ReactNode }) {
  return (
    <div className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {r}
      </span>
      {children}
    </div>
  );
}
function Opcoes<T extends string>({
  v,
  set,
  ops,
}: {
  v: T;
  set: (v: T) => void;
  ops: Array<[T, string]>;
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {ops.map(([k, r]) => (
        <button
          key={k}
          type="button"
          onClick={() => set(k)}
          className={cn(
            "rounded-md px-2 py-1 text-xs font-semibold",
            v === k ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70",
          )}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- anúncio
function DialogoAnuncio({
  peca,
  arte,
  texto,
  idioma,
  orcamento,
  fechar,
}: {
  peca: Peca;
  arte: () => Promise<Blob>;
  texto: string;
  idioma: "es" | "pt";
  orcamento: number | null;
  fechar: () => void;
}) {
  const sinais = peca.sinais;
  const objetivoSugerido = sinais && sinais.whatsapp >= 2 ? "WHATSAPP" : "TRAFEGO";
  const [f, setF] = useState({
    nome: `Estúdio · ${peca.codigo} · ${new Date().toLocaleDateString("pt-BR")}`,
    objetivo: objetivoSugerido as "TRAFEGO" | "WHATSAPP",
    orcamentoDiario: orcamento ?? 10,
    dias: 5,
    idadeMin: 25,
    idadeMax: 65,
    texto: texto.replace(/\n*#[\s\S]*$/, ""),
    titulo: (idioma === "pt" ? peca.nomePt || peca.nome : peca.nome).slice(0, 40),
    link: `https://agropartsuy.com/produto/${encodeURIComponent(peca.sku)}`,
    botao: "SHOP_NOW",
    ativar: false,
  });
  const [indo, setIndo] = useState(false);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const criar = async () => {
    setIndo(true);
    try {
      const img = await base64(await arte());
      const inicio = new Date();
      const fim = new Date(Date.now() + f.dias * 86_400_000);
      await criarAnuncioMetaFn({
        data: {
          nome: f.nome,
          objetivo: f.objetivo,
          orcamentoDiario: Number(f.orcamentoDiario),
          inicio: inicio.toISOString(),
          fim: fim.toISOString(),
          idadeMin: f.idadeMin,
          idadeMax: f.idadeMax,
          genero: "TODOS",
          imagemBase64: img,
          texto: f.texto,
          titulo: f.titulo,
          descricao: peca.codigo,
          link: f.link,
          botao: f.objetivo === "WHATSAPP" ? "WHATSAPP_MESSAGE" : f.botao,
          ativar: f.ativar,
        },
      });
      toast.success(
        f.ativar
          ? "Anúncio criado e ativo"
          : "Anúncio criado PAUSADO: revise e ative na Central de Anúncios",
      );
      fechar();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setIndo(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" /> Anúncio no Facebook e Instagram
          </DialogTitle>
        </DialogHeader>
        <p className="rounded-lg bg-sky-50 p-2.5 text-xs text-sky-900">
          Público: <b>Uruguai</b> (os anúncios pagos são só para o Uruguai). O anúncio é criado{" "}
          <b>pausado</b>, a menos que você marque para ativar.
        </p>
        <div className="space-y-3 text-sm">
          <Campo r="Nome (interno)">
            <Input value={f.nome} onChange={(e) => set({ nome: e.target.value })} />
          </Campo>
          <Campo r="Objetivo">
            <Opcoes
              v={f.objetivo}
              set={(v) => set({ objetivo: v })}
              ops={[
                ["TRAFEGO", "Visitas na página da peça"],
                ["WHATSAPP", "Conversas no WhatsApp"],
              ]}
            />
            {objetivoSugerido === "WHATSAPP" && (
              <span className="mt-1 block text-[11px] text-emerald-700">
                Sugerido WhatsApp: {sinais?.whatsapp} pedidos dessa peça por lá.
              </span>
            )}
          </Campo>
          <div className="grid grid-cols-2 gap-3">
            <Campo r="Orçamento por dia">
              <Input
                type="number"
                min={1}
                value={f.orcamentoDiario}
                onChange={(e) => set({ orcamentoDiario: Number(e.target.value) })}
              />
            </Campo>
            <Campo r="Duração (dias)">
              <Input
                type="number"
                min={1}
                max={60}
                value={f.dias}
                onChange={(e) => set({ dias: Math.max(1, Number(e.target.value)) })}
              />
            </Campo>
            <Campo r="Idade mínima">
              <Input
                type="number"
                min={18}
                max={65}
                value={f.idadeMin}
                onChange={(e) => set({ idadeMin: Number(e.target.value) })}
              />
            </Campo>
            <Campo r="Idade máxima">
              <Input
                type="number"
                min={18}
                max={65}
                value={f.idadeMax}
                onChange={(e) => set({ idadeMax: Number(e.target.value) })}
              />
            </Campo>
          </div>
          <p className="text-xs text-muted-foreground">
            Total previsto: <b>{(f.orcamentoDiario * f.dias).toLocaleString("es-UY")}</b> (na moeda
            da conta de anúncios).
          </p>
          <Campo r="Texto">
            <Textarea rows={5} value={f.texto} onChange={(e) => set({ texto: e.target.value })} />
          </Campo>
          <Campo r="Título">
            <Input value={f.titulo} onChange={(e) => set({ titulo: e.target.value })} />
          </Campo>
          {f.objetivo === "TRAFEGO" && (
            <Campo r="Link">
              <Input value={f.link} onChange={(e) => set({ link: e.target.value })} />
            </Campo>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={f.ativar}
              onChange={(e) => set({ ativar: e.target.checked })}
            />
            Ativar já (sem revisão)
          </label>
          <Button className="w-full" onClick={criar} disabled={indo}>
            {indo ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Megaphone className="mr-1.5 h-4 w-4" />
            )}
            Criar anúncio {f.ativar ? "ativo" : "pausado"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
