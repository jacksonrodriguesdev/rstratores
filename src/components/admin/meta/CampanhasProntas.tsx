// Meta Ads → Criar: as campanhas Meta do Criador de anúncios, prontas para usar. Um clique
// preenche o formulário (nome, objetivo, texto, título, descrição, link com UTM, botão,
// orçamento sugerido) e monta a imagem com a foto própria da peça (arte do Estúdio).
// Dá para trocar o texto, o título, a peça e o modelo da arte antes de criar.
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Check, Loader2, Lock, Sparkles, Wand2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { campanhasProntasMetaFn } from "@/lib/meta-ads";
import { cn } from "@/lib/utils";
import { nomeLimpo } from "@/lib/estudio-textos";
import { ajustarFormato, gerarArte, type Modelo } from "@/components/admin/estudio/artes";

type Pronta = Awaited<ReturnType<typeof campanhasProntasMetaFn>>["campanhas"][number];
export type Preenchimento = {
  nome: string;
  objetivo: "TRAFEGO" | "WHATSAPP";
  texto: string;
  titulo: string;
  descricao: string;
  link: string;
  botao: string;
  orcamentoDiario?: string;
};
type Arte = Modelo | "foto";
const MODELOS: Array<[Arte, string]> = [
  ["escuro", "Preto e ouro"],
  ["amarelo", "Pré-Black amarelo"],
  ["verde", "Verde campo"],
  ["foto", "Só a foto"],
];
const miniatura = (u: string) => `/api/admin/estudio/foto?u=${encodeURIComponent(u)}`;
const fmtUYU = (n: number) => `$U ${Math.round(n).toLocaleString("es-UY")}`;
const COR_PRIORIDADE: Record<string, string> = {
  Alta: "bg-emerald-100 text-emerald-800",
  Média: "bg-sky-100 text-sky-800",
  Opcional: "bg-zinc-100 text-zinc-700",
};

async function montarImagem(
  c: Pronta,
  idx: number,
  fotoIdx: number,
  arte: Arte,
  mostrar: "desconto" | "preco" | "nada",
) {
  const p = c.produtos[idx];
  if (!p) return null;
  const foto = p.fotos[fotoIdx] ?? p.fotos[0];
  let canvas: HTMLCanvasElement;
  if (arte === "foto") {
    const r = await fetch(miniatura(foto));
    if (!r.ok) throw new Error("Não foi possível carregar a foto da peça");
    canvas = await ajustarFormato(await r.blob(), "quadrado", "branco");
  } else {
    canvas = await gerarArte({
      modelo: arte,
      formato: "feed",
      idioma: "es",
      mostrar: mostrar === "preco" && !p.uyu ? "desconto" : mostrar,
      // Pré-Black amarelo: campanha de WhatsApp sai com a caixa verde do WhatsApp
      variante: c.objetivo === "WHATSAPP" && mostrar !== "preco" ? "whatsapp" : undefined,
      desconto: p.desconto || 20,
      selo: "PRE BLACK FRIDAY",
      chamada: "Repuestos para tu tractor",
      produtos: [
        {
          nome: nomeLimpo({ nome: p.nome, codigo: p.codigo, sku: p.sku, marca: p.marca }),
          codigo: p.codigo,
          marca: p.marca,
          foto,
          preco: p.uyu ? { uyu: fmtUYU(p.uyu), brl: null, desconto: p.desconto } : null,
        },
      ],
    });
  }
  const url = canvas.toDataURL("image/jpeg", 0.9);
  return { url, b64: url.split(",")[1] };
}

