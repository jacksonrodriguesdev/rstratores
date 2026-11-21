import { createFileRoute } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";
import { PaginaComoImportar, ldComoImportar } from "@/components/PaginaExportacion";

// /exportacion/como-importar — guia completa de importação Brasil → Uruguai (espanhol).
export const Route = createFileRoute("/exportacion/como-importar")({
  head: () => {
    const url = `${SITE_URL}/exportacion/como-importar`;
    const titulo = "Cómo importar repuestos de Brasil a Uruguay | AGRO PARTS";
    const desc =
      "Guía paso a paso para importar repuestos agrícolas, de camiones y línea amarilla desde Brasil. Documentación, impuestos (0% de arancel Mercosur), pasos de frontera y despacho a todo Uruguay.";
    return {
      links: [{ rel: "canonical", href: url }],
      meta: [
        { title: titulo },
        { name: "description", content: desc },
        { property: "og:url", content: url },
        { property: "og:title", content: titulo },
        { property: "og:description", content: desc },
      ],
      scripts: ldComoImportar(url).map((ld) => ({
        type: "application/ld+json",
        children: JSON.stringify(ld),
      })),
    };
  },
  component: PaginaComoImportar,
});
