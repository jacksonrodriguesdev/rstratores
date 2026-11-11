// Admin → Empresas (atacado): abas "Aduana" (prontidão, dados do exportador, origem das peças) e
// "Embarques" (etapas do trâmite de exportação com números e documentos). Regras em
// src/lib/aduana/aduana-comum.ts; base documental em docs/ADUANA_EXPORTACAO_URUGUAI.md.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  CircleDashed,
  FileText,
  Loader2,
  Paperclip,
  Save,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Selo } from "@/components/b2b/B2bLayout";
import {
  acordoDaNcm,
  ETAPAS,
  type EtapaId,
  formatarNcm,
  origemValida,
  PONTOS_FRONTEIRA,
  PROVAS,
  type RegistroEtapa,
  STATUS_ORIGEM_PT,
  type StatusEtapa,
  type StatusOrigem,
} from "@/lib/aduana/aduana-comum";
import {
  apagarArquivoFn,
  atualizarEmbarqueFn,
  embarqueAdminFn,
  origensFn,
  painelAduanaFn,
  salvarConfigAduanaFn,
  salvarOrigemFn,
} from "@/lib/aduana/aduana";
import { usd } from "@/lib/b2b-comum";
import { cn } from "@/lib/utils";

type Painel = Awaited<ReturnType<typeof painelAduanaFn>>;
export const usePainelAduana = () =>
  useQuery({ queryKey: ["aduana-painel"], queryFn: () => painelAduanaFn() });

const tomOrigem = (s: StatusOrigem) =>
  s === "COMPROVADA"
    ? "verde"
    : s === "EXTRAZONA"
      ? "vermelho"
      : s === "INFORMADA"
        ? "ambar"
        : "neutro";

// ---------------------------------------------------------------- aba Aduana
export function PainelAduana() {
  const { data } = usePainelAduana();
  if (!data) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />;
  return (
    <div className="space-y-6">
      <Prontidao p={data.prontidao} />
      <ConfigExportador cfg={data.config} />
      <RegistroOrigem />
      <Card className="p-4 text-xs text-muted-foreground">
        Base: Regime de Origem do Mercosul (Decisão CMC 05/23, Decreto 12.058/2024),
        autocertificação (Portaria SECEX 373/2024), ACE 02 76º PA (Decreto 8.655/2016), DU-E (IN RFB
        1.702/2017), habilitação (IN RFB 1.984/2020). Resumo e fontes:{" "}
        <b>docs/ADUANA_EXPORTACAO_URUGUAI.md</b>. Isto organiza o trâmite; não substitui o contador
        nem o despachante.
      </Card>
    </div>
  );
}

