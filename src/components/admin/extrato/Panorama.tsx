// Extrato do banco → Panorama do mês: cards com gráfico pequeno (12 meses), o fiscal do mês
// (DAS e limite do MEI) e dicas do que fazer.
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  Landmark,
  Lightbulb,
  PiggyBank,
  ShoppingCart,
  Store,
  User,
  Wallet,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { painelFiscalFn } from "@/lib/fiscal";
import type { painelExtratoFn } from "@/lib/extratos";
import { brl, mesLongo, nomeMes } from "@/lib/extrato-formato";
import { Mini, Variacao } from "./Mini";

type Painel = Awaited<ReturnType<typeof painelExtratoFn>>;

// Cores das séries (mesma ordem sempre)
const COR = {
  entra: "#2a78d6",
  sai: "#eb6834",
  sobra: "#0e9384",
  venda: "#16a34a",
  pessoal: "#c4329b",
  loja: "#e5a000",
  voce: "#7a5af8",
};
const LOJA = ["FORNECEDOR", "ANUNCIOS", "IMPOSTOS", "LOJA"];
const PESSOAL = ["PESSOAL", "DOACAO_FEITA"];
const PARA_VOCE = ["DOACAO", "SERVICO_PF"];

export function Panorama({ d, mes }: { d: Painel; mes: string }) {
  const { data: fiscal } = useQuery({
    queryKey: ["fiscal", d.ano],
    queryFn: () => painelFiscalFn({ data: { ano: d.ano } }),
  });
  const soma = (m: Painel["meses"][number], cats: string[]) =>
    cats.reduce((t, c) => t + (m.porCategoria[c] ?? 0), 0);
  const passados = d.meses.filter((m) => m.importado && !m.futuro);
  const media = (f: (m: Painel["meses"][number]) => number) =>
    passados.length ? passados.reduce((t, m) => t + f(m), 0) / passados.length : 0;
  const serie = (f: (m: Painel["meses"][number]) => number) =>
    d.meses
      .filter((m) => !m.futuro)
      .map((m) => ({ mes: m.mes, valor: Math.round(f(m) * 100) / 100 }));
  const atual = d.meses.find((m) => m.mes === mes)!;
  const pendentesMes = d.movimentos.filter(
    (m) => m.data.startsWith(mes) && m.categoria === "A_CLASSIFICAR",
  ).length;

  const cards = [
    {
      titulo: "Entrou",
      icone: ArrowDownLeft,
      f: (m: Painel["meses"][number]) => m.entradas,
      cor: COR.entra,
      bomSubir: true,
    },
    {
      titulo: "Saiu",
      icone: ArrowUpRight,
      f: (m: Painel["meses"][number]) => m.saidas,
      cor: COR.sai,
      bomSubir: false,
    },
    {
      titulo: "Sobrou",
      icone: PiggyBank,
      f: (m: Painel["meses"][number]) => m.entradas - m.saidas,
      cor: COR.sobra,
      bomSubir: true,
    },
    {
      titulo: "Vendas da loja (CNPJ)",
      icone: Store,
      f: (m: Painel["meses"][number]) => soma(m, ["VENDA"]),
      cor: COR.venda,
      bomSubir: true,
    },
    {
      titulo: "Gasto da loja",
      icone: ShoppingCart,
      f: (m: Painel["meses"][number]) => soma(m, LOJA),
      cor: COR.loja,
      bomSubir: false,
      sub: "Peças, anúncios, DAS e despesas",
    },
    {
      titulo: "Gasto pessoal",
      icone: Wallet,
      f: (m: Painel["meses"][number]) => soma(m, PESSOAL),
      cor: COR.pessoal,
      bomSubir: false,
      link: true,
    },
    {
      titulo: "Entrou para você",
      icone: User,
      f: (m: Painel["meses"][number]) => soma(m, PARA_VOCE),
      cor: COR.voce,
      bomSubir: true,
      sub: "Doações e serviços como pessoa física",
    },
  ];

  // Fiscal do mês
  const guia = fiscal?.das.guias.find((g) => g.competencia === mes);
  const lim = fiscal?.limite;

  // Dicas
  const dicas: Array<{ nivel: "alerta" | "dica" | "ok"; texto: string }> = [];
  if (!atual.importado)
    dicas.push({
      nivel: "alerta",
      texto: `Importe o extrato de ${mesLongo(mes)} para ver o mês completo.`,
    });
  if (pendentesMes)
    dicas.push({
      nivel: "alerta",
      texto: `${pendentesMes} movimento(s) de ${mesLongo(mes)} a classificar: os números ficam certos depois disso.`,
    });
  if (d.mei.vendasSemLancar.length)
    dicas.push({
      nivel: "alerta",
      texto: `${d.mei.vendasSemLancar.length} venda(s) que entraram no banco não estão em Vendas: lance para o limite do MEI ficar certo.`,
    });
  if (fiscal?.das.guias.some((g) => g.atrasado))
    dicas.push({
      nivel: "alerta",
      texto: "Tem DAS atrasado: pague no app MEI e marque «Já paguei» no Fiscal.",
    });
  else if (fiscal?.das.proximo)
    dicas.push({
      nivel: "dica",
      texto: `Próximo DAS: ${brl(fiscal.das.proximo.valor)} até ${fiscal.das.proximo.vence.slice(8, 10)}/${fiscal.das.proximo.vence.slice(5, 7)}.`,
    });
  if (lim && lim.pct >= 80)
    dicas.push({
      nivel: "alerta",
      texto: `O MEI já usou ${Math.round(lim.pct)}% do limite do ano. Resta ${brl(Math.max(0, lim.valor - lim.usado))}.`,
    });
  const saldo = atual.entradas - atual.saidas;
  if (atual.importado && saldo < 0)
    dicas.push({
      nivel: "alerta",
      texto: `Em ${mesLongo(mes)} saiu ${brl(-saldo)} a mais do que entrou.`,
    });
  const gp = soma(atual, PESSOAL);
  const gpMedia = media((m) => soma(m, PESSOAL));
  if (gpMedia && gp > gpMedia * 1.2)
    dicas.push({
      nivel: "dica",
      texto: `O gasto pessoal de ${mesLongo(mes)} (${brl(gp, 0)}) ficou ${Math.round((gp / gpMedia - 1) * 100)}% acima da média. Veja onde em Pessoal.`,
    });
  const pf = atual.porCategoria.SERVICO_PF ?? 0;
  if (pf)
    dicas.push({
      nivel: "dica",
      texto: `Você recebeu ${brl(pf)} como pessoa física em ${mesLongo(mes)}: guarde o comprovante, entra no imposto de renda de ${d.ano + 1}.`,
    });
  const doa = atual.porCategoria.DOACAO ?? 0;
  if (doa)
    dicas.push({
      nivel: "dica",
      texto: `${brl(doa)} de doação em ${mesLongo(mes)}: é isento, mas vai na declaração com o CPF de quem doou.`,
    });
  if (!dicas.some((x) => x.nivel === "alerta"))
    dicas.push({
      nivel: "ok",
      texto: `${mesLongo(mes)[0].toUpperCase()}${mesLongo(mes).slice(1)} em dia: tudo importado e classificado.`,
    });

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-bold">
        Panorama de <span className="capitalize">{mesLongo(mes)}</span> de {mes.slice(0, 4)}
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => {
          const v = c.f(atual);
          const conteudo = (
            <Card
              className={cn(
                "flex h-full flex-col gap-1 p-4",
                c.link && "transition hover:border-primary",
              )}
            >
              <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                <c.icone className="h-3.5 w-3.5" style={{ color: c.cor }} /> {c.titulo}
              </p>
              <p className="text-2xl font-bold tabular-nums">{brl(v)}</p>
              <Variacao valor={v} media={media(c.f)} bomSubir={c.bomSubir} />
              {c.sub && <p className="text-xs text-muted-foreground">{c.sub}</p>}
              <div className="mt-auto pt-1">
                <Mini serie={serie(c.f)} cor={c.cor} destaque={mes} />
              </div>
              {c.link && <p className="text-xs font-semibold text-primary">Ver para onde foi →</p>}
            </Card>
          );
          return c.link ? (
            <Link key={c.titulo} to="/admin/extratos/pessoal" className="block">
              {conteudo}
            </Link>
          ) : (
            <div key={c.titulo}>{conteudo}</div>
          );
        })}
        <Card className="flex flex-col gap-2 p-4">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <Landmark className="h-3.5 w-3.5 text-primary" /> Fiscal do mês
          </p>
          {!fiscal && <p className="text-sm text-muted-foreground">Carregando…</p>}
          {fiscal && (
            <>
              <p className="text-sm">
                DAS de {nomeMes(mes)}:{" "}
                {!guia ? (
                  <span className="text-muted-foreground">não se aplica</span>
                ) : guia.pagoEm ? (
                  <b className="text-emerald-700 dark:text-emerald-400">pago ✔</b>
                ) : guia.atrasado ? (
                  <b className="text-red-600">atrasado</b>
                ) : (
                  <b className="text-amber-700">
                    a pagar até {guia.vence.slice(8, 10)}/{guia.vence.slice(5, 7)}
                  </b>
                )}
              </p>
              {lim && lim.valor > 0 && (
                <div>
                  <p className="flex justify-between text-xs text-muted-foreground">
                    <span>Limite do MEI</span>
                    <span className="tabular-nums">
                      {brl(lim.usado, 0)} de {brl(lim.valor, 0)}
                    </span>
                  </p>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={cn(
                        "h-full rounded-full",
                        lim.pct >= 100
                          ? "bg-red-500"
                          : lim.pct >= 80
                            ? "bg-amber-500"
                            : "bg-emerald-500",
                      )}
                      style={{ width: `${Math.min(100, lim.pct)}%` }}
                    />
                  </div>
                </div>
              )}
              <Link to="/admin/fiscal" className="mt-auto text-xs font-semibold text-primary">
                Abrir Fiscal →
              </Link>
            </>
          )}
        </Card>
      </div>

      <Card className="p-4">
        <p className="mb-2 flex items-center gap-2 font-semibold">
          <Lightbulb className="h-4 w-4 text-amber-500" /> Dicas de {mesLongo(mes)}
        </p>
        <ul className="space-y-1.5 text-sm">
          {dicas.map((x) => (
            <li key={x.texto} className="flex gap-2">
              {x.nivel === "alerta" ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              ) : x.nivel === "ok" ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              ) : (
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
              )}
              {x.texto}
            </li>
          ))}
        </ul>
      </Card>
    </section>
  );
}
