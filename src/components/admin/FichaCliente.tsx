// Admin → Clientes → olho: ficha completa do cliente. O destaque é «Viu e não pediu»: as peças
// que ele abriu no site sem pedir preço, com a mensagem de WhatsApp pronta (tom natural, sem
// dizer que acompanhamos a navegação). Abaixo: navegação, buscas, carrinhos, compras e linha do tempo.
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  BookOpen,
  Clock,
  Eye,
  Loader2,
  Mail,
  MapPin,
  MessageCircle,
  Search,
  ShoppingCart,
  Smartphone,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { fichaClienteFn } from "@/lib/clientes";
import { cn } from "@/lib/utils";

const foto = (u: string | null) =>
  !u ? null : /^(https?:)?\//.test(u) ? u : `/uploads/${u.replace(/^\/?(uploads\/)?/, "")}`;
const quando = (s: string | null) =>
  s
    ? new Date(s).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";
const haQuanto = (s: string | null) => {
  if (!s) return "nunca";
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 86_400_000);
  return d <= 0 ? "hoje" : d === 1 ? "ontem" : `há ${d} dias`;
};
const ROTULO: Record<string, string> = {
  visita: "Página",
  whatsapp: "WhatsApp",
  busca: "Busca",
  carrinho: "Carrinho",
  cotacao: "Cotação",
  venda: "Venda",
  link: "Pagamento",
  popup: "Pop-up",
  email: "E-mail",
  clique: "Clique",
  rolagem: "Rolagem",
};

export function BotaoFichaCliente({
  id,
  nome,
  numero,
}: {
  id: number;
  nome: string;
  numero: string | null;
}) {
  const [aberto, setAberto] = useState(false);
  return (
    <>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        aria-label={`Ver tudo sobre ${nome}`}
        title="Ver tudo sobre o cliente"
        onClick={() => setAberto(true)}
      >
        <Eye className="h-4 w-4" />
      </Button>
      {aberto && <FichaCliente id={id} numero={numero} fechar={() => setAberto(false)} />}
    </>
  );
}

