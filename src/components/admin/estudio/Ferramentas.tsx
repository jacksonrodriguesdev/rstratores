// Ferramentas menores do Estúdio: imagem (fundo, formato, moldura), textos (legendas, hashtags,
// verificador, comentário, tradutor, Reels, respostas, bio), planejamento (grade, plano do mês,
// datas), links (WhatsApp, UTM) e análise (melhores posts, cobertura do catálogo).
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ExternalLink, Upload } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { bancoPostsFn, buscarPecasEstudioFn, estudioFn, filtrosBancoFn } from "@/lib/estudio";
import {
  BIOS,
  datas,
  DICAS,
  hashtags,
  legenda,
  linkPeca,
  linkUtm,
  linkWhatsApp,
  RESPOSTAS,
  roteiroReels,
  TONS,
  verificarLegenda,
  type Idioma,
  type Tom,
} from "@/lib/estudio-textos";
import { buscaParaPortugues, nomeEs } from "@/lib/pecas-es";
import { cn } from "@/lib/utils";
import { ajustarFormato, moldura, removerFundo, type Formato, type Tema } from "./artes";
import { BotaoCopiar, Campo, Opcoes, PreviaArte, useEstudio } from "./comum";

// ================================================================ imagem
function EscolherArquivo({ arq, set }: { arq: File | null; set: (f: File) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-lg border-2 border-dashed p-4 text-sm hover:bg-muted/40">
      <Upload className="h-5 w-5 text-muted-foreground" />
      <span className="flex-1">{arq ? arq.name : "Escolha uma foto (JPG, PNG, WEBP)"}</span>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => e.target.files?.[0] && set(e.target.files[0])}
      />
    </label>
  );
}
const chaveArq = (f: File | null) => (f ? `${f.name}-${f.size}-${f.lastModified}` : "");

export function RemoverFundo() {
  const [arq, setArq] = useState<File | null>(null);
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="space-y-3 p-4">
        <EscolherArquivo arq={arq} set={setArq} />
        <p className="text-xs text-muted-foreground">
          Funciona com fotos de peça em fundo branco ou bem claro: o fundo fica transparente e a
          imagem é cortada no tamanho da peça (PNG).
        </p>
      </Card>
      <PreviaArte
        gerar={async () => (arq ? removerFundo(arq) : null)}
        chave={chaveArq(arq)}
        nome="peca-sem-fundo"
        png
      />
    </div>
  );
}
export function AjustarFormato() {
  const [arq, setArq] = useState<File | null>(null);
  const [formato, setFormato] = useState<Formato>("feed");
  const [fundo, setFundo] = useState<"desfoque" | "branco" | "preto">("desfoque");
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="space-y-3 p-4">
        <EscolherArquivo arq={arq} set={setArq} />
        <Campo r="Formato">
          <Opcoes
            v={formato}
            set={setFormato}
            ops={
              [
                ["feed", "Feed 4:5"],
                ["quadrado", "Quadrado"],
                ["story", "Story 9:16"],
              ] as const
            }
          />
        </Campo>
        <Campo r="Fundo">
          <Opcoes
            v={fundo}
            set={setFundo}
            ops={
              [
                ["desfoque", "Desfocado"],
                ["branco", "Branco"],
                ["preto", "Preto"],
              ] as const
            }
          />
        </Campo>
        <p className="text-xs text-muted-foreground">
          A foto inteira aparece, sem cortar; o resto vira fundo.
        </p>
      </Card>
      <PreviaArte
        gerar={async () => (arq ? ajustarFormato(arq, formato, fundo) : null)}
        chave={chaveArq(arq) + formato + fundo}
        nome={`foto-${formato}`}
        tipo={formato === "story" ? "STORY" : "FEED"}
      />
    </div>
  );
}
export function Moldura() {
  const [arq, setArq] = useState<File | null>(null);
  const [o, setO] = useState({
    formato: "feed" as Formato,
    idioma: "es" as Idioma,
    tema: "escuro" as Tema,
    titulo: "Llegó mercadería nueva",
    sub: "Repuestos para Valtra, Massey, John Deere y New Holland",
  });
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Card className="space-y-3 p-4">
        <EscolherArquivo arq={arq} set={setArq} />
        <p className="text-xs text-muted-foreground">
          Para fotos suas: estoque, entrega, balcão, trator do cliente (com permissão), evento.
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Campo r="Formato">
            <Opcoes
              v={o.formato}
              set={(v) => setO({ ...o, formato: v })}
              ops={
                [
                  ["feed", "4:5"],
                  ["quadrado", "1:1"],
                  ["story", "Story"],
                ] as const
              }
            />
          </Campo>
          <Campo r="Cor da faixa">
            <Opcoes
              v={o.tema}
              set={(v) => setO({ ...o, tema: v })}
              ops={
                [
                  ["escuro", "Ouro"],
                  ["verde", "Verde"],
                  ["amarelo", "Preto"],
                ] as const
              }
            />
          </Campo>
          <Campo r="Idioma">
            <Opcoes
              v={o.idioma}
              set={(v) => setO({ ...o, idioma: v })}
              ops={
                [
                  ["es", "ES"],
                  ["pt", "PT"],
                ] as const
              }
            />
          </Campo>
        </div>
        <Campo r="Frase">
          <Input
            value={o.titulo}
            onChange={(e) => setO({ ...o, titulo: e.target.value.slice(0, 60) })}
          />
        </Campo>
        <Campo r="Linha de baixo">
          <Input
            value={o.sub}
            onChange={(e) => setO({ ...o, sub: e.target.value.slice(0, 120) })}
          />
        </Campo>
      </Card>
      <PreviaArte
        gerar={async () => (arq ? moldura(arq, o) : null)}
        chave={chaveArq(arq) + JSON.stringify(o)}
        nome="foto-com-logo"
        tipo={o.formato === "story" ? "STORY" : "FEED"}
      />
    </div>
  );
}

