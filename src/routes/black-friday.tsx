import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowRight, BellRing, Flame, MessageCircle, Percent, Tag } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { Contagem, HeroCampanha, ListaOfertas } from "@/components/campanha/Campanha";
import { CuponsLista } from "@/components/campanha/Cupons";
import { paginaCampanhaFn } from "@/lib/campanhas";
import { urlRepuestos } from "@/lib/seo-paginas";
import { categoriaEs } from "@/lib/pecas-es";
import { linksIdioma, tr, useT, type Idioma } from "@/lib/idioma";
import { SITE_URL } from "@/lib/site";
import { whatsappContactUrl } from "@/lib/whatsapp";

// Página da campanha (Black Friday). Endereço fixo o ano todo: fora da campanha mostra a contagem
// para a próxima ("vem aí"), assim o Google já conhece a página quando a campanha começa.
export const Route = createFileRoute("/black-friday")({
  validateSearch: z.object({ ver_campanha: z.string().optional() }),
  loaderDeps: ({ search }) => ({ ver: search.ver_campanha }),
  loader: ({ deps }) => paginaCampanhaFn({ data: { previa: deps.ver?.toUpperCase() } }),
  head: ({ loaderData, match }) => {
    const idioma: Idioma = (match.context as any)?.idioma ?? "es";
    const t = (es: string, pt: string) => tr(idioma, es, pt);
    const c = loaderData?.campanha;
    const ano = new Date(c?.alvo ?? loaderData?.proxima?.inicio ?? Date.now()).getFullYear();
    const titulo = c
      ? t(
          `Black Friday ${ano}: repuestos agrícolas con hasta -${c.maxPct}% | AGRO PARTS`,
          `Black Friday ${ano}: peças agrícolas com até -${c.maxPct}% | AGRO PARTS`,
        )
      : t(
          `Black Friday ${ano} en repuestos agrícolas | AGRO PARTS`,
          `Black Friday ${ano} em peças agrícolas | AGRO PARTS`,
        );
    const desc = t(
      `Black Friday AGRO PARTS ${ano}: descuentos en repuestos para tractores y cosechadoras Massey Ferguson, Valtra, John Deere y New Holland. Envíos a todo Uruguay.`,
      `Black Friday AGRO PARTS ${ano}: descontos em peças para tratores e colheitadeiras Massey Ferguson, Valtra, John Deere e New Holland. Envio para todo o Uruguai.`,
    );
    // Evento de vendas (datas reais da campanha, ou da próxima)
    const inicio = c ? undefined : loaderData?.proxima?.inicio;
    const ld = {
      "@context": "https://schema.org",
      "@type": "SaleEvent",
      name: c?.nome ?? loaderData?.proxima?.nome ?? `Black Friday ${ano}`,
      description: desc,
      ...(inicio && { startDate: inicio }),
      ...(c && c.fase === "BLACK" && { endDate: c.alvo }),
      eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
      location: {
        "@type": "VirtualLocation",
        url: `${SITE_URL}${idioma === "pt" ? "/pt" : ""}/black-friday`,
      },
      organizer: { "@type": "Organization", name: "AGRO PARTS", url: SITE_URL },
    };
    return {
      meta: [
        { title: titulo },
        { name: "description", content: desc },
        { property: "og:title", content: titulo },
        { property: "og:description", content: desc },
      ],
      links: linksIdioma("/black-friday", idioma),
      scripts: [{ type: "application/ld+json", children: JSON.stringify(ld) }],
    };
  },
  component: PaginaBlack,
});

