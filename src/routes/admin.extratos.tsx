// Admin → Extrato do banco: importa o extrato do mês (PDF/CSV do Nubank), classifica cada
// movimento e mostra o que vai para o MEI e para o imposto de renda.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDashed,
  FileUp,
  HelpCircle,
  Landmark,
  Loader2,
  ReceiptText,
  Trash2,
} from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  apagarArquivoExtratoFn,
  classificarMovimentoFn,
  importarExtratoFn,
  painelExtratoFn,
} from "@/lib/extratos";
import { CATEGORIAS, categoriasDo, type Categoria } from "@/lib/extrato-categorias";

export const Route = createFileRoute("/admin/extratos")({ component: PaginaExtratos });

type Painel = Awaited<ReturnType<typeof painelExtratoFn>>;

const ESTILO = `
.ext-viz{--ent:#2a78d6;--sai:#eb6834;--grade:rgba(0,0,0,.07)}
.dark .ext-viz{--ent:#3987e5;--sai:#d95926;--grade:rgba(255,255,255,.08)}
`;
const brl = (v: number) =>
  `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const nomeMes = (m: string) => MESES[Number(m.slice(5, 7)) - 1];
const dataBR = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}`;

// Texto do PDF no navegador (o mesmo pdfjs do visor de catálogos)
async function textoDoPdf(arquivo: File) {
  const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
  pdfjs.GlobalWorkerOptions.workerSrc = `/pdfjs/pdf.worker.min.js?v=${pdfjs.version}`;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) })
    .promise;
  let texto = "";
  for (let p = 1; p <= doc.numPages; p++) {
    const tc = await (await doc.getPage(p)).getTextContent();
    for (const it of tc.items as Array<{ str: string; hasEOL?: boolean }>) {
      texto += it.str;
      if (it.hasEOL) texto += "\n";
    }
    texto += "\n";
  }
  await doc.destroy();
  return texto;
}

