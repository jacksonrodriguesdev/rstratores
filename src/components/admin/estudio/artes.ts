// Gerador de artes do Estúdio: desenha posts e stories no navegador (canvas), com a foto da peça
// recortada (fundo branco vira transparente), a logo, o nome, o código e o desconto ou o preço.
// Roda só no navegador (o servidor da Hostinger não tem motor de imagem).

export type Modelo = "amarelo" | "escuro" | "verde" | "grade";
export type Formato = "feed" | "quadrado" | "story";
export type ProdutoArte = {
  nome: string;
  codigo: string;
  marca?: string | null;
  foto?: string | null;
  preco?: { uyu: string; brl: string | null; deUyu?: string | null; desconto: number } | null;
};
export type OpcoesArte = {
  modelo: Modelo;
  formato: Formato;
  idioma: "es" | "pt";
  produtos: ProdutoArte[];
  mostrar: "desconto" | "preco" | "nada";
  desconto: number | null; // desconto da campanha (ex.: 20) quando a peça não tem o seu
  selo: string; // ex.: "PRE BLACK FRIDAY"
  chamada: string; // frase principal (modelos escuro/verde/grade)
  // Pré-Black amarelo (layout da campanha): variação e etiqueta opcional
  variante?: "desconto" | "preco" | "whatsapp" | "codigo";
  etiqueta?: string | null;
};

export const TAMANHO: Record<Formato, [number, number]> = {
  feed: [1080, 1350],
  quadrado: [1080, 1080],
  story: [1080, 1920],
};
const T = {
  es: {
    cod: "Cód.",
    para: "Para",
    veja: "Mirá el precio en agropartsuy.com",
    oferta: "¡Ofertas válidas hasta agotar stock!",
    desc: "DE DESCUENTO",
    envio: "Envíos por DAC a todo Uruguay",
    zap: "Cotizá por WhatsApp",
  },
  pt: {
    cod: "Cód.",
    para: "Para",
    veja: "Veja o preço em agropartsuy.com/pt",
    oferta: "Ofertas válidas enquanto durarem os estoques!",
    desc: "DE DESCONTO",
    envio: "Envio para todo o RS",
    zap: "Peça pelo WhatsApp",
  },
};

// ---------------------------------------------------------------- recursos
let fontes: Promise<void> | null = null;
function carregarFontes() {
  fontes ??= (async () => {
    if (!document.getElementById("estudio-fontes")) {
      const l = document.createElement("link");
      l.id = "estudio-fontes";
      l.rel = "stylesheet";
      l.href =
        "https://fonts.googleapis.com/css2?family=Anton&family=Archivo:wght@500;700;800;900&display=swap";
      const pronto = new Promise((ok) => {
        l.onload = l.onerror = () => ok(null);
        setTimeout(() => ok(null), 8000);
      });
      document.head.appendChild(l);
      await pronto;
    }
    await Promise.all([
      document.fonts.load("80px Anton"),
      document.fonts.load("800 30px Archivo"),
      document.fonts.load("900 30px Archivo"),
      document.fonts.load("700 30px Archivo"),
      document.fonts.load("500 20px Archivo"),
    ]).catch(() => {});
  })();
  return fontes;
}
const cacheImg = new Map<string, Promise<HTMLImageElement | HTMLCanvasElement>>();
function imagem(src: string): Promise<HTMLImageElement> {
  return new Promise((ok, erro) => {
    const im = new Image();
    im.onload = () => ok(im);
    im.onerror = () => erro(new Error(`Não carregou a foto ${src}`));
    im.src = src;
  });
}
// Foto da peça pelo proxy do site, com o fundo branco recortado e cortada no tamanho da peça
export function fotoRecortada(url: string) {
  let p = cacheImg.get(url);
  if (!p) {
    p = imagem(`/api/admin/estudio/foto?u=${encodeURIComponent(url)}`).then((im) => recortar(im));
    cacheImg.set(url, p);
  }
  return p;
}
function recortar(im: HTMLImageElement): HTMLCanvasElement {
  const w = im.naturalWidth,
    h = im.naturalHeight;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, w, h);
  const px = d.data;
  const claro = (i: number) => {
    const r = px[i],
      gg = px[i + 1],
      b = px[i + 2];
    return Math.min(r, gg, b) > 232 && Math.max(r, gg, b) - Math.min(r, gg, b) < 22;
  };
  const fora = new Uint8Array(w * h);
  const fila: number[] = [];
  for (let x = 0; x < w; x++) fila.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) fila.push(y * w, y * w + w - 1);
  while (fila.length) {
    const p = fila.pop()!;
    if (fora[p] || !claro(p * 4)) continue;
    fora[p] = 1;
    const x = p % w,
      y = (p / w) | 0;
    if (x > 0) fila.push(p - 1);
    if (x < w - 1) fila.push(p + 1);
    if (y > 0) fila.push(p - w);
    if (y < h - 1) fila.push(p + w);
  }
  let x0 = w,
    y0 = h,
    x1 = 0,
    y1 = 0;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (fora[p]) {
        px[p * 4 + 3] = 0;
        continue;
      }
      if (x < x0) x0 = x;
      if (y < y0) y0 = y;
      if (x > x1) x1 = x;
      if (y > y1) y1 = y;
    }
  g.putImageData(d, 0, 0);
  if (x1 <= x0 || y1 <= y0) return c;
  const o = document.createElement("canvas");
  o.width = x1 - x0 + 1;
  o.height = y1 - y0 + 1;
  o.getContext("2d")!.drawImage(c, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
  return o;
}

