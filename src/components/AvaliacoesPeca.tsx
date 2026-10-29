// Avaliações aprovadas da peça (página do produto): média, distribuição e comentários.
// Sem avaliações, a seção não aparece. Selo «Compra verificada» (veio de uma venda) e aviso
// de que o cliente ganhou cupom por avaliar (transparência).
import { useState } from "react";
import { BadgeCheck, MessageSquareReply, Star } from "lucide-react";
import { useT } from "@/lib/idioma";
import { cn } from "@/lib/utils";

type Dados = {
  total: number;
  media: number;
  dist: Array<{ n: number; q: number }>;
  lista: Array<{
    id: number;
    nome: string;
    cidade: string | null;
    nota: number;
    comentario: string | null;
    resposta: string | null;
    fotos?: string[];
    verificada: boolean;
    comCupom: boolean;
    quando: string;
  }>;
} | null;

export function Estrelas({
  nota,
  tamanho = "h-4 w-4",
  className,
}: {
  nota: number;
  tamanho?: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} aria-label={`${nota} de 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const cheio = nota >= i;
        const meio = !cheio && nota >= i - 0.5;
        return (
          <span key={i} className="relative inline-block">
            <Star className={cn(tamanho, "text-zinc-300")} fill="currentColor" strokeWidth={0} />
            {(cheio || meio) && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: cheio ? "100%" : "50%" }}
              >
                <Star
                  className={cn(tamanho, "text-amber-400")}
                  fill="currentColor"
                  strokeWidth={0}
                />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

export function ResumoEstrelas({ media, total }: { media: number; total: number }) {
  const { t } = useT();
  return (
    <a
      href="#avaliacoes"
      className="mt-1.5 inline-flex items-center gap-2 text-sm text-zinc-700 hover:underline"
    >
      <Estrelas nota={media} />
      <b>{media.toLocaleString("es-UY", { minimumFractionDigits: 1 })}</b>
      <span className="text-muted-foreground">
        ({total} {total === 1 ? t("opinión", "avaliação") : t("opiniones", "avaliações")})
      </span>
    </a>
  );
}

export function AvaliacoesPeca({ dados }: { dados: Dados }) {
  const { t, idioma } = useT();
  const [todas, setTodas] = useState(false);
  if (!dados?.total) return null;
  const lista = todas ? dados.lista : dados.lista.slice(0, 6);
  return (
    <section
      id="avaliacoes"
      className="mt-8 scroll-mt-24 rounded-2xl bg-white p-4 shadow-sm md:p-8"
    >
      <h2 className="mb-5 text-xl font-bold tracking-tight md:text-2xl">
        {t("Opiniones de clientes", "Avaliações de clientes")}
      </h2>
      <div className="grid gap-8 md:grid-cols-[240px_1fr]">
        <div>
          <p className="text-5xl font-black text-zinc-900">
            {dados.media.toLocaleString("es-UY", { minimumFractionDigits: 1 })}
          </p>
          <Estrelas nota={dados.media} tamanho="h-5 w-5" className="mt-1" />
          <p className="mt-1 text-sm text-muted-foreground">
            {dados.total}{" "}
            {dados.total === 1 ? t("opinión", "avaliação") : t("opiniones", "avaliações")}
          </p>
          <ul className="mt-4 space-y-1.5">
            {dados.dist.map((d) => (
              <li key={d.n} className="flex items-center gap-2 text-xs">
                <span className="w-3 text-right">{d.n}</span>
                <Star className="h-3 w-3 text-amber-400" fill="currentColor" strokeWidth={0} />
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-100">
                  <span
                    className="block h-full rounded-full bg-amber-400"
                    style={{ width: `${(d.q / dados.total) * 100}%` }}
                  />
                </span>
                <span className="w-6 text-right tabular-nums text-muted-foreground">{d.q}</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <ul className="divide-y">
            {lista.map((r) => (
              <li key={r.id} className="py-4 first:pt-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Estrelas nota={r.nota} />
                  <span className="text-sm font-semibold">{r.nome}</span>
                  {r.cidade && <span className="text-xs text-muted-foreground">{r.cidade}</span>}
                  <span className="text-xs text-muted-foreground">
                    {new Date(r.quando).toLocaleDateString(idioma === "pt" ? "pt-BR" : "es-UY")}
                  </span>
                  {r.verificada && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700">
                      <BadgeCheck className="h-3.5 w-3.5" />{" "}
                      {t("Compra verificada", "Compra verificada")}
                    </span>
                  )}
                </div>
                {r.comentario && (
                  <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-700">
                    {r.comentario}
                  </p>
                )}
                {!!r.fotos?.length && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {r.fotos.map((p) => (
                      <a key={p} href={`/uploads/${p}`} target="_blank" rel="noreferrer">
                        <img
                          src={`/uploads/${p}`}
                          alt={t("Foto del cliente", "Foto do cliente")}
                          loading="lazy"
                          className="h-20 w-20 rounded-lg border object-cover hover:opacity-90"
                        />
                      </a>
                    ))}
                  </div>
                )}
                {r.comCupom && (
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {t(
                      "Recibió un cupón de descuento por dejar su opinión (cualquier nota).",
                      "Recebeu um cupom de desconto por avaliar (qualquer nota).",
                    )}
                  </p>
                )}
                {r.resposta && (
                  <div className="mt-3 rounded-lg bg-zinc-50 p-3 text-sm">
                    <p className="mb-1 flex items-center gap-1.5 text-xs font-bold text-zinc-600">
                      <MessageSquareReply className="h-3.5 w-3.5" />{" "}
                      {t("Respuesta de AGRO PARTS", "Resposta da AGRO PARTS")}
                    </p>
                    <p className="whitespace-pre-line text-zinc-700">{r.resposta}</p>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {dados.lista.length > 6 && !todas && (
            <button
              onClick={() => setTodas(true)}
              className="mt-2 text-sm font-semibold text-primary hover:underline"
            >
              {t(
                `Ver las ${dados.lista.length} opiniones`,
                `Ver as ${dados.lista.length} avaliações`,
              )}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
