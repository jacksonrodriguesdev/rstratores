import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageCircle, Search, MapPin, Eye, Megaphone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { contatosWhatsappFn, atualizarContatoFn } from "@/lib/acesso";
import { cn } from "@/lib/utils";

const STATUS: Array<[string, string, string]> = [
  ["NOVO", "Novo", "bg-sky-100 text-sky-800"],
  ["CONTATADO", "Contatado", "bg-violet-100 text-violet-800"],
  ["NEGOCIANDO", "Negociando", "bg-amber-100 text-amber-800"],
  ["GANHO", "Comprou", "bg-emerald-100 text-emerald-800"],
  ["PERDIDO", "Perdido", "bg-zinc-100 text-zinc-600"],
];
const MOTIVO: Record<string, string> = {
  whatsapp: "Pediu preço",
  carrinho: "Carrinho",
  busca: "Busca sem resultado",
  tempo: "Pop-up do tempo",
  interesse: "Pop-up de interesse",
};
const quando = (s: string) =>
  new Date(s).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
const fmtTel = (t: string) =>
  t.startsWith("+598")
    ? `+598 ${t.slice(4, 6)} ${t.slice(6, 9)} ${t.slice(9)}`
    : t.startsWith("+55")
      ? `+55 (${t.slice(3, 5)}) ${t.slice(5, -4)}-${t.slice(-4)}`
      : t;

