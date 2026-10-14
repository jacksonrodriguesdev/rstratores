import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle, Search, ShoppingCart, Truck, CreditCard, ShieldCheck, HelpCircle, ChevronDown } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { whatsappContactUrl } from "@/lib/whatsapp";
import { BandeiraUruguay, BandeiraBrasil } from "@/components/Bandeiras";
import { linksIdioma, tr, useT, type Idioma } from "@/lib/idioma";

// Página de ajuda: como comprar, envios, pagamento e perguntas frequentes.
// Os textos não prometem prazos nem condições que a loja não confirmou; revise antes de mudar.
// Em português (/pt/ayuda): cliente do Brasil, envio por Correios ou transportadora.
const PREGUNTAS = {
  es: [
    {
      p: "¿Cómo sé si el repuesto sirve para mi tractor?",
      r: "Lo más seguro es buscar por el código original de la pieza (está grabado en la pieza o en el manual). Si no lo tenés, mandanos por WhatsApp la marca, el modelo y el número de serie del tractor, y una foto de la pieza: nuestro equipo confirma la compatibilidad antes de la compra.",
    },
    {
      p: "¿Por qué algunos repuestos no tienen precio?",
      r: "Trabajamos con más de 49.000 repuestos. La mayoría ya tiene precio publicado; en los demás, el precio depende de la marca y la disponibilidad. Por WhatsApp te pasamos el precio final, el plazo y el costo de envío en el momento, sin compromiso.",
    },
    {
      p: "¿Envían a todo Uruguay?",
      r: "Sí. Despachamos por DAC a los 19 departamentos. Cuando sale tu pedido te enviamos el número de seguimiento para que lo rastrees en dac.com.uy.",
    },
    {
      p: "¿Puedo pedir varios repuestos juntos?",
      r: "Sí. Agregá cada pieza a tu cotización con el botón «+» y, cuando termines, tocá «Pedir precio por WhatsApp». Nos llega la lista completa con los códigos.",
    },
    {
      p: "No encuentro la pieza que busco, ¿qué hago?",
      r: "Escribinos por WhatsApp con el código, el nombre o una foto. Muchas piezas no están publicadas todavía y las conseguimos igual.",
    },
    {
      p: "¿Tienen otro presupuesto más barato?",
      r: "Mandanos el presupuesto de otro proveedor desde «Mejoramos tu precio» en la página de inicio y hacemos lo posible por mejorarlo.",
    },
  ],
  pt: [
    {
      p: "Como sei se a peça serve no meu trator?",
      r: "O mais seguro é buscar pelo código original da peça (gravado na peça ou no manual). Se não tiver, mande pelo WhatsApp a marca, o modelo e o número de série do trator, e uma foto da peça: nossa equipe confirma a compatibilidade antes da compra.",
    },
    {
      p: "Por que algumas peças não têm preço?",
      r: "Trabalhamos com mais de 49.000 peças. A maioria já tem preço publicado; nas demais, o preço depende da marca e da disponibilidade. Pelo WhatsApp passamos o preço final, o prazo e o frete na hora, sem compromisso.",
    },
    {
      p: "Vocês enviam para todo o Rio Grande do Sul?",
      r: "Sim. Estamos na fronteira Chuí / Chuy e enviamos para qualquer cidade do Rio Grande do Sul por Correios ou transportadora. Quando o pedido sai, mandamos o código de rastreio pelo WhatsApp.",
    },
    {
      p: "Posso pedir várias peças juntas?",
      r: "Sim. Adicione cada peça ao seu orçamento com o botão «+» e, quando terminar, toque em «Pedir preço pelo WhatsApp». A lista completa chega para nós com os códigos.",
    },
    {
      p: "Não encontro a peça que procuro, o que faço?",
      r: "Fale conosco pelo WhatsApp com o código, o nome ou uma foto. Muitas peças ainda não estão publicadas e conseguimos mesmo assim.",
    },
    {
      p: "Tenho um orçamento mais barato de outro fornecedor",
      r: "Mande o orçamento de outro fornecedor em «Cobrimos seu orçamento», na página inicial, e fazemos o possível para cobrir.",
    },
  ],
};

export const Route = createFileRoute("/ayuda")({
  head: ({ match }) => {
    const idioma: Idioma = match.context?.idioma ?? "es";
    const t = (es: string, pt: string) => tr(idioma, es, pt);
    return {
      links: linksIdioma("/ayuda", idioma),
      meta: [
        { title: t("Ayuda — Cómo comprar, envíos y preguntas frecuentes | AGRO PARTS", "Ajuda — Como comprar, envio e perguntas frequentes | AGRO PARTS") },
        {
          name: "description",
          content: t(
            "Cómo comprar repuestos agrícolas en AGRO PARTS: cotización por WhatsApp, envíos a todo Uruguay por DAC, formas de pago y preguntas frecuentes.",
            "Como comprar peças agrícolas na AGRO PARTS: orçamento pelo WhatsApp, envio para todo o Rio Grande do Sul, formas de pagamento e perguntas frequentes.",
          ),
        },
      ],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: PREGUNTAS[idioma].map((q) => ({
              "@type": "Question",
              name: q.p,
              acceptedAnswer: { "@type": "Answer", text: q.r },
            })),
          }),
        },
      ],
    };
  },
  component: AyudaPage,
});

