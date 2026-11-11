// Card de uma peça de caminhão na loja. Sem preço: mostra "Consultar". Nome já vem em espanhol.
import { useT } from "@/lib/idioma";
import type { CaminhaoItem } from "@/lib/caminhoes";

export function CardCaminhao({ p }: { p: CaminhaoItem }) {
  const { href } = useT();
  return (
    <a
      href={href(`/repuestos-camiones/producto/${encodeURIComponent(p.codigo)}`)}
      className="group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:ring-primary/40"
    >
      <div className="relative aspect-square overflow-hidden bg-zinc-50">
        {p.imagem ? (
          <img
            src={p.imagem}
            alt={p.nome_es}
            loading="lazy"
            className="h-full w-full object-contain p-3 transition group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-zinc-300">
            <span className="text-xs">Sin foto</span>
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
          {p.montadora}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-2 text-sm font-bold text-zinc-900 group-hover:text-primary">
          {p.nome_es}
        </p>
        <p className="mt-1 font-mono text-[11px] text-zinc-500">
          {p.codigo}
          {p.referencia ? ` · ${p.referencia}` : ""}
        </p>
        {p.aplicacao && (
          <p className="mt-1 line-clamp-1 text-[11px] text-zinc-400">{p.aplicacao}</p>
        )}
        <span className="mt-auto pt-2">
          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
            Consultar
          </span>
        </span>
      </div>
    </a>
  );
}

export function GradeCaminhoes({ itens }: { itens: CaminhaoItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
      {itens.map((p) => (
        <CardCaminhao key={p.codigo} p={p} />
      ))}
    </div>
  );
}