// Mensagem pronta para a equipe: cumprimento, as peças que a pessoa viu e o cupom
function mensagem(c: {
  nome: string | null;
  idioma: string;
  interesse: string[];
  cupom: string | null;
  usadoEm: string | null;
}) {
  const pt = c.idioma === "pt";
  const nome = (c.nome ?? "").trim().split(/\s+/)[0];
  const pecas = c.interesse.filter((x) => !x.startsWith("/"));
  return [
    pt
      ? `Olá${nome ? ` ${nome}` : ""}! Aqui é da AGRO PARTS.`
      : `¡Hola${nome ? ` ${nome}` : ""}! Te escribimos de AGRO PARTS.`,
    pecas.length
      ? pt
        ? `Vimos que você se interessou por: ${pecas.join(", ")}. Quer que a gente confirme preço e compatibilidade com o seu trator?`
        : `Vimos que te interesó: ${pecas.join(", ")}. ¿Querés que te confirmemos precio y si sirve para tu tractor?`
      : pt
        ? "Em que podemos ajudar? Diga o modelo do trator e a peça que precisa."
        : "¿En qué te podemos ayudar? Pasanos el modelo del tractor y la pieza que buscás.",
    c.cupom && !c.usadoEm
      ? pt
        ? `Seu cupom de boas-vindas: ${c.cupom}`
        : `Tu cupón de bienvenida: ${c.cupom}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
}

// Site → Pop-up: quem deixou só o WhatsApp (sem conta). A equipe chama, anota e marca o cupom.
export function ContatosWhatsapp() {
  const qc = useQueryClient();
  const [busca, setBusca] = useState("");
  const [q, setQ] = useState("");
  const [filtro, setFiltro] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setQ(busca), 350);
    return () => clearTimeout(t);
  }, [busca]);
  const { data } = useQuery({
    queryKey: ["contatos-whatsapp", q],
    queryFn: () => contatosWhatsappFn({ data: { busca: q } }),
  });
  const salvar = async (
    id: number,
    o: { status?: string; nota?: string | null; usado?: boolean },
  ) => {
    await atualizarContatoFn({ data: { id, ...o } });
    qc.invalidateQueries({ queryKey: ["contatos-whatsapp"] });
  };
  const lista = (data ?? []).filter((c) => !filtro || c.status === filtro);
  const conta = (s: string) => (data ?? []).filter((c) => c.status === s).length;

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex flex-wrap items-center gap-2 border-b p-4">
        <h2 className="mr-auto flex items-center gap-2 font-semibold">
          <MessageCircle className="h-4 w-4 text-[#128C4B]" /> Contatos por WhatsApp
          <span className="rounded-full bg-muted px-2 text-xs font-bold">
            {data?.length ?? "…"}
          </span>
        </h2>
        <label className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Celular, nome ou cupom…"
            className="h-9 w-56 rounded-lg border bg-background pl-8 pr-3 text-sm outline-none focus:ring-2 focus:ring-primary/30"
          />
        </label>
      </div>
      <div className="flex flex-wrap gap-1.5 border-b bg-muted/30 px-4 py-2 text-xs">
        <button
          onClick={() => setFiltro("")}
          className={cn(
            "rounded-full px-2.5 py-1 font-semibold",
            !filtro ? "bg-foreground text-background" : "bg-background",
          )}
        >
          Todos
        </button>
        {STATUS.map(([id, rotulo]) => (
          <button
            key={id}
            onClick={() => setFiltro(id)}
            className={cn(
              "rounded-full px-2.5 py-1 font-semibold",
              filtro === id ? "bg-foreground text-background" : "bg-background",
            )}
          >
            {rotulo} · {conta(id)}
          </button>
        ))}
      </div>
      <p className="border-b px-4 py-2 text-xs text-muted-foreground">
        Deixaram só o celular no pop-up (sem conta e sem e-mail): não recebem e-mails, o contato é
        pelo WhatsApp. O botão abre a conversa com uma mensagem pronta, com as peças que a pessoa
        viu e o cupom. Últimos 90 dias.
      </p>
      <div className="max-h-[620px] divide-y overflow-y-auto">
        {lista.map((c) => {
          const st = STATUS.find((s) => s[0] === c.status) ?? STATUS[0];
          const wa = `https://api.whatsapp.com/send?phone=${c.telefone.replace(/\D/g, "")}&text=${encodeURIComponent(mensagem(c))}`;
          return (
            <div key={c.id} className="grid gap-3 p-4 lg:grid-cols-[1fr_auto]">
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{c.nome || fmtTel(c.telefone)}</span>
                  {c.nome && (
                    <span className="text-sm text-muted-foreground">{fmtTel(c.telefone)}</span>
                  )}
                  <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold", st[2])}>
                    {st[1]}
                  </span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold">
                    {c.idioma === "pt" ? "PT · Brasil" : "ES · Uruguay"}
                  </span>
                </div>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{quando(c.criado)}</span>
                  {c.motivo && <span>{MOTIVO[c.motivo] ?? c.motivo}</span>}
                  {c.cidade && (
                    <span className="inline-flex items-center gap-0.5">
                      <MapPin className="h-3 w-3" /> {c.cidade}
                    </span>
                  )}
                  {(c.fonte || c.campanha) && (
                    <span className="inline-flex items-center gap-0.5">
                      <Megaphone className="h-3 w-3" />{" "}
                      {[c.fonte, c.campanha].filter(Boolean).join(" · ")}
                    </span>
                  )}
                  {c.pecasVistas > 0 && (
                    <span className="inline-flex items-center gap-0.5">
                      <Eye className="h-3 w-3" /> {c.pecasVistas}{" "}
                      {c.pecasVistas === 1 ? "peça vista" : "peças vistas"}
                    </span>
                  )}
                  {c.vezes > 1 && <span>voltou {c.vezes}×</span>}
                </p>
                {c.interesse.length > 0 && (
                  <p className="flex flex-wrap gap-1">
                    {c.interesse.map((x) => (
                      <a
                        key={x}
                        href={x.startsWith("/") ? x : `/loja?q=${encodeURIComponent(x)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded border bg-background px-1.5 py-0.5 font-mono text-[11px] hover:border-primary"
                      >
                        {x}
                      </a>
                    ))}
                  </p>
                )}
                <input
                  defaultValue={c.nota ?? ""}
                  placeholder="Anotação (modelo do trator, o que pediu…)"
                  onBlur={(e) =>
                    e.target.value !== (c.nota ?? "") &&
                    salvar(c.id, { nota: e.target.value || null })
                  }
                  className="h-8 w-full max-w-lg rounded-md border bg-background px-2 text-xs"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-end">
                <a
                  href={wa}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => c.status === "NOVO" && salvar(c.id, { status: "CONTATADO" })}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#25D366] px-3 text-sm font-bold text-white hover:bg-[#1EBE57]"
                >
                  <MessageCircle className="h-4 w-4" /> Chamar no WhatsApp
                </a>
                <select
                  value={c.status}
                  onChange={(e) => salvar(c.id, { status: e.target.value })}
                  className="h-8 rounded-md border bg-background px-2 text-xs"
                  aria-label="Etapa"
                >
                  {STATUS.map(([id, rotulo]) => (
                    <option key={id} value={id}>
                      {rotulo}
                    </option>
                  ))}
                </select>
                {c.cupom && (
                  <label className="inline-flex items-center gap-2 text-xs">
                    <span className="font-mono font-bold">{c.cupom}</span>
                    <Switch
                      checked={!!c.usadoEm}
                      onCheckedChange={(v) => salvar(c.id, { usado: v })}
                      aria-label="Cupom usado"
                    />
                    {c.usadoEm ? "usado" : "não usado"}
                  </label>
                )}
              </div>
            </div>
          );
        })}
        {data && !lista.length && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            {q || filtro
              ? "Nenhum contato encontrado."
              : "Nenhum contato ainda: aparecem quando alguém deixa o WhatsApp no pop-up."}
          </p>
        )}
      </div>
    </Card>
  );
}
