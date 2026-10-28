// Admin → Vendas: lançar uma venda (cliente, peças e valor), imprimir a etiqueta da
// transportadora com o QR «Avalie e ganhe 15%», mandar o link pelo WhatsApp e acompanhar
// quem já avaliou (e o cupom que ganhou).
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Copy,
  Gift,
  Loader2,
  MessageCircle,
  Pencil,
  Truck,
  Plus,
  Printer,
  Save,
  Search,
  Settings,
  ShoppingBag,
  Star,
  Trash2,
  UserSearch,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  buscarClientesFn,
  buscarPecasVendaFn,
  listarVendasFn,
  remetenteFn,
  salvarRastreioFn,
  salvarRemetenteFn,
  salvarVendaFn,
} from "@/lib/avaliacoes";
import { cn } from "@/lib/utils";
import { EtapaPedido } from "@/components/admin/EtapaPedido";
import { BotaoCadastroPeca, ResultadosPecas } from "@/components/admin/PecasVenda";

export const Route = createFileRoute("/admin/vendas")({ component: PaginaVendas });

type Item = { sku: string; codigo: string; nome: string; qtd: number; valor: number };
type Form = {
  id?: number;
  cliente_nome: string;
  cliente_email: string;
  cliente_telefone: string;
  cliente_doc: string;
  endereco: string;
  cidade: string;
  departamento: string;
  cep: string;
  pais: "UY" | "BR";
  user_id: number | null;
  itens: Item[];
  moeda: "UYU" | "BRL";
  transportadora: string;
  rastreio: string;
  observacao: string;
  status: string;
  canal: string;
  metodo: string;
};
const VAZIO: Form = {
  cliente_nome: "",
  cliente_email: "",
  cliente_telefone: "",
  cliente_doc: "",
  endereco: "",
  cidade: "",
  departamento: "",
  cep: "",
  pais: "UY",
  user_id: null,
  itens: [],
  moeda: "UYU",
  transportadora: "DAC",
  rastreio: "",
  observacao: "",
  status: "ABERTA",
  canal: "WHATSAPP",
  metodo: "",
};
const STATUS: Record<string, string> = {
  ABERTA: "bg-sky-100 text-sky-800",
  ENVIADA: "bg-amber-100 text-amber-800",
  ENTREGUE: "bg-emerald-100 text-emerald-800",
  CANCELADA: "bg-zinc-200 text-zinc-600",
};
const dinheiro = (v: number, moeda: string) =>
  moeda === "BRL"
    ? `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : `$U ${Math.round(v).toLocaleString("es-UY")}`;
const linkDe = (v: { codigo: string; pais: string }) =>
  `${typeof window !== "undefined" ? window.location.origin : "https://agropartsuy.com"}${v.pais === "BR" ? "/pt" : ""}/avaliar/${v.codigo}`;
function textoWhats(v: { cliente_nome: string; codigo: string; pais: string }) {
  const n = v.cliente_nome.split(/\s+/)[0];
  return v.pais === "BR"
    ? `Olá ${n}! Obrigado pela compra na AGRO PARTS 🚜\n\nQuando a peça chegar, avalie por aqui e ganhe 15% de desconto na próxima compra (vale qualquer nota):\n${linkDe(v)}`
    : `¡Hola ${n}! Gracias por tu compra en AGRO PARTS 🚜\n\nCuando llegue la pieza, calificala acá y ganá 15% de descuento en la próxima compra (vale cualquier nota):\n${linkDe(v)}`;
}
function textoRastreio(v: {
  cliente_nome: string;
  codigo: string;
  pais: string;
  rastreio: string;
  transportadora?: string | null;
}) {
  const n = v.cliente_nome.split(/s+/)[0];
  const t = v.transportadora || "DAC";
  const onde = /dac/i.test(t)
    ? v.pais === "BR"
      ? " Acompanhe em dac.com.uy"
      : " Seguilo en dac.com.uy"
    : "";
  return v.pais === "BR"
    ? `Olá ${n}! Seu pedido saiu pela ${t} 🚚
Código de rastreio: ${v.rastreio}.${onde}

Quando chegar, avalie e ganhe 15% de desconto na próxima compra:
${linkDe(v)}`
    : `¡Hola ${n}! Tu pedido salió por ${t} 🚚
Código de seguimiento: ${v.rastreio}.${onde}