const PASOS = {
  es: [
    { icon: Search, titulo: "Buscá tu repuesto", texto: "Por código original, nombre de la pieza o marca del tractor." },
    { icon: ShoppingCart, titulo: "Armá tu cotización", texto: "Agregá todas las piezas que necesitás con el botón «+»." },
    { icon: MessageCircle, titulo: "Pedí el precio", texto: "Nos llega la lista por WhatsApp y te respondemos con precio y plazo." },
    { icon: Truck, titulo: "Recibilo en tu casa", texto: "Confirmás el pedido y lo despachamos por DAC con seguimiento." },
  ],
  pt: [
    { icon: Search, titulo: "Busque sua peça", texto: "Pelo código original, nome da peça ou marca do trator." },
    { icon: ShoppingCart, titulo: "Monte seu orçamento", texto: "Adicione todas as peças que precisa com o botão «+»." },
    { icon: MessageCircle, titulo: "Peça o preço", texto: "A lista chega pelo WhatsApp e respondemos com preço, prazo e frete." },
    { icon: Truck, titulo: "Receba em casa", texto: "Você confirma o pedido e enviamos por Correios ou transportadora, com rastreio." },
  ],
};

function Seccion({ id, icon: Icon, titulo, children }: { id: string; icon: typeof Truck; titulo: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-[calc(var(--altura-header,120px)+16px)] rounded-2xl bg-white p-5 shadow-sm md:p-8">
      <h2 className="mb-4 flex items-center gap-3 text-xl font-extrabold text-zinc-900 md:text-2xl">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        {titulo}
      </h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-zinc-700">{children}</div>
    </section>
  );
}

