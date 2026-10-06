import { Truck, ShieldCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const CARDS = [
  {
    icon: Truck,
    title: "Envíos a todo Uruguay",
    desc: "Despachamos por DAC con número de rastreo a cualquier punto del país.",
  },
  {
    icon: ShieldCheck,
    title: "Repuestos de confianza",
    desc: "Originales y alternativos de proveedores seleccionados.",
  },
  {
    icon: Clock,
    title: "Cotización en minutos",
    desc: "Escribinos por WhatsApp y te pasamos el precio sin compromiso.",
  },
];

export function TrustCards({ className }: { className?: string }) {
  return (
    <section className={cn("my-8", className)}>
      <div className="grid gap-3 sm:grid-cols-3">
        {CARDS.map((c) => (
          <div
            key={c.title}
            className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm"
          >
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <c.icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold">{c.title}</div>
              <div className="text-xs text-muted-foreground">{c.desc}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
