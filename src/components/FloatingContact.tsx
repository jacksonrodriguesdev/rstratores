import { MessageCircle } from "lucide-react";
import { whatsappContactUrl, PHONE_DISPLAY } from "@/lib/whatsapp";
import { useRouterState } from "@tanstack/react-router";
import { useT } from "@/lib/idioma";

export function FloatingContact() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useT();

  if (pathname.startsWith("/loja")) {
    return null;
  }

  return (
    <a
      href={whatsappContactUrl(
        t("¡Hola! Quiero consultar por repuestos.", "Olá! Quero consultar sobre peças."),
      )}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={t(
        `Escribinos por WhatsApp ${PHONE_DISPLAY}`,
        `Fale conosco pelo WhatsApp ${PHONE_DISPLAY}`,
      )}
      className="fixed bottom-5 right-5 z-50 hidden items-center md:flex gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 transition-transform hover:-translate-y-0.5 hover:bg-[#1EBE57] sm:px-5"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden sm:inline">
        {t("¿Te ayudamos? Escribinos", "Precisa de ajuda? Fale conosco")}
      </span>
    </a>
  );
}
