// Acompanhamento do pedido pelo código da venda (link do e-mail e do sininho). Sem login:
// mostra só o primeiro nome, as peças e as etapas. Fora do Google.
import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { LinhaDoTempoPedido } from "@/components/LinhaDoTempoPedido";
import { acompanharPedidoFn } from "@/lib/pedidos";
import { whatsappContactUrl } from "@/lib/whatsapp";
import { tr, useT, type Idioma } from "@/lib/idioma";

export const Route = createFileRoute("/pedido/$codigo")({
  loader: ({ params }) => acompanharPedidoFn({ data: { codigo: params.codigo } }),
  head: ({ match }) => {
    const idioma: Idioma = (match.context as any)?.idioma ?? "es";
    return {
      meta: [
        { title: tr(idioma, "Seguí tu pedido | AGRO PARTS", "Acompanhe seu pedido | AGRO PARTS") },
        { name: "robots", content: "noindex, nofollow" },
      ],
    };
  },
  component: PaginaPedido,
});

function PaginaPedido() {
  const p = Route.useLoaderData();
  const { t, idioma } = useT();
  const local = idioma === "pt" ? "pt-BR" : "es-UY";
  return (
    <div className="min-h-screen bg-zinc-100">
      <SiteHeader />
      <main className="mx-auto max-w-xl px-3 pb-16 pt-6 md:px-4">
        {!p ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold">
              {t("No encontramos este pedido", "Não encontramos este pedido")}
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              {t(
                "Revisá el código o escribinos por WhatsApp.",
                "Confira o código ou fale com a gente pelo WhatsApp.",
              )}
            </p>
            <Link to="/" className="mt-4 inline-block font-semibold text-primary underline">
              agropartsuy.com
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-zinc-950 p-5 text-white shadow-lg">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-300">
                {t("Pedido", "Pedido")} {p.codigo}
              </p>
              <h1 className="mt-1 text-2xl font-black leading-tight">
                {p.primeiroNome
                  ? t(
                      `¡Hola, ${p.primeiroNome}! Así va tu pedido`,
                      `Olá, ${p.primeiroNome}! Veja como está seu pedido`,
                    )
                  : t("Así va tu pedido", "Veja como está seu pedido")}
              </h1>
              <p className="mt-1 text-xs text-zinc-400">
                {t("Hecho el", "Feito em")} {new Date(p.criado).toLocaleDateString(local)}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <LinhaDoTempoPedido p={p} />
            </div>
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <p className="mb-2 text-sm font-bold">
                {t("Repuestos del pedido", "Peças do pedido")}
              </p>
              <ul className="space-y-1.5 text-sm">
                {p.itens.map((i, k) => (
                  <li key={k} className="flex justify-between gap-3">
                    <span className="min-w-0">
                      {i.qtd}× {i.nome}
                      <span className="block font-mono text-xs text-zinc-500">{i.codigo}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <a
              href={whatsappContactUrl(
                t(
                  `¡Hola! Quiero consultar por mi pedido ${p.codigo}.`,
                  `Olá! Quero falar sobre o meu pedido ${p.codigo}.`,
                ),
              )}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] p-4 font-bold text-white"
            >
              <MessageCircle className="h-5 w-5" />{" "}
              {t("Consultar por WhatsApp", "Falar pelo WhatsApp")}
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
