import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Search, Mail, MessageCircle, Check, Loader2, Tag, ExternalLink, Copy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  buscarProdutoOfertaFn,
  enviarOfertaFn,
  promoBrl,
  type ProdutoOferta,
  type ModoDesconto,
} from "@/lib/ofertas";
import { getPrecosConfigFn } from "@/lib/produtos-admin";
import { precoVenda, fmtUYU, fmtBRL, type PrecoFinal } from "@/lib/precos";
import { normalizarCelularUY } from "@/lib/validacao-conta";
import { personalizar } from "@/lib/email-template";
import { SITE_URL } from "@/lib/site";
import type { Cliente } from "@/lib/clientes";
import { cn } from "@/lib/utils";

// Número para o wa.me: celular uruguaio (09X...) ou brasileiro com DDD; null se não der para saber
export function numeroWhatsapp(tel: string | null): string | null {
  if (!tel) return null;
  const uy = normalizarCelularUY(tel);
  if (uy) return uy.slice(1);
  const d = tel.replace(/\D/g, "");
  if (/^55\d{10,11}$/.test(d)) return d;
  if (/^\d{10,11}$/.test(d)) return `55${d}`;
  if (/^598\d{8}$/.test(d)) return d;
  return null;
}

const linhaPreco = (p: PrecoFinal | null) =>
  !p?.uyu
    ? ""
    : p.deUyu
      ? `~${fmtUYU(p.deUyu)}~ ➜ *${fmtUYU(p.uyu)}* (-${p.desconto}%)`
      : `*${fmtUYU(p.uyu)}*`;

const linkProduto = (sku: string) =>
  `${SITE_URL}/produto/${encodeURIComponent(sku)}?utm_source=whatsapp&utm_medium=mensaje&utm_campaign=oferta-${encodeURIComponent(sku)}`;

function mensagemPadrao(p: ProdutoOferta, preco: PrecoFinal | null) {
  return [
    "¡Hola {{nombre}}! 👋",
    "Tenemos una *oferta especial* para vos en AGRO PARTS:",
    [`🔧 *${p.nome}*`, `Cód. ${p.codigo}`, linhaPreco(preco)].filter(Boolean).join("\n"),
    `Ver y pedir: ${linkProduto(p.sku)}`,
    "¡Respondé este mensaje y te lo reservamos!",
  ].join("\n\n");
}

type Props = { aberto: boolean; aoFechar: () => void; clientes: Cliente[] };