function Prontidao({ p }: { p: Painel["prontidao"] }) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-bold">Pronto para exportar?</h3>
          <p className="text-sm text-muted-foreground">
            O que a documentação exige antes do primeiro embarque.
          </p>
        </div>
        <Selo tom={p.prontos === p.total ? "verde" : "ambar"} className="text-sm">
          {p.prontos} de {p.total} prontos
        </Selo>
      </div>
      <ul className="mt-4 grid gap-2 md:grid-cols-2">
        {p.itens.map((i) => (
          <li key={i.id} className="flex gap-3 rounded-lg border p-3 text-sm">
            <span
              className={cn(
                "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full",
                i.ok
                  ? "bg-emerald-100 text-emerald-700"
                  : (i as any).alerta
                    ? "bg-amber-100 text-amber-700"
                    : "bg-slate-100 text-slate-500",
              )}
            >
              {i.ok ? (
                <Check className="h-3.5 w-3.5" />
              ) : (i as any).alerta ? (
                <AlertTriangle className="h-3.5 w-3.5" />
              ) : (
                <CircleDashed className="h-3.5 w-3.5" />
              )}
            </span>
            <div>
              <p className="font-semibold">{i.titulo}</p>
              <p className="text-xs text-muted-foreground">{i.detalhe}</p>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function ConfigExportador({ cfg }: { cfg: Painel["config"] }) {
  const qc = useQueryClient();
  const [f, setF] = useState(cfg);
  const [salvando, setSalvando] = useState(false);
  const set = (p: Partial<typeof f>) => setF((x) => ({ ...x, ...p }));
  const setT = (k: keyof typeof f.taxas, v: string) =>
    setF((x) => ({ ...x, taxas: { ...x.taxas, [k]: Number(v.replace(",", ".")) || 0 } }));
  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarConfigAduanaFn({ data: f });
      qc.invalidateQueries({ queryKey: ["aduana-painel"] });
      toast.success("Dados de exportação salvos");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSalvando(false);
    }
  };
  const sel = "h-10 w-full rounded-md border bg-background px-2 text-sm";
  return (
    <Card className="space-y-4 p-5 text-sm">
      <h3 className="font-bold">Exportador e trâmite</h3>
      <div className="grid gap-3 md:grid-cols-3">
        <Rot r="Razão social">
          <Input value={f.razao} onChange={(e) => set({ razao: e.target.value })} />
        </Rot>
        <Rot r="CNPJ">
          <Input
            value={f.cnpj}
            inputMode="numeric"
            onChange={(e) => set({ cnpj: e.target.value })}
          />
        </Rot>
        <Rot r="Regime tributário">
          <select
            className={sel}
            value={f.regime}
            onChange={(e) => set({ regime: e.target.value as any })}
          >
            <option value="MEI">MEI</option>
            <option value="SIMPLES">ME/EPP – Simples Nacional</option>
            <option value="PRESUMIDO">Lucro Presumido</option>
            <option value="REAL">Lucro Real</option>
          </select>
        </Rot>
        <Rot r="Endereço do exportador" className="md:col-span-3">
          <Input value={f.endereco} onChange={(e) => set({ endereco: e.target.value })} />
        </Rot>
        <Rot r="Habilitação Siscomex (RADAR)">
          <select
            className={sel}
            value={f.radar}
            onChange={(e) => set({ radar: e.target.value as any })}
          >
            <option value="NAO">Ainda não habilitado</option>
            <option value="LIMITADA">Limitada</option>
            <option value="ILIMITADA">Ilimitada</option>
            <option value="EXPRESSA">Expressa</option>
          </select>
        </Rot>
        <Rot r="Prova de origem">
          <select
            className={sel}
            value={f.provaModo}
            onChange={(e) => set({ provaModo: e.target.value as any })}
          >
            <option value="ENTIDADE">Certificado (COD) por entidade habilitada</option>
            <option value="AUTOCERT">Autocertificação (Declaração de Origem)</option>
          </select>
        </Rot>
        <Rot r="Entidade certificadora">
          <Input value={f.entidade} onChange={(e) => set({ entidade: e.target.value })} />
        </Rot>
        <Rot r="CFOP padrão da NF-e de exportação">
          <select className={sel} value={f.cfop} onChange={(e) => set({ cfop: e.target.value })}>
            <option value="7102">7.102 – venda de mercadoria adquirida (revenda)</option>
            <option value="7101">7.101 – venda de produção própria</option>
            <option value="7501">
              7.501 – exportação de mercadoria recebida com fim específico
            </option>
          </select>
        </Rot>
        <Rot r="Fronteira padrão">
          <select
            className={sel}
            value={f.fronteira}
            onChange={(e) => set({ fronteira: e.target.value as any })}
          >
            {Object.entries(PONTOS_FRONTEIRA).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Rot>
        <Rot r="Transportadora internacional (ANTT)">
          <Input
            value={f.transportadora}
            onChange={(e) => set({ transportadora: e.target.value })}
          />
        </Rot>
        <Rot r="Despachante aduaneiro no Brasil (opcional)">
          <Input value={f.despachanteBr} onChange={(e) => set({ despachanteBr: e.target.value })} />
        </Rot>
        <label className="flex items-center gap-2 self-end pb-2">
          <input
            type="checkbox"
            className="h-4 w-4 accent-primary"
            checked={f.certificadoDigital}
            onChange={(e) => set({ certificadoDigital: e.target.checked })}
          />
          Tenho certificado digital e-CNPJ
        </label>
      </div>
      <div>
        <p className="font-semibold">Estimativa de custo no Uruguai (mostrada ao comprador)</p>
        <p className="text-xs text-muted-foreground">
          Valores de referência; confira na DNA/DGI. A Tasa Consular de 3% (Mercosul) e 5%
          (extrazona) e o IVA de 22% vêm de fontes de 2018–2026.
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Rot r="Tasa Consular Mercosul %">
            <Input
              value={f.taxas.tasaConsularMercosul}
              onChange={(e) => setT("tasaConsularMercosul", e.target.value)}
            />
          </Rot>
          <Rot r="Tasa Consular extrazona %">
            <Input
              value={f.taxas.tasaConsularExtrazona}
              onChange={(e) => setT("tasaConsularExtrazona", e.target.value)}
            />
          </Rot>
          <Rot r="IVA importação %">
            <Input value={f.taxas.iva} onChange={(e) => setT("iva", e.target.value)} />
          </Rot>
          <Rot r="TEC padrão sem preferência %">
            <Input value={f.taxas.aecPadrao} onChange={(e) => setT("aecPadrao", e.target.value)} />
          </Rot>
          <Rot r="Seguro % do FOB">
            <Input value={f.taxas.seguro} onChange={(e) => setT("seguro", e.target.value)} />
          </Rot>
          <Rot r="Despachante UY (USD)">
            <Input
              value={f.taxas.despachante}
              onChange={(e) => setT("despachante", e.target.value)}
            />
          </Rot>
        </div>
      </div>
      <Button onClick={salvar} disabled={salvando}>
        {salvando ? (
          <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
        ) : (
          <Save className="mr-1.5 h-4 w-4" />
        )}
        Salvar
      </Button>
    </Card>
  );
}

export function RegistroOrigem() {
  const [q, setQ] = useState("");
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState("COTADAS");
  const { data, isFetching } = useQuery({
    queryKey: ["aduana-origens", busca, filtro],
    queryFn: () => origensFn({ data: { q: busca, filtro } }),
  });
  return (
    <Card className="overflow-hidden p-0">
      <div className="space-y-3 border-b p-4">
        <div>
          <h3 className="font-bold">Origem das peças</h3>
          <p className="text-xs text-muted-foreground">
            Para o arancel 0% no Uruguai a peça precisa ser originária do Mercosul (fabricada aqui
            dentro da regra da NCM). Peça importada da Ásia e revendida no Brasil é <b>extrazona</b>
            . Guarde a prova (declaração do fabricante ou do fornecedor) por 5 anos; ela vale 12
            meses.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              setBusca(q.trim());
            }}
          >
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="SKU, código, nome ou fabricante"
              className="w-64"
            />
            <Button type="submit" size="icon" variant="secondary" aria-label="Buscar">
              <Search className="h-4 w-4" />
            </Button>
          </form>
          {[
            ["COTADAS", "Já cotadas por empresas"],
            ["SEM_NCM", "Sem NCM"],
            ["A_VERIFICAR", "A verificar"],
            ["INFORMADA", "Informadas"],
            ["COMPROVADA", "Comprovadas"],
            ["EXTRAZONA", "Extrazona"],
            ["", "Todas"],
          ].map(([k, r]) => (
            <Button
              key={k}
              size="sm"
              variant={filtro === k ? "default" : "outline"}
              onClick={() => setFiltro(k)}
            >
              {r}
            </Button>
          ))}
          {isFetching && (
            <Loader2 className="h-4 w-4 animate-spin self-center text-muted-foreground" />
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/50 text-left text-muted-foreground">
            <tr>
              <th className="p-2">Peça</th>
              <th className="p-2">NCM / acordo</th>
              <th className="p-2">Fabricante</th>
              <th className="p-2">País</th>
              <th className="p-2">Situação</th>
              <th className="p-2">Prova</th>
              <th className="p-2">TEC %</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {data?.map((o) => (
              <LinhaOrigem key={o.sku} o={o} />
            ))}
            {data && !data.length && (
              <tr>
                <td colSpan={8} className="p-6 text-center text-muted-foreground">
                  Nenhuma peça neste filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

type OrigemLinha = Awaited<ReturnType<typeof origensFn>>[number];
function LinhaOrigem({ o }: { o: OrigemLinha }) {
  const qc = useQueryClient();
  const [f, setF] = useState(o);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => setF(o), [o]);
  const mudou = JSON.stringify(f) !== JSON.stringify(o);
  const acordo = acordoDaNcm(f.ncm);
  const vencida = f.status === "COMPROVADA" && f.prova_data && !origemValida(f);
  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarOrigemFn({ data: { ...f } as any });
      qc.invalidateQueries({ queryKey: ["aduana-origens"] });
      qc.invalidateQueries({ queryKey: ["aduana-painel"] });
      toast.success("Origem salva");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSalvando(false);
    }
  };
  const inp = "h-8 rounded-md border bg-background px-2 text-xs";
  return (
    <tr className="border-t align-top">
      <td className="max-w-[240px] p-2">
        <p className="line-clamp-2 font-semibold">{o.nome}</p>
        <p className="font-mono text-muted-foreground">
          {o.codigo} {o.marca && `· ${o.marca}`}
        </p>
      </td>
      <td className="p-2">
        <input
          className={cn(inp, "w-24 font-mono")}
          value={f.ncm ?? ""}
          placeholder="8 dígitos"
          onChange={(e) => setF({ ...f, ncm: e.target.value })}
        />
        <p className="mt-1 text-[10px] text-muted-foreground">
          {acordo ? (acordo.acordo === "ACE02" ? "ACE 02 · 76º PA" : "ACE 18 · ROM") : "—"}
        </p>
      </td>
      <td className="p-2">
        <input
          className={cn(inp, "w-32")}
          value={f.fabricante ?? ""}
          onChange={(e) => setF({ ...f, fabricante: e.target.value })}
        />
      </td>
      <td className="p-2">
        <select
          className={inp}
          value={f.pais ?? ""}
          onChange={(e) => setF({ ...f, pais: e.target.value || null })}
        >
          <option value="">—</option>
          <option value="BR">Brasil</option>
          <option value="AR">Argentina</option>
          <option value="UY">Uruguai</option>
          <option value="PY">Paraguai</option>
          <option value="XX">Fora do Mercosul</option>
        </select>
      </td>
      <td className="p-2">
        <select
          className={inp}
          value={f.status}
          onChange={(e) => setF({ ...f, status: e.target.value as StatusOrigem })}
        >
          {Object.entries(STATUS_ORIGEM_PT).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <div className="mt-1">
          <Selo tom={tomOrigem(f.status) as any}>
            {vencida ? "prova vencida" : STATUS_ORIGEM_PT[f.status].split(" (")[0]}
          </Selo>
        </div>
      </td>
      <td className="p-2">
        <select
          className={cn(inp, "w-40")}
          value={f.prova ?? ""}
          onChange={(e) => setF({ ...f, prova: (e.target.value || null) as any })}
        >
          <option value="">—</option>
          {Object.entries(PROVAS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <div className="mt-1 flex gap-1">
          <input
            type="date"
            className={cn(inp, "w-32")}
            value={f.prova_data ?? ""}
            onChange={(e) => setF({ ...f, prova_data: e.target.value || null })}
          />
          <input
            className={cn(inp, "w-24")}
            placeholder="nº/ref."
            value={f.prova_ref ?? ""}
            onChange={(e) => setF({ ...f, prova_ref: e.target.value })}
          />
        </div>
      </td>
      <td className="p-2">
        <input
          className={cn(inp, "w-14")}
          value={f.aec ?? ""}
          inputMode="decimal"
          onChange={(e) =>
            setF({
              ...f,
              aec: e.target.value === "" ? null : (Number(e.target.value.replace(",", ".")) as any),
            })
          }
        />
      </td>
      <td className="p-2">
        <Button
          size="sm"
          variant={mudou ? "default" : "ghost"}
          disabled={!mudou || salvando}
          onClick={salvar}
        >
          {salvando ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
        </Button>
      </td>
    </tr>
  );
}

function Rot({
  r,
  children,
  className,
}: {
  r: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-xs font-medium">{r}</span>
      {children}
    </label>
  );
}

// ---------------------------------------------------------------- aba Embarques
export function ListaEmbarques({ abrir }: { abrir: (codigo: string) => void }) {
  const { data } = usePainelAduana();
  if (!data) return <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />;
  if (!data.embarques.length)
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">
        Nenhum embarque ainda. Quando uma empresa aceita a proposta, o embarque aparece aqui com as
        etapas do trâmite.
      </Card>
    );
  return (
    <Card className="overflow-hidden p-0">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
          <tr>
            <th className="p-3">Embarque</th>
            <th className="p-3">Empresa</th>
            <th className="p-3 text-right">Total</th>
            <th className="p-3">Andamento</th>
            <th className="p-3" />
          </tr>
        </thead>
        <tbody>
          {data.embarques.map((e) => (
            <tr key={e.id} className="border-t">
              <td className="p-3">
                <p className="font-mono font-bold">{e.codigo}</p>
                <p className="text-xs text-muted-foreground">
                  {e.incoterm} · {e.fronteira ? PONTOS_FRONTEIRA[e.fronteira] : "—"}
                </p>
              </td>
              <td className="p-3">
                <p className="font-semibold">{e.razao_social}</p>
                <p className="text-xs text-muted-foreground">{e.destino}</p>
              </td>
              <td className="p-3 text-right font-semibold">{usd(e.total)}</td>
              <td className="p-3">
                <div className="h-1.5 w-40 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary"
                    style={{ width: `${(e.feitas / ETAPAS.length) * 100}%` }}
                  />
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {e.feitas}/{ETAPAS.length} · próxima: {e.proxima}
                </p>
              </td>
              <td className="p-3 text-right">
                <Button size="sm" onClick={() => abrir(e.codigo)}>
                  Abrir
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export function EditorEmbarque({ codigo, fechar }: { codigo: string; fechar: () => void }) {
  const qc = useQueryClient();
  const { data, refetch } = useQuery({
    queryKey: ["aduana-embarque", codigo],
    queryFn: () => embarqueAdminFn({ data: { codigo } }),
  });
  const e = data?.embarque;
  const [geral, setGeral] = useState<any>(null);
  useEffect(() => {
    if (e)
      setGeral({
        fronteira: e.fronteira ?? "CHUI",
        transportadora: e.transportadora ?? "",
        volumes: e.volumes ?? "",
        peso_bruto: e.peso_bruto ?? "",
        peso_liquido: e.peso_liquido ?? "",
        cfop: e.cfop ?? "7102",
        prova_modo: e.prova_modo ?? "ENTIDADE",
      });
  }, [e]);
  const atualizar = () => {
    refetch();
    qc.invalidateQueries({ queryKey: ["aduana-painel"] });
  };
  const salvarGeral = async () => {
    try {
      await atualizarEmbarqueFn({ data: { id: e!.id, geral } });
      toast.success("Dados do embarque salvos");
      atualizar();
    } catch (err: any) {
      toast.error(err.message);
    }
  };
  const docs = data?.cotacao
    ? [
        ["factura", "Fatura comercial"],
        ["packing", "Packing list"],
        [
          "origen",
          geral?.prova_modo === "AUTOCERT"
            ? "Declaração de Origem"
            : "Dados para o certificado de origem",
        ],
      ]
    : [];
  return (
    <Dialog open onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-h-[94vh] max-w-5xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Embarque <span className="font-mono">{codigo}</span>
            {data?.empresa && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {data.empresa.razao_social}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        {!data || !e || !geral ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        ) : (
          <div className="space-y-5">
            <Card className="space-y-3 p-4 text-sm">
              <div className="grid gap-3 md:grid-cols-4">
                <Rot r="Fronteira">
                  <select
                    className="h-10 w-full rounded-md border bg-background px-2"
                    value={geral.fronteira}
                    onChange={(ev) => setGeral({ ...geral, fronteira: ev.target.value })}
                  >
                    {Object.entries(PONTOS_FRONTEIRA).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </Rot>
                <Rot r="Transportadora (ANTT)">
                  <Input
                    value={geral.transportadora}
                    onChange={(ev) => setGeral({ ...geral, transportadora: ev.target.value })}
                  />
                </Rot>
                <Rot r="CFOP da NF-e">
                  <Input
                    value={geral.cfop}
                    onChange={(ev) => setGeral({ ...geral, cfop: ev.target.value })}
                  />
                </Rot>
                <Rot r="Prova de origem">
                  <select
                    className="h-10 w-full rounded-md border bg-background px-2"
                    value={geral.prova_modo}
                    onChange={(ev) => setGeral({ ...geral, prova_modo: ev.target.value })}
                  >
                    <option value="ENTIDADE">Certificado (COD)</option>
                    <option value="AUTOCERT">Autocertificação</option>
                  </select>
                </Rot>
                <Rot r="Volumes">
                  <Input
                    value={geral.volumes}
                    inputMode="numeric"
                    onChange={(ev) => setGeral({ ...geral, volumes: ev.target.value })}
                  />
                </Rot>
                <Rot r="Peso bruto (kg)">
                  <Input
                    value={geral.peso_bruto}
                    inputMode="decimal"
                    onChange={(ev) => setGeral({ ...geral, peso_bruto: ev.target.value })}
                  />
                </Rot>
                <Rot r="Peso líquido (kg)">
                  <Input
                    value={geral.peso_liquido}
                    inputMode="decimal"
                    onChange={(ev) => setGeral({ ...geral, peso_liquido: ev.target.value })}
                  />
                </Rot>
                <div className="flex items-end">
                  <Button variant="outline" onClick={salvarGeral} className="w-full">
                    <Save className="mr-1.5 h-4 w-4" /> Salvar dados
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 border-t pt-3">
                {docs.map(([t, r]) => (
                  <a
                    key={t}
                    href={`/empresas/documento/${codigo}?tipo=${t}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Button size="sm" variant="secondary">
                      <FileText className="mr-1.5 h-4 w-4" /> {r}
                    </Button>
                  </a>
                ))}
              </div>
            </Card>
            <ol className="space-y-3">
              {ETAPAS.map((et, k) => (
                <EtapaEditor
                  key={et.id}
                  n={k + 1}
                  etapa={et}
                  embarqueId={e.id}
                  registro={e.etapas[et.id]}
                  arquivos={e.arquivos.filter((a) => a.etapa === et.id)}
                  atualizar={atualizar}
                />
              ))}
            </ol>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function EtapaEditor({
  n,
  etapa,
  embarqueId,
  registro,
  arquivos,
  atualizar,
}: {
  n: number;
  etapa: (typeof ETAPAS)[number];
  embarqueId: number;
  registro?: RegistroEtapa;
  arquivos: Array<{ id: string; nome: string; cliente: boolean }>;
  atualizar: () => void;
}) {
  const [r, setR] = useState<RegistroEtapa>(registro ?? { status: "PENDENTE" });
  const [salvando, setSalvando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [paraCliente, setParaCliente] = useState(etapa.cliente);
  const arq = useRef<HTMLInputElement>(null);
  useEffect(() => setR(registro ?? { status: "PENDENTE" }), [registro]);
  const salvar = async (status?: StatusEtapa) => {
    setSalvando(true);
    try {
      const st = status ?? r.status;
      // Etapa concluída sem data: fica com a data de hoje
      const reg = {
        ...r,
        status: st,
        data: r.data || (st === "FEITO" ? new Date().toISOString().slice(0, 10) : r.data),
      };
      await atualizarEmbarqueFn({
        data: { id: embarqueId, etapa: etapa.id as EtapaId, registro: reg },
      });
      toast.success(`${etapa.pt}: salvo`);
      atualizar();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSalvando(false);
    }
  };
  const enviar = async (file: File) => {
    setEnviando(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("embarque", String(embarqueId));
      fd.append("etapa", etapa.id);
      fd.append("cliente", paraCliente ? "1" : "0");
      const res = await fetch("/api/admin/aduana/arquivo", { method: "POST", body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error);
      toast.success("Documento anexado");
      atualizar();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setEnviando(false);
    }
  };
  const feito = r.status === "FEITO" || r.status === "NAO_SE_APLICA";
  return (
    <li className={cn("rounded-xl border p-4", feito && "border-emerald-200 bg-emerald-50/40")}>
      <div className="flex flex-wrap items-start gap-3">
        <span
          className={cn(
            "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold",
            feito
              ? "bg-emerald-600 text-white"
              : r.status === "EM_ANDAMENTO"
                ? "bg-amber-100 text-amber-800"
                : "bg-muted",
          )}
        >
          {feito ? <Check className="h-4 w-4" /> : n}
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">
            {etapa.pt}{" "}
            {!etapa.cliente && (
              <span className="text-xs font-normal text-muted-foreground">(interno)</span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">{etapa.base}</p>
        </div>
        <select
          className="h-9 rounded-md border bg-background px-2 text-sm"
          value={r.status}
          onChange={(e) => setR({ ...r, status: e.target.value as StatusEtapa })}
        >
          <option value="PENDENTE">Pendente</option>
          <option value="EM_ANDAMENTO">Em andamento</option>
          <option value="FEITO">Feito</option>
          <option value="NAO_SE_APLICA">Não se aplica</option>
        </select>
      </div>
      <div className="mt-3 grid gap-2 pl-10 md:grid-cols-[1fr_150px_1.4fr_auto]">
        <Input
          className="h-9 text-sm"
          placeholder={
            etapa.id === "DUE"
              ? "Nº da DU-E"
              : etapa.id === "NFE"
                ? "Chave/nº da NF-e"
                : etapa.id === "TRANSPORTE"
                  ? "Nº do CRT / MIC-DTA"
                  : etapa.id === "ORIGEM"
                    ? "Nº do certificado (COD) ou da declaração"
                    : "Número / referência"
          }
          value={r.numero ?? ""}
          onChange={(e) => setR({ ...r, numero: e.target.value })}
        />
        <Input
          type="date"
          className="h-9 text-sm"
          value={r.data ?? ""}
          onChange={(e) => setR({ ...r, data: e.target.value })}
        />
        <Textarea
          rows={1}
          className="min-h-9 text-sm"
          placeholder="Nota interna"
          value={r.nota ?? ""}
          onChange={(e) => setR({ ...r, nota: e.target.value })}
        />
        <Button size="sm" className="h-9" onClick={() => salvar()} disabled={salvando}>
          {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 pl-10 text-xs">
        {arquivos.map((a) => (
          <span
            key={a.id}
            className="inline-flex items-center gap-1 rounded-full border bg-background px-2 py-1"
          >
            <Paperclip className="h-3 w-3" />
            <a
              href={`/api/empresas/arquivo/${a.id}`}
              target="_blank"
              rel="noreferrer"
              className="hover:underline"
            >
              {a.nome}
            </a>
            {!a.cliente && <span className="text-muted-foreground">(interno)</span>}
            <button
              aria-label="Remover"
              className="text-muted-foreground hover:text-red-600"
              onClick={async () => {
                await apagarArquivoFn({ data: { id: a.id } });
                atualizar();
              }}
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </span>
        ))}
        <Button
          size="sm"
          variant="ghost"
          className="h-7"
          disabled={enviando}
          onClick={() => arq.current?.click()}
        >
          {enviando ? (
            <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="mr-1 h-3.5 w-3.5" />
          )}
          Anexar documento
        </Button>
        <label className="flex items-center gap-1 text-muted-foreground">
          <input
            type="checkbox"
            className="h-3.5 w-3.5 accent-primary"
            checked={paraCliente}
            onChange={(e) => setParaCliente(e.target.checked)}
          />
          o cliente vê
        </label>
        <input
          ref={arq}
          type="file"
          accept=".pdf,.xml,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) enviar(f);
            e.target.value = "";
          }}
        />
      </div>
    </li>
  );
}
