import { Truck, ShieldCheck, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

const CARDS = [
  {
    icon: Truck,
    title: "Entrega rápida para todo o Uruguai",
    desc: "Enviamos por DAC com rastreio para todo o território uruguaio.",
  },
  {
    icon: ShieldCheck,
    title: "Confiança e procedência",
    desc: "Peças originais e paralelas de fornecedores selecionados.",
  },
  {
    icon: Clock,
    title: "Cotação em minutos",
    desc: "Responda pelo WhatsApp e receba orçamento no mesmo dia.",
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