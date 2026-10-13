import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plug, CheckCircle2, Circle, Loader2, FlaskConical, ChevronDown, ExternalLink, AlertTriangle, Activity } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { obterIntegracoesFn, salvarIntegracoesFn, testarMetaFn, testarGA4Fn } from "@/lib/marketing-admin";
import type { ChaveMkt } from "@/lib/marketing-config.server";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/marketing")({
  component: IntegracoesPage,
});

type Campo = { k: ChaveMkt; rotulo: string; dica?: string; placeholder?: string; segredo?: boolean };

const META: Campo[] = [
  { k: "mkt_meta_pixel_id", rotulo: "ID do Pixel (conjunto de dados)", placeholder: "123456789012345" },
  { k: "mkt_meta_capi_token", rotulo: "Token da API de Conversões", placeholder: "EAAB…", segredo: true, dica: "Fica só no servidor; nunca aparece no site." },
  { k: "mkt_meta_test_code", rotulo: "Código de teste (opcional)", placeholder: "TEST12345", dica: "Enquanto preenchido, os eventos do servidor aparecem em “Testar eventos”. Apague depois de conferir." },
  { k: "mkt_meta_dominio", rotulo: "Verificação do domínio (opcional)", placeholder: "abc123xyz…", dica: "Só o código do content=\"…\" da meta tag facebook-domain-verification." },
];
const GOOGLE: Campo[] = [
  { k: "mkt_ga4_id", rotulo: "Google Analytics 4 (ID de medição)", placeholder: "G-XXXXXXXXXX" },
  { k: "mkt_ga4_api_secret", rotulo: "GA4: segredo da API (Measurement Protocol)", segredo: true, dica: "Para as vendas fechadas no WhatsApp entrarem como compra no Analytics." },
  { k: "mkt_gtm_id", rotulo: "Google Tag Manager (opcional)", placeholder: "GTM-XXXXXXX" },
  { k: "mkt_gads_id", rotulo: "Google Ads: ID da tag", placeholder: "AW-123456789" },
  { k: "mkt_gads_label_lead", rotulo: "Google Ads: rótulo da conversão “Lead (WhatsApp)”", placeholder: "AbCdEfGhIj" },
  { k: "mkt_gads_label_cadastro", rotulo: "Google Ads: rótulo da conversão “Cadastro”", placeholder: "KlMnOpQrSt" },
  { k: "mkt_google_verificacao", rotulo: "Search Console / Merchant: verificação (opcional)", dica: "Só o código do content=\"…\" da meta tag google-site-verification." },
  { k: "mkt_merchant_id", rotulo: "Merchant Center: ID da conta (Fase 2)", placeholder: "123456789" },
  { k: "mkt_clarity_id", rotulo: "Microsoft Clarity: ID do projeto", placeholder: "abc123xyz9", dica: "Grava cada visita (mouse, cliques, rolagem) e mostra mapas de calor. Grátis em clarity.microsoft.com → Novo projeto → Configurações → ID do projeto." },
];

const PASSOS_META = [
  "Entre em business.facebook.com com a conta que administra a Página do AGRO PARTS (se ainda não tem um portfólio empresarial, crie: é grátis).",
  "Gerenciador de Eventos → “Conectar fontes de dados” → Web → dê o nome “AGRO PARTS” e crie. O número que aparece é o ID do Pixel: cole acima.",
  "No mesmo conjunto de dados: Configurações → “API de Conversões” → “Gerar token de acesso”. Copie e cole no campo do token.",
  "Para conferir: aba “Testar eventos” → copie o código TEST… para o campo “Código de teste”, salve e clique em “Enviar evento de teste”.",
  "Configurações do negócio → Segurança da marca → Domínios → adicione agropartsuy.com → “Meta tag” → copie só o código e cole em “Verificação do domínio”. Salve e clique em Verificar lá.",
  "Para anunciar: Configurações do negócio → Contas de anúncios → Adicionar → Criar conta (moeda UYU ou USD, fuso America/Montevideo). Ligue a conta ao Pixel. (O painel de Ads usa isso na Fase 3.)",
];
const PASSOS_GOOGLE = [
  "GA4 já está ligado (G-M8WS1HTBES). Para as vendas do WhatsApp: Analytics → Administrador → Fluxos de dados → o site → “Chaves secretas da API do Measurement Protocol” → Criar → cole o valor acima.",
  "Google Ads → Metas → Conversões → Nova ação de conversão → Site → “Lead” (ex.: “WhatsApp”) → “Usar a tag do Google” → copie o AW-… e o rótulo (send_to: AW-…/rótulo). Repita para “Cadastro”.",
  "Ligue o GA4 ao Google Ads (Analytics → Administrador → Vinculações de produtos) para usar os públicos de remarketing do site nas campanhas.",
  "Search Console (search.google.com/search-console) → Adicionar propriedade → Prefixo do URL → https://agropartsuy.com → Tag HTML → cole só o código acima.",
];

