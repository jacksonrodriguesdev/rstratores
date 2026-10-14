import { createFileRoute, Link } from "@tanstack/react-router";
import { SITE_URL } from "@/lib/site";
import { useState } from "react";
import { ListChecks, Loader2, MessageCircle, ShoppingCart, CheckCircle2, HelpCircle, Trash2 } from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { useCart } from "@/components/CartContext";
import { acharPorCodigos, codigoExibicao, type Product } from "@/lib/products";
import { nomeProduto, nomePeca } from "@/lib/pecas-es";
import { linksIdioma, tr, useT, type Idioma } from "@/lib/idioma";
import { PHONE } from "@/lib/whatsapp";
import { eventoDoLinkWhatsapp } from "@/lib/eventos";

export const Route = createFileRoute("/pedido-rapido")({
  head: ({ match }) => {
    const idioma: Idioma = match.context?.idioma ?? "es";
    const t = (es: string, pt: string) => tr(idioma, es, pt);
    return {
      links: linksIdioma("/pedido-rapido", idioma),
      meta: [
        { title: t("Pedido rápido por códigos | AGRO PARTS", "Pedido rápido por códigos | AGRO PARTS") },
        {
          name: "description",
          content: t(
            "Pegá la lista de códigos de repuestos y cotizá todo junto por WhatsApp. Ideal para talleres y revendedores en Uruguay.",
            "Cole a lista de códigos de peças e peça orçamento de tudo junto pelo WhatsApp. Ideal para oficinas e revendedores.",
          ),
        },
      ],
    };
  },
  component: PedidoRapido,
});

type Linha = { codigo: string; produto: Product | null };

// Pedido rápido para talleres e revendedores: cola uma lista de códigos (um por linha, com
// quantidade opcional "2x AL81843" ou "AL81843 2") e cota tudo de uma vez.
function lerLista(texto: string) {
  return texto
    .split(/[\n;,]+/)
    .map((l) => l.trim())
    .filter(Boolean)
    .slice(0, 100)
    .map((l) => {
      // "2x COD", "2 COD", "COD x2", "COD 2" (no fim só até 2 dígitos: "MF 9790" é código, não quantidade)
      const m = l.match(/^(\d{1,3})\s*x?\s+(.+)$/i) || l.match(/^(.+?)\s+x(\d{1,3})$/i) || l.match(/^(.+?)\s+(\d{1,2})$/);
      if (m && /^\d+$/.test(m[1])) return { codigo: m[2].trim(), qtd: Number(m[1]) };
      if (m && /^\d+$/.test(m[2])) return { codigo: m[1].trim(), qtd: Number(m[2]) };
      return { codigo: l, qtd: 1 };
    });
}

