import { createFileRoute, redirect } from "@tanstack/react-router";

// "Produtos e preços" virou a página única de Produtos: o endereço antigo leva para lá
export const Route = createFileRoute("/admin/precificacao")({
  beforeLoad: () => {
    throw redirect({ to: "/admin/produtos" });
  },
});
