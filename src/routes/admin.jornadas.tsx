import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Route as RouteIcon, Smartphone, Monitor, Tablet, MapPin, Clock, X, Loader2, UserCheck, Repeat, Search, ShoppingCart, MessageCircle, Package, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { listarJornadasFn, detalheJornadaFn, type Sessao, type FiltroJornada } from "@/lib/jornadas";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/jornadas")({
  component: JornadasPage,
});

const FONTE: Record<string, string> = {
  direto: "Direto", google: "Google", instagram: "Instagram", facebook: "Facebook", whatsapp: "WhatsApp", bing: "Bing", email: "E-mail", "sem dado": "Sem dado",
};
const fonteNome = (f: string | null) => (f ? FONTE[f] ?? f : "Sem dado");
const COR_FONTE: Record<string, string> = { google: "bg-blue-100 text-blue-800", instagram: "bg-pink-100 text-pink-800", facebook: "bg-indigo-100 text-indigo-800", whatsapp: "bg-emerald-100 text-emerald-800", email: "bg-amber-100 text-amber-800" };
const fmtTempo = (s: number) => (s < 60 ? `${s}s` : s < 3600 ? `${Math.floor(s / 60)}min ${s % 60}s` : `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}min`);
const hora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Montevideo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
const Aparelho = ({ d }: { d: string | null }) => (d === "mobile" || d === "celular" ? <Smartphone className="h-4 w-4" /> : d === "tablet" ? <Tablet className="h-4 w-4" /> : <Monitor className="h-4 w-4" />);

const FILTROS: Array<[FiltroJornada, string]> = [
  ["todas", "Todas"], ["com_acao", "Fizeram algo"], ["popup", "Viram o pop-up"], ["cadastro", "Cadastraram/entraram"], ["voltaram", "Voltaram"], ["identificados", "Clientes identificados"],
];

