// Despachante → uma cotação/embarque: empresa compradora, exportador, itens com NCM/acordo/origem,
// dados prontos para a DU-E (copiar / CSV), etapas do embarque e documentos.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  ClipboardCopy,
  Download,
  FileText,
  Loader2,
  Paperclip,
  Truck,
} from "lucide-react";
import { cotacaoDespFn } from "@/lib/despachante/despachante";
import {
  acordoDaNcm,
  ETAPAS,
  formatarNcm,
  origemValida,
  PONTOS_FRONTEIRA,
  preferenciaDoItem,
  STATUS_ORIGEM_PT,
} from "@/lib/aduana/aduana-comum";
import {
  formatarRut,
  INCOTERMS,
  PAGAMENTOS,
  STATUS_COTACAO_PT,
  statusVisivel,
  totaisCotacao,
  usd,
} from "@/lib/b2b-comum";
import { Selo, tomStatus } from "@/components/b2b/B2bLayout";
import { EditorEmbarque } from "@/components/b2b/AdminAduana";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/despachante/cotacao/$codigo")({ component: Detalhe });

const cnpjFmt = (c: string) =>
  c.length === 14
    ? `${c.slice(0, 2)}.${c.slice(2, 5)}.${c.slice(5, 8)}/${c.slice(8, 12)}-${c.slice(12)}`
    : c || "—";
const br = (n: number, d = 2) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

