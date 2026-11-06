import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  BellRing,
  Check,
  Copy,
  Download,
  EllipsisVertical,
  Gauge,
  Smartphone,
  Ticket,
  Zap,
} from "lucide-react";
import { SiteHeader } from "@/components/SiteHeader";
import { AtivarAvisosGrande, BotaoInstalar, PassosIos, useApp } from "@/components/AppInstalavel";
import { navegadorDeApp } from "@/lib/app-pwa";
import { registrarEvento } from "@/lib/eventos";
import { linksIdioma, tr, useT, type Idioma } from "@/lib/idioma";
import { SITE_URL } from "@/lib/site";
import { qrSiteFn } from "@/lib/qr";

// Página do app (/app em espanhol, /pt/app em português). Mostra o jeito certo de instalar em cada
// aparelho; o app instalado a partir daqui é o do idioma da página (manifest em src/routes/__root.tsx).
export const Route = createFileRoute("/app")({
  head: ({ match }) => {
    const idioma: Idioma = (match.context as any)?.idioma ?? "es";
    const t = (es: string, pt: string) => tr(idioma, es, pt);
    const titulo = t(
      "App de AGRO PARTS: repuestos agrícolas en tu celular",
      "App da AGRO PARTS: peças agrícolas no seu celular",
    );
    const desc = t(
      "Instalá gratis el app de AGRO PARTS: abrí la tienda con un toque, buscá por código y recibí avisos cuando baja el precio de un repuesto.",
      "Instale grátis o app da AGRO PARTS: abra a loja com um toque, busque pelo código e receba avisos quando o preço de uma peça baixar.",
    );
    return {
      meta: [
        { title: titulo },
        { name: "description", content: desc },
        { property: "og:title", content: titulo },
        { property: "og:description", content: desc },
      ],
      links: linksIdioma("/app", idioma),
    };
  },
  component: PaginaApp,
});

