import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { z } from "zod";
import {
  CheckCircle2,
  Clock,
  CreditCard,
  Copy,
  Loader2,
  Lock,
  QrCode,
  ShieldCheck,
  Store,
  XCircle,
  AlertTriangle,
  LogIn,
  Truck,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { ProductImage } from "@/components/ProductImage";
import { linkPagamentoFn, pagarLinkFn } from "@/lib/pagamentos";
import {
  ROTULO_METODO,
  STATUS_LINK,
  documentoValido,
  fmtValor,
  type Metodo,
} from "@/lib/pagamentos-comum";
import { whatsappContactUrl } from "@/lib/whatsapp";
import { tr, useT, type Idioma } from "@/lib/idioma";
import { cn } from "@/lib/utils";

// Página do link de pagamento: o cliente vê o pedido, entra na conta e paga pela dLocal
// (Uruguai: tarjeta, Abitab, Redpagos · Brasil: cartão e PIX).
export const Route = createFileRoute("/pagar/$codigo")({
  validateSearch: z.object({ retorno: z.coerce.number().optional() }),
  loaderDeps: ({ search }) => ({ retorno: search.retorno }),
  loader: ({ params, deps, context }) =>
    linkPagamentoFn({
      data: {
        codigo: params.codigo,
        retorno: deps.retorno,
        idioma: ((context as any)?.idioma ?? "es") as Idioma,
      },
    }),
  head: ({ match }) => ({
    meta: [
      {
        title: tr(
          ((match.context as any)?.idioma ?? "es") as Idioma,
          "Pagar pedido — AGRO PARTS",
          "Pagar pedido — AGRO PARTS",
        ),
      },
      { name: "robots", content: "noindex, nofollow" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: PagarPage,
});

type Dados = NonNullable<Awaited<ReturnType<typeof linkPagamentoFn>>>;

function PagarPage() {
  const d = Route.useLoaderData();
  const { t, idioma } = useT();
  const router = useRouter();

  // PIX / efectivo esperando: confere de tempos em tempos
  const esperando = !!d?.pagamentos.some((p) => p.status === "PENDENTE");
  useEffect(() => {
    if (!esperando || d?.status !== "ABERTO") return;
    const id = setInterval(() => router.invalidate(), 15_000);
    return () => clearInterval(id);
  }, [esperando, d?.status, router]);

  if (!d)
    return (
      <Casca>
        <Aviso
          icone={XCircle}
          cor="red"
          titulo={t("Link no encontrado", "Link não encontrado")}
          texto={t(
            "Revisá el enlace que te enviamos o escribinos por WhatsApp.",
            "Confira o link que enviamos ou fale conosco no WhatsApp.",
          )}
        />
      </Casca>
    );

  const local = idioma === "pt" ? "pt-BR" : "es-UY";
  const data = (s: string) =>
    new Date(s).toLocaleDateString(local, { day: "2-digit", month: "long", year: "numeric" });
  const zap = whatsappContactUrl(
    t(
      `¡Hola! Tengo una consulta sobre el pago del pedido #${d.id}.`,
      `Olá! Tenho uma dúvida sobre o pagamento do pedido #${d.id}.`,
    ),
  );

  return (
    <Casca>
      <div className="grid gap-5 md:grid-cols-[1fr_380px]">
        {/* Pedido */}
        <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                {t("Pedido", "Pedido")} #{d.id}
              </p>
              <h1 className="text-xl font-extrabold text-zinc-900 md:text-2xl">
                {d.descricao || t("Tus repuestos", "Suas peças")}
              </h1>
            </div>
            <Selo status={d.status} />
          </div>

          <ul className="mt-4 divide-y">
            {d.itens.map((i, n) => (
              <li key={n} className="flex items-center gap-3 py-3">
                {i.imagem ? (
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-zinc-50 ring-1 ring-black/5">
                    <ProductImage src={i.imagem} alt={i.nome} className="h-full w-full" />
                  </div>
                ) : (
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-zinc-100 text-xs font-bold text-zinc-400">
                    {i.quantidade}×
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-semibold text-zinc-900">{i.nome}</p>
                  <p className="text-xs text-zinc-500">
                    {t("Código", "Código")} {i.codigo} · {i.quantidade} ×{" "}
                    {fmtValor(i.preco, d.moeda)}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold text-zinc-900">
                  {fmtValor(i.preco * i.quantidade, d.moeda)}
                </p>
              </li>
            ))}
          </ul>

          <dl className="mt-2 space-y-1.5 border-t pt-4 text-sm">
            <Linha rotulo={t("Subtotal", "Subtotal")} valor={fmtValor(d.subtotal, d.moeda)} />
            {d.frete_modo === "COBRADO" && d.frete > 0 && (
              <Linha rotulo={t("Envío", "Frete")} valor={fmtValor(d.frete, d.moeda)} />
            )}
            {d.frete_modo === "GRATIS" && (
              <Linha
                rotulo={t("Envío", "Frete")}
                valor={t("Sin costo", "Grátis")}
                cls="text-emerald-700"
              />
            )}
            {d.desconto > 0 && (
              <Linha
                rotulo={t("Descuento", "Desconto")}
                valor={`− ${fmtValor(d.desconto, d.moeda)}`}
                cls="text-emerald-700"
              />
            )}
            <div className="flex items-baseline justify-between pt-2">
              <dt className="font-bold text-zinc-900">Total</dt>
              <dd className="text-2xl font-black text-primary">{fmtValor(d.total, d.moeda)}</dd>
            </div>
          </dl>
          {d.frete_modo === "NA_CHEGADA" && (
            <p className="mt-3 flex gap-2 rounded-2xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-amber-200">
              <Truck className="h-5 w-5 shrink-0" />
              <span>
                <b>{t("Envío a cargo del comprador.", "Frete por conta do comprador.")}</b>{" "}
                {t(
                  "No está incluido en este total: lo pagás al recibir (DAC o transportadora).",
                  "Não está incluído neste total: você paga na chegada (DAC).",
                )}
              </span>
            </p>
          )}

          {d.nota_cliente && (
            <p className="mt-4 whitespace-pre-line rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-700">
              {d.nota_cliente}
            </p>
          )}
          {d.status === "ABERTO" && d.expira_em && (
            <p className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
              <Clock className="h-4 w-4" />
              {t("Disponible hasta el", "Disponível até")} {data(d.expira_em)}
            </p>
          )}
        </section>

        {/* Pagamento */}
        <aside className="space-y-4">
          {d.status === "PAGO" ? (
            <Aviso
              icone={CheckCircle2}
              cor="green"
              titulo={t("¡Pago confirmado!", "Pagamento confirmado!")}
              texto={t(
                `Recibimos tu pago${d.pago_em ? ` el ${data(d.pago_em)}` : ""}. Ya estamos preparando tus repuestos y te avisamos por WhatsApp.`,
                `Recebemos seu pagamento${d.pago_em ? ` em ${data(d.pago_em)}` : ""}. Já estamos separando suas peças e avisamos pelo WhatsApp.`,
              )}
            >
              {d.sessao && (
                <Link
                  to="/cuenta"
                  className="mt-3 inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
                >
                  {t("Ver mis compras", "Ver minhas compras")}
                </Link>
              )}
            </Aviso>
          ) : d.status !== "ABERTO" ? (
            <Aviso
              icone={AlertTriangle}
              cor="amber"
              titulo={
                d.status === "VENCIDO"
                  ? t("Este link venció", "Este link venceu")
                  : t("Este link fue cancelado", "Este link foi cancelado")
              }
              texto={t(
                "Escribinos por WhatsApp y te enviamos uno nuevo con el precio actualizado.",
                "Fale conosco no WhatsApp e enviamos um novo com o preço atualizado.",
              )}
            >
              <a
                href={zap}
                data-livre="1"
                target="_blank"
                rel="noreferrer noopener"
                className="mt-3 inline-flex rounded-xl bg-[#128C4B] px-4 py-2.5 text-sm font-bold text-white"
              >
                WhatsApp
              </a>
            </Aviso>
          ) : !d.sessao ? (
            <Entrar codigo={d.codigo} paraEmail={d.paraEmail} />
          ) : !d.sessao.pode ? (
            <Aviso
              icone={Lock}
              cor="amber"
              titulo={t("Este pedido es de otra cuenta", "Este pedido é de outra conta")}
              texto={t(
                `Ingresaste como ${d.sessao.email}. ${d.paraEmail ? `Este link es para ${d.paraEmail}.` : ""} Ingresá con esa cuenta para pagar.`,
                `Você entrou como ${d.sessao.email}. ${d.paraEmail ? `Este link é para ${d.paraEmail}.` : ""} Entre com essa conta para pagar.`,
              )}
            >
              <button
                onClick={async () => {
                  await fetch("/api/auth/logout", { method: "POST" });
                  window.location.reload();
                }}
                className="mt-3 inline-flex rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white"
              >
                {t("Cambiar de cuenta", "Trocar de conta")}
              </button>
            </Aviso>
          ) : (
            <>
              <Pendentes d={d} />
              {!d.pagamentos.some(
                (p) =>
                  p.metodo === "CARTAO" &&
                  (p.status === "AUTORIZADO" || (p.status === "PENDENTE" && !p.redirect)),
              ) && <Formulario d={d} />}
            </>
          )}

          <p className="flex items-center justify-center gap-2 text-xs text-zinc-500">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            {t("Pago seguro procesado por dLocal", "Pagamento seguro processado pela dLocal")}
          </p>
          <a
            href={zap}
            data-livre="1"
            target="_blank"
            rel="noreferrer noopener"
            className="block text-center text-xs font-semibold text-[#128C4B] hover:underline"
          >
            {t("¿Dudas? Escribinos por WhatsApp", "Dúvidas? Fale conosco no WhatsApp")}
          </a>
        </aside>
      </div>
    </Casca>
  );
}

function Casca({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f3f5f1]">
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-3 py-5 md:px-4 md:py-10">{children}</main>
    </div>
  );
}

function Linha({ rotulo, valor, cls }: { rotulo: string; valor: string; cls?: string }) {
  return (
    <div className={cn("flex justify-between text-zinc-600", cls)}>
      <dt>{rotulo}</dt>
      <dd className="font-semibold">{valor}</dd>
    </div>
  );
}

function Selo({ status }: { status: string }) {
  const { idioma } = useT();
  const r = STATUS_LINK[status] ?? [status, status];
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-xs font-bold",
        status === "PAGO" && "bg-emerald-100 text-emerald-800",
        status === "ABERTO" && "bg-amber-100 text-amber-800",
        (status === "CANCELADO" || status === "VENCIDO") && "bg-zinc-200 text-zinc-600",
      )}
    >
      {r[idioma === "pt" ? 1 : 0]}
    </span>
  );
}

const CORES = {
  green: "bg-emerald-50 text-emerald-900 ring-emerald-200 [&_svg.icone]:text-emerald-600",
  amber: "bg-amber-50 text-amber-900 ring-amber-200 [&_svg.icone]:text-amber-600",
  red: "bg-red-50 text-red-900 ring-red-200 [&_svg.icone]:text-red-600",
};
function Aviso({
  icone: Icone,
  cor,
  titulo,
  texto,
  children,
}: {
  icone: typeof CheckCircle2;
  cor: keyof typeof CORES;
  titulo: string;
  texto: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-3xl p-5 ring-1", CORES[cor])}>
      <Icone className="icone h-8 w-8" />
      <h2 className="mt-2 text-lg font-extrabold">{titulo}</h2>
      <p className="mt-1 text-sm">{texto}</p>
      {children}
    </div>
  );
}

function Entrar({ codigo, paraEmail }: { codigo: string; paraEmail: string | null }) {
  const { t } = useT();
  const destino = `/pagar/${codigo}`;
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <LogIn className="h-8 w-8 text-primary" />
      <h2 className="mt-2 text-lg font-extrabold text-zinc-900">
        {t("Ingresá para pagar", "Entre para pagar")}
      </h2>
      <p className="mt-1 text-sm text-zinc-600">
        {t(
          "La compra queda guardada en tu cuenta. Si todavía no tenés, crearla lleva segundos.",
          "A compra fica salva na sua conta. Se ainda não tem, criar leva segundos.",
        )}
        {paraEmail && (
          <>
            {" "}
            {t("Este pedido es para", "Este pedido é para")} <b>{paraEmail}</b>.
          </>
        )}
      </p>
      <div className="mt-4 grid gap-2">
        <Link
          to="/login"
          search={{ redirect: destino } as never}
          className="rounded-xl bg-primary py-3 text-center text-sm font-bold text-white hover:opacity-90"
        >
          {t("Ingresar", "Entrar")}
        </Link>
        <Link
          to="/cadastro"
          search={{ redirect: destino } as never}
          className="rounded-xl bg-zinc-100 py-3 text-center text-sm font-bold text-zinc-800 hover:bg-zinc-200"
        >
          {t("Crear cuenta", "Criar conta")}
        </Link>
      </div>
    </div>
  );
}

// PIX gerado / número para pagar no Abitab ou Redpagos, e tentativas recusadas
function Pendentes({ d }: { d: Dados }) {
  const { t, idioma } = useT();
  const local = idioma === "pt" ? "pt-BR" : "es-UY";
  const [copiado, setCopiado] = useState(false);
  const comTicket = d.pagamentos.filter((p) => p.status === "PENDENTE" && p.ticket);
  const recusado = d.pagamentos[0]?.status === "RECUSADO" ? d.pagamentos[0] : null;
  const tresDs = d.pagamentos.find((p) => p.status === "PENDENTE" && p.redirect);
  const analise = d.pagamentos.find(
    (p) =>
      p.metodo === "CARTAO" &&
      (p.status === "AUTORIZADO" || (p.status === "PENDENTE" && !p.redirect)),
  );
  return (
    <>
      {recusado && (
        <div className="flex gap-3 rounded-2xl bg-red-50 p-4 text-sm text-red-900 ring-1 ring-red-200">
          <XCircle className="h-5 w-5 shrink-0 text-red-600" />
          <p>
            <b>{t("Pago no aprobado.", "Pagamento não aprovado.")}</b> {recusado.motivo}
          </p>
        </div>
      )}
      {analise && (
        <div className="flex gap-3 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          <Clock className="h-5 w-5 shrink-0 text-amber-600" />
          <p>
            <b>
              {t(
                "Tu pago con tarjeta está en análisis.",
                "Seu pagamento com cartão está em análise.",
              )}
            </b>{" "}
            {t(
              "Puede tardar unos minutos. Esta página se actualiza sola y te avisamos por e-mail.",
              "Pode levar alguns minutos. Esta página atualiza sozinha e avisamos por e-mail.",
            )}
          </p>
        </div>
      )}
      {tresDs && (
        <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          <p className="font-bold">
            {tresDs.metodo === "STRIPE"
              ? t(
                  "Tu pago con tarjeta quedó sin terminar.",
                  "Seu pagamento com cartão ficou sem terminar.",
                )
              : t("Tu banco pide confirmar la compra.", "Seu banco pediu para confirmar a compra.")}
          </p>
          <a
            href={tresDs.redirect!}
            className="mt-2 inline-flex rounded-xl bg-amber-500 px-4 py-2 font-bold text-white"
          >
            {tresDs.metodo === "STRIPE"
              ? t("Continuar el pago", "Continuar o pagamento")
              : t("Confirmar en el banco", "Confirmar no banco")}
          </a>
        </div>
      )}
      {comTicket.map((p) => {
        const tk = p.ticket!;
        const img = tk.qr ? `data:image/png;base64,${tk.qr}` : tk.imagem;
        const pix = p.metodo === "PIX";
        return (
          <div key={p.id} className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <div className="flex items-center gap-2">
              {pix ? (
                <QrCode className="h-6 w-6 text-primary" />
              ) : (
                <Store className="h-6 w-6 text-primary" />
              )}
              <h2 className="text-lg font-extrabold text-zinc-900">
                {pix
                  ? "Pague com PIX"
                  : t(
                      `Pagá en ${p.metodo === "ABITAB" ? "Abitab" : "Redpagos"}`,
                      `Pague no ${p.metodo === "ABITAB" ? "Abitab" : "Redpagos"}`,
                    )}
              </h2>
            </div>
            <p className="mt-1 text-sm text-zinc-600">
              {pix
                ? "Abra o app do seu banco, escolha PIX › Ler QR code ou Copia e cola."
                : t(
                    "Presentá este número en cualquier local y pagá en efectivo.",
                    "Apresente este número em qualquer agência e pague em dinheiro.",
                  )}
            </p>
            {pix && img && (
              <img
                src={img}
                alt="QR code PIX"
                className="mx-auto mt-3 h-52 w-52 rounded-xl ring-1 ring-black/5"
              />
            )}
            {tk.numero && (
              <div className="mt-3">
                <p
                  className={cn(
                    "rounded-xl bg-zinc-50 p-3 font-mono text-zinc-900 ring-1 ring-black/5",
                    pix
                      ? "break-all text-[11px]"
                      : "text-center text-2xl font-black tracking-widest",
                  )}
                >
                  {tk.numero}
                </p>
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(tk.numero!).catch(() => {});
                    setCopiado(true);
                    setTimeout(() => setCopiado(false), 2500);
                  }}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white"
                >
                  <Copy className="h-4 w-4" />
                  {copiado
                    ? t("¡Copiado!", "Copiado!")
                    : pix
                      ? "Copiar código PIX"
                      : t("Copiar número", "Copiar número")}
                </button>
              </div>
            )}
            {!pix && tk.imagem && (
              <a
                href={tk.imagem}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2 block text-center text-sm font-semibold text-primary hover:underline"
              >
                {t("Ver comprobante para imprimir", "Ver comprovante para imprimir")}
              </a>
            )}
            {tk.vence && (
              <p className="mt-3 text-center text-xs text-zinc-500">
                {t("Vence", "Vence")}{" "}
                {new Date(tk.vence).toLocaleString(local, {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            )}
            <p className="mt-2 flex items-center justify-center gap-2 text-xs text-zinc-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t(
                "Esperando el pago… se confirma solo.",
                "Aguardando o pagamento… confirma sozinho.",
              )}
            </p>
          </div>
        );
      })}
    </>
  );
}

// Escolha da forma de pagamento + dados do pagador + cartão (Smart Fields)
function Formulario({ d }: { d: Dados }) {
  const { t, idioma } = useT();
  const router = useRouter();
  const [metodo, setMetodo] = useState<Metodo>(d.metodos[0]);
  const [nome, setNome] = useState(d.sessao?.nome ?? "");
  const [doc, setDoc] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const cartao = useRef<CartaoApi | null>(null);
  const br = d.pais === "BR";
  const semCartao = metodo === "CARTAO" && !d.cartao;

  // Stripe: nome e cartão são pedidos na página do próprio Stripe
  const stripe = metodo === "STRIPE";
  const pagar = async () => {
    setErro(null);
    if (!stripe && nome.trim().split(/\s+/).length < 2)
      return setErro(t("Escribí tu nombre y apellido.", "Escreva nome e sobrenome."));
    if (!stripe && !documentoValido(d.pais, doc))
      return setErro(
        br ? "CPF ou CNPJ inválido." : t("Cédula o RUT inválido.", "Cédula ou RUT inválido."),
      );
    setEnviando(true);
    try {
      let token: string | undefined;
      if (metodo === "CARTAO") {
        if (!cartao.current)
          throw new Error(
            t("La tarjeta todavía está cargando.", "O cartão ainda está carregando."),
          );
        token = await cartao.current.token(nome.trim());
      }
      const r = await pagarLinkFn({
        data: { codigo: d.codigo, metodo, documento: doc, nome, token, idioma },
      });
      if (!r.ok) {
        setErro(r.erro);
        await router.invalidate();
        return;
      }
      if (r.redirect) {
        window.location.href = r.redirect; // 3D Secure no banco, ou a página de pagamento do Stripe
        return;
      }
      await router.invalidate();
    } catch (e: any) {
      setErro(
        e?.message || t("No se pudo procesar el pago.", "Não foi possível processar o pagamento."),
      );
    } finally {
      setEnviando(false);
    }
  };

  const input =
    "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-[15px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20";
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
      <h2 className="text-lg font-extrabold text-zinc-900">
        {t("¿Cómo querés pagar?", "Como quer pagar?")}
      </h2>
      <div className="mt-3 grid gap-2">
        {d.metodos.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMetodo(m)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold ring-1 transition",
              metodo === m
                ? "bg-primary/5 text-primary ring-2 ring-primary"
                : "text-zinc-700 ring-zinc-200 hover:bg-zinc-50",
            )}
          >
            {m === "CARTAO" || m === "STRIPE" ? (
              <CreditCard className="h-5 w-5" />
            ) : m === "PIX" ? (
              <QrCode className="h-5 w-5" />
            ) : (
              <Store className="h-5 w-5" />
            )}
            {ROTULO_METODO[m][idioma === "pt" ? 1 : 0]}
          </button>
        ))}
      </div>

      {stripe && (
        <p className="mt-4 rounded-xl bg-zinc-50 p-3 text-sm text-zinc-700">
          {t(
            "Vas a pagar en la página segura de Stripe. Al terminar, volvés acá con el pago confirmado.",
            "Você vai pagar na página segura do Stripe. Ao terminar, volta aqui com o pagamento confirmado.",
          )}
        </p>
      )}
      <div className={cn("mt-4 space-y-3", stripe && "hidden")}>
        <label className="block text-sm font-semibold text-zinc-700">
          {metodo === "CARTAO"
            ? t("Nombre como figura en la tarjeta", "Nome como está no cartão")
            : t("Nombre y apellido", "Nome e sobrenome")}
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className={cn(input, "mt-1")}
            autoComplete="cc-name"
          />
        </label>
        <label className="block text-sm font-semibold text-zinc-700">
          {br ? "CPF ou CNPJ" : t("Cédula de identidad o RUT", "Cédula de identidade ou RUT")}
          <input
            value={doc}
            onChange={(e) => setDoc(e.target.value.replace(/[^\d.\-/]/g, "").slice(0, 20))}
            inputMode="numeric"
            placeholder={br ? "000.000.000-00" : "1.234.567-8"}
            className={cn(input, "mt-1")}
          />
        </label>
        {metodo === "CARTAO" && d.cartao && (
          <CamposCartao
            key={d.pais}
            chave={d.cartao.chave}
            script={d.cartao.script}
            pais={d.pais}
            api={cartao}
          />
        )}
        {semCartao && (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            {t(
              "El pago con tarjeta todavía no está disponible.",
              "O pagamento com cartão ainda não está disponível.",
            )}
          </p>
        )}
      </div>

      {erro && (
        <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{erro}</p>
      )}

      <button
        onClick={pagar}
        disabled={enviando || semCartao}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-[#0b7a3b] py-3.5 text-[15px] font-extrabold text-white shadow-sm transition hover:bg-[#096a33] disabled:opacity-60"
      >
        {enviando ? <Loader2 className="h-5 w-5 animate-spin" /> : <Lock className="h-4 w-4" />}
        {metodo === "CARTAO" || stripe
          ? `${t("Pagar", "Pagar")} ${fmtValor(d.total, d.moeda)}`
          : metodo === "PIX"
            ? "Gerar código PIX"
            : t("Generar número de pago", "Gerar número de pagamento")}
      </button>
    </div>
  );
}

