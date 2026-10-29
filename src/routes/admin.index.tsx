import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Dashboard } from "@/components/admin/dashboard/Dashboard";
import { ATALHOS } from "@/components/admin/dashboard/FiltroPeriodo";

// Painel inicial do admin. O período fica no endereço (?p=30d ou ?de=…&ate=…): dá para salvar
// ou mandar o link de um período. Padrão: últimos 30 dias.
type Busca = { p?: string; de?: string; ate?: string };
const DATA = /^\d{4}-\d{2}-\d{2}$/;

export const Route = createFileRoute("/admin/")({
  validateSearch: (s: Record<string, unknown>): Busca => ({
    p: typeof s.p === "string" && ATALHOS.some((a) => a.id === s.p) ? s.p : undefined,
    de: typeof s.de === "string" && DATA.test(s.de) ? s.de : undefined,
    ate: typeof s.ate === "string" && DATA.test(s.ate) ? s.ate : undefined,
  }),
  component: Painel,
});

function Painel() {
  const busca = Route.useSearch();
  const navigate = useNavigate({ from: "/admin/" });
  const livre = !busca.p && busca.de && busca.ate;
  const atalho = livre ? null : (busca.p ?? "30d");
  const [de, ate] = livre ? [busca.de!, busca.ate!] : ATALHOS.find((a) => a.id === atalho)!.calc();
  return (
    <Dashboard
      de={de}
      ate={ate}
      atalho={atalho}
      aoMudar={(d, t, a) => navigate({ search: a ? { p: a } : { de: d, ate: t }, replace: true })}
    />
  );
}