export function CampanhasProntas({
  aplicar,
  aplicarImagem,
}: {
  aplicar: (p: Preenchimento) => void;
  aplicarImagem: (img: { b64: string; url: string } | null) => void;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["meta-prontas"],
    queryFn: () => campanhasProntasMetaFn({ data: { dias: 90 } }),
    staleTime: 10 * 60_000,
  });
  const [sel, setSel] = useState<string | null>(null);
  const [texto, setTexto] = useState(0);
  const [titulo, setTitulo] = useState(0);
  const [peca, setPeca] = useState(0);
  const [foto, setFoto] = useState(0);
  const [arte, setArte] = useState<Arte>("escuro");
  const [mostrar, setMostrar] = useState<"desconto" | "preco" | "nada">("desconto");
  const [gerando, setGerando] = useState(false);
  const vez = useRef(0);
  const c = data?.campanhas.find((x) => x.id === sel) ?? null;

  // Texto, título, link etc. → formulário
  useEffect(() => {
    if (!c) return;
    aplicar({
      nome: `${c.nome} · ${new Date().toLocaleDateString("pt-BR")}`.slice(0, 200),
      objetivo: c.objetivo,
      texto: c.textos[texto] ?? c.textos[0] ?? "",
      titulo: c.titulos[titulo] ?? c.titulos[0] ?? "",
      descricao: c.descricoes[0] ?? "",
      link: c.link,
      botao: c.botao,
      ...(data?.orcamento ? { orcamentoDiario: String(data.orcamento) } : {}),
    });
  }, [c?.id, texto, titulo]);

  // Imagem com a peça escolhida
  useEffect(() => {
    if (!c) return;
    const minha = ++vez.current;
    setGerando(true);
    montarImagem(c, peca, foto, arte, mostrar)
      .then((img) => minha === vez.current && aplicarImagem(img))
      .catch((e) => minha === vez.current && toast.error(e.message))
      .finally(() => minha === vez.current && setGerando(false));
  }, [c?.id, peca, foto, arte, mostrar]);

  const escolher = (id: string) => {
    setSel(id);
    setTexto(0);
    setTitulo(0);
    setPeca(0);
    setFoto(0);
  };

  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        <p className="font-bold">Campanhas prontas do Criador de anúncios</p>
        <span className="text-xs text-muted-foreground">
          clique numa campanha: o formulário e a imagem se preenchem sozinhos — confira e crie
        </span>
      </div>
      {isLoading && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Analisando os últimos 90 dias…
        </p>
      )}
      {error && <p className="text-sm text-red-600">{String((error as any).message)}</p>}
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {data?.campanhas.map((x) => (
          <button
            key={x.id}
            type="button"
            disabled={!!x.bloqueada}
            onClick={() => escolher(x.id)}
            className={cn(
              "rounded-xl border p-3 text-left transition",
              x.bloqueada
                ? "cursor-not-allowed opacity-60"
                : "hover:border-primary hover:shadow-sm",
              sel === x.id && "border-primary bg-primary/5 ring-2 ring-primary",
            )}
          >
            <div className="flex items-start gap-2">
              <p className="flex-1 text-sm font-bold leading-tight">{x.nome}</p>
              {x.bloqueada ? (
                <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
              ) : sel === x.id ? (
                <Check className="h-4 w-4 shrink-0 text-primary" />
              ) : null}
            </div>
            <div className="mt-1 flex flex-wrap gap-1 text-[10px] font-semibold">
              <span className={cn("rounded px-1.5 py-0.5", COR_PRIORIDADE[x.prioridade])}>
                {x.prioridade}
              </span>
              <span className="rounded bg-muted px-1.5 py-0.5">
                {x.objetivo === "WHATSAPP" ? "WhatsApp" : "Visitas ao site"}
              </span>
              {!!x.produtos.length && (
                <span className="rounded bg-muted px-1.5 py-0.5">
                  {x.produtos.length} peças com foto
                </span>
              )}
            </div>
            <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
              {x.bloqueada ?? x.porque}
            </p>
          </button>
        ))}
      </div>

      {c && (
        <div className="space-y-3 rounded-xl border bg-muted/20 p-3">
          {c.avisos.map((a) => (
            <p key={a} className="flex items-start gap-2 text-xs text-amber-800">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {a}
            </p>
          ))}
          {c.textos.length > 1 && (
            <Linha r="Texto">
              {c.textos.map((t, i) => (
                <Chip key={i} on={texto === i} set={() => setTexto(i)} titulo={t}>
                  Opção {i + 1}
                </Chip>
              ))}
            </Linha>
          )}
          {c.titulos.length > 1 && (
            <Linha r="Título">
              {c.titulos.map((t, i) => (
                <Chip key={i} on={titulo === i} set={() => setTitulo(i)}>
                  {t}
                </Chip>
              ))}
            </Linha>
          )}
          {!!c.produtos.length && (
            <Linha r="Peça da imagem">
              {c.produtos.map((p, i) => (
                <button
                  key={p.sku}
                  type="button"
                  title={p.nome}
                  onClick={() => {
                    setPeca(i);
                    setFoto(0);
                  }}
                  className={cn(
                    "rounded-lg border bg-white p-0.5",
                    peca === i && "ring-2 ring-primary",
                  )}
                >
                  <img
                    src={miniatura(p.fotos[0])}
                    alt={p.nome}
                    className="h-14 w-14 object-contain"
                    loading="lazy"
                  />
                </button>
              ))}
            </Linha>
          )}
          {(c.produtos[peca]?.fotos.length ?? 0) > 1 && (
            <Linha r="Foto">
              {c.produtos[peca].fotos.map((u, i) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setFoto(i)}
                  className={cn("rounded border bg-white", foto === i && "ring-2 ring-primary")}
                >
                  <img
                    src={miniatura(u)}
                    alt=""
                    className="h-10 w-10 object-contain"
                    loading="lazy"
                  />
                </button>
              ))}
            </Linha>
          )}
          <Linha r="Arte">
            {MODELOS.map(([k, r]) => (
              <Chip key={k} on={arte === k} set={() => setArte(k)}>
                {r}
              </Chip>
            ))}
          </Linha>
          {arte !== "foto" && (
            <Linha r="Na arte">
              {(
                [
                  ["desconto", "% de desconto"],
                  ["preco", "Preço"],
                  ["nada", "Só a peça"],
                ] as const
              ).map(([k, r]) => (
                <Chip key={k} on={mostrar === k} set={() => setMostrar(k)}>
                  {r}
                </Chip>
              ))}
            </Linha>
          )}
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            {gerando ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Wand2 className="h-3.5 w-3.5" />
            )}
            {gerando
              ? "Montando a imagem…"
              : "Formulário e imagem preenchidos abaixo. Público: Uruguai."}
            {data?.orcamento
              ? ` Orçamento sugerido: ${data.orcamento}/dia (${data.base}).`
              : " Só falta o orçamento diário: ainda não há histórico de cliques para sugerir um valor."}
          </p>
        </div>
      )}
    </Card>
  );
}

function Linha({ r, children }: { r: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-24 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {r}
      </span>
      {children}
    </div>
  );
}
function Chip({
  on,
  set,
  children,
  titulo,
}: {
  on: boolean;
  set: () => void;
  children: React.ReactNode;
  titulo?: string;
}) {
  return (
    <button
      type="button"
      title={titulo}
      onClick={set}
      className={cn(
        "rounded-md px-2 py-1 text-xs font-semibold",
        on ? "bg-primary text-primary-foreground" : "bg-background hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
