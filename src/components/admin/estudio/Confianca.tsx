// Carrosséis de confiança: «Armadilhas» (golpes na compra de peças) e «Lupa no site» (o nosso
// site no celular, com peças Massey Ferguson, formas de pagamento, envio e WhatsApp).
// Textos prontos em ES/PT e editáveis; slides gerados juntos para o carrossel ou para baixar.
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, ImagePlus, Loader2, Search, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { bancoPostsFn } from "@/lib/estudio";
import { paraJpg, type ProdutoArte } from "./artes";
import {
  gerarConfianca,
  TEXTOS,
  type Carrossel,
  type Idioma,
  type SlideTexto,
} from "./artes-confianca";
import { baixarBlob, Campo, enviarBlob, miniatura, Opcoes, useEstudio } from "./comum";

type Peca = ProdutoArte & { sku: string };

const NOMES: Record<Carrossel, string> = {
  armadilhas: "Armadilhas (5 slides)",
  lupa: "Lupa no site (7 slides)",
};

const LEGENDA: Record<Carrossel, Record<Idioma, string>> = {
  armadilhas: {
    pt: "Peça barata demais, pressa para pagar, «serve em qualquer Massey»… Conhece essas armadilhas? 🪤\n\nNa AGRO PARTS você compra pelo código original, paga com cartão, PIX ou link seguro e recebe com nota fiscal em RS, SC e PR.\n\n📲 Peça pelo WhatsApp (link na bio)\n\n#AgroParts #MasseyFerguson #PecasAgricolas #PecasParaTrator #Agro #CompraSegura",
    es: "Precio regalado, apuro para pagar, «sirve para cualquier Massey»… ¿Conocés estas trampas? 🪤\n\nEn AGRO PARTS comprás por código original, pagás con tarjeta, Abitab, Redpagos o link seguro.\n\n📲 Cotizá por WhatsApp (link en la bio)\n\n#AgroParts #MasseyFerguson #RepuestosAgricolas #RepuestosParaTractor #AgroUruguay #CompraSegura",
  },
  lupa: {
    pt: "Passamos a lupa no nosso site 🔍\n\nPeças para Massey Ferguson com código original, foto e preço, pagamento com cartão, PIX ou link seguro e envio para RS, SC e PR com nota fiscal.\n\n🌐 agropartsuy.com/pt\n📲 Peça pelo WhatsApp (link na bio)\n\n#AgroParts #MasseyFerguson #PecasAgricolas #PecasParaTrator #Agro",
    es: "Le pasamos la lupa a nuestro sitio 🔍\n\nRepuestos para Massey Ferguson con código original, foto y precio, y pago con tarjeta, Abitab, Redpagos o link seguro.\n\n🌐 agropartsuy.com\n📲 Cotizá por WhatsApp (link en la bio)\n\n#AgroParts #MasseyFerguson #RepuestosAgricolas #RepuestosParaTractor #AgroUruguay",
  },
};

// Um slide em texto: «título | texto | aviso | itens;separados;por;ponto e vírgula»
const paraLinhas = (s: SlideTexto[]) =>
  s.map((x) => [x.titulo ?? "", x.texto ?? "", x.aviso ?? "", (x.itens ?? []).join("; ")]);

