// Artes de texto (capa, slide final, contagem, cupom, código, dica, enquete, marca) e carrossel
// completo por marca/categoria (capa + peças + slide final, tudo de uma vez).
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Send, Download } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { bancoPostsFn, cuponsArteFn, filtrosBancoFn } from "@/lib/estudio";
import { DICAS, hashtags, type Idioma } from "@/lib/estudio-textos";
import { gerarArte, gerarTexto, paraJpg, type Formato, type Tema } from "./artes";
import { baixarBlob, Campo, enviarBlob, Opcoes, PreviaArte, useEstudio } from "./comum";

export type Preset =
  "capa" | "cta" | "contagem" | "cupom" | "codigo" | "dica" | "pergunta" | "marca";
const PADRAO: Record<
  Preset,
  (i: Idioma) => {
    selo?: string;
    destaque?: string;
    titulo: string;
    texto?: string;
    formato: Formato;
  }
> = {
  capa: (i) => ({
    selo: "PRE BLACK FRIDAY",
    titulo: i === "pt" ? "Ofertas da semana" : "Ofertas de la semana",
    texto: i === "pt" ? "Arraste para o lado 👉" : "Deslizá 👉",
    formato: "feed",
  }),
  cta: (i) => ({
    selo: i === "pt" ? "PEÇA JÁ" : "PEDILA YA",
    titulo: i === "pt" ? "Peça pelo WhatsApp" : "Cotizá por WhatsApp",
    texto:
      i === "pt"
        ? "Mande o código da peça e respondemos rápido. Envio para todo o RS."
        : "Mandanos el código de la pieza y te respondemos rápido.",
    formato: "feed",
  }),
  contagem: (i) => ({
    selo: "BLACK FRIDAY 27/11",
    destaque: "",
    titulo: i === "pt" ? "Dias para a Black Friday" : "Días para la Black Friday",
    texto:
      i === "pt" ? "Ative o lembrete e não perca" : "Activá el recordatorio y no te la pierdas",
    formato: "story",
  }),
  cupom: (i) => ({
    selo: i === "pt" ? "CUPOM" : "CUPÓN",
    destaque: "",
    titulo: "",
    texto: "",
    formato: "story",
  }),
  codigo: (i) => ({
    selo: i === "pt" ? "PROCURA ESTE CÓDIGO?" : "¿BUSCÁS ESTE CÓDIGO?",
    destaque: "",
    titulo: i === "pt" ? "Temos!" : "¡Lo tenemos!",
    texto: i === "pt" ? "Peça pelo WhatsApp" : "Pedilo por WhatsApp",
    formato: "feed",
  }),
  dica: (i) => ({
    selo: i === "pt" ? "DICA DE MANUTENÇÃO" : "TIP DE MANTENIMIENTO",
    titulo: DICAS[0][i][0],
    texto: DICAS[0][i][1],
    formato: "feed",
  }),
  pergunta: (i) => ({
    selo: i === "pt" ? "ENQUETE" : "ENCUESTA",
    titulo: i === "pt" ? "Qual é o seu trator?" : "¿Cuál es tu tractor?",
    texto: i === "pt" ? "Responda na figurinha 👇" : "Respondé en el sticker 👇",
    formato: "story",
  }),
  marca: (i) => ({
    selo: i === "pt" ? "SEMANA" : "SEMANA",
    destaque: "",
    titulo: i === "pt" ? "Peças para o seu trator" : "Repuestos para tu tractor",
    texto:
      i === "pt"
        ? "Filtros, transmissão, hidráulica e mais"
        : "Filtros, transmisión, hidráulica y más",
    formato: "feed",
  }),
};
const diasAte = (iso: string) =>
  Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000));

