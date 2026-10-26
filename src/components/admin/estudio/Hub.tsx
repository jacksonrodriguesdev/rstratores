// Estúdio: central com todas as ferramentas de criação, textos, imagem, planejamento, links,
// análise e anúncios. Cada ferramenta abre aqui mesmo; o resultado vai para o compositor.
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BarChart3,
  CalendarDays,
  CalendarRange,
  Clock,
  Crop,
  Eraser,
  FileArchive,
  Flame,
  Frame,
  Gauge,
  Grid3x3,
  Hash,
  Hourglass,
  Images,
  Languages,
  Layers,
  Lightbulb,
  Link2,
  ListChecks,
  Megaphone,
  MessageCircle,
  MessagesSquare,
  PanelTop,
  QrCode,
  ScanSearch,
  Sprout,
  Search,
  ShieldCheck,
  Sparkles,
  Tag,
  Ticket,
  Trophy,
  Type,
  UserSquare,
  Video,
  Vote,
  Wallet,
  Zap,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { estudioFn } from "@/lib/estudio";
import type { PostInstagram } from "@/lib/instagram";
import { cn } from "@/lib/utils";
import { Banco } from "./Banco";
import { Importar } from "./Importar";
import { ArteTexto, Carrossel } from "./ArtesTexto";
import { EstudioCtx, type Midia, type TipoPost } from "./comum";
import { Horarios, Orcamento, PainelRecomendacoes } from "./Estudio";
import * as F from "./Ferramentas";
import { LinhaCampo } from "./LinhaCampo";
import { Confianca } from "./Confianca";

