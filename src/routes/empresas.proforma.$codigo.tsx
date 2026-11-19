// AGRO PARTS Mayorista: proforma da cotação para imprimir ou salvar em PDF (A4).
// Vê a empresa dona da cotação e o admin. Sem valor fiscal.
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { formatarRut, INCOTERMS, PAGAMENTOS, totaisCotacao, usd } from "@/lib/b2b-comum";
import { proformaFn } from "@/lib/b2b";

export const Route = createFileRoute("/empresas/proforma/$codigo")({
  head: ({ params }) => ({
    meta: [
      { title: `Proforma ${params.codigo} · AGRO PARTS` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Proforma,
});

const dataUy = (d: string | Date) => new Date(d).toLocaleDateString("es-UY");

function Proforma() {
  const { codigo } = Route.useParams();
  const { data, error } = useQuery({
    queryKey: ["b2b-proforma", codigo],
    queryFn: () => proformaFn({ data: { codigo } }),
    retry: false,
  });
  if (error)
    return <p style={{ padding: 24, fontFamily: "sans-serif" }}>{(error as Error).message}</p>;
  if (!data) return <p style={{ padding: 24, fontFamily: "sans-serif" }}>Cargando…</p>;
  const { cotacao: c, empresa: e } = data;
  const itens = c.itens.filter((i) => i.disponivel !== false && i.preco != null);
  const t = totaisCotacao(c.itens, c.frete);
  return (
    <div className="min-h-screen bg-slate-200 py-6 print:bg-white print:py-0">
      <style>{`@page { size: A4; margin: 12mm; } @media print { .nao-imprimir { display: none !important; } }`}</style>
      <div className="nao-imprimir mx-auto mb-4 flex max-w-[210mm] justify-end px-2">
        <button
          onClick={() => window.print()}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-bold text-white"
        >
          <Printer className="h-4 w-4" /> Imprimir / guardar PDF
        </button>
      </div>
      <article className="mx-auto max-w-[210mm] bg-white p-[12mm] text-[11px] leading-snug text-slate-900 shadow-xl print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-4">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="" className="h-14 w-auto" />
            <div className="whitespace-pre-line">
              <p className="text-lg font-black tracking-tight">AGRO PARTS</p>
              <p className="text-[10px] text-slate-600">
                {data.exportador.replace(/^AGRO PARTS\n?/, "")}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-black tracking-tight">FACTURA PROFORMA</p>
            <p className="font-mono text-sm font-bold">PF-{c.codigo}</p>
            <p className="mt-1 text-slate-600">Fecha: {dataUy(c.respondida_em ?? c.created_at)}</p>
            {c.validade && (
              <p className="text-slate-600">
                Válida hasta: {c.validade.split("-").reverse().join("/")}
              </p>
            )}
          </div>
        </header>

        <section className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded border border-slate-300 p-3">
            <p className="text-[9px] font-bold tracking-widest text-slate-500">COMPRADOR</p>
            <p className="mt-1 text-sm font-bold">{e.razao_social}</p>
            <p>RUT {formatarRut(e.rut)}</p>
            {e.endereco && <p>{e.endereco}</p>}
            <p>{[e.cidade, e.departamento, "Uruguay"].filter(Boolean).join(", ")}</p>
            <p>
              {e.contato_nome}
              {e.telefone ? ` · ${e.telefone}` : ""} · {e.email}
            </p>
          </div>
          <div className="rounded border border-slate-300 p-3">
            <p className="text-[9px] font-bold tracking-widest text-slate-500">CONDICIONES</p>
            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
              <dt className="text-slate-500">Incoterm</dt>
              <dd className="font-semibold">
                {c.incoterm} {c.destino ? `· ${c.destino}` : ""}
              </dd>
              <dt className="text-slate-500">Moneda</dt>
              <dd className="font-semibold">Dólares estadounidenses (USD)</dd>
              <dt className="text-slate-500">Pago</dt>
              <dd className="font-semibold">{PAGAMENTOS[e.pagamento] ?? e.pagamento}</dd>
              <dt className="text-slate-500">Plazo</dt>
              <dd className="font-semibold">{c.prazo ?? data.prazo}</dd>
              <dt className="text-slate-500">Origen</dt>
              <dd className="font-semibold">Brasil (despacho desde Rio Grande do Sul)</dd>
            </dl>
          </div>
        </section>

        <table className="mt-5 w-full border-collapse">
          <thead>
            <tr className="bg-slate-900 text-left text-[9.5px] uppercase tracking-wide text-white">
              <th className="px-2 py-1.5">#</th>
              <th className="px-2 py-1.5">Código</th>
              <th className="px-2 py-1.5">Descripción</th>
              <th className="px-2 py-1.5">NCM</th>
              <th className="px-2 py-1.5">Origen</th>
              <th className="px-2 py-1.5 text-right">Cant.</th>
              <th className="px-2 py-1.5 text-right">Unit. USD</th>
              <th className="px-2 py-1.5 text-right">Total USD</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((i, k) => (
              <tr key={i.linha} className="border-b border-slate-200 align-top odd:bg-slate-50">
                <td className="px-2 py-1.5 text-slate-500">{k + 1}</td>
                <td className="px-2 py-1.5 font-mono font-semibold">{i.codigo}</td>
                <td className="px-2 py-1.5">
                  {i.nome ?? i.descricao}
                  {i.marca ? <span className="text-slate-500"> · {i.marca}</span> : null}
                </td>
                <td className="px-2 py-1.5 font-mono">{i.ncm ?? "—"}</td>
                <td className="px-2 py-1.5">
                  {i.origem === "MERCOSUL" ? "Mercosur" : i.origem === "OUTRA" ? "Extra-zona" : "—"}
                </td>
                <td className="px-2 py-1.5 text-right">{i.qtd}</td>
                <td className="px-2 py-1.5 text-right">{(i.preco ?? 0).toFixed(2)}</td>
                <td className="px-2 py-1.5 text-right font-semibold">
                  {(i.qtd * (i.preco ?? 0)).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="mt-4 flex justify-between gap-6">
          <div className="text-slate-600">
            <p>
              {t.itens} ítems · {t.unidades} unidades{t.peso ? ` · peso estimado ${t.peso} kg` : ""}
            </p>
            <p className="mt-1">{INCOTERMS[c.incoterm]}</p>
          </div>
          <table className="min-w-[60mm] text-right">
            <tbody>
              <tr>
                <td className="px-2 py-0.5 text-slate-500">Subtotal</td>
                <td className="px-2 py-0.5 font-semibold">{usd(c.subtotal)}</td>
              </tr>
              {c.frete != null && (
                <tr>
                  <td className="px-2 py-0.5 text-slate-500">Flete</td>
                  <td className="px-2 py-0.5 font-semibold">{usd(c.frete)}</td>
                </tr>
              )}
              <tr className="border-t-2 border-slate-900">
                <td className="px-2 py-1 font-bold">TOTAL</td>
                <td className="px-2 py-1 text-sm font-black">{usd(c.total)}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {c.nota_cliente && (
          <p className="mt-4 whitespace-pre-line rounded border border-slate-200 p-2">
            {c.nota_cliente}
          </p>
        )}

        <PackingList codigo={c.codigo} itens={c.itens} />

        <footer className="mt-6 border-t border-slate-300 pt-3 text-[9.5px] leading-relaxed text-slate-500">
          Documento sin valor fiscal. Precios sin IVA ni tributos de importación de Uruguay. La
          preferencia arancelaria del Mercosur aplica solo a los ítems indicados con origen Mercosur
          y acompañados del certificado de origen; la clasificación NCM es referencial y debe ser
          confirmada por el despachante de aduana. Sujeto a disponibilidad al momento de la
          confirmación.
        </footer>
      </article>
    </div>
  );
}

// Packing list: peso neto, peso cubado, volume e medidas por item (para o despachante no DUA).
type ItemPacking = {
  linha: number;
  codigo: string;
  nome?: string | null;
  descricao?: string | null;
  qtd: number;
  peso?: number | null;
  disponivel?: boolean;
  cub?: {
    peso_kg: number | null;
    peso_cubado_kg: number | null;
    volume_m3: number | null;
    comp_cm: number | null;
    larg_cm: number | null;
    alt_cm: number | null;
  } | null;
};

function PackingList({ codigo, itens }: { codigo: string; itens: ItemPacking[] }) {
  const linhas = itens.filter((i) => i.disponivel !== false);
  if (!linhas.length) return null;
  const kg = (v: number | null | undefined) => (v == null ? "—" : v.toFixed(3));
  const m3 = (v: number | null | undefined) => (v == null ? "—" : v.toFixed(4));
  const pesoNetoU = (i: ItemPacking) => i.cub?.peso_kg ?? i.peso ?? null;
  let totPeso = 0;
  let totCub = 0;
  let totVol = 0;
  let totUn = 0;
  for (const i of linhas) {
    totUn += i.qtd;
    if (pesoNetoU(i) != null) totPeso += (pesoNetoU(i) as number) * i.qtd;
    if (i.cub?.peso_cubado_kg != null) totCub += i.cub.peso_cubado_kg * i.qtd;
    if (i.cub?.volume_m3 != null) totVol += i.cub.volume_m3 * i.qtd;
  }
  return (
    <section className="mt-8 print:break-before-page">
      <div className="flex items-end justify-between border-b-2 border-slate-900 pb-2">
        <p className="text-base font-black tracking-tight">PACKING LIST</p>
        <p className="font-mono text-xs font-bold">PL-{codigo}</p>
      </div>
      <table className="mt-3 w-full border-collapse">
        <thead>
          <tr className="bg-slate-900 text-left text-[9px] uppercase tracking-wide text-white">
            <th className="px-2 py-1.5">#</th>
            <th className="px-2 py-1.5">Código</th>
            <th className="px-2 py-1.5">Descripción</th>
            <th className="px-2 py-1.5 text-right">Cant.</th>
            <th className="px-2 py-1.5 text-right">Peso u. (kg)</th>
            <th className="px-2 py-1.5 text-right">Peso neto (kg)</th>
            <th className="px-2 py-1.5 text-right">Peso cubicado (kg)</th>
            <th className="px-2 py-1.5 text-right">Volumen (m³)</th>
            <th className="px-2 py-1.5">Medidas (cm)</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((i, k) => (
            <tr key={i.linha} className="border-b border-slate-200 align-top odd:bg-slate-50">
              <td className="px-2 py-1.5 text-slate-500">{k + 1}</td>
              <td className="px-2 py-1.5 font-mono font-semibold">{i.codigo}</td>
              <td className="px-2 py-1.5">{i.nome ?? i.descricao ?? "—"}</td>
              <td className="px-2 py-1.5 text-right">{i.qtd}</td>
              <td className="px-2 py-1.5 text-right">{kg(pesoNetoU(i))}</td>
              <td className="px-2 py-1.5 text-right">
                {pesoNetoU(i) == null ? "—" : kg((pesoNetoU(i) as number) * i.qtd)}
              </td>
              <td className="px-2 py-1.5 text-right font-semibold">
                {i.cub?.peso_cubado_kg == null ? "—" : kg(i.cub.peso_cubado_kg * i.qtd)}
              </td>
              <td className="px-2 py-1.5 text-right">
                {i.cub?.volume_m3 == null ? "—" : m3(i.cub.volume_m3 * i.qtd)}
              </td>
              <td className="px-2 py-1.5 font-mono text-[9px]">
                {i.cub?.comp_cm ? `${i.cub.comp_cm}×${i.cub.larg_cm}×${i.cub.alt_cm}` : "—"}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-900 font-bold">
            <td className="px-2 py-1.5" colSpan={3}>
              TOTAL · {linhas.length} ítems
            </td>
            <td className="px-2 py-1.5 text-right">{totUn}</td>
            <td className="px-2 py-1.5" />
            <td className="px-2 py-1.5 text-right">{kg(totPeso)}</td>
            <td className="px-2 py-1.5 text-right">{kg(totCub)}</td>
            <td className="px-2 py-1.5 text-right">{m3(totVol)}</td>
            <td className="px-2 py-1.5" />
          </tr>
        </tfoot>
      </table>
      <p className="mt-2 text-[9px] leading-relaxed text-slate-500">
        Pesos y volúmenes estimados (peso cubicado a 300 kg/m³). El peso bruto final depende del
        embalaje. Documento de apoyo logístico, sin valor fiscal.
      </p>
    </section>
  );
}
