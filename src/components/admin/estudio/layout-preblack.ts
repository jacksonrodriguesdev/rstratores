// Layout amarelo da Pré-Black (o mesmo de marketing/pre-black-amarelo/gerar.mjs: moldura
// «PRÉ-BLACK / FRIDAY», balões, confete, logo, peça no pedestal, fitas) gerado no navegador:
// o HTML/CSS vira imagem por SVG <foreignObject>, com fontes, logo e foto embutidas (data:),
// então a arte sai igual à da campanha. Variações: desconto, preço, WhatsApp, código; etiqueta
// opcional (ex.: «Envíos a Rocha», «Para la siembra»); post 4:5 e story 9:16; ES e PT.
import { fotoRecortada } from "./artes";

export type VariantePB = "desconto" | "preco" | "whatsapp" | "codigo";
export type FormatoPB = "feed" | "story";
export type PecaPB = {
  nome: string;
  codigo: string;
  marca?: string | null;
  extra?: string | null;
  foto?: string | null;
  preco?: {
    uyu?: string | null;
    brl?: string | null;
    deUyu?: string | null;
    deBrl?: string | null;
    desconto?: number;
  } | null;
};
export type OpcoesPB = {
  variante: VariantePB;
  formato: FormatoPB;
  idioma: "es" | "pt";
  fase?: "pre" | "black";
  peca: PecaPB;
  desconto?: number; // da campanha, quando a peça não tem o seu
  etiqueta?: string | null;
};
export const VARIANTES_PB: Array<[VariantePB, string]> = [
  ["desconto", "% de desconto"],
  ["preco", "Com preço"],
  ["whatsapp", "WhatsApp"],
  ["codigo", "Código grande"],
];

type Textos = {
  pre: string;
  desc: (f: string) => string;
  veja: string;
  oferta: string;
  moeda: string;
  para: string;
  cod: string;
  zap: string;
  zapSub: string;
  codTit: string;
  codSub: string;
};
const TXT: Record<"es" | "pt", Textos> = {
  es: {
    pre: "PRE",
    desc: (f: string) =>
      f === "black" ? "DE DESCUENTO EN LA BLACK" : "DE DESCUENTO EN LA PRE BLACK",
    veja: "Mirá el precio en agropartsuy.com",
    oferta: "¡OFERTAS VÁLIDAS HASTA AGOTAR STOCK!",
    moeda: "$U",
    para: "Para",
    cod: "Cód.",
    zap: "PEDILA POR WHATSAPP",
    zapSub: "Te respondemos en minutos con precio y envío",
    codTit: "¿BUSCÁS ESTE CÓDIGO?",
    codSub: "Lo tenemos. Envío por DAC a todo Uruguay.",
  },
  pt: {
    pre: "PRÉ",
    desc: (f: string) => (f === "black" ? "DE DESCONTO NA BLACK" : "DE DESCONTO NA PRÉ-BLACK"),
    veja: "Veja o preço em agropartsuy.com/pt",
    oferta: "OFERTAS VÁLIDAS ENQUANTO DURAREM OS ESTOQUES!",
    moeda: "R$",
    para: "Para",
    cod: "Cód.",
    zap: "PEÇA PELO WHATSAPP",
    zapSub: "Respondemos em minutos com preço e envio",
    codTit: "PROCURA ESTE CÓDIGO?",
    codSub: "Temos. Envio para todo o RS.",
  },
};
const WHATS = "+55 53 99183-1101";
const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---------------------------------------------------------------- recursos embutidos
const paraDataUrl = (b: Blob) =>
  new Promise<string>((ok, erro) => {
    const fr = new FileReader();
    fr.onload = () => ok(String(fr.result));
    fr.onerror = () => erro(new Error("Falha ao ler"));
    fr.readAsDataURL(b);
  });
