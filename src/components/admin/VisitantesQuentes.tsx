import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Flame,
  Users,
  MessageCircle,
  MapPin,
  Smartphone,
  Monitor,
  Megaphone,
  Repeat,
  UserX,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { visitantesQuentesFn } from "@/lib/captura";
import { cn } from "@/lib/utils";

const n = (v: number) => v.toLocaleString("pt-BR");
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "—");
const quando = (s: string) =>
  new Date(s).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

// Captação → Visitantes quentes: anônimos que viram várias peças (src/lib/visitantes-quentes.server.ts)
const SITUACAO = {
  sem_contato: ["Sem contato", "bg-amber-100 text-amber-800"],
  deixou_whatsapp: ["Deixou o WhatsApp", "bg-[#e9f9ef] text-[#128C4B]"],
  pediu_whatsapp: ["Pediu pelo WhatsApp", "bg-emerald-100 text-emerald-800"],
} as const;

export function VisitantesQuentes() {
  const [dias, setDias] = useState(30);
  const [minimo, setMinimo] = useState(3);
  const [pais, setPais] = useState("UY");
  const [so, setSo] = useState<"" | "sem_contato">("");
  const { data, isFetching } = useQuery({
    queryKey: ["visitantes-quentes", dias, minimo, pais],
    queryFn: () => visitantesQuentesFn({ data: { dias, minimo, pais } }),
  });
  const r = data?.resumo;
  const lista = (data?.lista ?? []).filter((v) => !so || v.situacao === so);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {[7, 14, 30, 60].map((d) => (
          <button
            key={d}
            onClick={() => setDias(d)}
            className={cn(
              "rounded-full border px-3 py-1 font-semibold",
              dias === d ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {d} dias
          </button>
        ))}
        <select
          value={minimo}
          onChange={(e) => setMinimo(Number(e.target.value))}
          className="h-8 rounded-md border bg-background px-2"
          aria-label="Mínimo de peças"
        >
          {[2, 3, 4, 5, 8].map((m) => (
            <option key={m} value={m}>
              {m}+ peças vistas
            </option>
          ))}
        </select>
        <select
          value={pais}
          onChange={(e) => setPais(e.target.value)}
          className="h-8 rounded-md border bg-background px-2"
          aria-label="País"
        >
          <option value="UY">Uruguai</option>
          <option value="BR">Brasil</option>
          <option value="">Todos os países</option>
        </select>
        {isFetching && <span className="text-xs text-muted-foreground">atualizando…</span>}
      </div>

      {r && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {(
            [
              [Users, "Visitantes sem conta", r.anonimos, `${n(r.viramPecas)} viram peças`],
              [
                Flame,
                `Quentes (${minimo}+ peças)`,
                r.quentes,
                pct(r.quentes, r.viramPecas) + " de quem viu peças",
              ],
              [UserX, "Quentes sem contato", r.semContato, "não deixaram nada"],
              [
                MessageCircle,
                "Quentes com contato",
                r.deixaramWhatsapp + r.pediram,
                `${n(r.deixaramWhatsapp)} pop-up · ${n(r.pediram)} WhatsApp`,
              ],
              [Repeat, "Voltaram outro dia", r.voltaram, "quentes que voltaram"],
            ] as const
          ).map(([I, rotulo, v, sub]) => (
            <Card key={rotulo} className="p-4">
              <I className="h-4 w-4 text-primary" />
              <p className="mt-1 text-2xl font-bold">{n(v)}</p>
              <p className="text-xs text-muted-foreground">{rotulo}</p>
              <p className="text-[11px] text-muted-foreground/80">{sub}</p>
            </Card>
          ))}
        </div>
      )}

      {data && (
        <div className="grid gap-5 xl:grid-cols-3">
          {(
            [
              ["De onde vêm (origem · campanha)", Megaphone, data.porOrigem],
              ["Página de entrada", Monitor, data.porEntrada],
              ["Cidade", MapPin, data.porCidade],
            ] as const
          ).map(([titulo, I, grupos]) => (
            <Card key={titulo} className="overflow-hidden p-0">
              <h3 className="flex items-center gap-2 border-b p-3 text-sm font-semibold">
                <I className="h-4 w-4 text-primary" /> {titulo}
              </h3>
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-left text-muted-foreground">
                  <tr>
                    <th className="px-3 py-1.5 font-medium" />
                    <th className="px-2 py-1.5 text-right font-medium">Quentes</th>
                    <th
                      className="px-2 py-1.5 text-right font-medium"
                      title="Quentes que não deixaram contato"
                    >
                      Sem contato
                    </th>
                    <th
                      className="px-3 py-1.5 text-right font-medium"
                      title="Quentes que deixaram contato ou pediram"
                    >
                      Converte
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {grupos.map((g) => (
                    <tr key={g.chave}>
                      <td className="max-w-[180px] truncate px-3 py-1.5" title={g.chave}>
                        {g.chave}
                      </td>
                      <td className="px-2 py-1.5 text-right">{n(g.quentes)}</td>
                      <td className="px-2 py-1.5 text-right font-semibold text-amber-700">
                        {n(g.semContato)}
                      </td>
                      <td className="px-3 py-1.5 text-right">{pct(g.contato, g.quentes)}</td>
                    </tr>
                  ))}
                  {!grupos.length && (
                    <tr>
                      <td colSpan={4} className="p-3 text-center text-muted-foreground">
                        —
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          ))}
        </div>
      )}
      <p className="-mt-2 text-xs text-muted-foreground">
        Ordenado por «sem contato»: no topo estão as origens e páginas que trazem gente interessada
        que não converte. Ali vale testar outra oferta, outro texto no anúncio ou o pop-up do
        WhatsApp mais cedo.
      </p>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center gap-2 border-b p-4">
          <h3 className="mr-auto font-semibold">Visitantes quentes</h3>
          {(
            [
              ["", "Todos"],
              ["sem_contato", "Só sem contato"],
            ] as const
          ).map(([k, rotulo]) => (
            <button
              key={k}
              onClick={() => setSo(k)}
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold",
                so === k ? "bg-foreground text-background" : "bg-muted",
              )}
            >
              {rotulo}
            </button>
          ))}
        </div>
        <p className="border-b bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          Cada linha é um navegador anônimo (sem nome nem IP). Não dá para chamar quem não deixou
          contato; use para ver o que essa gente procura e de onde vem. Os 150 mais quentes.
        </p>
        <div className="max-h-[640px] divide-y overflow-y-auto">
          {lista.map((v, i) => {
            const [rotulo, cor] = SITUACAO[v.situacao];
            const Ap = v.aparelho === "desktop" ? Monitor : Smartphone;
            return (
              <div key={`${v.id}-${i}`} className="grid gap-2 px-4 py-3 lg:grid-cols-[220px_1fr]">
                <div className="text-xs">
                  <p className="flex items-center gap-1.5">
                    <b className="text-base">{v.pecas}</b> peças
                    <span className="text-muted-foreground">· {v.vistas} vistas</span>
                  </p>
                  <span
                    className={cn(
                      "mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold",
                      cor,
                    )}
                  >
                    {rotulo}
                    {v.telefone ? ` · ${v.telefone}` : ""}
                  </span>
                  <p className="mt-1 flex flex-wrap items-center gap-x-2 text-muted-foreground">
                    <span className="inline-flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" /> {v.cidade ?? "?"}
                    </span>
                    <Ap className="h-3 w-3" />
                    {v.dias > 1 && <span>{v.dias} dias</span>}
                  </p>
                  <p className="text-muted-foreground">última: {quando(v.ultima)}</p>
                </div>
                <div className="min-w-0 text-xs">
                  <p className="truncate text-muted-foreground">
                    <Megaphone className="mr-1 inline h-3 w-3" />
                    {v.origem}
                    {v.entrada && <> · entrou por {v.entrada}</>}
                  </p>
                  <ul className="mt-1 flex flex-wrap gap-1">
                    {v.top.map((p) => (
                      <li key={p.sku}>
                        <a
                          href={`/produto/${encodeURIComponent(p.sku)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-block max-w-[260px] truncate rounded border bg-background px-1.5 py-0.5 hover:border-primary"
                          title={`${p.nome} (${p.sku})`}
                        >
                          {p.nome}
                          {p.vezes > 1 && <b className="ml-1 text-primary">×{p.vezes}</b>}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
          {data && !lista.length && (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Nenhum visitante quente no período.
            </p>
          )}
        </div>
      </Card>
    </div>
  );
}