function FichaCliente({
  id,
  numero,
  fechar,
}: {
  id: number;
  numero: string | null;
  fechar: () => void;
}) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["ficha-cliente", id],
    queryFn: () => fichaClienteFn({ data: { id } }),
  });
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set());
  const [verTudo, setVerTudo] = useState(false);
  const pt = (numero ?? "").startsWith("55") || /bra/i.test(data?.perfil.pais ?? "");
  const primeiro = (data?.perfil.nome ?? "").trim().split(/\s+/)[0] || "";

  const naoPediu = useMemo(() => data?.pecasVistas.filter((p) => !p.pediu) ?? [], [data]);
  const escolhidas = naoPediu.filter((p) => marcadas.has(p.sku));
  const mensagem = useMemo(() => {
    const lista = (escolhidas.length ? escolhidas : naoPediu.slice(0, 3)).map(
      (p) => `• ${pt ? p.nomePt : p.nome} (cód. ${p.codigo})`,
    );
    if (!lista.length) return "";
    return pt
      ? `Olá${primeiro ? ` ${primeiro}` : ""}! Aqui é da AGRO PARTS. Ainda está procurando ${lista.length > 1 ? "estas peças" : "esta peça"}?\n${lista.join("\n")}\n\nPosso te passar o preço e a disponibilidade agora. 👍`
      : `¡Hola${primeiro ? ` ${primeiro}` : ""}! Te escribimos de AGRO PARTS. ¿Seguís buscando ${lista.length > 1 ? "estos repuestos" : "este repuesto"}?\n${lista.join("\n")}\n\nTe pasamos precio y disponibilidad ahora mismo. 👍`;
  }, [escolhidas, naoPediu, pt, primeiro]);

  return (
    <Dialog open onOpenChange={(o) => !o && fechar()}>
      <DialogContent className="max-h-[92vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{data?.perfil.nome ?? "Cliente"}</DialogTitle>
        </DialogHeader>
        {isLoading && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Juntando tudo sobre o cliente…
          </p>
        )}
        {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}
        {data && (
          <div className="space-y-5">
            {/* Cadastro e contato */}
            <div className="grid gap-3 rounded-xl bg-muted/40 p-4 text-sm sm:grid-cols-3">
              <div>
                <p className="text-xs text-muted-foreground">Contato</p>
                <p className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" /> {data.perfil.email}
                </p>
                <p className="flex items-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5" /> {data.perfil.telefone ?? "sem telefone"}
                </p>
                {!data.perfil.recebeEmails && (
                  <p className="text-xs text-amber-700">Não quer receber e-mails</p>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Endereço</p>
                <p className="flex items-start gap-1.5">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  {[
                    data.perfil.endereco,
                    data.perfil.cidade,
                    data.perfil.departamento,
                    data.perfil.pais,
                  ]
                    .filter(Boolean)
                    .join(", ") || "não informado"}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Conta</p>
                <p>Cadastro: {quando(data.perfil.criado)}</p>
                <p>Último login: {quando(data.perfil.ultimoLogin)}</p>
                <p className="text-xs text-muted-foreground">
                  {data.perfil.google ? "Entrou com Google" : "E-mail e senha"}
                </p>
              </div>
            </div>

            {/* Números */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {[
                ["Última visita", haQuanto(data.navegacao.ultimaVisita)],
                ["Visitas (páginas)", data.navegacao.visitas],
                ["Dias diferentes", data.navegacao.dias],
                ["Peças vistas", data.pecasVistas.length],
                ["WhatsApp clicado", data.navegacao.whatsapp],
              ].map(([r, v]) => (
                <div key={String(r)} className="rounded-xl border p-3">
                  <p className="text-xl font-bold">{v}</p>
                  <p className="text-[11px] text-muted-foreground">{r}</p>
                </div>
              ))}
            </div>

            {/* Viu e não pediu */}
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50/60 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="flex-1 font-bold">Viu e não pediu orçamento ({naoPediu.length})</h3>
                {numero && mensagem && (
                  <a
                    href={`https://api.whatsapp.com/send?phone=${numero}&text=${encodeURIComponent(mensagem)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-2 text-sm font-bold text-white"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Chamar no WhatsApp {escolhidas.length ? `(${escolhidas.length})` : ""}
                  </a>
                )}
              </div>
              {!numero && (
                <p className="mt-1 text-xs text-amber-800">
                  Cliente sem celular válido: use o e-mail.
                </p>
              )}
              {!naoPediu.length ? (
                <p className="mt-2 text-sm text-muted-foreground">Nenhuma peça vista sem pedido.</p>
              ) : (
                <>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Marque as peças para a mensagem (sem marcar, vão as 3 mais recentes).
                  </p>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {naoPediu.slice(0, verTudo ? 100 : 8).map((p) => (
                      <li key={p.sku}>
                        <label
                          className={cn(
                            "flex cursor-pointer items-center gap-3 rounded-lg border bg-white p-2",
                            marcadas.has(p.sku) && "ring-2 ring-primary",
                          )}
                        >
                          <input
                            type="checkbox"
                            checked={marcadas.has(p.sku)}
                            onChange={() => {
                              const n = new Set(marcadas);
                              if (n.has(p.sku)) n.delete(p.sku);
                              else n.add(p.sku);
                              setMarcadas(n);
                            }}
                          />
                          {foto(p.foto) ? (
                            <img
                              src={foto(p.foto)!}
                              alt=""
                              className="h-12 w-12 shrink-0 rounded border object-contain"
                            />
                          ) : (
                            <span className="h-12 w-12 shrink-0 rounded bg-muted" />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 text-sm font-medium leading-tight">
                              {p.nome}
                            </span>
                            <span className="block text-xs text-muted-foreground">
                              {p.codigo} · viu {p.vezes}× · {haQuanto(p.ultima)}
                            </span>
                            <span className="text-xs font-semibold text-primary">
                              {pt
                                ? p.brl
                                  ? `R$ ${p.brl.toLocaleString("pt-BR")}`
                                  : ""
                                : p.uyu
                                  ? `$U ${p.uyu.toLocaleString("es-UY")}`
                                  : ""}
                            </span>
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                  {naoPediu.length > 8 && (
                    <button
                      type="button"
                      onClick={() => setVerTudo(!verTudo)}
                      className="mt-2 text-xs font-semibold text-primary hover:underline"
                    >
                      {verTudo ? "Ver menos" : `Ver todas (${naoPediu.length})`}
                    </button>
                  )}
                </>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Navegação */}
              <Bloco titulo="Como navega" icone={Smartphone}>
                <Lista titulo="De onde chega" itens={data.navegacao.origens} />
                <Lista titulo="Cidade (pelo IP)" itens={data.navegacao.cidades} />
                <Lista titulo="Aparelho" itens={data.navegacao.aparelhos} />
                {!!data.navegacao.campanhas.length && (
                  <Lista titulo="Campanhas" itens={data.navegacao.campanhas} />
                )}
              </Bloco>
              {/* Buscas */}
              <Bloco titulo={`O que buscou (${data.buscas.length})`} icone={Search}>
                {!data.buscas.length ? (
                  <p className="text-xs text-muted-foreground">Nenhuma busca.</p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {data.buscas.map((b, k) => (
                      <span
                        key={k}
                        className="rounded-full bg-muted px-2 py-0.5 text-xs"
                        title={quando(b.quando)}
                      >
                        {b.termo}
                      </span>
                    ))}
                  </div>
                )}
              </Bloco>
              {/* Carrinhos e compras */}
              <Bloco titulo="Carrinhos, cotações e compras" icone={ShoppingCart}>
                {!data.carrinhos.length && !data.vendas.length && !data.links.length && (
                  <p className="text-xs text-muted-foreground">Ainda não pediu nada.</p>
                )}
                {data.carrinhos.map((c) => (
                  <div key={c.id} className="border-b py-1.5 text-xs last:border-0">
                    <p className="font-semibold">
                      Carrinho · {c.status === "ENVIADO" ? "enviado pelo WhatsApp" : "não enviado"}{" "}
                      · {quando(c.quando)}
                    </p>
                    <p className="text-muted-foreground">
                      {c.itens.map((i) => `${i.qtd}× ${i.nome}`).join(" · ")}
                    </p>
                  </div>
                ))}
                {data.vendas.map((v) => (
                  <p key={v.codigo} className="border-b py-1.5 text-xs last:border-0">
                    <b>Venda {v.codigo}</b> · {v.moeda === "BRL" ? "R$" : "$U"}{" "}
                    {v.total.toLocaleString("pt-BR")} · {v.status} · {quando(v.quando)}
                  </p>
                ))}
                {data.links.map((l) => (
                  <p key={l.id} className="border-b py-1.5 text-xs last:border-0">
                    <b>Link #{l.id}</b> · {l.moeda === "BRL" ? "R$" : "$U"}{" "}
                    {l.total.toLocaleString("pt-BR")} · {l.status} · {quando(l.quando)}
                  </p>
                ))}
              </Bloco>
              {/* Catálogos */}
              <Bloco titulo={`Catálogos abertos (${data.catalogos.length})`} icone={BookOpen}>
                {!data.catalogos.length ? (
                  <p className="text-xs text-muted-foreground">Nenhum.</p>
                ) : (
                  data.catalogos.map((c, k) => (
                    <p key={k} className="text-xs">
                      {c.titulo} · <span className="text-muted-foreground">{quando(c.quando)}</span>
                    </p>
                  ))
                )}
              </Bloco>
            </div>

            {/* Peças que pediu */}
            {data.pecasVistas.some((p) => p.pediu) && (
              <Bloco titulo="Peças vistas que já pediu" icone={Eye}>
                <div className="flex flex-wrap gap-1.5">
                  {data.pecasVistas
                    .filter((p) => p.pediu)
                    .map((p) => (
                      <span
                        key={p.sku}
                        className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-800"
                      >
                        {p.codigo} · {p.nome.slice(0, 40)}
                      </span>
                    ))}
                </div>
              </Bloco>
            )}

            {/* Linha do tempo */}
            <Bloco titulo="Linha do tempo" icone={Clock}>
              <ul className="max-h-72 space-y-1 overflow-y-auto text-xs">
                {data.tempo.map((t, k) => (
                  <li key={k} className="flex gap-2">
                    <span className="w-28 shrink-0 text-muted-foreground">{quando(t.quando)}</span>
                    <span className="w-20 shrink-0 font-semibold">{ROTULO[t.tipo] ?? t.tipo}</span>
                    <span className="min-w-0 truncate">{t.texto}</span>
                  </li>
                ))}
              </ul>
            </Bloco>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Bloco({
  titulo,
  icone: Icone,
  children,
}: {
  titulo: string;
  icone: any;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border p-3">
      <h3 className="mb-2 flex items-center gap-1.5 text-sm font-bold">
        <Icone className="h-4 w-4 text-primary" /> {titulo}
      </h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function Lista({ titulo, itens }: { titulo: string; itens: Array<{ nome: string; n: number }> }) {
  if (!itens.length) return null;
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase text-muted-foreground">{titulo}</p>
      <p className="text-xs">{itens.map((i) => `${i.nome} (${i.n})`).join(" · ")}</p>
    </div>
  );
}
