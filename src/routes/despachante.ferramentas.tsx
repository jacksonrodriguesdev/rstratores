// Despachante → ferramentas: consulta de NCM (acordo e regra), calculadora de custo no Uruguai,
// validação de RUT e CNPJ, dados do exportador e guia do trâmite com as bases legais e links.
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BadgeCheck, ExternalLink, Loader2, XCircle } from "lucide-react";
import { painelAduanaFn } from "@/lib/aduana/aduana";
import { catalogoAdminFn } from "@/lib/exportacao/catalogo";
import {
  acordoDaNcm,
  custoUruguai,
  ETAPAS,
  formatarNcm,
  ncmValida,
  PONTOS_FRONTEIRA,
  TAXAS_PADRAO,
} from "@/lib/aduana/aduana-comum";
import { formatarRut, rutValido, usd } from "@/lib/b2b-comum";

export const Route = createFileRoute("/despachante/ferramentas")({ component: Ferramentas });

function cnpjValido(c: string) {
  const d = c.replace(/\D/g, "");
  if (d.length !== 14 || /^(\d)\1+$/.test(d)) return false;
  const dv = (base: string) => {
    const pesos =
      base.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    const r = pesos.reduce((s, p, i) => s + p * Number(base[i]), 0) % 11;
    return r < 2 ? 0 : 11 - r;
  };
  return dv(d.slice(0, 12)) === Number(d[12]) && dv(d.slice(0, 13)) === Number(d[13]);
}

const LINKS = [
  ["Portal Único Siscomex (DU-E)", "https://portalunico.siscomex.gov.br"],
  [
    "Manual de preenchimento da DU-E",
    "https://www.gov.br/siscomex/pt-br/informacoes/manual-de-preenchimento-du-e-v25.pdf",
  ],
  [
    "Manual MIC-DTA de saída (RFB)",
    "https://www37.receita.fazenda.gov.br/exportacao/others/Ajuda/Download/Manual-MIC-DTA-Saida.pdf",
  ],
  [
    "Acordo Brasil–Uruguai ACE 02 (Siscomex)",
    "https://www.gov.br/siscomex/pt-br/acordos-comerciais/brasil-uruguai-ace-02",
  ],
  [
    "Regime de Origem do Mercosul – perguntas",
    "https://www.mercosur.int/pt-br/politica-comercial/regime-de-origem-do-mercosul/perguntas-frequentes-rom",
  ],
  [
    "Decreto 12.059/2024 (Decisão CMC 06/23)",
    "http://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/decreto/d12059.htm",
  ],
  ["Dirección Nacional de Aduanas (Uruguai)", "https://www.aduanas.gub.uy"],
] as const;