let fontes: Promise<string> | null = null;
// @font-face de Anton e Archivo (largura variável) em base64: só latin e latin-ext
function fontesEmbutidas() {
  fontes ??= (async () => {
    try {
      const css = await (
        await fetch(
          "https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,500..900&family=Anton&display=swap",
        )
      ).text();
      const blocos = css
        .split(/(?=\/\*\s*[\w-]+\s*\*\/)/)
        .filter((b) => /\/\*\s*(latin|latin-ext)\s*\*\//.test(b));
      const out: string[] = [];
      for (const b of blocos) {
        const m = b.match(/url\((https:[^)]+)\)/);
        if (!m) continue;
        const data = await paraDataUrl(await (await fetch(m[1])).blob());
        out.push(b.replace(m[1], data).replace(/\/\*[^*]*\*\//, ""));
      }
      return out.join("\n");
    } catch {
      return ""; // sem internet: usa as fontes do sistema
    }
  })();
  return fontes;
}
let logo: Promise<string> | null = null;
const logoEmbutido = () =>
  (logo ??= fetch("/logo.png")
    .then((r) => r.blob())
    .then(paraDataUrl));

// ---------------------------------------------------------------- HTML (mesmo do gerar.mjs)
const CSS = `
  * { box-sizing:border-box; margin:0; padding:0 }
  .r { font-family:"Archivo",sans-serif; -webkit-font-smoothing:antialiased }
  .l { position:relative; overflow:hidden }
  .amarelo { background:radial-gradient(70% 55% at 50% 42%, #ffe14d 0%, #f9c80e 55%, #eeb500 100%) }
  .balao { position:absolute; border-radius:50% 50% 48% 48%; }
  .balao::after { content:""; position:absolute; left:50%; bottom:-14px; width:14px; height:16px; transform:translateX(-50%); background:inherit; clip-path:polygon(50% 0,100% 100%,0 100%); filter:brightness(.8) }
  .ouro { background:radial-gradient(circle at 32% 28%, #fff6c4 0%, #ffd84a 22%, #e8a800 60%, #9a6d00 100%) }
  .negro { background:radial-gradient(circle at 32% 28%, #6b6b6b 0%, #232323 30%, #070707 75%) }
  .confete { position:absolute; width:12px; height:22px; border-radius:2px }
  .anton { font-family:"Anton",sans-serif; text-transform:uppercase; letter-spacing:.5px }
  .fita { position:absolute; left:-120px; right:-120px; height:62px; display:flex; align-items:center; gap:46px; white-space:nowrap; font-family:"Archivo"; font-weight:900; font-stretch:80%; font-size:30px; letter-spacing:1px; box-shadow:0 8px 24px rgba(0,0,0,.35) }
  .fita-p { background:#0b0b0b; color:#f9c80e; border-top:4px solid #f9c80e; border-bottom:4px solid #f9c80e }
  .fita-a { background:#f9c80e; color:#0b0b0b; border-top:4px solid #0b0b0b; border-bottom:4px solid #0b0b0b }
`;
const BALOES: Record<"esq" | "dir", Array<[number, number, number, number]>> = {
  esq: [
    [-70, -60, 190, 1],
    [80, -90, 160, 0],
    [-40, 110, 150, 0],
    [150, 40, 120, 1],
    [40, 230, 110, 1],
  ],
  dir: [
    [920, -70, 190, 0],
    [790, -100, 160, 1],
    [960, 110, 150, 1],
    [830, 50, 120, 0],
    [990, 260, 110, 0],
  ],
};
const baloes = () =>
  (["esq", "dir"] as const)
    .flatMap((l) =>
      BALOES[l].map(
        ([x, y, s, o]) =>
          `<div class="balao ${o ? "ouro" : "negro"}" style="left:${x}px;top:${y}px;width:${s}px;height:${s * 1.12}px;box-shadow:0 18px 30px rgba(0,0,0,.35)"></div>`,
      ),
    )
    .join("");
function confete(
  w: number,
  h: number,
  n: number,
  seed: number,
  livre: [number, number, number, number],
) {
  let s = seed;
  const rnd = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  const cores = ["#0b0b0b", "#fff3b0", "#b88400"];
  return Array.from({ length: n }, () => {
    const x = rnd() * w,
      y = rnd() * h,
      r = rnd() * 360,
      c = cores[Math.floor(rnd() * cores.length)],
      t = 0.6 + rnd() * 0.8;
    if (x > livre[0] && x < livre[2] && y > livre[1] && y < livre[3]) return "";
    return `<div class="confete" style="left:${x}px;top:${y}px;background:${c};transform:rotate(${r}deg) scale(${t})"></div>`;
  }).join("");
}
const fitas = (pre: string, h: number, base: number, fase: string) => {
  const txt = Array.from(
    { length: 12 },
    () => `<span>${fase === "black" ? "" : `${pre}-`}BLACK FRIDAY</span>`,
  ).join("");
  return `<div class="fita fita-a" style="top:${h - 150 - base}px;transform:rotate(-6deg)">${txt}</div>
  <div class="fita fita-p" style="top:${h - 95 - base}px;transform:rotate(3deg)">${txt}</div>`;
};
const marca = (logoUrl: string, tam: number) =>
  `<div style="display:flex;align-items:center;gap:${16 * tam}px">
    <img src="${logoUrl}" style="width:${86 * tam}px;height:${86 * tam}px;border-radius:${22 * tam}px;background:#fff;padding:${6 * tam}px;box-shadow:0 8px 24px rgba(0,0,0,.25)"/>
    <div><div style="font-weight:900;font-stretch:85%;font-size:${54 * tam}px;line-height:.95;color:#0b0b0b;letter-spacing:.5px">AGRO PARTS</div>
    <div style="font-weight:800;font-size:${15 * tam}px;letter-spacing:${5 * tam}px;color:#0b0b0b;margin-top:4px">REPUESTOS · PEÇAS AGRÍCOLAS</div></div></div>`;
const moldura = (pre: string, fase: string) => `
  <div style="padding:10px;border:5px solid #0b0b0b;background:#f9c80e">
    <div style="border:4px solid #0b0b0b;background:#f9c80e">
      <div class="anton" style="font-size:96px;line-height:1.08;white-space:nowrap;color:#0b0b0b;text-align:center;padding:14px 36px 0">${fase === "black" ? "BLACK" : `${pre}-BLACK`}</div>
      <div class="anton" style="background:#0b0b0b;color:#fff;font-size:86px;line-height:1.12;white-space:nowrap;text-align:center;padding:0 36px 4px">FRIDAY</div>
    </div></div>`;
const pedestal = (x: number, y: number, w: number) => `
  <div style="position:absolute;left:${x}px;top:${y}px;width:${w}px;height:${w * 0.42}px">
    <div style="position:absolute;left:0;right:0;top:${w * 0.09}px;bottom:0;border-radius:0 0 ${w / 2}px ${w / 2}px / 0 0 ${w * 0.1}px ${w * 0.1}px;background:linear-gradient(90deg,#050505,#2b2b2b 30%,#0f0f0f 55%,#3a3a3a 80%,#050505);box-shadow:0 30px 40px rgba(0,0,0,.35)"></div>
    <div style="position:absolute;left:0;right:0;top:${w * 0.09}px;height:${w * 0.07}px;background:linear-gradient(90deg,#8a6500,#ffe27a 30%,#c99a06 60%,#ffe27a 85%,#8a6500)"></div>
    <div style="position:absolute;left:0;right:0;top:0;height:${w * 0.18}px;border-radius:50%;background:radial-gradient(ellipse at 50% 40%,#3a3a3a,#0b0b0b 70%);border:6px solid #e0ac00;box-shadow:inset 0 0 0 4px #7a5a00"></div>
  </div>`;
const ICONE_ZAP = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="58" height="58" fill="#fff"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.5 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .1-3.3-.8-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.3-.3.6-.3.8-.3h.6c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .6l-.4.6-.4.4c-.1.2-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.7-.1l.9-1.1c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.1z"/></svg>`;

function precoGrande(valor: string, moeda: string, tam: number) {
  const v = valor.replace(/^(R\$|\$U)\s*/, "");
  const [int, cent] = v.split(",");
  return `<div style="display:flex;align-items:flex-start;gap:6px;color:#0b0b0b">
    <span class="anton" style="font-size:${tam * 0.3}px;margin-top:${tam * 0.12}px">${moeda}</span>
    <span class="anton" style="font-size:${tam}px;line-height:.92">${esc(int)}</span>
    ${cent ? `<span class="anton" style="font-size:${tam * 0.3}px;margin-top:${tam * 0.58}px">,${esc(cent)}</span>` : ""}</div>`;
}

// Bloco da direita (feed) / de baixo (story) conforme a variante
function blocoVariante(o: OpcoesPB, t: Textos, story: boolean) {
  const p = o.peca;
  const fase = o.fase ?? "pre";
  const pct = p.preco?.desconto || o.desconto || 0;
  const valor = o.idioma === "pt" ? p.preco?.brl : p.preco?.uyu;
  const de = o.idioma === "pt" ? p.preco?.deBrl : p.preco?.deUyu;
  const centro = story ? "justify-content:center;" : "";
  if (o.variante === "preco" && valor)
    return `<div style="margin-top:${story ? 18 : 26}px;display:flex;align-items:center;gap:14px;${centro}">
        ${de ? `<span style="font-weight:800;font-size:${story ? 34 : 28}px;color:#3a2d00;text-decoration:line-through;text-decoration-thickness:3px">${esc(de)}</span>` : ""}
        ${pct ? `<span class="anton" style="background:#0b0b0b;color:#f9c80e;font-size:${story ? 36 : 30}px;padding:4px 14px;border-radius:10px">-${pct}%</span>` : ""}
      </div>
      <div style="margin-top:6px;display:flex;${centro}">${precoGrande(valor, t.moeda, story ? 140 : valor.length > 12 ? 108 : 132)}</div>
      <div style="margin-top:18px;font-weight:900;font-size:${story ? 24 : 21}px;line-height:1.25;color:#0b0b0b">${t.oferta}</div>`;
  if (o.variante === "whatsapp")
    return `<div style="margin-top:${story ? 22 : 28}px;display:inline-flex;align-items:center;gap:18px;background:#1fa855;border-radius:22px;padding:18px 26px;box-shadow:0 14px 30px rgba(0,0,0,.25)">
        ${ICONE_ZAP}
        <div style="text-align:left"><div class="anton" style="font-size:${story ? 50 : 44}px;line-height:1;color:#fff">${t.zap}</div>
        <div style="font-weight:900;font-size:${story ? 30 : 27}px;color:#fff;margin-top:6px;letter-spacing:.5px">${WHATS}</div></div></div>
      <div style="margin-top:18px;font-weight:900;font-size:${story ? 26 : 22}px;line-height:1.25;color:#0b0b0b">${t.zapSub}</div>
      ${pct ? `<div style="margin-top:10px;display:inline-block" class="anton"><span style="background:#0b0b0b;color:#f9c80e;font-size:${story ? 40 : 34}px;padding:4px 16px;border-radius:12px">-${pct}% ${fase === "black" ? "BLACK" : `${t.pre}-BLACK`}</span></div>` : ""}`;
  if (o.variante === "codigo") {
    // Anton: cada dígito ~0,5 da altura; cabe em ~350 px no post (a coluna tem 410)
    const tc = Math.max(48, Math.min(110, Math.floor(350 / (Math.max(1, p.codigo.length) * 0.5))));
    return `<div style="margin-top:${story ? 18 : 26}px;display:inline-block;background:#0b0b0b;border-radius:22px;padding:16px 28px 20px;text-align:${story ? "center" : "left"}">
        <div class="anton" style="font-size:${story ? 34 : 30}px;line-height:1.1;color:#fff">${t.codTit}</div>
        <div class="anton" style="font-size:${story ? tc * 1.15 : tc}px;line-height:1.05;color:#f9c80e;white-space:nowrap">${esc(p.codigo)}</div></div>
      <div style="margin-top:18px;font-weight:900;font-size:${story ? 26 : 22}px;line-height:1.25;color:#0b0b0b">${t.codSub}</div>
      ${pct ? `<div style="margin-top:10px;font-weight:900;font-size:${story ? 24 : 21}px;color:#2b2100">-${pct}% · ${t.veja}</div>` : `<div style="margin-top:10px;font-weight:800;font-size:${story ? 22 : 19}px;color:#2b2100">${t.veja}</div>`}`;
  }
  // desconto (padrão)
  if (story)
    return `<div style="margin-top:18px;display:inline-flex;align-items:center;gap:22px;background:#0b0b0b;border-radius:26px;padding:10px 32px">
        <span class="anton" style="font-size:108px;line-height:1;color:#f9c80e">-${pct || 20}%</span>
        <span class="anton" style="font-size:34px;line-height:1.1;color:#fff;text-align:left">${t.desc(fase).replace(/ (NA|EN LA) /, "<br/>$1 ")}</span></div>
      <div style="margin-top:20px;font-weight:900;font-size:28px;color:#0b0b0b">${t.veja}</div>`;
  return `<div style="margin-top:26px;display:inline-block;background:#0b0b0b;border-radius:22px;padding:14px 26px 18px">
      <div class="anton" style="font-size:150px;line-height:1;color:#f9c80e">-${pct || 20}%</div>
      <div class="anton" style="font-size:${o.idioma === "es" ? 25 : 30}px;line-height:1.1;color:#fff;margin-top:4px;white-space:nowrap">${t.desc(fase)}</div></div>
    <div style="margin-top:20px;font-weight:900;font-size:23px;line-height:1.25;color:#0b0b0b">${t.veja}</div>
    ${o.etiqueta && p.nome.length > 26 ? "" : `<div style="margin-top:10px;font-weight:800;font-size:19px;line-height:1.25;color:#2b2100;max-width:400px">${t.oferta}</div>`}`;
}

function html(o: OpcoesPB, logoUrl: string, foto: string | null) {
  const t = TXT[o.idioma];
  const fase = o.fase ?? "pre";
  const p = o.peca;
  const nome = esc(p.nome.toUpperCase());
  const meta = `${t.cod} ${esc(p.codigo)}${p.marca ? ` · ${t.para} ${esc(p.marca)}` : ""}${p.extra ? ` · ${esc(p.extra)}` : ""}`;
  const etiqueta = o.etiqueta
    ? `<div class="anton" style="display:inline-block;background:#0b0b0b;color:#f9c80e;font-size:${o.formato === "story" ? 30 : 26}px;padding:6px 16px;border-radius:999px;margin-bottom:14px">${esc(o.etiqueta.toUpperCase())}</div>`
    : "";
  const imgPeca = (w: number, h: number) =>
    foto
      ? `<img src="${foto}" style="max-width:${w}px;max-height:${h}px;object-fit:contain;filter:drop-shadow(0 26px 22px rgba(0,0,0,.35))"/>`
      : `<div class="anton" style="font-size:90px;color:#0b0b0b;text-align:center">${esc(p.codigo)}</div>`;
  if (o.formato === "story") {
    const tn = nome.length > 34 ? 54 : nome.length > 20 ? 62 : 76;
    return `<div class="r l amarelo" style="width:1080px;height:1920px">
      ${confete(1080, 760, 34, p.codigo.length, [230, 230, 850, 640])}
      <div style="position:absolute;left:0;right:0;top:120px">${baloes()}</div>
      <div style="position:absolute;left:0;right:0;top:250px;display:flex;flex-direction:column;align-items:center;gap:30px">${moldura(t.pre, fase)}${marca(logoUrl, 0.8)}</div>
      ${pedestal(270, 985, 540)}
      <div style="position:absolute;left:260px;top:620px;width:560px;height:410px;display:flex;align-items:flex-end;justify-content:center">${imgPeca(560, 410)}</div>
      <div style="position:absolute;left:70px;right:70px;top:${o.etiqueta ? 1200 : 1238}px;text-align:center">
        ${etiqueta}
        <div class="anton" style="font-size:${tn}px;line-height:1.02;color:#0b0b0b">${nome}</div>
        <div style="margin-top:12px;font-weight:800;font-size:24px;letter-spacing:1px;color:#2b2100">${meta}</div>
        ${blocoVariante(o, t, true)}
      </div>
      ${fitas(t.pre, 1920, -70, fase)}
    </div>`;
  }
  const tn = nome.length > 30 ? 46 : nome.length > 20 ? 54 : 64;
  return `<div class="r l amarelo" style="width:1080px;height:1350px">
    ${confete(1080, 520, 26, p.codigo.length, [250, 30, 830, 430])}
    ${baloes()}
    <div style="position:absolute;left:0;right:0;top:46px;display:flex;flex-direction:column;align-items:center;gap:30px">${moldura(t.pre, fase)}${marca(logoUrl, 0.78)}</div>
    ${pedestal(70, 1010, 520)}
    <div style="position:absolute;left:80px;top:545px;width:500px;height:500px;display:flex;align-items:flex-end;justify-content:center">${imgPeca(500, 500)}</div>
    <div style="position:absolute;left:610px;right:60px;top:${o.etiqueta ? 520 : 560}px">
      ${etiqueta}
      <div class="anton" style="font-size:${tn}px;line-height:1.02;color:#0b0b0b">${nome}</div>
      <div style="margin-top:14px;font-weight:800;font-size:20px;letter-spacing:1px;color:#2b2100">${meta}</div>
      ${blocoVariante(o, t, false)}
    </div>
    ${fitas(t.pre, 1350, 0, fase)}
  </div>`;
}

// ---------------------------------------------------------------- HTML → canvas
function carregar(src: string) {
  return new Promise<HTMLImageElement>((ok, erro) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => erro(new Error("Não foi possível montar a arte"));
    im.src = src;
  });
}
export async function gerarPreBlack(o: OpcoesPB): Promise<HTMLCanvasElement> {
  const [css, logoUrl] = await Promise.all([fontesEmbutidas(), logoEmbutido()]);
  let foto: string | null = null;
  if (o.peca.foto)
    try {
      foto = ((await fotoRecortada(o.peca.foto)) as HTMLCanvasElement).toDataURL("image/png");
    } catch {
      foto = null;
    }
  const W = 1080;
  const H = o.formato === "story" ? 1920 : 1350;
  const corpo = html(o, logoUrl, foto);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><foreignObject x="0" y="0" width="${W}" height="${H}"><div xmlns="http://www.w3.org/1999/xhtml" style="width:${W}px;height:${H}px"><style>${css}${CSS}</style>${corpo}</div></foreignObject></svg>`;
  const im = await carregar("data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg));
  // Uma volta a mais: o navegador às vezes ainda não aplicou as fontes na 1ª pintura
  await new Promise((r) => setTimeout(r, 30));
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.drawImage(im, 0, 0, W, H);
  return c;
}
