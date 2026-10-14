import { Truck, ShieldCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/idioma";

const CARDS = [
  {
    icon: Truck,
    title: ["Envíos a todo Uruguay", "Envio para todo o Rio Grande do Sul"],
    desc: ["Despachamos por DAC con número de rastreo a cualquier punto del país.", "Enviamos por Correios ou transportadora, com código de rastreio, para qualquer cidade."],
  },
  {
    icon: ShieldCheck,
    title: ["Repuestos de confianza", "Peças de confiança"],
    desc: ["Originales y alternativos de proveedores seleccionados.", "Originais e alternativas de fornecedores selecionados."],
  },
  {
    icon: Clock,
    title: ["Cotización en minutos", "Orçamento em minutos"],
    desc: ["Escribinos por WhatsApp y te pasamos el precio sin compromiso.", "Fale conosco pelo WhatsApp e passamos o preço sem compromisso."],
  },
];

export function TrustCards({ className }: { className?: string }) {
  const { t } = useT();
  return (
    <section className={cn("my-8", className)}>
      <div className="grid gap-3 sm:grid-cols-3">
        {CARDS.map((c) => (
          <div
            key={c.title[0]}
            className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm"
          >
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <c.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold">{t(c.title[0], c.title[1])}</div>
              <div className="text-xs text-muted-foreground">{t(c.desc[0], c.desc[1])}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
