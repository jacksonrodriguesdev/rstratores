import { Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin, Instagram, Facebook, Lock, Truck, MessageCircle } from "lucide-react";
import { whatsappContactUrl } from "@/lib/whatsapp";
import { INSTAGRAM_URL, INSTAGRAM_USUARIO, FACEBOOK_URL } from "@/lib/navegacao";
import { BandeiraUruguay } from "@/components/Bandeiras";

const AYUDA = [
  { label: "Cómo comprar", hash: "como-comprar" },
  { label: "Envíos a Uruguay", hash: "envios" },
  { label: "Formas de pago", hash: "pagos" },
  { label: "Garantía y devoluciones", hash: "garantia" },
  { label: "Preguntas frecuentes", hash: "preguntas" },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t-4 border-primary bg-zinc-900 py-12 text-zinc-400">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Marca */}
        <div>
          <Link to="/" className="mb-4 flex items-center gap-3">
            <span className="rounded-2xl bg-white p-1">
              <img decoding="async" src="/logo.png" alt="" width={44} height={44} className="h-11 w-11" loading="lazy" />
            </span>
            <span className="leading-tight">
              <span className="block text-lg font-extrabold text-white">AGRO PARTS</span>
              <span className="block text-xs font-semibold tracking-wider text-accent">REPUESTOS AGRÍCOLAS</span>
            </span>
          </Link>
          <p className="text-sm leading-relaxed">
            Más de 29.000 repuestos para tractores y cosechadoras Massey Ferguson, Valtra, John Deere, New
            Holland, Case IH y Ford. Enviamos a todo Uruguay por DAC.
          </p>
        </div>

        {/* Atención */}
        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Atención</h3>
          <ul className="space-y-3 text-sm">
            <li>
              <a
                href={whatsappContactUrl("¡Hola! Quiero consultar por repuestos.")}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 transition-colors hover:text-white"
              >
                <Phone className="h-4 w-4 text-primary" /> WhatsApp (53) 99953-4631
              </a>
            </li>
            <li>
              <a
                href="mailto:comercialrsautoparts@gmail.com"
                className="flex items-center gap-2 break-all transition-colors hover:text-white"
              >
                <Mail className="h-4 w-4 shrink-0 text-primary" /> comercialrsautoparts@gmail.com
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                Tienda online · Chuy, Rocha (frontera con Brasil)
                <br />
                Atendemos por WhatsApp y enviamos por DAC a todo Uruguay.
              </span>
            </li>
          </ul>
        </div>

        {/* Ayuda */}
        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Ayuda</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/cotizar" className="font-semibold text-amber-300 transition-colors hover:text-amber-200">
                Cotizá con nosotros
              </Link>
            </li>
            <li>
              <Link to="/pedido-rapido" className="font-semibold text-white/90 transition-colors hover:text-white">
                Pedido rápido por códigos
              </Link>
            </li>
            <li>
              <Link to="/catalogos" className="font-semibold text-white/90 transition-colors hover:text-white">
                Catálogos para mecánicos
              </Link>
            </li>
            {AYUDA.map((a) => (
              <li key={a.hash}>
                <Link to="/ayuda" hash={a.hash} className="transition-colors hover:text-white">
                  {a.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Garantías */}
        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">Comprá tranquilo</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" /> Envíos por DAC con rastreo
            </li>
            <li className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" /> Atención personalizada por WhatsApp
            </li>
            <li className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" /> Sitio seguro (HTTPS)
            </li>
            <li className="flex items-center gap-2">
              <BandeiraUruguay className="h-3.5 w-5 rounded-[2px]" /> Atendemos todo Uruguay
            </li>
          </ul>
          {(INSTAGRAM_URL || FACEBOOK_URL) && (
            <div className="mt-5 flex gap-3">
              {INSTAGRAM_URL && (
                <a
                  href={INSTAGRAM_URL}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Instagram ${INSTAGRAM_USUARIO}`}
                  className="inline-flex items-center gap-2 rounded-full bg-zinc-800 py-2 pl-2 pr-4 text-sm font-semibold text-white/90 transition-colors hover:bg-gradient-to-r hover:from-[#f58529] hover:via-[#dd2a7b] hover:to-[#8134af] hover:text-white"
                >
                  <Instagram className="h-5 w-5" /> {INSTAGRAM_USUARIO}
                </a>
              )}
              {FACEBOOK_URL && (
                <a
                  href={FACEBOOK_URL}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Facebook"
                  className="rounded-full bg-zinc-800 p-2 transition-colors hover:bg-primary hover:text-white"
                >
                  <Facebook className="h-5 w-5" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 border-t border-zinc-800 px-4 pt-6 text-center text-xs text-zinc-500">
        <p>
          &copy; {new Date().getFullYear()} AGRO PARTS · Tienda online de repuestos agrícolas · Chuy, Uruguay
        </p>
      </div>
    </footer>
  );
}
