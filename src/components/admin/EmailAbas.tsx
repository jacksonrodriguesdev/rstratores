import { Link } from "@tanstack/react-router";
import { Mail, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

// Abas de E-mail marketing: campanhas (envio único) e automações (envio sozinho)
export function EmailAbas({ atual }: { atual: "campanhas" | "automacoes" }) {
  const abas = [
    { k: "campanhas", to: "/admin/emails", rotulo: "Campanhas", icone: Mail },
    { k: "automacoes", to: "/admin/automacoes", rotulo: "Automações", icone: Zap },
  ] as const;
  return (
    <div className="inline-flex rounded-xl border bg-muted/40 p-1">
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