function Ferramentas() {
  const { data } = useQuery({ queryKey: ["aduana-painel"], queryFn: () => painelAduanaFn() });
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Ferramentas e guia</h1>
      <div className="grid gap-6 lg:grid-cols-2">
        <ConsultaNcm />
        <Calculadora taxas={data?.config.taxas ?? TAXAS_PADRAO} />
        <Validadores />
        <Card t="Exportador (nossa empresa)">
          {!data ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          ) : (
            <dl className="grid grid-cols-[140px_1fr] gap-y-1 text-sm">
              <dt className="text-slate-500">Razão social</dt>
              <dd>{data.config.razao || "não configurada"}</dd>
              <dt className="text-slate-500">CNPJ</dt>
              <dd className="font-mono">{data.config.cnpj || "—"}</dd>
              <dt className="text-slate-500">Endereço</dt>
              <dd>{data.config.endereco || "—"}</dd>
              <dt className="text-slate-500">Regime</dt>
              <dd>{data.config.regime}</dd>
              <dt className="text-slate-500">RADAR</dt>
              <dd>{data.config.radar === "NAO" ? "não habilitado" : data.config.radar}</dd>
              <dt className="text-slate-500">e-CNPJ</dt>
              <dd>{data.config.certificadoDigital ? "sim" : "não informado"}</dd>
              <dt className="text-slate-500">Prova de origem</dt>
              <dd>
                {data.config.provaModo === "AUTOCERT"
                  ? "autocertificação (Portaria SECEX 373/2024)"
                  : `certificado COD – ${data.config.entidade}`}
              </dd>
              <dt className="text-slate-500">CFOP padrão</dt>
              <dd>{data.config.cfop}</dd>
              <dt className="text-slate-500">Fronteira</dt>
              <dd>{PONTOS_FRONTEIRA[data.config.fronteira]}</dd>
              <dt className="text-slate-500">Transportadora</dt>
              <dd>{data.config.transportadora || "—"}</dd>
            </dl>
          )}
        </Card>
      </div>

      <Card t="Trâmite de exportação Brasil → Uruguai (como o sistema organiza)">
        <ol className="space-y-3">
          {ETAPAS.map((e, k) => (
            <li key={e.id} className="flex gap-3 text-sm">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-bold text-white">
                {k + 1}
              </span>
              <div>
                <p className="font-semibold">{e.pt}</p>
                <p className="text-xs text-slate-500">{e.base}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-5 grid gap-2 rounded-xl bg-slate-50 p-4 text-xs text-slate-600 md:grid-cols-2">
          <p>
            <b>Origem (ROM, Dec. CMC 05/23):</b> máximo de 45% de materiais não originários
            (Brasil), salto tarifário de posição/subposição ou processo produtivo, conforme o REO da
            NCM. De minimis 10%.
          </p>
          <p>
            <b>Prova:</b> certificado (COD) por entidade habilitada ou Declaração de Origem
            (autocertificação). Validade 12 meses; guarda de documentos 5 anos.
          </p>
          <p>
            <b>ACE 02 (76º PA):</b> 629 NCMs do setor automotivo; autopeças simples seguem a regra
            geral do Mercosul; veículos/máquinas/conjuntos: conteúdo regional mínimo de 55%
            (Brasil).
          </p>
          <p>
            <b>Uruguai:</b> arancel 0% com origem e prova; Tasa Consular 3% (Mercosul) / 5%
            (extrazona); IVA 22% sobre CIF + arancel. DUA registrado pelo despachante no sistema
            LUCIA (DNA).
          </p>
        </div>
      </Card>

      <Card t="Links oficiais">
        <ul className="grid gap-2 md:grid-cols-2">
          {LINKS.map(([r, u]) => (
            <li key={u}>
              <a
                href={u}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-800 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> {r}
              </a>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function ConsultaNcm() {
  const [ncm, setNcm] = useState("");
  const a = acordoDaNcm(ncm);
  const { data } = useQuery({
    queryKey: ["desp-ncm-produtos", ncm],
    queryFn: () => catalogoAdminFn({ data: { q: ncm.replace(/\D/g, "") } }),
    enabled: ncmValida(ncm),
  });
  return (
    <Card t="Consulta de NCM">
      <input
        value={ncm}
        onChange={(e) => setNcm(e.target.value)}
        placeholder="Ex.: 8421.23.00"
        className="h-10 w-full rounded-lg border border-slate-200 px-3 font-mono text-sm"
      />
      {ncm && !ncmValida(ncm) && (
        <p className="mt-2 text-xs text-amber-700">A NCM tem 8 dígitos.</p>
      )}
      {a && (
        <div className="mt-3 space-y-1 text-sm">
          <p className="font-mono text-lg font-bold">{formatarNcm(ncm)}</p>
          <p className="font-semibold">{a.rotulo}</p>
          <p className="text-xs text-slate-500">{a.regra}</p>
          {data && (
            <p className="pt-2 text-xs text-slate-500">
              {data.produtos.length} produto(s) do catálogo de exportação com esta NCM
              {data.produtos.length > 0 &&
                `: ${data.produtos
                  .slice(0, 5)
                  .map((p) => p.codigo)
                  .join(", ")}`}
            </p>
          )}
        </div>
      )}
    </Card>
  );
}

function Calculadora({ taxas }: { taxas: typeof TAXAS_PADRAO }) {
  const [fob, setFob] = useState("1000");
  const [frete, setFrete] = useState("100");
  const [pref, setPref] = useState(true);
  const [aec, setAec] = useState(String(taxas.aecPadrao));
  const c = custoUruguai(
    [
      {
        qtd: 1,
        preco: Number(fob.replace(",", ".")) || 0,
        preferencia: pref ? "SIM" : "NAO",
        aec: Number(aec.replace(",", ".")) || 0,
      },
    ],
    Number(frete.replace(",", ".")) || 0,
    taxas,
  );
  return (
    <Card t="Custo estimado no Uruguai">
      <div className="grid grid-cols-3 gap-2 text-xs">
        <label>
          FOB USD
          <input
            value={fob}
            onChange={(e) => setFob(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2 text-sm"
          />
        </label>
        <label>
          Frete USD
          <input
            value={frete}
            onChange={(e) => setFrete(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2 text-sm"
          />
        </label>
        <label>
          TEC %
          <input
            value={aec}
            onChange={(e) => setAec(e.target.value)}
            className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2 text-sm"
          />
        </label>
      </div>
      <label className="mt-2 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={pref}
          onChange={(e) => setPref(e.target.checked)}
          className="h-4 w-4 accent-emerald-600"
        />
        Com origem Mercosul comprovada (arancel 0%)
      </label>
      <dl className="mt-3 grid grid-cols-2 gap-y-1 text-sm">
        <dt className="text-slate-500">CIF</dt>
        <dd className="text-right">{usd(c.cif)}</dd>
        <dt className="text-slate-500">Arancel</dt>
        <dd className="text-right">{usd(c.arancel)}</dd>
        <dt className="text-slate-500">Tasa Consular</dt>
        <dd className="text-right">{usd(c.tasaConsular)}</dd>
        <dt className="text-slate-500">IVA ({taxas.iva}%)</dt>
        <dd className="text-right">{usd(c.iva)}</dd>
        <dt className="text-slate-500">Despachante</dt>
        <dd className="text-right">{usd(c.despachante)}</dd>
        <dt className="border-t pt-1 font-bold">Total</dt>
        <dd className="border-t pt-1 text-right font-bold">{usd(c.total)}</dd>
      </dl>
      {pref && c.economiaMercosul > 0 && (
        <p className="mt-2 text-xs font-semibold text-emerald-700">
          Economia de arancel: {usd(c.economiaMercosul)}
        </p>
      )}
    </Card>
  );
}

function Validadores() {
  const [rut, setRut] = useState("");
  const [cnpj, setCnpj] = useState("");
  const Res = ({ ok, v }: { ok: boolean; v: string }) =>
    v ? (
      <p
        className={`mt-1 flex items-center gap-1 text-xs font-semibold ${ok ? "text-emerald-700" : "text-red-700"}`}
      >
        {ok ? <BadgeCheck className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}{" "}
        {ok ? "válido" : "inválido"}
      </p>
    ) : null;
  return (
    <Card t="Validar documentos">
      <label className="block text-xs">
        RUT (Uruguai, 12 dígitos)
        <input
          value={rut}
          onChange={(e) => setRut(e.target.value)}
          className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2 font-mono text-sm"
        />
      </label>
      <Res ok={rutValido(rut)} v={rut} />
      {rutValido(rut) && <p className="text-xs text-slate-500">{formatarRut(rut)}</p>}
      <label className="mt-3 block text-xs">
        CNPJ (Brasil)
        <input
          value={cnpj}
          onChange={(e) => setCnpj(e.target.value)}
          className="mt-1 h-9 w-full rounded-md border border-slate-200 px-2 font-mono text-sm"
        />
      </label>
      <Res ok={cnpjValido(cnpj)} v={cnpj} />
    </Card>
  );
}

function Card({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 font-bold">{t}</h2>
      {children}
    </section>
  );
}
