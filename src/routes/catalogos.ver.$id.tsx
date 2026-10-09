import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ZoomIn, ZoomOut, Loader2, ChevronUp, ChevronDown, ShieldCheck, MessageCircle } from "lucide-react";
import { verCatalogoFn } from "@/lib/catalogos";
import { whatsappContactUrl } from "@/lib/whatsapp";

// Visualizador de catálogos: desenha as páginas do PDF em <canvas> (pdf.js), sem botão de
// baixar ou imprimir, com marca d'água de quem está vendo. O arquivo só é entregue para
// pedidos deste visualizador (cabeçalho X-Visor), em partes (Range), sem cache.
export const Route = createFileRoute("/catalogos/ver/$id")({
  loader: async ({ params }) => {
    const r = await verCatalogoFn({ data: { id: Number(params.id) } });
    if (!r.catalogo) throw redirect({ to: "/catalogos" });
    if (r.catalogo.exige_login && !r.sessao) {
      throw redirect({ href: `/cadastro?redirect=${encodeURIComponent(`/catalogos/ver/${params.id}`)}` });
    }
    return r;
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.catalogo?.titulo ?? "Catálogo"} | AGRO PARTS` }, { name: "robots", content: "noindex" }],
  }),
  component: Visor,
});

type Pdf = { numPages: number; getPage: (n: number) => Promise<any>; destroy: () => Promise<void> };

function Visor() {
  const { catalogo, sessao } = Route.useLoaderData();
  const c = catalogo!;
  const marca = sessao ? `${sessao.nome} · ${sessao.email}` : "AGRO PARTS";
  const [pdf, setPdf] = useState<Pdf | null>(null);
  const [proporcao, setProporcao] = useState(1.414);
  const [erro, setErro] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [atual, setAtual] = useState(1);
  const [largura, setLargura] = useState(800);
  const area = useRef<HTMLDivElement>(null);

  // Carrega o documento só no navegador (pdf.js não roda no servidor)
  useEffect(() => {
    let doc: Pdf | null = null;
    let cancelado = false;
    (async () => {
      try {
        const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
        const worker: any = await import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url");
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        // Busca o arquivo em pedaços (Range), só as partes das páginas que a pessoa abre.
        // Só o primeiro pedaço vem marcado: é o que conta como uma "vista" no servidor.
        const pedaco = async (ini: number, fim: number, primeiro = false) => {
          const r = await fetch(`/catalogos/archivo/${c.id}`, {
            headers: { "X-Visor": "1", ...(primeiro && { "X-Visor-Inicio": "1" }), Range: `bytes=${ini}-${fim - 1}` },
            credentials: "include",
            cache: "no-store",
          });
          if (r.status !== 206) throw new Error(`HTTP ${r.status}`);
          return new Uint8Array(await r.arrayBuffer());
        };
        const total = c.tamanho;
        const inicio = await pedaco(0, Math.min(total, 1 << 16), true);
        const transporte = new pdfjs.PDFDataRangeTransport(total, inicio);
        transporte.requestDataRange = (ini: number, fim: number) => {
          pedaco(ini, fim).then((d) => transporte.onDataRange(ini, d)).catch(() => setErro("Se cortó la conexión. Recargá la página."));
        };
        doc = await pdfjs.getDocument({
          range: transporte,
          length: total,
          disableAutoFetch: true,
          disableStream: true,
          rangeChunkSize: 1 << 19,
          isEvalSupported: false,
        }).promise;
        if (cancelado) return void doc!.destroy();
        const p1 = await doc!.getPage(1);
        const vp = p1.getViewport({ scale: 1 });
        setProporcao(vp.height / vp.width);
        setPdf(doc);
      } catch (e) {
        console.error(e);
        if (!cancelado) setErro("No pudimos abrir el catálogo. Revisá tu conexión y probá de nuevo.");
      }
    })();
    return () => {
      cancelado = true;
      doc?.destroy();
    };
  }, [c.id]);

  // Largura disponível (acompanha giro do celular)
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setLargura(Math.min(el.clientWidth - 16, 1000)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Sem atalhos de salvar/imprimir
  useEffect(() => {
    const bloquear = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && ["s", "p"].includes(e.key.toLowerCase())) e.preventDefault();
    };
    window.addEventListener("keydown", bloquear);
    return () => window.removeEventListener("keydown", bloquear);
  }, []);

  const irPara = useCallback((n: number) => {
    if (!pdf) return;
    const p = Math.min(Math.max(1, n), pdf.numPages);
    document.getElementById(`pag-${p}`)?.scrollIntoView({ block: "start" });
  }, [pdf]);

  const w = Math.round(largura * zoom);

  return (
    <div className="visor-catalogo flex h-[100dvh] flex-col bg-zinc-800 select-none" onContextMenu={(e) => e.preventDefault()}>
      <style>{`@media print { .visor-catalogo { display: none !important } body::after { content: "Impresión no disponible"; } }`}</style>
      <header className="flex items-center gap-2 bg-[#06321b] px-3 py-2 text-white pt-safe">
        <Link to="/catalogos" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl hover:bg-white/10" aria-label="Volver a catálogos">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold leading-tight md:text-base">{c.titulo}</p>
          <p className="truncate text-[11px] text-white/60">{[c.marca, c.tipo].filter(Boolean).join(" · ")}</p>
        </div>
        {pdf && (
          <div className="flex items-center gap-1">
            <button onClick={() => irPara(atual - 1)} className="hidden h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10 sm:flex" aria-label="Página anterior"><ChevronUp className="h-5 w-5" /></button>
            <label className="flex items-center gap-1 text-xs text-white/80">
              <input
                key={atual}
                defaultValue={atual}
                inputMode="numeric"
                onKeyDown={(e) => e.key === "Enter" && irPara(Number((e.target as HTMLInputElement).value))}
                onBlur={(e) => irPara(Number(e.target.value))}
                className="h-8 w-12 rounded-md bg-white/10 text-center text-sm font-bold text-white outline-none focus:bg-white/20"
                aria-label="Ir a la página"
              />
              <span>/ {pdf.numPages}</span>
            </label>
            <button onClick={() => irPara(atual + 1)} className="hidden h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10 sm:flex" aria-label="Página siguiente"><ChevronDown className="h-5 w-5" /></button>
            <button onClick={() => setZoom((z) => Math.max(1, z - 0.5))} disabled={zoom <= 1} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10 disabled:opacity-30" aria-label="Alejar"><ZoomOut className="h-5 w-5" /></button>
            <button onClick={() => setZoom((z) => Math.min(3, z + 0.5))} disabled={zoom >= 3} className="flex h-9 w-9 items-center justify-center rounded-lg hover:bg-white/10 disabled:opacity-30" aria-label="Acercar"><ZoomIn className="h-5 w-5" /></button>
          </div>
        )}
      </header>

      <div ref={area} className="flex-1 overflow-auto overscroll-contain pb-safe">
        {erro ? (
          <div className="mx-auto mt-16 max-w-sm rounded-2xl bg-white p-6 text-center text-sm text-zinc-700">{erro}</div>
        ) : !pdf ? (
          <div className="mt-24 flex flex-col items-center gap-3 text-sm text-white/70">
            <Loader2 className="h-8 w-8 animate-spin" /> Abriendo catálogo…
          </div>
        ) : (
          <div className="mx-auto flex flex-col items-center gap-3 py-3" style={{ width: Math.max(w + 16, 0) }}>
            {Array.from({ length: pdf.numPages }, (_, i) => (
              <Pagina key={i} pdf={pdf} n={i + 1} largura={w} altura={Math.round(w * proporcao)} marca={marca} raiz={area} aoVer={setAtual} />
            ))}
          </div>
        )}
      </div>

      <footer className="hidden items-center justify-between gap-3 bg-zinc-900 px-4 py-2 text-xs text-white/60 md:flex">
        <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4" /> Solo lectura. Uso exclusivo de clientes de AGRO PARTS.</span>
        <a href={whatsappContactUrl(`Hola, estoy viendo el catálogo "${c.titulo}" y necesito un repuesto.`)} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 font-semibold text-emerald-400 hover:underline">
          <MessageCircle className="h-4 w-4" /> Cotizar una pieza de este catálogo
        </a>
      </footer>
    </div>
  );
}

// Uma página: só desenha quando está perto da tela e libera a memória quando sai
function Pagina({ pdf, n, largura, altura, marca, raiz, aoVer }: {
  pdf: Pdf; n: number; largura: number; altura: number; marca: string;
  raiz: React.RefObject<HTMLDivElement | null>; aoVer: (n: number) => void;
}) {
  const caixa = useRef<HTMLDivElement>(null);
  const tela = useRef<HTMLCanvasElement>(null);
  const [perto, setPerto] = useState(false);
  const [pronta, setPronta] = useState(false);

  useEffect(() => {
    const el = caixa.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setPerto(e.isIntersecting), { root: raiz.current, rootMargin: "150% 0px" });
    const io2 = new IntersectionObserver(([e]) => e.isIntersecting && aoVer(n), { root: raiz.current, threshold: 0.5 });
    io.observe(el);
    io2.observe(el);
    return () => { io.disconnect(); io2.disconnect(); };
  }, [n, raiz, aoVer]);

  useEffect(() => {
    const cv = tela.current;
    if (!perto || !cv || largura <= 0) {
      if (cv) { cv.width = 0; cv.height = 0; }
      setPronta(false);
      return;
    }
    let tarefa: any;
    let cancelado = false;
    (async () => {
      const page = await pdf.getPage(n);
      if (cancelado) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const vp = page.getViewport({ scale: (largura / page.getViewport({ scale: 1 }).width) * dpr });
      cv.width = Math.floor(vp.width);
      cv.height = Math.floor(vp.height);
      tarefa = page.render({ canvasContext: cv.getContext("2d")!, viewport: vp });
      try {
        await tarefa.promise;
      } catch {
        return;
      }
      if (cancelado) return;
      desenharMarca(cv.getContext("2d")!, cv.width, cv.height, marca, dpr);
      setPronta(true);
    })();
    return () => { cancelado = true; tarefa?.cancel(); };
  }, [perto, pdf, n, largura, marca]);

  return (
    <div id={`pag-${n}`} ref={caixa} className="relative shrink-0 bg-white shadow-lg" style={{ width: largura, height: altura }} onDragStart={(e) => e.preventDefault()}>
      <canvas ref={tela} className="block h-full w-full" />
      {!pronta && <div className="absolute inset-0 flex items-center justify-center text-sm text-zinc-400">{n}</div>}
    </div>
  );
}

// Marca d'água desenhada dentro da imagem da página (não dá para esconder com o inspetor)
function desenharMarca(ctx: CanvasRenderingContext2D, w: number, h: number, texto: string, dpr: number) {
  ctx.save();
  ctx.globalAlpha = 0.09;
  ctx.fillStyle = "#06321b";
  ctx.font = `700 ${Math.round(15 * dpr)}px sans-serif`;
  ctx.translate(w / 2, h / 2);
  ctx.rotate(-Math.PI / 6);
  const passoX = ctx.measureText(texto).width + 80 * dpr;
  const passoY = 110 * dpr;
  const r = Math.hypot(w, h);
  for (let y = -r; y < r; y += passoY) {
    for (let x = -r + ((y / passoY) % 2 ? passoX / 2 : 0); x < r; x += passoX) ctx.fillText(texto, x, y);
  }
  ctx.restore();
}
