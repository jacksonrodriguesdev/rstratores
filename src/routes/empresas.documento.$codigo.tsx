// AGRO PARTS Mayorista: documentos do embarque para imprimir/salvar em PDF (A4), em espanhol —
// o despachante do comprador usa no DUA. ?tipo=factura (fatura comercial), packing (packing list),
// origen (Declaração de Origem na autocertificação, ou dados para o certificado da entidade).
// Vê a empresa dona da cotação e o admin.
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { formatarRut, INCOTERMS, PAGAMENTOS, totaisCotacao, usd } from "@/lib/b2b-comum";
import { acordoDaNcm, formatarNcm, PONTOS_FRONTEIRA } from "@/lib/aduana/aduana-comum";
import { documentoFn } from "@/lib/aduana/aduana";

type Busca = { tipo: "factura" | "packing" | "origen" };
export const Route = createFileRoute("/empresas/documento/$codigo")({
  validateSearch: (s: Record<string, unknown>): Busca => ({
    tipo: s.tipo === "packing" ? "packing" : s.tipo === "origen" ? "origen" : "factura",
  }),
  head: ({ params }) => ({
    meta: [
      { title: `Documento ${params.codigo} · AGRO PARTS` },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: Documento,
});

const cnpjFmt = (c: string) =>
  c.length === 14
    ? `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`
    : c;

function Documento() {
  const { codigo } = Route.useParams();
  const { tipo } = Route.useSearch();
  const { data, error } = useQuery({
    queryKey: ["b2b-documento", codigo],
    queryFn: () => documentoFn({ data: { codigo } }),
    retry: false,
  });
  if (error) return <p className="p-6 font-sans">{(error as Error).message}</p>;
  if (!data) return <p className="p-6 font-sans">Cargando…</p>;
  const { cotacao: c, empresa: e, embarque: b, exportador: x } = data;
  const itens = c.itens.filter((i) => i.disponivel !== false && i.preco != null);
  const t = totaisCotacao(c.itens, c.frete);
  const hoje = new Date().toLocaleDateString("es-UY");
  const titulo =
    tipo === "packing"
      ? "PACKING LIST"
      : tipo === "origen"
        ? x.provaModo === "AUTOCERT"
          ? "DECLARACIÓN DE ORIGEN"
          : "ORIGEN DE LAS MERCADERÍAS"
        : "FACTURA COMERCIAL";
  const numero = b?.fatura ?? `FC-${c.codigo}`;
  const vendedor = x.razao || x.texto.split("\n")[0];
  return (
    <div className="min-h-screen bg-slate-200 py-6 print:bg-white print:py-0">
      <style>{`@page { size: A4; margin: 12mm; } @media print { .nao-imprimir { display: none !important; } }`}</style>
      <div className="nao-imprimir mx-auto mb-4 flex max-w-[210mm] flex-wrap justify-end gap-2 px-2">
        {(["factura", "packing", "origen"] as const).map((k) => (
          <a
            key={k}
            href={`?tipo=${k}`}
            className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-semibold ${k === tipo ? "bg-white" : "text-slate-600 hover:bg-white/60"}`}
          >
            {k === "factura" ? "Factura comercial" : k === "packing" ? "Packing list" : "Origen"}
          </a>
        ))}
        <button
          onClick={() => window.print()}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-slate-950 px-5 text-sm font-bold text-white"
        >
          <Printer className="h-4 w-4" /> Imprimir / PDF
        </button>
      </div>
      <article className="mx-auto max-w-[210mm] bg-white p-[12mm] text-[11px] leading-snug text-slate-900 shadow-xl print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b-2 border-slate-900 pb-4">
          <div className="flex items-start gap-3">
            <img src="/logo.png" alt="" className="h-14 w-auto" />
            <div>
              <p className="text-[9px] font-bold tracking-widest text-slate-500">
                EXPORTADOR / VENDEDOR
              </p>
              <p className="text-sm font-black">{vendedor}</p>
              {x.cnpj && <p>CNPJ {cnpjFmt(x.cnpj)}</p>}
              {x.endereco ? (
                <p>{x.endereco}</p>
              ) : (
                <p className="whitespace-pre-line text-slate-600">
                  {x.texto.split("\n").slice(1).join("\n")}
                </p>
              )}
              <p>Brasil</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xl font-black tracking-tight">{titulo}</p>
            <p className="font-mono text-sm font-bold">
              {tipo === "origen" ? `DO-${c.codigo}` : numero}
            </p>
            <p className="mt-1 text-slate-600">Fecha: {hoje}</p>
            <p className="text-slate-600">Ref.: proforma PF-{c.codigo}</p>
          </div>
        </header>

        <section className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded border border-slate-300 p-3">
            <p className="text-[9px] font-bold tracking-widest text-slate-500">
              IMPORTADOR / COMPRADOR
            </p>
            <p className="mt-1 text-sm font-bold">{e.razao_social}</p>
            <p>RUT {formatarRut(e.rut)}</p>
            {e.endereco && <p>{e.endereco}</p>}
            <p>{[e.cidade, e.departamento, "Uruguay"].filter(Boolean).join(", ")}</p>
            {e.despachante_nome && (
              <p className="mt-1 text-slate-600">
                Despachante: {e.despachante_nome}
                {e.despachante_contato ? ` · ${e.despachante_contato}` : ""}
              </p>
            )}
          </div>
          <div className="rounded border border-slate-300 p-3">
            <p className="text-[9px] font-bold tracking-widest text-slate-500">EMBARQUE</p>
            <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
              <dt className="text-slate-500">Incoterm</dt>
              <dd className="font-semibold">
                {c.incoterm} {c.destino ? `· ${c.destino}` : ""}
              </dd>
              <dt className="text-slate-500">Transporte</dt>
              <dd className="font-semibold">
                Carretero internacional{b?.transportadora ? ` · ${b.transportadora}` : ""}
              </dd>
              <dt className="text-slate-500">Frontera</dt>
              <dd className="font-semibold">
                {b?.fronteira
                  ? PONTOS_FRONTEIRA[b.fronteira as keyof typeof PONTOS_FRONTEIRA]
                  : "—"}
              </dd>
              <dt className="text-slate-500">País de origen</dt>
              <dd className="font-semibold">Brasil</dd>
              {tipo === "factura" && (
                <>
                  <dt className="text-slate-500">Pago</dt>
                  <dd className="font-semibold">{PAGAMENTOS[e.pagamento] ?? e.pagamento}</dd>
                  <dt className="text-slate-500">Moneda</dt>
                  <dd className="font-semibold">USD</dd>
                </>
              )}
            </dl>
          </div>
        </section>

        {tipo === "packing" ? (
          <>
            <table className="mt-5 w-full border-collapse">
              <thead>
                <tr className="bg-slate-900 text-left text-[9.5px] uppercase tracking-wide text-white">
                  <th className="px-2 py-1.5">#</th>
                  <th className="px-2 py-1.5">Código</th>
                  <th className="px-2 py-1.5">Descripción</th>
                  <th className="px-2 py-1.5">NCM</th>
                  <th className="px-2 py-1.5 text-right">Cant.</th>
                  <th className="px-2 py-1.5 text-right">Peso unit. kg</th>
                  <th className="px-2 py-1.5 text-right">Peso total kg</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((i, k) => (
                  <tr key={i.linha} className="border-b border-slate-200 odd:bg-slate-50">
                    <td className="px-2 py-1.5 text-slate-500">{k + 1}</td>
                    <td className="px-2 py-1.5 font-mono font-semibold">{i.codigo}</td>
                    <td className="px-2 py-1.5">{i.nome ?? i.descricao}</td>
                    <td className="px-2 py-1.5 font-mono">{formatarNcm(i.ncm)}</td>
                    <td className="px-2 py-1.5 text-right">{i.qtd}</td>
                    <td className="px-2 py-1.5 text-right">{i.peso ? i.peso.toFixed(3) : "—"}</td>
                    <td className="px-2 py-1.5 text-right font-semibold">
                      {i.peso ? (i.peso * i.qtd).toFixed(2) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <section className="mt-4 grid grid-cols-4 gap-3 text-center">
              {[
                ["Ítems", String(t.itens)],
                ["Unidades", String(t.unidades)],
                ["Bultos", b?.volumes ? String(b.volumes) : "—"],
                [
                  "Peso bruto / neto (kg)",
                  `${b?.peso_bruto ?? "—"} / ${b?.peso_liquido ?? (t.peso || "—")}`,
                ],
              ].map(([r, v]) => (
                <div key={r} className="rounded border border-slate-300 p-2">
                  <p className="text-[9px] font-bold tracking-widest text-slate-500">
                    {r.toUpperCase()}
                  </p>
                  <p className="text-sm font-bold">{v}</p>
                </div>
              ))}
            </section>
          </>
        ) : tipo === "origen" ? (
          <>
            <table className="mt-5 w-full border-collapse">
              <thead>
                <tr className="bg-slate-900 text-left text-[9.5px] uppercase tracking-wide text-white">
                  <th className="px-2 py-1.5">#</th>
                  <th className="px-2 py-1.5">NCM</th>
                  <th className="px-2 py-1.5">Descripción</th>
                  <th className="px-2 py-1.5">Acuerdo</th>
                  <th className="px-2 py-1.5">Origen</th>
                  <th className="px-2 py-1.5 text-right">Cant.</th>
                  <th className="px-2 py-1.5 text-right">Valor USD</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((i, k) => {
                  const a = acordoDaNcm(i.ncm);
                  return (
                    <tr
                      key={i.linha}
                      className="border-b border-slate-200 align-top odd:bg-slate-50"
                    >
                      <td className="px-2 py-1.5 text-slate-500">{k + 1}</td>
                      <td className="px-2 py-1.5 font-mono">{formatarNcm(i.ncm)}</td>
                      <td className="px-2 py-1.5">
                        {i.nome ?? i.descricao}{" "}
                        <span className="font-mono text-slate-500">({i.codigo})</span>
                      </td>
                      <td className="px-2 py-1.5">
                        {a ? (a.acordo === "ACE02" ? "ACE 02 – 76 PA" : "ACE 18") : "—"}
                      </td>
                      <td className="px-2 py-1.5 font-semibold">
                        {i.origem === "MERCOSUL"
                          ? "Brasil (Mercosur)"
                          : i.origem === "OUTRA"
                            ? "No originario"
                            : "A confirmar"}
                      </td>
                      <td className="px-2 py-1.5 text-right">{i.qtd}</td>
                      <td className="px-2 py-1.5 text-right">
                        {(i.qtd * (i.preco ?? 0)).toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {x.provaModo === "AUTOCERT" ? (
              <section className="mt-5 rounded border-2 border-slate-900 p-4 text-[11.5px] leading-relaxed">
                <p className="font-bold">Declaración de Origen</p>
                <p className="mt-2">
                  El exportador de las mercaderías amparadas por la factura comercial nº {numero}{" "}
                  declara que los productos indicados como “Brasil (Mercosur)” son originarios de la
                  República Federativa del Brasil y cumplen los requisitos de origen del Régimen de
                  Origen del MERCOSUR (Decisión CMC Nº 05/23), conforme a la NCM y al acuerdo
                  indicados en cada ítem.
                </p>
                <div className="mt-8 grid grid-cols-2 gap-8">
                  <div className="border-t border-slate-900 pt-1">Lugar y fecha</div>
                  <div className="border-t border-slate-900 pt-1">
                    Firma y aclaración del exportador · {vendedor}
                    {x.cnpj ? ` · CNPJ ${cnpjFmt(x.cnpj)}` : ""}
                  </div>
                </div>
                <p className="mt-4 text-[9.5px] text-slate-500">
                  Modelo de referencia: confirme el texto e información mínima con el Apéndice V del
                  Régimen de Origen del MERCOSUR y la guía de autocertificación de la SECEX
                  (Portaria SECEX nº 373/2024) antes del uso.
                </p>
              </section>
            ) : (
              <section className="mt-5 rounded border border-slate-300 p-4 text-[11px] leading-relaxed">
                <p className="font-bold">Certificado de Origen Digital (COD) del MERCOSUR</p>
                <p className="mt-1">
                  Los ítems con origen Mercosur viajan con el certificado de origen emitido por la
                  entidad habilitada ({x.entidade}). El número del certificado figura en el
                  seguimiento del embarque y el archivo se envía al despachante.
                </p>
              </section>
            )}
          </>
        ) : (
          <>
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
                    <td className="px-2 py-1.5 font-mono">{formatarNcm(i.ncm)}</td>
                    <td className="px-2 py-1.5">
                      {i.origem === "MERCOSUL"
                        ? "Brasil"
                        : i.origem === "OUTRA"
                          ? "Extrazona"
                          : "—"}
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
              <p className="max-w-[60%] text-slate-600">{INCOTERMS[c.incoterm]}</p>
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
          </>
        )}
        <footer className="mt-6 border-t border-slate-300 pt-3 text-[9.5px] leading-relaxed text-slate-500">
          Documento generado por AGRO PARTS a partir de la proforma PF-{c.codigo}. La exportación se
          formaliza en Brasil con la NF-e de exportación y la DU-E (Portal Único Siscomex); el
          transporte con CRT y MIC/DTA. Clasificación NCM y origen a confirmar por el despachante de
          aduana.
        </footer>
      </article>
    </div>
  );
}