// Jornada dos visitantes: o que cada visita fez, passo a passo, e o funil de cadastro
function JornadasPage() {
  const [dias, setDias] = useState(7);
  const [soUY, setSoUY] = useState(true);
  const [filtro, setFiltro] = useState<FiltroJornada>("todas");
  const [pagina, setPagina] = useState(1);
  const [aberta, setAberta] = useState<Sessao | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["jornadas", dias, soUY, filtro, pagina],
    queryFn: () => listarJornadasFn({ data: { dias, pais: soUY ? "UY" : null, filtro, pagina } }),
    refetchInterval: 60_000,
  });
  const f = data?.funil;

  const etapas = f ? [
    { r: "Visitas", n: f.sessoes, sub: `${f.visitantes} pessoas` },
    { r: "Fizeram algo", n: f.comAcao, sub: "3+ páginas, busca, carrinho ou WhatsApp" },
    { r: "Viram o pop-up", n: f.popupVisto, sub: `${f.popupFechou} fecharam` },
    { r: "Pediram o código", n: f.popupCodigo, sub: "começaram o cadastro" },
    { r: "Cadastraram pelo pop-up", n: f.cadastrosPopup, sub: `${f.contasNovas} contas novas no total` },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><RouteIcon className="h-6 w-6 text-primary" /> Jornada dos visitantes</h1>
          <p className="mt-1 text-sm text-muted-foreground">O que cada pessoa fez no site, passo a passo. Clique numa visita para ver a linha do tempo.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex rounded-lg border p-1 text-sm">
            {[1, 7, 30].map((d) => <button key={d} onClick={() => { setDias(d); setPagina(1); }} className={cn("rounded-md px-3 py-1", dias === d ? "bg-primary text-primary-foreground" : "hover:bg-muted")}>{d === 1 ? "Hoje" : `${d} dias`}</button>)}
          </div>
          <button onClick={() => { setSoUY(!soUY); setPagina(1); }} className={cn("rounded-lg border px-3 text-sm", soUY && "border-primary bg-primary/10 text-primary")}>🇺🇾 Só Uruguai</button>
        </div>
      </div>

      {/* Funil de cadastro */}
      <Card className="p-4">
        <h2 className="font-semibold">Funil de cadastro</h2>
        <p className="text-xs text-muted-foreground">Onde as pessoas desistem antes de criar a conta.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-5">
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : etapas.map((e, i) => (
            <div key={e.r} className="relative rounded-xl bg-muted/50 p-3">
              <p className="text-xs font-semibold text-muted-foreground">{e.r}</p>
              <p className="text-3xl font-bold">{e.n}</p>
              <p className="text-[11px] text-muted-foreground">{e.sub}</p>
              {i > 0 && <span className="absolute right-2 top-2 rounded-full bg-background px-1.5 text-[11px] font-semibold">{pct(e.n, etapas[i - 1].n)}</span>}
            </div>
          ))}
        </div>
        {f && (
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-800">💬 {f.whatsapp} visitas chamaram no WhatsApp</span>
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-800">🛒 {f.carrinho} adicionaram ao carrinho</span>
            {f.buscasVazias > 0 && <span className="rounded-full bg-red-50 px-2.5 py-1 text-red-700">🔎 {f.buscasVazias} buscas sem resultado (veja em Interesse dos clientes)</span>}
          </div>
        )}
        {data && data.canais.length > 0 && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase text-muted-foreground"><tr><th className="py-1">Canal</th><th>Visitas</th><th>Viram pop-up</th><th>Cadastraram</th><th>WhatsApp</th></tr></thead>
              <tbody className="divide-y">
                {data.canais.map((c) => (
                  <tr key={c.canal}><td className="py-1.5 font-medium">{fonteNome(c.canal)}</td><td>{c.sessoes}</td><td>{c.popup}</td><td className={cn(c.cadastros && "font-bold text-emerald-700")}>{c.cadastros}</td><td>{c.whatsapp}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Lista de visitas */}
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-2 border-b p-4">
          <h2 className="mr-auto font-semibold">Visitas {data && <span className="font-normal text-muted-foreground">({data.total})</span>}</h2>
          {FILTROS.map(([k, r]) => (
            <button key={k} onClick={() => { setFiltro(k); setPagina(1); }} className={cn("rounded-full border px-3 py-1 text-xs", filtro === k ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted")}>{r}</button>
          ))}
        </div>
        <ul className="divide-y">
          {data?.sessoes.map((s) => (
            <li key={s.id}>
              <button onClick={() => setAberta(s)} className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-left hover:bg-muted/40">
                <span className="w-24 shrink-0 text-xs text-muted-foreground">{hora(s.inicio)}</span>
                <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", COR_FONTE[s.fonte ?? ""] ?? "bg-zinc-100 text-zinc-700")}>
                  {fonteNome(s.fonte)}{s.campanha ? ` · ${s.campanha}` : ""}
                </span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" />{[s.cidade, s.regiao].filter(Boolean).join(", ") || "—"}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><Aparelho d={s.aparelho} />{s.sistema ?? ""}</span>
                <span className="flex items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3.5 w-3.5" />{s.paginas} pág. · {fmtTempo(s.duracao)}</span>
                <span className="ml-auto flex flex-wrap items-center gap-1.5 text-[11px]">
                  {s.usuario && <span className="flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 font-semibold text-primary"><UserCheck className="h-3 w-3" />{s.usuario.nome.split(" ")[0]}</span>}
                  {s.visitaN > 1 && <span className="flex items-center gap-1 rounded-full bg-violet-100 px-2 py-0.5 text-violet-800"><Repeat className="h-3 w-3" />{s.visitaN}ª visita</span>}
                  {s.acoes.produtos > 0 && <span className="flex items-center gap-1 rounded-full bg-zinc-100 px-2 py-0.5"><Package className="h-3 w-3" />{s.acoes.produtos}</span>}
                  {s.acoes.buscas > 0 && <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5", s.acoes.buscasVazias ? "bg-red-50 text-red-700" : "bg-zinc-100")}><Search className="h-3 w-3" />{s.acoes.buscas}</span>}
                  {s.acoes.catalogos > 0 && <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-800"><BookOpen className="h-3 w-3" />{s.acoes.catalogos}</span>}
                  {s.acoes.carrinho > 0 && <span className="flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-sky-800"><ShoppingCart className="h-3 w-3" />{s.acoes.carrinho}</span>}
                  {s.acoes.whatsapp > 0 && <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-800"><MessageCircle className="h-3 w-3" />WhatsApp</span>}
                  {s.acoes.cadastro ? <span className="rounded-full bg-emerald-600 px-2 py-0.5 font-bold text-white">Cadastrou 🎉</span>
                    : s.acoes.popupFechou ? <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-700">fechou pop-up</span>
                    : s.acoes.popupVisto ? <span className="rounded-full bg-zinc-100 px-2 py-0.5">viu pop-up</span> : null}
                </span>
              </button>
            </li>
          ))}
          {data && !data.sessoes.length && <li className="p-8 text-center text-sm text-muted-foreground">Nenhuma visita com esse filtro.</li>}
        </ul>
        {data && data.paginas > 1 && (
          <div className="flex items-center justify-center gap-3 border-t p-3 text-sm">
            <button disabled={pagina <= 1} onClick={() => setPagina(pagina - 1)} className="rounded-md border px-3 py-1 disabled:opacity-40">Anterior</button>
            <span>Página {pagina} de {data.paginas}</span>
            <button disabled={pagina >= data.paginas} onClick={() => setPagina(pagina + 1)} className="rounded-md border px-3 py-1 disabled:opacity-40">Próxima</button>
          </div>
        )}
      </Card>

      {aberta && <Detalhe s={aberta} fechar={() => setAberta(null)} abrir={setAberta} />}
    </div>
  );
}

function Detalhe({ s, fechar }: { s: Sessao; fechar: () => void; abrir: (s: Sessao) => void }) {
  const { data, isLoading } = useQuery({ queryKey: ["jornada", s.id], queryFn: () => detalheJornadaFn({ data: { id: s.id } }) });
  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={fechar} />
      <div className="relative flex h-full w-full max-w-xl flex-col overflow-y-auto bg-background shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b bg-background p-4">
          <div>
            <p className="font-semibold">{s.usuario ? s.usuario.nome : "Visitante anônimo"} {s.visitaN > 1 && <span className="text-sm font-normal text-violet-700">· {s.visitaN}ª visita</span>}</p>
            <p className="text-xs text-muted-foreground">{hora(s.inicio)} · {fonteNome(s.fonte)}{s.campanha ? ` (${s.campanha})` : ""}{s.origemSite ? ` · veio de ${s.origemSite}` : ""}</p>
            <p className="text-xs text-muted-foreground">{[s.cidade, s.regiao, s.pais].filter(Boolean).join(", ")} · {s.aparelho ?? "?"} · {s.sistema ?? ""} {s.navegador ?? ""} · {fmtTempo(s.duracao)} no site</p>
            {s.usuario && <p className="text-xs text-primary">{s.usuario.email}</p>}
          </div>
          <button onClick={fechar} aria-label="Fechar" className="rounded-md p-1 hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Linha do tempo</h3>
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : !data ? <p className="text-sm text-muted-foreground">Sem dados desta visita.</p> : (
            <ol className="relative space-y-3 border-l-2 border-muted pl-5">
              {data.passos.map((p, i) => (
                <li key={i} className="relative">
                  <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-background text-sm ring-2 ring-muted">{p.icone}</span>
                  <p className={cn("text-sm", p.destaque === "bom" && "font-semibold text-emerald-700", p.destaque === "ruim" && "text-red-600", p.tipo === "pagina" && !p.destaque && "text-foreground")}>{p.texto}</p>
                  <p className="text-[11px] text-muted-foreground">+{fmtTempo(p.t)}{p.detalhe ? ` · ${p.detalhe}` : ""}</p>
                </li>
              ))}
            </ol>
          )}
          {data && data.historico.length > 1 && (
            <>
              <h3 className="mb-2 mt-6 text-sm font-semibold">Todas as visitas desta pessoa ({data.historico.length})</h3>
              <ul className="divide-y rounded-lg border text-sm">
                {data.historico.map((h) => (
                  <li key={h.id} className={cn("flex flex-wrap items-center gap-2 px-3 py-2", h.id === s.id && "bg-primary/5")}>
                    <span className="w-24 text-xs text-muted-foreground">{hora(h.inicio)}</span>
                    <span className="text-xs">{fonteNome(h.fonte)}</span>
                    <span className="text-xs text-muted-foreground">{h.paginas} pág. · {fmtTempo(h.duracao)}</span>
                    <span className="ml-auto text-xs">{h.acoes.cadastro ? "🎉 cadastrou" : h.acoes.whatsapp ? "💬 WhatsApp" : h.acoes.carrinho ? "🛒 carrinho" : ""}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