Cuando llegue, calificalo y ganá 15% de descuento en la próxima compra:
${linkDe(v)}`;
}
const zapLink = (tel: string | null | undefined, texto: string) => {
  const n = String(tel ?? "").replace(/\D/g, "");
  return `https://wa.me/${n}?text=${encodeURIComponent(texto)}`;
};

function PaginaVendas() {
  const [q, setQ] = useState("");
  const [busca, setBusca] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [remetente, setRemetente] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ["vendas", busca],
    queryFn: () => listarVendasFn({ data: { q: busca } }),
  });
  const r = data?.resumo;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex-1">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <ShoppingBag className="h-6 w-6 text-primary" /> Vendas e etiquetas
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lance a venda, imprima a etiqueta com o QR «Avalie e ganhe 15%» e acompanhe as
            avaliações.
          </p>
        </div>
        <Button variant="outline" onClick={() => setRemetente(true)}>
          <Settings className="mr-1.5 h-4 w-4" /> Remetente
        </Button>
        <Button onClick={() => setForm({ ...VAZIO })}>
          <Plus className="mr-1.5 h-4 w-4" /> Nova venda
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Numero n={r?.vendas} r="vendas lançadas" />
        <Numero n={r ? `${r.taxa}%` : undefined} r={`avaliaram (${r?.avaliadas ?? 0})`} destaque />
        <Numero n={r?.media ? r.media.toLocaleString("pt-BR") : "—"} r="nota média" estrela />
        <Numero n={r?.cuponsGerados} r="cupons de 15% gerados" />
        <Numero n={r?.cuponsUsados} r="cupons usados (recompra)" />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <form
            className="flex flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setBusca(q.trim());
            }}
          >
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cliente, e-mail, código da venda ou da peça…"
              className="max-w-md"
            />
            <Button type="submit" variant="secondary" size="icon" aria-label="Buscar">
              <Search className="h-4 w-4" />
            </Button>
          </form>
          <Link
            to="/admin/avaliacoes"
            className="text-sm font-semibold text-primary hover:underline"
          >
            Avaliações para aprovar →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Venda</th>
                <th className="p-3">Cliente</th>
                <th className="p-3">Peças</th>
                <th className="p-3 text-right">Total</th>
                <th className="p-3">Etapa do pedido</th>
                <th className="p-3">Rastreio</th>
                <th className="p-3">Avaliação</th>
                <th className="p-3" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              )}
              {data?.vendas.map((v) => (
                <tr key={v.id} className="border-t align-top">
                  <td className="p-3">
                    <p className="font-mono font-bold">{v.codigo}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(v.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </td>
                  <td className="p-3">
                    <p className="font-semibold">{v.cliente_nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {[v.cidade, v.pais === "BR" ? "Brasil" : "Uruguai"]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </td>
                  <td className="max-w-[260px] p-3 text-xs">
                    {v.itens.slice(0, 2).map((i: Item) => (
                      <p key={i.sku} className="line-clamp-1">
                        {i.qtd}× {i.nome}
                      </p>
                    ))}
                    {v.itens.length > 2 && (
                      <p className="text-muted-foreground">+{v.itens.length - 2} peça(s)</p>
                    )}
                  </td>
                  <td className="whitespace-nowrap p-3 text-right font-semibold">
                    {dinheiro(v.total, v.moeda)}
                  </td>
                  <td className="p-3">
                    <EtapaPedido v={v} />
                  </td>
                  <td className="p-3">
                    <Rastreio v={v} />
                  </td>
                  <td className="p-3 text-xs">
                    {v.cupom ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                        <Gift className="h-3.5 w-3.5" /> {v.cupom}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">aguardando</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap p-3 text-right">
                    <div className="flex justify-end gap-1">
                      <a
                        href={`/etiqueta/${v.id}?formato=10x15`}
                        target="_blank"
                        rel="noreferrer"
                        title="Etiqueta 10×15"
                      >
                        <Button size="sm" variant="outline">
                          <Printer className="mr-1 h-4 w-4" /> 10×15
                        </Button>
                      </a>
                      <a
                        href={`/etiqueta/${v.id}?formato=a4`}
                        target="_blank"
                        rel="noreferrer"
                        title="Etiqueta A4"
                      >
                        <Button size="sm" variant="ghost">
                          A4
                        </Button>
                      </a>
                      {v.cliente_telefone && (
                        <a
                          href={zapLink(v.cliente_telefone, textoWhats(v))}
                          target="_blank"
                          rel="noreferrer"
                          title="Mandar link pelo WhatsApp"
                        >
                          <Button size="icon" variant="ghost" aria-label="WhatsApp">
                            <MessageCircle className="h-4 w-4 text-emerald-600" />
                          </Button>
                        </a>
                      )}
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Copiar link de avaliação"
                        onClick={async () => {
                          await navigator.clipboard.writeText(linkDe(v)).catch(() => {});
                          toast.success("Link de avaliação copiado");
                        }}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Editar"
                        onClick={() =>
                          setForm({
                            ...VAZIO,
                            ...Object.fromEntries(
                              Object.entries(v).map(([k, x]) => [
                                k,
                                x ?? (typeof (VAZIO as any)[k] === "string" ? "" : x),
                              ]),
                            ),
                            id: v.id,
                            itens: v.itens,
                          } as Form)
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {data && !data.vendas.length && (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-sm text-muted-foreground">
                    Nenhuma venda ainda. Clique em <b>Nova venda</b>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {form && <FormVenda inicial={form} fechar={() => setForm(null)} />}
      {remetente && <DialogoRemetente fechar={() => setRemetente(false)} />}
    </div>
  );
}

// Código de rastreio (DAC etc.): só existe depois do despacho, então entra pela lista.
// Salvar com a venda aberta marca como ENVIADA. WhatsApp: avisa o cliente com o código.
function Rastreio({ v }: { v: any }) {
  const qc = useQueryClient();
  const [editando, setEditando] = useState(false);
  const [cod, setCod] = useState<string>(v.rastreio ?? "");
  const [salvando, setSalvando] = useState(false);
  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarRastreioFn({
        data: {
          id: v.id,
          rastreio: cod,
          transportadora: v.transportadora || (v.pais === "UY" ? "DAC" : null),
        },
      });
      toast.success(
        cod.trim() ? "Rastreio salvo · venda marcada como enviada" : "Rastreio apagado",
      );
      setEditando(false);
      qc.invalidateQueries({ queryKey: ["vendas"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSalvando(false);
    }
  };
  if (editando)
    return (
      <form
        className="flex min-w-[190px] gap-1"
        onSubmit={(e) => {
          e.preventDefault();
          salvar();
        }}
      >
        <Input
          autoFocus
          className="h-8 font-mono text-xs"
          value={cod}
          onChange={(e) => setCod(e.target.value)}
          placeholder={v.transportadora || "DAC"}
        />
        <Button size="sm" type="submit" disabled={salvando} className="h-8">
          {salvando ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
        </Button>
      </form>
    );
  if (!v.rastreio)
    return (
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs"
        onClick={() => setEditando(true)}
        disabled={v.status === "CANCELADA"}
      >
        <Plus className="mr-1 h-3.5 w-3.5" /> código {v.transportadora || "DAC"}
      </Button>
    );
  return (
    <div className="flex items-center gap-1 text-xs">
      <Truck className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <button
        onClick={() => setEditando(true)}
        className="font-mono font-semibold hover:underline"
        title="Alterar"
      >
        {v.rastreio}
      </button>
      {v.cliente_telefone && (
        <a
          href={zapLink(v.cliente_telefone, textoRastreio(v))}
          target="_blank"
          rel="noreferrer"
          title="Avisar o cliente no WhatsApp"
          aria-label="Avisar o cliente"
        >
          <MessageCircle className="h-4 w-4 text-emerald-600" />
        </a>
      )}
    </div>
  );
}

function Numero({
  n,
  r,
  destaque,
  estrela,
}: {
  n?: number | string;
  r: string;
  destaque?: boolean;
  estrela?: boolean;
}) {
  return (
    <Card className={cn("p-4", destaque && "border-primary/40 bg-primary/5")}>
      <p className={cn("flex items-center gap-1 text-2xl font-black", destaque && "text-primary")}>
        {estrela && <Star className="h-5 w-5 text-amber-400" fill="currentColor" strokeWidth={0} />}
        {n ?? "…"}
      </p>
      <p className="text-xs text-muted-foreground">{r}</p>
    </Card>
  );
}

function Campo({
  r,
  children,
  className,
}: {
  r: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {r}
      </span>
      {children}
    </label>
  );
}

function FormVenda({ inicial, fechar }: { inicial: Form; fechar: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState<Form>(inicial);
  const [salvando, setSalvando] = useState(false);
  const [salva, setSalva] = useState<{
    id: number;
    codigo: string;
    pais: string;
    cliente_nome: string;
    cliente_telefone: string | null;
  } | null>(null);
  const set = (p: Partial<Form>) => setF((x) => ({ ...x, ...p }));
  const total = f.itens.reduce((s, i) => s + i.qtd * i.valor, 0);

  // Cliente do site
  const [qc1, setQc1] = useState("");
  const { data: clientes } = useQuery({
    queryKey: ["venda-clientes", qc1],
    queryFn: () => buscarClientesFn({ data: { q: qc1 } }),
    enabled: qc1.length >= 2,
  });
  // Peças
  const [qp, setQp] = useState("");
  const [qpBusca, setQpBusca] = useState("");
  const { data: pecas, isFetching } = useQuery({
    queryKey: ["venda-pecas", qpBusca],
    queryFn: () => buscarPecasVendaFn({ data: { q: qpBusca } }),
    enabled: qpBusca.length >= 2,
  });
  useEffect(() => {
    // país novo → moeda e transportadora padrão (só numa venda nova)
    if (!f.id)
      set({ moeda: f.pais === "BR" ? "BRL" : "UYU", transportadora: f.pais === "BR" ? "" : "DAC" });
  }, [f.pais]); // eslint-disable-line react-hooks/exhaustive-deps

  const salvar = async () => {
    setSalvando(true);
    try {
      const v = await salvarVendaFn({ data: { ...f, id: f.id } as any });
      qc.invalidateQueries({ queryKey: ["vendas"] });
      toast.success(f.id ? "Venda atualizada" : `Venda ${v.codigo} lançada`);
      setSalva(v);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{f.id ? "Editar venda" : "Nova venda"}</DialogTitle>
        </DialogHeader>
        {salva ? (
          <div className="space-y-4 py-2 text-center">
            <p className="text-lg font-bold">
              Venda <span className="font-mono">{salva.codigo}</span> salva ✔
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <a href={`/etiqueta/${salva.id}?formato=10x15`} target="_blank" rel="noreferrer">
                <Button size="lg">
                  <Printer className="mr-1.5 h-4 w-4" /> Imprimir etiqueta 10×15
                </Button>
              </a>
              <a href={`/etiqueta/${salva.id}?formato=a4`} target="_blank" rel="noreferrer">
                <Button size="lg" variant="outline">
                  <Printer className="mr-1.5 h-4 w-4" /> Imprimir em A4
                </Button>
              </a>
              {salva.cliente_telefone && (
                <a
                  href={zapLink(salva.cliente_telefone, textoWhats(salva))}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button size="lg" variant="outline">
                    <MessageCircle className="mr-1.5 h-4 w-4 text-emerald-600" /> Mandar link no
                    WhatsApp
                  </Button>
                </a>
              )}
            </div>
            <p className="break-all text-xs text-muted-foreground">{linkDe(salva)}</p>
            <Button variant="ghost" onClick={fechar}>
              Fechar
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Cliente */}
            <section className="space-y-3">
              <h3 className="text-sm font-bold">Cliente</h3>
              <div className="relative">
                <UserSearch className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={qc1}
                  onChange={(e) => setQc1(e.target.value)}
                  placeholder="Buscar cliente do site (nome, e-mail ou @usuário) — opcional"
                />
                {!!clientes?.length && qc1.length >= 2 && (
                  <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-lg">
                    {clientes.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => {
                          set({
                            user_id: c.id,
                            cliente_nome: c.nome_completo,
                            cliente_email: c.email,
                            cliente_telefone: c.telefone ?? "",
                            endereco: c.endereco ?? "",
                            cidade: c.cidade ?? "",
                            departamento: c.departamento ?? "",
                            cep: c.cep ?? "",
                            pais: c.pais as "UY" | "BR",
                          });
                          setQc1("");
                        }}
                        className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-muted"
                      >
                        <b>{c.nome_completo}</b> · {c.email}
                        {c.cidade ? ` · ${c.cidade}` : ""}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {f.user_id && (
                <p className="text-xs text-emerald-700">✔ Ligado à conta do site (#{f.user_id})</p>
              )}
              <div className="grid gap-3 md:grid-cols-3">
                <Campo r="Nome completo *" className="md:col-span-2">
                  <Input
                    value={f.cliente_nome}
                    onChange={(e) => set({ cliente_nome: e.target.value })}
                  />
                </Campo>
                <Campo r="País">
                  <div className="flex gap-1">
                    {(["UY", "BR"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => set({ pais: p })}
                        className={cn(
                          "flex-1 rounded-md px-2 py-2 text-sm font-semibold",
                          f.pais === p ? "bg-primary text-primary-foreground" : "bg-muted",
                        )}
                      >
                        {p === "UY" ? "Uruguai" : "Brasil"}
                      </button>
                    ))}
                  </div>
                </Campo>
                <Campo r="E-mail (recebe o cupom)">
                  <Input
                    type="email"
                    value={f.cliente_email}
                    onChange={(e) => set({ cliente_email: e.target.value })}
                  />
                </Campo>
                <Campo r="Telefone / WhatsApp">
                  <Input
                    value={f.cliente_telefone}
                    onChange={(e) => set({ cliente_telefone: e.target.value })}
                    placeholder="+598 …"
                  />
                </Campo>
                <Campo r={f.pais === "BR" ? "CPF / CNPJ" : "Cédula / RUT"}>
                  <Input
                    value={f.cliente_doc}
                    onChange={(e) => set({ cliente_doc: e.target.value })}
                  />
                </Campo>
                <Campo r="Endereço (rua, número, complemento)" className="md:col-span-3">
                  <Input value={f.endereco} onChange={(e) => set({ endereco: e.target.value })} />
                </Campo>
                <Campo r="Cidade">
                  <Input value={f.cidade} onChange={(e) => set({ cidade: e.target.value })} />
                </Campo>
                <Campo r={f.pais === "BR" ? "Estado" : "Departamento"}>
                  <Input
                    value={f.departamento}
                    onChange={(e) => set({ departamento: e.target.value })}
                  />
                </Campo>
                <Campo r={f.pais === "BR" ? "CEP" : "Código postal"}>
                  <Input value={f.cep} onChange={(e) => set({ cep: e.target.value })} />
                </Campo>
              </div>
            </section>

            {/* Peças */}
            <section className="space-y-3">
              <h3 className="text-sm font-bold">Peças</h3>
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  setQpBusca(qp.trim());
                }}
              >
                <Input
                  value={qp}
                  onChange={(e) => setQp(e.target.value)}
                  placeholder="Buscar peça (nome, código ou SKU)…"
                />
                <Button type="submit" variant="secondary">
                  {isFetching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </form>
              <ResultadosPecas
                pecas={pecas}
                busca={qpBusca}
                moeda={f.moeda}
                aoAdicionar={(p) => {
                  const valor = f.moeda === "BRL" ? (p.brl ?? 0) : (p.uyu ?? 0);
                  setF((x) => ({
                    ...x,
                    itens: x.itens.some((i) => i.sku === p.sku)
                      ? x.itens.map((i) => (i.sku === p.sku ? { ...i, qtd: i.qtd + 1 } : i))
                      : [
                          ...x.itens,
                          {
                            sku: p.sku,
                            codigo: p.codigo,
                            nome: p.nome,
                            qtd: 1,
                            valor: Math.round(valor * 100) / 100,
                          },
                        ],
                  }));
                }}
              />
              {!!f.itens.length && (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                      <tr>
                        <th className="p-2">Peça</th>
                        <th className="w-20 p-2">Qtd.</th>
                        <th className="w-32 p-2">Valor un. ({f.moeda === "BRL" ? "R$" : "$U"})</th>
                        <th className="w-28 p-2 text-right">Subtotal</th>
                        <th className="w-10 p-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {f.itens.map((i, n) => (
                        <tr key={i.sku} className="border-t">
                          <td className="p-2">
                            <p className="line-clamp-1 font-medium">{i.nome}</p>
                            <p className="text-xs text-muted-foreground">{i.codigo}</p>
                            <BotaoCadastroPeca sku={i.sku} />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min={1}
                              className="h-8"
                              value={i.qtd}
                              onChange={(e) =>
                                set({
                                  itens: f.itens.map((x, k) =>
                                    k === n
                                      ? { ...x, qtd: Math.max(1, Number(e.target.value) || 1) }
                                      : x,
                                  ),
                                })
                              }
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              className="h-8"
                              value={i.valor}
                              onChange={(e) =>
                                set({
                                  itens: f.itens.map((x, k) =>
                                    k === n
                                      ? { ...x, valor: Math.max(0, Number(e.target.value) || 0) }
                                      : x,
                                  ),
                                })
                              }
                            />
                          </td>
                          <td className="p-2 text-right font-semibold">
                            {dinheiro(i.qtd * i.valor, f.moeda)}
                          </td>
                          <td className="p-2">
                            <button
                              type="button"
                              aria-label="Tirar"
                              onClick={() => set({ itens: f.itens.filter((_, k) => k !== n) })}
                            >
                              <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-600" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-muted/30">
                        <td colSpan={3} className="p-2 text-right font-bold">
                          Total
                        </td>
                        <td className="p-2 text-right text-base font-black">
                          {dinheiro(total, f.moeda)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-muted-foreground">Moeda:</span>
                {(["UYU", "BRL"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => set({ moeda: m })}
                    className={cn(
                      "rounded px-2 py-0.5 font-semibold",
                      f.moeda === m ? "bg-primary text-primary-foreground" : "bg-muted",
                    )}
                  >
                    {m === "UYU" ? "$U pesos" : "R$ reais"}
                  </button>
                ))}
              </div>
            </section>

            {/* Envio */}
            <section className="grid gap-3 md:grid-cols-3">
              <Campo r="Transportadora">
                <Input
                  value={f.transportadora}
                  onChange={(e) => set({ transportadora: e.target.value })}
                  placeholder="DAC, Correios…"
                />
              </Campo>
              <Campo r="Código de rastreio">
                <Input value={f.rastreio} onChange={(e) => set({ rastreio: e.target.value })} />
              </Campo>
              <Campo r="Situação">
                <select
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                  value={f.status}
                  onChange={(e) => set({ status: e.target.value })}
                >
                  <option value="ABERTA">Aberta</option>
                  <option value="ENVIADA">Enviada</option>
                  <option value="ENTREGUE">Entregue</option>
                  <option value="CANCELADA">Cancelada</option>
                </select>
              </Campo>
              <Campo r="Canal da venda">
                <select
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                  value={f.canal}
                  onChange={(e) => set({ canal: e.target.value })}
                >
                  <option value="">—</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="SITE">Site</option>
                  <option value="LINK">Link de pagamento</option>
                  <option value="BALCAO">Balcão</option>
                  <option value="TELEFONE">Telefone</option>
                  <option value="MERCADOLIVRE">Mercado Livre</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </Campo>
              <Campo r="Forma de pagamento">
                <select
                  className="h-9 w-full rounded-md border bg-background px-2 text-sm"
                  value={f.metodo}
                  onChange={(e) => set({ metodo: e.target.value })}
                >
                  <option value="">—</option>
                  <option value="TRANSFERENCIA">Transferência</option>
                  <option value="DINHEIRO">Dinheiro</option>
                  <option value="PIX">PIX</option>
                  <option value="CARTAO">Cartão</option>
                  <option value="STRIPE">Stripe</option>
                  <option value="ABITAB">Abitab</option>
                  <option value="REDPAGOS">Redpagos</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </Campo>
              <p className="self-end text-xs text-muted-foreground">
                Custos e lucro desta venda: Admin → Financeiro.
              </p>
              <Campo r="Observação interna" className="md:col-span-3">
                <Textarea
                  rows={2}
                  value={f.observacao}
                  onChange={(e) => set({ observacao: e.target.value })}
                />
              </Campo>
            </section>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="ghost" onClick={fechar}>
                Cancelar
              </Button>
              <Button
                onClick={salvar}
                disabled={salvando || !f.cliente_nome.trim() || !f.itens.length}
              >
                {salvando ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                Salvar venda
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DialogoRemetente({ fechar }: { fechar: () => void }) {
  const { data } = useQuery({ queryKey: ["remetente"], queryFn: () => remetenteFn() });
  const [r, setR] = useState<any>(null);
  useEffect(() => {
    if (data && !r) setR(data);
  }, [data, r]);
  return (
    <Dialog open onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Remetente da etiqueta</DialogTitle>
        </DialogHeader>
        {!r ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        ) : (
          <div className="space-y-3">
            {(
              [
                ["nome", "Nome"],
                ["endereco", "Endereço"],
                ["cidade", "Cidade / país"],
                ["telefone", "Telefone"],
                ["doc", "Documento (RUT/CNPJ) — opcional"],
              ] as const
            ).map(([k, rot]) => (
              <Campo key={k} r={rot}>
                <Input value={r[k] ?? ""} onChange={(e) => setR({ ...r, [k]: e.target.value })} />
              </Campo>
            ))}
            <Button
              className="w-full"
              onClick={async () => {
                await salvarRemetenteFn({ data: r });
                toast.success("Remetente salvo");
                fechar();
              }}
            >
              <Save className="mr-1.5 h-4 w-4" /> Salvar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
