// Linha Campo: nova linha de posts e stories só com peças do catálogo que têm foto própria
// (Massey Ferguson e as outras marcas), frases da AGRO PARTS e paletas para misturar no feed.
// Cada modelo veio de uma referência de autopeças e foi trazido para o campo.
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { bancoPostsFn } from "@/lib/estudio";
import { moderacaoFn } from "@/lib/avaliacoes";
import { hashtags, type Idioma } from "@/lib/estudio-textos";
import type { Formato, ProdutoArte } from "./artes";
import {
  gerarCampo,
  PALETAS,
  type ModeloCampo,
  type OpcoesCampo,
  type PaletaCampo,
} from "./artes-campo";
import { Campo, miniatura, Opcoes, PreviaArte } from "./comum";

type Textos = Pick<
  OpcoesCampo,
  "titulo" | "texto" | "selo" | "destaque" | "itens" | "botao" | "modelos" | "autor" | "cidade"
>;
type Modelo = {
  id: ModeloCampo;
  nome: string;
  ref: string; // de qual referência veio
  paleta: PaletaCampo;
  usa: Array<"produto" | "itens" | "destaque" | "modelos" | "autor" | "selo" | "botao">;
  padrao: Record<Idioma, Textos>;
};

export const MODELOS: Modelo[] = [
  {
    id: "oferta",
    nome: "Oferta da peça",
    ref: "Mês do Consumidor: peça grande, selo e preço",
    paleta: "noite",
    usa: ["produto", "modelos", "selo", "botao"],
    padrao: {
      es: {
        titulo: "",
        selo: "Semana del tractor",
        modelos: "Massey Ferguson 290 · 292 · 275",
        botao: "Cotizá por WhatsApp",
      },
      pt: {
        titulo: "",
        selo: "Semana do trator",
        modelos: "Massey Ferguson 290 · 292 · 275",
        botao: "Peça pelo WhatsApp",
      },
    },
  },
  {
    id: "pergunta",
    nome: "Pergunta do problema",
    ref: "«Direção dura?»: balão com a dúvida e a peça embaixo",
    paleta: "campo",
    usa: ["produto"],
    padrao: {
      es: {
        titulo: "¿Hidráulico *lento* o haciendo ruido?",
        texto: "Puede ser la bomba hidráulica. Te ayudamos a encontrar la pieza por el código.",
      },
      pt: {
        titulo: "Hidráulico *lento* ou fazendo barulho?",
        texto: "Pode ser a bomba hidráulica. A gente te ajuda a achar a peça pelo código.",
      },
    },
  },
  {
    id: "sinais",
    nome: "X sinais (capa de carrossel)",
    ref: "«3 sinais que apontam problemas»: número gigante",
    paleta: "colheita",
    usa: ["produto", "destaque", "botao"],
    padrao: {
      es: {
        destaque: "3",
        titulo: "Señales de que tu *embrague* pide cambio",
        botao: "DESLIZÁ PARA EL COSTADO  →",
      },
      pt: {
        destaque: "3",
        titulo: "Sinais de que a *embreagem* pede troca",
        botao: "ARRASTE PARA O LADO  →",
      },
    },
  },
  {
    id: "pessoa",
    nome: "Checklist com a peça",
    ref: "«Checklist do sistema de lubrificação» e «troca das molas»",
    paleta: "campo",
    usa: ["produto", "itens"],
    padrao: {
      es: {
        titulo: "Checklist *antes de la cosecha*",
        itens: [
          "Filtros de aceite y de aire",
          "Nivel del hidráulico",
          "Correas y mangueras",
          "Rodamientos y crucetas",
          "Batería y arranque",
        ],
      },
      pt: {
        titulo: "Checklist *antes da colheita*",
        itens: [
          "Filtros de óleo e de ar",
          "Nível do hidráulico",
          "Correias e mangueiras",
          "Rolamentos e cruzetas",
          "Bateria e partida",
        ],
      },
    },
  },
  {
    id: "porque",
    nome: "Por que a AGRO PARTS",
    ref: "«Por que escolher a Autofort?»: três pilares",
    paleta: "limpo",
    usa: ["produto", "itens"],
    padrao: {
      es: {
        titulo: "¿Por qué comprar en *AGRO PARTS*?",
        itens: [
          "Pedí por código|Buscamos por el número original de la pieza",
          "Envío a todo Uruguay|Despachamos por DAC hasta tu chacra",
          "Gente del campo|Te atendemos por WhatsApp, sin vueltas",
        ],
      },
      pt: {
        titulo: "Por que comprar na *AGRO PARTS*?",
        itens: [
          "Peça por código|Buscamos pelo número original da peça",
          "Envio para RS, SC e PR|Correios ou transportadora, com nota fiscal",
          "Gente do campo|Atendimento pelo WhatsApp, sem enrolação",
        ],
      },
    },
  },
  {
    id: "mensagem",
    nome: "Nova mensagem (lembrete)",
    ref: "«Você tem uma nova mensagem!»: notificação",
    paleta: "ceu",
    usa: ["produto", "botao"],
    padrao: {
      es: {
        titulo: "Tenés un nuevo mensaje",
        texto: "«Tu tractor está pidiendo el service antes de la cosecha. ¿Revisamos los filtros?»",
        botao: "Cotizar ahora",
      },
      pt: {
        titulo: "Você tem uma nova mensagem",
        texto: "«Seu trator está pedindo revisão antes da colheita. Vamos ver os filtros?»",
        botao: "Pedir orçamento",
      },
    },
  },
  {
    id: "depoimento",
    nome: "Depoimento de cliente",
    ref: "«#Feedback Cliente GTO»: estrelas e frase do cliente",
    paleta: "terra",
    usa: ["produto", "autor", "destaque"],
    padrao: {
      es: {
        titulo: "#Cliente*AGROPARTS*",
        destaque: "5",
        texto:
          "Pedí la pieza por WhatsApp y me llegó a la chacra en dos días. Atención de primera.",
        autor: "Cliente",
        cidade: "Uruguay",
      },
      pt: {
        titulo: "#Cliente*AGROPARTS*",
        destaque: "5",
        texto: "Pedi a peça pelo WhatsApp e chegou rapidinho. Atendimento de primeira.",
        autor: "Cliente",
        cidade: "RS",
      },
    },
  },
  {
    id: "ficha",
    nome: "Ficha da peça",
    ref: "Mosca Branca: peça, modelos e código de referência",
    paleta: "massey",
    usa: ["produto", "modelos", "selo", "botao"],
    padrao: {
      es: {
        titulo: "",
        modelos: "Massey Ferguson 265 · 275 · 290",
        selo: "Massey Ferguson",
        botao: "Pedí por WhatsApp",
      },
      pt: {
        titulo: "",
        modelos: "Massey Ferguson 265 · 275 · 290",
        selo: "Massey Ferguson",
        botao: "Peça pelo WhatsApp",
      },
    },
  },
  {
    id: "envio",
    nome: "Envio / entrega",
    ref: "«Estamos no Mercado Livre»: entregador com caixas",
    paleta: "campo",
    usa: ["produto", "botao"],
    padrao: {
      es: {
        titulo: "Del galpón a *tu chacra*",
        texto: "Pedís hoy por WhatsApp y despachamos por DAC a todo Uruguay.",
        botao: "Envíos a todo Uruguay",
      },
      pt: {
        titulo: "Do nosso estoque *até a sua lavoura*",
        texto: "Pede hoje pelo WhatsApp e enviamos para RS, SC e PR.",
        botao: "Envio com nota fiscal",
      },
    },
  },
];