function AyudaPage() {
  const { t, idioma } = useT();
  const pt = idioma === "pt";
  return (
    <div className="min-h-screen bg-zinc-100">
      <SiteHeader />
      <main className="mx-auto flex max-w-4xl flex-col gap-4 px-3 py-6 md:gap-6 md:px-4 md:py-10">
        <div className="px-1">
          <h1 className="text-2xl font-extrabold text-zinc-900 md:text-4xl">{t("¿Cómo podemos ayudarte?", "Como podemos ajudar?")}</h1>
          <p className="mt-2 text-zinc-600">
            {t("Todo lo que necesitás saber para comprar tus repuestos agrícolas con tranquilidad.", "Tudo o que você precisa saber para comprar suas peças agrícolas com tranquilidade.")}
          </p>
        </div>

        <Seccion id="como-comprar" icon={ShoppingCart} titulo={t("Cómo comprar", "Como comprar")}>
          <ol className="grid gap-3 sm:grid-cols-2">
            {PASOS[idioma].map((p, i) => (
              <li key={p.titulo} className="flex gap-3 rounded-xl bg-zinc-50 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <p className="flex items-center gap-2 font-bold text-zinc-900">
                    <p.icon className="h-4 w-4 text-primary" /> {p.titulo}
                  </p>
                  <p className="text-sm text-zinc-600">{p.texto}</p>
                </div>
              </li>
            ))}
          </ol>
        </Seccion>

        {pt ? (
          <Seccion id="envios" icon={Truck} titulo="Envio para o Rio Grande do Sul">
            <p className="flex items-center gap-2 font-semibold text-zinc-900">
              <BandeiraBrasil className="h-4 w-6 rounded-sm" /> Enviamos para qualquer cidade do Rio Grande do Sul por Correios ou transportadora.
            </p>
            <p>Estamos na fronteira Chuí / Chuy. Quando o pedido sai, mandamos o código de rastreio pelo WhatsApp para você acompanhar a entrega.</p>
            <p>O frete e o prazo são confirmados junto com o orçamento, conforme a sua cidade. O frete é pago pelo cliente.</p>
          </Seccion>
        ) : (
          <Seccion id="envios" icon={Truck} titulo="Envíos a Uruguay">
            <p className="flex items-center gap-2 font-semibold text-zinc-900">
              <BandeiraUruguay className="h-4 w-6 rounded-sm" /> Enviamos a los 19 departamentos por DAC.
            </p>
            <p>
              Cuando tu pedido sale, te mandamos por WhatsApp el número de seguimiento. Con ese número seguís el
              paquete en{" "}
              <a href="https://www.dac.com.uy/envios/rastrear" target="_blank" rel="noreferrer noopener" className="font-semibold text-primary underline">
                dac.com.uy
              </a>
              .
            </p>
            <p>El costo y el plazo de envío te los confirmamos junto con la cotización, según tu localidad.</p>
          </Seccion>
        )}

        <Seccion id="pagos" icon={CreditCard} titulo={t("Formas de pago", "Formas de pagamento")}>
          <p>
            {t(
              "Al confirmar la cotización te informamos las formas de pago disponibles para tu pedido. Cualquier duda, consultanos por WhatsApp antes de pagar.",
              "Ao confirmar o orçamento, informamos as formas de pagamento disponíveis para o seu pedido. Qualquer dúvida, fale conosco pelo WhatsApp antes de pagar.",
            )}
          </p>
        </Seccion>

        <Seccion id="privacidad" icon={ShieldCheck} titulo={t("Privacidad", "Privacidade")}>
          <p>
            {t(
              "Para mejorar el sitio registramos datos de navegación anónimos: páginas visitadas, ciudad aproximada, de dónde llegaste (Google, Instagram, etc.) y tipo de dispositivo. No guardamos tu dirección IP ni datos personales sin que nos los envíes. La ubicación aproximada se obtiene con IP Geolocation by",
              "Para melhorar o site registramos dados de navegação anônimos: páginas visitadas, cidade aproximada, de onde você chegou (Google, Instagram etc.) e tipo de aparelho. Não guardamos seu endereço IP nem dados pessoais sem que você os envie. A localização aproximada é obtida com IP Geolocation by",
            )}{" "}
            <a href="https://db-ip.com" target="_blank" rel="noreferrer noopener" className="font-semibold text-primary underline">
              DB-IP
            </a>
            .
          </p>
        </Seccion>

        <Seccion id="garantia" icon={ShieldCheck} titulo={t("Garantía y devoluciones", "Garantia e trocas")}>
          <p>
            {t(
              "Antes de despachar confirmamos con vos el código y la compatibilidad de cada pieza, para que recibas el repuesto correcto.",
              "Antes de enviar, confirmamos com você o código e a compatibilidade de cada peça, para que receba a peça certa.",
            )}
          </p>
          <p>
            <strong>{t("Cambios y devoluciones:", "Trocas e devoluções:")}</strong>{" "}
            {t(
              "tenés 7 días desde que recibís el pedido para cambiar o devolver un repuesto sin uso, en su embalaje original. El envío de la devolución corre por cuenta del cliente.",
              "você tem 7 dias a partir do recebimento para trocar ou devolver uma peça sem uso, na embalagem original. O envio da devolução é por conta do cliente.",
            )}
          </p>
          <p>{t("Si tenés algún problema con tu pedido, escribinos por WhatsApp y lo resolvemos juntos.", "Se tiver qualquer problema com o pedido, fale conosco pelo WhatsApp e resolvemos juntos.")}</p>
        </Seccion>

        <Seccion id="preguntas" icon={HelpCircle} titulo={t("Preguntas frecuentes", "Perguntas frequentes")}>
          <div className="divide-y divide-zinc-100">
            {PREGUNTAS[idioma].map((q) => (
              <details key={q.p} className="group py-3">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-zinc-900">
                  {q.p}
                  <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400 transition group-open:rotate-180" />
                </summary>
                <p className="mt-2 text-zinc-600">{q.r}</p>
              </details>
            ))}
          </div>
        </Seccion>

        <div className="flex flex-col items-center gap-3 rounded-2xl bg-gradient-to-br from-primary to-emerald-900 p-6 text-center text-white md:p-10">
          <h2 className="text-xl font-extrabold md:text-2xl">{t("¿Te quedó alguna duda?", "Ficou alguma dúvida?")}</h2>
          <p className="text-white/85">{t("Hablá con nuestro equipo, te respondemos por WhatsApp.", "Fale com a nossa equipe, respondemos pelo WhatsApp.")}</p>
          <div className="flex flex-wrap justify-center gap-2">
            <a
              href={whatsappContactUrl(t("¡Hola! Tengo una consulta sobre una compra.", "Olá! Tenho uma dúvida sobre uma compra."))}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 font-bold text-white shadow-lg transition hover:bg-[#1EBE57] active:scale-95"
            >
              <MessageCircle className="h-5 w-5" /> {t("Escribinos por WhatsApp", "Fale pelo WhatsApp")}
            </a>
            <Link to="/loja" className="rounded-full bg-white px-6 py-3 font-bold text-primary shadow-lg transition hover:bg-zinc-50 active:scale-95">
              {t("Ver catálogo", "Ver catálogo")}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
