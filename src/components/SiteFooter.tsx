import { Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin, Instagram, Facebook, Lock, Truck, MessageCircle } from "lucide-react";
import { whatsappContactUrl } from "@/lib/whatsapp";
import { INSTAGRAM_URL, INSTAGRAM_USUARIO, FACEBOOK_URL } from "@/lib/navegacao";
import { BandeiraUruguay, BandeiraBrasil } from "@/components/Bandeiras";
import { MARCAS_SEO, CATEGORIAS_SEO } from "@/lib/seo-paginas";
import { useT } from "@/lib/idioma";
import { SeletorIdioma } from "@/components/SeletorIdioma";

const AYUDA = [
  { label: ["Cómo comprar", "Como comprar"], hash: "como-comprar" },
  { label: ["Envíos a Uruguay", "Envio para o Rio Grande do Sul"], hash: "envios" },
  { label: ["Formas de pago", "Formas de pagamento"], hash: "pagos" },
  { label: ["Garantía y devoluciones", "Garantia e trocas"], hash: "garantia" },
  { label: ["Preguntas frecuentes", "Perguntas frequentes"], hash: "preguntas" },
] as const;

export function SiteFooter() {
  const { t, idioma, href } = useT();
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
              <span className="block text-xs font-semibold tracking-wider text-accent">{t("REPUESTOS AGRÍCOLAS", "PEÇAS AGRÍCOLAS")}</span>
            </span>
          </Link>
          <p className="text-sm leading-relaxed">
            {t(
              "Más de 49.000 repuestos para tractores y cosechadoras Massey Ferguson, Valtra, John Deere, New Holland, Case IH y Ford. Enviamos a todo Uruguay por DAC.",
              "Mais de 49.000 peças para tratores e colheitadeiras Massey Ferguson, Valtra, John Deere, New Holland, Case IH e Ford. Enviamos para todo o Rio Grande do Sul por Correios ou transportadora.",
            )}
          </p>
        </div>

        {/* Atención */}
        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">{t("Atención", "Atendimento")}</h3>
          <ul className="space-y-3 text-sm">
            <li>
              <a
                href={whatsappContactUrl(t("¡Hola! Quiero consultar por repuestos.", "Olá! Quero consultar sobre peças."))}
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
                {t("Tienda online · Chuy, Rocha (frontera con Brasil)", "Loja online · Chuí / Chuy (fronteira Brasil–Uruguai)")}
                <br />
                {t("Atendemos por WhatsApp y enviamos por DAC a todo Uruguay.", "Atendemos pelo WhatsApp e enviamos para todo o Rio Grande do Sul por Correios ou transportadora.")}
              </span>
            </li>
          </ul>
        </div>

        {/* Ayuda */}
        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">{t("Ayuda", "Ajuda")}</h3>
          <ul className="space-y-2 text-sm">
            <li>
              <Link to="/cotizar" className="font-semibold text-amber-300 transition-colors hover:text-amber-200">
                {t("Cotizá con nosotros", "Peça seu orçamento")}
              </Link>
            </li>
            <li>
              <Link to="/pedido-rapido" className="font-semibold text-white/90 transition-colors hover:text-white">
                {t("Pedido rápido por códigos", "Pedido rápido por códigos")}
              </Link>
            </li>
            <li>
              <Link to="/catalogos" className="font-semibold text-white/90 transition-colors hover:text-white">
                {t("Catálogos para mecánicos", "Catálogos para mecânicos")}
              </Link>
            </li>
            {AYUDA.map((a) => (
              <li key={a.hash}>
                <Link to="/ayuda" hash={a.hash} className="transition-colors hover:text-white">
                  {t(a.label[0], a.label[1])}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Garantías */}
        <div>
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-white">{t("Comprá tranquilo", "Compre com tranquilidade")}</h3>
          <ul className="space-y-3 text-sm">
            <li className="flex items-center gap-2">
              <Truck className="h-4 w-4 text-primary" /> {t("Envíos por DAC con rastreo", "Envio com código de rastreio")}
            </li>
            <li className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4 text-primary" /> {t("Atención personalizada por WhatsApp", "Atendimento personalizado pelo WhatsApp")}
            </li>
            <li className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" /> {t("Sitio seguro (HTTPS)", "Site seguro (HTTPS)")}
            </li>
            <li className="flex items-center gap-2">
              {idioma === "pt" ? <BandeiraBrasil className="h-3.5 w-5 rounded-[2px]" /> : <BandeiraUruguay className="h-3.5 w-5 rounded-[2px]" />}{" "}
              {t("Atendemos todo Uruguay", "Atendemos todo o RS e todo o Uruguai")}
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

      {/* Links para as páginas por marca e categoria (ajudam o Google a encontrá-las) */}
      <div className="mx-auto mt-10 max-w-7xl space-y-3 border-t border-zinc-800 px-4 pt-6 text-sm">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <a href={href("/repuestos")} className="font-bold uppercase tracking-wider text-white hover:text-primary">{t("Repuestos por marca:", "Peças por marca:")}</a>
          {MARCAS_SEO.map((m) => (
            <a key={m.slug} href={href(`/repuestos/${m.slug}`)} className="hover:text-white">{t("Repuestos", "Peças")} {m.marca}</a>
          ))}
        </p>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span className="font-bold uppercase tracking-wider text-white">{t("Por categoría:", "Por categoria:")}</span>
          {CATEGORIAS_SEO.map((c) => (
            <a key={c.slug} href={href(`/repuestos/${c.slug}`)} className="hover:text-white">{idioma === "pt" ? c.categoria : c.nome}</a>
          ))}
        </p>
      </div>

      <div className="mt-8 border-t border-zinc-800 px-4 pt-6 text-center text-xs text-zinc-500">
        <SeletorIdioma variante="escura" className="mb-3 justify-center" />
        <p>
          &copy; {new Date().getFullYear()} AGRO PARTS · {t("Tienda online de repuestos agrícolas · Chuy, Uruguay", "Loja online de peças agrícolas · Chuí / Chuy")}
        </p>
      </div>
    </footer>
  );
}
