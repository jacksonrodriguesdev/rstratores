import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import {
  CreditCard,
  Plus,
  Search,
  Loader2,
  Copy,
  MessageCircle,
  Trash2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  XCircle,
  Link2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  statusIntegracaoFn,
  listarLinksFn,
  detalheLinkFn,
  criarLinkFn,
  cancelarLinkFn,
  conferirPagamentoFn,
  buscarPecasLinkFn,
  dadosDoCarrinhoFn,
  type PecaLink,
} from "@/lib/pagamentos";
import { validarCupomLinkFn } from "@/lib/campanhas";
import {
  FRETE_MODOS,
  METODOS,
  ROTULO_METODO,
  fmtValor,
  type FreteModo,
  type ItemLink,
  type Metodo,
  type Pais,
} from "@/lib/pagamentos-comum";
import { cn } from "@/lib/utils";
import { ProductImage } from "@/components/ProductImage";

// Vendas → Pagamentos: links de pagamento (dLocal). A equipe fecha o pedido no WhatsApp, cria o
// link com itens, frete e formas de pagamento, e manda ao cliente. O cliente paga logado e a
// compra fica na conta dele.
export const Route = createFileRoute("/admin/pagamentos")({
  validateSearch: z.object({
    link: z.coerce.number().optional(),
    carrinho: z.coerce.number().optional(),
  }),
  component: PagamentosPage,
});

const COR_STATUS: Record<string, string> = {
  ABERTO: "bg-amber-100 text-amber-800",
  PAGO: "bg-emerald-100 text-emerald-800",
  CANCELADO: "bg-zinc-200 text-zinc-600",
  VENCIDO: "bg-zinc-200 text-zinc-600",
  PENDENTE: "bg-amber-100 text-amber-800",
  AUTORIZADO: "bg-sky-100 text-sky-800",
  RECUSADO: "bg-red-100 text-red-700",
  ERRO: "bg-red-100 text-red-700",
  CRIANDO: "bg-zinc-100 text-zinc-500",
};
const ROTULO: Record<string, string> = {
  ABERTO: "Aguardando",
  PAGO: "Pago",
  CANCELADO: "Cancelado",
  VENCIDO: "Vencido",
  PENDENTE: "Pendente",
  AUTORIZADO: "Autorizado",
  RECUSADO: "Recusado",
  ERRO: "Erro",
  CRIANDO: "Criando",
};
const Selo = ({ s }: { s: string }) => (
  <span
    className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold", COR_STATUS[s] ?? "bg-zinc-100")}
  >
    {ROTULO[s] ?? s}
  </span>
);
const dataHora = (s: string) =>
  new Date(s).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
const urlLink = (codigo: string, pais: string) =>
  `${typeof window !== "undefined" ? window.location.origin : ""}${pais === "BR" ? "/pt" : ""}/pagar/${codigo}`;
const copiar = async (texto: string, msg = "Copiado") => {
  await navigator.clipboard.writeText(texto).catch(() => {});
  toast.success(msg);
};
function mensagemWhats(
  pais: string,
  total: string,
  url: string,
  nome?: string | null,
  freteModo?: string,
) {
  const p = (nome ?? "").trim().split(/\s+/)[0];
  const br = pais === "BR";
  const frete =
    freteModo === "NA_CHEGADA"
      ? br
        ? "\n🚚 Frete por conta do comprador: pago na chegada."
        : "\n🚚 Envío a cargo del comprador: se paga al recibir."
      : freteModo === "GRATIS"
        ? br
          ? "\n🚚 Frete grátis."
          : "\n🚚 Envío sin costo."
        : "";
  return br
    ? `Olá${p ? " " + p : ""}! Aqui é da *AGRO PARTS* 🚜\n\nSeu pedido está pronto para pagamento: *${total}*.${frete}\nPague com PIX ou cartão neste link (entre ou crie sua conta):\n${url}\n\nQualquer dúvida, é só responder aqui.`
    : `¡Hola${p ? " " + p : ""}! Te escribe *AGRO PARTS* 🚜\n\nTu pedido está listo para pagar: *${total}*.${frete}\nPagá con tarjeta, Abitab o Redpagos en este link (ingresá o creá tu cuenta):\n${url}\n\nCualquier duda, respondé este mensaje.`;
}
const waUrl = (texto: string, tel?: string | null) =>
  `https://api.whatsapp.com/send?${tel ? `phone=${tel.replace(/\D/g, "")}&` : ""}text=${encodeURIComponent(texto)}`;

