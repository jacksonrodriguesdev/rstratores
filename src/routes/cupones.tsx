import { createFileRoute } from "@tanstack/react-router";
import { Ticket } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { CuponsLista, cuponsDaMoeda } from "@/components/campanha/Cupons";
import { cuponsPaginaFn } from "@/lib/campanhas";
import { linksIdioma, tr, useT, type Idioma } from "@/lib/idioma";

// Página de cupons: os públicos e ativos. Cupom "mistério" aparece bloqueado até a data de revelar.
export const Route = createFileRoute("/cupones")({
  loader: () => cuponsPaginaFn(),
  head: ({ match }) => {
    const idioma: Idioma = (match.context as any)?.idioma ?? "es";
    const t = (es: string, pt: string) => tr(idioma, es, pt);
    const titulo = t(
      "Cupones de descuento en repuestos agrícolas | AGRO PARTS",
      "Cupons de desconto em peças agrícolas | AGRO PARTS",
    );
    const desc = t(
      "Cupones de descuento de AGRO PARTS para repuestos de tractores y cosechadoras. Copiá el código y usalo al pedir tu cotización.",
      "Cupons de desconto da AGRO PARTS para peças de tratores e colheitadeiras. Copie o código e use ao pedir o orçamento.",
    );
    return {
      meta: [
        { title: titulo },
        { name: "description", content: desc },
        { property: "og:title", content: titulo },
      ],
      links: linksIdioma("/cupones", idioma),
    };
  },
  component: PaginaCupons,
});

function PaginaCupons() {
  const { t, idioma } = useT();
  const cupons = cuponsDaMoeda(Route.useLoaderData(), idioma);
  return (
    <div className="min-h-screen bg-zinc-100">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-3 py-8 md:px-4 md:py-12">
        <h1 className="flex items-center gap-2 text-3xl font-black text-zinc-900 md:text-4xl">
          <Ticket className="h-8 w-8 text-primary" />{" "}
          {t("Cupones de descuento", "Cupons de desconto")}
        </h1>
        <p className="mt-2 max-w-2xl text-zinc-600">
          {t(
            "Copiá el código y mencionalo al pedir tu cotización por WhatsApp. Lo aplicamos en el link de pago.",
            "Copie o código e informe ao pedir o orçamento pelo WhatsApp. Aplicamos no link de pagamento.",
          )}
        </p>
        <div className="mt-6">
          {cupons.length ? (
            <CuponsLista cupons={cupons} />
          ) : (
            <p className="rounded-2xl bg-white p-6 text-zinc-600 ring-1 ring-black/5">
              {t(
                "No hay cupones activos ahora. ¡Volvé pronto!",
                "Não há cupons ativos agora. Volte em breve!",
              )}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
