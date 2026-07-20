import { MessageCircle } from "lucide-react";
import { whatsappContactUrl, PHONE_DISPLAY } from "@/lib/whatsapp";

export function FloatingContact() {
  return (
    <a
      href={whatsappContactUrl()}
      target="_blank"
      rel="noreferrer noopener"
      aria-label={`Entrar em contato via WhatsApp ${PHONE_DISPLAY}`}
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-black/20 transition-transform hover:-translate-y-0.5 hover:bg-[#1EBE57] sm:px-5"
    >
      <MessageCircle className="h-5 w-5" />
      <span className="hidden sm:inline">Entrar em contato</span>
    </a>
  );
}