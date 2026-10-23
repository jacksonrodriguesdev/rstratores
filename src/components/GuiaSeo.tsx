import { ChevronDown } from "lucide-react";
import type { GuiaSeo, Pergunta } from "@/lib/seo-guias";

// Texto de apoio das páginas de entrada (o que o Google lê para entender a página) e perguntas
// frequentes. Os links levam às outras páginas de entrada com o texto da busca (âncora).
export function GuiaSeoBloco({
  guia,
  links,
}: {
  guia: GuiaSeo;
  links?: Array<{ href: string; texto: string }>;
}) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:p-8">
      <h2 className="text-xl font-extrabold text-zinc-900 md:text-2xl">{guia.titulo}</h2>
      <div className="mt-3 max-w-4xl space-y-3 text-zinc-700">
        {guia.paragrafos.map((p) => (
          <p key={p.slice(0, 40)}>{p}</p>
        ))}
      </div>
      {links && links.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {links.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                className="inline-block rounded-full bg-[#f3f5f1] px-4 py-2 text-sm font-semibold text-zinc-800 ring-1 ring-black/5 hover:text-primary hover:ring-primary/40"
              >
                {l.texto}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function PerguntasBloco({ titulo, perguntas }: { titulo: string; perguntas: Pergunta[] }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5 md:p-8">
      <h2 className="text-xl font-extrabold text-zinc-900 md:text-2xl">{titulo}</h2>
      <div className="mt-3 divide-y divide-zinc-100">
        {perguntas.map((q) => (
          <details key={q.p} className="group py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-zinc-900">
              {q.p}
              <ChevronDown className="h-4 w-4 shrink-0 text-zinc-400 transition group-open:rotate-180" />
            </summary>
            <p className="mt-2 text-zinc-600">{q.r}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

// Links internos para as buscas principais (texto = a busca do cliente)
export const LINKS_BUSCAS_PRINCIPAIS = [
  { href: "/repuestos-agricolas", texto: "Repuestos agrícolas en Uruguay" },
  { href: "/repuestos/massey-ferguson", texto: "Repuestos Massey Ferguson" },
  { href: "/repuestos/john-deere", texto: "Repuestos John Deere" },
  { href: "/repuestos/valtra", texto: "Repuestos Valtra / Valmet" },
  { href: "/repuestos/new-holland", texto: "Repuestos New Holland" },
  { href: "/repuestos/case-ih", texto: "Repuestos Case IH" },
  { href: "/repuestos/agrale", texto: "Repuestos Agrale" },
  { href: "/repuestos/ford", texto: "Repuestos Ford" },
  { href: "/repuestos/filtros", texto: "Filtros para tractores" },
];