export function Confianca() {
  const { usarNoPost } = useEstudio();
  const [carrossel, setCarrossel] = useState<Carrossel>("lupa");
  const [idioma, setIdioma] = useState<Idioma>("es");
  const [slides, setSlides] = useState<SlideTexto[]>(TEXTOS.lupa.es);
  const [escolhidas, setEscolhidas] = useState<Peca[]>([]);
  const [q, setQ] = useState("massey");
  const [busca, setBusca] = useState("massey");
  const [print, setPrint] = useState<{ blob: Blob; url: string } | null>(null);
  const [prev, setPrev] = useState<string[]>([]);
  const [indo, setIndo] = useState<"prev" | "post" | "zip" | null>(null);
  const arq = useRef<HTMLInputElement>(null);

  const trocar = (c: Carrossel, i: Idioma) => {
    setCarrossel(c);
    setIdioma(i);
    setSlides(TEXTOS[c][i]);
    setPrev([]);
  };

  const { data: pecas, isFetching } = useQuery({
    queryKey: ["confianca-pecas", busca],
    queryFn: () => bancoPostsFn({ data: { pagina: 0, q: busca || undefined, ordem: "estoque" } }),
  });
  // As duas primeiras peças com foto entram sozinhas
  useEffect(() => {
    if (!escolhidas.length && pecas?.itens?.length)
      setEscolhidas(pecas.itens.slice(0, 2) as unknown as Peca[]);
  }, [pecas]); // eslint-disable-line react-hooks/exhaustive-deps

  const produtos: ProdutoArte[] = escolhidas.map((p) => ({
    nome: p.nome,
    codigo: p.codigo,
    marca: p.marca,
    foto: p.foto,
    preco: p.preco,
  }));
  const gerar = () =>
    gerarConfianca({ carrossel, idioma, produtos, slides, print: print?.blob ?? null });

  // Prévia refeita quando algo muda (com uma pequena espera para não gerar a cada tecla)
  useEffect(() => {
    if (carrossel === "lupa" && !produtos.length) return;
    let vale = true;
    const t = setTimeout(async () => {
      setIndo("prev");
      try {
        const cs = await gerar();
        if (vale) setPrev(cs.map((c) => c.toDataURL("image/jpeg", 0.6)));
      } catch (e: any) {
        if (vale) toast.error(e.message);
      } finally {
        if (vale) setIndo(null);
      }
    }, 500);
    return () => {
      vale = false;
      clearTimeout(t);
    };
  }, [carrossel, idioma, JSON.stringify(slides), escolhidas.map((p) => p.sku).join(), print?.url]); // eslint-disable-line react-hooks/exhaustive-deps

  const alternarPeca = (p: Peca) => {
    const tem = escolhidas.some((x) => x.sku === p.sku);
    if (tem) setEscolhidas(escolhidas.filter((x) => x.sku !== p.sku));
    else setEscolhidas([...escolhidas, p].slice(-2));
  };
  const linhas = paraLinhas(slides);
  const editar = (i: number, k: 0 | 1 | 2 | 3, v: string) => {
    const n = slides.map((s) => ({ ...s }));
    const s = n[i];
    if (k === 0) s.titulo = v;
    if (k === 1) s.texto = v;
    if (k === 2) s.aviso = v;
    if (k === 3) s.itens = v.split(";").map((x) => x.trim());
    setSlides(n);
  };
  const temCampo = (s: SlideTexto, k: 0 | 1 | 2 | 3) =>
    k === 0
      ? s.titulo != null
      : k === 1
        ? s.texto != null
        : k === 2
          ? s.aviso != null
          : s.itens != null;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <Campo r="Carrossel">
          <Opcoes
            v={carrossel}
            set={(c) => trocar(c, idioma)}
            ops={[
              ["lupa", NOMES.lupa],
              ["armadilhas", NOMES.armadilhas],
            ]}
          />
        </Campo>
        <Campo r="Idioma">
          <Opcoes
            v={idioma}
            set={(i) => trocar(carrossel, i)}
            ops={[
              ["es", "Español (UY)"],
              ["pt", "Português (BR)"],
            ]}
          />
        </Campo>
        {carrossel === "lupa" && (
          <Campo r="Print do site no celular (opcional)">
            <input
              ref={arq}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) setPrint({ blob: f, url: URL.createObjectURL(f) });
                e.target.value = "";
              }}
            />
            <div className="flex items-center gap-2">
              {print && (
                <img src={print.url} alt="" className="h-12 w-8 rounded object-cover object-top" />
              )}
              <Button size="sm" variant="outline" onClick={() => arq.current?.click()}>
                <ImagePlus className="mr-1.5 h-4 w-4" /> {print ? "Trocar print" : "Enviar print"}
              </Button>
              {print && (
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Tirar print"
                  onClick={() => setPrint(null)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Campo>
        )}
      </div>

      {carrossel === "lupa" && (
        <Campo r="Peças Massey Ferguson no site do celular (escolha até 2, só peças com foto)">
          <form
            className="flex max-w-md gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setBusca(q.trim());
            }}
          >
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="massey bomba, código…"
            />
            <Button type="submit" size="icon" variant="secondary" aria-label="Buscar">
              <Search className="h-4 w-4" />
            </Button>
          </form>
          <div className="mt-2 grid grid-cols-6 gap-1.5 sm:grid-cols-10">
            {isFetching && <p className="col-span-full text-xs text-muted-foreground">Buscando…</p>}
            {(pecas?.itens ?? []).slice(0, 20).map((x: any) => (
              <button
                key={x.sku}
                type="button"
                title={`${x.nome} · ${x.codigo}`}
                onClick={() => alternarPeca(x)}
                className={cn(
                  "overflow-hidden rounded-lg border bg-white p-1",
                  escolhidas.some((p) => p.sku === x.sku) && "ring-2 ring-primary",
                )}
              >
                <img
                  src={miniatura(x.foto)}
                  alt=""
                  className="aspect-square w-full object-contain"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </Campo>
      )}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Button
              disabled={!!indo || !prev.length}
              onClick={async () => {
                setIndo("post");
                try {
                  const cs = await gerar();
                  const midias = [];
                  for (const [k, c] of cs.entries())
                    midias.push(await enviarBlob(await paraJpg(c), `${carrossel}-${k + 1}.jpg`));
                  usarNoPost(midias, LEGENDA[carrossel][idioma], "CARROSSEL");
                  toast.success("Carrossel enviado ao compositor: revise e publique ou agende");
                } catch (e: any) {
                  toast.error(e.message);
                } finally {
                  setIndo(null);
                }
              }}
            >
              {indo === "post" ? (
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-1.5 h-4 w-4" />
              )}
              Usar no post (carrossel)
            </Button>
            <Button
              variant="outline"
              disabled={!!indo || !prev.length}
              onClick={async () => {
                setIndo("zip");
                try {
                  const cs = await gerar();
                  for (const [k, c] of cs.entries())
                    baixarBlob(await paraJpg(c), `${carrossel}-${idioma}-${k + 1}.jpg`);
                } finally {
                  setIndo(null);
                }
              }}
            >
              <Download className="mr-1.5 h-4 w-4" /> Baixar os slides
            </Button>
            {indo === "prev" && (
              <span className="text-xs text-muted-foreground">
                <Loader2 className="mr-1 inline h-3 w-3 animate-spin" /> gerando…
              </span>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {prev.map((s, i) => (
              <figure key={i} className="overflow-hidden rounded-lg border bg-muted">
                <img src={s} alt={`Slide ${i + 1}`} className="w-full" />
                <figcaption className="px-2 py-1 text-[11px] text-muted-foreground">
                  Slide {i + 1}
                </figcaption>
              </figure>
            ))}
            {!prev.length && (
              <p className="col-span-full rounded-lg bg-muted p-6 text-center text-sm text-muted-foreground">
                {carrossel === "lupa" && !produtos.length
                  ? "Escolha uma peça com foto."
                  : "Gerando os slides…"}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Textos de cada slide. <code>*trecho*</code> fica numa caixa verde escura (como o «Tô
            fora.»). Na lista, separe os itens com ponto e vírgula.
          </p>
          {linhas.map((l, i) => (
            <div key={i} className="rounded-lg border p-2">
              <p className="mb-1 text-[11px] font-bold uppercase text-muted-foreground">
                Slide {i + 1}
              </p>
              {(["Título", "Texto", "Mensagem (golpe)", "Lista"] as const).map((rot, k) =>
                temCampo(slides[i], k as 0 | 1 | 2 | 3) ? (
                  <Textarea
                    key={rot}
                    rows={1}
                    value={l[k]}
                    placeholder={rot}
                    title={rot}
                    onChange={(e) => editar(i, k as 0 | 1 | 2 | 3, e.target.value)}
                    className="mb-1 min-h-0 text-xs"
                  />
                ) : null,
              )}
            </div>
          ))}
          <Textarea readOnly rows={6} value={LEGENDA[carrossel][idioma]} className="text-xs" />
        </div>
      </div>
    </div>
  );
}
