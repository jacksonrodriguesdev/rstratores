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
  RotateCcw,
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
  excluirVendasFn,
  listarVendasFn,
  restaurarVendaFn,
  vendasExcluidasFn,
  remetenteFn,
  salvarRastreioFn,
  salvarRemetenteFn,
  salvarVendaFn,
} from "@/lib/avaliacoes";
import { cn } from "@/lib/utils";
import { EtapaPedido } from "@/components/admin/EtapaPedido";
import { BotaoCadastroPeca, ResultadosPecas } from "@/components/admin/PecasVenda";

export const Route = createFileRoute("/admin/vendas")({ component: PaginaVendas });

type Item = {
  sku: string;
  codigo: string;
  nome: string;
  qtd: number;
  valor: number;
  custo?: number | null;
};
// Peça fora do catálogo (venda de balcão): nome, valor e custo digitados à mão
const AVULSO = "AVULSO-";
const ehAvulso = (i: Item) => i.sku.startsWith(AVULSO);
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
  end_numero: string;
  end_bairro: string;
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
  data: string; // dia da venda (AAAA-MM-DD); vazio = hoje
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
  end_numero: "",
  end_bairro: "",
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
  data: "",
};
const STATUS: Record<string, string> = {
  ABERTA: "bg-sky-100 text-sky-800",
  ENVIADA: "bg-amber-100 text-amber-800",
  ENTREGUE: "bg-emerald-100 text-emerald-800",
  CANCELADA: "bg-zinc-200 text-zinc-600",
};
const diaBR = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
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
  const n = v.cliente_nome.split(/\s+/)[0];
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
  const [marcadas, setMarcadas] = useState<Set<number>>(new Set());
  const [apagar, setApagar] = useState<any[] | null>(null);
  const [lixeira, setLixeira] = useState(false);
  const marcar = (id: number) =>
    setMarcadas((m) => {
      const n = new Set(m);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
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
        <Button variant="ghost" onClick={() => setLixeira(true)}>
          <Trash2 className="mr-1.5 h-4 w-4" /> Apagadas
        </Button>
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
        {marcadas.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 border-b bg-red-50 px-3 py-2 text-sm dark:bg-red-950/30">
            <b>{marcadas.size} venda(s) selecionada(s)</b>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setApagar((data?.vendas ?? []).filter((v) => marcadas.has(v.id)))}
            >
              <Trash2 className="mr-1.5 h-4 w-4" /> Apagar selecionadas
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setMarcadas(new Set())}>
              Limpar seleção
            </Button>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="w-8 p-3">
                  <input
                    type="checkbox"
                    aria-label="Selecionar todas"
                    className="h-4 w-4 cursor-pointer accent-primary"
                    checked={!!data?.vendas.length && marcadas.size === data.vendas.length}
                    onChange={(e) =>
                      setMarcadas(
                        e.target.checked ? new Set(data?.vendas.map((v) => v.id)) : new Set(),
                      )
                    }
                  />
                </th>
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
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              )}
              {data?.vendas.map((v) => (
                <tr
                  key={v.id}
                  className={cn(
                    "border-t align-top",
                    marcadas.has(v.id) && "bg-red-50/60 dark:bg-red-950/20",
                  )}
                >
                  <td className="p-3">
                    <input
                      type="checkbox"
                      aria-label={`Selecionar venda ${v.codigo}`}
                      className="h-4 w-4 cursor-pointer accent-primary"
                      checked={marcadas.has(v.id)}
                      onChange={() => marcar(v.id)}
                    />
                  </td>
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
                            data: diaBR(new Date(v.created_at)),
                          } as Form)
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Apagar venda"
                        title="Apagar venda e etiqueta"
                        onClick={() => setApagar([v])}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-red-600" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {data && !data.vendas.length && (
                <tr>
                  <td colSpan={9} className="p-10 text-center text-sm text-muted-foreground">
                    Nenhuma venda ainda. Clique em <b>Nova venda</b>.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {form && (
        <FormVenda
          inicial={form}
          fechar={() => setForm(null)}
          aoApagar={() => {
            const v = data?.vendas.find((x) => x.id === form.id);
            if (v) {
              setForm(null);
              setApagar([v]);
            }
          }}
        />
      )}
      {apagar && (
        <DialogoApagar
          vendas={apagar}
          fechar={(apagadas) => {
            if (apagadas?.length)
              setMarcadas((m) => {
                const n = new Set(m);
                for (const v of apagar) n.delete(v.id);
                return n;
              });
            setApagar(null);
          }}
        />
      )}
      {lixeira && <DialogoApagadas fechar={() => setLixeira(false)} />}
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

// Brasil: endereço separado como a nota fiscal pede. O CEP preenche rua, bairro, cidade e estado
// (ViaCEP); falta só o número.
function EnderecoBrasil({ f, set }: { f: Form; set: (p: Partial<Form>) => void }) {
  const [buscando, setBuscando] = useState(false);
  const buscarCep = async (cep: string) => {
    const n = cep.replace(/D/g, "");
    if (n.length !== 8) return;
    setBuscando(true);
    try {
      const r = await fetch(`https://viacep.com.br/ws/${n}/json/`).then((x) => x.json());
      if (r?.erro) return void toast.error("CEP não encontrado");
      set({
        endereco: f.endereco || r.logradouro || "",
        end_bairro: f.end_bairro || r.bairro || "",
        cidade: r.localidade || f.cidade,
        departamento: r.uf || f.departamento,
      });
    } catch {
      /* sem internet: preenche à mão */
    } finally {
      setBuscando(false);
    }
  };
  return (
    <>
      <Campo r={buscando ? "CEP (buscando…)" : "CEP (preenche o resto)"}>
        <Input
          value={f.cep}
          inputMode="numeric"
          onChange={(e) => set({ cep: e.target.value })}
          onBlur={(e) => buscarCep(e.target.value)}
          placeholder="96230-000"
        />
      </Campo>
      <Campo r="Rua / estrada (e complemento)" className="md:col-span-2">
        <Input value={f.endereco} onChange={(e) => set({ endereco: e.target.value })} />
      </Campo>
      <Campo r="Número (S/N se não tiver)">
        <Input value={f.end_numero} onChange={(e) => set({ end_numero: e.target.value })} />
      </Campo>
      <Campo r="Bairro / localidade" className="md:col-span-2">
        <Input value={f.end_bairro} onChange={(e) => set({ end_bairro: e.target.value })} />
      </Campo>
    </>
  );
}

function FormVenda({
  inicial,
  fechar,
  aoApagar,
}: {
  inicial: Form;
  fechar: () => void;
  aoApagar: () => void;
}) {
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
                {f.pais === "BR" ? (
                  <EnderecoBrasil f={f} set={set} />
                ) : (
                  <Campo r="Endereço (rua, número, complemento)" className="md:col-span-3">
                    <Input value={f.endereco} onChange={(e) => set({ endereco: e.target.value })} />
                  </Campo>
                )}
                <Campo r="Cidade">
                  <Input value={f.cidade} onChange={(e) => set({ cidade: e.target.value })} />
                </Campo>
                <Campo r={f.pais === "BR" ? "Estado" : "Departamento"}>
                  <Input
                    value={f.departamento}
                    onChange={(e) => set({ departamento: e.target.value })}
                  />
                </Campo>
                {f.pais !== "BR" && (
                  <Campo r="Código postal">
                    <Input value={f.cep} onChange={(e) => set({ cep: e.target.value })} />
                  </Campo>
                )}
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setF((x) => ({
                    ...x,
                    itens: [
                      ...x.itens,
                      { sku: `${AVULSO}${Date.now()}`, codigo: "", nome: "", qtd: 1, valor: 0 },
                    ],
                  }))
                }
              >
                <Plus className="mr-1 h-3.5 w-3.5" /> Peça fora do catálogo
              </Button>
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
                            {ehAvulso(i) ? (
                              <div className="grid gap-1.5 sm:grid-cols-[1fr_8rem_8rem]">
                                <Input
                                  className="h-8"
                                  placeholder="Nome da peça *"
                                  value={i.nome}
                                  onChange={(e) =>
                                    set({
                                      itens: f.itens.map((x, k) =>
                                        k === n ? { ...x, nome: e.target.value } : x,
                                      ),
                                    })
                                  }
                                />
                                <Input
                                  className="h-8"
                                  placeholder="Código"
                                  value={i.codigo}
                                  onChange={(e) =>
                                    set({
                                      itens: f.itens.map((x, k) =>
                                        k === n ? { ...x, codigo: e.target.value } : x,
                                      ),
                                    })
                                  }
                                />
                                <Input
                                  className="h-8"
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  placeholder="Custo un."
                                  title="Quanto você pagou por unidade (para o lucro)"
                                  value={i.custo ?? ""}
                                  onChange={(e) =>
                                    set({
                                      itens: f.itens.map((x, k) =>
                                        k === n
                                          ? {
                                              ...x,
                                              custo:
                                                e.target.value === ""
                                                  ? null
                                                  : Math.max(0, Number(e.target.value) || 0),
                                            }
                                          : x,
                                      ),
                                    })
                                  }
                                />
                              </div>
                            ) : (
                              <>
                                <p className="line-clamp-1 font-medium">{i.nome}</p>
                                <p className="text-xs text-muted-foreground">{i.codigo}</p>
                                <BotaoCadastroPeca sku={i.sku} />
                              </>
                            )}
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
              <Campo r="Data da venda">
                <Input
                  type="date"
                  value={f.data || diaBR(new Date())}
                  max={diaBR(new Date())}
                  onChange={(e) => set({ data: e.target.value })}
                />
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
                  <option value="INDICACAO">Indicação (boca a boca)</option>
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

            <div className="flex flex-wrap justify-end gap-2 border-t pt-4">
              {f.id && (
                <Button
                  variant="ghost"
                  className="mr-auto text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={aoApagar}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" /> Apagar venda
                </Button>
              )}
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

// Apagar vendas (e as etiquetas delas). Vai para "Apagadas", de onde dá para restaurar.
function DialogoApagar({
  vendas,
  fechar,
}: {
  vendas: any[];
  fechar: (apagadas?: string[]) => void;
}) {
  const qc = useQueryClient();
  const [apagando, setApagando] = useState(false);
  const [bloqueadas, setBloqueadas] = useState<Array<{ codigo: string; motivo: string }>>([]);
  const deLink = vendas.filter((v) => v.link_id);
  const comCupom = vendas.filter((v) => v.cupom);
  const doBrasil = vendas.filter((v) => v.pais === "BR");
  const confirmar = async () => {
    setApagando(true);
    try {
      const r = await excluirVendasFn({ data: { ids: vendas.map((v) => v.id) } });
      qc.invalidateQueries({ queryKey: ["vendas"] });
      qc.invalidateQueries({ queryKey: ["vendas-apagadas"] });
      if (r.apagadas.length)
        toast.success(
          r.apagadas.length === 1
            ? `Venda ${r.apagadas[0]} apagada`
            : `${r.apagadas.length} vendas apagadas`,
        );
      if (r.bloqueadas.length) setBloqueadas(r.bloqueadas);
      else fechar(r.apagadas);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setApagando(false);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {vendas.length === 1 ? "Apagar esta venda?" : `Apagar ${vendas.length} vendas?`}
          </DialogTitle>
        </DialogHeader>
        {bloqueadas.length ? (
          <div className="space-y-3 text-sm">
            <p className="font-semibold text-red-700">Estas não foram apagadas:</p>
            <ul className="space-y-1">
              {bloqueadas.map((b) => (
                <li key={b.codigo}>
                  <span className="font-mono font-bold">{b.codigo}</span> — {b.motivo}
                </li>
              ))}
            </ul>
            <div className="flex justify-end">
              <Button onClick={() => fechar()}>Entendi</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            <ul className="max-h-48 space-y-1 overflow-y-auto rounded-md border p-2">
              {vendas.map((v) => (
                <li key={v.id} className="flex justify-between gap-3">
                  <span>
                    <span className="font-mono font-bold">{v.codigo}</span> · {v.cliente_nome}
                  </span>
                  <span className="whitespace-nowrap font-semibold">
                    {dinheiro(v.total, v.moeda)}
                  </span>
                </li>
              ))}
            </ul>
            <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
              <li>A etiqueta, o acompanhamento do pedido e os números do Financeiro saem junto.</li>
              <li>
                Fica guardada em <b>Apagadas</b>: dá para restaurar igual, com o mesmo código.
              </li>
              {deLink.length > 0 && (
                <li>
                  {deLink.length === 1 ? "Ela veio" : `${deLink.length} vieram`} de um link de
                  pagamento pago. O link continua pago, mas não vira venda de novo sozinho.
                </li>
              )}
              {comCupom.length > 0 && (
                <li>O cupom de 15% que o cliente ganhou ao avaliar continua valendo.</li>
              )}
              {doBrasil.length > 0 && (
                <li>
                  Venda com nota fiscal autorizada não é apagada: cancele a nota no Fiscal antes.
                </li>
              )}
              <li>
                Se a venda só não aconteceu, você também pode marcar como <b>Cancelada</b> no
                editar: ela sai das contas e fica no histórico.
              </li>
            </ul>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="ghost" onClick={() => fechar()}>
                Voltar
              </Button>
              <Button variant="destructive" onClick={confirmar} disabled={apagando}>
                {apagando ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-1.5 h-4 w-4" />
                )}
                Apagar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Vendas apagadas: restaurar volta a venda inteira (etapas, avaliações e extrato ligados)
function DialogoApagadas({ fechar }: { fechar: () => void }) {
  const qc = useQueryClient();
  const [restaurando, setRestaurando] = useState<number | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: ["vendas-apagadas"],
    queryFn: () => vendasExcluidasFn(),
  });
  const restaurar = async (id: number) => {
    setRestaurando(id);
    try {
      const v = await restaurarVendaFn({ data: { id } });
      qc.invalidateQueries({ queryKey: ["vendas"] });
      qc.invalidateQueries({ queryKey: ["vendas-apagadas"] });
      toast.success(`Venda ${v.codigo} restaurada`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setRestaurando(null);
    }
  };
  return (
    <Dialog open onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Vendas apagadas</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        ) : !data?.length ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma venda apagada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr>
                  <th className="p-2">Venda</th>
                  <th className="p-2">Cliente</th>
                  <th className="p-2 text-right">Total</th>
                  <th className="p-2">Apagada em</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {data.map((x) => (
                  <tr key={x.id} className="border-t">
                    <td className="p-2">
                      <p className="font-mono font-bold">{x.codigo}</p>
                      {x.criada && (
                        <p className="text-xs text-muted-foreground">
                          venda de {new Date(x.criada).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </td>
                    <td className="p-2">{x.cliente_nome}</td>
                    <td className="whitespace-nowrap p-2 text-right font-semibold">
                      {dinheiro(x.total, x.moeda)}
                    </td>
                    <td className="p-2 text-xs text-muted-foreground">
                      {new Date(x.created_at).toLocaleString("pt-BR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="p-2 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={restaurando !== null}
                        onClick={() => restaurar(x.id)}
                      >
                        {restaurando === x.id ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="mr-1 h-4 w-4" />
                        )}
                        Restaurar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