function Detalhe() {
  const { codigo } = Route.useParams();
  const { data, refetch } = useQuery({
    queryKey: ["desp-cotacao", codigo],
    queryFn: () => cotacaoDespFn({ data: { codigo } }),
  });
  const [embarqueAberto, setEmbarqueAberto] = useState(false);
  if (!data) return <Loader2 className="mx-auto mt-20 h-6 w-6 animate-spin text-slate-400" />;
  const { cotacao: c, empresa: e, embarque: b, aduana: x, origens } = data;
  const st = statusVisivel(c);
  const itens = c.itens.filter((i) => i.disponivel !== false);
  const t = totaisCotacao(c.itens, c.frete);
  const cotada = c.status !== "ENVIADA";

  // Linhas para a DU-E (uma por item da NF-e)
  const due = itens.map((i, k) => ({
    item: k + 1,
    codigo: i.codigo,
    descricao: i.nome ?? i.descricao ?? i.codigo,
    ncm: String(i.ncm ?? ""),
    unidade: i.unidade ?? "UN",
    qtd: i.qtd,
    unit: i.preco ?? 0,
    total: i.qtd * (i.preco ?? 0),
    pesoLiq: i.peso ? i.peso * i.qtd : null,
    acordo:
      acordoDaNcm(i.ncm)?.acordo === "ACE02"
        ? "ACE 02 - 76 PA"
        : acordoDaNcm(i.ncm)
          ? "ACE 18 (ROM)"
          : "",
    origem:
      i.origem === "MERCOSUL"
        ? "Mercosul (BR)"
        : i.origem === "OUTRA"
          ? "Extrazona"
          : "A confirmar",
  }));
  const csv = () => {
    const cab = [
      "Item",
      "Código",
      "Descrição",
      "NCM",
      "Unidade",
      "Quantidade",
      "Valor unit. USD",
      "Valor total USD",
      "Peso líquido kg",
      "Acordo",
      "Origem",
    ];
    const linhas = due.map((d) => [
      d.item,
      d.codigo,
      d.descricao,
      d.ncm,
      d.unidade,
      d.qtd,
      br(d.unit),
      br(d.total),
      d.pesoLiq != null ? br(d.pesoLiq, 3) : "",
      d.acordo,
      d.origem,
    ]);
    const esc = (v: unknown) => `"${String(v).replace(/"/g, '""')}"`;
    const conteudo = "\uFEFF" + [cab, ...linhas].map((l) => l.map(esc).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([conteudo], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `DU-E_${c.codigo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const copiar = async () => {
    const txt = due
      .map((d) =>
        [
          d.item,
          d.ncm,
          d.descricao,
          d.qtd,
          d.unidade,
          br(d.unit),
          br(d.total),
          d.pesoLiq != null ? br(d.pesoLiq, 3) : "",
        ].join("\t"),
      )
      .join("\n");
    await navigator.clipboard.writeText(txt).catch(() => {});
    toast.success("Itens copiados (cole no Excel)");
  };

  return (
    <div className="space-y-6">
      <Link
        to="/despachante/cotacoes"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" /> Cotações
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-mono text-3xl font-extrabold tracking-tight">{c.codigo}</h1>
          <p className="text-sm text-slate-500">
            {e.razao_social} · {c.destino ?? "—"} · {c.incoterm}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Selo tom={tomStatus(st)} className="text-sm">
            {STATUS_COTACAO_PT[st]}
          </Selo>
          {b && (
            <button
              onClick={() => setEmbarqueAberto(true)}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-emerald-700 px-5 text-sm font-bold text-white"
            >
              <Truck className="h-4 w-4" /> Etapas do embarque
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Bloco t="Importador / comprador (Uruguai)">
          <p className="font-semibold">{e.razao_social}</p>
          <p className="font-mono text-xs">RUT {formatarRut(e.rut)}</p>
          <p>{[e.endereco, e.cidade, e.departamento, "Uruguai"].filter(Boolean).join(", ")}</p>
          <p>
            {e.contato_nome} · {e.email} {e.telefone && `· ${e.telefone}`}
          </p>
          <p className="mt-2 text-xs font-semibold text-slate-500">Despachante no Uruguai</p>
          <p>
            {e.despachante_nome
              ? `${e.despachante_nome}${e.despachante_contato ? ` · ${e.despachante_contato}` : ""}`
              : "não informado"}
          </p>
        </Bloco>
        <Bloco t="Exportador (AGRO PARTS)">
          <p className="font-semibold">{x.razao || "razão social não configurada"}</p>
          <p className="font-mono text-xs">CNPJ {cnpjFmt(x.cnpj)}</p>
          <p>{x.endereco || "endereço não configurado"}</p>
          <p>
            Regime: {x.regime} · RADAR:{" "}
            {x.radar === "NAO" ? "não habilitado" : x.radar.toLowerCase()}
          </p>
          <p>
            Prova de origem:{" "}
            {x.provaModo === "AUTOCERT" ? "autocertificação" : `certificado (${x.entidade})`}
          </p>
          <p>CFOP padrão: {x.cfop}</p>
        </Bloco>
        <Bloco t="Operação">
          <p>{INCOTERMS[c.incoterm]}</p>
          <p>Pagamento: {PAGAMENTOS[e.pagamento] ?? e.pagamento}</p>
          <p>
            Fronteira:{" "}
            {b?.fronteira ? PONTOS_FRONTEIRA[b.fronteira] : PONTOS_FRONTEIRA[x.fronteira]}
          </p>
          <p>Transportadora: {b?.transportadora || x.transportadora || "—"}</p>
          <p>
            Volumes/peso: {b?.volumes ?? "—"} vol · bruto {b?.peso_bruto ?? "—"} kg · líquido{" "}
            {b?.peso_liquido ?? (t.peso || "—")} kg
          </p>
          {c.mensagem && <p className="mt-1 text-xs text-slate-500">Cliente: “{c.mensagem}”</p>}
        </Bloco>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="font-bold">Itens e classificação</h2>
            <p className="text-xs text-slate-500">
              Corrija NCM e origem em{" "}
              <Link to="/despachante/produtos" className="font-semibold text-emerald-700">
                Produtos, NCM e origem
              </Link>
              ; a próxima cotação já sai certa.
            </p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs text-slate-500">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Peça</th>
                <th className="p-3">NCM / acordo</th>
                <th className="p-3">Origem</th>
                <th className="p-3 text-right">Qtd</th>
                <th className="p-3 text-right">Peso líq.</th>
                {cotada && <th className="p-3 text-right">Valor USD</th>}
              </tr>
            </thead>
            <tbody>
              {itens.map((i, k) => {
                const o = i.sku ? origens[i.sku] : undefined;
                const a = acordoDaNcm(i.ncm);
                const pref = preferenciaDoItem(i);
                return (
                  <tr key={i.linha} className="border-t align-top">
                    <td className="p-3 text-slate-400">{k + 1}</td>
                    <td className="p-3">
                      <p className="font-semibold">{i.nome ?? i.descricao ?? "fora do catálogo"}</p>
                      <p className="font-mono text-xs text-slate-500">
                        {i.codigo}
                        {i.sku?.startsWith("EXP-") && (
                          <span className="ml-1 font-sans text-emerald-700">
                            catálogo exportação
                          </span>
                        )}
                        {i.marca && ` · ${i.marca}`}
                      </p>
                    </td>
                    <td className="p-3 text-xs">
                      <p className={cn("font-mono", !a && "font-semibold text-amber-700")}>
                        {a ? formatarNcm(i.ncm) : "sem NCM"}
                      </p>
                      {a && (
                        <p className="text-slate-500">
                          {a.acordo === "ACE02" ? "ACE 02 · 76º PA" : "ACE 18 · ROM"}
                        </p>
                      )}
                    </td>
                    <td className="p-3 text-xs">
                      <p
                        className={
                          pref === "SIM"
                            ? "font-semibold text-emerald-700"
                            : pref === "NAO"
                              ? "text-slate-500"
                              : "text-amber-700"
                        }
                      >
                        {pref === "SIM"
                          ? "Preferência Mercosul"
                          : pref === "NAO"
                            ? "Extrazona"
                            : "A confirmar"}
                      </p>
                      <p className="text-slate-500">
                        {o
                          ? `${STATUS_ORIGEM_PT[o.status as keyof typeof STATUS_ORIGEM_PT]?.split(" (")[0]}${o.prova_data ? ` · prova ${o.prova_data.split("-").reverse().join("/")}${origemValida(o) ? "" : " (vencida)"}` : ""}`
                          : "origem não registrada"}
                      </p>
                      {o?.fabricante && (
                        <p className="text-slate-500">Fabricante: {o.fabricante}</p>
                      )}
                    </td>
                    <td className="p-3 text-right font-semibold">
                      {i.qtd}{" "}
                      <span className="text-xs font-normal text-slate-500">
                        {i.unidade ?? "UN"}
                      </span>
                    </td>
                    <td className="p-3 text-right text-xs">
                      {i.peso ? `${br(i.peso * i.qtd, 2)} kg` : "—"}
                    </td>
                    {cotada && (
                      <td className="p-3 text-right font-semibold">
                        {i.preco != null ? usd(i.qtd * i.preco) : "—"}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            {cotada && (
              <tfoot className="border-t text-sm">
                <tr>
                  <td colSpan={5} className="p-3 text-right text-slate-500">
                    Mercadoria {c.frete != null ? `+ frete ${usd(c.frete)}` : ""}
                  </td>
                  <td className="p-3 text-right text-xs">{t.peso ? `${t.peso} kg` : ""}</td>
                  <td className="p-3 text-right text-base font-bold">{usd(c.total)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      {cotada && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold">Dados para a DU-E</h2>
              <p className="text-xs text-slate-500">
                Uma linha por item da NF-e de exportação. A DU-E é elaborada a partir da NF-e no
                Portal Único Siscomex.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={copiar}
                className="inline-flex h-9 items-center gap-1.5 rounded-full border border-slate-300 px-4 text-sm font-semibold"
              >
                <ClipboardCopy className="h-4 w-4" /> Copiar itens
              </button>
              <button
                onClick={csv}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-slate-950 px-4 text-sm font-semibold text-white"
              >
                <Download className="h-4 w-4" /> Baixar CSV (Excel)
              </button>
            </div>
          </div>
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <Dado r="País de destino" v="Uruguai (URY)" />
            <Dado
              r="Condição de venda (Incoterm)"
              v={`${c.incoterm}${c.destino ? ` – ${c.destino}` : ""}`}
            />
            <Dado r="Moeda" v="Dólar dos EUA (USD)" />
            <Dado r="Valor na condição de venda" v={usd(c.total)} />
            <Dado r="Via de transporte" v="Rodoviária" />
            <Dado
              r="Unidade de despacho/embarque"
              v={b?.fronteira ? PONTOS_FRONTEIRA[b.fronteira] : PONTOS_FRONTEIRA[x.fronteira]}
            />
            <Dado r="CFOP da NF-e" v={b?.cfop ?? x.cfop} />
            <Dado r="Enquadramento (sugestão)" v="80000 – exportação normal (confirmar)" />
          </dl>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="font-bold">Documentos</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {cotada && (
            <a
              href={`/empresas/proforma/${c.codigo}`}
              target="_blank"
              rel="noreferrer"
              className={botaoDoc}
            >
              <FileText className="h-4 w-4 text-emerald-600" /> Proforma
            </a>
          )}
          {cotada &&
            [
              ["factura", "Fatura comercial"],
              ["packing", "Packing list"],
              ["origen", "Origem / declaração"],
            ].map(([k, r]) => (
              <a
                key={k}
                href={`/empresas/documento/${c.codigo}?tipo=${k}`}
                target="_blank"
                rel="noreferrer"
                className={botaoDoc}
              >
                <FileText className="h-4 w-4 text-emerald-600" /> {r}
              </a>
            ))}
          {b?.arquivos.map((a) => (
            <a
              key={a.id}
              href={`/api/empresas/arquivo/${a.id}`}
              target="_blank"
              rel="noreferrer"
              className={botaoDoc}
            >
              <Paperclip className="h-4 w-4 text-slate-500" /> {a.nome}
              <span className="text-xs text-slate-400">
                ({ETAPAS.find((x) => x.id === a.etapa)?.pt})
              </span>
            </a>
          ))}
          {!cotada && (
            <p className="text-sm text-slate-500">
              Os documentos saem quando a proposta for enviada.
            </p>
          )}
        </div>
      </section>

      {embarqueAberto && (
        <EditorEmbarque
          codigo={c.codigo}
          fechar={() => {
            setEmbarqueAberto(false);
            refetch();
          }}
        />
      )}
    </div>
  );
}

const botaoDoc =
  "inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold hover:border-emerald-400";
function Bloco({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <div className="space-y-0.5 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
      <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">{t}</p>
      {children}
    </div>
  );
}
const Dado = ({ r, v }: { r: string; v: string }) => (
  <div className="rounded-xl bg-slate-50 p-3">
    <dt className="text-xs text-slate-500">{r}</dt>
    <dd className="font-semibold">{v}</dd>
  </div>
);