// ---------------------------------------------------------------- utilidades de desenho
type Ctx = CanvasRenderingContext2D;
function quebrar(g: Ctx, texto: string, largura: number) {
  const linhas: string[] = [];
  let atual = "";
  for (const p of texto.split(/\s+/)) {
    const t = atual ? `${atual} ${p}` : p;
    if (g.measureText(t).width > largura && atual) {
      linhas.push(atual);
      atual = p;
    } else atual = t;
  }
  if (atual) linhas.push(atual);
  return linhas;
}
// Escreve um texto em até N linhas, diminuindo a letra até caber
function bloco(
  g: Ctx,
  texto: string,
  x: number,
  y: number,
  largura: number,
  o: {
    fonte: (s: number) => string;
    tam: number;
    min: number;
    linhas: number;
    cor: string;
    alinhar?: CanvasTextAlign;
    altura?: number;
  },
) {
  let tam = o.tam;
  let ls: string[] = [];
  for (; tam >= o.min; tam -= 2) {
    g.font = o.fonte(tam);
    ls = quebrar(g, texto, largura);
    if (ls.length <= o.linhas) break;
  }
  ls = ls.slice(0, o.linhas);
  g.fillStyle = o.cor;
  g.textAlign = o.alinhar ?? "left";
  g.textBaseline = "top";
  const lh = tam * (o.altura ?? 1.04);
  ls.forEach((l, i) => g.fillText(l, x, y + i * lh));
  return y + ls.length * lh;
}
function retangulo(g: Ctx, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.roundRect(x, y, w, h, r);
}
function contem(
  g: Ctx,
  img: CanvasImageSource & { width: number; height: number },
  x: number,
  y: number,
  w: number,
  h: number,
  alinharBaixo = false,
) {
  const k = Math.min(w / img.width, h / img.height);
  const iw = img.width * k,
    ih = img.height * k;
  g.drawImage(img, x + (w - iw) / 2, alinharBaixo ? y + h - ih : y + (h - ih) / 2, iw, ih);
}
function balao(g: Ctx, x: number, y: number, r: number, ouro: boolean) {
  const gr = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r);
  if (ouro) {
    gr.addColorStop(0, "#fff6c4");
    gr.addColorStop(0.3, "#ffd84a");
    gr.addColorStop(0.75, "#e8a800");
    gr.addColorStop(1, "#9a6d00");
  } else {
    gr.addColorStop(0, "#6b6b6b");
    gr.addColorStop(0.35, "#232323");
    gr.addColorStop(1, "#070707");
  }
  g.fillStyle = gr;
  g.beginPath();
  g.ellipse(x, y, r, r * 1.12, 0, 0, Math.PI * 2);
  g.fill();
}
function fita(
  g: Ctx,
  y: number,
  ang: number,
  texto: string,
  fundo: string,
  cor: string,
  W: number,
) {
  g.save();
  g.translate(W / 2, y);
  g.rotate(ang);
  g.fillStyle = fundo;
  g.fillRect(-W, -32, W * 2, 64);
  g.fillStyle = cor;
  g.fillRect(-W, -32, W * 2, 5);
  g.fillRect(-W, 27, W * 2, 5);
  g.font = "900 28px Archivo";
  g.textBaseline = "middle";
  g.textAlign = "left";
  const passo = g.measureText(texto).width + 60;
  for (let x = -W; x < W; x += passo) g.fillText(texto, x, 1);
  g.restore();
}
function moeda(g: Ctx, x: number, y: number, r: number, topo: string, valor: string) {
  const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
  gr.addColorStop(0, "#fff8cf");
  gr.addColorStop(0.2, "#ffe27a");
  gr.addColorStop(0.45, "#f5c518");
  gr.addColorStop(0.75, "#c99a06");
  gr.addColorStop(1, "#7a5a00");
  g.fillStyle = gr;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
  g.strokeStyle = "rgba(90,67,0,.4)";
  g.setLineDash([8, 8]);
  g.lineWidth = 3;
  g.beginPath();
  g.arc(x, y, r * 0.86, 0, Math.PI * 2);
  g.stroke();
  g.setLineDash([]);
  g.fillStyle = "#2b1f00";
  g.textAlign = "center";
  g.textBaseline = "middle";
  let tt = r * 0.16;
  do g.font = `800 ${tt}px Archivo`;
  while (g.measureText(topo).width > r * 1.3 && (tt -= 1) > 8);
  g.fillText(topo, x, y - r * 0.38);
  let tv = r * 0.72;
  do g.font = `${tv}px Anton`;
  while (g.measureText(valor).width > r * 1.55 && (tv -= 2) > 10);
  g.fillText(valor, x, y + r * 0.12);
}
async function logo(
  g: Ctx,
  x: number,
  y: number,
  tam: number,
  corTexto: string,
  corLema: string,
  idioma: "es" | "pt",
  centro = false,
) {
  const im = await imagem("/logo.png");
  g.font = `900 ${tam * 0.62}px Archivo`;
  const larguraTexto = Math.max(g.measureText("AGRO PARTS").width, 0);
  const total = tam + 16 + larguraTexto;
  const x0 = centro ? x - total / 2 : x;
  g.fillStyle = "#fff";
  retangulo(g, x0, y, tam, tam, tam * 0.26);
  g.fill();
  g.drawImage(im, x0 + tam * 0.07, y + tam * 0.07, tam * 0.86, tam * 0.86);
  g.fillStyle = corTexto;
  g.textAlign = "left";
  g.textBaseline = "top";
  g.fillText("AGRO PARTS", x0 + tam + 16, y + tam * 0.08);
  g.font = `800 ${tam * 0.17}px Archivo`;
  g.fillStyle = corLema;
  g.fillText(
    idioma === "pt" ? "PEÇAS AGRÍCOLAS" : "REPUESTOS AGRÍCOLAS",
    x0 + tam + 18,
    y + tam * 0.72,
  );
}
// Valor grande: «$U 1.360» ou «R$ 196,63»
function preco(
  g: Ctx,
  p: NonNullable<ProdutoArte["preco"]>,
  idioma: "es" | "pt",
  x: number,
  y: number,
  tam: number,
  cor: string,
  alinhar: "left" | "center" = "left",
) {
  const valor = idioma === "pt" && p.brl ? p.brl : p.uyu;
  const [moedaTxt, ...resto] = valor.split(" ");
  const num = resto.join(" ");
  g.textBaseline = "top";
  g.font = `${tam}px Anton`;
  const wNum = g.measureText(num).width;
  g.font = `${tam * 0.32}px Anton`;
  const wM = g.measureText(moedaTxt).width;
  const x0 = alinhar === "center" ? x - (wNum + wM + 10) / 2 : x;
  g.fillStyle = cor;
  g.textAlign = "left";
  g.fillText(moedaTxt, x0, y + tam * 0.1);
  g.font = `${tam}px Anton`;
  g.fillText(num, x0 + wM + 10, y);
  return y + tam * 1.05;
}

