// Admin → Campanhas e cupons → Indicações: liga/desliga o «Indique e ganhe», percentuais do amigo
// e do prêmio, validade do prêmio, e quem mais indica (visitas pelo link e amigos que compraram).
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Gift, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { painelIndicacoesFn, salvarConfigIndicacaoFn } from "@/lib/indicacoes";

export function AbaIndicacoes() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["painel-indicacoes"],
    queryFn: () => painelIndicacoesFn(),
  });
  const [f, setF] = useState({ ativo: true, amigoPct: "10", premioPct: "10", validadeDias: "90" });
  const [salvando, setSalvando] = useState(false);
  useEffect(() => {
    if (data)
      setF({
        ativo: data.config.ativo,
        amigoPct: String(data.config.amigoPct),
        premioPct: String(data.config.premioPct),
        validadeDias: String(data.config.validadeDias),
      });
  }, [data]);

  const salvar = async () => {
    setSalvando(true);
    try {
      await salvarConfigIndicacaoFn({
        data: {
          ativo: f.ativo,
          amigoPct: Number(f.amigoPct),
          premioPct: Number(f.premioPct),
          validadeDias: Number(f.validadeDias),
        },
      });
      toast.success("Indicação salva (vale também para os códigos que já existem)");
      qc.invalidateQueries({ queryKey: ["painel-indicacoes"] });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSalvando(false);
    }
  };

  if (isLoading)
    return (
      <p className="flex items-center gap-2 text-sm text-zinc-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando…
      </p>
    );
  if (!data) return null;
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-white p-5">
        <h2 className="flex items-center gap-2 text-lg font-extrabold">
          <Gift className="h-5 w-5 text-primary" /> Indique e ganhe
        </h2>
        <p className="text-sm text-zinc-500">
          Cada cliente tem um código na conta («Recomendá y ganá»). O amigo ganha um desconto na
          primeira compra; quando o link de pagamento com esse código é pago, quem indicou ganha um
          cupom de prêmio por e-mail.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-4">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={f.ativo}
              onChange={(e) => setF({ ...f, ativo: e.target.checked })}
            />
            Indicação ligada
          </label>
          <label className="text-xs font-semibold text-zinc-500">
            Desconto do amigo (%)
            <Input
              inputMode="numeric"
              value={f.amigoPct}
              onChange={(e) => setF({ ...f, amigoPct: e.target.value })}
            />
          </label>
          <label className="text-xs font-semibold text-zinc-500">
            Prêmio de quem indica (%)
            <Input
              inputMode="numeric"
              value={f.premioPct}
              onChange={(e) => setF({ ...f, premioPct: e.target.value })}
            />
          </label>
          <label className="text-xs font-semibold text-zinc-500">
            Validade do prêmio (dias)
            <Input
              inputMode="numeric"
              value={f.validadeDias}
              onChange={(e) => setF({ ...f, validadeDias: e.target.value })}
            />
          </label>
        </div>
        <Button className="mt-4" onClick={salvar} disabled={salvando}>
          {salvando ? (
            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-1.5 h-4 w-4" />
          )}
          Salvar
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          ["Clientes com código", data.total.codigos],
          ["Visitas pelos links", data.total.cliques],
          ["Amigos que compraram", data.total.compras],
        ].map(([r, v]) => (
          <div key={String(r)} className="rounded-2xl border bg-white p-4">
            <p className="text-2xl font-black">{v}</p>
            <p className="text-xs text-zinc-500">{r}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-left text-xs uppercase text-zinc-500">
            <tr>
              <th className="p-3">Cliente</th>
              <th className="p-3">Código</th>
              <th className="p-3 text-right">Visitas</th>
              <th className="p-3 text-right">Compras</th>
              <th className="p-3">Última compra</th>
            </tr>
          </thead>
          <tbody>
            {!data.linhas.length && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-zinc-500">
                  Nenhum cliente abriu a aba «Recomendá y ganá» ainda.
                </td>
              </tr>
            )}
            {data.linhas.map((l) => (
              <tr key={l.codigo} className="border-t">
                <td className="p-3">
                  <p className="font-semibold">{l.nome}</p>
                  <p className="text-xs text-zinc-500">{l.email}</p>
                </td>
                <td className="p-3 font-mono text-xs">{l.codigo}</td>
                <td className="p-3 text-right tabular-nums">{l.cliques}</td>
                <td className="p-3 text-right font-bold tabular-nums">{l.compras}</td>
                <td className="p-3 text-xs">
                  {l.ultimo ? new Date(l.ultimo).toLocaleDateString("pt-BR") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