// "1.234,50" | "1234.5" | "1234" → centavos
function centavos(v: string) {
  let s = String(v || "").replace(/[^\d.,]/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
const paraCampo = (c: number) => (c ? (c / 100).toString().replace(".", ",") : "");

function PagamentosPage() {
  const { link, carrinho } = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/pagamentos" });
  const qc = useQueryClient();
  const [status, setStatus] = useState("");
  const [busca, setBusca] = useState("");
  const [buscaFinal, setBuscaFinal] = useState("");
  const [novo, setNovo] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setBuscaFinal(busca), 400);
    return () => clearTimeout(t);
  }, [busca]);
  useEffect(() => {
    if (carrinho) setNovo(true);
  }, [carrinho]);

  const integ = useQuery({ queryKey: ["dlocal-status"], queryFn: () => statusIntegracaoFn() });
  const { data, isLoading } = useQuery({
    queryKey: ["admin-links", status, buscaFinal],
    queryFn: () => listarLinksFn({ data: { status, busca: buscaFinal } }),
    refetchInterval: 30000,
  });
  const recarregar = () => qc.invalidateQueries({ queryKey: ["admin-links"] });
  const abrir = (id?: number) => navigate({ search: (s: any) => ({ ...s, link: id }) });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-zinc-900">
            <CreditCard className="h-6 w-6 text-primary" /> Pagamentos
          </h1>
          <p className="text-sm text-zinc-500">
            Links de pagamento pela dLocal: Uruguai (cartão, Abitab, Redpagos) e Brasil (cartão e
            PIX).
          </p>
        </div>
        <Button onClick={() => setNovo(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Novo link de pagamento
        </Button>
      </div>

      <Integracao d={integ.data} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {(data?.pagosMes.length ? data.pagosMes : [{ moeda: "UYU", total: 0, qtd: 0 }]).map((p) => (
          <Card key={"p" + p.moeda} className="p-4">
            <p className="text-xs font-semibold uppercase text-zinc-500">Pago no mês ({p.moeda})</p>
            <p className="text-2xl font-black text-emerald-700">{fmtValor(p.total, p.moeda)}</p>
            <p className="text-xs text-zinc-500">{p.qtd} venda(s)</p>
          </Card>
        ))}
        {data?.abertos.map((p) => (
          <Card key={"a" + p.moeda} className="p-4">
            <p className="text-xs font-semibold uppercase text-zinc-500">Aguardando ({p.moeda})</p>
            <p className="text-2xl font-black text-amber-600">{fmtValor(p.total, p.moeda)}</p>
            <p className="text-xs text-zinc-500">{p.qtd} link(s) em aberto</p>
          </Card>
        ))}
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          {[
            ["", "Todos"],
            ["ABERTO", "Aguardando"],
            ["PAGO", "Pagos"],
            ["VENCIDO", "Vencidos"],
            ["CANCELADO", "Cancelados"],
          ].map(([v, r]) => (
            <button
              key={v}
              onClick={() => setStatus(v)}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-semibold",
                status === v
                  ? "bg-primary text-white"
                  : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200",
              )}
            >
              {r}
            </button>
          ))}
          <div className="relative ml-auto w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Nº, cliente, e-mail ou código da peça"
              className="pl-9"
            />
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          {isLoading ? (
            <p className="flex items-center gap-2 p-6 text-sm text-zinc-500">
              <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
            </p>
          ) : !data?.lista.length ? (
            <p className="p-6 text-center text-sm text-zinc-500">Nenhum link ainda.</p>
          ) : (
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-zinc-500">
                  <th className="py-2 pr-3">Nº</th>
                  <th className="pr-3">Cliente</th>
                  <th className="pr-3">Pedido</th>
                  <th className="pr-3 text-right">Total</th>
                  <th className="pr-3">Situação</th>
                  <th className="pr-3">Criado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {data.lista.map((l) => (
                  <tr
                    key={l.id}
                    className="cursor-pointer border-b hover:bg-zinc-50"
                    onClick={() => abrir(l.id)}
                  >
                    <td className="py-3 pr-3 font-bold">
                      #{l.id} <span className="ml-1 text-xs">{l.pais === "BR" ? "🇧🇷" : "🇺🇾"}</span>
                    </td>
                    <td className="pr-3">
                      <p className="font-semibold text-zinc-900">{l.cliente?.nome ?? "—"}</p>
                      <p className="text-xs text-zinc-500">
                        {l.cliente?.email ?? l.email_cliente ?? "qualquer conta"}
                      </p>
                    </td>
                    <td className="pr-3 text-zinc-600">
                      {l.descricao || `${l.itens} item(ns)`}
                      {l.carrinho_id && (
                        <span className="ml-1 text-xs text-zinc-400">
                          · carrinho {l.carrinho_id}
                        </span>
                      )}
                    </td>
                    <td className="pr-3 text-right font-bold">{fmtValor(l.total, l.moeda)}</td>
                    <td className="pr-3">
                      <div className="flex flex-wrap items-center gap-1">
                        <Selo s={l.status} />
                        {l.metodo_pago && (
                          <span className="text-xs text-zinc-500">{l.metodo_pago}</span>
                        )}
                        {l.status === "ABERTO" && l.pendentes > 0 && (
                          <span className="text-xs text-amber-700">PIX/ticket gerado</span>
                        )}
                        {l.duplicado && (
                          <span className="rounded bg-red-100 px-1.5 text-xs font-bold text-red-700">
                            pago 2×
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="pr-3 text-xs text-zinc-500">{dataHora(l.created_at)}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {l.status === "ABERTO" && (
                        <button
                          title="Copiar link"
                          onClick={() => copiar(urlLink(l.codigo, l.pais), "Link copiado")}
                          className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </Card>

      {novo && (
        <NovoLink
          carrinhoId={carrinho}
          fechar={(id) => {
            setNovo(false);
            recarregar();
            navigate({ search: { link: id } });
          }}
        />
      )}
      {link ? <Detalhe id={link} fechar={() => abrir(undefined)} recarregar={recarregar} /> : null}
    </div>
  );
}

function Integracao({ d }: { d?: Awaited<ReturnType<typeof statusIntegracaoFn>> }) {
  if (!d) return null;
  if (!d.configurado)
    return (
      <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
        <p className="flex items-center gap-2 font-bold">
          <AlertTriangle className="h-4 w-4" /> dLocal ainda não configurada
        </p>
        <p className="mt-1">
          Você já pode criar e enviar links, mas o cliente só consegue pagar depois que as chaves
          forem colocadas nas variáveis de ambiente da Hostinger (hPanel):{" "}
          <code>DLOCAL_X_LOGIN</code>, <code>DLOCAL_X_TRANS_KEY</code>,{" "}
          <code>DLOCAL_SECRET_KEY</code>, <code>DLOCAL_SMARTFIELDS_KEY</code> e{" "}
          <code>DLOCAL_AMBIENTE</code> (sandbox ou producao). Nunca mande as chaves por chat.
        </p>
        <p className="mt-1">
          No painel da dLocal, cadastre o endereço de avisos:{" "}
          <code className="select-all break-all">{d.urlAviso}</code>
        </p>
      </div>
    );
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-5 gap-y-1 rounded-2xl p-3 text-sm ring-1",
        d.ambiente === "producao"
          ? "bg-emerald-50 text-emerald-900 ring-emerald-200"
          : "bg-sky-50 text-sky-900 ring-sky-200",
      )}
    >
      <span className="flex items-center gap-1.5 font-bold">
        <CheckCircle2 className="h-4 w-4" /> dLocal{" "}
        {d.ambiente === "producao" ? "em PRODUÇÃO" : "em TESTE (sandbox)"}
      </span>
      <span>Cartão: {d.smartFields ? "ativo" : "falta DLOCAL_SMARTFIELDS_KEY"}</span>
      <span>
        Avisos (7 dias): {d.avisos}
        {d.comErro ? ` · ${d.comErro} com erro` : ""}
      </span>
      {d.presos > 0 && (
        <span className="font-bold text-amber-700">
          {d.presos} pagamento(s) pendente(s) há +2 dias
        </span>
      )}
      <span className="text-xs opacity-70">Avisos em: {d.urlAviso}</span>
    </div>
  );
}

type Linha = ItemLink & { _id: number; precoTxt: string };
let seq = 1;

function NovoLink({ carrinhoId, fechar }: { carrinhoId?: number; fechar: (id?: number) => void }) {
  const [pais, setPais] = useState<Pais>("UY");
  const [metodos, setMetodos] = useState<Metodo[]>(METODOS.UY);
  const [itens, setItens] = useState<Linha[]>([]);
  const [frete, setFrete] = useState("");
  const [freteModo, setFreteModo] = useState<FreteModo>("COBRADO");
  const [desconto, setDesconto] = useState("");
  // Cupom (Admin → Campanhas e cupons): confere e preenche o desconto
  const [cupomTxt, setCupomTxt] = useState("");
  const [cupom, setCupom] = useState<{ codigo: string; descricao: string } | null>(null);
  const [conferindo, setConferindo] = useState(false);
  const [email, setEmail] = useState("");
  const [descricao, setDescricao] = useState("");
  const [notaCliente, setNotaCliente] = useState("");
  const [notaInterna, setNotaInterna] = useState("");
  const [dias, setDias] = useState(7);
  const [salvando, setSalvando] = useState(false);
  const [q, setQ] = useState("");
  const [qFinal, setQFinal] = useState("");
  const [precosCarrinho, setPrecosCarrinho] = useState<
    Record<string, { uyu: number | null; brl: number | null }>
  >({});
  useEffect(() => {
    const t = setTimeout(() => setQFinal(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);
  const pecas = useQuery({
    queryKey: ["pecas-link", qFinal],
    queryFn: () => buscarPecasLinkFn({ data: { q: qFinal } }),
    enabled: qFinal.length >= 2,
  });

  // Vindo de Carrinhos: itens, cliente e preços já preenchidos
  useEffect(() => {
    if (!carrinhoId) return;
    dadosDoCarrinhoFn({ data: { id: carrinhoId } })
      .then((c) => {
        setPais(c.pais);
        setMetodos(METODOS[c.pais]);
        if (c.cliente?.email) setEmail(c.cliente.email);
        setPrecosCarrinho(
          Object.fromEntries(c.itens.map((i) => [i.sku, { uyu: i.uyu, brl: i.brl }])),
        );
        setItens(
          c.itens.map((i) => {
            const preco = (c.pais === "BR" ? i.brl : i.uyu) ?? 0;
            return {
              _id: seq++,
              sku: i.sku,
              codigo: i.codigo,
              nome: i.nome,
              imagem: i.imagem,
              quantidade: i.quantidade,
              preco,
              precoTxt: paraCampo(preco),
            };
          }),
        );
      })
      .catch((e) => toast.error(e.message));
  }, [carrinhoId]);

  const trocarPais = (p: Pais) => {
    setPais(p);
    setMetodos(METODOS[p]);
    // Troca o preço das peças do catálogo para a moeda do país
    setItens((l) =>
      l.map((i) => {
        const v = i.sku ? precosCarrinho[i.sku] : null;
        const preco = v ? ((p === "BR" ? v.brl : v.uyu) ?? 0) : i.preco;
        return { ...i, preco, precoTxt: paraCampo(preco) };
      }),
    );
  };
  const addPeca = (p: PecaLink) => {
    const preco = (pais === "BR" ? p.brl : p.uyu) ?? 0;
    setPrecosCarrinho((m) => ({ ...m, [p.sku]: { uyu: p.uyu, brl: p.brl } }));
    setItens((l) => [
      ...l,
      {
        _id: seq++,
        sku: p.sku,
        codigo: p.codigo,
        nome: p.nome,
        imagem: p.imagem,
        quantidade: 1,
        preco,
        precoTxt: paraCampo(preco),
      },
    ]);
    setQ("");
  };
  const mudar = (id: number, campo: Partial<Linha>) =>
    setItens((l) => l.map((i) => (i._id === id ? { ...i, ...campo } : i)));

  const moeda = pais === "BR" ? "BRL" : "UYU";
  const subtotal = itens.reduce((t, i) => t + i.preco * i.quantidade, 0);
  const total = subtotal + (freteModo === "COBRADO" ? centavos(frete) : 0) - centavos(desconto);

  const criar = async () => {
    setSalvando(true);
    try {
      const r = await criarLinkFn({
        data: {
          pais,
          itens: itens.map(({ _id, precoTxt, ...i }) => i),
          frete: freteModo === "COBRADO" ? centavos(frete) : 0,
          frete_modo: freteModo,
          desconto: centavos(desconto),
          cupom: cupom?.codigo,
          metodos,
          descricao,
          nota_cliente: notaCliente,
          nota_interna: notaInterna,
          email_cliente: email,
          carrinho_id: carrinhoId ?? null,
          dias_validade: dias,
        },
      });
      await copiar(r.url, "Link criado e copiado");
      fechar(r.id);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Novo link de pagamento{carrinhoId ? ` (carrinho ${carrinhoId})` : ""}
          </DialogTitle>
          <DialogDescription>
            Monte o pedido como foi combinado no WhatsApp. O cliente abre o link, entra na conta e
            paga.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="flex flex-wrap gap-4">
            <div>
              <p className="mb-1 text-xs font-bold uppercase text-zinc-500">País e moeda</p>
              <div className="flex gap-2">
                {(["UY", "BR"] as Pais[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => trocarPais(p)}
                    className={cn(
                      "rounded-xl px-4 py-2 text-sm font-bold ring-1",
                      pais === p
                        ? "bg-primary text-white ring-primary"
                        : "ring-zinc-200 hover:bg-zinc-50",
                    )}
                  >
                    {p === "UY" ? "🇺🇾 Uruguai ($U)" : "🇧🇷 Brasil (R$)"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-1 text-xs font-bold uppercase text-zinc-500">Formas de pagamento</p>
              <div className="flex flex-wrap gap-3 pt-2">
                {METODOS[pais].map((m) => (
                  <label key={m} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      checked={metodos.includes(m)}
                      onChange={(e) =>
                        setMetodos((l) => (e.target.checked ? [...l, m] : l.filter((x) => x !== m)))
                      }
                    />
                    {ROTULO_METODO[m][pais === "BR" ? 1 : 0]}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Itens */}
          <div>
            <p className="mb-1 text-xs font-bold uppercase text-zinc-500">Itens</p>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Buscar peça no catálogo (código, SKU ou nome)"
                className="pl-9"
              />
              {qFinal.length >= 2 && (
                <div className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-xl bg-white shadow-lg ring-1 ring-black/10">
                  {pecas.isLoading ? (
                    <p className="p-3 text-sm text-zinc-500">Buscando…</p>
                  ) : !pecas.data?.length ? (
                    <p className="p-3 text-sm text-zinc-500">Nada encontrado. Use “Item avulso”.</p>
                  ) : (
                    pecas.data.map((p) => (
                      <button
                        key={p.sku}
                        onClick={() => addPeca(p)}
                        className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-zinc-50"
                      >
                        <span className="h-9 w-9 shrink-0 overflow-hidden rounded">
                          <ProductImage src={p.imagem} alt="" className="h-full w-full" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{p.nome}</span>
                          <span className="text-xs text-zinc-500">{p.codigo}</span>
                        </span>
                        <span className="text-xs font-bold text-zinc-700">
                          {pais === "BR"
                            ? p.brl
                              ? fmtValor(p.brl, "BRL")
                              : "sem preço"
                            : p.uyu
                              ? fmtValor(p.uyu, "UYU")
                              : "sem preço"}
                        </span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="mt-3 space-y-2">
              {itens.map((i) => (
                <div
                  key={i._id}
                  className="grid grid-cols-[1fr_70px_110px_32px] items-center gap-2 rounded-xl bg-zinc-50 p-2 sm:grid-cols-[120px_1fr_70px_110px_32px]"
                >
                  <Input
                    value={i.codigo}
                    onChange={(e) => mudar(i._id, { codigo: e.target.value })}
                    placeholder="Código"
                    className="hidden h-9 sm:block"
                  />
                  <Input
                    value={i.nome}
                    onChange={(e) => mudar(i._id, { nome: e.target.value })}
                    placeholder="Descrição"
                    className="h-9"
                  />
                  <Input
                    type="number"
                    min={1}
                    value={i.quantidade}
                    onChange={(e) =>
                      mudar(i._id, { quantidade: Math.max(1, Number(e.target.value) || 1) })
                    }
                    className="h-9"
                  />
                  <Input
                    value={i.precoTxt}
                    onChange={(e) =>
                      mudar(i._id, { precoTxt: e.target.value, preco: centavos(e.target.value) })
                    }
                    placeholder="Preço un."
                    inputMode="decimal"
                    className="h-9 text-right"
                  />
                  <button
                    onClick={() => setItens((l) => l.filter((x) => x._id !== i._id))}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  setItens((l) => [
                    ...l,
                    {
                      _id: seq++,
                      sku: null,
                      codigo: "",
                      nome: "",
                      quantidade: 1,
                      preco: 0,
                      precoTxt: "",
                    },
                  ])
                }
                className="text-sm font-semibold text-primary hover:underline"
              >
                + Item avulso
              </button>
            </div>
          </div>

          <div>
            <p className="mb-1 text-xs font-bold uppercase text-zinc-500">Frete</p>
            <div className="flex flex-wrap gap-2">
              {FRETE_MODOS.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setFreteModo(m)}
                  className={cn(
                    "rounded-xl px-3 py-2 text-sm font-semibold ring-1",
                    freteModo === m
                      ? "bg-primary text-white ring-primary"
                      : "ring-zinc-200 hover:bg-zinc-50",
                  )}
                >
                  {m === "COBRADO"
                    ? "Cobrar no link"
                    : m === "GRATIS"
                      ? "Frete grátis"
                      : "Por conta do comprador (paga na chegada)"}
                </button>
              ))}
            </div>
            {freteModo === "NA_CHEGADA" && (
              <p className="mt-1 text-xs text-zinc-500">
                O frete não entra no valor do link. O cliente vê o aviso “paga ao receber (DAC /
                transportadora)” na página e no e-mail.
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {freteModo === "COBRADO" ? (
              <label className="text-sm font-semibold">
                Valor do frete ({moeda})
                <Input
                  value={frete}
                  onChange={(e) => setFrete(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                  className="mt-1"
                />
              </label>
            ) : (
              <div className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">
                {freteModo === "GRATIS" ? "Frete grátis" : "Frete pago pelo comprador na chegada"}
              </div>
            )}
            <div>
              <label className="text-sm font-semibold">
                Desconto ({moeda})
                <Input
                  value={desconto}
                  onChange={(e) => {
                    setDesconto(e.target.value);
                    setCupom(null);
                  }}
                  inputMode="decimal"
                  placeholder="0"
                  className="mt-1"
                />
              </label>
              <div className="mt-2 flex gap-1">
                <Input
                  value={cupomTxt}
                  onChange={(e) => setCupomTxt(e.target.value.toUpperCase())}
                  placeholder="Cupom"
                  className="h-8 font-mono text-xs"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8"
                  disabled={!cupomTxt || conferindo || !itens.length}
                  onClick={async () => {
                    setConferindo(true);
                    try {
                      const r = await validarCupomLinkFn({
                        data: { codigo: cupomTxt, subtotal, moeda, email: email || undefined },
                      });
                      if (!r.ok) {
                        toast.error(r.erro);
                        setCupom(null);
                        return;
                      }
                      if (r.freteGratis) setFreteModo("GRATIS");
                      else setDesconto(paraCampo(r.desconto));
                      setCupom({ codigo: r.codigo, descricao: r.descricao });
                      toast.success(`Cupom ${r.codigo} aplicado (${r.descricao})`);
                    } finally {
                      setConferindo(false);
                    }
                  }}
                >
                  Aplicar
                </Button>
              </div>
              {cupom && (
                <p className="mt-1 text-xs font-semibold text-emerald-700">
                  Cupom {cupom.codigo}: {cupom.descricao}
                </p>
              )}
            </div>
            <div className="rounded-xl bg-primary/5 p-3 text-right">
              <p className="text-xs text-zinc-500">Total</p>
              <p className="text-2xl font-black text-primary">
                {fmtValor(Math.max(total, 0), moeda)}
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              E-mail da conta do cliente (opcional)
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cliente@email.com"
                className="mt-1"
              />
              <span className="mt-1 block text-xs font-normal text-zinc-500">
                Preenchido: só essa conta paga. Vazio: a compra fica na conta de quem pagar.
              </span>
            </label>
            <label className="text-sm font-semibold">
              Título do pedido (opcional)
              <Input
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Ex.: Kit embreagem MF 275"
                className="mt-1"
                maxLength={200}
              />
            </label>
            <label className="text-sm font-semibold">
              Mensagem para o cliente (aparece na página)
              <textarea
                value={notaCliente}
                onChange={(e) => setNotaCliente(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm font-normal"
                placeholder="Ex.: Envío por DAC a Rocha incluido. Sale en 24 h."
              />
            </label>
            <label className="text-sm font-semibold">
              Nota interna (só a equipe vê)
              <textarea
                value={notaInterna}
                onChange={(e) => setNotaInterna(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm font-normal"
              />
            </label>
            <label className="text-sm font-semibold">
              Validade do link
              <select
                value={dias}
                onChange={(e) => setDias(Number(e.target.value))}
                className="mt-1 block w-full rounded-md border px-3 py-2 text-sm font-normal"
              >
                {[1, 2, 3, 7, 15, 30].map((d) => (
                  <option key={d} value={d}>
                    {d} dia{d > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t pt-4">
            <Button variant="outline" onClick={() => fechar()}>
              Cancelar
            </Button>
            <Button
              onClick={criar}
              disabled={salvando || !itens.length || total <= 0 || !metodos.length}
              className="gap-2"
            >
              {salvando ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="h-4 w-4" />
              )}
              Criar link de {fmtValor(Math.max(total, 0), moeda)}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Detalhe({
  id,
  fechar,
  recarregar,
}: {
  id: number;
  fechar: () => void;
  recarregar: () => void;
}) {
  const qc = useQueryClient();
  const { data: l, isLoading } = useQuery({
    queryKey: ["admin-link", id],
    queryFn: () => detalheLinkFn({ data: { id } }),
    refetchInterval: 20000,
  });
  const [ocupado, setOcupado] = useState<string | null>(null);
  const url = l ? urlLink(l.codigo, l.pais) : "";
  const msg = useMemo(
    () =>
      l
        ? mensagemWhats(l.pais, fmtValor(l.total, l.moeda), url, l.cliente?.nome, l.frete_modo)
        : "",
    [l, url],
  );
  const atualizar = () => {
    qc.invalidateQueries({ queryKey: ["admin-link", id] });
    recarregar();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        {isLoading || !l ? (
          <p className="flex items-center gap-2 p-6 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
          </p>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                Link #{l.id} {l.pais === "BR" ? "🇧🇷" : "🇺🇾"} <Selo s={l.status} />
              </DialogTitle>
              <DialogDescription>
                {l.descricao || "Pedido"} · criado {dataHora(l.created_at)}
                {l.expira_em && l.status === "ABERTO" ? ` · vence ${dataHora(l.expira_em)}` : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 text-sm">
              {l.status === "ABERTO" && (
                <div className="rounded-xl bg-zinc-50 p-3">
                  <p className="break-all font-mono text-xs">{url}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => copiar(url, "Link copiado")}
                    >
                      <Copy className="h-4 w-4" /> Copiar link
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5"
                      onClick={() => copiar(msg, "Mensagem copiada")}
                    >
                      <Copy className="h-4 w-4" /> Copiar mensagem
                    </Button>
                    <a
                      href={waUrl(msg, l.cliente?.telefone)}
                      target="_blank"
                      rel="noreferrer noopener"
                      data-livre="1"
                    >
                      <Button size="sm" className="gap-1.5 bg-[#128C4B] hover:bg-[#0f7a41]">
                        <MessageCircle className="h-4 w-4" />{" "}
                        {l.cliente?.telefone
                          ? "Enviar no WhatsApp do cliente"
                          : "Enviar no WhatsApp"}
                      </Button>
                    </a>
                    <a href={url} target="_blank" rel="noreferrer noopener">
                      <Button size="sm" variant="ghost" className="gap-1.5">
                        <ExternalLink className="h-4 w-4" /> Ver página
                      </Button>
                    </a>
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-bold uppercase text-zinc-500">Cliente</p>
                  {l.cliente ? (
                    <p>
                      <b>{l.cliente.nome}</b>
                      <br />
                      {l.cliente.email}
                      {l.cliente.telefone && (
                        <>
                          <br />
                          {l.cliente.telefone}
                        </>
                      )}
                    </p>
                  ) : (
                    <p className="text-zinc-500">
                      {l.email_cliente
                        ? `${l.email_cliente} (ainda sem conta)`
                        : "Qualquer conta que pagar"}
                    </p>
                  )}
                  {l.carrinho_id && (
                    <p className="mt-1 text-xs text-zinc-500">Carrinho #{l.carrinho_id}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-zinc-500">Formas aceitas</p>
                  <p>{l.metodos.join(", ")}</p>
                  {l.pago_em && (
                    <p className="mt-1 font-semibold text-emerald-700">
                      Pago em {dataHora(l.pago_em)}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-zinc-500">Itens</p>
                <ul className="mt-1 divide-y rounded-xl ring-1 ring-black/5">
                  {l.itens.map((i, n) => (
                    <li key={n} className="flex justify-between gap-3 px-3 py-2">
                      <span>
                        {i.quantidade}× {i.nome}{" "}
                        <span className="text-xs text-zinc-500">({i.codigo})</span>
                      </span>
                      <b>{fmtValor(i.preco * i.quantidade, l.moeda)}</b>
                    </li>
                  ))}
                  {(l.frete > 0 || l.frete_modo !== "COBRADO") && (
                    <li className="flex justify-between px-3 py-2 text-zinc-600">
                      <span>Frete</span>{" "}
                      <span
                        className={cn(l.frete_modo === "NA_CHEGADA" && "font-bold text-amber-700")}
                      >
                        {l.frete_modo === "NA_CHEGADA"
                          ? "Por conta do comprador (na chegada)"
                          : l.frete_modo === "GRATIS"
                            ? "Grátis"
                            : fmtValor(l.frete, l.moeda)}
                      </span>
                    </li>
                  )}
                  {l.desconto > 0 && (
                    <li className="flex justify-between px-3 py-2 text-emerald-700">
                      <span>Desconto</span> <span>− {fmtValor(l.desconto, l.moeda)}</span>
                    </li>
                  )}
                  <li className="flex justify-between px-3 py-2 text-base font-black">
                    <span>Total</span> <span>{fmtValor(l.total, l.moeda)}</span>
                  </li>
                </ul>
                {l.nota_interna && (
                  <p className="mt-2 whitespace-pre-line rounded-xl bg-amber-50 p-3 text-amber-900">
                    📝 {l.nota_interna}
                  </p>
                )}
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-zinc-500">Tentativas de pagamento</p>
                {!l.pagamentos.length ? (
                  <p className="text-zinc-500">Nenhuma ainda.</p>
                ) : (
                  <ul className="mt-1 space-y-2">
                    {l.pagamentos.map((p) => (
                      <li
                        key={p.id}
                        className={cn(
                          "rounded-xl p-3 ring-1 ring-black/5",
                          p.duplicado && "bg-red-50 ring-red-200",
                        )}
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <b>{p.metodo}</b>
                          <Selo s={p.status} />
                          {p.final_cartao && (
                            <span className="text-xs">
                              {p.bandeira} •••• {p.final_cartao}
                            </span>
                          )}
                          <span className="text-xs text-zinc-500">{dataHora(p.created_at)}</span>
                          {p.dlocal_id && ["PENDENTE", "AUTORIZADO", "ERRO"].includes(p.status) && (
                            <button
                              disabled={ocupado === `c${p.id}`}
                              onClick={async () => {
                                setOcupado(`c${p.id}`);
                                try {
                                  const r = await conferirPagamentoFn({ data: { id: p.id } });
                                  toast.success(`Status na dLocal: ${r.status}`);
                                  atualizar();
                                } catch (e: any) {
                                  toast.error(e.message);
                                } finally {
                                  setOcupado(null);
                                }
                              }}
                              className="ml-auto flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                            >
                              <RefreshCw
                                className={cn(
                                  "h-3.5 w-3.5",
                                  ocupado === `c${p.id}` && "animate-spin",
                                )}
                              />{" "}
                              Conferir na dLocal
                            </button>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">
                          Pedido {p.order_id}
                          {p.dlocal_id && ` · dLocal ${p.dlocal_id}`}
                          {p.documento && ` · doc ${p.documento}`}
                          {p.status_detalhe && ` · ${p.status_detalhe}`}
                        </p>
                        {p.duplicado && (
                          <p className="mt-1 text-xs font-bold text-red-700">
                            Pago com o link já pago: fazer o reembolso deste pagamento no painel da
                            dLocal.
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div>
                <p className="text-xs font-bold uppercase text-zinc-500">Histórico</p>
                <ul className="mt-1 space-y-1 text-xs">
                  {l.eventos.map((e) => (
                    <li key={e.id} className="flex gap-2">
                      <span className="w-28 shrink-0 text-zinc-400">{dataHora(e.quando)}</span>
                      <b className="w-24 shrink-0">{e.tipo}</b>
                      <span className="text-zinc-600">{e.detalhe}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {l.status === "ABERTO" && (
                <div className="flex justify-end border-t pt-4">
                  <Button
                    variant="outline"
                    className="gap-1.5 text-red-600"
                    disabled={ocupado === "cancelar"}
                    onClick={async () => {
                      if (
                        !confirm(
                          "Cancelar este link? O cliente não vai mais conseguir pagar por ele.",
                        )
                      )
                        return;
                      setOcupado("cancelar");
                      try {
                        await cancelarLinkFn({ data: { id: l.id } });
                        toast.success("Link cancelado");
                        atualizar();
                      } catch (e: any) {
                        toast.error(e.message);
                      } finally {
                        setOcupado(null);
                      }
                    }}
                  >
                    <XCircle className="h-4 w-4" /> Cancelar link
                  </Button>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
