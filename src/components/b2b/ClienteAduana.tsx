// AGRO PARTS Mayorista — parte aduaneira vista pela empresa (em espanhol): costo estimado puesto en
// Uruguay, seguimiento del embarque con documentos y datos del despachante de aduana.
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Download, FileText, Globe2, Landmark, Loader2, Save, Truck } from "lucide-react";
import {
  custoUruguai,
  ETAPAS,
  PONTOS_FRONTEIRA,
  preferenciaDoItem,
  type TaxasUruguai,
} from "@/lib/aduana/aduana-comum";
import { salvarDespachanteFn } from "@/lib/aduana/aduana";
import { type ItemCotacao, usd } from "@/lib/b2b-comum";
import { cn } from "@/lib/utils";

export function SeloPreferencia({ i }: { i: Pick<ItemCotacao, "ncm" | "origem"> }) {
  const p = preferenciaDoItem(i);
  if (p === "SIM")
    return <span className="font-semibold text-emerald-700">· Origen Mercosur (arancel 0%)</span>;
  if (p === "NAO") return <span className="text-slate-500">· Origen extrazona</span>;
  return <span className="text-amber-700">· Origen a confirmar</span>;
}

export function CustoEstimado({
  itens,
  frete,
  taxas,
}: {
  itens: ItemCotacao[];
  frete: number | null;
  taxas: TaxasUruguai;
}) {
  const linhas = itens
    .filter((i) => i.disponivel !== false)
    .map((i) => ({
      qtd: i.qtd,
      preco: i.preco ?? null,
      preferencia: preferenciaDoItem(i),
      aec: i.aec,
    }));
  const c = custoUruguai(linhas, frete, taxas);
  if (!c.fob) return null;
  const L = ({ r, v, forte, nota }: { r: string; v: number; forte?: boolean; nota?: string }) => (
    <div
      className={cn(
        "flex items-baseline justify-between gap-3 py-1.5",
        forte && "border-t pt-3 text-base font-bold",
      )}
    >
      <span className={forte ? "" : "text-slate-600"}>
        {r}
        {nota && <span className="block text-[11px] font-normal text-slate-400">{nota}</span>}
      </span>
      <span className="whitespace-nowrap font-semibold">{usd(v)}</span>
    </div>
  );
  return (
    <div className="mt-6 grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 md:grid-cols-[1fr_1.1fr]">
      <div>
        <p className="flex items-center gap-2 font-bold">
          <Landmark className="h-4 w-4 text-emerald-600" /> Costo estimado puesto en Uruguay
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Para comparar con tu proveedor actual. Las piezas con origen Mercosur y certificado no
          pagan arancel de importación.
        </p>
        {c.economiaMercosul > 0 && (
          <div className="mt-4 rounded-2xl bg-emerald-50 p-4 text-emerald-900">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Globe2 className="h-4 w-4" /> Ahorro por origen Mercosur
            </p>
            <p className="mt-1 text-2xl font-extrabold">{usd(c.economiaMercosul)}</p>
            <p className="text-xs">de arancel que no pagás en esta compra (estimado)</p>
          </div>
        )}
        <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
          Estimación, no es liquidación oficial. Tasa Consular {taxas.tasaConsularMercosul}%
          (Mercosur) / {taxas.tasaConsularExtrazona}% (extrazona), IVA {taxas.iva}% sobre CIF +
          arancel y arancel de {taxas.aecPadrao}% para ítems sin preferencia, salvo que el ítem
          indique otro. Confirmá con tu despachante y la DNA.
        </p>
      </div>
      <div className="text-sm">
        <L r="Mercadería (FOB)" v={c.fob} />
        <L r="Flete" v={c.frete} />
        <L r="Seguro" v={c.seguro} nota={`${taxas.seguro}% del FOB`} />
        <L r="Valor en aduana (CIF)" v={c.cif} />
        <L r="Arancel de importación" v={c.arancel} nota="0% en ítems con origen Mercosur" />
        <L r="Tasa Consular" v={c.tasaConsular} />
        <L r="Despachante (estimado)" v={c.despachante} />
        <L r="Total sin IVA" v={c.totalSemIva} forte />
        <L
          r={`IVA importación (${taxas.iva}%)`}
          v={c.iva}
          nota="Para empresas contribuyentes suele ser crédito fiscal"
        />
        <L r="Total con IVA" v={c.total} forte />
      </div>
    </div>
  );
}

type EmbarqueCliente = {
  etapas: Partial<Record<string, { status: string; data?: string | null; numero?: string | null }>>;
  fronteira: string | null;
  transportadora: string | null;
  volumes: number | null;
  peso_bruto: number | null;
  arquivos: Array<{ id: string; etapa: string; nome: string }>;
} | null;

