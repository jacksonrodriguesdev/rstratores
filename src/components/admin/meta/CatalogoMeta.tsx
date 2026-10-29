import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  ExternalLink,
  ShoppingBag,
  Users,
  MousePointerClick,
  MessageCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { catalogoMetaFn } from "@/lib/meta-ads";
import { cn } from "@/lib/utils";

const n = (v: number) => v.toLocaleString("pt-BR");

// Aba Catálogo (Meta Ads): anúncios que mostram ao visitante a peça exata que ele viu no site.
// Funciona com quem nunca se cadastrou (o Pixel reconhece a pessoa). Só Uruguai.
export function CatalogoMeta({ dias }: { dias: number }) {
  const { data, isLoading } = useQuery({
    queryKey: ["catalogo-meta", dias],
    queryFn: () => catalogoMetaFn({ data: { dias } }),
  });
  const [copiado, setCopiado] = useState(false);
  const copiar = (t: string) =>
    navigator.clipboard?.writeText(t).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1800);
    });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  const ok = (b: boolean) =>
    b ? (
      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
    ) : (
      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
    );

  const passos: Array<[string, React.ReactNode]> = [
    [
      "Criar o catálogo",
      <>
        No{" "}
        <a
          href="https://business.facebook.com/commerce"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-primary underline"
        >
          Gerenciador de Commerce
        </a>
        : <b>Criar catálogo</b> → <b>E-commerce</b> → nome «AGRO PARTS Uruguay».
      </>,
    ],
    [
      "Ligar o feed",
      <>
        No catálogo: <b>Fontes de dados</b> → <b>Adicionar itens</b> → <b>Feed de dados</b> →{" "}
        <b>Agendar feed</b>. Cole o endereço do feed (acima), atualização <b>diária</b>, moeda{" "}
        <b>UYU</b>. O Meta lê o arquivo sozinho todo dia: preço e foto ficam sempre iguais aos do
        site.
      </>,
    ],
    [
      "Conectar o Pixel",
      <>
        No catálogo: <b>Configurações</b> → <b>Fontes de eventos</b> → marque o Pixel
        {data.pixel ? (
          <>
            {" "}
            <b className="font-mono">{data.pixel}</b>
          </>
        ) : null}
        . Em 1 ou 2 dias, o <b>Gerenciador de Eventos</b> mostra a «correspondência» dos códigos
        (ViewContent e AddToCart com os mesmos códigos do feed).
      </>,
    ],
    [
      "Criar a campanha",
      <>
        No Gerenciador de Anúncios: campanha de <b>Vendas</b> com <b>catálogo</b> ligado → público{" "}
        <b>
          «Redirecionar anúncios a pessoas que viram ou adicionaram ao carrinho, mas não compraram»
        </b>
        , últimos <b>14 dias</b>.
      </>,
    ],
    [
      "Só Uruguai",
      <>
        Localização: <b>Uruguai</b>, opção <b>«Pessoas que moram neste local»</b>. Assim o anúncio
        não aparece para quem visitou o site de fora.
      </>,
    ],
    [
      "Anúncio dinâmico",
      <>
        Formato <b>carrossel</b> com o catálogo. Texto sugerido: «¿Seguís buscando esta pieza? Te
        confirmamos precio y si sirve para tu tractor por WhatsApp.» Orçamento inicial pequeno (ex.:
        US$ 5/dia) e acompanhe abaixo em «Retorno do catálogo».
      </>,
    ],
  ];

  return (
    <div className="space-y-5">
      <Card className="space-y-3 p-5">
        <h2 className="flex items-center gap-2 font-semibold">
          <ShoppingBag className="h-5 w-5 text-primary" /> Anúncios da peça vista (catálogo)
        </h2>
        <p className="text-sm text-muted-foreground">
          Quem viu a bomba hidráulica MF 290 e saiu sem pedir passa a ver essa peça no Instagram e
          no Facebook. Funciona com quem nunca se cadastrou: o Pixel reconhece a pessoa pela visita.
          O feed é o mesmo do Google Shopping, adaptado ao Meta (só Uruguai, em pesos).
        </p>
        <div className="grid gap-2 md:grid-cols-3">
          <div className="flex items-start gap-2 rounded-lg border p-3 text-sm">
            {ok(data.feedItens > 0)}
            <div>
              <p className="font-semibold">Feed: {n(data.feedItens)} peças</p>
              <p className="text-xs text-muted-foreground">
                {data.feedItens > 0
                  ? "Só entram peças com preço e foto."
                  : "Vazio: ligue «mostrar preços no site» e confira as fotos."}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg border p-3 text-sm">
            {ok(!!data.pixel)}
            <div>
              <p className="font-semibold">Pixel {data.pixel ? "ligado" : "não configurado"}</p>
              <p className="text-xs text-muted-foreground">
                Cada peça aberta manda o código dela ao Meta (ViewContent).
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2 rounded-lg border p-3 text-sm">
            {ok(data.retorno.visitas > 0)}
            <div>
              <p className="font-semibold">
                {data.retorno.visitas > 0
                  ? "Anúncios trazendo visitas"
                  : "Campanha ainda não ativa"}
              </p>
              <p className="text-xs text-muted-foreground">
                Detectado pelo utm do feed (catalogo_meta).
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 p-2.5">
          <code className="min-w-0 flex-1 truncate text-xs">{data.feedUrl}</code>
          <button
            onClick={() => copiar(data.feedUrl)}
            className="inline-flex h-8 items-center gap-1 rounded-md border bg-background px-2.5 text-xs font-semibold"
          >
            {copiado ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}{" "}
            {copiado ? "Copiado" : "Copiar endereço"}
          </button>
          <a
            href={data.feedUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1 rounded-md border bg-background px-2.5 text-xs font-semibold"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Abrir
          </a>
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Como ligar (uma vez só)</h3>
          <ol className="space-y-3">
            {passos.map(([titulo, txt], i) => (
              <li key={titulo} className="flex gap-3 text-sm">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <span>
                  <b className="block">{titulo}</b>
                  <span className="text-muted-foreground">{txt}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>

        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="mb-3 font-semibold">Público e retorno · {data.dias} dias</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {(
                [
                  [Users, "Viram peças no Uruguai", data.publico.viram],
                  [Users, "Viram e não pediram nada", data.publico.semPedido],
                  [MousePointerClick, "Visitas vindas do catálogo", data.retorno.visitas],
                  [MessageCircle, "Pedidos dessas visitas", data.retorno.conversas],
                ] as const
              ).map(([I, rotulo, v]) => (
                <div key={rotulo} className="rounded-lg border p-3">
                  <I className="h-4 w-4 text-primary" />
                  <p className="mt-1 text-xl font-bold">{n(v)}</p>
                  <p className="text-xs text-muted-foreground">{rotulo}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              «Viram e não pediram» é o público que o anúncio do catálogo vai buscar (o Meta alcança
              uma parte: quem tem conta no Facebook/Instagram e aceitou os cookies).
            </p>
          </Card>
          <Card className="overflow-hidden p-0">
            <h3 className="border-b p-4 font-semibold">Peças mais vistas sem pedido</h3>
            <ul className="divide-y text-sm">
              {data.pecas.map((p) => (
                <li key={p.sku} className="flex items-center gap-3 px-4 py-2">
                  <span className="min-w-0 flex-1">
                    <a
                      href={`/produto/${encodeURIComponent(p.sku)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate font-medium hover:text-primary"
                    >
                      {p.nome}
                    </a>
                    <span className="font-mono text-[11px] text-muted-foreground">{p.sku}</span>
                    {!p.noFeed && (
                      <span className="ml-2 text-[11px] font-semibold text-amber-700">
                        sem foto: fora do catálogo
                      </span>
                    )}
                  </span>
                  <span className={cn("text-xs font-bold", p.pessoas > 1 && "text-primary")}>
                    {n(p.pessoas)} {p.pessoas === 1 ? "pessoa" : "pessoas"}
                  </span>
                </li>
              ))}
              {!data.pecas.length && (
                <li className="p-4 text-center text-muted-foreground">Sem visitas no período.</li>
              )}
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}
