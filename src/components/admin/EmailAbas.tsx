import { Link } from "@tanstack/react-router";
import { BarChart3, Filter, Mail, Megaphone, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

// Abas de E-mail marketing: campanhas (envio único), automações (envio sozinho), análise de
// aberturas e cliques, funil de remarketing e anúncios por e-mail
export function EmailAbas({
  atual,
}: {
  atual: "campanhas" | "automacoes" | "analise" | "funil" | "anuncios";
}) {
  const abas = [
    { k: "campanhas", to: "/admin/emails", rotulo: "Campanhas", icone: Mail },
    { k: "automacoes", to: "/admin/automacoes", rotulo: "Automações", icone: Zap },
    { k: "analise", to: "/admin/emails/analise", rotulo: "Análise", icone: BarChart3 },
    { k: "funil", to: "/admin/emails/funil", rotulo: "Funil", icone: Filter },
    { k: "anuncios", to: "/admin/emails/anuncios", rotulo: "Anúncios", icone: Megaphone },
  ] as const;
  return (
    <div className="inline-flex max-w-full flex-wrap rounded-xl border bg-muted/40 p-1">
      {abas.map((a) => (
        <Link
          key={a.k}
          to={a.to}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition",
            atual === a.k
              ? "bg-background text-primary shadow"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <a.icone className="h-4 w-4" /> {a.rotulo}
        </Link>
      ))}
    </div>
  );
}