// Campos do cartão da dLocal (iframes): o número nunca passa pelo nosso servidor
type CartaoApi = { token: (nome: string) => Promise<string> };
let scriptDlocal: Promise<void> | null = null;
function carregarScript(src: string) {
  scriptDlocal ??= new Promise<void>((ok, falha) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => ok();
    s.onerror = () => {
      scriptDlocal = null;
      falha(new Error("dLocal.js"));
    };
    document.head.appendChild(s);
  });
  return scriptDlocal;
}

function CamposCartao({
  chave,
  script,
  pais,
  api,
}: {
  chave: string;
  script: string;
  pais: "UY" | "BR";
  api: React.MutableRefObject<CartaoApi | null>;
}) {
  const { t, idioma } = useT();
  const pan = useRef<HTMLDivElement>(null);
  const venc = useRef<HTMLDivElement>(null);
  const cvv = useRef<HTMLDivElement>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);
  const [bandeira, setBandeira] = useState("");

  useEffect(() => {
    let vivo = true;
    const montados: any[] = [];
    carregarScript(script)
      .then(() => {
        if (!vivo || !pan.current || !venc.current || !cvv.current) return;
        const g = (window as any).dlocal;
        const dl = typeof g === "function" ? g(chave) : g;
        const fields = dl.fields({ locale: idioma === "pt" ? "pt" : "es", country: pais });
        const estilo = {
          style: {
            base: {
              fontSize: "16px",
              color: "#18181b",
              fontFamily: "system-ui, sans-serif",
              "::placeholder": { color: "#a1a1aa" },
            },
            invalid: { color: "#dc2626" },
          },
        };
        const fPan = fields.create("pan", { ...estilo, placeholder: "4111 1111 1111 1111" });
        const fVenc = fields.create("expiration", { ...estilo, placeholder: t("MM/AA", "MM/AA") });
        const fCvv = fields.create("cvv", { ...estilo, placeholder: "CVV" });
        fPan.mount(pan.current);
        fVenc.mount(venc.current);
        fCvv.mount(cvv.current);
        montados.push(fPan, fVenc, fCvv);
        for (const f of montados) f.on("change", (e: any) => setErro(e?.error?.message ?? null));
        fPan.on("brand", (e: any) => setBandeira(String(e?.brand || "")));
        api.current = {
          token: async (nome) => {
            const r = await dl.createToken(fPan, { name: nome });
            if (!r?.token)
              throw new Error(
                r?.error?.message ||
                  t("Revisá los datos de la tarjeta.", "Confira os dados do cartão."),
              );
            return r.token as string;
          },
        };
        setPronto(true);
      })
      .catch(
        () =>
          vivo &&
          setErro(
            t(
              "No se pudo cargar el pago con tarjeta.",
              "Não foi possível carregar o pagamento com cartão.",
            ),
          ),
      );
    return () => {
      vivo = false;
      api.current = null;
      for (const f of montados) {
        try {
          f.unmount?.();
        } catch {
          /* já desmontado */
        }
      }
    };
  }, [chave, script, pais]);

  const caixa = "mt-1 h-[50px] rounded-xl border border-zinc-200 bg-white px-3.5 py-3.5";
  return (
    <div className="space-y-3">
      <div className="block text-sm font-semibold text-zinc-700">
        <span className="flex items-center justify-between">
          {t("Número de tarjeta", "Número do cartão")}
          {bandeira && <span className="text-xs uppercase text-zinc-400">{bandeira}</span>}
        </span>
        <div ref={pan} className={caixa} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="text-sm font-semibold text-zinc-700">
          {t("Vencimiento", "Validade")}
          <div ref={venc} className={caixa} />
        </div>
        <div className="text-sm font-semibold text-zinc-700">
          CVV
          <div ref={cvv} className={caixa} />
        </div>
      </div>
      {!pronto && !erro && (
        <p className="flex items-center gap-2 text-xs text-zinc-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t("Cargando…", "Carregando…")}
        </p>
      )}
      {erro && <p className="text-xs font-semibold text-red-600">{erro}</p>}
    </div>
  );
}
