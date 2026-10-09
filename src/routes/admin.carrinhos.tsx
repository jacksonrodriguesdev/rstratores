import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ShoppingCart, MessageCircle, Mail, Search, MapPin, Smartphone, Monitor, Clock, AlertTriangle, CheckCircle2, Phone, User,
  Loader2, Send, Trophy, ChevronDown, ChevronUp, StickyNote, Flame,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  listarCarrinhosFn, atualizarCarrinhoFn, registrarContatoFn, emailCarrinhoFn, ETAPAS, ROTULO_ETAPA,
  type Carrinho, type FiltroCarrinhos,
} from "@/lib/carrinhos";
import { formatarCelularUY } from "@/lib/validacao-conta";
import { urlAbsoluta } from "@/lib/email-template";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/carrinhos")({
  component: CarrinhosPage,
});

const COR_ETAPA: Record<string, string> = {
  NOVO: "bg-sky-100 text-sky-800",
  CONTATADO: "bg-violet-100 text-violet-800",
  NEGOCIANDO: "bg-amber-100 text-amber-800",
  GANHO: "bg-emerald-100 text-emerald-800",
  PERDIDO: "bg-zinc-200 text-zinc-600",
};
const fmt = (n: number) => n.toLocaleString("pt-BR");
function ha(iso: string) {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return `há ${d} ${d === 1 ? "dia" : "dias"}`;
}
const nomeItem = (i: Carrinho["itens"][number]) => i.nameEs || i.name;
const primeiro = (n?: string | null) => {
  const p = (n ?? "").trim().split(/\s+/)[0] ?? "";
  return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : "";
};

// Mensagens prontas para negociar pelo WhatsApp (o admin edita antes de enviar)
const MODELOS = [
  {
    id: "recuperar", rotulo: "Retomar a lista",
    texto: (c: Carrinho, _d: number) =>
      `¡Hola${primeiro(c.cliente?.nome) ? " " + primeiro(c.cliente?.nome) : ""}! 👋 Te escribimos de *AGRO PARTS*.\n\nVimos que armaste esta lista en nuestro sitio:\n${listaTexto(c)}\n\n¿Querés que te pasemos *precio y disponibilidad*? Enviamos a todo Uruguay por DAC 🚚`,
  },
  {
    id: "desconto", rotulo: "Oferta com desconto",
    texto: (c: Carrinho, d: number) =>
      `¡Hola${primeiro(c.cliente?.nome) ? " " + primeiro(c.cliente?.nome) : ""}! Soy de *AGRO PARTS* 🚜\n\nTenemos una propuesta especial para tu lista:\n${listaTexto(c)}\n\n🎁 *${d}% de descuento* si confirmás tu pedido hoy. ¿Te paso el precio final?`,
  },
  {
    id: "frete", rotulo: "Envío sin costo",
    texto: (c: Carrinho, _d: number) =>
      `¡Hola${primeiro(c.cliente?.nome) ? " " + primeiro(c.cliente?.nome) : ""}! Te escribe *AGRO PARTS*.\n\nPara tu lista de repuestos:\n${listaTexto(c)}\n\n🚚 Te ofrecemos el *envío por DAC sin costo* a ${c.cliente?.cidade || c.cliente?.departamento || "tu ciudad"}. ¿Lo coordinamos?`,
  },
  {
    id: "duvida", rotulo: "Ajudar a escolher",
    texto: (c: Carrinho, _d: number) =>
      `¡Hola${primeiro(c.cliente?.nome) ? " " + primeiro(c.cliente?.nome) : ""}! Somos *AGRO PARTS*.\n\nVimos que estabas buscando:\n${listaTexto(c)}\n\n¿Tenés alguna duda sobre la pieza correcta para tu tractor? Pasanos el modelo y año y te confirmamos 👍`,
  },
];
function listaTexto(c: Carrinho) {
  return c.itens.slice(0, 15).map((i) => `• ${i.quantity}x ${nomeItem(i)} — Cód: ${i.codigo || i.sku}`).join("\n");
}
const waLink = (tel: string, texto: string) => `https://api.whatsapp.com/send?phone=${tel.replace(/\D/g, "")}&text=${encodeURIComponent(texto)}`;

