import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageCircle, Search, ShoppingCart, Truck, CreditCard, ShieldCheck, HelpCircle, ChevronDown } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { whatsappContactUrl } from "@/lib/whatsapp";
import { BandeiraUruguay } from "@/components/Bandeiras";

// Página de ajuda: como comprar, envios, pagamento e perguntas frequentes.
// Os textos não prometem prazos nem condições que a loja não confirmou; revise antes de mudar.
const PREGUNTAS = [
  {
    p: "¿Cómo sé si el repuesto sirve para mi tractor?",
    r: "Lo más seguro es buscar por el código original de la pieza (está grabado en la pieza o en el manual). Si no lo tenés, mandanos por WhatsApp la marca, el modelo y el número de serie del tractor, y una foto de la pieza: nuestro equipo confirma la compatibilidad antes de la compra.",
  },
  {
    p: "¿Por qué no veo el precio en el sitio?",
    r: "Trabajamos con más de 29.000 repuestos y el precio depende de la marca, la disponibilidad y el envío. Por WhatsApp te pasamos el precio final y el plazo en el momento, sin compromiso.",
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
];

export const Route = createFileRoute("/ayuda")({
  head: () => ({
    meta: [
      { title: "Ayuda — Cómo comprar, envíos y preguntas frecuentes | AGRO PARTS" },
      {
        name: "description",
        content:
          "Cómo comprar repuestos agrícolas en AGRO PARTS: cotización por WhatsApp, envíos a todo Uruguay por DAC, formas de pago y preguntas frecuentes.",
      },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: PREGUNTAS.map((q) => ({
            "@type": "Question",
            name: q.p,
            acceptedAnswer: { "@type": "Answer", text: q.r },
          })),
        }),
      },
    ],
  }),
  component: AyudaPage,
});

const PASOS = [
  { icon: Search, titulo: "Buscá tu repuesto", texto: "Por código original, nombre de la pieza o marca del tractor." },
  { icon: ShoppingCart, titulo: "Armá tu cotización", texto: "Agregá todas las piezas que necesitás con el botón «+»." },
  { icon: MessageCircle, titulo: "Pedí el precio", texto: "Nos llega la lista por WhatsApp y te respondemos con precio y plazo." },
  { icon: Truck, titulo: "Recibilo en tu casa", texto: "Confirmás el pedido y lo despachamos por DAC con seguimiento." },
];

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
  return (
    <div className="min-h-screen bg-zinc-100">
      <SiteHeader />
      <main className="mx-auto flex max-w-4xl flex-col gap-4 px-3 py-6 md:gap-6 md:px-4 md:py-10">
        <div className="px-1">
          <h1 className="text-2xl font-extrabold text-zinc-900 md:text-4xl">¿Cómo podemos ayudarte?</h1>
          <p className="mt-2 text-zinc-600">
            Todo lo que necesitás saber para comprar tus repuestos agrícolas con tranquilidad.
          </p>
        </div>

        <Seccion id="como-comprar" icon={ShoppingCart} titulo="Cómo comprar">
          <ol className="grid gap-3 sm:grid-cols-2">
            {PASOS.map((p, i) => (
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

        <Seccion id="envios" icon={Truck} titulo="Envíos a Uruguay">
          <p className="flex items-center gap-2 font-semibold text-zinc-900">
            <BandeiraUruguay className="h-4 w-6 rounded-sm" /> Enviamos a los 19 departamentos por DAC.
          </p>
          <p>
            Cuando tu pedido sale, te mandamos por WhatsApp el número de seguimiento. Con ese número seguís el
            paquete en{" "}
            <a
              href="https://www.dac.com.uy/envios/rastrear"
              target="_blank"
              rel="noreferrer noopener"
              className="font-semibold text-primary underline"
            >
              dac.com.uy
            </a>
            .
          </p>
          <p>El costo y el plazo de envío te los confirmamos junto con la cotización, según tu localidad.</p>
        </Seccion>

        <Seccion id="pagos" icon={CreditCard} titulo="Formas de pago">
          <p>
            Al confirmar la cotización te informamos las formas de pago disponibles para tu pedido. Cualquier duda,
            consultanos por WhatsApp antes de pagar.
          </p>
        </Seccion>

        <Seccion id="garantia" icon={ShieldCheck} titulo="Garantía y devoluciones">
          <p>
            Antes de despachar confirmamos con vos el código y la compatibilidad de cada pieza, para que recibas el
            repuesto correcto.
          </p>
          <p>Si tenés algún problema con tu pedido, escribinos por WhatsApp y lo resolvemos juntos.</p>
        </Seccion>

        <Seccion id="preguntas" icon={HelpCircle} titulo="Preguntas frecuentes">
          <div className="divide-y divide-zinc-100">
            {PREGUNTAS.map((q) => (
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
          <h2 className="text-xl font-extrabold md:text-2xl">¿Te quedó alguna duda?</h2>
          <p className="text-white/85">Hablá con nuestro equipo, te respondemos por WhatsApp.</p>
          <div className="flex flex-wrap justify-center gap-2">
            <a
              href={whatsappContactUrl("¡Hola! Tengo una consulta sobre una compra.")}
              target="_blank"
              rel="noreferrer noopener"
              className="flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-3 font-bold text-white shadow-lg transition hover:bg-[#1EBE57] active:scale-95"
            >
              <MessageCircle className="h-5 w-5" /> Escribinos por WhatsApp
            </a>
            <Link
              to="/loja"
              className="rounded-full bg-white px-6 py-3 font-bold text-primary shadow-lg transition hover:bg-zinc-50 active:scale-95"
            >
              Ver catálogo
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
