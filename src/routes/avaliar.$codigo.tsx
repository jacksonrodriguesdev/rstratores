// Página do QR da etiqueta: o cliente avalia as peças que comprou (estrelas + comentário,
// qualquer nota) e recebe na hora um cupom único para a próxima compra. Sem login.
// O Google aparece depois, como convite (sem prêmio: a política do Google proíbe incentivo).
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, Check, Copy, Gift, Loader2, MessageCircle, Star } from "lucide-react";
import { reduzirImagem } from "@/lib/reduzir-imagem";
import { SiteHeader } from "@/components/SiteHeader";
import { GoogleLogo } from "@/components/home/GoogleReviews";
import { enviarAvaliacoesFn, paginaAvaliacaoFn } from "@/lib/avaliacoes";
import { tr, useT, type Idioma } from "@/lib/idioma";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/avaliar/$codigo")({
  loader: ({ params }) => paginaAvaliacaoFn({ data: { codigo: params.codigo } }),
  head: ({ match }) => {
    const idioma: Idioma = (match.context as any)?.idioma ?? "es";
    return {
      meta: [
        { title: tr(idioma, "Calificá tu compra | AGRO PARTS", "Avalie sua compra | AGRO PARTS") },
        { name: "robots", content: "noindex, nofollow" },
      ],
    };
  },
  component: PaginaAvaliar,
});

const ROTULO_NOTA: Record<number, [string, string]> = {
  1: ["Malo", "Ruim"],
  2: ["Regular", "Regular"],
  3: ["Bueno", "Bom"],
  4: ["Muy bueno", "Muito bom"],
  5: ["Excelente", "Excelente"],
};
const fotoUrl = (u: string | null) =>
  !u ? null : u.startsWith("http") ? u : `/uploads/${u.replace(/^\/?(uploads\/)?/, "")}`;