export function OfertaClientes({ aberto, aoFechar, clientes }: Props) {
  const [q, setQ] = useState("");
  const [produto, setProduto] = useState<ProdutoOferta | null>(null);
  const [modo, setModo] = useState<ModoDesconto>("percent");
  const [valor, setValor] = useState("10");
  const [aplicar, setAplicar] = useState(true);
  const [porEmail, setPorEmail] = useState(true);
  const [foto, setFoto] = useState(false);
  const [assunto, setAssunto] = useState("");
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [msgWhats, setMsgWhats] = useState("");
  const [editado, setEditado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [resultado, setResultado] = useState<{
    produto: ProdutoOferta;
    campanhaId: number | null;
    destinatarios: number;
  } | null>(null);
  const [enviadosWa, setEnviadosWa] = useState<Set<number>>(new Set());

  const { data: config } = useQuery({
    queryKey: ["precos-config"],
    queryFn: () => getPrecosConfigFn(),
  });
  const { data: achados, isFetching } = useQuery({
    queryKey: ["oferta-busca", q],
    queryFn: () => buscarProdutoOfertaFn({ data: { q } }),
    enabled: q.trim().length >= 2 && !produto,
  });

  // Reinicia ao abrir
  useEffect(() => {
    if (!aberto) return;
    setResultado(null);
    setEnviadosWa(new Set());
  }, [aberto]);

  // Preço que vai ficar no site com o desconto escolhido
  const precoNovo = useMemo<PrecoFinal | null>(() => {
    if (!produto) return null;
    if (modo === "atual") return produto.preco;
    const promo = promoBrl(produto, modo, Number(valor.replace(",", ".")) || 0);
    if (!promo) return null;
    return precoVenda({ preco_brl: produto.cheioBrl, valor_promocional: promo }, config);
  }, [produto, modo, valor, config]);
  const descontoInvalido = !!produto && modo !== "atual" && !precoNovo;

  // Textos padrão acompanham o produto e o desconto até o admin editar
  useEffect(() => {
    if (!produto || editado) return;
    const pr = precoNovo ?? produto.preco;
    setAssunto(pr?.desconto ? `🔥 -${pr.desconto}% en ${produto.nome}` : `Oferta: ${produto.nome}`);
    setTitulo(`¡Hola {{nombre}}! Precio especial en ${produto.nome}`);
    setTexto(
      `Por tiempo limitado, este repuesto tiene **precio especial** en AGRO PARTS${pr?.uyu ? `: **${fmtUYU(pr.uyu)}**` : ""}.\n\nPedilo por WhatsApp o desde el sitio.`,
    );
    setMsgWhats(mensagemPadrao(produto, pr));
  }, [produto, precoNovo, editado]);

  const comEmail = clientes.filter((c) => c.recebeEmails);
  const comWhats = clientes
    .map((c) => ({ c, numero: numeroWhatsapp(c.telefone) }))
    .filter((x) => x.numero);

  const escolher = (p: ProdutoOferta) => {
    setProduto(p);
    setEditado(false);
    setFoto(p.fotoPropria);
    if (!p.cheioBrl) setModo("atual");
  };

  const enviar = async () => {
    if (!produto) return;
    const acoes = [
      aplicar && modo !== "atual" && precoNovo?.uyu
        ? `aplicar ${fmtUYU(precoNovo.uyu)} no site`
        : null,
      porEmail && comEmail.length ? `enviar e-mail para ${comEmail.length} cliente(s)` : null,
    ].filter(Boolean);
    if (acoes.length && !confirm(`Confirmar: ${acoes.join(" e ")}?`)) return;
    setEnviando(true);
    try {
      const r = await enviarOfertaFn({
        data: {
          sku: produto.sku,
          modo,
          valor: Number(valor.replace(",", ".")) || 0,
          aplicarNoSite: aplicar,
          ids: clientes.map((c) => c.id),
          email: porEmail,
          assunto,
          titulo,
          texto,
          foto,
        },
      });
      setResultado(r);
      // Mensagem do WhatsApp com o preço que ficou valendo
      if (!editado) setMsgWhats(mensagemPadrao(r.produto, r.produto.preco));
      toast.success(
        r.campanhaId
          ? `Oferta aplicada. E-mails sendo enviados para ${r.destinatarios} cliente(s).`
          : "Oferta pronta. Agora envie pelo WhatsApp.",
      );
    } catch (e: any) {
      toast.error(e?.message ?? "Falha ao enviar");
    } finally {
      setEnviando(false);
    }
  };

  const abrirWhats = (c: Cliente, numero: string) => {
    window.open(
      `https://api.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(personalizar(msgWhats, c.nome))}`,
      "_blank",
      "noopener",
    );
    setEnviadosWa((s) => new Set(s).add(c.id));
  };
  const proximo = comWhats.find((x) => !enviadosWa.has(x.c.id));

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && aoFechar()}>
      <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" /> Enviar oferta para {clientes.length} cliente(s)
          </DialogTitle>
          <DialogDescription>
            {comEmail.length} recebem e-mail · {comWhats.length} com WhatsApp
          </DialogDescription>
        </DialogHeader>

        {/* 1. Produto */}
        <section className="space-y-2">
          <h3 className="text-sm font-bold">1. Produto</h3>
          {produto ? (
            <div className="flex items-center gap-3 rounded-xl border p-3">
              {produto.imagem ? (
                <img
                  src={produto.imagem}
                  alt=""
                  className="h-14 w-14 rounded-lg border object-contain"
                />
              ) : (
                <div className="h-14 w-14 rounded-lg bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{produto.nome}</p>
                <p className="text-xs text-muted-foreground">
                  Cód. {produto.codigo}
                  {produto.marca ? ` · ${produto.marca}` : ""}
                </p>
                <p className="text-xs">
                  {produto.cheioBrl ? (
                    <>
                      Preço normal: <b>{produto.cheioUyu ? fmtUYU(produto.cheioUyu) : "—"}</b> ·{" "}
                      {fmtBRL(produto.cheioBrl)}
                    </>
                  ) : (
                    <span className="text-amber-700">Sem preço cadastrado</span>
                  )}
                  {produto.preco?.desconto ? (
                    <span className="ml-2 rounded bg-red-100 px-1.5 text-red-700">
                      já em promoção -{produto.preco.desconto}%
                    </span>
                  ) : null}
                </p>
              </div>
              <button
                onClick={() => {
                  setProduto(null);
                  setResultado(null);
                }}
                className="text-sm text-primary hover:underline"
              >
                Trocar
              </button>
            </div>
          ) : (
            <>
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  autoFocus
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Código, SKU ou nome da peça…"
                  className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </label>
              {isFetching && <p className="text-xs text-muted-foreground">Buscando…</p>}
              <div className="grid gap-1.5">
                {achados?.map((p) => (
                  <button
                    key={p.sku}
                    onClick={() => escolher(p)}
                    className="flex items-center gap-3 rounded-lg border p-2 text-left hover:border-primary hover:bg-primary/5"
                  >
                    {p.imagem ? (
                      <img src={p.imagem} alt="" className="h-10 w-10 rounded object-contain" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-muted" />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.nome}</span>
                      <span className="text-xs text-muted-foreground">Cód. {p.codigo}</span>
                    </span>
                    <span className="text-right text-sm font-bold">
                      {p.preco?.uyu ? (
                        fmtUYU(p.preco.uyu)
                      ) : (
                        <span className="text-xs font-normal text-muted-foreground">sem preço</span>
                      )}
                    </span>
                  </button>
                ))}
                {achados && !achados.length && q.trim().length >= 2 && (
                  <p className="text-sm text-muted-foreground">Nenhuma peça encontrada.</p>
                )}
              </div>
            </>
          )}
        </section>

        {produto && (
          <>
            {/* 2. Desconto */}
            <section className="space-y-2">
              <h3 className="text-sm font-bold">2. Desconto</h3>
              <div className="flex flex-wrap gap-1 rounded-lg border p-1 text-sm">
                {(
                  [
                    ["percent", "% de desconto"],
                    ["uyu", "Preço em $U"],
                    ["brl", "Preço em R$"],
                    ["atual", "Manter preço atual"],
                  ] as const
                ).map(([k, r]) => (
                  <button
                    key={k}
                    disabled={k !== "atual" && !produto.cheioBrl}
                    onClick={() => setModo(k)}
                    className={cn(
                      "flex-1 rounded-md px-3 py-1.5 disabled:opacity-40",
                      modo === k ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                    )}
                  >
                    {r}
                  </button>
                ))}
              </div>
              {modo !== "atual" && (
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    {modo !== "percent" && (
                      <span className="text-sm font-bold">{modo === "uyu" ? "$U" : "R$"}</span>
                    )}
                    <input
                      value={valor}
                      onChange={(e) => setValor(e.target.value)}
                      inputMode="decimal"
                      className="h-10 w-32 rounded-lg border bg-background px-3 text-lg font-bold outline-none focus:ring-2 focus:ring-primary/30"
                    />
                    {modo === "percent" && <span className="text-sm font-bold">%</span>}
                  </div>
                  {precoNovo?.uyu ? (
                    <p className="text-sm">
                      <span className="text-muted-foreground line-through">
                        {precoNovo.deUyu ? fmtUYU(precoNovo.deUyu) : ""}
                      </span>{" "}
                      <b className="text-lg text-red-600">{fmtUYU(precoNovo.uyu)}</b>{" "}
                      {precoNovo.desconto ? (
                        <span className="rounded bg-red-600 px-1.5 py-0.5 text-xs font-bold text-white">
                          -{precoNovo.desconto}%
                        </span>
                      ) : null}
                      <span className="ml-2 text-xs text-muted-foreground">
                        {precoNovo.brl ? fmtBRL(precoNovo.brl) : ""}
                      </span>
                    </p>
                  ) : (
                    descontoInvalido && (
                      <p className="text-sm text-red-600">
                        O preço da oferta precisa ser menor que o preço normal.
                      </p>
                    )
                  )}
                </div>
              )}
              {modo !== "atual" && (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={aplicar}
                    onChange={(e) => setAplicar(e.target.checked)}
                  />
                  Aplicar este preço promocional no site (o produto mostra o preço riscado e o selo
                  de oferta)
                </label>
              )}
            </section>

            {/* 3. E-mail */}
            <section className="space-y-2 rounded-xl border p-3">
              <label className="flex items-center gap-2 text-sm font-bold">
                <input
                  type="checkbox"
                  checked={porEmail}
                  onChange={(e) => setPorEmail(e.target.checked)}
                />
                <Mail className="h-4 w-4" /> 3. Enviar por e-mail ({comEmail.length} cliente(s))
              </label>
              {porEmail && (
                <div className="grid gap-2">
                  <input
                    value={assunto}
                    onChange={(e) => {
                      setAssunto(e.target.value);
                      setEditado(true);
                    }}
                    placeholder="Assunto"
                    className="h-9 rounded-lg border bg-background px-3 text-sm"
                  />
                  <input
                    value={titulo}
                    onChange={(e) => {
                      setTitulo(e.target.value);
                      setEditado(true);
                    }}
                    placeholder="Título"
                    className="h-9 rounded-lg border bg-background px-3 text-sm"
                  />
                  <textarea
                    value={texto}
                    onChange={(e) => {
                      setTexto(e.target.value);
                      setEditado(true);
                    }}
                    rows={3}
                    className="rounded-lg border bg-background px-3 py-2 text-sm"
                  />
                  {produto.imagem && (
                    <label className="flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={foto}
                        onChange={(e) => setFoto(e.target.checked)}
                      />
                      Mostrar a foto da peça no e-mail{" "}
                      {produto.fotoPropria
                        ? "(foto enviada por você)"
                        : "(atenção: foto importada de outra loja — use só fotos próprias)"}
                    </label>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    {"{{nombre}}"} vira o primeiro nome do cliente. Quem pediu para não receber
                    e-mails fica de fora.
                  </p>
                </div>
              )}
            </section>

            {/* 4. WhatsApp */}
            <section className="space-y-2 rounded-xl border p-3">
              <p className="flex items-center gap-2 text-sm font-bold">
                <MessageCircle className="h-4 w-4 text-[#128C4B]" /> 4. Mensagem do WhatsApp
              </p>
              <textarea
                value={msgWhats}
                onChange={(e) => {
                  setMsgWhats(e.target.value);
                  setEditado(true);
                }}
                rows={8}
                className="w-full rounded-lg border bg-background px-3 py-2 font-mono text-xs"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(personalizar(msgWhats, ""));
                  toast.success("Mensagem copiada");
                }}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Copy className="h-3 w-3" /> Copiar mensagem (para lista de transmissão ou status)
              </button>
            </section>

            {!resultado ? (
              <button
                onClick={enviar}
                disabled={enviando || descontoInvalido}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary font-bold text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                {enviando ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Check className="h-5 w-5" />
                )}
                {aplicar && modo !== "atual" ? "Aplicar oferta" : "Preparar oferta"}
                {porEmail && comEmail.length ? ` e enviar ${comEmail.length} e-mail(s)` : ""}
              </button>
            ) : (
              <section className="space-y-2 rounded-xl border-2 border-[#25D366] bg-[#25D366]/5 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-bold">
                    {resultado.campanhaId ? (
                      <>
                        ✓ E-mails a caminho ({resultado.destinatarios}).{" "}
                        <a
                          href={`/admin/emails/${resultado.campanhaId}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline"
                        >
                          acompanhar <ExternalLink className="inline h-3 w-3" />
                        </a>
                      </>
                    ) : (
                      "✓ Oferta pronta."
                    )}
                  </p>
                  {proximo && (
                    <button
                      onClick={() => abrirWhats(proximo.c, proximo.numero!)}
                      className="inline-flex items-center gap-2 rounded-lg bg-[#25D366] px-4 py-2 text-sm font-bold text-[#06381b]"
                    >
                      <MessageCircle className="h-4 w-4" /> Abrir próximo ({enviadosWa.size + 1}/
                      {comWhats.length})
                    </button>
                  )}
                </div>
                {comWhats.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Nenhum destes clientes tem celular válido para WhatsApp.
                  </p>
                ) : (
                  <ul className="max-h-64 divide-y overflow-y-auto rounded-lg border bg-background">
                    {comWhats.map(({ c, numero }) => (
                      <li key={c.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                        <span className="min-w-0 flex-1 truncate">
                          <b>{c.nome}</b>{" "}
                          <span className="text-xs text-muted-foreground">
                            +{numero} {c.departamento ? `· ${c.departamento}` : ""}
                          </span>
                        </span>
                        <button
                          onClick={() => abrirWhats(c, numero!)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-lg px-3 py-1 text-xs font-bold",
                            enviadosWa.has(c.id)
                              ? "bg-muted text-muted-foreground"
                              : "bg-[#25D366] text-[#06381b]",
                          )}
                        >
                          {enviadosWa.has(c.id) ? (
                            <>
                              <Check className="h-3 w-3" /> Aberto
                            </>
                          ) : (
                            <>
                              <MessageCircle className="h-3 w-3" /> Enviar
                            </>
                          )}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-[11px] text-muted-foreground">
                  Cada botão abre a conversa com a mensagem pronta; é só apertar enviar no WhatsApp.
                  Clientes sem celular válido ficam de fora.
                </p>
              </section>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