// ================================================================ textos
function EscolherPeca({ set }: { set: (p: any) => void }) {
  const [q, setQ] = useState("");
  const [busca, setBusca] = useState("");
  const { data } = useQuery({
    queryKey: ["estudio-busca", busca],
    queryFn: () => buscarPecasEstudioFn({ data: { q: busca } }),
    enabled: busca.length >= 2,
  });
  return (
    <div className="space-y-2">
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
          placeholder="Buscar peça (nome ou código)…"
        />
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>
      {!!data?.length && (
        <div className="max-h-48 space-y-0.5 overflow-y-auto rounded-md border p-1">
          {data.map((p) => (
            <button
              key={p.sku}
              onClick={() => set(p)}
              className="block w-full rounded px-2 py-1 text-left text-xs hover:bg-muted"
            >
              <b>{p.codigo}</b> · {p.nomePt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
export function Legendas() {
  const [p, setP] = useState<any>(null);
  const [idioma, setIdioma] = useState<Idioma>("es");
  const [tags, setTags] = useState(false);
  return (
    <div className="space-y-4">
      <Card className="space-y-3 p-4">
        <EscolherPeca set={setP} />
        <div className="flex flex-wrap gap-4">
          <Opcoes
            v={idioma}
            set={setIdioma}
            ops={
              [
                ["es", "Espanhol"],
                ["pt", "Português"],
              ] as const
            }
          />
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={tags} onChange={(e) => setTags(e.target.checked)} /> Com
            hashtags no fim
          </label>
        </div>
      </Card>
      {p && (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {TONS.map(([k, r]) => {
            const t = legenda(p, idioma, k as Tom, { tags });
            return (
              <Card key={k} className="flex flex-col p-3">
                <p className="mb-2 text-xs font-bold uppercase text-muted-foreground">{r}</p>
                <pre className="flex-1 whitespace-pre-wrap font-sans text-sm">{t}</pre>
                <div className="mt-2">
                  <BotaoCopiar t={t} />
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
export function Hashtags() {
  const { data: f } = useQuery({ queryKey: ["banco-filtros"], queryFn: () => filtrosBancoFn() });
  const [marca, setMarca] = useState("");
  const [categoria, setCategoria] = useState("");
  const [campanha, setCampanha] = useState(true);
  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap gap-2">
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={marca}
          onChange={(e) => setMarca(e.target.value)}
        >
          <option value="">Sem marca</option>
          {f?.marcas
            .filter((m) => m.nome !== "—")
            .map((m) => (
              <option key={m.nome}>{m.nome}</option>
            ))}
        </select>
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
        >
          <option value="">Sem categoria</option>
          {f?.categorias
            .filter((m) => m.nome !== "—")
            .map((m) => (
              <option key={m.nome}>{m.nome}</option>
            ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs">
          <input
            type="checkbox"
            checked={campanha}
            onChange={(e) => setCampanha(e.target.checked)}
          />{" "}
          #PreBlackFriday
        </label>
      </div>
      {(["es", "pt"] as const).map((i) => {
        const t = hashtags({ marca, categoria }, i, campanha).join(" ");
        return (
          <div key={i} className="rounded-lg border p-3">
            <p className="mb-1 text-xs font-bold">
              {i === "es" ? "Espanhol (Uruguai)" : "Português (RS)"}
            </p>
            <p className="text-sm">{t}</p>
            <div className="mt-2">
              <BotaoCopiar t={t} />
            </div>
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">
        Dica: até 15 hashtags, no primeiro comentário, deixam a legenda limpa.
      </p>
    </Card>
  );
}
export function Verificador() {
  const [t, setT] = useState("");
  const av = verificarLegenda(t);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Textarea
        rows={14}
        value={t}
        onChange={(e) => setT(e.target.value)}
        placeholder="Cole a legenda aqui…"
      />
      <Card className="space-y-2 p-4">
        {t ? (
          av.map((a, n) => (
            <p
              key={n}
              className={cn(
                "flex items-start gap-2 text-sm",
                a.ok ? "text-emerald-700" : "text-red-700",
              )}
            >
              {a.ok ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              )}{" "}
              {a.texto}
            </p>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">
            Cole uma legenda para conferir limites do Instagram e frases que não podemos usar.
          </p>
        )}
      </Card>
    </div>
  );
}
export function PrimeiroComentario() {
  const [p, setP] = useState<any>(null);
  const [idioma, setIdioma] = useState<Idioma>("es");
  const t = p
    ? `${idioma === "pt" ? "📲 Peça pelo WhatsApp: +55 53 99183-1101" : "📲 Cotizá por WhatsApp: +55 53 99183-1101"}\n🔗 ${linkPeca(p.sku, idioma)}\n.\n.\n${hashtags(p, idioma).join(" ")}`
    : "";
  return (
    <Card className="space-y-3 p-4">
      <EscolherPeca set={setP} />
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
      {t && (
        <>
          <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 font-sans text-sm">{t}</pre>
          <BotaoCopiar t={t} />
        </>
      )}
    </Card>
  );
}
export function Tradutor() {
  const [t, setT] = useState("");
  const [sentido, setSentido] = useState<"pt-es" | "es-pt">("pt-es");
  const r = !t
    ? ""
    : sentido === "pt-es"
      ? t
          .split("\n")
          .map((l) => nomeEs(l))
          .join("\n")
      : t
          .split("\n")
          .map((l) => buscaParaPortugues(l))
          .join("\n");
  return (
    <div className="space-y-3">
      <Opcoes
        v={sentido}
        set={setSentido}
        ops={
          [
            ["pt-es", "Português → Espanhol"],
            ["es-pt", "Espanhol → Português"],
          ] as const
        }
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Textarea
          rows={10}
          value={t}
          onChange={(e) => setT(e.target.value)}
          placeholder="Nomes de peças, um por linha. Ex.: ROLAMENTO DA EMBREAGEM"
        />
        <Card className="p-3">
          <pre className="min-h-40 whitespace-pre-wrap font-sans text-sm">{r}</pre>
          {r && <BotaoCopiar t={r} />}
        </Card>
      </div>
      <p className="text-xs text-muted-foreground">
        Usa o mesmo glossário técnico do site (nomes de peças, não frases inteiras).
      </p>
    </div>
  );
}
export function Reels() {
  const [tema, setTema] = useState("embrague");
  const [idioma, setIdioma] = useState<Idioma>("es");
  const r = roteiroReels(tema, idioma);
  return (
    <Card className="space-y-3 p-4">
      <div className="flex flex-wrap gap-2">
        <Input
          className="max-w-xs"
          value={tema}
          onChange={(e) => setTema(e.target.value)}
          placeholder="Peça ou sistema (ex.: embreagem)"
        />
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
      </div>
      <ol className="space-y-2">
        {r.map((l, n) => (
          <li key={n} className="rounded-lg border p-2.5 text-sm">
            <b className="mr-2 text-primary">{n + 1}</b>
            {l}
          </li>
        ))}
      </ol>
      <BotaoCopiar t={r.join("\n")} rotulo="Copiar roteiro" />
    </Card>
  );
}
export function Respostas() {
  const [idioma, setIdioma] = useState<Idioma>("es");
  return (
    <div className="space-y-3">
      <Opcoes
        v={idioma}
        set={setIdioma}
        ops={
          [
            ["es", "Espanhol"],
            ["pt", "Português"],
          ] as const
        }
      />
      <div className="grid gap-3 md:grid-cols-2">
        {RESPOSTAS.map((r) => (
          <Card key={r.k} className="p-3">
            <p className="text-xs font-bold uppercase text-muted-foreground">{r.k}</p>
            <p className="my-2 text-sm">{r[idioma]}</p>
            <BotaoCopiar t={r[idioma]} />
          </Card>
        ))}
      </div>
    </div>
  );
}
export function Bios() {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {(["es", "pt"] as const).flatMap((i) =>
        BIOS[i].map((b, n) => (
          <Card key={i + n} className="p-3">
            <p className="text-xs font-bold uppercase text-muted-foreground">
              {i === "es" ? "Espanhol" : "Português"} · opção {n + 1} · {b.length}/150
            </p>
            <pre className="my-2 whitespace-pre-wrap font-sans text-sm">{b}</pre>
            <BotaoCopiar t={b} />
          </Card>
        )),
      )}
    </div>
  );
}
export function Dicas() {
  const [idioma, setIdioma] = useState<Idioma>("es");
  const { abrir } = useEstudio();
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
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
        <Button size="sm" variant="outline" onClick={() => abrir("dica")}>
          Transformar em arte
        </Button>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        {DICAS.map((d, n) => (
          <Card key={n} className="p-3 text-sm">
            <b>{d[idioma][0]}</b> — {d[idioma][1]}
          </Card>
        ))}
      </div>
    </div>
  );
}

// ================================================================ planejar
export function GradeFeed() {
  const { posts } = useEstudio();
  const lista = posts
    .filter(
      (p) =>
        p.tipo !== "STORY" &&
        ["AGENDADO", "PUBLICADO", "RASCUNHO"].includes(p.status) &&
        p.midias[0],
    )
    .sort((a, b) =>
      String(b.agendado_para || b.publicado_em || "9").localeCompare(
        String(a.agendado_para || a.publicado_em || "9"),
      ),
    )
    .slice(0, 30);
  return (
    <div className="mx-auto max-w-md">
      <p className="mb-2 text-xs text-muted-foreground">
        Como o perfil vai ficar: rascunhos e agendados no topo (os mais novos primeiro), depois o
        que já saiu.
      </p>
      <div className="grid grid-cols-3 gap-0.5 overflow-hidden rounded-lg border bg-black">
        {lista.map((p) => (
          <div key={p.id} className="relative aspect-[4/5] bg-muted">
            {p.midias[0].tipo === "IMAGE" && (
              <img
                src={`/uploads/${p.midias[0].path}`}
                alt=""
                className="h-full w-full object-cover"
              />
            )}
            <span
              className={cn(
                "absolute left-1 top-1 rounded px-1 text-[9px] font-bold",
                p.status === "PUBLICADO"
                  ? "bg-emerald-600 text-white"
                  : p.status === "AGENDADO"
                    ? "bg-sky-600 text-white"
                    : "bg-zinc-200",
              )}
            >
              {p.status === "PUBLICADO"
                ? "NO AR"
                : p.status === "AGENDADO"
                  ? "AGENDADO"
                  : "RASCUNHO"}
            </span>
          </div>
        ))}
        {!lista.length && (
          <p className="col-span-3 bg-background p-8 text-center text-sm text-muted-foreground">
            Nenhuma publicação ainda.
          </p>
        )}
      </div>
    </div>
  );
}
const PLANO: Array<{ tipo: string; ferramenta: string; ideia: string }> = [
  {
    tipo: "Peça em alta",
    ferramenta: "recomendacoes",
    ideia: "A peça nº 1 das recomendações, com o % de desconto",
  },
  {
    tipo: "Dica de manutenção",
    ferramenta: "dica",
    ideia: "Uma dica da lista (gera conversa e salvamentos)",
  },
  {
    tipo: "Carrossel da marca",
    ferramenta: "carrossel",
    ideia: "6 peças de uma marca + slide do WhatsApp",
  },
  {
    tipo: "Oferta Pré-Black",
    ferramenta: "banco",
    ideia: "Peça do banco com desconto, modelo amarelo",
  },
  { tipo: "Procura este código?", ferramenta: "codigo", ideia: "Um código muito buscado no site" },
  {
    tipo: "Story enquete",
    ferramenta: "pergunta",
    ideia: "«Qual é o seu trator?» (enquete pelo app)",
  },
  {
    tipo: "Bastidores",
    ferramenta: "moldura",
    ideia: "Foto do estoque ou de uma entrega, com a logo",
  },
];
export function PlanoMes() {
  const { abrir } = useEstudio();
  const { data } = useQuery({
    queryKey: ["estudio", 30],
    queryFn: () => estudioFn({ data: { dias: 30 } }),
    staleTime: 5 * 60_000,
  });
  const hoje = new Date();
  const dias = Array.from({ length: 30 }, (_, n) => {
    const d = new Date(hoje);
    d.setDate(hoje.getDate() + n + 1);
    const tipo = PLANO[(d.getDay() + 6) % 7];
    const peca = data?.produtos?.[n % Math.max(1, data.produtos.length)];
    return { d, ...tipo, peca };
  });
  const hora = data?.horarios?.topHoras?.[0];
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Um post por dia, com um tipo para cada dia da semana
        {hora != null ? ` — melhor perto das ${Math.max(7, hora - 1)}h (horário do Uruguai)` : ""}.
        Para preparar vários de uma vez, use o Banco de posts → Agendar automático.
      </p>
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-2">Dia</th>
              <th className="p-2">Tipo</th>
              <th className="p-2">Ideia</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {dias.map((x) => (
              <tr key={x.d.toISOString()} className="border-t">
                <td className="whitespace-nowrap p-2 font-semibold">
                  {x.d.toLocaleDateString("pt-BR", {
                    weekday: "short",
                    day: "2-digit",
                    month: "2-digit",
                  })}
                </td>
                <td className="p-2">{x.tipo}</td>
                <td className="p-2 text-xs text-muted-foreground">
                  {x.ideia}
                  {x.ferramenta === "recomendacoes" && x.peca
                    ? ` · sugestão: ${x.peca.codigo}`
                    : ""}
                </td>
                <td className="p-2 text-right">
                  <Button size="sm" variant="ghost" onClick={() => abrir(x.ferramenta)}>
                    Criar
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
export function Datas() {
  const { abrir } = useEstudio();
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {datas().map((d) => (
        <Card key={d.nome} className="flex items-center gap-4 p-4">
          <div className="w-16 text-center">
            <p className="text-3xl font-black text-primary">{Math.max(0, d.dias)}</p>
            <p className="text-[10px] uppercase text-muted-foreground">dias</p>
          </div>
          <div className="flex-1">
            <p className="font-bold">
              {d.nome} · {d.quando.toLocaleDateString("pt-BR")}
            </p>
            <p className="text-xs text-muted-foreground">{d.ideia}</p>
          </div>
          {d.nome === "Black Friday" && (
            <Button size="sm" variant="outline" onClick={() => abrir("contagem")}>
              Contagem
            </Button>
          )}
        </Card>
      ))}
    </div>
  );
}

// ================================================================ links
export function LinkWhats() {
  const [msg, setMsg] = useState("Hola! Vi en Instagram el repuesto código ");
  const l = linkWhatsApp(msg);
  return (
    <Card className="space-y-3 p-4">
      <Campo r="Mensagem que o cliente já recebe escrita">
        <Textarea rows={3} value={msg} onChange={(e) => setMsg(e.target.value)} />
      </Campo>
      <p className="break-all rounded-md bg-muted p-2 text-xs">{l}</p>
      <div className="flex gap-2">
        <BotaoCopiar t={l} rotulo="Copiar link" />
        <a
          href={l}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm text-primary underline"
        >
          Testar <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
      <p className="text-xs text-muted-foreground">
        Use na bio, nos stories (figurinha de link) e nos anúncios.
      </p>
    </Card>
  );
}
export function LinkUtm() {
  const [o, setO] = useState({
    url: "https://agropartsuy.com/black-friday",
    fonte: "instagram",
    meio: "bio",
    campanha: "pre-black",
    conteudo: "",
  });
  let l = "";
  try {
    l = linkUtm(o.url, o);
  } catch {
    l = "";
  }
  return (
    <Card className="space-y-3 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <Campo r="Página do site">
          <Input value={o.url} onChange={(e) => setO({ ...o, url: e.target.value })} />
        </Campo>
        <Campo r="Onde o link vai ficar">
          <Opcoes
            v={o.meio}
            set={(v) => setO({ ...o, meio: v })}
            ops={
              [
                ["bio", "Bio"],
                ["story", "Story"],
                ["post", "Post"],
                ["pago", "Anúncio"],
                ["dm", "Direct"],
              ] as const
            }
          />
        </Campo>
        <Campo r="Rede">
          <Opcoes
            v={o.fonte}
            set={(v) => setO({ ...o, fonte: v })}
            ops={
              [
                ["instagram", "Instagram"],
                ["facebook", "Facebook"],
                ["whatsapp", "WhatsApp"],
              ] as const
            }
          />
        </Campo>
        <Campo r="Campanha">
          <Input
            value={o.campanha}
            onChange={(e) =>
              setO({ ...o, campanha: e.target.value.replace(/\s+/g, "-").toLowerCase() })
            }
          />
        </Campo>
      </div>
      <p className="break-all rounded-md bg-muted p-2 text-xs">{l || "Página inválida"}</p>
      {l && <BotaoCopiar t={l} rotulo="Copiar link" />}
      <p className="text-xs text-muted-foreground">
        As visitas por esse link aparecem separadas em Visitantes e na Jornada
        (fonte/meio/campanha).
      </p>
    </Card>
  );
}

// ================================================================ analisar
export function TopPosts() {
  const { posts } = useEstudio();
  const lista = posts
    .filter((p) => p.status === "PUBLICADO" && p.metricas)
    .map((p) => {
      const m = p.metricas!;
      const eng =
        (m.curtidas ?? 0) +
        3 * (m.comentarios ?? 0) +
        4 * (m.salvos ?? 0) +
        4 * (m.compartilhamentos ?? 0);
      return { p, m, eng, taxa: m.alcance ? (eng / m.alcance) * 100 : null };
    })
    .sort((a, b) => b.eng - a.eng)
    .slice(0, 20);
  if (!lista.length)
    return (
      <Card className="p-8 text-center text-sm text-muted-foreground">
        Ainda sem números: publique pelo painel e clique em «Atualizar números» na aba Publicações.
      </Card>
    );
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Pontos = curtidas + 3×comentários + 4×salvos + 4×compartilhamentos. Repita o formato dos
        primeiros.
      </p>
      {lista.map(({ p, m, eng, taxa }, n) => (
        <Card key={p.id} className="flex items-center gap-3 p-2">
          <span className="w-6 text-center font-black text-muted-foreground">{n + 1}</span>
          {p.midias[0]?.tipo === "IMAGE" && (
            <img
              src={`/uploads/${p.midias[0].path}`}
              alt=""
              className="h-14 w-12 rounded object-cover"
            />
          )}
          <div className="min-w-0 flex-1">
            <p className="line-clamp-1 text-sm">{p.legenda || p.tipo}</p>
            <p className="text-xs text-muted-foreground">
              ❤️ {m.curtidas ?? 0} · 💬 {m.comentarios ?? 0} · 🔖 {m.salvos ?? 0} · ↗️{" "}
              {m.compartilhamentos ?? 0} · alcance {m.alcance ?? "—"}
            </p>
          </div>
          <div className="text-right">
            <p className="font-black">{eng}</p>
            {taxa != null && (
              <p className="text-[10px] text-muted-foreground">{taxa.toFixed(1)}% do alcance</p>
            )}
          </div>
          {p.permalink && (
            <a href={p.permalink} target="_blank" rel="noreferrer" aria-label="Abrir no Instagram">
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
        </Card>
      ))}
    </div>
  );
}
export function Cobertura() {
  const { abrir } = useEstudio();
  const { data: f } = useQuery({ queryKey: ["banco-filtros"], queryFn: () => filtrosBancoFn() });
  const { data: b } = useQuery({
    queryKey: ["banco", "cobertura"],
    queryFn: () => bancoPostsFn({ data: { pagina: 0 } }),
  });
  const pct = f && b ? (b.postados / Math.max(1, f.total)) * 100 : 0;
  const marcas = useMemo(() => (f?.marcas ?? []).filter((m) => m.nome !== "—").slice(0, 8), [f]);
  const max = Math.max(1, ...marcas.map((m) => m.n));
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <p className="text-sm font-bold">Catálogo já mostrado no Instagram</p>
        <p className="mt-2 text-4xl font-black text-primary">{pct.toFixed(1)}%</p>
        <p className="text-xs text-muted-foreground">
          {b?.postados.toLocaleString("pt-BR") ?? "…"} de {f?.total.toLocaleString("pt-BR") ?? "…"}{" "}
          peças com foto própria
        </p>
        <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary"
            style={{ width: `${Math.max(0.5, pct)}%` }}
          />
        </div>
        <Button className="mt-4" size="sm" onClick={() => abrir("fila")}>
          Agendar peças nunca postadas
        </Button>
      </Card>
      <Card className="p-5">
        <p className="mb-3 text-sm font-bold">Posts prontos por marca</p>
        <ul className="space-y-1.5">
          {marcas.map((m) => (
            <li key={m.nome} className="flex items-center gap-2 text-xs">
              <span className="w-28 truncate">{m.nome}</span>
              <span className="h-2.5 flex-1 overflow-hidden rounded-full bg-muted">
                <span
                  className="block h-full rounded-full bg-primary"
                  style={{ width: `${(m.n / max) * 100}%` }}
                />
              </span>
              <span className="w-14 text-right tabular-nums text-muted-foreground">
                {m.n.toLocaleString("pt-BR")}
              </span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