function PaginaAvaliar() {
  const dados = Route.useLoaderData();
  const { codigo } = Route.useParams();
  const { t, idioma } = useT();
  const [notas, setNotas] = useState<Record<string, number>>({});
  const [coments, setComents] = useState<Record<string, string>>({});
  const [nome, setNome] = useState(dados?.nome ?? "");
  const [cidade, setCidade] = useState(dados?.cidade ?? "");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [cupom, setCupom] = useState<string | null>(dados?.cupom ?? null);
  const [copiado, setCopiado] = useState(false);
  // Fotos da peça instalada (até 4 por peça), enviadas na hora em que são escolhidas
  const [fotos, setFotos] = useState<Record<string, string[]>>({});
  const [subindo, setSubindo] = useState<string | null>(null);
  const enviarFoto = async (sku: string, arq: File) => {
    setErro("");
    setSubindo(sku);
    try {
      const fd = new FormData();
      fd.append("codigo", codigo);
      fd.append("file", await reduzirImagem(arq));
      const r = await fetch("/api/public/avaliacao-foto", { method: "POST", body: fd });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.path) throw new Error(j.error || "Falha");
      setFotos((x) => ({ ...x, [sku]: [...(x[sku] ?? []), j.path].slice(0, 4) }));
    } catch (e: any) {
      setErro(e?.message ?? t("No se pudo subir la foto.", "Não foi possível enviar a foto."));
    } finally {
      setSubindo(null);
    }
  };

  if (!dados)
    return (
      <div className="min-h-screen bg-zinc-100">
        <SiteHeader />
        <main className="mx-auto max-w-xl px-4 py-16 text-center">
          <h1 className="text-2xl font-bold">
            {t("No encontramos esta compra", "Não encontramos esta compra")}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t(
              "Revisá el código del QR o escribinos por WhatsApp.",
              "Confira o código do QR ou fale com a gente pelo WhatsApp.",
            )}
          </p>
          <Link to="/" className="mt-6 inline-block font-semibold text-primary underline">
            agropartsuy.com
          </Link>
        </main>
      </div>
    );

  const avaliadas = dados.itens.filter((i) => notas[i.sku]);
  const enviar = async () => {
    setErro("");
    if (!avaliadas.length)
      return setErro(
        t(
          "Tocá las estrellas de al menos una pieza.",
          "Toque nas estrelas de pelo menos uma peça.",
        ),
      );
    if (!nome.trim()) return setErro(t("Escribí tu nombre.", "Escreva seu nome."));
    setEnviando(true);
    try {
      const r = await enviarAvaliacoesFn({
        data: {
          codigo,
          nome,
          cidade,
          idioma,
          avaliacoes: avaliadas.map((i) => ({
            sku: i.sku,
            nota: notas[i.sku],
            comentario: coments[i.sku] || null,
            fotos: fotos[i.sku] ?? [],
          })),
        },
      });
      setCupom(r.cupom);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (e: any) {
      setErro(
        e?.message ??
          t("No se pudo enviar. Probá de nuevo.", "Não foi possível enviar. Tente de novo."),
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100">
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-3 pb-16 pt-6 md:px-4">
        <div className="overflow-hidden rounded-2xl bg-zinc-950 p-6 text-white shadow-lg">
          <p className="text-xs font-bold uppercase tracking-widest text-amber-300">AGRO PARTS</p>
          <h1 className="mt-1 text-2xl font-black leading-tight md:text-3xl">
            {cupom
              ? t(`¡Gracias, ${dados.primeiroNome}!`, `Obrigado, ${dados.primeiroNome}!`)
              : t(
                  `¡Hola, ${dados.primeiroNome}! ¿Qué te pareció tu compra?`,
                  `Olá, ${dados.primeiroNome}! O que achou da sua compra?`,
                )}
          </h1>
          {!cupom && (
            <p className="mt-2 flex items-start gap-2 text-sm text-zinc-300">
              <Gift className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
              {t(
                `Calificá las piezas y ganá un cupón de ${dados.desconto}% para tu próxima compra. Vale cualquier nota: queremos tu opinión sincera.`,
                `Avalie as peças e ganhe um cupom de ${dados.desconto}% para a próxima compra. Vale qualquer nota: queremos sua opinião sincera.`,
              )}
            </p>
          )}
        </div>

        {cupom ? (
          <div className="mt-5 space-y-4">
            <div className="rounded-2xl bg-amber-400 p-6 text-center shadow-lg">
              <p className="text-sm font-bold uppercase tracking-wider text-zinc-900">
                {t(
                  `Tu cupón de ${dados.desconto}% para la próxima compra`,
                  `Seu cupom de ${dados.desconto}% para a próxima compra`,
                )}
              </p>
              <p className="my-3 font-mono text-4xl font-black tracking-[0.2em] text-zinc-950">
                {cupom}
              </p>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(cupom);
                    setCopiado(true);
                    setTimeout(() => setCopiado(false), 2000);
                  } catch {
                    /* sem área de transferência */
                  }
                }}
                className="inline-flex items-center gap-1.5 rounded-full bg-zinc-950 px-4 py-2 text-sm font-bold text-white"
              >
                {copiado ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiado ? t("¡Copiado!", "Copiado!") : t("Copiar código", "Copiar código")}
              </button>
              <p className="mt-3 text-xs text-zinc-800">
                {t("Un solo uso", "Uso único")}
                {dados.validade || cupom
                  ? ` · ${t("válido por 60 días", "válido por 60 dias")}`
                  : ""}
                {" · "}
                {t(
                  "Indicá el código por WhatsApp o al pagar.",
                  "Informe o código no WhatsApp ou no pagamento.",
                )}
              </p>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              {t(
                "Tu opinión aparece en la página de la pieza después de una revisión rápida.",
                "Sua avaliação aparece na página da peça depois de uma revisão rápida.",
              )}
            </p>
            {dados.google && (
              <div className="rounded-2xl bg-white p-5 text-center shadow-sm">
                <GoogleLogo className="mx-auto h-8 w-8" />
                <p className="mt-2 font-semibold">
                  {t(
                    "¿Te gustó la atención? Contalo también en Google",
                    "Gostou do atendimento? Conte também no Google",
                  )}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t(
                    "Es opcional y nos ayuda mucho a llegar a más productores.",
                    "É opcional e ajuda muito a gente a chegar em mais produtores.",
                  )}
                </p>
                <a
                  href={dados.google}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-2 rounded-full border-2 border-zinc-900 px-5 py-2 text-sm font-bold hover:bg-zinc-50"
                >
                  <Star className="h-4 w-4 text-amber-400" fill="currentColor" strokeWidth={0} />
                  {t("Opinar en Google", "Avaliar no Google")}
                </a>
              </div>
            )}
            <Link
              to="/loja"
              className="block rounded-2xl bg-primary p-4 text-center font-bold text-primary-foreground"
            >
              {t("Ver repuestos", "Ver peças")}
            </Link>
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            {dados.itens.map((i) => {
              const n = notas[i.sku] ?? 0;
              const foto = fotoUrl(i.foto);
              return (
                <div key={i.sku} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-3">
                    {foto ? (
                      <img
                        src={foto}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-lg border bg-white object-contain"
                      />
                    ) : (
                      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-[10px] font-bold text-zinc-500">
                        {i.codigo}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="line-clamp-2 font-semibold leading-tight">
                        {idioma === "pt" ? i.nomePt : i.nome}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t("Cód.", "Cód.")} {i.codigo}
                      </p>
                    </div>
                  </div>
                  <div
                    className="mt-3 flex items-center gap-1"
                    role="radiogroup"
                    aria-label={t("Calificación", "Nota")}
                  >
                    {[1, 2, 3, 4, 5].map((k) => (
                      <button
                        key={k}
                        type="button"
                        role="radio"
                        aria-checked={n === k}
                        aria-label={`${k} ${k === 1 ? t("estrella", "estrela") : t("estrellas", "estrelas")}`}
                        onClick={() => setNotas((x) => ({ ...x, [i.sku]: k }))}
                        className="p-1"
                      >
                        <Star
                          className={cn(
                            "h-9 w-9 transition",
                            k <= n ? "text-amber-400" : "text-zinc-200",
                          )}
                          fill="currentColor"
                          strokeWidth={0}
                        />
                      </button>
                    ))}
                    {!!n && (
                      <span className="ml-2 text-sm font-semibold">
                        {ROTULO_NOTA[n][idioma === "pt" ? 1 : 0]}
                      </span>
                    )}
                  </div>
                  {!!n && (
                    <textarea
                      value={coments[i.sku] ?? ""}
                      onChange={(e) =>
                        setComents((x) => ({ ...x, [i.sku]: e.target.value.slice(0, 2000) }))
                      }
                      rows={3}
                      placeholder={t(
                        "Contanos: ¿la pieza sirvió bien? ¿Llegó a tiempo? (opcional)",
                        "Conte: a peça serviu bem? Chegou no prazo? (opcional)",
                      )}
                      className="mt-2 w-full rounded-lg border bg-background p-3 text-sm"
                    />
                  )}
                  {!!n && (
                    <div className="mt-2">
                      <div className="flex flex-wrap items-center gap-2">
                        {(fotos[i.sku] ?? []).map((p) => (
                          <span key={p} className="relative">
                            <img
                              src={`/uploads/${p}`}
                              alt=""
                              className="h-16 w-16 rounded-lg border object-cover"
                            />
                            <button
                              type="button"
                              aria-label={t("Quitar foto", "Tirar foto")}
                              onClick={() =>
                                setFotos((x) => ({
                                  ...x,
                                  [i.sku]: (x[i.sku] ?? []).filter((q) => q !== p),
                                }))
                              }
                              className="absolute -right-1.5 -top-1.5 rounded-full bg-zinc-900 px-1.5 text-xs font-bold text-white"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        {(fotos[i.sku] ?? []).length < 4 && (
                          <label className="flex h-16 cursor-pointer items-center gap-1.5 rounded-lg border-2 border-dashed px-3 text-xs font-semibold text-zinc-600">
                            {subindo === i.sku ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Camera className="h-4 w-4" />
                            )}
                            {t("Foto de la pieza instalada", "Foto da peça instalada")}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              disabled={!!subindo}
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                e.target.value = "";
                                if (f) enviarFoto(i.sku, f);
                              }}
                            />
                          </label>
                        )}
                      </div>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {t(
                          "Opcional: una foto de la pieza en tu tractor ayuda a otros productores.",
                          "Opcional: uma foto da peça no seu trator ajuda outros produtores.",
                        )}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}

            <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
              <label className="block text-sm">
                <span className="mb-1 block font-semibold">{t("Tu nombre", "Seu nome")}</span>
                <input
                  value={nome}
                  onChange={(e) => setNome(e.target.value.slice(0, 120))}
                  className="w-full rounded-lg border bg-background p-3"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-semibold">
                  {t("Ciudad (opcional)", "Cidade (opcional)")}
                </span>
                <input
                  value={cidade}
                  onChange={(e) => setCidade(e.target.value.slice(0, 120))}
                  className="w-full rounded-lg border bg-background p-3"
                />
              </label>
              <p className="text-xs text-muted-foreground">
                {t(
                  "En el sitio se muestra solo tu nombre y la inicial del apellido.",
                  "No site aparece só o seu nome e a inicial do sobrenome.",
                )}
              </p>
              {erro && <p className="text-sm font-semibold text-red-600">{erro}</p>}
              <button
                onClick={enviar}
                disabled={enviando}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-zinc-950 p-4 text-base font-black text-white disabled:opacity-60"
              >
                {enviando ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Gift className="h-5 w-5 text-amber-300" />
                )}
                {t(`Enviar y ganar ${dados.desconto}%`, `Enviar e ganhar ${dados.desconto}%`)}
              </button>
            </div>
            <a
              href="https://wa.me/5553991831101"
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:underline"
            >
              <MessageCircle className="h-4 w-4" />{" "}
              {t(
                "¿Algún problema con tu pedido? Escribinos",
                "Algum problema com o pedido? Fale com a gente",
              )}
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