function PedidoRapido() {
  const [texto, setTexto] = useState("");
  const [resultado, setResultado] = useState<Array<Linha & { qtd: number }> | null>(null);
  const [buscando, setBuscando] = useState(false);
  const { addItem, setIsCartOpen } = useCart();
  const { t, idioma } = useT();

  const buscar = async () => {
    const lista = lerLista(texto);
    if (!lista.length) return;
    setBuscando(true);
    try {
      const achados = await acharPorCodigos(lista.map((l) => l.codigo));
      setResultado(achados.map((a, i) => ({ ...a, qtd: lista[i].qtd })));
    } finally {
      setBuscando(false);
    }
  };

  const encontrados = resultado?.filter((r) => r.produto) ?? [];
  const faltantes = resultado?.filter((r) => !r.produto) ?? [];

  const agregarTodos = () => {
    for (const r of encontrados) {
      const p = r.produto!;
      addItem({ sku: p.sku, codigo: codigoExibicao(p), name: p.nome, nameEs: nomeProduto(p), image: p.imagem_principal || undefined, quantity: r.qtd });
    }
    setIsCartOpen(true);
  };

  const enviarWhatsapp = () => {
    const linhas = [
      ...encontrados.map((r) => {
        const p = r.produto!;
        const exibido = nomePeca(p, idioma);
        return `• ${r.qtd}x ${exibido}${exibido !== p.nome ? ` (${p.nome})` : ""} — Cód: ${p.sku}`;
      }),
      ...(faltantes.length
        ? ["", t("También busco estos códigos:", "Também procuro estes códigos:"), ...faltantes.map((r) => `• ${r.qtd}x ${r.codigo}`)]
        : []),
    ];
    const url = `https://api.whatsapp.com/send?phone=${PHONE}&text=${encodeURIComponent(
      `${t("¡Hola! Quiero cotizar esta lista de repuestos:", "Olá! Quero orçamento desta lista de peças (cliente do Brasil):")}\n\n${linhas.join("\n")}`,
    )}`;
    eventoDoLinkWhatsapp(url);
    window.open(url, "_blank");
  };

  return (
    <div className="min-h-screen bg-zinc-100">
      <SiteHeader />
      <main className="mx-auto flex max-w-4xl flex-col gap-4 px-3 py-6 md:px-4 md:py-10">
        <div className="px-1">
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-zinc-900 md:text-4xl">
            <ListChecks className="h-7 w-7 text-primary md:h-9 md:w-9" /> {t("Pedido rápido por códigos", "Pedido rápido por códigos")}
          </h1>
          <p className="mt-2 text-zinc-600">
            {t(
              "¿Taller o revendedor? Pegá tu lista de códigos y cotizá todo junto. Podés poner la cantidad antes o después del código.",
              "Oficina ou revendedor? Cole sua lista de códigos e peça orçamento de tudo junto. A quantidade pode vir antes ou depois do código.",
            )}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
          <label htmlFor="lista" className="mb-2 block text-sm font-semibold text-zinc-800">
            {t("Un código por línea", "Um código por linha")}
          </label>
          <textarea
            id="lista"
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={8}
            placeholder={"AL81843\n2x 6205\n3302160 4"}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3 font-mono text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={buscar}
              disabled={buscando || !texto.trim()}
              className="flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-bold text-white transition hover:bg-primary/90 disabled:opacity-50"
            >
              {buscando ? <Loader2 className="h-5 w-5 animate-spin" /> : <ListChecks className="h-5 w-5" />}
              {t("Buscar códigos", "Buscar códigos")}
            </button>
            {texto && (
              <button
                onClick={() => {
                  setTexto("");
                  setResultado(null);
                }}
                className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                <Trash2 className="h-4 w-4" /> {t("Limpiar", "Limpar")}
              </button>
            )}
          </div>
        </div>

        {resultado && (
          <div className="rounded-2xl bg-white p-4 shadow-sm md:p-6">
            <p className="mb-3 text-sm font-semibold text-zinc-700">
              {t("Encontramos", "Encontramos")} {encontrados.length} {t("de", "de")} {resultado.length} {t("códigos.", "códigos.")}
              {faltantes.length > 0 && t(" Los demás también te los cotizamos por WhatsApp.", " Os demais também orçamos pelo WhatsApp.")}
            </p>
            <ul className="divide-y text-sm">
              {resultado.map((r, i) => (
                <li key={i} className="flex items-center gap-3 py-2.5">
                  {r.produto ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-green-600" />
                  ) : (
                    <HelpCircle className="h-5 w-5 shrink-0 text-amber-500" />
                  )}
                  <span className="w-10 shrink-0 text-right font-semibold text-zinc-500">{r.qtd}x</span>
                  <div className="min-w-0 flex-1">
                    {r.produto ? (
                      <Link
                        to="/produto/$sku"
                        params={{ sku: r.produto.sku }}
                        className="block truncate font-semibold text-zinc-900 hover:text-primary"
                      >
                        {nomePeca(r.produto, idioma)}
                      </Link>
                    ) : (
                      <span className="block font-semibold text-zinc-900">{r.codigo}</span>
                    )}
                    <span className="block truncate text-xs text-zinc-500">
                      {r.produto ? `Cód. ${codigoExibicao(r.produto)}${r.produto.marca ? ` · ${r.produto.marca}` : ""}` : t("No está publicado: lo consultamos por vos", "Não está publicado: consultamos para você")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button
                onClick={enviarWhatsapp}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#25D366] px-5 py-3.5 font-bold text-white shadow-lg shadow-[#25D366]/30 hover:bg-[#1EBE57]"
              >
                <MessageCircle className="h-5 w-5" /> {t("Pedir precio de toda la lista", "Pedir preço da lista toda")}
              </button>
              {encontrados.length > 0 && (
                <button
                  onClick={agregarTodos}
                  className="flex items-center justify-center gap-2 rounded-xl border-2 border-primary px-5 py-3 font-bold text-primary hover:bg-primary hover:text-white"
                >
                  <ShoppingCart className="h-5 w-5" /> {t("Agregar a mi cotización", "Adicionar ao meu orçamento")}
                </button>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
