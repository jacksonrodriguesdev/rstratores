import { Link } from "@tanstack/react-router";
import { Mail, Phone, MapPin, Instagram, Facebook } from "lucide-react";
import { whatsappContactUrl } from "@/lib/whatsapp";

export function SiteFooter() {
  return (
    <footer className="bg-zinc-900 text-zinc-400 py-12 mt-auto border-t-4 border-primary">
      <div className="mx-auto max-w-7xl px-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
        
        {/* Coluna 1: Atendimento */}
        <div>
          <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Atendimento</h3>
          <ul className="space-y-3 text-sm">
            <li>
              <a href={whatsappContactUrl()} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:text-white transition-colors">
                <Phone className="w-4 h-4 text-primary" /> Fale via WhatsApp (53) 99953-4631
              </a>
            </li>
            <li>
              <a href="mailto:comercialrsautoparts@gmail.com" className="flex items-center gap-2 hover:text-white transition-colors">
                <Mail className="w-4 h-4 text-primary" /> comercialrsautoparts@gmail.com
              </a>
            </li>
            <li className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>Av justino amonte anacker 812, centro<br/>Santa Vitoria do Palmar - RS</span>
            </li>
          </ul>
        </div>

        {/* Coluna 2: Institucional */}
        <div>
          <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Institucional</h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/" className="hover:text-white transition-colors">Quem Somos</Link></li>
            <li><Link to="/" className="hover:text-white transition-colors">Nossas Lojas</Link></li>
            <li><Link to="/" className="hover:text-white transition-colors">Trabalhe Conosco</Link></li>
            <li><Link to="/" className="hover:text-white transition-colors">Política de Privacidade</Link></li>
          </ul>
        </div>

        {/* Coluna 3: Ajuda */}
        <div>
          <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Ajuda</h3>
          <ul className="space-y-2 text-sm">
            <li><Link to="/" className="hover:text-white transition-colors">Como Comprar</Link></li>
            <li><Link to="/" className="hover:text-white transition-colors">Prazos e Entregas</Link></li>
            <li><Link to="/" className="hover:text-white transition-colors">Trocas e Devoluções</Link></li>
            <li><Link to="/" className="hover:text-white transition-colors">Perguntas Frequentes</Link></li>
          </ul>
        </div>

        {/* Coluna 4: Pagamento */}
        <div>
          <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Formas de Pagamento</h3>
          <div className="flex flex-wrap gap-2">
            <div className="bg-white p-1 rounded"><img src="https://logospng.org/download/pix/logo-pix-icone-512.png" alt="Pix" className="h-6 w-auto" /></div>
            <div className="bg-white p-1 rounded"><img src="https://logospng.org/download/mastercard/logo-mastercard-2048.png" alt="Mastercard" className="h-6 w-auto object-contain" /></div>
            <div className="bg-white p-1 rounded"><img src="https://logospng.org/download/visa/logo-visa-2048.png" alt="Visa" className="h-6 w-auto object-contain" /></div>
            <div className="bg-white p-1 rounded"><img src="https://logospng.org/download/boleto/logo-boleto-2048.png" alt="Boleto" className="h-6 w-auto object-contain" /></div>
          </div>
        </div>

        {/* Coluna 5: Redes e Segurança */}
        <div>
          <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Redes Sociais</h3>
          <div className="flex gap-4 mb-6">
            <a href="#" className="bg-zinc-800 p-2 rounded-full hover:bg-primary hover:text-white transition-colors text-zinc-400">
              <Instagram className="w-5 h-5" />
            </a>
            <a href="#" className="bg-zinc-800 p-2 rounded-full hover:bg-primary hover:text-white transition-colors text-zinc-400">
              <Facebook className="w-5 h-5" />
            </a>
          </div>
          
          <h3 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">Segurança</h3>
          <div className="flex gap-2">
            <div className="bg-white px-2 py-1 rounded border border-zinc-700 text-xs font-bold text-black text-center leading-tight">SITE<br/>SEGURO</div>
            <div className="bg-white px-2 py-1 rounded border border-zinc-700 text-xs font-bold text-black text-center leading-tight">SSL<br/>BLINDADO</div>
          </div>
        </div>

      </div>
      
      <div className="mt-12 pt-6 border-t border-zinc-800 text-center text-xs text-zinc-500">
        <p>&copy; {new Date().getFullYear()} RS Auto Parts. Todos os direitos reservados. CNPJ: 33.443.027/0001-08</p>
      </div>
    </footer>
  );
}