export function ArteTexto({ preset }: { preset: Preset }) {
  const [idioma, setIdioma] = useState<Idioma>("es");
  const [tema, setTema] = useState<Tema>(
    preset === "dica" || preset === "pergunta"
      ? "verde"
      : preset === "cta" || preset === "marca"
        ? "escuro"
        : "amarelo",
  );
  const base = PADRAO[preset](idioma);
  const [c, setC] = useState(base);
  const [foto, setFoto] = useState<string | null>(null);
  const [dica, setDica] = useState(0);
  const [cupom, setCupom] = useState("");
  const [dataBf, setDataBf] = useState(`${new Date().getFullYear()}-11-27`);
  const { data: cupons } = useQuery({
    queryKey: ["cupons-arte"],
    queryFn: () => cuponsArteFn(),
    enabled: preset === "cupom",
  });
  const { data: filtros } = useQuery({
    queryKey: ["banco-filtros"],
    queryFn: () => filtrosBancoFn(),
    enabled: preset === "marca",
  });
  const [marca, setMarca] = useState("");
  const trocarIdioma = (i: Idioma) => {
    setIdioma(i);
    setC(PADRAO[preset](i));
  };
  const cp = cupons?.find((x) => x.codigo === cupom);
  const destaque =
    preset === "contagem"
      ? String(diasAte(dataBf))
      : preset === "cupom"
        ? (cp?.codigo ?? c.destaque)
        : preset === "marca"
          ? marca || c.destaque
          : c.destaque;
  const titulo =
    preset === "cupom" && cp
      ? cp.tipo === "PERCENT"
        ? `-${cp.valor}%`
        : cp.tipo === "FRETE"
          ? idioma === "pt"
            ? "Frete por nossa conta"
            : "Envío por nuestra cuenta"
          : `-${cp.moeda === "UYU" ? "$U" : cp.moeda} ${cp.valor}`
      : c.titulo;
  const texto =
    preset === "cupom" && cp
      ? (idioma === "pt" ? cp.descricaoPt || cp.descricao : cp.descricao) || ""
      : c.texto;
  const opcoes = {
    formato: c.formato,
    idioma,
    tema,
    selo: c.selo,
    destaque: destaque || undefined,
    titulo: titulo || " ",
    texto,
    foto,
    espacoInteracao: preset === "pergunta" || (preset === "contagem" && c.formato === "story"),
  };
  // Para "marca": pega uma foto própria da marca escolhida
  const { data: fotoMarca } = useQuery({
    queryKey: ["foto-marca", marca],
    queryFn: () => bancoPostsFn({ data: { pagina: 0, marca } }),
    enabled: preset === "marca" && !!marca,
  });
  const fm = fotoMarca?.itens?.[0]?.foto ?? null;
  useEffect(() => {
    if (preset === "marca" && fm) setFoto(fm);
  }, [fm, preset]);

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <PreviaArte
        gerar={() => gerarTexto(opcoes)}
        chave={JSON.stringify(opcoes)}
        nome={`arte-${preset}-${idioma}`}
        tipo={c.formato === "story" ? "STORY" : "FEED"}
        legenda=""
      />
      <Card className="space-y-3 p-4">
        <div className="grid grid-cols-2 gap-3">
          <Campo r="Idioma">
            <Opcoes
              v={idioma}
              set={trocarIdioma}
              ops={
                [
                  ["es", "Espanhol"],
                  ["pt", "Português"],
                ] as const
              }
            />
          </Campo>
          <Campo r="Tema">
            <Opcoes
              v={tema}
              set={setTema}
              ops={
                [
                  ["amarelo", "Amarelo"],
                  ["escuro", "Preto/ouro"],
                  ["verde", "Verde"],
                ] as const
              }
            />
          </Campo>
          <Campo r="Formato">
            <Opcoes
              v={c.formato}
              set={(v) => setC({ ...c, formato: v })}
              ops={
                [
                  ["feed", "4:5"],
                  ["quadrado", "1:1"],
                  ["story", "Story"],
                ] as const
              }
            />
          </Campo>
        </div>
        {preset === "contagem" && (
          <Campo r="Data da Black Friday">
            <Input type="date" value={dataBf} onChange={(e) => setDataBf(e.target.value)} />
            <p className="mt-1 text-xs text-muted-foreground">
              Faltam {diasAte(dataBf)} dias. Gere um story por dia: o número muda sozinho.
            </p>
          </Campo>
        )}
        {preset === "cupom" && (
          <Campo r="Cupom">
            <select
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={cupom}
              onChange={(e) => setCupom(e.target.value)}
            >
              <option value="">Escolha um cupom…</option>
              {cupons?.map((x) => (
                <option key={x.codigo} value={x.codigo}>
                  {x.codigo} ·{" "}
                  {x.tipo === "PERCENT"
                    ? `${x.valor}%`
                    : x.tipo === "FRETE"
                      ? "frete"
                      : `${x.valor} ${x.moeda}`}
                </option>
              ))}
            </select>
            {cupons && !cupons.length && (
              <p className="mt-1 text-xs text-muted-foreground">
                Nenhum cupom ativo. Crie em Campanhas e cupons.
              </p>
            )}
          </Campo>
        )}
        {preset === "dica" && (
          <Campo r="Dica pronta">
            <select
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={dica}
              onChange={(e) => {
                const n = Number(e.target.value);
                setDica(n);
                setC({ ...c, titulo: DICAS[n][idioma][0], texto: DICAS[n][idioma][1] });
              }}
            >
              {DICAS.map((d, n) => (
                <option key={n} value={n}>
                  {n + 1}. {d[idioma][0]}
                </option>
              ))}
            </select>
          </Campo>
        )}
        {preset === "marca" && (
          <Campo r="Marca">
            <select
              className="h-9 w-full rounded-md border bg-background px-2 text-sm"
              value={marca}
              onChange={(e) => setMarca(e.target.value)}
            >
              <option value="">Escolha…</option>
              {filtros?.marcas
                .filter((m) => m.nome !== "—")
                .map((m) => (
                  <option key={m.nome} value={m.nome}>
                    {m.nome} ({m.n.toLocaleString("pt-BR")} peças)
                  </option>
                ))}
            </select>
          </Campo>
        )}
        {preset === "codigo" && (
          <Campo r="Código grande">
            <Input
              value={c.destaque ?? ""}
              onChange={(e) => setC({ ...c, destaque: e.target.value.slice(0, 20) })}
              placeholder="Ex.: 3641745M1"
            />
          </Campo>
        )}
        <Campo r="Etiqueta">
          <Input
            value={c.selo ?? ""}
            onChange={(e) => setC({ ...c, selo: e.target.value.slice(0, 32) })}
          />
        </Campo>
        {preset !== "cupom" && (
          <Campo r="Título">
            <Input
              value={c.titulo}
              onChange={(e) => setC({ ...c, titulo: e.target.value.slice(0, 70) })}
            />
          </Campo>
        )}
        {preset !== "cupom" && (
          <Campo r="Texto">
            <Textarea
              rows={3}
              value={c.texto ?? ""}
              onChange={(e) => setC({ ...c, texto: e.target.value.slice(0, 220) })}
            />
          </Campo>
        )}
        {preset === "pergunta" && (
          <p className="rounded-lg bg-sky-50 p-2.5 text-xs text-sky-900">
            O espaço tracejado é para a figurinha de enquete/pergunta: a API do Instagram não coloca
            figurinhas, então publique este story pelo app (baixe a arte) e adicione a enquete no
            lugar.
          </p>
        )}
      </Card>
    </div>
  );
}