export function SeguimentoEmbarque({
  codigo,
  embarque,
}: {
  codigo: string;
  embarque: EmbarqueCliente;
}) {
  if (!embarque) return null;
  const etapas = ETAPAS.filter((e) => e.cliente);
  const feitas = etapas.filter((e) =>
    ["FEITO", "NAO_SE_APLICA"].includes(embarque.etapas[e.id]?.status ?? ""),
  ).length;
  return (
    <div className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
        <div>
          <p className="flex items-center gap-2 font-bold">
            <Truck className="h-4 w-4 text-emerald-600" /> Seguimiento del embarque
          </p>
          <p className="text-xs text-slate-500">
            {embarque.fronteira
              ? `Frontera: ${PONTOS_FRONTEIRA[embarque.fronteira as keyof typeof PONTOS_FRONTEIRA] ?? embarque.fronteira}`
              : ""}
            {embarque.transportadora ? ` · Transporte: ${embarque.transportadora}` : ""}
            {embarque.volumes ? ` · ${embarque.volumes} bultos` : ""}
            {embarque.peso_bruto ? ` · ${embarque.peso_bruto} kg` : ""}
          </p>
        </div>
        <div className="w-44">
          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${(feitas / etapas.length) * 100}%` }}
            />
          </div>
          <p className="mt-1 text-right text-xs text-slate-500">
            {feitas} de {etapas.length} pasos
          </p>
        </div>
      </div>
      <div className="grid md:grid-cols-[1.2fr_0.8fr]">
        <ol className="p-6">
          {etapas.map((e, k) => {
            const r = embarque.etapas[e.id];
            const feito = r?.status === "FEITO" || r?.status === "NAO_SE_APLICA";
            const andando = r?.status === "EM_ANDAMENTO";
            return (
              <li key={e.id} className="relative flex gap-4 pb-5 last:pb-0">
                {k < etapas.length - 1 && (
                  <span className="absolute left-[13px] top-7 h-full w-px bg-slate-200" />
                )}
                <span
                  className={cn(
                    "relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                    feito
                      ? "bg-emerald-600 text-white"
                      : andando
                        ? "bg-amber-100 text-amber-800 ring-4 ring-amber-50"
                        : "bg-slate-100 text-slate-400",
                  )}
                >
                  {feito ? (
                    <Check className="h-4 w-4" />
                  ) : andando ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    k + 1
                  )}
                </span>
                <div className="min-w-0">
                  <p
                    className={cn("text-sm font-semibold", !feito && !andando && "text-slate-500")}
                  >
                    {e.es}
                  </p>
                  <p className="text-xs text-slate-500">
                    {r?.data
                      ? r.data.split("-").reverse().join("/")
                      : feito
                        ? "listo"
                        : andando
                          ? "en curso"
                          : "pendiente"}
                    {r?.numero ? ` · ${r.numero}` : ""}
                  </p>
                  {embarque.arquivos
                    .filter((a) => a.etapa === e.id)
                    .map((a) => (
                      <a
                        key={a.id}
                        href={`/api/empresas/arquivo/${a.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium hover:bg-slate-200"
                      >
                        <Download className="h-3 w-3" /> {a.nome}
                      </a>
                    ))}
                </div>
              </li>
            );
          })}
        </ol>
        <div className="border-t border-slate-100 bg-slate-50/70 p-6 md:border-l md:border-t-0">
          <p className="text-sm font-bold">Documentos para tu despachante</p>
          <p className="mt-1 text-xs text-slate-500">
            Con la factura comercial, el packing list, el CRT/MIC y la prueba de origen tu
            despachante registra el DUA en la DNA.
          </p>
          <div className="mt-4 space-y-2">
            {[
              ["factura", "Factura comercial"],
              ["packing", "Packing list"],
              ["origen", "Origen de las mercaderías"],
            ].map(([t, r]) => (
              <a
                key={t}
                href={`/empresas/documento/${codigo}?tipo=${t}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold hover:border-emerald-400"
              >
                <FileText className="h-4 w-4 text-emerald-600" /> {r}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CartaoDespachante({
  nome,
  contato,
}: {
  nome?: string | null;
  contato?: string | null;
}) {
  const qc = useQueryClient();
  const [n, setN] = useState(nome ?? "");
  const [c, setC] = useState(contato ?? "");
  const [salvando, setSalvando] = useState(false);
  const [ok, setOk] = useState(false);
  const mudou = n !== (nome ?? "") || c !== (contato ?? "");
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-md">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Landmark className="h-5 w-5 text-emerald-600" /> Tu despachante de aduana
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            En Uruguay el despacho de importación lo hace un despachante habilitado ante la DNA. Con
            sus datos le preparamos los documentos de cada embarque.
          </p>
        </div>
        <div className="grid w-full gap-2 sm:w-auto sm:min-w-[420px] sm:grid-cols-2">
          <input
            value={n}
            onChange={(e) => setN(e.target.value)}
            placeholder="Nombre o estudio"
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500"
          />
          <input
            value={c}
            onChange={(e) => setC(e.target.value)}
            placeholder="E-mail o teléfono"
            className="h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-emerald-500"
          />
          <button
            disabled={!mudou || salvando}
            onClick={async () => {
              setSalvando(true);
              try {
                await salvarDespachanteFn({ data: { nome: n, contato: c } });
                setOk(true);
                qc.invalidateQueries({ queryKey: ["b2b-minha"] });
              } finally {
                setSalvando(false);
              }
            }}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-slate-950 px-4 text-sm font-bold text-white disabled:opacity-40 sm:col-span-2"
          >
            {salvando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : ok && !mudou ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {ok && !mudou ? "Guardado" : "Guardar"}
          </button>
        </div>
      </div>
    </section>
  );
}
