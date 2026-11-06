import { createServerFn } from "@tanstack/react-start";

// Admin → App e notificações: números do app instalado, inscritos nos avisos e envio de push.
const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  return assertAdmin();
};

export const painelPushFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const { painelPush } = await import("./push.server");
  const { prisma } = await import("./prisma");
  const { eventosProntos } = await import("./eventos-db.server");
  await eventosProntos();
  const desde = new Date(Date.now() - 30 * 86400_000);
  const ev = await prisma.site_eventos.findMany({
    where: { tipo: "app", created_at: { gte: desde } },
    select: { dado: true, visitor_id: true, pagina: true },
    take: 50_000,
  });
  // Idioma pela página onde aconteceu: /pt = Brasil (app em português), o resto = Uruguai
  const idiomaDe = (p: string | null) => (p && /^\/pt(\/|$|\?)/.test(p) ? "pt" : "es");
  // Pessoas (aparelhos) diferentes que fizeram a ação; sem visitante, conta o evento
  const pessoas = (lista: typeof ev) => new Set(lista.map((e, i) => e.visitor_id ?? `ev${i}`)).size;
  const passo = (lista: typeof ev, prefixo: string) =>
    pessoas(lista.filter((e) => e.dado === prefixo || e.dado.startsWith(prefixo + ":")));
  const funil = (lista: typeof ev) => ({
    viramBarra: passo(lista, "barra_vista"),
    tocaramBarra: passo(lista, "barra_clique"),
    fecharamBarra: passo(lista, "barra_fechou"),
    viramPagina: passo(lista, "pagina_vista"),
    tocaramInstalar: passo(lista, "clique_instalar"),
    instrucoesIos: passo(lista, "instrucoes_ios"),
    instalaram: passo(lista, "instalou"),
    abriramApp: passo(lista, "abriu_app"),
    ativaramAvisos: passo(lista, "avisos"),
    recusaramAvisos: passo(lista, "avisos_recusou"),
  });
  const porIdioma = {
    es: funil(ev.filter((e) => idiomaDe(e.pagina) === "es")),
    pt: funil(ev.filter((e) => idiomaDe(e.pagina) === "pt")),
  };
  // Barra: cada momento (motivo) e quantos tocaram ou fecharam
  const MOTIVOS = ["visita_repetida", "whatsapp", "aviso_preco", "cadastro"] as const;
  const porMotivo = MOTIVOS.map((m) => ({
    motivo: m,
    vistas: passo(ev, `barra_vista:${m}`),
    toques: passo(ev, `barra_clique:${m}`),
    fechou: passo(ev, `barra_fechou:${m}`),
  }));
  // De onde veio cada instalação (Android/computador; no iPhone o navegador não avisa)
  const origens: Record<string, number> = {};
  for (const e of ev)
    if (e.dado.startsWith("instalou:")) {
      const o = e.dado.split(":")[1] || "navegador";
      origens[o] = (origens[o] ?? 0) + 1;
    }
  // Aparelho de quem viu a página /app (decide qual instrução apareceu)
  const plataformas: Record<string, number> = {};
  for (const e of ev)
    if (e.dado.startsWith("pagina_vista:")) {
      const p = e.dado.split(":")[1];
      plataformas[p] = (plataformas[p] ?? 0) + 1;
    }
  const total = funil(ev);
  return {
    ...(await painelPush()),
    app: {
      instalaram: total.instalaram,
      aberturas: total.abriramApp,
      instrucoesIos: total.instrucoesIos,
      ativaramAvisos: total.ativaramAvisos,
      recusaramAvisos: total.recusaramAvisos,
    },
    funilApp: { porIdioma, porMotivo, origens, plataformas },
  };
});

export type NovoPush = {
  titulo: string;
  texto: string;
  url: string;
  imagem: string;
  idioma: "es" | "pt";
  teste: boolean;
};

export const enviarPushFn = createServerFn({ method: "POST" })
  .validator((d: NovoPush) => {
    const titulo = String(d?.titulo ?? "")
      .trim()
      .slice(0, 120);
    const url =
      String(d?.url ?? "")
        .trim()
        .slice(0, 300) || "/";
    if (!titulo) throw new Error("Escreva o título.");
    if (!url.startsWith("/")) throw new Error("O link é um caminho do site, começando com /.");
    const imagem = String(d?.imagem ?? "")
      .trim()
      .slice(0, 300);
    if (imagem && !/^https:\/\//.test(imagem))
      throw new Error("A imagem precisa ser um link https.");
    return {
      titulo,
      texto: String(d?.texto ?? "")
        .trim()
        .slice(0, 300),
      url,
      imagem,
      idioma: d?.idioma === "pt" ? ("pt" as const) : ("es" as const),
      teste: !!d?.teste,
    };
  })
  .handler(async ({ data }) => {
    const s = await admin();
    const { enviarPush } = await import("./push.server");
    const r = await enviarPush(
      data.teste
        ? { tipo: "pessoa", userId: Number(s.id) || null }
        : { tipo: "todos", idioma: data.idioma },
      {
        titulo: data.titulo,
        texto: data.texto,
        url: data.url,
        imagem: data.imagem || null,
        tag: data.teste ? "teste" : undefined,
      },
      data.teste ? "teste" : "admin",
    );
    return r;
  });