type Grupo = "Criar" | "Textos" | "Imagem" | "Planejar" | "Links" | "Analisar" | "Anunciar";
type Ferramenta = {
  id: string;
  nome: string;
  desc: string;
  grupo: Grupo;
  icone: any;
  destaque?: boolean;
};
export const FERRAMENTAS: Ferramenta[] = [
  {
    id: "campo",
    nome: "Linha Campo (nova)",
    desc: "Posts e stories com peças com foto, frases da AGRO PARTS e 7 cores para misturar",
    grupo: "Criar",
    icone: Sprout,
    destaque: true,
  },
  {
    id: "confianca",
    nome: "Carrosséis: armadilhas e lupa",
    desc: "Golpes na compra de peças e o nosso site com lupa (Massey, pagamentos, envio)",
    grupo: "Criar",
    icone: ScanSearch,
    destaque: true,
  },
  {
    id: "importar",
    nome: "Importar campanha pronta",
    desc: "ZIP com artes e legendas → agenda tudo (1 post + 1 story por horário)",
    grupo: "Criar",
    icone: FileArchive,
    destaque: true,
  },
  {
    id: "banco",
    nome: "Banco de posts",
    desc: "Milhares de posts prontos: cada peça com foto vira arte + legenda",
    grupo: "Criar",
    icone: Layers,
    destaque: true,
  },
  {
    id: "fila",
    nome: "Agendamento automático",
    desc: "Escolha as peças e o sistema agenda X por dia nos melhores horários",
    grupo: "Criar",
    icone: Zap,
    destaque: true,
  },
  {
    id: "recomendacoes",
    nome: "Peças para anunciar",
    desc: "Ranking pelo que acontece no site + criador de artes",
    grupo: "Criar",
    icone: Flame,
    destaque: true,
  },
  {
    id: "carrossel",
    nome: "Carrossel por marca",
    desc: "Capa + peças + slide do WhatsApp, de uma vez",
    grupo: "Criar",
    icone: Images,
  },
  {
    id: "capa",
    nome: "Capa de carrossel",
    desc: "Primeiro slide com título e chamada",
    grupo: "Criar",
    icone: PanelTop,
  },
  {
    id: "cta",
    nome: "Slide final (WhatsApp)",
    desc: "Último slide chamando para o WhatsApp",
    grupo: "Criar",
    icone: MessageCircle,
  },
  {
    id: "contagem",
    nome: "Contagem Black Friday",
    desc: "Story com os dias que faltam para 27/11",
    grupo: "Criar",
    icone: Hourglass,
  },
  {
    id: "cupom",
    nome: "Arte de cupom",
    desc: "Story/post com um cupom ativo da loja",
    grupo: "Criar",
    icone: Ticket,
  },
  {
    id: "codigo",
    nome: "«Procura este código?»",
    desc: "Código grande para quem busca pelo número",
    grupo: "Criar",
    icone: Search,
  },
  {
    id: "dica",
    nome: "Dica de manutenção",
    desc: "Arte com uma dica pronta (gera salvamentos)",
    grupo: "Criar",
    icone: Lightbulb,
  },
  {
    id: "pergunta",
    nome: "Story de enquete",
    desc: "Fundo pronto com espaço para a figurinha",
    grupo: "Criar",
    icone: Vote,
  },
  {
    id: "marca",
    nome: "Semana da marca",
    desc: "Post de marca com foto de uma peça dela",
    grupo: "Criar",
    icone: Tag,
  },
  {
    id: "zip",
    nome: "Pacote ZIP",
    desc: "Baixe dezenas de artes + legendas num arquivo",
    grupo: "Criar",
    icone: FileArchive,
  },
  {
    id: "legendas",
    nome: "Gerador de legendas",
    desc: "6 tons para qualquer peça, ES e PT",
    grupo: "Textos",
    icone: Type,
  },
  {
    id: "hashtags",
    nome: "Hashtags",
    desc: "Por marca e categoria, ES e PT",
    grupo: "Textos",
    icone: Hash,
  },
  {
    id: "verificador",
    nome: "Verificador de legenda",
    desc: "Limites do Instagram e frases proibidas",
    grupo: "Textos",
    icone: ShieldCheck,
  },
  {
    id: "comentario",
    nome: "Primeiro comentário",
    desc: "WhatsApp, link e hashtags fora da legenda",
    grupo: "Textos",
    icone: MessagesSquare,
  },
  {
    id: "tradutor",
    nome: "Tradutor de peças",
    desc: "PT ↔ ES com o glossário técnico do site",
    grupo: "Textos",
    icone: Languages,
  },
  {
    id: "reels",
    nome: "Roteiro de Reels",
    desc: "Gancho, problema, solução e chamada em 30 s",
    grupo: "Textos",
    icone: Video,
  },
  {
    id: "respostas",
    nome: "Respostas rápidas",
    desc: "Direct e comentários: preço, envio, pagamento…",
    grupo: "Textos",
    icone: MessageCircle,
  },
  {
    id: "bios",
    nome: "Bio do Instagram",
    desc: "Opções de bio em espanhol e português",
    grupo: "Textos",
    icone: UserSquare,
  },
  {
    id: "dicas",
    nome: "Banco de dicas",
    desc: "Todas as dicas de manutenção para usar",
    grupo: "Textos",
    icone: ListChecks,
  },
  {
    id: "fundo",
    nome: "Remover fundo branco",
    desc: "Peça recortada em PNG transparente",
    grupo: "Imagem",
    icone: Eraser,
  },
  {
    id: "formato",
    nome: "Ajustar ao formato",
    desc: "Qualquer foto em 4:5, 1:1 ou 9:16 sem cortar",
    grupo: "Imagem",
    icone: Crop,
  },
  {
    id: "moldura",
    nome: "Foto com logo",
    desc: "Suas fotos com logo, faixa e frase",
    grupo: "Imagem",
    icone: Frame,
  },
  {
    id: "grade",
    nome: "Prévia do perfil",
    desc: "Como o feed vai ficar com os agendados",
    grupo: "Planejar",
    icone: Grid3x3,
  },
  {
    id: "plano",
    nome: "Plano do mês",
    desc: "30 dias com um tipo de post por dia",
    grupo: "Planejar",
    icone: CalendarRange,
  },
  {
    id: "datas",
    nome: "Datas importantes",
    desc: "Black Friday, Cyber Monday, Natal…",
    grupo: "Planejar",
    icone: CalendarDays,
  },
  {
    id: "horarios",
    nome: "Melhores horários",
    desc: "Quando há mais gente no site",
    grupo: "Planejar",
    icone: Clock,
  },
  {
    id: "whats",
    nome: "Link de WhatsApp",
    desc: "Link com a mensagem já escrita",
    grupo: "Links",
    icone: QrCode,
  },
  {
    id: "utm",
    nome: "Link rastreado (UTM)",
    desc: "Saiba quantas visitas vieram da bio, story ou post",
    grupo: "Links",
    icone: Link2,
  },
  {
    id: "top",
    nome: "Melhores publicações",
    desc: "Ranking por curtidas, comentários, salvos",
    grupo: "Analisar",
    icone: Trophy,
  },
  {
    id: "cobertura",
    nome: "Cobertura do catálogo",
    desc: "Quanto do catálogo já foi mostrado",
    grupo: "Analisar",
    icone: Gauge,
  },
  {
    id: "regioes",
    nome: "Interesse por região",
    desc: "De onde vem o interesse no Uruguai",
    grupo: "Analisar",
    icone: BarChart3,
  },
  {
    id: "orcamento",
    nome: "Orçamento sugerido",
    desc: "Valor por dia pelo custo por clique real",
    grupo: "Anunciar",
    icone: Wallet,
  },
  {
    id: "anuncio",
    nome: "Criar anúncio com arte",
    desc: "Arte → anúncio pausado no Meta (Uruguai)",
    grupo: "Anunciar",
    icone: Megaphone,
  },
];
const GRUPOS: Grupo[] = ["Criar", "Textos", "Imagem", "Planejar", "Links", "Analisar", "Anunciar"];

