import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";
import { CalculadoraExport } from "@/components/CalculadoraExport";

// /exportacion/calculadora — calculadora pública de costo desembarcado (lead magnet, espanhol).
export const Route = createFileRoute("/exportacion/calculadora")({
  head: () => {
    const url = `${SITE_URL}/exportacion/calculadora`;
    const titulo = "Calculadora de costo de importación a Uruguay | AGRO PARTS";
    const desc =
      "Calculá en segundos el costo de importar repuestos desde Brasil a Uruguay: peso cubado, flete e impuestos (arancel 0% Mercosur, tasa consular, IVA). Pedí la proforma exacta.";
    return {
      links: [{ rel: "canonical", href: url }],
      meta: [
        { title: titulo },
        { name: "description", content: desc },
        { property: "og:url", content: url },
        { property: "og:title", content: titulo },
        { property: "og:description", content: desc },
      ],
    };
  },
  component: CalculadoraExport,
});