function CarrinhosPage() {
  const qc = useQueryClient();
  const [f, setF] = useState<FiltroCarrinhos>({ dias: 30, etapa: "", situacao: "todos", soContato: false, busca: "" });
  const [busca, setBusca] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setF((o) => ({ ...o, busca })), 400);
    return () => clearTimeout(t);
  }, [busca]);
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["admin-carrinhos", f],
    queryFn: () => listarCarrinhosFn({ data: f }),
    refetchInterval: 60000,
  });
  const recarregar = () => qc.invalidateQueries({ queryKey: ["admin-carrinhos"] });
  const [whats, setWhats] = useState<Carrinho | null>(null);
  const [email, setEmail] = useState<Carrinho | null>(null);
  const r = data?.resumo;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><ShoppingCart className="h-6 w-6 text-primary" /> Carrinhos e negociação</h1>
          <p className="mt-1 text-sm text-muted-foreground">Listas de repuestos montadas no site. Chame o cliente no WhatsApp, negocie e marque a venda.</p>
        </div>
        <div className="flex rounded-lg bg-muted p-0.5">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setF({ ...f, dias: d })} className={cn("rounded-md px-3 py-1.5 text-sm font-semibold", f.dias === d && "bg-background shadow")}>{d} dias</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi icone={ShoppingCart} rotulo="Carrinhos" valor={r?.total} />
        <Kpi icone={Flame} rotulo="Abandonados" valor={r?.abandonados} cor="text-amber-600" dica={`Montaram e não pediram preço (+1 h)`} onClick={() => setF({ ...f, situacao: "abandonados", etapa: "" })} />
        <Kpi icone={Send} rotulo="Pediram preço" valor={r?.enviados} cor="text-sky-700" dica="Mandaram a lista pelo WhatsApp" onClick={() => setF({ ...f, situacao: "enviados", etapa: "" })} />
        <Kpi icone={Phone} rotulo="Com celular" valor={r?.comContato} dica="Cliente cadastrado: dá para chamar" onClick={() => setF({ ...f, soContato: true })} />
        <Kpi icone={Trophy} rotulo="Vendas fechadas" valor={r?.porEtapa.GANHO ?? 0} cor="text-emerald-700" dica={r?.valorGanho ? `Total: ${fmt(r.valorGanho)}` : undefined} onClick={() => setF({ ...f, etapa: "GANHO", situacao: "todos" })} />
      </div>

      <Card className="space-y-3 p-3">
        <div className="flex flex-wrap gap-1.5">
          <Chip ativo={!f.etapa} onClick={() => setF({ ...f, etapa: "" })}>Todas as etapas · {r?.total ?? 0}</Chip>
          {ETAPAS.map((e) => (
            <Chip key={e} ativo={f.etapa === e} onClick={() => setF({ ...f, etapa: e })}>{ROTULO_ETAPA[e]} · {r?.porEtapa[e] ?? 0}</Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar cliente, celular, peça ou código…" className="pl-9" />
          </div>
          <select value={f.situacao} onChange={(e) => setF({ ...f, situacao: e.target.value as FiltroCarrinhos["situacao"] })} className="h-10 rounded-md border bg-background px-3 text-sm">
            <option value="todos">Todas as situações</option>
            <option value="abandonados">Só abandonados</option>
            <option value="enviados">Só os que pediram preço</option>
          </select>
          <label className="flex h-10 items-center gap-2 rounded-md border px-3 text-sm">
            <input type="checkbox" checked={f.soContato} onChange={(e) => setF({ ...f, soContato: e.target.checked })} className="h-4 w-4 accent-[var(--primary)]" /> Só com celular
          </label>
          {isFetching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
      </Card>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando…</p>
      ) : !data?.lista.length ? (
        <Card className="flex flex-col items-center p-12 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/40" />
          <p className="mt-3 font-semibold">Nenhum carrinho com esses filtros</p>
          <p className="max-w-sm text-sm text-muted-foreground">Os carrinhos aparecem aqui assim que alguém adiciona um repuesto à lista no site.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {data.lista.map((c) => (
            <Linha key={c.id} c={c} aoMudar={recarregar} aoWhats={() => setWhats(c)} aoEmail={() => setEmail(c)} />
          ))}
        </div>
      )}

      <DialogWhats c={whats} fechar={() => setWhats(null)} aoMudar={recarregar} />
      <DialogEmail c={email} fechar={() => setEmail(null)} aoMudar={recarregar} />
    </div>
  );
}