function IntegracoesPage() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["integracoes"], queryFn: () => obterIntegracoesFn(), refetchInterval: 30_000 });
  const [v, setV] = useState<Partial<Record<ChaveMkt, string>>>({});
  const [salvando, setSalvando] = useState(false);
  const [testando, setTestando] = useState<"" | "meta" | "ga4">("");
  useEffect(() => {
    if (data) setV(data.valores);
  }, [data?.valores]); // eslint-disable-line react-hooks/exhaustive-deps

  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarIntegracoesFn({ data: v });
      toast.success("Integrações salvas. As tags do site atualizam em até 5 minutos.");
      qc.invalidateQueries({ queryKey: ["integracoes"] });
    } catch (e: any) {
      toast.error(e?.message);
    } finally {
      setSalvando(false);
    }
  };
  const testar = async (qual: "meta" | "ga4") => {
    setTestando(qual);
    try {
      const r = qual === "meta" ? await testarMetaFn() : await testarGA4Fn();
      if (r.ok) toast.success(qual === "meta" ? "Evento de teste recebido pelo Meta. Confira em “Testar eventos”." : "Evento enviado ao GA4 (aparece em Tempo real / DebugView).");
      else toast.error(r.detalhe);
      qc.invalidateQueries({ queryKey: ["integracoes"] });
    } finally {
      setTestando("");
    }
  };

  const st = data?.status;
  const statusLista = [
    { ok: st?.pixel, rotulo: "Meta Pixel", sub: "eventos no navegador" },
    { ok: st?.capi, rotulo: "API de Conversões", sub: "eventos pelo servidor" },
    { ok: st?.ga4, rotulo: "Google Analytics 4", sub: "visitas e eventos" },
    { ok: st?.ga4Servidor, rotulo: "GA4 pelo servidor", sub: "vendas do WhatsApp" },
    { ok: st?.gads, rotulo: "Google Ads", sub: "conversões" },
    { ok: st?.gtm, rotulo: "Tag Manager", sub: "opcional" },
    { ok: st?.clarity, rotulo: "Clarity", sub: "gravações de tela" },
  ];

  const campos = (lista: Campo[]) =>
    lista.map((c) => {
      const travado = data?.doAmbiente.includes(c.k);
      return (
        <label key={c.k} className="block">
          <span className="text-xs font-semibold text-muted-foreground">{c.rotulo}</span>
          <Input
            className="mt-1 font-mono text-sm"
            type={c.segredo ? "password" : "text"}
            autoComplete="off"
            disabled={travado}
            placeholder={c.placeholder}
            value={v[c.k] ?? ""}
            onFocus={(e) => c.segredo && e.target.value.startsWith("••••") && setV({ ...v, [c.k]: "" })}
            onChange={(e) => setV({ ...v, [c.k]: e.target.value })}
          />
          {travado && <span className="text-[11px] text-amber-700">Definido por variável de ambiente na Hostinger.</span>}
          {c.dica && <span className="mt-0.5 block text-[11px] text-muted-foreground">{c.dica}</span>}
        </label>
      );
    });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><Plug className="h-6 w-6 text-primary" /> Integrações de marketing</h1>
          <p className="mt-1 text-sm text-muted-foreground">Meta (Instagram/Facebook) e Google: rastreio do site, conversões e verificação. Mudou aqui, o site atualiza sozinho.</p>
        </div>
        <Button size="lg" onClick={salvar} disabled={salvando || !data}>{salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />} Salvar</Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {statusLista.map((s) => (
          <Card key={s.rotulo} className={cn("flex items-center gap-3 p-3", s.ok ? "border-emerald-200 bg-emerald-50/50" : "")}>
            {s.ok ? <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" /> : <Circle className="h-5 w-5 shrink-0 text-zinc-300" />}
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{s.rotulo}</p><p className="text-[11px] text-muted-foreground">{s.ok ? "ligado" : "não configurado"} · {s.sub}</p></div>
          </Card>
        ))}
      </div>
      {st?.testeMeta && (
        <p className="flex items-center gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="h-4 w-4" /> Modo teste do Meta ligado: apague o “Código de teste” quando terminar de conferir, senão as conversões reais não entram nos relatórios.</p>
      )}

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-semibold"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#1877F2] text-xs font-black text-white">f</span> Meta (Instagram e Facebook)</h2>
            <Button size="sm" variant="outline" onClick={() => testar("meta")} disabled={!st?.capi || testando !== ""}>
              {testando === "meta" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FlaskConical className="mr-1.5 h-4 w-4" />} Enviar evento de teste
            </Button>
          </div>
          {campos(META)}
          <Passos titulo="Passo a passo: criar o Pixel e o token" passos={PASSOS_META} link="https://business.facebook.com/events_manager2" />
          <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
            <b className="text-foreground">O que o site envia ao Meta:</b> PageView, ViewContent (peça), Search, AddToCart (carrinho),
            Lead (pedido pelo WhatsApp: navegador + servidor), CompleteRegistration (cadastro) e Purchase quando você marca um carrinho
            como “Ganho” com valor em $U. E-mail e telefone vão criptografados (SHA-256).
          </div>
        </Card>

        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 font-semibold"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-sm font-black ring-1 ring-black/10"><span className="text-[#4285F4]">G</span></span> Google (Analytics, Ads, Search Console)</h2>
            <Button size="sm" variant="outline" onClick={() => testar("ga4")} disabled={!st?.ga4Servidor || testando !== ""}>
              {testando === "ga4" ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <FlaskConical className="mr-1.5 h-4 w-4" />} Testar GA4
            </Button>
          </div>
          {campos(GOOGLE)}
          <Passos titulo="Passo a passo: Google" passos={PASSOS_GOOGLE} link="https://analytics.google.com" />
        </Card>
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b p-4">
          <h2 className="flex items-center gap-2 font-semibold"><Activity className="h-4 w-4 text-primary" /> Eventos enviados pelo servidor</h2>
          <div className="flex flex-wrap gap-2 text-xs">
            {data?.resumo.map((r) => (
              <span key={r.plataforma + r.evento} className="rounded-full bg-muted px-2.5 py-1">
                {r.plataforma} · {r.evento}: <b className="text-emerald-700">{r.ok}</b>{r.falha ? <> · <b className="text-red-600">{r.falha} falha(s)</b></> : null}
              </span>
            ))}
            {data && !data.resumo.length && <span className="text-muted-foreground">Nenhum nos últimos 7 dias.</span>}
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/60 text-left text-xs uppercase text-muted-foreground">
              <tr><th className="px-4 py-2">Quando</th><th className="px-4 py-2">Plataforma</th><th className="px-4 py-2">Evento</th><th className="px-4 py-2">Resultado</th></tr>
            </thead>
            <tbody className="divide-y">
              {data?.eventos.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap px-4 py-2 text-xs">{new Date(e.quando).toLocaleString("pt-BR")}</td>
                  <td className="px-4 py-2 text-xs font-semibold">{e.plataforma}{e.teste && <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] text-amber-800">teste</span>}</td>
                  <td className="px-4 py-2">{e.evento}</td>
                  <td className={cn("px-4 py-2 text-xs", e.ok ? "text-emerald-700" : "text-red-600")}>{e.ok ? "✓ " : "✕ "}{e.detalhe}</td>
                </tr>
              ))}
              {data && !data.eventos.length && <tr><td colSpan={4} className="p-6 text-center text-muted-foreground">Ainda nada: configure a API de Conversões ou o GA4 pelo servidor.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function Passos({ titulo, passos, link }: { titulo: string; passos: string[]; link: string }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="rounded-lg border">
      <button onClick={() => setAberto(!aberto)} className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-semibold">
        {titulo} <ChevronDown className={cn("h-4 w-4 transition", aberto && "rotate-180")} />
      </button>
      {aberto && (
        <div className="border-t px-3 py-3">
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            {passos.map((p, i) => <li key={i}>{p}</li>)}
          </ol>
          <a href={link} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">Abrir <ExternalLink className="h-3.5 w-3.5" /></a>
        </div>
      )}
    </div>
  );
}