export function Estudio({
  usarNoPost,
  posts,
  inicial,
}: {
  usarNoPost: (midias: Midia[], legenda: string, tipo: TipoPost, comentario?: string) => void;
  posts: PostInstagram[];
  inicial?: string; // ferramenta aberta pelo menu lateral (?f=banco)
}) {
  const valida = (id?: string) => (FERRAMENTAS.some((x) => x.id === id) ? id! : null);
  const [aberta, setAberta] = useState<string | null>(valida(inicial));
  useEffect(() => setAberta(valida(inicial)), [inicial]);
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["estudio", 30],
    queryFn: () => estudioFn({ data: { dias: 30 } }),
    staleTime: 5 * 60_000,
  });
  const ctx = useMemo(
    () => ({
      usarNoPost,
      posts,
      horarios: data?.horarios,
      abrir: (id: string) => {
        setAberta(id);
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
    }),
    [usarNoPost, posts, data?.horarios],
  );
  const f = FERRAMENTAS.find((x) => x.id === aberta);
  const termo = q.trim().toLowerCase();
  const lista = FERRAMENTAS.filter(
    (x) => !termo || `${x.nome} ${x.desc} ${x.grupo}`.toLowerCase().includes(termo),
  );

  return (
    <EstudioCtx.Provider value={ctx}>
      {f ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setAberta(null)}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-semibold hover:bg-muted"
            >
              <ArrowLeft className="h-4 w-4" /> Ferramentas
            </button>
            <f.icone className="h-5 w-5 text-primary" />
            <div>
              <h2 className="font-bold leading-tight">{f.nome}</h2>
              <p className="text-xs text-muted-foreground">{f.desc}</p>
            </div>
          </div>
          <Abrir id={f.id} usarNoPost={usarNoPost} data={data} />
        </div>
      ) : (
        <div className="space-y-5">
          <Card className="overflow-hidden border-0 bg-gradient-to-br from-zinc-950 via-zinc-900 to-amber-900 p-5 text-white">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1">
                <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-300">
                  <Sparkles className="h-4 w-4" /> Estúdio AGRO PARTS
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {FERRAMENTAS.length} ferramentas para criar, planejar e anunciar
                </h2>
                <p className="mt-1 text-sm text-zinc-300">
                  Cada peça do catálogo com foto própria já é um post pronto, com arte e legenda em
                  espanhol e português.
                </p>
              </div>
              <button
                onClick={() => setAberta("banco")}
                className="rounded-xl bg-amber-400 px-5 py-3 text-sm font-black text-zinc-900 shadow-lg hover:bg-amber-300"
              >
                Abrir o banco de posts →
              </button>
            </div>
          </Card>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Procurar entre as ${FERRAMENTAS.length} ferramentas…`}
            className="max-w-md"
          />
          {GRUPOS.map((g) => {
            const fs = lista.filter((x) => x.grupo === g);
            if (!fs.length) return null;
            return (
              <section key={g}>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {g} <span className="font-normal">({fs.length})</span>
                </h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                  {fs.map((x) => (
                    <button
                      key={x.id}
                      onClick={() => setAberta(x.id)}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border bg-card p-3 text-left transition hover:-translate-y-0.5 hover:border-primary hover:shadow-md",
                        x.destaque && "border-primary/40 bg-primary/5",
                      )}
                    >
                      <span
                        className={cn(
                          "rounded-lg p-2",
                          x.destaque ? "bg-primary text-primary-foreground" : "bg-muted",
                        )}
                      >
                        <x.icone className="h-5 w-5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-bold">{x.nome}</span>
                        <span className="block text-xs text-muted-foreground">{x.desc}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </EstudioCtx.Provider>
  );
}

function Abrir({ id, usarNoPost, data }: { id: string; usarNoPost: any; data: any }) {
  switch (id) {
    case "importar":
      return <Importar />;
    case "banco":
      return <Banco />;
    case "fila":
      return <Banco key="fila" modo="fila" />;
    case "zip":
      return <Banco key="zip" modo="zip" />;
    case "recomendacoes":
    case "anuncio":
      return (
        <>
          {id === "anuncio" && (
            <p className="rounded-lg bg-sky-50 p-3 text-sm text-sky-900">
              Escolha a peça, monte a arte e clique em «Criar anúncio com esta arte» (público
              Uruguai, criado pausado).
            </p>
          )}
          <PainelRecomendacoes usarNoPost={usarNoPost} />
        </>
      );
    case "carrossel":
      return <Carrossel />;
    case "capa":
    case "cta":
    case "contagem":
    case "cupom":
    case "codigo":
    case "dica":
    case "pergunta":
    case "marca":
      return <ArteTexto key={id} preset={id} />;
    case "legendas":
      return <F.Legendas />;
    case "hashtags":
      return <F.Hashtags />;
    case "verificador":
      return <F.Verificador />;
    case "comentario":
      return <F.PrimeiroComentario />;
    case "tradutor":
      return <F.Tradutor />;
    case "reels":
      return <F.Reels />;
    case "respostas":
      return <F.Respostas />;
    case "bios":
      return <F.Bios />;
    case "dicas":
      return <F.Dicas />;
    case "fundo":
      return <F.RemoverFundo />;
    case "formato":
      return <F.AjustarFormato />;
    case "confianca":
      return <Confianca />;
    case "campo":
      return <LinhaCampo />;
    case "moldura":
      return <F.Moldura />;
    case "grade":
      return <F.GradeFeed />;
    case "plano":
      return <F.PlanoMes />;
    case "datas":
      return <F.Datas />;
    case "horarios":
      return (
        <div className="max-w-xl">
          <Horarios h={data?.horarios} />
        </div>
      );
    case "regioes":
    case "orcamento":
      return (
        <div className="max-w-xl">
          <Orcamento o={data?.orcamento} recs={data?.produtos ?? []} />
        </div>
      );
    case "whats":
      return <F.LinkWhats />;
    case "utm":
      return <F.LinkUtm />;
    case "top":
      return <F.TopPosts />;
    case "cobertura":
      return <F.Cobertura />;
    default:
      return null;
  }
}