// ------------------------------------------------ carrossel completo
export function Carrossel() {
  const { usarNoPost } = useEstudio();
  const [idioma, setIdioma] = useState<Idioma>("es");
  const [marca, setMarca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [qtd, setQtd] = useState(6);
  const [modelo, setModelo] = useState<"escuro" | "amarelo" | "verde">("escuro");
  const [mostrar, setMostrar] = useState<"desconto" | "preco" | "nada">("desconto");
  const [indo, setIndo] = useState<string | null>(null);
  const [prev, setPrev] = useState<string[]>([]);
  const { data: filtros } = useQuery({
    queryKey: ["banco-filtros"],
    queryFn: () => filtrosBancoFn(),
  });
  const { data } = useQuery({
    queryKey: ["carrossel", marca, categoria],
    queryFn: () =>
      bancoPostsFn({
        data: {
          pagina: 0,
          marca: marca || undefined,
          categoria: categoria || undefined,
          ordem: "estoque",
        },
      }),
  });
  const itens = (data?.itens ?? []).slice(0, qtd);
  const pt = idioma === "pt";
  const tituloCapa = `${pt ? "Peças" : "Repuestos"}${categoria ? ` · ${categoria}` : ""}${marca ? ` ${pt ? "para" : "para"} ${marca}` : ""}`;
  const gerarTudo = async () => {
    const capa = await gerarTexto({
      formato: "feed",
      idioma,
      tema: modelo,
      selo: "PRE BLACK FRIDAY",
      titulo: tituloCapa,
      texto: pt ? `${itens.length} peças · arraste 👉` : `${itens.length} piezas · deslizá 👉`,
      foto: itens[0]?.foto,
    });
    const slides = [capa];
    for (const i of itens)
      slides.push(
        await gerarArte({
          modelo,
          formato: "feed",
          idioma,
          mostrar: mostrar === "preco" && !i.preco ? "desconto" : mostrar,
          desconto: 20,
          selo: "PRE BLACK FRIDAY",
          chamada: pt ? "Peças para o seu trator" : "Repuestos para tu tractor",
          produtos: [
            {
              nome: pt ? i.nomePt : i.nome,
              codigo: i.codigo,
              marca: i.marca,
              foto: i.foto,
              preco: i.preco,
            },
          ],
        }),
      );
    slides.push(
      await gerarTexto({
        ...{ formato: "feed" as Formato, idioma, tema: modelo },
        selo: pt ? "PEÇA JÁ" : "PEDILA YA",
        titulo: pt ? "Peça pelo WhatsApp" : "Cotizá por WhatsApp",
        texto: pt
          ? "Mande o código. Envio para todo o RS."
          : "Mandanos el código y te respondemos rápido.",
      }),
    );
    return slides.slice(0, 10);
  };
  const legendaCarrossel = () =>
    `${pt ? "🔧 " + tituloCapa : "🔧 " + tituloCapa}\n\n${itens
      .slice(0, 8)
      .map((i) => `▪️ ${pt ? i.nomePt : i.nome} · ${i.codigo}`)
      .join(
        "\n",
      )}\n\n${pt ? "💬 Peça pelo WhatsApp · 🚚 Envio para todo o RS" : "💬 Cotizá por WhatsApp"}`;
  return (
    <div className="space-y-4">
      <Card className="grid gap-3 p-4 md:grid-cols-3 xl:grid-cols-6">
        <Campo r="Idioma">
          <Opcoes
            v={idioma}
            set={setIdioma}
            ops={
              [
                ["es", "ES"],
                ["pt", "PT"],
              ] as const
            }
          />
        </Campo>
        <Campo r="Marca">
          <select
            className="h-8 w-full rounded-md border bg-background px-2 text-xs"
            value={marca}
            onChange={(e) => setMarca(e.target.value)}
          >
            <option value="">Todas</option>
            {filtros?.marcas
              .filter((m) => m.nome !== "—")
              .map((m) => (
                <option key={m.nome}>{m.nome}</option>
              ))}
          </select>
        </Campo>
        <Campo r="Categoria">
          <select
            className="h-8 w-full rounded-md border bg-background px-2 text-xs"
            value={categoria}
            onChange={(e) => setCategoria(e.target.value)}
          >
            <option value="">Todas</option>
            {filtros?.categorias
              .filter((m) => m.nome !== "—")
              .map((m) => (
                <option key={m.nome}>{m.nome}</option>
              ))}
          </select>
        </Campo>
        <Campo r="Peças">
          <Opcoes
            v={qtd}
            set={setQtd}
            ops={
              [
                [4, "4"],
                [6, "6"],
                [8, "8"],
              ] as const
            }
          />
        </Campo>
        <Campo r="Modelo">
          <Opcoes
            v={modelo}
            set={setModelo}
            ops={
              [
                ["escuro", "Preto"],
                ["amarelo", "Amarelo"],
                ["verde", "Verde"],
              ] as const
            }
          />
        </Campo>
        <Campo r="Mostrar">
          <Opcoes
            v={mostrar}
            set={setMostrar}
            ops={
              [
                ["desconto", "%"],
                ["preco", "Preço"],
                ["nada", "Nada"],
              ] as const
            }
          />
        </Campo>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={!!indo || !itens.length}
          onClick={async () => {
            setIndo("prev");
            try {
              const s = await gerarTudo();
              setPrev(s.map((c) => c.toDataURL("image/jpeg", 0.6)));
            } catch (e: any) {
              toast.error(e.message);
            } finally {
              setIndo(null);
            }
          }}
        >
          {indo === "prev" && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />} Ver os{" "}
          {Math.min(10, itens.length + 2)} slides
        </Button>
        <Button
          disabled={!!indo || !itens.length}
          onClick={async () => {
            setIndo("post");
            try {
              const s = await gerarTudo();
              const m = [];
              for (const [n, c] of s.entries())
                m.push(await enviarBlob(await paraJpg(c), `carrossel-${n + 1}.jpg`));
              usarNoPost(
                m,
                legendaCarrossel(),
                "CARROSSEL",
                hashtags({ marca, categoria }, idioma).join(" "),
              );
              toast.success("Carrossel no compositor");
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
          )}{" "}
          Usar no post
        </Button>
        <Button
          variant="outline"
          disabled={!!indo || !itens.length}
          onClick={async () => {
            setIndo("zip");
            try {
              const s = await gerarTudo();
              const JSZip = (await import("jszip")).default;
              const z = new JSZip();
              for (const [n, c] of s.entries())
                z.file(`${String(n + 1).padStart(2, "0")}.jpg`, await paraJpg(c));
              z.file("LEGENDA.txt", legendaCarrossel());
              baixarBlob(await z.generateAsync({ type: "blob" }), `carrossel-${idioma}.zip`);
            } finally {
              setIndo(null);
            }
          }}
        >
          <Download className="mr-1.5 h-4 w-4" /> ZIP
        </Button>
      </div>
      {!!prev.length && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {prev.map((s, n) => (
            <img key={n} src={s} alt={`Slide ${n + 1}`} className="h-72 rounded-lg border shadow" />
          ))}
        </div>
      )}
    </div>
  );
}