function Kpi({ icone: I, rotulo, valor, cor, dica, onClick }: { icone: any; rotulo: string; valor?: number; cor?: string; dica?: string; onClick?: () => void }) {
  return (
    <Card onClick={onClick} className={cn("p-4", onClick && "cursor-pointer transition hover:border-primary/40 hover:shadow")}>
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase text-muted-foreground"><I className="h-4 w-4" /> {rotulo}</p>
      <p className={cn("mt-1 text-3xl font-bold", cor)}>{valor === undefined ? "…" : fmt(valor)}</p>
      {dica && <p className="text-xs text-muted-foreground">{dica}</p>}
    </Card>
  );
}
const Chip = ({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button onClick={onClick} className={cn("rounded-full border px-3 py-1 text-xs font-semibold", ativo ? "border-primary bg-primary text-white" : "hover:bg-muted")}>{children}</button>
);

function Linha({ c, aoMudar, aoWhats, aoEmail }: { c: Carrinho; aoMudar: () => void; aoWhats: () => void; aoEmail: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [nota, setNota] = useState(c.nota ?? "");
  const [valor, setValor] = useState(c.valor_fechado?.toString() ?? "");
  const salvar = async (d: { etapa?: string; nota?: string | null; valor_fechado?: number | null }, msg = "Salvo") => {
    try {
      await atualizarCarrinhoFn({ data: { id: c.id, ...d } });
      toast.success(msg);
      aoMudar();
    } catch (e: any) {
      toast.error(e?.message);
    }
  };
  const tel = c.cliente?.telefone;
  const lugar = [c.cliente?.cidade, c.cliente?.departamento].filter(Boolean).join(", ") || [c.local?.cidade, c.local?.regiao].filter(Boolean).join(", ");
  const DevIcon = c.local?.device === "desktop" ? Monitor : Smartphone;

  return (
    <Card className={cn("overflow-hidden", c.abandonado && c.etapa === "NOVO" && "border-l-4 border-l-amber-400")}>
      <div className="flex flex-col gap-3 p-4 md:flex-row md:items-start">
        {/* Cliente */}
        <div className="flex min-w-0 gap-3 md:w-72 md:shrink-0">
          <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold", c.cliente ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
            {c.cliente ? c.cliente.nome.split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase() : <User className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold">{c.cliente?.nome ?? "Visitante sem cadastro"}</p>
            {tel ? <p className="text-sm text-muted-foreground">{formatarCelularUY(tel)}</p> : <p className="text-xs text-muted-foreground">Sem celular: só dá para ver a lista</p>}
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              {lugar && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{lugar}</span>}
              {c.local?.device && <DevIcon className="h-3 w-3" />}
              {c.local?.fonte && <span>via {c.local.fonte}</span>}
            </p>
          </div>
        </div>

        {/* Itens */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {c.status === "ENVIADO" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 font-semibold text-sky-800"><Send className="h-3 w-3" /> Pediu preço {c.enviado_em && ha(c.enviado_em)}</span>
            ) : c.abandonado ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800"><AlertTriangle className="h-3 w-3" /> Abandonado</span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" /> Montando agora</span>
            )}
            <span className="inline-flex items-center gap-1 text-muted-foreground"><Clock className="h-3 w-3" /> {ha(c.updated_at)}</span>
            <span className="text-muted-foreground">· {c.itens.length} {c.itens.length === 1 ? "peça" : "peças"}, {c.qtd_itens} un.</span>
            {c.contatos > 0 && <span className="text-muted-foreground">· {c.contatos} contato(s)</span>}
          </div>
          <button onClick={() => setAberto(!aberto)} className="mt-2 flex w-full items-center gap-2 text-left">
            <div className="flex -space-x-2">
              {c.itens.slice(0, 5).map((i) => (
                <div key={i.sku} className="h-11 w-11 overflow-hidden rounded-lg border-2 border-background bg-white" title={nomeItem(i)}>
                  {i.image ? <img src={urlAbsoluta(i.image, "")} alt="" loading="lazy" className="h-full w-full object-contain" /> : <div className="h-full w-full bg-muted" />}
                </div>
              ))}
            </div>
            <p className="min-w-0 flex-1 truncate text-sm">{c.itens.map(nomeItem).join(", ")}</p>
            {aberto ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
          </button>
        </div>

        {/* Ações */}
        <div className="flex flex-wrap items-center gap-2 md:w-60 md:shrink-0 md:flex-col md:items-stretch">
          <Button onClick={aoWhats} disabled={!tel} className="flex-1 bg-[#25D366] text-white hover:bg-[#1EBE57] md:flex-none" title={tel ? "Chamar no WhatsApp" : "Cliente sem celular"}>
            <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp
          </Button>
          <div className="flex flex-1 gap-2 md:flex-none">
            <Button variant="outline" onClick={aoEmail} disabled={!c.cliente || !c.cliente.recebe_emails} className="flex-1" title={!c.cliente ? "Sem cadastro" : !c.cliente.recebe_emails ? "Descadastrado dos e-mails" : "Enviar e-mail"}>
              <Mail className="mr-1.5 h-4 w-4" /> E-mail
            </Button>
            <select value={c.etapa} onChange={(e) => salvar({ etapa: e.target.value }, `Etapa: ${ROTULO_ETAPA[e.target.value]}`)} className={cn("h-10 flex-1 rounded-md border-0 px-2 text-sm font-semibold", COR_ETAPA[c.etapa])} aria-label="Etapa">
              {ETAPAS.map((e) => <option key={e} value={e}>{ROTULO_ETAPA[e]}</option>)}
            </select>
          </div>
        </div>
      </div>

      {aberto && (
        <div className="grid gap-4 border-t bg-muted/30 p-4 md:grid-cols-[1fr_320px]">
          <ul className="divide-y rounded-lg border bg-background">
            {c.itens.map((i) => (
              <li key={i.sku} className="flex items-center gap-3 p-2">
                <div className="h-14 w-14 shrink-0 rounded bg-white">{i.image && <img src={urlAbsoluta(i.image, "")} alt="" className="h-full w-full object-contain" />}</div>
                <div className="min-w-0 flex-1">
                  <a href={`/produto/${encodeURIComponent(i.sku)}`} target="_blank" rel="noreferrer" className="line-clamp-2 text-sm font-medium hover:text-primary">{nomeItem(i)}</a>
                  <p className="text-xs text-muted-foreground">Cód: {i.codigo || i.sku}</p>
                </div>
                <span className="rounded-md bg-muted px-2 py-1 text-sm font-bold">{i.quantity}×</span>
              </li>
            ))}
          </ul>
          <div className="space-y-3">
            {c.cliente && (
              <div className="rounded-lg border bg-background p-3 text-sm">
                <p className="font-semibold">{c.cliente.nome}</p>
                <p className="text-muted-foreground">{c.cliente.email}</p>
                {tel && <a href={`tel:${tel}`} className="text-primary">{formatarCelularUY(tel)}</a>}
              </div>
            )}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground"><StickyNote className="h-3.5 w-3.5" /> Anotações da negociação</label>
              <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={3} placeholder="Ex.: pediu 10% de desconto, retorna sexta" className="mt-1 w-full rounded-md border bg-background p-2 text-sm" />
            </div>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <label className="text-xs font-semibold text-muted-foreground">Valor fechado</label>
                <Input type="number" min={0} step="0.01" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
              </div>
              <Button onClick={() => salvar({ nota, valor_fechado: valor === "" ? null : Number(valor) })}>Salvar</Button>
            </div>
            {c.etapa !== "GANHO" && (
              <Button variant="outline" className="w-full border-emerald-300 text-emerald-700 hover:bg-emerald-50" onClick={() => salvar({ etapa: "GANHO", nota, valor_fechado: valor === "" ? null : Number(valor) }, "Venda fechada! 🎉")}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Marcar venda fechada
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function DialogWhats({ c, fechar, aoMudar }: { c: Carrinho | null; fechar: () => void; aoMudar: () => void }) {
  const [modelo, setModelo] = useState("recuperar");
  const [desconto, setDesconto] = useState(10);
  const [texto, setTexto] = useState("");
  useEffect(() => {
    if (!c) return;
    const m = MODELOS.find((x) => x.id === modelo)!;
    setTexto(m.texto(c, desconto));
  }, [c, modelo, desconto]);
  if (!c) return null;
  const tel = c.cliente?.telefone ?? "";
  const abrir = async () => {
    window.open(waLink(tel, texto), "_blank");
    await registrarContatoFn({ data: { id: c.id } }).catch(() => {});
    if (modelo === "desconto" && c.etapa !== "GANHO") await atualizarCarrinhoFn({ data: { id: c.id, etapa: "NEGOCIANDO" } }).catch(() => {});
    aoMudar();
    fechar();
  };
  return (
    <Dialog open onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-[#25D366]" /> Chamar {primeiro(c.cliente?.nome) || "cliente"} no WhatsApp</DialogTitle>
          <DialogDescription>{formatarCelularUY(tel)} · escolha uma mensagem e ajuste antes de enviar.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-wrap gap-1.5">
          {MODELOS.map((m) => <Chip key={m.id} ativo={modelo === m.id} onClick={() => setModelo(m.id)}>{m.rotulo}</Chip>)}
        </div>
        {modelo === "desconto" && (
          <div className="flex items-center gap-2 text-sm">
            Desconto:
            {[5, 10, 15, 20].map((d) => <Chip key={d} ativo={desconto === d} onClick={() => setDesconto(d)}>{d}%</Chip>)}
            <Input type="number" min={1} max={90} value={desconto} onChange={(e) => setDesconto(Math.max(1, Math.min(90, Number(e.target.value) || 1)))} className="h-8 w-20" />
          </div>
        )}
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={11} className="w-full rounded-lg border bg-[#e9fbe5] p-3 text-sm leading-relaxed" />
        <Button onClick={abrir} className="h-12 bg-[#25D366] text-base text-white hover:bg-[#1EBE57]"><MessageCircle className="mr-2 h-5 w-5" /> Abrir WhatsApp</Button>
        <p className="text-center text-xs text-muted-foreground">O contato fica registrado e o carrinho sai de "Novo".</p>
      </DialogContent>
    </Dialog>
  );
}

function DialogEmail({ c, fechar, aoMudar }: { c: Carrinho | null; fechar: () => void; aoMudar: () => void }) {
  const [assunto, setAssunto] = useState("");
  const [destaque, setDestaque] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  useEffect(() => {
    if (!c) return;
    setAssunto(`${primeiro(c.cliente?.nome) || "Hola"}, ¿te ayudamos con tus repuestos?`);
    setDestaque("");
    setMensagem("Vimos que armaste una lista de repuestos en nuestro sitio. **Te pasamos precio y disponibilidad** sin compromiso.\n\nRespondé este e-mail o escribinos por WhatsApp. Enviamos a todo Uruguay por DAC.");
  }, [c]);
  if (!c) return null;
  const enviar = async () => {
    setEnviando(true);
    try {
      await emailCarrinhoFn({ data: { id: c.id, assunto, mensagem, destaque } });
      toast.success(`E-mail enviado para ${c.cliente?.email}`);
      aoMudar();
      fechar();
    } catch (e: any) {
      toast.error(e?.message || "Falha no envio");
    } finally {
      setEnviando(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Mail className="h-5 w-5 text-primary" /> E-mail para {c.cliente?.email}</DialogTitle>
          <DialogDescription>Vai com a foto e o código de cada peça da lista e o botão do WhatsApp.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div><label className="text-xs font-semibold text-muted-foreground">Assunto</label><Input value={assunto} onChange={(e) => setAssunto(e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-muted-foreground">Selo (opcional)</label><Input value={destaque} onChange={(e) => setDestaque(e.target.value)} placeholder="10% OFF HASTA EL VIERNES" /></div>
          <div><label className="text-xs font-semibold text-muted-foreground">Mensagem (**negrito**)</label><textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} rows={6} className="w-full rounded-md border bg-background p-2.5 text-sm" /></div>
        </div>
        <Button onClick={enviar} disabled={enviando} className="h-11">{enviando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />} Enviar e-mail</Button>
      </DialogContent>
    </Dialog>
  );
}