function PaginaApp() {
  const { t, idioma, href } = useT();
  const { plat } = useApp();
  const [pronto, setPronto] = useState(false); // já leu a plataforma no navegador
  const [instalou, setInstalou] = useState(false);
  const contou = useRef(false);
  useEffect(() => setPronto(true), []);
  useEffect(() => {
    if (!pronto || contou.current) return;
    contou.current = true;
    registrarEvento("app", `pagina_vista:${plat}`);
  }, [pronto, plat]);

  const beneficios = [
    {
      icone: Zap,
      titulo: t("Abrí la tienda con un toque", "Abra a loja com um toque"),
      texto: t(
        "El ícono queda en tu pantalla, como cualquier app. Sin buscar el sitio.",
        "O ícone fica na sua tela, como qualquer app. Sem procurar o site.",
      ),
    },
    {
      icone: BellRing,
      titulo: t("Aviso cuando baja el precio", "Aviso quando o preço baixar"),
      texto: t(
        "Pedí seguir un repuesto y te llega la notificación cuando baja.",
        "Peça para acompanhar uma peça e a notificação chega quando baixar.",
      ),
    },
    {
      icone: Ticket,
      titulo: t("Ofertas y cupones primero", "Ofertas e cupons primeiro"),
      texto: t(
        "Te avisamos de las promociones antes que a todos.",
        "Avisamos das promoções antes de todo mundo.",
      ),
    },
    {
      icone: Gauge,
      titulo: t("Liviano y gratis", "Leve e grátis"),
      texto: t(
        "No ocupa casi espacio y no hace falta la tienda de apps.",
        "Quase não ocupa espaço e não precisa da loja de apps.",
      ),
    },
  ];

  const perguntas = [
    [t("¿Cuesta algo?", "Custa alguma coisa?"), t("No. Es gratis.", "Não. É grátis.")],
    [
      t("¿Por qué no está en la tienda de apps?", "Por que não está na loja de apps?"),
      t(
        "Se instala directo desde el sitio: es más liviano y siempre está actualizado.",
        "Ele instala direto pelo site: é mais leve e está sempre atualizado.",
      ),
    ],
    [
      t("¿Funciona en iPhone?", "Funciona no iPhone?"),
      t(
        "Sí, desde Safari (Compartir → Agregar a inicio). Los avisos llegan en iPhone con iOS 16.4 o más nuevo.",
        "Sim, pelo Safari (Compartilhar → Adicionar à Tela de Início). Os avisos chegam no iPhone com iOS 16.4 ou mais novo.",
      ),
    ],
    [
      t("¿Cómo lo desinstalo?", "Como desinstalo?"),
      t(
        "Como cualquier app: mantené apretado el ícono y elegí eliminar.",
        "Como qualquer app: segure o ícone e escolha remover.",
      ),
    ],
  ];

  return (
    <div className="min-h-screen bg-zinc-100">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-3 py-8 md:px-4 md:py-14">
        <section className="grid items-center gap-10 md:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary">
              <Smartphone className="h-3.5 w-3.5" /> {t("App gratis", "App grátis")}
            </span>
            <h1 className="mt-3 text-3xl font-black leading-tight text-zinc-900 md:text-5xl">
              {t("AGRO PARTS en tu celular", "A AGRO PARTS no seu celular")}
            </h1>
            <p className="mt-3 max-w-xl text-lg text-zinc-600">
              {t(
                "Buscá repuestos por código, cotizá por WhatsApp y recibí un aviso cuando baja el precio. Todo a un toque.",
                "Busque peças pelo código, peça orçamento pelo WhatsApp e receba um aviso quando o preço baixar. Tudo a um toque.",
              )}
            </p>

            <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
              {!pronto ? (
                <div className="h-14" />
              ) : plat === "app" || instalou ? (
                <div className="space-y-3">
                  <p className="flex items-center gap-2 text-base font-bold text-emerald-700">
                    <Check className="h-5 w-5" />
                    {instalou
                      ? t(
                          "¡Listo! Abrí AGRO PARTS desde el ícono en tu pantalla.",
                          "Pronto! Abra a AGRO PARTS pelo ícone na sua tela.",
                        )
                      : t("Ya estás usando el app.", "Você já está usando o app.")}
                  </p>
                  <AtivarAvisosGrande origem="pagina" />
                </div>
              ) : plat === "instalavel" ? (
                <div className="space-y-3">
                  <BotaoInstalar
                    origem="pagina"
                    grande
                    className="w-full"
                    aoTerminar={(r) => r === "aceito" && setInstalou(true)}
                  />
                  <p className="text-center text-xs text-zinc-500">
                    {t(
                      "Gratis · se instala en segundos · sin tienda de apps",
                      "Grátis · instala em segundos · sem loja de apps",
                    )}
                  </p>
                </div>
              ) : plat === "ios_safari" ? (
                <div>
                  <p className="mb-3 font-bold text-zinc-900">
                    {t("Instalalo en tu iPhone en 3 pasos:", "Instale no seu iPhone em 3 passos:")}
                  </p>
                  <PassosIos claro />
                </div>
              ) : plat === "ios_outro" ? (
                <AbrirNoNavegador
                  titulo={t("Abrí esta página en Safari", "Abra esta página no Safari")}
                  texto={
                    navegadorDeApp()
                      ? t(
                          "Estás dentro de Instagram o Facebook. Tocá ··· arriba y elegí «Abrir en el navegador», o copiá el link y pegalo en Safari.",
                          "Você está dentro do Instagram ou Facebook. Toque em ··· em cima e escolha «Abrir no navegador», ou copie o link e cole no Safari.",
                        )
                      : t(
                          "En iPhone el app se instala desde Safari. Copiá el link y pegalo en Safari.",
                          "No iPhone o app instala pelo Safari. Copie o link e cole no Safari.",
                        )
                  }
                />
              ) : plat === "android" ? (
                navegadorDeApp() ? (
                  <AbrirNoNavegador
                    titulo={t("Abrí esta página en Chrome", "Abra esta página no Chrome")}
                    texto={t(
                      "Estás dentro de Instagram o Facebook. Tocá ⋮ arriba y elegí «Abrir en Chrome», o copiá el link.",
                      "Você está dentro do Instagram ou Facebook. Toque em ⋮ em cima e escolha «Abrir no Chrome», ou copie o link.",
                    )}
                  />
                ) : (
                  <div className="space-y-2 text-sm text-zinc-700">
                    <p className="font-bold text-zinc-900">
                      {t(
                        "Instalalo desde el menú del navegador:",
                        "Instale pelo menu do navegador:",
                      )}
                    </p>
                    <p className="flex items-start gap-2">
                      <EllipsisVertical className="mt-0.5 h-4 w-4 shrink-0" />
                      {t(
                        "Tocá el menú ⋮ (arriba a la derecha) y elegí «Instalar app» o «Agregar a pantalla principal».",
                        "Toque no menu ⋮ (em cima, à direita) e escolha «Instalar app» ou «Adicionar à tela inicial».",
                      )}
                    </p>
                  </div>
                )
              ) : (
                <QrCelular url={`${SITE_URL}${href("/app")}?utm_source=app&utm_medium=qr`} />
              )}
              {pronto &&
                plat !== "app" &&
                !instalou &&
                plat !== "ios_safari" &&
                plat !== "ios_outro" && (
                  <div className="mt-4 border-t pt-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                      {t("O sin instalar:", "Ou sem instalar:")}
                    </p>
                    <AtivarAvisosGrande origem="pagina" />
                  </div>
                )}
            </div>
          </div>

          <div className="mx-auto w-full max-w-[300px]">
            <div className="rounded-[2.6rem] bg-zinc-900 p-3 shadow-2xl ring-1 ring-black/20">
              <img
                src={`/img/app/captura-${idioma === "pt" ? "pt-inicio" : "es-inicio"}.jpg`}
                alt={t("El app de AGRO PARTS en el celular", "O app da AGRO PARTS no celular")}
                width={390}
                height={844}
                loading="lazy"
                className="w-full rounded-[2rem]"
              />
            </div>
          </div>
        </section>

        <section className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {beneficios.map((b) => (
            <div key={b.titulo} className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
              <b.icone className="h-6 w-6 text-primary" />
              <h2 className="mt-3 font-bold text-zinc-900">{b.titulo}</h2>
              <p className="mt-1 text-sm text-zinc-600">{b.texto}</p>
            </div>
          ))}
        </section>

        <section className="mt-14 max-w-3xl">
          <h2 className="text-2xl font-black text-zinc-900">
            {t("Preguntas frecuentes", "Perguntas frequentes")}
          </h2>
          <div className="mt-4 divide-y rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
            {perguntas.map(([p, r]) => (
              <details key={p} className="group p-5">
                <summary className="cursor-pointer list-none font-semibold text-zinc-900">
                  {p}
                </summary>
                <p className="mt-2 text-sm text-zinc-600">{r}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function AbrirNoNavegador({ titulo, texto }: { titulo: string; texto: string }) {
  const { t } = useT();
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="space-y-3">
      <p className="font-bold text-zinc-900">{titulo}</p>
      <p className="text-sm text-zinc-600">{texto}</p>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(window.location.href.split("?")[0]).then(() => {
            setCopiado(true);
            registrarEvento("app", "copiou_link");
          });
        }}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3.5 font-bold text-white"
      >
        {copiado ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
        {copiado ? t("Link copiado", "Link copiado") : t("Copiar link", "Copiar link")}
      </button>
    </div>
  );
}

// Computador: QR code para abrir esta página no celular
function QrCelular({ url }: { url: string }) {
  const { t } = useT();
  const [qr, setQr] = useState<string | null>(null);
  useEffect(() => {
    qrSiteFn({ data: { url } })
      .then(setQr)
      .catch(() => setQr(null));
  }, [url]);
  return (
    <div className="flex items-center gap-5">
      {qr ? (
        <img
          src={qr}
          alt="QR"
          width={150}
          height={150}
          className="h-[150px] w-[150px] rounded-lg"
        />
      ) : (
        <div className="h-[150px] w-[150px] rounded-lg bg-zinc-100" />
      )}
      <div>
        <p className="flex items-center gap-2 font-bold text-zinc-900">
          <Download className="h-4 w-4 text-primary" />
          {t("Escaneá con la cámara del celular", "Aponte a câmera do celular")}
        </p>
        <p className="mt-1 text-sm text-zinc-600">
          {t(
            "Se abre esta página en tu celular, con el botón para instalar.",
            "Esta página abre no seu celular, com o botão para instalar.",
          )}
        </p>
      </div>
    </div>
  );
}