function PaginaBlack() {
  const { campanha: c, regras, pecas, cupons, proxima } = Route.useLoaderData();
  const { t, idioma, href } = useT();
  const zap = whatsappContactUrl(
    t(
      "¡Hola! Quiero aprovechar la Black Friday de AGRO PARTS.",
      "Olá! Quero aproveitar a Black Friday da AGRO PARTS.",
    ),
  );
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <SiteHeader />
      <main>
        {c ? (
          <HeroCampanha c={c} h1 />
        ) : (
          <section className="relative overflow-hidden bg-black">
            <div
              aria-hidden
              className="absolute -left-32 -top-32 h-96 w-96 rounded-full bg-[#f2c94c]/15 blur-3xl"
            />
            <div className="relative mx-auto max-w-4xl px-4 py-14 text-center md:py-20">
              <p className="inline-flex rounded-full border border-[#f2c94c]/40 px-4 py-1 text-xs font-black uppercase tracking-[0.3em] text-[#f2c94c]">
                {t("Viene llegando", "Vem aí")}
              </p>
              <h1 className="mt-4 text-4xl font-black uppercase leading-none md:text-7xl">
                {proxima?.nome ?? "Black Friday"}
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-white/80">
                {t(
                  "Descuentos en repuestos para tractores y cosechadoras. Creá tu cuenta y te avisamos apenas empiece.",
                  "Descontos em peças para tratores e colheitadeiras. Crie sua conta e avisamos assim que começar.",
                )}
              </p>
              {proxima && (
                <div className="mt-6">
                  <Contagem alvo={proxima.inicio} tamanho="lg" />
                </div>
              )}
              <Link
                to="/cadastro"
                className="mt-8 inline-flex items-center gap-2 rounded-xl bg-[#f2c94c] px-6 py-3 font-black text-black"
              >
                <BellRing className="h-5 w-5" /> {t("Quiero que me avisen", "Quero ser avisado")}
              </Link>
            </div>
          </section>
        )}

        <div className="mx-auto max-w-7xl space-y-10 px-3 py-10 md:px-4">
          {regras.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 text-2xl font-black uppercase">
                <Percent className="h-6 w-6 text-[#f2c94c]" />{" "}
                {t("Descuentos de la campaña", "Descontos da campanha")}
              </h2>
              <div className="mt-4 flex flex-wrap gap-3">
                {regras.map((r, i) => {
                  const nome =
                    r.tipo === "TUDO"
                      ? t("Todo el sitio", "Site todo")
                      : r.tipo === "CATEGORIA"
                        ? idioma === "pt"
                          ? r.alvo
                          : categoriaEs(r.alvo)
                        : r.alvo;
                  const url =
                    r.tipo === "CATEGORIA"
                      ? urlRepuestos({ categoria: r.alvo })
                      : r.tipo === "MARCA"
                        ? urlRepuestos({ marca: r.alvo })
                        : "/loja";
                  return (
                    <a
                      key={i}
                      href={href(url ?? "/loja")}
                      className="group flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10 transition hover:bg-white/10 hover:ring-[#f2c94c]/50"
                    >
                      <span className="text-2xl font-black text-[#f2c94c]">-{r.pct}%</span>
                      <span className="font-bold">{nome}</span>
                      <ArrowRight className="h-4 w-4 text-white/40 transition group-hover:translate-x-0.5" />
                    </a>
                  );
                })}
              </div>
            </section>
          )}

          {pecas.length > 0 && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-black uppercase">
                <Flame className="h-6 w-6 text-[#f2c94c]" />{" "}
                {t("Ofertas destacadas", "Ofertas em destaque")}
              </h2>
              <div className="text-zinc-900">
                <ListaOfertas pecas={pecas} grade />
              </div>
              <a
                href={href("/loja")}
                className="mt-5 inline-flex items-center gap-2 font-bold text-[#f2c94c] hover:underline"
              >
                {t(
                  "Ver todo el catálogo con los descuentos",
                  "Ver o catálogo todo com os descontos",
                )}{" "}
                <ArrowRight className="h-4 w-4" />
              </a>
            </section>
          )}

          {cupons.length > 0 && (
            <section>
              <h2 className="mb-4 flex items-center gap-2 text-2xl font-black uppercase">
                <Tag className="h-6 w-6 text-[#f2c94c]" /> {t("Cupones", "Cupons")}
              </h2>
              <CuponsLista cupons={cupons} escuro />
            </section>
          )}

          <section className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10 md:p-8">
            <h2 className="text-xl font-black">
              {t("¿Cómo funciona la Black Friday?", "Como funciona a Black Friday?")}
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-white/80">
              <li>
                •{" "}
                {t(
                  "Los descuentos ya aparecen en el precio de cada repuesto del sitio.",
                  "Os descontos já aparecem no preço de cada peça do site.",
                )}
              </li>
              <li>
                •{" "}
                {t(
                  "Pedí tu cotización por WhatsApp y te confirmamos la pieza, el precio con descuento y el envío.",
                  "Peça o orçamento pelo WhatsApp e confirmamos a peça, o preço com desconto e o frete.",
                )}
              </li>
              <li>
                •{" "}
                {t(
                  "Si tenés un cupón, mencionalo al pedir la cotización.",
                  "Se tiver um cupom, informe ao pedir o orçamento.",
                )}
              </li>
              <li>
                •{" "}
                {t(
                  "Stock limitado: los precios valen mientras dure la campaña.",
                  "Estoque limitado: os preços valem enquanto durar a campanha.",
                )}
              </li>
            </ul>
            <a
              href={zap}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#25D366] px-5 py-3 font-bold text-white"
            >
              <MessageCircle className="h-5 w-5" />{" "}
              {t("Cotizar por WhatsApp", "Orçamento pelo WhatsApp")}
            </a>
          </section>
        </div>
      </main>
    </div>
  );
}