// Frases da AGRO PARTS (clique para usar no título)
const FRASES: Record<Idioma, string[]> = {
  es: [
    "Tu tractor *no puede parar*",
    "La pieza justa, *antes de la cosecha*",
    "Del campo, *para el campo*",
    "Pedís por código, *te llega por DAC*",
    "Gente del campo atendiendo *gente del campo*",
    "Repuestos para *Massey Ferguson*",
    "El service hoy *evita la parada mañana*",
  ],
  pt: [
    "Seu trator *não pode parar*",
    "A peça certa *antes da colheita*",
    "Do campo, *para o campo*",
    "Peça pelo código, *a gente acha*",
    "Gente do agro atendendo *gente do agro*",
    "Peças para *Massey Ferguson*",
    "Revisão hoje *evita parada amanhã*",
  ],
};
const ORDEM_MISTURA: PaletaCampo[] = [
  "campo",
  "colheita",
  "massey",
  "limpo",
  "ceu",
  "terra",
  "noite",
];

export function LinhaCampo() {
  const [modelo, setModelo] = useState<ModeloCampo>("pessoa");
  const m = MODELOS.find((x) => x.id === modelo)!;
  const [idioma, setIdioma] = useState<Idioma>("es");
  const [formato, setFormato] = useState<Formato>("feed");
  const [paleta, setPaleta] = useState<PaletaCampo>(m.paleta);
  const [t, setT] = useState<Textos>(m.padrao.es);
  const [produto, setProduto] = useState<
    (ProdutoArte & { sku: string; categoria?: string | null }) | null
  >(null);
  const [mostrarPreco, setMostrarPreco] = useState(false);
  const [q, setQ] = useState("massey");
  const [busca, setBusca] = useState("massey");

  const trocarModelo = (id: ModeloCampo, i: Idioma = idioma) => {
    const n = MODELOS.find((x) => x.id === id)!;
    setModelo(id);
    setPaleta(n.paleta);
    setT(n.padrao[i]);
  };
  const trocarIdioma = (i: Idioma) => {
    setIdioma(i);
    setT(m.padrao[i]);
  };

  const { data: pecas, isFetching } = useQuery({
    queryKey: ["campo-pecas", busca],
    queryFn: () => bancoPostsFn({ data: { pagina: 0, q: busca || undefined, ordem: "estoque" } }),
  });
  // Primeira peça da busca entra sozinha
  const primeira = pecas?.itens?.[0];
  useEffect(() => {
    if (!produto && primeira) setProduto(primeira as any);
  }, [primeira]); // eslint-disable-line react-hooks/exhaustive-deps

  const { data: avaliacoes } = useQuery({
    queryKey: ["campo-avaliacoes"],
    queryFn: () => moderacaoFn({ data: { status: "APROVADA" } }),
    enabled: modelo === "depoimento",
  });

  const opcoes: OpcoesCampo = {
    modelo,
    paleta,
    formato,
    idioma,
    ...t,
    titulo: t.titulo ?? "",
    produto,
    mostrarPreco,
  };
  const chave = JSON.stringify(opcoes);
  const limpo = (s?: string) => (s ?? "").replace(/\*/g, "").trim();
  const legenda = useMemo(() => {
    const pt = idioma === "pt";
    const linhas = [
      limpo(t.titulo) || produto?.nome || "",
      t.texto ? limpo(t.texto) : "",
      ...(modelo === "pessoa" || modelo === "sinais"
        ? (t.itens ?? []).map((i) => `✅ ${i.split("|")[0]}`)
        : []),
      ...(modelo === "porque" ? (t.itens ?? []).map((i) => `✅ ${i.replace("|", ": ")}`) : []),
      produto ? `${pt ? "Código" : "Código"}: ${produto.codigo}` : "",
      "",
      pt
        ? "📲 Peça pelo WhatsApp (link na bio) · Envio para RS, SC e PR"
        : "📲 Cotizá por WhatsApp (link en la bio) · Envíos por DAC a todo Uruguay",
      "",
      hashtags(
        { marca: produto?.marca ?? "Massey Ferguson", categoria: produto?.categoria ?? null },
        idioma,
        false,
      ).join(" "),
    ];
    return linhas.filter((l, i, a) => l || (i > 0 && a[i - 1])).join("\n");
  }, [t, idioma, produto, modelo]);

  const tipo = formato === "story" ? "STORY" : "FEED";
  const set = (x: Partial<Textos>) => setT({ ...t, ...x });

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="space-y-3">
        <PreviaArte
          gerar={async () => (produto ? gerarCampo(opcoes) : null)}
          chave={chave}
          nome={`campo-${modelo}`}
          legenda={legenda}
          tipo={tipo}
        />
        <p className="rounded-lg bg-muted/60 p-3 text-xs text-muted-foreground">
          <b>Referência:</b> {m.ref}. Use <code>*asteriscos*</code> no título para pintar as
          palavras com a cor de destaque. Toda arte usa uma peça do catálogo com foto própria.
          Marcas de trator só em texto, sem o logotipo da marca.
        </p>
      </div>

      <div className="space-y-4">
        <Campo r="Modelo">
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
            {MODELOS.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => trocarModelo(x.id)}
                className={cn(
                  "rounded-lg border px-2 py-2 text-left text-xs font-semibold transition",
                  modelo === x.id ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted",
                )}
              >
                {x.nome}
              </button>
            ))}
          </div>
        </Campo>

        <div className="grid gap-3 sm:grid-cols-2">
          <Campo r="Formato">
            <Opcoes
              v={formato}
              set={setFormato}
              ops={
                [
                  ["feed", "Feed 4:5"],
                  ["quadrado", "1:1"],
                  ["story", "Story"],
                ] as const
              }
            />
          </Campo>
          <Campo r="Idioma">
            <Opcoes
              v={idioma}
              set={trocarIdioma}
              ops={
                [
                  ["es", "Español (UY)"],
                  ["pt", "Português (BR)"],
                ] as const
              }
            />
          </Campo>
        </div>

        <Campo r="Cores (misture no feed)">
          <div className="flex flex-wrap items-center gap-1.5">
            {(Object.keys(PALETAS) as PaletaCampo[]).map((k) => (
              <button
                key={k}
                type="button"
                title={PALETAS[k].nome}
                onClick={() => setPaleta(k)}
                className={cn(
                  "flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs",
                  paleta === k ? "border-primary ring-2 ring-primary/30" : "hover:bg-muted",
                )}
              >
                <span
                  className="h-4 w-4 rounded-full border"
                  style={{
                    background: `linear-gradient(135deg, ${PALETAS[k].fundo[0]}, ${PALETAS[k].fundo[2]})`,
                  }}
                />
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: PALETAS[k].ac }} />
                {PALETAS[k].nome}
              </button>
            ))}
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                setPaleta(ORDEM_MISTURA[(ORDEM_MISTURA.indexOf(paleta) + 1) % ORDEM_MISTURA.length])
              }
            >
              <Shuffle className="mr-1 h-3.5 w-3.5" /> Próxima cor
            </Button>
          </div>
        </Campo>

        <Campo r="Título">
          <Input
            value={t.titulo ?? ""}
            onChange={(e) => set({ titulo: e.target.value })}
            placeholder={m.usa.includes("produto") ? "Vazio = nome da peça" : ""}
          />
          <div className="mt-1.5 flex flex-wrap gap-1">
            {FRASES[idioma].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => set({ titulo: f })}
                className="rounded-full bg-muted px-2 py-0.5 text-[11px] hover:bg-muted/70"
              >
                {f.replace(/\*/g, "")}
              </button>
            ))}
          </div>
        </Campo>

        {modelo !== "oferta" && modelo !== "ficha" && (
          <Campo r={modelo === "depoimento" ? "Frase do cliente" : "Texto"}>
            <Textarea
              rows={2}
              value={t.texto ?? ""}
              onChange={(e) => set({ texto: e.target.value })}
            />
          </Campo>
        )}

        {m.usa.includes("itens") && (
          <Campo
            r={
              modelo === "porque" ? "Pilares (um por linha: título|texto)" : "Itens (um por linha)"
            }
          >
            <Textarea
              rows={4}
              value={(t.itens ?? []).join("\n")}
              onChange={(e) => set({ itens: e.target.value.split("\n") })}
            />
          </Campo>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {m.usa.includes("destaque") && (
            <Campo r={modelo === "depoimento" ? "Estrelas (1 a 5)" : "Número grande"}>
              <Input value={t.destaque ?? ""} onChange={(e) => set({ destaque: e.target.value })} />
            </Campo>
          )}
          {m.usa.includes("selo") && (
            <Campo r="Selo">
              <Input value={t.selo ?? ""} onChange={(e) => set({ selo: e.target.value })} />
            </Campo>
          )}
          {m.usa.includes("botao") && (
            <Campo r="Botão / chamada">
              <Input value={t.botao ?? ""} onChange={(e) => set({ botao: e.target.value })} />
            </Campo>
          )}
          {m.usa.includes("modelos") && (
            <Campo r="Serve em (modelos)">
              <Input value={t.modelos ?? ""} onChange={(e) => set({ modelos: e.target.value })} />
            </Campo>
          )}
          {m.usa.includes("autor") && (
            <>
              <Campo r="Nome do cliente">
                <Input value={t.autor ?? ""} onChange={(e) => set({ autor: e.target.value })} />
              </Campo>
              <Campo r="Cidade">
                <Input value={t.cidade ?? ""} onChange={(e) => set({ cidade: e.target.value })} />
              </Campo>
            </>
          )}
        </div>

        {modelo === "depoimento" && !!avaliacoes?.lista?.length && (
          <Campo r="Usar uma avaliação aprovada do site">
            <div className="max-h-40 space-y-1 overflow-y-auto">
              {avaliacoes.lista.slice(0, 20).map((a: any) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() =>
                    set({
                      texto: a.comentario || "",
                      autor: a.nome,
                      cidade: a.cidade ?? "",
                      destaque: String(a.nota),
                    })
                  }
                  className="block w-full rounded-md border px-2 py-1 text-left text-xs hover:bg-muted"
                >
                  {"★".repeat(a.nota)} <b>{a.nome}</b> —{" "}
                  {(a.comentario || "(sem comentário)").slice(0, 80)}
                </button>
              ))}
            </div>
          </Campo>
        )}

        {
          <Campo r="Peça (só peças com foto própria)">
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
                placeholder="Código, nome ou marca (ex.: massey bomba)"
              />
              <Button type="submit" size="icon" variant="secondary" aria-label="Buscar">
                <Search className="h-4 w-4" />
              </Button>
            </form>
            <div className="mt-2 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
              {isFetching && (
                <p className="col-span-full text-xs text-muted-foreground">Buscando…</p>
              )}
              {(pecas?.itens ?? []).slice(0, 12).map((x: any) => (
                <button
                  key={x.sku}
                  type="button"
                  title={`${x.nome} · ${x.codigo}`}
                  onClick={() => setProduto(x)}
                  className={cn(
                    "overflow-hidden rounded-lg border bg-white p-1",
                    produto?.sku === x.sku && "ring-2 ring-primary",
                  )}
                >
                  {x.foto ? (
                    <img
                      src={miniatura(x.foto)}
                      alt=""
                      className="aspect-square w-full object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <span className="block aspect-square text-[10px]">{x.codigo}</span>
                  )}
                </button>
              ))}
            </div>
            {produto && (
              <label className="mt-2 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={mostrarPreco}
                  onChange={(e) => setMostrarPreco(e.target.checked)}
                />
                Mostrar o preço (
                {idioma === "pt"
                  ? (produto.preco?.brl ?? "sem preço")
                  : (produto.preco?.uyu ?? "sem preço")}
                )
              </label>
            )}
          </Campo>
        }
      </div>
    </div>
  );
}