// ---------------------------------------------------------------- modelos
async function desenharAmarelo(g: Ctx, o: OpcoesArte, W: number, H: number) {
  const t = T[o.idioma];
  const p = o.produtos[0];
  const bg = g.createRadialGradient(W / 2, H * 0.42, 50, W / 2, H * 0.42, W * 0.9);
  bg.addColorStop(0, "#ffe14d");
  bg.addColorStop(0.55, "#f9c80e");
  bg.addColorStop(1, "#eeb500");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  const yb = o.formato === "story" ? 140 : 0;
  for (const [x, y, r, ouro] of [
    [-20, 30, 95, 1],
    [150, 90, 70, 1],
    [40, 230, 85, 0],
    [100, 330, 60, 1],
    [W + 20, 30, 95, 0],
    [W - 150, 100, 70, 0],
    [W - 40, 240, 85, 1],
    [W - 90, 340, 60, 0],
  ] as const)
    balao(g, x, y + yb, r, !!ouro);
  // Moldura
  const selo = o.selo.toUpperCase();
  const [l1, l2] = selo.includes("FRIDAY")
    ? [selo.replace(/\s*FRIDAY.*/, ""), "FRIDAY"]
    : [selo, ""];
  g.font = "96px Anton";
  const wm = Math.max(g.measureText(l1).width, g.measureText(l2).width) + 80;
  const mx = (W - wm) / 2,
    my = 50 + yb;
  g.fillStyle = "#f9c80e";
  g.fillRect(mx - 14, my - 14, wm + 28, (l2 ? 222 : 130) + 28);
  g.strokeStyle = "#0b0b0b";
  g.lineWidth = 5;
  g.strokeRect(mx - 14, my - 14, wm + 28, (l2 ? 222 : 130) + 28);
  g.lineWidth = 4;
  g.strokeRect(mx, my, wm, l2 ? 222 : 130);
  g.fillStyle = "#0b0b0b";
  g.textAlign = "center";
  g.textBaseline = "top";
  g.fillText(l1, W / 2, my + 14);
  if (l2) {
    g.fillRect(mx, my + 118, wm, 104);
    g.fillStyle = "#fff";
    g.font = "86px Anton";
    g.fillText(l2, W / 2, my + 122);
  }
  await logo(g, W / 2, my + (l2 ? 260 : 170), 64, "#0b0b0b", "#0b0b0b", o.idioma, true);
  // Pedestal + foto
  const story = o.formato === "story";
  const pw = story ? 560 : 500;
  const px = story ? (W - pw) / 2 : 70;
  const pyTopo = story ? 1000 : H - 380;
  const ga = g.createLinearGradient(px, 0, px + pw, 0);
  ga.addColorStop(0, "#050505");
  ga.addColorStop(0.3, "#2b2b2b");
  ga.addColorStop(0.55, "#0f0f0f");
  ga.addColorStop(0.8, "#3a3a3a");
  ga.addColorStop(1, "#050505");
  g.fillStyle = ga;
  g.fillRect(px, pyTopo + 45, pw, 150);
  g.beginPath();
  g.ellipse(px + pw / 2, pyTopo + 195, pw / 2, 45, 0, 0, Math.PI);
  g.fill();
  g.fillStyle = "#e0ac00";
  g.beginPath();
  g.ellipse(px + pw / 2, pyTopo + 45, pw / 2, 48, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#151515";
  g.beginPath();
  g.ellipse(px + pw / 2, pyTopo + 45, pw / 2 - 10, 40, 0, 0, Math.PI * 2);
  g.fill();
  const area = story
    ? { x: (W - 600) / 2, y: 560, w: 600, h: 470 }
    : {
        x: 80,
        y: o.formato === "quadrado" ? 400 : 520,
        w: 480,
        h: o.formato === "quadrado" ? 330 : 470,
      };
  await fotoOuCodigo(g, p, area, "#0b0b0b", true);
  // Texto
  const tx = story ? 80 : 610;
  const tw = story ? W - 160 : W - 610 - 60;
  let y = story ? 1250 : o.formato === "quadrado" ? 410 : 540;
  const al: CanvasTextAlign = story ? "center" : "left";
  const cx = story ? W / 2 : tx;
  y = bloco(g, p.nome.toUpperCase(), cx, y, tw, {
    fonte: (s) => `${s}px Anton`,
    tam: story ? 76 : 62,
    min: 34,
    linhas: 3,
    cor: "#0b0b0b",
    alinhar: al,
  });
  g.font = "800 22px Archivo";
  g.fillStyle = "#2b2100";
  g.textAlign = al;
  g.fillText(`${t.cod} ${p.codigo}${p.marca ? ` · ${t.para} ${p.marca}` : ""}`, cx, y + 10);
  y += 56;
  y = await valores(g, o, p, cx, y, al, story ? 130 : 120, "#0b0b0b", "#f9c80e", tw);
  g.font = "900 21px Archivo";
  g.fillStyle = "#0b0b0b";
  g.textAlign = al;
  g.fillText(t.oferta.toUpperCase(), cx, y + 16);
  fita(g, H - (story ? 230 : 150), -0.1, `${o.selo.toUpperCase()}`, "#f9c80e", "#0b0b0b", W);
  fita(g, H - (story ? 170 : 92), 0.05, `${o.selo.toUpperCase()}`, "#0b0b0b", "#f9c80e", W);
}

// Desconto (caixa preta com o %) ou preço grande, conforme a escolha
async function valores(
  g: Ctx,
  o: OpcoesArte,
  p: ProdutoArte,
  x: number,
  y: number,
  al: CanvasTextAlign,
  tam: number,
  escuro: string,
  claro: string,
  largura: number,
) {
  const t = T[o.idioma];
  const pct = p.preco?.desconto || o.desconto;
  if (o.mostrar === "preco" && p.preco) {
    if (p.preco.deUyu && o.idioma === "es") {
      g.font = "800 28px Archivo";
      g.fillStyle = escuro;
      g.textAlign = al;
      const de = p.preco.deUyu;
      g.fillText(de, x, y);
      const w = g.measureText(de).width;
      const sx = al === "center" ? x - w / 2 : x;
      g.fillRect(sx, y + 15, w, 3);
      y += 40;
    }
    return preco(g, p.preco, o.idioma, x, y, tam, escuro, al === "center" ? "center" : "left");
  }
  if (o.mostrar !== "nada" && pct) {
    g.font = `${tam}px Anton`;
    const w = Math.min(largura, g.measureText(`-${pct}%`).width + 60);
    const bx = al === "center" ? x - w / 2 : x;
    g.fillStyle = escuro;
    retangulo(g, bx, y, w, tam * 1.45, 22);
    g.fill();
    g.fillStyle = claro;
    g.textAlign = "center";
    g.textBaseline = "top";
    g.fillText(`-${pct}%`, bx + w / 2, y + 8);
    g.font = `${tam * 0.22}px Anton`;
    g.fillStyle = "#fff";
    g.fillText(t.desc, bx + w / 2, y + tam * 1.08);
    y += tam * 1.45 + 18;
    g.font = "900 22px Archivo";
    g.fillStyle = escuro;
    g.textAlign = al;
    g.fillText(t.veja, x, y);
    return y + 28;
  }
  return y;
}

async function fotoOuCodigo(
  g: Ctx,
  p: ProdutoArte,
  a: { x: number; y: number; w: number; h: number },
  cor: string,
  sombra: boolean,
) {
  if (p.foto) {
    try {
      const f = await fotoRecortada(p.foto);
      if (sombra) {
        g.save();
        g.shadowColor = "rgba(0,0,0,.35)";
        g.shadowBlur = 30;
        g.shadowOffsetY = 22;
      }
      contem(g, f as any, a.x, a.y, a.w, a.h, true);
      if (sombra) g.restore();
      return;
    } catch {
      /* sem foto: cai para o código */
    }
  }
  g.fillStyle = cor;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.font = "800 24px Archivo";
  g.fillText("CÓDIGO", a.x + a.w / 2, a.y + a.h / 2 - 50);
  bloco(g, p.codigo, a.x + a.w / 2, a.y + a.h / 2 - 20, a.w - 40, {
    fonte: (s) => `${s}px Anton`,
    tam: 96,
    min: 40,
    linhas: 1,
    cor,
    alinhar: "center",
  });
}

async function desenharEscuro(g: Ctx, o: OpcoesArte, W: number, H: number, verde = false) {
  const t = T[o.idioma];
  const p = o.produtos[0];
  const story = o.formato === "story";
  const bg = g.createRadialGradient(W * 0.75, H * 0.2, 40, W * 0.5, H * 0.5, H);
  if (verde) {
    bg.addColorStop(0, "#1f8a46");
    bg.addColorStop(0.5, "#0a3320");
    bg.addColorStop(1, "#04170c");
  } else {
    bg.addColorStop(0, "#3a2f05");
    bg.addColorStop(0.45, "#0d0d0d");
    bg.addColorStop(1, "#000");
  }
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  const ouro = verde ? "#fbbf24" : "#f5c518";
  const yt = story ? 230 : 60;
  await logo(g, 64, yt, 64, "#fff", ouro, o.idioma);
  // selo no canto
  g.font = "900 22px Archivo";
  const sw = g.measureText(o.selo.toUpperCase()).width + 44;
  g.fillStyle = ouro;
  retangulo(g, W - 64 - sw, yt + 10, sw, 46, 23);
  g.fill();
  g.fillStyle = "#111";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(o.selo.toUpperCase(), W - 64 - sw / 2, yt + 34);
  // chamada
  let y = yt + 120;
  if (o.chamada)
    y =
      bloco(g, o.chamada.toUpperCase(), 64, y, W - 128, {
        fonte: (s) => `${s}px Anton`,
        tam: story ? 92 : 74,
        min: 40,
        linhas: 2,
        cor: "#fff",
      }) + 20;
  // cartão branco com a peça
  const cw = W - 128;
  const ch = story ? 760 : o.formato === "quadrado" ? 430 : 560;
  g.save();
  g.shadowColor = verde ? "rgba(0,0,0,.45)" : "rgba(245,197,24,.35)";
  g.shadowBlur = 60;
  g.fillStyle = "#fff";
  retangulo(g, 64, y, cw, ch, 44);
  g.fill();
  g.restore();
  g.strokeStyle = ouro;
  g.lineWidth = 6;
  retangulo(g, 64, y, cw, ch, 44);
  g.stroke();
  await fotoOuCodigo(g, p, { x: 120, y: y + 40, w: cw - 112, h: ch - 80 }, "#0a3320", false);
  const pct = p.preco?.desconto || o.desconto;
  if (o.mostrar === "desconto" && pct)
    moeda(g, W - 150, y + 40, 120, o.selo.toUpperCase(), `-${pct}%`);
  y += ch + 36;
  y = bloco(g, p.nome.toUpperCase(), 64, y, W - 128, {
    fonte: (s) => `${s}px Anton`,
    tam: 64,
    min: 34,
    linhas: 2,
    cor: "#fff",
  });
  g.font = "700 24px Archivo";
  g.fillStyle = verde ? "#cde9d6" : "#d4d4d8";
  g.textAlign = "left";
  g.textBaseline = "top";
  g.fillText(`${t.cod} ${p.codigo}${p.marca ? ` · ${t.para} ${p.marca}` : ""}`, 64, y + 10);
  y += 60;
  if (o.mostrar === "preco" && p.preco) y = preco(g, p.preco, o.idioma, 64, y, 96, ouro);
  else if (o.mostrar === "desconto" && pct) {
    g.font = "900 26px Archivo";
    g.fillStyle = ouro;
    g.fillText(t.veja, 64, y + 10);
    y += 40;
  }
  g.font = "700 22px Archivo";
  g.fillStyle = verde ? "#cde9d6" : "#a1a1aa";
  g.fillText(
    `🚚 ${t.envio}   ·   💬 ${t.zap}`,
    64,
    Math.min(H - 50, Math.max(y + 30, H - (story ? 330 : 70))),
  );
}

async function desenharGrade(g: Ctx, o: OpcoesArte, W: number, H: number) {
  const t = T[o.idioma];
  const story = o.formato === "story";
  const bg = g.createLinearGradient(0, 0, 0, H);
  bg.addColorStop(0, "#0b0b0b");
  bg.addColorStop(1, "#1c1c1c");
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  const yt = story ? 230 : 56;
  await logo(g, 64, yt, 60, "#fff", "#f5c518", o.idioma);
  let y = yt + 110;
  y =
    bloco(g, (o.chamada || o.selo).toUpperCase(), 64, y, W - 128, {
      fonte: (s) => `${s}px Anton`,
      tam: story ? 100 : 82,
      min: 40,
      linhas: 2,
      cor: "#f5c518",
    }) + 24;
  const ps = o.produtos.slice(0, 4);
  const cols = 2;
  const gap = 24;
  const cw = (W - 128 - gap) / cols;
  const linhas = Math.ceil(ps.length / cols);
  const espaco = H - y - (story ? 420 : 150);
  const chh = Math.min(cw * 1.15, (espaco - gap * (linhas - 1)) / linhas);
  for (const [i, p] of ps.entries()) {
    const x = 64 + (i % cols) * (cw + gap);
    const yy = y + Math.floor(i / cols) * (chh + gap);
    g.fillStyle = "#fff";
    retangulo(g, x, yy, cw, chh, 28);
    g.fill();
    await fotoOuCodigo(
      g,
      p,
      { x: x + 24, y: yy + 20, w: cw - 48, h: chh * 0.54 },
      "#0a3320",
      false,
    );
    bloco(g, p.nome.toUpperCase(), x + 22, yy + chh * 0.68, cw - 44, {
      fonte: (s) => `${s}px Anton`,
      tam: 34,
      min: 22,
      linhas: 2,
      cor: "#0b0b0b",
    });
    g.font = "800 18px Archivo";
    g.fillStyle = "#52525b";
    g.textAlign = "left";
    g.fillText(`${t.cod} ${p.codigo}`, x + 22, yy + chh - 34);
    const pct = p.preco?.desconto || o.desconto;
    if (o.mostrar === "preco" && p.preco) {
      g.font = "30px Anton";
      g.fillStyle = "#0b0b0b";
      g.textAlign = "right";
      g.fillText(
        o.idioma === "pt" && p.preco.brl ? p.preco.brl : p.preco.uyu,
        x + cw - 20,
        yy + chh - 44,
      );
    } else if (o.mostrar === "desconto" && pct) {
      g.fillStyle = "#0b0b0b";
      retangulo(g, x + cw - 120, yy + 16, 104, 50, 14);
      g.fill();
      g.font = "34px Anton";
      g.fillStyle = "#f5c518";
      g.textAlign = "center";
      g.fillText(`-${pct}%`, x + cw - 68, yy + 22);
    }
  }
  g.font = "800 24px Archivo";
  g.fillStyle = "#d4d4d8";
  g.textAlign = "left";
  g.fillText(`${t.envio}  ·  ${t.zap}`, 64, H - (story ? 330 : 80));
}

// ---------------------------------------------------------------- principal
export async function gerarArte(o: OpcoesArte): Promise<HTMLCanvasElement> {
  await carregarFontes();
  const [W, H] = TAMANHO[o.formato];
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  if (!o.produtos.length) throw new Error("Escolha pelo menos uma peça.");
  // Amarelo com uma peça, no post 4:5 ou story: o layout exato da campanha (HTML → imagem)
  if (o.modelo === "amarelo" && o.formato !== "quadrado") {
    const { gerarPreBlack } = await import("./layout-preblack");
    const p = o.produtos[0];
    const variante = o.variante ?? (o.mostrar === "preco" && p.preco ? "preco" : "desconto");
    return gerarPreBlack({
      variante,
      formato: o.formato,
      idioma: o.idioma,
      fase: /^black/i.test(o.selo) ? "black" : "pre",
      desconto: o.desconto ?? undefined,
      etiqueta: o.etiqueta ?? null,
      peca: {
        nome: p.nome,
        codigo: p.codigo,
        marca: p.marca,
        foto: p.foto,
        preco: p.preco
          ? {
              uyu: p.preco.uyu,
              brl: p.preco.brl,
              deUyu: p.preco.deUyu ?? null,
              desconto: p.preco.desconto,
            }
          : null,
      },
    });
  }
  if (o.modelo === "amarelo") await desenharAmarelo(g, o, W, H);
  else if (o.modelo === "escuro") await desenharEscuro(g, o, W, H);
  else if (o.modelo === "verde") await desenharEscuro(g, o, W, H, true);
  else await desenharGrade(g, o, W, H);
  return c;
}

export const paraJpg = (c: HTMLCanvasElement) =>
  new Promise<Blob>((ok, erro) =>
    c.toBlob((b) => (b ? ok(b) : erro(new Error("Falha ao gerar a imagem"))), "image/jpeg", 0.92),
  );

// ================================================================ artes de texto
// Capa de carrossel, slide final, dica, pergunta, contagem regressiva, cupom, código e marca.
export type Tema = "amarelo" | "escuro" | "verde";
export type OpcoesTexto = {
  formato: Formato;
  idioma: "es" | "pt";
  tema: Tema;
  selo?: string; // etiqueta pequena no alto
  destaque?: string; // número/código grande
  titulo: string;
  texto?: string;
  rodape?: string;
  foto?: string | null; // foto própria de peça (opcional)
  espacoInteracao?: boolean; // espaço livre para a figurinha (enquete/pergunta) no story
};
const CORES: Record<
  Tema,
  {
    fundo: [string, string, string];
    texto: string;
    sub: string;
    acento: string;
    pilula: string;
    pilulaTx: string;
  }
> = {
  amarelo: {
    fundo: ["#ffe14d", "#f9c80e", "#eeb500"],
    texto: "#0b0b0b",
    sub: "#2b2100",
    acento: "#0b0b0b",
    pilula: "#0b0b0b",
    pilulaTx: "#f9c80e",
  },
  escuro: {
    fundo: ["#3a2f05", "#0d0d0d", "#000000"],
    texto: "#ffffff",
    sub: "#d4d4d8",
    acento: "#f5c518",
    pilula: "#f5c518",
    pilulaTx: "#111111",
  },
  verde: {
    fundo: ["#1f8a46", "#0a3320", "#04170c"],
    texto: "#ffffff",
    sub: "#cde9d6",
    acento: "#fbbf24",
    pilula: "#fbbf24",
    pilulaTx: "#0a3320",
  },
};
function fundoTema(g: Ctx, tema: Tema, W: number, H: number) {
  const c = CORES[tema];
  const bg =
    tema === "amarelo"
      ? g.createRadialGradient(W / 2, H * 0.4, 50, W / 2, H * 0.4, W * 0.95)
      : g.createRadialGradient(W * 0.8, H * 0.15, 40, W * 0.5, H * 0.5, H);
  bg.addColorStop(0, c.fundo[0]);
  bg.addColorStop(0.5, c.fundo[1]);
  bg.addColorStop(1, c.fundo[2]);
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  g.save();
  g.globalAlpha = tema === "amarelo" ? 0.06 : 0.05;
  g.strokeStyle = tema === "amarelo" ? "#000" : "#fff";
  g.lineWidth = 2;
  for (let x = -H; x < W; x += 28) {
    g.beginPath();
    g.moveTo(x, H);
    g.lineTo(x + H, 0);
    g.stroke();
  }
  g.restore();
}
function pilula(
  g: Ctx,
  texto: string,
  x: number,
  y: number,
  fundo: string,
  cor: string,
  tam = 24,
  centro = false,
) {
  g.font = `900 ${tam}px Archivo`;
  const w = g.measureText(texto).width + tam * 1.8;
  const h = tam * 2;
  const x0 = centro ? x - w / 2 : x;
  g.fillStyle = fundo;
  retangulo(g, x0, y, w, h, h / 2);
  g.fill();
  g.fillStyle = cor;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(texto, x0 + w / 2, y + h / 2 + 1);
  return h;
}

export async function gerarTexto(o: OpcoesTexto): Promise<HTMLCanvasElement> {
  await carregarFontes();
  const [W, H] = TAMANHO[o.formato];
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const cor = CORES[o.tema];
  const story = o.formato === "story";
  fundoTema(g, o.tema, W, H);
  if (o.tema === "amarelo") {
    balao(g, -10, story ? 260 : 60, 90, true);
    balao(g, W + 10, story ? 300 : 90, 90, false);
    balao(g, W - 60, H - (story ? 380 : 120), 70, true);
  }
  const m = 72;
  let y = story ? 220 : 72;
  await logo(g, W / 2, y, 70, cor.texto, cor.acento, o.idioma, true);
  y += 120;
  const temFoto = !!o.foto;
  const reservaFoto = temFoto ? (story ? 640 : o.formato === "quadrado" ? 300 : 420) : 0;
  // Bloco de texto: medido num canvas de rascunho e, sem foto, centralizado na vertical
  const conteudo = (gg: Ctx, y0: number) => {
    let yy = y0;
    if (o.selo)
      yy +=
        pilula(
          gg,
          o.selo.toUpperCase(),
          W / 2,
          yy,
          cor.pilula,
          cor.pilulaTx,
          story ? 30 : 26,
          true,
        ) + 40;
    if (o.destaque) {
      yy = bloco(gg, o.destaque.toUpperCase(), W / 2, yy, W - m * 2, {
        fonte: (s) => `${s}px Anton`,
        tam: story ? 320 : o.formato === "quadrado" ? 210 : 260,
        min: 60,
        linhas: 1,
        cor: cor.acento,
        alinhar: "center",
        altura: 1,
      });
      yy += 10;
    }
    yy = bloco(gg, o.titulo.toUpperCase(), W / 2, yy, W - m * 2, {
      fonte: (s) => `${s}px Anton`,
      tam: story ? 130 : o.formato === "quadrado" ? 90 : 108,
      min: 40,
      linhas: 3,
      cor: cor.texto,
      alinhar: "center",
    });
    if (o.texto) {
      yy += 28;
      yy = bloco(gg, o.texto, W / 2, yy, W - m * 2 - 40, {
        fonte: (s) => `600 ${s}px Archivo`,
        tam: story ? 52 : o.formato === "quadrado" ? 38 : 44,
        min: 22,
        linhas: story ? 6 : 4,
        cor: cor.sub,
        alinhar: "center",
        altura: 1.3,
      });
    }
    yy += 30;
    if (o.espacoInteracao) {
      gg.save();
      gg.setLineDash([14, 12]);
      gg.strokeStyle = cor.texto;
      gg.globalAlpha = 0.35;
      gg.lineWidth = 4;
      retangulo(gg, m + 60, yy, W - (m + 60) * 2, 320, 36);
      gg.stroke();
      gg.restore();
      yy += 360;
    }
    return yy;
  };
  if (!temFoto) {
    const rasc = document.createElement("canvas");
    rasc.width = W;
    rasc.height = H;
    const alt = conteudo(rasc.getContext("2d")!, 0);
    const fim = H - (story ? 300 : 110);
    y = Math.max(y, y + (fim - y - alt) / 2);
  }
  y = conteudo(g, y);
  if (temFoto) {
    const hFoto = Math.min(reservaFoto, H - y - (story ? 260 : 130));
    if (hFoto > 120) {
      g.save();
      g.fillStyle = "#fff";
      g.shadowColor = "rgba(0,0,0,.3)";
      g.shadowBlur = 40;
      retangulo(g, m, y, W - m * 2, hFoto, 40);
      g.fill();
      g.restore();
      try {
        const f = await fotoRecortada(o.foto!);
        contem(g, f as any, m + 30, y + 24, W - m * 2 - 60, hFoto - 48);
      } catch {
        /* sem foto */
      }
    }
  }
  const rod =
    o.rodape ??
    (o.idioma === "pt"
      ? "agropartsuy.com/pt · WhatsApp +55 53 99942-8130"
      : "agropartsuy.com · WhatsApp +55 53 99942-8130");
  g.font = "800 26px Archivo";
  g.fillStyle = cor.sub;
  g.textAlign = "center";
  g.textBaseline = "alphabetic";
  g.fillText(rod, W / 2, H - (story ? 230 : 56));
  return c;
}

// ================================================================ ferramentas de imagem
async function arquivoParaImagem(arq: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(arq);
  try {
    return await imagem(url);
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }
}
// Fundo branco → transparente (PNG), cortado na peça
export async function removerFundo(arq: Blob) {
  return recortar(await arquivoParaImagem(arq));
}
// Encaixa qualquer foto no formato do Instagram (fundo desfocado da própria foto, branco ou preto)
export async function ajustarFormato(
  arq: Blob,
  formato: Formato,
  fundo: "desfoque" | "branco" | "preto" = "desfoque",
) {
  const im = await arquivoParaImagem(arq);
  const [W, H] = TAMANHO[formato];
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const iw = im.naturalWidth,
    ih = im.naturalHeight;
  if (fundo === "desfoque") {
    const k = Math.max(W / iw, H / ih);
    g.filter = "blur(40px) brightness(0.8)";
    g.drawImage(im, (W - iw * k) / 2, (H - ih * k) / 2, iw * k, ih * k);
    g.filter = "none";
  } else {
    g.fillStyle = fundo === "branco" ? "#fff" : "#000";
    g.fillRect(0, 0, W, H);
  }
  const k = Math.min(W / iw, H / ih);
  g.drawImage(im, (W - iw * k) / 2, (H - ih * k) / 2, iw * k, ih * k);
  return c;
}
// Foto sua (loja, estoque, entrega, trator) com logo, faixa e frase
export async function moldura(
  arq: Blob,
  o: { formato: Formato; idioma: "es" | "pt"; titulo: string; sub?: string; tema: Tema },
) {
  await carregarFontes();
  const im = await arquivoParaImagem(arq);
  const [W, H] = TAMANHO[o.formato];
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const iw = im.naturalWidth,
    ih = im.naturalHeight;
  const k = Math.max(W / iw, H / ih);
  g.drawImage(im, (W - iw * k) / 2, (H - ih * k) / 2, iw * k, ih * k);
  const cor = CORES[o.tema];
  const gr = g.createLinearGradient(0, H * 0.45, 0, H);
  gr.addColorStop(0, "rgba(0,0,0,0)");
  gr.addColorStop(1, "rgba(0,0,0,.85)");
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  const story = o.formato === "story";
  await logo(g, 56, story ? 200 : 48, 64, "#fff", cor.pilula, o.idioma);
  let y = H - (story ? 560 : 330);
  if (o.titulo)
    y = bloco(g, o.titulo.toUpperCase(), 64, y, W - 128, {
      fonte: (s) => `${s}px Anton`,
      tam: story ? 110 : 88,
      min: 40,
      linhas: 2,
      cor: "#fff",
    });
  if (o.sub)
    bloco(g, o.sub, 64, y + 16, W - 128, {
      fonte: (s) => `700 ${s}px Archivo`,
      tam: 34,
      min: 22,
      linhas: 2,
      cor: "#e4e4e7",
    });
  g.fillStyle = cor.pilula;
  g.fillRect(0, H - (story ? 200 : 18), W, story ? 8 : 18);
  return c;
}
export const paraPng = (c: HTMLCanvasElement) =>
  new Promise<Blob>((ok, erro) =>
    c.toBlob((b) => (b ? ok(b) : erro(new Error("Falha ao gerar a imagem"))), "image/png"),
  );
