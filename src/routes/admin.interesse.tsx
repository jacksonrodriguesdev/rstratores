import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MessageCircle, Search, SearchX, ShoppingCart, Eye, Flame, ExternalLink } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from "recharts";
import { Card } from "@/components/ui/card";
import { getInteresseFn } from "@/lib/interesse";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/interesse")({
  component: InteressePage,
});

const PERIODOS = [7, 30, 90];

// O que os clientes procuram: peças mais pedidas no WhatsApp e o que buscam no site.
// As buscas sem resultado mostram peças que faltam no catálogo (oportunidade de venda).
function InteressePage() {
  const [dias, setDias] = useState(30);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["interesse", dias],
    queryFn: () => getInteresseFn({ data: dias }),
  });

  const cards = [
    { label: "Visitas", value: data?.visitas, icon: Eye, cor: "text-sky-600 bg-sky-50" },
    { label: "Cliques no WhatsApp", value: data?.cliquesWhatsapp, icon: MessageCircle, cor: "text-[#128C4B] bg-[#25D366]/10" },
    { label: "Cotações do carrinho", value: data?.cotacoesCarrinho, icon: ShoppingCart, cor: "text-primary bg-primary/10" },
    { label: "Buscas no site", value: data?.buscas, icon: Search, cor: "text-amber-700 bg-amber-50" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Flame className="h-6 w-6 text-primary" /> Interesse dos clientes
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Quais peças os clientes pedem no WhatsApp e o que procuram no site. As buscas{" "}
            <strong>sem resultado</strong> são peças que o cliente queria e não encontrou: vale cadastrar ou
            conseguir com o fornecedor.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          {PERIODOS.map((d) => (
            <button
              key={d}
              onClick={() => setDias(d)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium transition",
                dias === d ? "bg-primary text-primary-foreground" : "hover:bg-muted",
              )}
            >
              {d} dias
            </button>
          ))}
        </div>
      </div>

      {isError && <Card className="p-4 text-sm text-destructive">Não foi possível carregar os dados.</Card>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label} className="flex items-center gap-3 p-4">
            <span className={cn("flex h-10 w-10 items-center justify-center rounded-full", c.cor)}>
              <c.icon className="h-5 w-5" />
            </span>
            <div>
              <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{c.label}</div>
              <div className="text-2xl font-bold">{isLoading ? "…" : (c.value ?? 0).toLocaleString("pt-BR")}</div>
            </div>
          </Card>
        ))}
      </div>

      {data && data.porDia.length > 0 && (
        <Card className="p-4">
          <h2 className="mb-3 font-semibold">Por dia</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.porDia.map((d) => ({ ...d, dia: d.dia.slice(5).split("-").reverse().join("/") }))}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="dia" fontSize={11} />
                <YAxis allowDecimals={false} fontSize={11} width={30} />
                <Tooltip />
                <Legend />
                <Bar dataKey="whatsapp" name="WhatsApp" fill="#25D366" radius={[4, 4, 0, 0]} />
                <Bar dataKey="buscas" name="Buscas" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <h2 className="mb-1 flex items-center gap-2 font-semibold">
            <MessageCircle className="h-4 w-4 text-[#128C4B]" /> Peças mais pedidas no WhatsApp
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">Cliques em “Consultar precio” e cotações do carrinho.</p>
          {data?.pecas.length ? (
            <ol className="divide-y text-sm">
              {data.pecas.map((p, i) => (
                <li key={p.sku} className="flex items-center gap-3 py-2">
                  <span className="w-5 text-right text-xs text-muted-foreground">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{p.nome}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {p.sku} · no site: {p.nomeEs}
                    </div>
                  </div>
                  <span className="rounded-full bg-[#25D366]/10 px-2 py-0.5 text-xs font-bold text-[#128C4B]">
                    {p.cliques}
                  </span>
                  <a
                    href={`/produto/${encodeURIComponent(p.sku)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-muted-foreground hover:text-primary"
                    aria-label="Abrir no site"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </li>
              ))}
            </ol>
          ) : (
            <Vazio carregando={isLoading} texto="Nenhum clique no WhatsApp neste período." />
          )}
        </Card>

        <Card className="p-4">
          <h2 className="mb-1 flex items-center gap-2 font-semibold">
            <SearchX className="h-4 w-4 text-destructive" /> Buscas sem resultado
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">
            O cliente procurou e não achou nada. Cadastre a peça ou ajuste o nome de uma existente.
          </p>
          {data?.semResultado.length ? (
            <ul className="divide-y text-sm">
              {data.semResultado.map((t) => (
                <li key={t.termo} className="flex items-center justify-between gap-3 py-2">
                  <span className="truncate font-medium">{t.termo}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">{t.vezes}×</span>
                </li>
              ))}
            </ul>
          ) : (
            <Vazio carregando={isLoading} texto="Nenhuma busca sem resultado neste período." />
          )}
        </Card>

        <Card className="p-4 lg:col-span-2">
          <h2 className="mb-3 flex items-center gap-2 font-semibold">
            <Search className="h-4 w-4 text-amber-600" /> Mais buscados
          </h2>
          {data?.termos.length ? (
            <div className="flex flex-wrap gap-2">
              {data.termos.map((t) => (
                <Link
                  key={t.termo}
                  to="/loja"
                  search={{ q: t.termo } as never}
                  target="_blank"
                  className="rounded-full border bg-muted/40 px-3 py-1 text-sm hover:border-primary hover:text-primary"
                >
                  {t.termo} <span className="text-xs text-muted-foreground">· {t.vezes}× · {t.resultados} peças</span>
                </Link>
              ))}
            </div>
          ) : (
            <Vazio carregando={isLoading} texto="Nenhuma busca neste período." />
          )}
        </Card>
      </div>
    </div>
  );
}

function Vazio({ carregando, texto }: { carregando: boolean; texto: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{carregando ? "Carregando…" : texto}</p>;
}
