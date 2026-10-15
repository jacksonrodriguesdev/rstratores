import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Sparkles,
  Eye,
  X,
  Mail,
  UserPlus,
  LogIn,
  Ticket,
  Search,
  ExternalLink,
  Loader2,
  CheckCircle2,
  MessageCircle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { painelPopupFn, salvarPopupFn, marcarCupomFn } from "@/lib/acesso";
import { numeroWhatsapp } from "@/components/admin/OfertaClientes";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/popup")({
  component: PopupAdmin,
});

const fmt = (n: number) => n.toLocaleString("pt-BR");
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");

// Site → Pop-up de cadastro: liga/desliga, tempo, desconto e textos do pop-up "Entrá y ganá",
// resultados dos últimos 30 dias e os cupons únicos (marcar como usado quando o cliente comprar).
function PopupAdmin() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(busca), 350);
    return () => clearTimeout(t);
  }, [busca]);
  const { data } = useQuery({
    queryKey: ["popup-admin", q],
    queryFn: () => painelPopupFn({ data: { busca: q } }),
  });
  const [cfg, setCfg] = useState<NonNullable<typeof data>["config"] | null>(null);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => {
    if (data && !cfg) setCfg(data.config);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const salvar = async () => {
    if (!cfg) return;
    setSalvando(true);
    try {
      await salvarPopupFn({ data: cfg });
      toast.success("Pop-up salvo");
      qc.invalidateQueries({ queryKey: ["popup-admin"] });
    } catch (e: any) {
      toast.error(e?.message);
    } finally {
      setSalvando(false);
    }
  };
  const marcar = async (id: number, usado: boolean) => {
    await marcarCupomFn({ data: { id, usado } });
    qc.invalidateQueries({ queryKey: ["popup-admin"] });
  };

  const s = data?.stats;
  const cards = [
    { label: "Viram o pop-up", valor: s?.vistos, icon: Eye, cor: "text-sky-700 bg-sky-50" },
    { label: "Fecharam", valor: s?.fechados, icon: X, cor: "text-zinc-600 bg-zinc-100" },
    { label: "Pediram código", valor: s?.codigos, icon: Mail, cor: "text-amber-700 bg-amber-50" },
    {
      label: "Contas criadas",
      valor: s?.cadastros,
      sub: s && `${pct(s.cadastros, s.vistos)} de quem viu`,
      icon: UserPlus,
      cor: "text-emerald-700 bg-emerald-50",
    },
    {
      label: "Entraram (já tinham conta)",
      valor: s?.logins,
      icon: LogIn,
      cor: "text-blue-700 bg-blue-50",
    },
    {
      label: "Cupons usados",
      valor: s?.usados,
      sub: s && `de ${fmt(s.cupons)} cupons`,
      icon: Ticket,
      cor: "text-[#b8860b] bg-[#fffbeb]",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Sparkles className="h-6 w-6 text-primary" /> Pop-up de cadastro
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            “Entrá y ganá”: aparece para quem não está logado e oferece os catálogos + desconto na
            primeira compra.
          </p>
        </div>
        <Button variant="outline" asChild>
          <a href="/?popup=preview" target="_blank" rel="noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" /> Ver no site
          </a>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {cards.map((c) => (
          <Card key={c.label} className="p-4">
            <span className={cn("flex h-9 w-9 items-center justify-center rounded-lg", c.cor)}>
              <c.icon className="h-4 w-4" />
            </span>
            <p className="mt-2 text-2xl font-bold">{c.valor == null ? "…" : fmt(c.valor)}</p>
            <p className="text-xs text-muted-foreground">{c.label}</p>
            {c.sub && <p className="text-[11px] text-muted-foreground/80">{c.sub}</p>}
          </Card>
        ))}
      </div>
      <p className="-mt-3 text-xs text-muted-foreground">Últimos 30 dias.</p>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card className="h-fit space-y-4 p-5">
          <h2 className="font-semibold">Configuração</h2>
          {!cfg ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <label className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 p-3 text-sm font-medium">
                Pop-up ligado no site{" "}
                <Switch checked={cfg.ativo} onCheckedChange={(v) => setCfg({ ...cfg, ativo: v })} />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="text-xs font-semibold text-muted-foreground">
                  Aparece depois de
                  <span className="mt-1 flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={120}
                      value={cfg.segundos}
                      onChange={(e) => setCfg({ ...cfg, segundos: Number(e.target.value) })}
                    />{" "}
                    s
                  </span>
                </label>
                <label className="text-xs font-semibold text-muted-foreground">
                  Desconto da 1ª compra
                  <span className="mt-1 flex items-center gap-2">
                    <Input
                      type="number"
                      min={1}
                      max={90}
                      value={cfg.desconto}
                      onChange={(e) => setCfg({ ...cfg, desconto: Number(e.target.value) })}
                    />{" "}
                    %
                  </span>
                </label>
              </div>
              <label className="block text-xs font-semibold text-muted-foreground">
                Título (use {"{{descuento}}"} para o %)
                <Input
                  className="mt-1"
                  value={cfg.titulo}
                  onChange={(e) => setCfg({ ...cfg, titulo: e.target.value })}
                />
              </label>
              <label className="block text-xs font-semibold text-muted-foreground">
                Subtítulo
                <textarea
                  rows={2}
                  className="mt-1 w-full rounded-md border bg-background p-2.5 text-sm"
                  value={cfg.subtitulo}
                  onChange={(e) => setCfg({ ...cfg, subtitulo: e.target.value })}
                />
              </label>
              <Button className="w-full" onClick={salvar} disabled={salvando}>
                {salvando ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}{" "}
                Salvar
              </Button>
              <p className="text-xs text-muted-foreground">
                Quem fecha o pop-up vê de novo na próxima visita; quem entra ou se cadastra, nunca
                mais. Pedir preço pelo WhatsApp (peça, carrinho e pedido rápido) exige cadastro
                enquanto o pop-up estiver ligado; desligado, o WhatsApp abre direto. Não aparece no
                admin, no login/cadastro, em Mi cuenta nem dentro do leitor de catálogos. O e-mail
                de boas-vindas (Automações) leva o mesmo cupom único.
              </p>
            </>
          )}
        </Card>

        <Card className="overflow-hidden p-0">
          <div className="flex flex-wrap items-center gap-2 border-b p-4">
            <h2 className="mr-auto flex items-center gap-2 font-semibold">
              <Ticket className="h-4 w-4 text-primary" /> Cupons dos clientes
            </h2>
            <label className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Cupom, nome, e-mail, telefone…"
                className="h-9 w-64 rounded-lg border bg-background pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
              />
            </label>
          </div>
          <p className="border-b bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
            Quando o cliente citar o cupom no WhatsApp, procure aqui, confira o nome e marque como
            usado depois da venda.
          </p>
          <div className="max-h-[560px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Cupom</th>
                  <th className="px-4 py-2">Cliente</th>
                  <th className="px-4 py-2">Cadastro</th>
                  <th className="px-4 py-2 text-right">Usado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {data?.cupons.map((c) => {
                  const wa = numeroWhatsapp(c.telefone);
                  return (
                    <tr key={c.id} className={cn(c.usadoEm && "bg-muted/30 text-muted-foreground")}>
                      <td className="px-4 py-2.5 font-mono font-bold tracking-wider">{c.cupom}</td>
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-foreground">{c.nome}</p>
                        <p className="text-xs">
                          {c.email}
                          {wa && (
                            <a
                              href={`https://api.whatsapp.com/send?phone=${wa}`}
                              target="_blank"
                              rel="noreferrer"
                              className="ml-2 inline-flex items-center gap-0.5 text-[#128C4B]"
                            >
                              <MessageCircle className="h-3 w-3" /> {c.telefone}
                            </a>
                          )}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs">
                        {new Date(c.criado).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <label className="inline-flex items-center gap-2 text-xs">
                          {c.usadoEm && new Date(c.usadoEm).toLocaleDateString("pt-BR")}
                          <Switch
                            checked={!!c.usadoEm}
                            onCheckedChange={(v) => marcar(c.id, v)}
                            aria-label="Cupom usado"
                          />
                        </label>
                      </td>
                    </tr>
                  );
                })}
                {data && !data.cupons.length && (
                  <tr>
                    <td colSpan={4} className="p-6 text-center text-muted-foreground">
                      {q
                        ? "Nenhum cupom encontrado."
                        : "Nenhum cupom ainda: eles aparecem quando os clientes se cadastram."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
