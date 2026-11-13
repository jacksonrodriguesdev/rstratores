import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Wallet, Gift, Clock, ShoppingCart, Percent, PiggyBank, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { painelCarteiraFn, salvarCarteiraFn } from "@/lib/carteira";

export const Route = createFileRoute("/admin/carteira")({
  component: CarteiraAdmin,
});

const peso = (n: number) => "$" + n.toLocaleString("es-UY");

// Admin → Carteira de clientes: liga a campanha de crédito, define valor/validade/regras
// e mostra o resumo (emitido, resgatado, em aberto). O débito acontece na Nova Venda.
function CarteiraAdmin() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ["carteira-admin"], queryFn: () => painelCarteiraFn() });
  const [cfg, setCfg] = useState<NonNullable<typeof data>["config"] | null>(null);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => {
    if (data && !cfg) setCfg(data.config);
  }, [data]); // eslint-disable-line react-hooks/exhaustive-deps

  const salvar = async () => {
    if (!cfg) return;
    setSalvando(true);
    try {
      await salvarCarteiraFn({ data: cfg });
      await qc.invalidateQueries({ queryKey: ["carteira-admin"] });
      toast.success("Carteira salva.");
    } catch {
      toast.error("Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  };

  const r = data?.resumo;
  const num = (k: keyof NonNullable<typeof cfg>, v: string) =>
    cfg && setCfg({ ...cfg, [k]: Math.max(0, Math.round(Number(v) || 0)) });

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4">
      <div className="flex items-center gap-2">
        <Wallet className="h-6 w-6 text-emerald-600" />
        <h1 className="text-2xl font-bold">Carteira de clientes</h1>
      </div>
      <p className="text-sm text-muted-foreground">
        Crédito de bônus que o cliente ganha ao criar a conta e usa como desconto na{" "}
        <strong>Nova Venda</strong>. Ligue aqui para ativar a campanha de captação.
      </p>

      {/* Resumo */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { icon: Gift, label: "Emitido", v: r?.emitido ?? 0 },
          { icon: ShoppingCart, label: "Resgatado", v: r?.resgatado ?? 0 },
          { icon: Clock, label: "Expirado", v: r?.expirado ?? 0 },
          { icon: PiggyBank, label: "Em aberto", v: r?.emAberto ?? 0 },
        ].map((c) => (
          <Card key={c.label} className="p-4">
            <c.icon className="mb-1 h-4 w-4 text-muted-foreground" />
            <div className="text-xs text-muted-foreground">{c.label}</div>
            <div className="text-lg font-bold">{peso(c.v)}</div>
          </Card>
        ))}
      </div>
      {r && (
        <p className="text-xs text-muted-foreground">
          {r.contasComSaldo.toLocaleString("pt-BR")} contas com saldo · emitido este mês:{" "}
          {peso(r.emitidoMes)}
        </p>
      )}

      {/* Configuração */}
      {cfg && (
        <Card className="space-y-5 p-5">
          <label className="flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold">Campanha ativa</div>
              <div className="text-xs text-muted-foreground">
                Quando ligada, toda conta nova ganha o bônus de boas-vindas.
              </div>
            </div>
            <Switch checked={cfg.ativo} onCheckedChange={(v) => setCfg({ ...cfg, ativo: v })} />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              icon={Gift}
              label="Bônus de boas-vindas (UYU)"
              dica="Crédito dado ao criar a conta."
              value={cfg.valorBoasVindas}
              onChange={(v) => num("valorBoasVindas", v)}
            />
            <Campo
              icon={Clock}
              label="Validade (dias)"
              dica="Depois disso o crédito expira (cria urgência)."
              value={cfg.validadeDias}
              onChange={(v) => num("validadeDias", v)}
            />
            <Campo
              icon={ShoppingCart}
              label="Compra mínima (UYU)"
              dica="Pedido abaixo disso não pode usar crédito."
              value={cfg.minCompra}
              onChange={(v) => num("minCompra", v)}
            />
            <Campo
              icon={Percent}
              label="Cobre até (% do pedido)"
              dica="Teto do desconto por venda."
              value={cfg.tetoPct}
              onChange={(v) => num("tetoPct", v)}
            />
            <Campo
              icon={PiggyBank}
              label="Orçamento do mês (UYU)"
              dica="0 = sem limite. Ao atingir, para de emitir."
              value={cfg.orcamentoMes}
              onChange={(v) => num("orcamentoMes", v)}
            />
          </div>

          <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-900">
            Exemplo: bônus {peso(cfg.valorBoasVindas)}, válido {cfg.validadeDias} dias, compra
            mínima {peso(cfg.minCompra)}, cobre até {cfg.tetoPct}% do pedido. Numa venda de{" "}
            {peso(Math.max(cfg.minCompra, 3000))} o cliente usa no máx.{" "}
            {peso(
              Math.min(
                cfg.valorBoasVindas,
                Math.floor((Math.max(cfg.minCompra, 3000) * cfg.tetoPct) / 100),
              ),
            )}
            .
          </div>

          <Button onClick={salvar} disabled={salvando} className="w-full">
            {salvando ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar
          </Button>
        </Card>
      )}
    </div>
  );
}

function Campo({
  icon: Icon,
  label,
  dica,
  value,
  onChange,
}: {
  icon: typeof Gift;
  label: string;
  dica: string;
  value: number;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block space-y-1">
      <span className="flex items-center gap-1.5 text-sm font-medium">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
      </span>
      <Input type="number" min={0} value={value} onChange={(e) => onChange(e.target.value)} />
      <span className="text-xs text-muted-foreground">{dica}</span>
    </label>
  );
}