function PaginaExtratos() {
  const qc = useQueryClient();
  const [ano, setAno] = useState(() => new Date().getFullYear());
  const [mes, setMes] = useState<string | null>(null);
  const [importando, setImportando] = useState<string | null>(null);
  const entrada = useRef<HTMLInputElement>(null);
  const { data, isLoading, error } = useQuery({
    queryKey: ["extrato", ano, mes],
    queryFn: () => painelExtratoFn({ data: { ano, mes } }),
  });

  const importar = async (arquivos: FileList | null) => {
    if (!arquivos?.length) return;
    try {
      for (const f of Array.from(arquivos)) {
        setImportando(f.name);
        const csv = /\.csv$/i.test(f.name);
        const texto = csv ? await f.text() : await textoDoPdf(f);
        const r = await importarExtratoFn({
          data: { nome: f.name, formato: csv ? "csv" : "pdf", texto },
        });
        const mesNome = `${nomeMes(r.inicio)}/${r.inicio.slice(0, 4)}`;
        if (r.conferido === false)
          toast.warning(
            `${mesNome}: os totais não bateram com os do banco (lido ${brl(r.entradas)} de entrada). Me avise.`,
          );
        else
          toast.success(
            `${mesNome}: ${r.movimentos} movimentos (${r.novos} novos)${r.conferido ? " · conferido com o banco ✔" : ""}`,
          );
      }
      qc.invalidateQueries({ queryKey: ["extrato"] });
      qc.invalidateQueries({ queryKey: ["fiscal-extrato"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setImportando(null);
      if (entrada.current) entrada.current.value = "";
    }
  };

  return (
    <div className="ext-viz space-y-6">
      <style>{ESTILO}</style>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ReceiptText className="h-6 w-6 text-primary" /> Extrato do banco
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Todo mês, importe o extrato da conta. Cada entrada e saída ganha um nome (venda, doação,
            serviço, gasto pessoal…) e o painel separa o que vai para o MEI e para o imposto de
            renda. Ver também{" "}
            <Link to="/admin/fiscal" className="font-semibold text-primary hover:underline">
              Fiscal do MEI
            </Link>
            .
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Ano anterior"
              onClick={() => (setAno(ano - 1), setMes(null))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2 text-sm font-semibold">{ano}</span>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Próximo ano"
              disabled={ano >= new Date().getFullYear()}
              onClick={() => (setAno(ano + 1), setMes(null))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <input
            ref={entrada}
            type="file"
            accept=".pdf,.csv,application/pdf,text/csv"
            multiple
            className="hidden"
            onChange={(e) => importar(e.target.files)}
          />
          <Button onClick={() => entrada.current?.click()} disabled={!!importando}>
            {importando ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <FileUp className="mr-1.5 h-4 w-4" />
            )}
            {importando ? `Lendo ${importando.slice(0, 24)}…` : "Importar extrato"}
          </Button>
        </div>
      </header>

      {isLoading && (
        <div className="flex justify-center p-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}
      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

      {data && (
        <>
          {!data.arquivos.length && <ComoExportar />}
          <Meses d={data} mes={mes} escolher={setMes} />
          <Cartoes d={data} />
          <div className="grid gap-4 xl:grid-cols-5">
            <div className="xl:col-span-3">
              <Grafico d={data} escolher={setMes} />
            </div>
            <div className="xl:col-span-2">
              <PorCategoria d={data} />
            </div>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <ImpostoRenda d={data} />
            <ParaOMei d={data} />
          </div>
          <Movimentos d={data} mes={mes} escolher={setMes} />
          <Arquivos d={data} />
          {!!data.arquivos.length && <ComoExportar fechado />}
        </>
      )}
    </div>
  );
}

function ComoExportar({ fechado }: { fechado?: boolean }) {
  return (
    <Card className="p-5">
      <details open={!fechado}>
        <summary className="flex cursor-pointer items-center gap-2 font-semibold">
          <HelpCircle className="h-4 w-4 text-primary" /> Como pegar o extrato do Nubank
        </summary>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
          <li>No app do Nubank, abra a conta (toque no saldo) e peça o extrato do mês.</li>
          <li>
            Escolha o período de um mês (dia 1 até o último dia) e o formato <b>PDF</b>. O arquivo
            vem com nome tipo <code>NU_…_01OUT2026_31OUT2026.pdf</code>.
          </li>
          <li>
            Aqui, clique em <b>Importar extrato</b> e escolha o arquivo. Pode mandar vários meses de
            uma vez. Importar o mesmo mês de novo não duplica nada.
          </li>
          <li>
            O painel confere a leitura com os totais que o banco imprime no PDF. Depois, dê nome ao
            que ficar <b>a classificar</b>: com «lembrar», o mesmo nome se classifica sozinho nos
            próximos meses.
          </li>
        </ol>
        <p className="mt-3 text-xs text-muted-foreground">
          O extrato fica só no banco de dados do site, visível apenas para administradores.
        </p>
      </details>
    </Card>
  );
}

function Meses({
  d,
  mes,
  escolher,
}: {
  d: Painel;
  mes: string | null;
  escolher: (m: string | null) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <button
        type="button"
        onClick={() => escolher(null)}
        className={cn(
          "rounded-full border px-3 py-1 text-xs font-semibold",
          !mes && "border-primary bg-primary text-primary-foreground",
        )}
      >
        Ano todo
      </button>
      {d.meses.map((m) => (
        <button
          key={m.mes}
          type="button"
          disabled={m.futuro}
          onClick={() => escolher(m.mes)}
          title={
            m.importado ? "Extrato importado" : m.futuro ? "Ainda não chegou" : "Falta importar"
          }
          className={cn(
            "flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold capitalize disabled:opacity-40",
            mes === m.mes && "border-primary bg-primary text-primary-foreground",
            mes !== m.mes && d.faltando.includes(m.mes) && "border-amber-400 text-amber-800",
          )}
        >
          {m.importado ? (
            <CheckCircle2 className="h-3 w-3" />
          ) : (
            !m.futuro && <CircleDashed className="h-3 w-3" />
          )}
          {nomeMes(m.mes)}
        </button>
      ))}
    </div>
  );
}

function Cartao({
  titulo,
  valor,
  sub,
  alerta,
}: {
  titulo: string;
  valor: string;
  sub: React.ReactNode;
  alerta?: boolean;
}) {
  return (
    <Card className={cn("p-4", alerta && "border-amber-400 bg-amber-50/60 dark:bg-amber-950/30")}>
      <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{titulo}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{valor}</p>
      <p className="mt-1 text-xs text-muted-foreground">{sub}</p>
    </Card>
  );
}

function Cartoes({ d }: { d: Painel }) {
  const t = d.totais;
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Cartao
        titulo={`Entrou em ${d.ano}`}
        valor={brl(t.entradas)}
        sub={`Saiu ${brl(t.saidas)} · sobrou ${brl(t.entradas - t.saidas)}`}
      />
      <Cartao
        titulo="Vendas que passaram pelo banco"
        valor={brl(d.mei.vendasNoBanco)}
        sub={
          d.mei.vendasSemLancar.length
            ? `${d.mei.vendasSemLancar.length} ainda sem lançar em Vendas`
            : "Todas lançadas em Vendas ✔"
        }
        alerta={!!d.mei.vendasSemLancar.length}
      />
      <Cartao
        titulo={`Renda como pessoa física`}
        valor={brl(d.ir.totalServicoPF)}
        sub={`Vai para o imposto de renda de ${d.ano + 1}`}
      />
      <Cartao
        titulo="A classificar"
        valor={String(t.aClassificar)}
        sub={
          d.faltando.length
            ? `Falta importar: ${d.faltando.map(nomeMes).join(", ")}`
            : t.aClassificar
              ? "Movimentos sem nome: classifique abaixo"
              : "Tudo classificado ✔"
        }
        alerta={!!t.aClassificar || !!d.faltando.length}
      />
    </div>
  );
}

function Dica({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-background px-3 py-2 text-xs shadow">
      <p className="mb-1 font-semibold capitalize">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <b className="tabular-nums">{brl(p.value)}</b>
        </p>
      ))}
    </div>
  );
}

function Grafico({ d, escolher }: { d: Painel; escolher: (m: string) => void }) {
  const dados = d.meses
    .filter((m) => !m.futuro)
    .map((m) => ({ mes: m.mes, nome: nomeMes(m.mes), entradas: m.entradas, saidas: m.saidas }));
  return (
    <Card className="p-5">
      <h2 className="font-semibold">Entrou e saiu, mês a mês</h2>
      <p className="mb-3 flex gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded" style={{ background: "var(--ent)" }} /> Entradas
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2 w-3 rounded" style={{ background: "var(--sai)" }} /> Saídas
        </span>
        <span>Clique num mês para ver os movimentos.</span>
      </p>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={dados}
            barGap={2}
            onClick={(e: any) => e?.activePayload?.[0] && escolher(e.activePayload[0].payload.mes)}
          >
            <CartesianGrid vertical={false} stroke="var(--grade)" />
            <XAxis dataKey="nome" tickLine={false} axisLine={false} fontSize={12} />
            <YAxis
              tickLine={false}
              axisLine={false}
              fontSize={11}
              width={56}
              tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)} mil` : String(v))}
            />
            <Tooltip content={<Dica />} cursor={{ fill: "var(--grade)" }} />
            <Bar dataKey="entradas" name="Entradas" fill="var(--ent)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="saidas" name="Saídas" fill="var(--sai)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function PorCategoria({ d }: { d: Painel }) {
  return (
    <Card className="h-full overflow-hidden p-0">
      <h2 className="border-b p-3 font-semibold">O que foi cada real, no ano</h2>
      <div className="max-h-72 overflow-y-auto">
        <table className="w-full text-sm">
          <tbody>
            {!d.categorias.length && (
              <tr>
                <td className="p-4 text-center text-muted-foreground">Nenhum extrato ainda.</td>
              </tr>
            )}
            {d.categorias.map((c) => (
              <tr key={c.categoria} className="border-t" title={c.efeito}>
                <td className="p-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      CATEGORIAS[c.categoria as Categoria]?.cor,
                    )}
                  >
                    {c.nome}
                  </span>
                  <span className="ml-1 text-xs text-muted-foreground">{c.qtd}×</span>
                </td>
                <td className="whitespace-nowrap p-2 text-right tabular-nums text-sky-700 dark:text-sky-400">
                  {c.entradas ? `+${brl(c.entradas)}` : ""}
                </td>
                <td className="whitespace-nowrap p-2 text-right tabular-nums text-orange-700 dark:text-orange-400">
                  {c.saidas ? `−${brl(c.saidas)}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Pessoas({
  titulo,
  onde,
  lista,
  total,
}: {
  titulo: string;
  onde: string;
  lista: Painel["ir"]["servicoPF"];
  total: number;
}) {
  if (!lista.length) return null;
  return (
    <div className="rounded-lg border p-3">
      <p className="flex items-baseline justify-between gap-2 font-semibold">
        {titulo} <span className="tabular-nums">{brl(total)}</span>
      </p>
      <p className="text-xs text-muted-foreground">{onde}</p>
      <ul className="mt-2 space-y-1 text-sm">
        {lista.map((p) => (
          <li key={p.nome} className="flex justify-between gap-2">
            <span className="min-w-0">
              {p.nome}
              {p.documento && (
                <span className="ml-1 font-mono text-xs text-muted-foreground">{p.documento}</span>
              )}
              <span className="ml-1 text-xs capitalize text-muted-foreground">
                ({p.meses.map(nomeMes).join(", ")})
              </span>
            </span>
            <span className="shrink-0 tabular-nums">{brl(p.total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ImpostoRenda({ d }: { d: Painel }) {
  const nada =
    !d.ir.servicoPF.length &&
    !d.ir.doacoesRecebidas.length &&
    !d.ir.doacoesFeitas.length &&
    !d.ir.emprestimos.length;
  return (
    <Card className="space-y-3 p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <Landmark className="h-4 w-4 text-primary" /> Para o imposto de renda de {d.ano + 1}
      </h2>
      <p className="text-sm text-muted-foreground">
        O que o extrato de {d.ano} mostra e onde entra na declaração (abril de {d.ano + 1}). O lucro
        do MEI aparece no painel Fiscal.
      </p>
      {nada && (
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          Nada por enquanto. Classifique os movimentos como «Serviço como pessoa física», «Doação
          recebida», «Ajuda à família» ou «Empréstimo» e eles aparecem aqui.
        </p>
      )}
      <Pessoas
        titulo="Serviços que você fez como pessoa física"
        onde="Rendimentos tributáveis recebidos de pessoa física, no mês em que recebeu. Abaixo de R$ 60 mil no ano, o imposto costuma dar zero."
        lista={d.ir.servicoPF}
        total={d.ir.totalServicoPF}
      />
      {!!d.ir.servicoPorMes.length && (
        <p className="text-xs text-muted-foreground">
          Por mês: {d.ir.servicoPorMes.map((m) => `${nomeMes(m.mes)} ${brl(m.valor)}`).join(" · ")}.
          Guarde os comprovantes e, se der, um recibo assinado.
        </p>
      )}
      <Pessoas
        titulo="Doações recebidas"
        onde="Rendimentos isentos → doações, com o CPF de quem doou. Quem doou também declara."
        lista={d.ir.doacoesRecebidas}
        total={d.ir.totalDoacoes}
      />
      <Pessoas
        titulo="Ajuda que você deu à família"
        onde="Doações efetuadas (em dinheiro), com o CPF de quem recebeu."
        lista={d.ir.doacoesFeitas}
        total={d.ir.totalDoacoesFeitas}
      />
      <Pessoas
        titulo="Empréstimos recebidos"
        onde="Não é renda. Se a dívida passar de R$ 5 mil no fim do ano, declare em Dívidas e ônus."
        lista={d.ir.emprestimos}
        total={d.ir.emprestimos.reduce((s, p) => s + p.total, 0)}
      />
      <p className="text-xs text-muted-foreground">
        Isto é um resumo para organizar, não substitui um contador. Na dúvida, a Sala do
        Empreendedor ou o plantão fiscal da Receita atendem de graça.
      </p>
    </Card>
  );
}

function ParaOMei({ d }: { d: Painel }) {
  return (
    <Card className="space-y-3 p-5">
      <h2 className="font-semibold">Para o MEI (CNPJ)</h2>
      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Vendas no banco</p>
          <p className="font-bold tabular-nums">{brl(d.mei.vendasNoBanco)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Compra de peças</p>
          <p className="font-bold tabular-nums">{brl(d.mei.fornecedores)}</p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-xs text-muted-foreground">Despesas da loja</p>
          <p className="font-bold tabular-nums">{brl(d.mei.despesasLoja)}</p>
        </div>
      </div>
      {d.mei.vendasSemLancar.length ? (
        <div className="rounded-lg border border-amber-400 bg-amber-50/60 p-3 dark:bg-amber-950/30">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-600" /> Vendas que entraram no banco e não
            estão em Vendas
          </p>
          <p className="text-xs text-muted-foreground">
            Lance cada uma (com a data e o custo) para o limite do MEI ficar certo. Quando o valor e
            a data baterem, o painel liga sozinho.
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {d.mei.vendasSemLancar.map((v) => (
              <li key={v.id} className="flex justify-between gap-2">
                <span>
                  {dataBR(v.data)} · {v.contraparte}
                </span>
                <span className="tabular-nums">{brl(v.valor)}</span>
              </li>
            ))}
          </ul>
          <Link to="/admin/vendas">
            <Button size="sm" variant="outline" className="mt-2">
              Abrir Vendas
            </Button>
          </Link>
        </div>
      ) : (
        <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4" /> Toda venda que passou pelo banco está lançada.
        </p>
      )}
      <p className="text-xs text-muted-foreground">
        Venda paga em dinheiro não aparece no extrato: lance direto em Vendas.
      </p>
    </Card>
  );
}

function Movimentos({
  d,
  mes,
  escolher,
}: {
  d: Painel;
  mes: string | null;
  escolher: (m: string | null) => void;
}) {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState<"todos" | "pendentes" | "entradas" | "saidas">(
    d.totais.aClassificar ? "pendentes" : "todos",
  );
  const [busca, setBusca] = useState("");
  const [lembrar, setLembrar] = useState(true);
  const [salvando, setSalvando] = useState<number | null>(null);
  const lista = d.movimentos
    .filter((m) =>
      filtro === "pendentes"
        ? m.categoria === "A_CLASSIFICAR"
        : filtro === "entradas"
          ? m.valor > 0
          : filtro === "saidas"
            ? m.valor < 0
            : true,
    )
    .filter((m) => !busca || m.contraparte.toLowerCase().includes(busca.toLowerCase()));
  const mostrar = lista.slice(0, 400);

  const mudar = async (id: number, categoria: string, nota?: string | null) => {
    setSalvando(id);
    try {
      const r = await classificarMovimentoFn({
        data: { id, categoria, lembrar: nota === undefined && lembrar, nota },
      });
      if (r.outros) toast.success(`E mais ${r.outros} do mesmo nome`);
      qc.invalidateQueries({ queryKey: ["extrato"] });
      qc.invalidateQueries({ queryKey: ["fiscal-extrato"] });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSalvando(null);
    }
  };

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center gap-2 border-b p-3">
        <h2 className="mr-auto font-semibold">
          Movimentos{" "}
          <span className="text-sm font-normal capitalize text-muted-foreground">
            {mes ? `de ${nomeMes(mes)}` : `de ${d.ano}`}
          </span>
          {mes && (
            <button
              type="button"
              className="ml-2 text-xs text-primary hover:underline"
              onClick={() => escolher(null)}
            >
              ver o ano todo
            </button>
          )}
        </h2>
        <div className="flex rounded-md border p-0.5 text-xs">
          {(
            [
              [
                "pendentes",
                `A classificar (${d.movimentos.filter((m) => m.categoria === "A_CLASSIFICAR").length})`,
              ],
              ["todos", "Todos"],
              ["entradas", "Entradas"],
              ["saidas", "Saídas"],
            ] as const
          ).map(([k, nome]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFiltro(k)}
              className={cn(
                "rounded px-2.5 py-1",
                filtro === k ? "bg-primary text-primary-foreground" : "text-muted-foreground",
              )}
            >
              {nome}
            </button>
          ))}
        </div>
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar nome…"
          className="h-8 w-40"
        />
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={lembrar} onCheckedChange={setLembrar} />
          Lembrar para o mesmo nome
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="p-2">Dia</th>
              <th className="p-2">Quem</th>
              <th className="p-2 text-right">Valor</th>
              <th className="p-2">O que foi</th>
              <th className="p-2">Anotação</th>
            </tr>
          </thead>
          <tbody>
            {!mostrar.length && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-muted-foreground">
                  {filtro === "pendentes" ? "Nada a classificar ✔" : "Nenhum movimento."}
                </td>
              </tr>
            )}
            {mostrar.map((m) => (
              <tr key={m.id} className="border-t align-top">
                <td className="whitespace-nowrap p-2 tabular-nums">{dataBR(m.data)}</td>
                <td className="min-w-48 p-2">
                  <p className="font-medium">{m.contraparte}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.tipo}
                    {m.documento && <span className="ml-1 font-mono">{m.documento}</span>}
                  </p>
                </td>
                <td
                  className={cn(
                    "whitespace-nowrap p-2 text-right font-semibold tabular-nums",
                    m.valor > 0 ? "text-sky-700 dark:text-sky-400" : "",
                  )}
                >
                  <span className="inline-flex items-center gap-1">
                    {m.valor > 0 ? (
                      <ArrowDownLeft className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    {brl(Math.abs(m.valor))}
                  </span>
                </td>
                <td className="p-2">
                  <div className="flex items-center gap-1.5">
                    <select
                      aria-label="O que foi"
                      className={cn(
                        "h-8 rounded-md border px-1.5 text-xs font-semibold",
                        CATEGORIAS[m.categoria as Categoria]?.cor,
                      )}
                      value={m.categoria}
                      disabled={salvando === m.id}
                      onChange={(e) => mudar(m.id, e.target.value)}
                      title={CATEGORIAS[m.categoria as Categoria]?.efeito}
                    >
                      {categoriasDo(m.valor).map((c) => (
                        <option key={c} value={c}>
                          {CATEGORIAS[c].nome}
                        </option>
                      ))}
                    </select>
                    {salvando === m.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  </div>
                  {m.categoria === "VENDA" && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {m.venda_id ? "Ligada à venda lançada ✔" : "Falta lançar em Vendas"}
                    </p>
                  )}
                </td>
                <td className="p-2">
                  <Input
                    defaultValue={m.nota ?? ""}
                    placeholder="ex.: conserto do trator"
                    className="h-8 min-w-40 text-xs"
                    onBlur={(e) =>
                      e.target.value !== (m.nota ?? "") && mudar(m.id, m.categoria, e.target.value)
                    }
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {lista.length > mostrar.length && (
        <p className="border-t p-2 text-center text-xs text-muted-foreground">
          Mostrando 400 de {lista.length}. Escolha um mês para ver todos.
        </p>
      )}
    </Card>
  );
}

function Arquivos({ d }: { d: Painel }) {
  const qc = useQueryClient();
  if (!d.arquivos.length) return null;
  return (
    <Card className="overflow-hidden p-0">
      <h2 className="border-b p-3 font-semibold">Extratos importados</h2>
      <table className="w-full text-sm">
        <tbody>
          {d.arquivos.map((a) => (
            <tr key={a.id} className="border-t">
              <td className="p-2">
                <p className="font-medium">
                  {a.banco} · {dataBR(a.inicio)} a {dataBR(a.fim)}/{a.fim.slice(0, 4)}
                </p>
                <p className="text-xs text-muted-foreground">{a.nome}</p>
              </td>
              <td className="p-2 text-xs tabular-nums text-muted-foreground">
                {a.movimentos} mov. · +{brl(a.entradas)} · −{brl(a.saidas)}
              </td>
              <td className="p-2 text-xs">
                {a.conferido === true ? (
                  <span className="text-emerald-700 dark:text-emerald-400">Bate com o banco ✔</span>
                ) : a.conferido === false ? (
                  <span className="text-red-600">Não bateu com o banco</span>
                ) : (
                  <span className="text-muted-foreground">Sem total para conferir (CSV)</span>
                )}
              </td>
              <td className="p-2 text-right">
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Apagar extrato"
                  onClick={async () => {
                    if (!confirm("Apagar este extrato e as classificações dele?")) return;
                    await apagarArquivoExtratoFn({ data: { id: a.id } });
                    qc.invalidateQueries({ queryKey: ["extrato"] });
                  }}
                >
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
