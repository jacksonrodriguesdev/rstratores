import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Bell,
  BellRing,
  Download,
  Loader2,
  MousePointerClick,
  Send,
  Smartphone,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { painelPushFn, enviarPushFn } from "@/lib/push";
import { ativarAvisos, estadoAvisos, type EstadoAvisos } from "@/lib/app-pwa";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/push")({
  component: PushAdmin,
});

const fmt = (n: number) => n.toLocaleString("pt-BR");
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
const ORIGEM: Record<string, string> = {
  admin: "Enviado por aqui",
  teste: "Teste",
  aviso_preco: "Baixou o preço",
};

function PushAdmin() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["push-admin"], queryFn: () => painelPushFn() });
  const [f, setF] = useState({
    titulo: "",
    texto: "",
    url: "/pt",
    imagem: "",
    idioma: "pt" as "es" | "pt",
  });
  const [enviando, setEnviando] = useState<null | "teste" | "todos">(null);
  const [meu, setMeu] = useState<EstadoAvisos>("indisponivel");
  useEffect(() => {
    void estadoAvisos().then(setMeu);
  }, []);

  const inscritosIdioma = data ? data.inscritos[f.idioma] : 0;
  const enviar = async (teste: boolean) => {
    if (
      !teste &&
      !confirm(`Mandar para ${inscritosIdioma} aparelho(s) (${f.idioma.toUpperCase()})?`)
    )
      return;
    setEnviando(teste ? "teste" : "todos");
    try {
      const r = await enviarPushFn({ data: { ...f, teste } });
      if (!r.total)
        toast.warning(
          teste
            ? "Nenhum aparelho seu com avisos ativados. Ative neste aparelho (logado) e tente de novo."
            : "Ninguém inscrito neste idioma ainda.",
        );
      else toast.success(`Enviado para ${r.enviados} de ${r.total} aparelho(s).`);
      qc.invalidateQueries({ queryKey: ["push-admin"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível enviar.");
    } finally {
      setEnviando(null);
    }
  };

  const cards = data
    ? [
        { label: "Inscritos ES (Uruguai)", valor: data.inscritos.es, icon: Bell },
        { label: "Inscritos PT (Brasil)", valor: data.inscritos.pt, icon: Bell },
        { label: "Inscritos com conta", valor: data.inscritos.logados, icon: Users },
        { label: "Instalaram o app (30 dias)", valor: data.app.instalaram, icon: Download },
        { label: "Aberturas pelo app (30 dias)", valor: data.app.aberturas, icon: Smartphone },
        {
          label: "Ativaram avisos (30 dias)",
          valor: data.app.ativaramAvisos,
          sub: `${fmt(data.app.recusaramAvisos)} recusaram`,
          icon: BellRing,
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Smartphone className="h-6 w-6 text-primary" /> App e notificações
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          O site instala como app no celular (Android e iPhone). Quem ativa os avisos recebe
          notificações: automáticas quando baixa o preço de uma peça que pediu para acompanhar, e as
          que você mandar daqui. No iPhone, só com o app instalado (iOS 16.4 ou mais novo).
        </p>
      </div>

      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {cards.map((c) => (
            <Card key={c.label} className="p-4">
              <c.icon className="h-4 w-4 text-primary" />
              <p className="mt-2 text-2xl font-bold">{fmt(c.valor)}</p>
              <p className="text-xs text-muted-foreground">{c.label}</p>
              {c.sub && <p className="text-[11px] text-muted-foreground/80">{c.sub}</p>}
            </Card>
          ))}
        </div>
      )}

      {data?.funilApp && <FunilApp f={data.funilApp} />}

      <div className="grid gap-6 xl:grid-cols-[440px_1fr]">
        <Card className="h-fit space-y-3 p-5">
          <h2 className="font-semibold">Nova notificação</h2>
          <div className="flex gap-2">
            {(["pt", "es"] as const).map((i) => (
              <button
                key={i}
                type="button"
                onClick={() =>
                  setF((x) => ({
                    ...x,
                    idioma: i,
                    url: x.url === "/pt" || x.url === "/" ? (i === "pt" ? "/pt" : "/") : x.url,
                  }))
                }
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-semibold",
                  f.idioma === i ? "border-primary bg-primary text-white" : "bg-white",
                )}
              >
                {i === "pt" ? "Português (Brasil)" : "Español (Uruguay)"}
              </button>
            ))}
          </div>
          <label className="block text-xs font-medium">
            Título ({f.titulo.length}/60 recomendado)
            <Input
              value={f.titulo}
              maxLength={120}
              onChange={(e) => setF({ ...f, titulo: e.target.value })}
              placeholder={
                f.idioma === "pt"
                  ? "Pré Black Friday: até 15% off"
                  : "Pre Black Friday: hasta 15% off"
              }
            />
          </label>
          <label className="block text-xs font-medium">
            Texto
            <Textarea
              value={f.texto}
              maxLength={300}
              rows={3}
              onChange={(e) => setF({ ...f, texto: e.target.value })}
              placeholder={
                f.idioma === "pt"
                  ? "Peças de transmissão com desconto até domingo. Toque para ver."
                  : "Repuestos de transmisión con descuento hasta el domingo. Tocá para ver."
              }
            />
          </label>
          <label className="block text-xs font-medium">
            Abre a página (caminho do site)
            <Input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} />
          </label>
          <label className="block text-xs font-medium">
            Imagem grande (opcional, link https; aparece no Android)
            <Input value={f.imagem} onChange={(e) => setF({ ...f, imagem: e.target.value })} />
          </label>

          <div className="rounded-lg border bg-muted/40 p-3">
            <p className="text-[11px] font-semibold uppercase text-muted-foreground">Prévia</p>
            <div className="mt-2 flex gap-3 rounded-lg bg-white p-3 shadow-sm">
              <img src="/icon-192.png" alt="" className="h-9 w-9 rounded-md" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{f.titulo || "Título"}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{f.texto || "Texto"}</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={!!enviando || !f.titulo}
              onClick={() => enviar(true)}
            >
              {enviando === "teste" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Bell className="mr-2 h-4 w-4" />
              )}
              Testar no meu aparelho
            </Button>
            <Button
              disabled={!!enviando || !f.titulo || !inscritosIdioma}
              onClick={() => enviar(false)}
            >
              {enviando === "todos" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4" />
              )}
              Enviar para {fmt(inscritosIdioma)}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {meu === "ativo"
              ? "Este aparelho está com avisos ativados: o teste chega aqui."
              : meu === "pode"
                ? null
                : meu === "instalar_ios"
                  ? "No iPhone, instale o app (Compartilhar → Adicionar à Tela de Início) para testar."
                  : meu === "negado"
                    ? "Os avisos estão bloqueados neste navegador."
                    : "Este navegador não recebe notificações."}
          </p>
          {meu === "pode" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                try {
                  setMeu(await ativarAvisos("pt"));
                } catch {
                  toast.error("Não foi possível ativar.");
                }
              }}
            >
              <BellRing className="mr-2 h-4 w-4" /> Ativar avisos neste aparelho (para testar)
            </Button>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 font-semibold">Envios</h2>
          {!data?.envios.length ? (
            <p className="text-sm text-muted-foreground">Nenhuma notificação enviada ainda.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Quando</th>
                    <th className="py-2 pr-3">Notificação</th>
                    <th className="py-2 pr-3 text-right">Entregues</th>
                    <th className="py-2 text-right">
                      <MousePointerClick className="ml-auto h-3.5 w-3.5" />
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {data.envios.map((e) => (
                    <tr key={e.id}>
                      <td className="whitespace-nowrap py-2 pr-3 text-xs text-muted-foreground">
                        {new Date(e.created_at).toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        <br />
                        {ORIGEM[e.origem] ?? e.origem}
                        {e.idioma && e.idioma !== "todos" ? ` · ${e.idioma.toUpperCase()}` : ""}
                      </td>
                      <td className="py-2 pr-3">
                        <p className="font-medium">{e.titulo}</p>
                        {e.texto && (
                          <p className="line-clamp-1 text-xs text-muted-foreground">{e.texto}</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3 text-right">
                        {fmt(e.enviados)}/{fmt(e.total)}
                        {e.falhas > 0 && (
                          <p className="text-[11px] text-destructive">{fmt(e.falhas)} falhas</p>
                        )}
                      </td>
                      <td className="whitespace-nowrap py-2 text-right">
                        {fmt(e.cliques)}
                        <p className="text-[11px] text-muted-foreground">
                          {pct(e.cliques, e.enviados)}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

type Funil = Awaited<ReturnType<typeof painelPushFn>>["funilApp"];
const MOTIVO: Record<string, string> = {
  visita_repetida: "Voltou ao site (2ª visita)",
  whatsapp: "Depois de chamar no WhatsApp",
  aviso_preco: "Depois do aviso de preço",
  cadastro: "Depois de criar a conta",
};
const ORIGEM_INSTALAR: Record<string, string> = {
  barra: "Barra na hora certa",
  pagina: "Página do app",
  rodape: "Rodapé",
  navegador: "Menu do navegador",
};
const PLATAFORMA: Record<string, string> = {
  instalavel: "Android/computador (botão Instalar)",
  ios_safari: "iPhone no Safari (passo a passo)",
  ios_outro: "iPhone em outro navegador (abrir no Safari)",
  android: "Android sem botão (menu do navegador)",
  computador: "Computador (QR code)",
  app: "Já no app",
};

// Como as pessoas chegam ao app, últimos 30 dias, em pessoas (aparelhos)
function FunilApp({ f }: { f: Funil }) {
  const passos = [
    ["Viram a barra «Instale o app»", "viramBarra"],
    ["Tocaram na barra", "tocaramBarra"],
    ["Abriram a página do app", "viramPagina"],
    ["Tocaram em Instalar (Android/computador)", "tocaramInstalar"],
    ["Viram o passo a passo do iPhone", "instrucoesIos"],
    ["Instalaram (Android/computador)", "instalaram"],
    ["Abriram pelo app", "abriramApp"],
    ["Ativaram os avisos", "ativaramAvisos"],
  ] as const;
  const lista = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1]);
  return (
    <Card className="p-5">
      <h2 className="font-semibold">Como as pessoas chegam ao app</h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Últimos 30 dias, em pessoas (aparelhos). Uruguai = páginas em espanhol (instala o app em
        espanhol); Brasil = páginas /pt (instala o app em português). No iPhone o navegador não
        avisa a instalação: ela aparece em «Abriram pelo app».
      </p>
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="py-1.5 pr-3">Etapa</th>
              <th className="py-1.5 pr-3 text-right">🇺🇾 Uruguai</th>
              <th className="py-1.5 text-right">🇧🇷 Brasil</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {passos.map(([rotulo, k]) => (
              <tr key={k}>
                <td className="py-1.5 pr-3">{rotulo}</td>
                <td className="py-1.5 pr-3 text-right font-semibold">{fmt(f.porIdioma.es[k])}</td>
                <td className="py-1.5 text-right font-semibold">{fmt(f.porIdioma.pt[k])}</td>
              </tr>
            ))}
            <tr>
              <td className="py-1.5 pr-3 text-muted-foreground">Fecharam a barra («Agora não»)</td>
              <td className="py-1.5 pr-3 text-right text-muted-foreground">
                {fmt(f.porIdioma.es.fecharamBarra)}
              </td>
              <td className="py-1.5 text-right text-muted-foreground">
                {fmt(f.porIdioma.pt.fecharamBarra)}
              </td>
            </tr>
          </tbody>
        </table>
        <div className="space-y-5 text-sm">
          <div>
            <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">
              Barra: em que momento aparece
            </p>
            <table className="w-full">
              <thead className="text-left text-[11px] uppercase text-muted-foreground">
                <tr>
                  <th className="py-1 pr-2">Momento</th>
                  <th className="py-1 pr-2 text-right">Viram</th>
                  <th className="py-1 pr-2 text-right">Tocaram</th>
                  <th className="py-1 text-right">Fecharam</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {f.porMotivo.map((m) => (
                  <tr key={m.motivo}>
                    <td className="py-1 pr-2">{MOTIVO[m.motivo]}</td>
                    <td className="py-1 pr-2 text-right">{fmt(m.vistas)}</td>
                    <td className="py-1 pr-2 text-right">
                      {fmt(m.toques)}{" "}
                      <span className="text-[11px] text-muted-foreground">
                        {pct(m.toques, m.vistas)}
                      </span>
                    </td>
                    <td className="py-1 text-right">{fmt(m.fechou)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">
                Instalaram por
              </p>
              {!Object.keys(f.origens).length ? (
                <p className="text-xs text-muted-foreground">Ainda nenhuma.</p>
              ) : (
                lista(f.origens).map(([o, n]) => (
                  <p key={o} className="flex justify-between gap-2">
                    <span>{ORIGEM_INSTALAR[o] ?? o}</span> <b>{fmt(n)}</b>
                  </p>
                ))
              )}
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase text-muted-foreground">
                Aparelho de quem abriu a página
              </p>
              {!Object.keys(f.plataformas).length ? (
                <p className="text-xs text-muted-foreground">Ainda nenhum.</p>
              ) : (
                lista(f.plataformas).map(([p, n]) => (
                  <p key={p} className="flex justify-between gap-2 text-xs">
                    <span>{PLATAFORMA[p] ?? p}</span> <b>{fmt(n)}</b>
                  </p>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
