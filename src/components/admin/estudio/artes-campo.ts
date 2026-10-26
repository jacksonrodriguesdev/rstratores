// Linha Campo (Estúdio → Criar): posts e stories com peças do catálogo que têm foto própria,
// frases da AGRO PARTS e um rodapé fixo (logo, WhatsApp, site e Instagram).
// Nove modelos inspirados em referências de autopeças, trazidos para o campo:
// oferta, pergunta, sinais, checklist, por que a AGRO PARTS, mensagem, depoimento,
// ficha da peça e envio. Sete paletas para misturar no feed. Desenha só no navegador (canvas).
// A tela usa sempre uma peça; o campo «pessoa» fica para uma foto própria no futuro.
// Marcas de trator entram só em texto (compatibilidade), nunca o logotipo da marca.
import { PHONE_DISPLAY } from "@/lib/whatsapp";
import {
  arquivoParaImagem,
  bloco,
  carregarFontes,
  contem,
  fotoRecortada,
  logo,
  preco,
  retangulo,
  TAMANHO,
  type Ctx,
  type Formato,
  type ProdutoArte,
} from "./artes";

export type ModeloCampo =
  | "oferta"
  | "pergunta"
  | "sinais"
  | "pessoa"
  | "porque"
  | "mensagem"
  | "depoimento"
  | "ficha"
  | "envio";
export type PaletaCampo = "campo" | "colheita" | "massey" | "ceu" | "terra" | "limpo" | "noite";

type Paleta = {
  nome: string;
  fundo: [string, string, string];
  tx: string; // texto sobre o fundo
  sub: string;
  ac: string; // destaque (palavras entre *asteriscos*, preço, selos)
  acTx: string; // texto sobre o destaque
  claro: boolean; // fundo claro: cartões com borda em vez de branco
  marca: string; // verde da marca no rodapé e nos ícones dos cartões brancos
};
export const PALETAS: Record<PaletaCampo, Paleta> = {
  campo: {
    nome: "Verde campo",
    fundo: ["#22a352", "#0f6232", "#06311a"],
    tx: "#ffffff",
    sub: "#d7f0df",
    ac: "#f9c80e",
    acTx: "#0b2a16",
    claro: false,
    marca: "#1f8a46",
  },
  colheita: {
    nome: "Amarelo colheita",
    fundo: ["#ffe46b", "#f9c80e", "#e3a600"],
    tx: "#13240f",
    sub: "#3d3200",
    ac: "#0f6232",
    acTx: "#ffffff",
    claro: true,
    marca: "#0f6232",
  },
  massey: {
    nome: "Vermelho Massey",
    fundo: ["#e8293f", "#b3121c", "#64090f"],
    tx: "#ffffff",
    sub: "#ffd7db",
    ac: "#ffd24a",
    acTx: "#5a0a0f",
    claro: false,
    marca: "#b3121c",
  },
  ceu: {
    nome: "Azul céu",
    fundo: ["#3b95ff", "#0b5bd3", "#062f6e"],
    tx: "#ffffff",
    sub: "#d8e8ff",
    ac: "#f9c80e",
    acTx: "#062f6e",
    claro: false,
    marca: "#0b5bd3",
  },
  terra: {
    nome: "Terra",
    fundo: ["#8a5427", "#432812", "#1c1008"],
    tx: "#ffffff",
    sub: "#f3dfc8",
    ac: "#f7a531",
    acTx: "#1c1008",
    claro: false,
    marca: "#8a5427",
  },
  limpo: {
    nome: "Branco limpo",
    fundo: ["#ffffff", "#f2f5f1", "#e2e9e1"],
    tx: "#0d2b17",
    sub: "#45574a",
    ac: "#1f8a46",
    acTx: "#ffffff",
    claro: true,
    marca: "#1f8a46",
  },
  noite: {
    nome: "Noite verde",
    fundo: ["#1f4a28", "#0b160e", "#040805"],
    tx: "#ffffff",
    sub: "#c6d6c9",
    ac: "#45e07a",
    acTx: "#04170c",
    claro: false,
    marca: "#1f8a46",
  },
};

export type OpcoesCampo = {
  modelo: ModeloCampo;
  paleta: PaletaCampo;
  formato: Formato;
  idioma: "es" | "pt";
  titulo: string; // *palavras* entre asteriscos saem na cor de destaque
  texto?: string;
  selo?: string;
  destaque?: string; // número grande (sinais) ou nota (depoimento)
  itens?: string[]; // checklist, sinais ou pilares («título|texto»)
  botao?: string;
  modelos?: string; // compatibilidade: «MF 290 · 292 · 275»
  produto?: ProdutoArte | null;
  mostrarPreco?: boolean;
  pessoa?: Blob | null; // foto própria (gente do agro, equipe, cliente, entrega)
  autor?: string;
  cidade?: string;
};

// ---------------------------------------------------------------- texto com destaque
// cola: grudada na palavra anterior, sem espaço (ex.: «*AGRO PARTS*?»)
type Palavra = { p: string; d: boolean; cola?: boolean };
function palavras(t: string): Palavra[] {
  const out: Palavra[] = [];
  let d = false;
  let espacoAntes = true;
  for (const parte of t.split(/(\*)/)) {
    if (parte === "*") {
      d = !d;
      continue;
    }
    parte.split(/\s+/).forEach((w, i) => {
      if (w) out.push({ p: w, d, cola: i === 0 && !espacoAntes && out.length > 0 });
    });
    if (parte) espacoAntes = /\s$/.test(parte);
  }
  return out;
}
type Rico = {
  fonte: (s: number) => string;
  tam: number;
  min: number;
  linhas: number;
  cor: string;
  acento: string;
  alinhar?: "left" | "center";
  altura?: number;
  sublinhar?: boolean;
  maiusculas?: boolean;
  medir?: boolean;
};
// Escreve com quebra de linha, diminuindo a letra até caber; devolve o y final
function rico(g: Ctx, texto: string, x: number, y: number, larg: number, o: Rico) {
  if (!texto.trim()) return y;
  const ws = palavras(o.maiusculas ? texto.toUpperCase() : texto);
  let tam = o.tam;
  let linhas: Palavra[][] = [];
  for (;;) {
    g.font = o.fonte(tam);
    const esp = g.measureText(" ").width;
    linhas = [];
    let atual: Palavra[] = [];
    let w = 0;
    for (const p of ws) {
      const pw = g.measureText(p.p).width;
      if (p.cola && atual.length) {
        w += pw;
        atual.push(p);
      } else if (atual.length && w + esp + pw > larg) {
        linhas.push(atual);
        atual = [p];
        w = pw;
      } else {
        w += (atual.length ? esp : 0) + pw;
        atual.push(p);
      }
    }
    if (atual.length) linhas.push(atual);
    if (linhas.length <= o.linhas || tam - 2 < o.min) break;
    tam -= 2;
  }
  linhas = linhas.slice(0, o.linhas);
  const lh = tam * (o.altura ?? 1.08);
  if (o.medir) return y + linhas.length * lh;
  g.font = o.fonte(tam);
  g.textBaseline = "top";
  g.textAlign = "left";
  const esp = g.measureText(" ").width;
  linhas.forEach((l, i) => {
    const larguras = l.map((p) => g.measureText(p.p).width);
    const total =
      larguras.reduce((s, v) => s + v, 0) + esp * l.filter((p, k) => k > 0 && !p.cola).length;
    let cx = o.alinhar === "center" ? x - total / 2 : x;
    const ly = y + i * lh;
    l.forEach((p, k) => {
      g.fillStyle = p.d ? o.acento : o.cor;
      g.fillText(p.p, cx, ly);
      if (p.d && o.sublinhar) {
        const prox = l[k + 1]?.d && !l[k + 1]?.cola;
        g.fillRect(cx, ly + tam * 0.98, larguras[k] + (prox ? esp : 0), Math.max(3, tam * 0.06));
      }
      cx += larguras[k] + (l[k + 1]?.cola ? 0 : esp);
    });
  });
  return y + linhas.length * lh;
}

// ---------------------------------------------------------------- ícones (desenhados, sem emoji)
function circulo(g: Ctx, x: number, y: number, r: number, cor: string) {
  g.fillStyle = cor;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.fill();
}
function check(g: Ctx, x: number, y: number, r: number, fundo: string, cor: string) {
  circulo(g, x, y, r, fundo);
  g.strokeStyle = cor;
  g.lineWidth = r * 0.28;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.beginPath();
  g.moveTo(x - r * 0.45, y + r * 0.02);
  g.lineTo(x - r * 0.12, y + r * 0.35);
  g.lineTo(x + r * 0.48, y - r * 0.32);
  g.stroke();
}
function estrela(g: Ctx, x: number, y: number, r: number, cor: string) {
  g.fillStyle = cor;
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}
function balaoChat(g: Ctx, x: number, y: number, s: number, cor: string) {
  g.fillStyle = cor;
  retangulo(g, x - s / 2, y - s * 0.42, s, s * 0.72, s * 0.2);
  g.fill();
  g.beginPath();
  g.moveTo(x - s * 0.22, y + s * 0.26);
  g.lineTo(x - s * 0.34, y + s * 0.5);
  g.lineTo(x + s * 0.02, y + s * 0.28);
  g.fill();
}
function caminhao(g: Ctx, x: number, y: number, s: number, cor: string, furo: string) {
  g.fillStyle = cor;
  retangulo(g, x - s * 0.5, y - s * 0.3, s * 0.6, s * 0.44, s * 0.05);
  g.fill();
  retangulo(g, x + s * 0.12, y - s * 0.14, s * 0.36, s * 0.28, s * 0.07);
  g.fill();
  for (const rx of [x - s * 0.3, x + s * 0.3]) {
    circulo(g, rx, y + s * 0.2, s * 0.12, cor);
    circulo(g, rx, y + s * 0.2, s * 0.05, furo);
  }
}
function engrenagem(g: Ctx, x: number, y: number, r: number, cor: string, furo: string) {
  g.fillStyle = cor;
  g.beginPath();
  const dentes = 8;
  for (let i = 0; i < dentes * 2; i++) {
    const a0 = (i * Math.PI) / dentes;
    const rr = i % 2 ? r * 0.78 : r;
    g.arc(x, y, rr, a0, a0 + Math.PI / dentes);
  }
  g.closePath();
  g.fill();
  circulo(g, x, y, r * 0.32, furo);
}
type Icone = "check" | "caminhao" | "engrenagem" | "chat" | "estrela" | "globo" | "insta";
function icone(g: Ctx, tipo: Icone, x: number, y: number, r: number, fundo: string, cor: string) {
  if (tipo === "check") return check(g, x, y, r, fundo, cor);
  circulo(g, x, y, r, fundo);
  if (tipo === "globo" || tipo === "insta") {
    g.strokeStyle = cor;
    g.lineWidth = Math.max(1.5, r * 0.13);
    if (tipo === "globo") {
      g.beginPath();
      g.arc(x, y, r * 0.55, 0, Math.PI * 2);
      g.moveTo(x - r * 0.55, y);
      g.lineTo(x + r * 0.55, y);
      g.stroke();
      g.beginPath();
      g.ellipse(x, y, r * 0.25, r * 0.55, 0, 0, Math.PI * 2);
      g.stroke();
    } else {
      retangulo(g, x - r * 0.52, y - r * 0.52, r * 1.04, r * 1.04, r * 0.3);
      g.stroke();
      g.beginPath();
      g.arc(x, y, r * 0.24, 0, Math.PI * 2);
      g.stroke();
      circulo(g, x + r * 0.3, y - r * 0.3, r * 0.07, cor);
    }
    return;
  }
  if (tipo === "caminhao") caminhao(g, x, y + r * 0.04, r * 1.15, cor, fundo);
  else if (tipo === "engrenagem") engrenagem(g, x, y, r * 0.58, cor, fundo);
  else if (tipo === "chat") balaoChat(g, x, y, r * 1.0, cor);
  else estrela(g, x, y, r * 0.6, cor);
}

// ---------------------------------------------------------------- fundo, fotos e rodapé
function fundo(g: Ctx, p: Paleta, W: number, H: number) {
  const bg = g.createRadialGradient(W * 0.82, H * 0.12, 40, W * 0.5, H * 0.55, H * 0.95);
  bg.addColorStop(0, p.fundo[0]);
  bg.addColorStop(0.5, p.fundo[1]);
  bg.addColorStop(1, p.fundo[2]);
  g.fillStyle = bg;
  g.fillRect(0, 0, W, H);
  // Sulcos de lavoura no canto (curvas finas) e grade de «+» como nas referências
  g.save();
  g.globalAlpha = p.claro ? 0.07 : 0.08;
  g.strokeStyle = p.claro ? "#0d2b17" : "#ffffff";
  g.lineWidth = 3;
  for (let i = 0; i < 9; i++) {
    g.beginPath();
    g.ellipse(
      -W * 0.1,
      H * 1.05,
      W * 0.35 + i * 46,
      H * 0.22 + i * 30,
      -0.25,
      Math.PI * 1.25,
      Math.PI * 2,
    );
    g.stroke();
  }
  g.globalAlpha = p.claro ? 0.18 : 0.22;
  g.fillStyle = p.claro ? "#0d2b17" : "#ffffff";
  g.font = "700 22px Archivo";
  g.textAlign = "center";
  g.textBaseline = "middle";
  for (let r = 0; r < 4; r++)
    for (let c = 0; c < 6; c++) g.fillText("+", W - 230 + c * 34, 150 + r * 34);
  g.restore();
}
// Foto «cobrindo» um retângulo (corta o excesso), com cantos arredondados
function cobrir(
  g: Ctx,
  im: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  r = 0,
  focoY = 0.35,
) {
  const k = Math.max(w / im.naturalWidth, h / im.naturalHeight);
  const iw = im.naturalWidth * k;
  const ih = im.naturalHeight * k;
  g.save();
  retangulo(g, x, y, w, h, r);
  g.clip();
  g.drawImage(im, x + (w - iw) / 2, y + (h - ih) * focoY, iw, ih);
  g.restore();
}
function sombra(g: Ctx, on: boolean, blur = 40) {
  g.shadowColor = on ? "rgba(0,0,0,.28)" : "transparent";
  g.shadowBlur = on ? blur : 0;
  g.shadowOffsetY = on ? blur * 0.35 : 0;
}
function pilula(
  g: Ctx,
  texto: string,
  x: number,
  y: number,
  fundoCor: string,
  cor: string,
  tam = 26,
  centro = false,
) {
  g.font = `800 ${tam}px Archivo`;
  const w = g.measureText(texto).width + tam * 1.6;
  const h = tam * 1.9;
  const x0 = centro ? x - w / 2 : x;
  g.fillStyle = fundoCor;
  retangulo(g, x0, y, w, h, h / 2);
  g.fill();
  g.fillStyle = cor;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(texto, x0 + w / 2, y + h / 2 + 1);
  return { w, h };
}
const RODAPE = 150;
const yRodape = (f: Formato, H: number) => H - RODAPE - (f === "story" ? 250 : 36);
async function rodape(g: Ctx, o: OpcoesCampo, p: Paleta, W: number, H: number) {
  const y = yRodape(o.formato, H);
  const x = 36;
  const w = W - 72;
  sombra(g, true, 30);
  g.fillStyle = "#ffffff";
  retangulo(g, x, y, w, RODAPE, 30);
  g.fill();
  sombra(g, false);
  await logo(g, x + 26, y + 30, 90, "#0d2b17", p.marca, o.idioma);
  const linhas: Array<[Icone, string]> = [
    ["chat", PHONE_DISPLAY],
    ["globo", o.idioma === "pt" ? "agropartsuy.com/pt" : "agropartsuy.com"],
    ["insta", "@rsagroparts"],
  ];
  g.font = "700 25px Archivo";
  const larg = Math.max(...linhas.map(([, t]) => g.measureText(t).width));
  const lx = x + w - 30 - larg;
  linhas.forEach(([ic, t], i) => {
    const ly = y + 34 + i * 40;
    icone(g, ic, lx - 26, ly + 1, 14, p.marca, "#ffffff");
    g.fillStyle = "#1f2a22";
    g.font = "700 25px Archivo";
    g.textAlign = "left";
    g.textBaseline = "middle";
    g.fillText(t, lx, ly + 2);
  });
  return y;
}
async function fotoProduto(o: OpcoesCampo) {
  const u = o.produto?.foto;
  if (!u) return null;
  try {
    return await fotoRecortada(u);
  } catch {
    return null;
  }
}
const cache = new WeakMap<Blob, Promise<HTMLImageElement>>();
function fotoPessoa(b?: Blob | null) {
  if (!b) return null;
  let p = cache.get(b);
  if (!p) {
    p = arquivoParaImagem(b);
    cache.set(b, p);
  }
  return p;
}
// Peça grande com brilho atrás
function desenharPeca(
  g: Ctx,
  im: CanvasImageSource & { width: number; height: number },
  x: number,
  y: number,
  w: number,
  h: number,
  p: Paleta,
) {
  const gl = g.createRadialGradient(
    x + w / 2,
    y + h / 2,
    10,
    x + w / 2,
    y + h / 2,
    Math.max(w, h) * 0.6,
  );
  gl.addColorStop(0, p.claro ? "rgba(255,255,255,.9)" : "rgba(255,255,255,.28)");
  gl.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = gl;
  g.fillRect(x - 40, y - 40, w + 80, h + 80);
  sombra(g, true, 50);
  contem(g, im, x, y, w, h);
  sombra(g, false);
}
const pt = (o: OpcoesCampo) => o.idioma === "pt";
const nomeProd = (o: OpcoesCampo) => o.produto?.nome ?? "";

// ================================================================ modelos
async function oferta(g: Ctx, o: OpcoesCampo, p: Paleta, W: number, H: number, s: number) {
  const top = o.formato === "story" ? 210 : 56;
  const fy = yRodape(o.formato, H);
  await logo(g, 56, top, 78 * s, p.tx, p.ac, o.idioma);
  if (o.produto?.codigo)
    pilula(
      g,
      `${pt(o) ? "Cód." : "Cód."} ${o.produto.codigo}`,
      W - 56 - 300,
      top + 14,
      "rgba(255,255,255,.16)",
      p.tx,
      24,
    );
  const y0 = top + 120 * s;
  const y1 = fy - (o.formato === "quadrado" ? 250 : 330);
  const im = await fotoProduto(o);
  const pes = await fotoPessoa(o.pessoa);
  if (im) desenharPeca(g, im, 150, y0, W - 300, y1 - y0, p);
  else if (pes) cobrir(g, pes, 56, y0, W - 112, y1 - y0, 36);
  // Selo inclinado (ex.: «SEMANA DEL TRACTOR»)
  if (o.selo) {
    g.save();
    g.translate(80, y1 - 40);
    g.rotate(-0.08);
    g.font = `900 ${34 * s}px Archivo`;
    const tw = g.measureText(o.selo.toUpperCase()).width;
    g.fillStyle = p.ac;
    retangulo(g, 0, -10, tw + 50, 64 * s, 12);
    g.fill();
    g.fillStyle = p.acTx;
    g.textBaseline = "top";
    g.textAlign = "left";
    g.fillText(o.selo.toUpperCase(), 25, 4);
    g.restore();
  }
  let y = y1 + 46;
  y = rico(g, o.titulo || nomeProd(o), 56, y, W - 112, {
    fonte: (t) => `${t}px Anton`,
    tam: 72 * s,
    min: 40,
    linhas: 2,
    cor: p.tx,
    acento: p.ac,
    maiusculas: true,
  });
  if (o.modelos)
    y = bloco(g, `${pt(o) ? "Para" : "Para"} ${o.modelos}`, 56, y + 6, W - 112, {
      fonte: (t) => `700 ${t}px Archivo`,
      tam: 32 * s,
      min: 22,
      linhas: 1,
      cor: p.sub,
    });
  if (o.mostrarPreco && o.produto?.preco)
    preco(g, o.produto.preco, o.idioma, 56, y + 14, 92 * s, p.ac);
  else if (o.botao) pilula(g, o.botao, 56, y + 20, p.ac, p.acTx, 30 * s);
  await rodape(g, o, p, W, H);
}

async function pergunta(g: Ctx, o: OpcoesCampo, p: Paleta, W: number, H: number, s: number) {
  const top = o.formato === "story" ? 220 : 60;
  const fy = yRodape(o.formato, H);
  const x = 60;
  const w = W - 120;
  const pad = 54;
  const tit = {
    fonte: (t: number) => `900 ${t}px Archivo`,
    tam: 80 * s,
    min: 44,
    linhas: 3,
    cor: "#0d2b17",
    acento: p.marca,
    alinhar: "center" as const,
    altura: 1.04,
  };
  const sub = {
    fonte: (t: number) => `600 ${t}px Archivo`,
    tam: 36 * s,
    min: 24,
    linhas: 2,
    cor: "#4b5563",
    acento: p.marca,
    alinhar: "center" as const,
  };
  let hText = rico(g, o.titulo, W / 2, 0, w - pad * 2, { ...tit, medir: true });
  if (o.texto) hText = rico(g, o.texto, W / 2, hText + 18, w - pad * 2, { ...sub, medir: true });
  const h = hText + pad * 2;
  sombra(g, true, 40);
  g.fillStyle = "#ffffff";
  retangulo(g, x, top, w, h, 46);
  g.fill();
  g.beginPath();
  g.moveTo(W / 2 - 50, top + h - 2);
  g.lineTo(W / 2, top + h + 60);
  g.lineTo(W / 2 + 50, top + h - 2);
  g.fill();
  sombra(g, false);
  const y = rico(g, o.titulo, W / 2, top + pad, w - pad * 2, tit);
  if (o.texto) rico(g, o.texto, W / 2, y + 18, w - pad * 2, sub);
  const y0 = top + h + 90;
  const im = await fotoProduto(o);
  const pes = await fotoPessoa(o.pessoa);
  if (pes) {
    const r = Math.min((fy - y0 - 40) / 2, 300);
    g.save();
    g.beginPath();
    g.arc(W / 2, y0 + r, r, 0, Math.PI * 2);
    g.clip();
    cobrir(g, pes, W / 2 - r, y0, r * 2, r * 2);
    g.restore();
    g.strokeStyle = p.ac;
    g.lineWidth = 10;
    g.beginPath();
    g.arc(W / 2, y0 + r, r + 4, 0, Math.PI * 2);
    g.stroke();
    if (im) desenharPeca(g, im, W / 2 + r * 0.4, y0 + r * 1.1, r * 1.1, r * 0.9, p);
  } else if (im) desenharPeca(g, im, 120, y0, W - 240, fy - y0 - 40, p);
  await rodape(g, o, p, W, H);
}

async function sinais(g: Ctx, o: OpcoesCampo, p: Paleta, W: number, H: number, s: number) {
  const top = o.formato === "story" ? 230 : 70;
  const fy = yRodape(o.formato, H);
  const num = (o.destaque || "3").slice(0, 2);
  const tn = (o.formato === "quadrado" ? 400 : 480) * (num.length > 1 ? 0.7 : 1);
  g.font = `${tn}px Anton`;
  g.fillStyle = p.ac;
  g.textBaseline = "top";
  g.textAlign = "left";
  const nw = g.measureText(num).width;
  g.save();
  sombra(g, true, 30);
  g.fillText(num, 40, top + tn * 0.02);
  g.restore();
  const tx = 40 + nw + 30;
  let y = rico(g, o.titulo, tx, top + 30, W - tx - 56, {
    fonte: (t) => `${t}px Anton`,
    tam: 96 * s,
    min: 46,
    linhas: 5,
    cor: p.tx,
    acento: p.ac,
    maiusculas: true,
    altura: 1.02,
  });
  const pil = pilula(
    g,
    o.botao || (pt(o) ? "ARRASTE PARA O LADO  →" : "DESLIZÁ PARA EL COSTADO  →"),
    tx,
    y + 22,
    "#ffffff",
    "#0d2b17",
    24 * s,
  );
  y = Math.max(y + 22 + pil.h, top + tn * 0.85) + 40;
  const im = await fotoProduto(o);
  const pes = await fotoPessoa(o.pessoa);
  if (pes) cobrir(g, pes, 56, y, W - 112, fy - y - 30, 36);
  else if (im) desenharPeca(g, im, 200, y, W - 260, fy - y - 30, p);
  await rodape(g, o, p, W, H);
}

async function pessoa(g: Ctx, o: OpcoesCampo, p: Paleta, W: number, H: number, s: number) {
  const top = o.formato === "story" ? 220 : 60;
  const fy = yRodape(o.formato, H);
  const pes = await fotoPessoa(o.pessoa);
  const im = await fotoProduto(o);
  if (pes) {
    cobrir(g, pes, W * 0.36, 0, W * 0.64, H, 0, 0.2);
    // Lado do texto em cor lisa, fundindo com a foto (sem faixa entre o fundo e a foto)
    const gr = g.createLinearGradient(0, 0, W * 0.64, 0);
    gr.addColorStop(0, p.fundo[2]);
    gr.addColorStop(0.55, p.fundo[1]);
    gr.addColorStop(1, `${p.fundo[1]}00`);
    g.fillStyle = gr;
    g.fillRect(0, 0, W * 0.64, H);
  } else if (im) desenharPeca(g, im, W * 0.5, top + 160, W * 0.46, fy - top - 260, p);
  await logo(g, 56, top, 74 * s, p.tx, p.ac, o.idioma);
  const lw = W * 0.56;
  const y = rico(g, o.titulo, 56, top + 140 * s, lw, {
    fonte: (t) => `900 ${t}px Archivo`,
    tam: 74 * s,
    min: 40,
    linhas: 5,
    cor: p.tx,
    acento: p.ac,
    sublinhar: true,
    altura: 1.1,
  });
  const itens = (o.itens ?? []).filter(Boolean).slice(0, 6);
  if (itens.length) {
    const lh = 58 * s;
    const ch = itens.length * lh + 50;
    const cy = Math.min(y + 40, fy - ch - 30);
    sombra(g, true, 30);
    g.fillStyle = "#ffffff";
    retangulo(g, 56, cy, lw, ch, 28);
    g.fill();
    sombra(g, false);
    itens.forEach((t, i) => {
      const iy = cy + 25 + i * lh + lh / 2;
      check(g, 56 + 42, iy, 17, p.marca, "#ffffff");
      bloco(g, t, 56 + 74, iy - 16 * s, lw - 100, {
        fonte: (z) => `700 ${z}px Archivo`,
        tam: 30 * s,
        min: 18,
        linhas: 1,
        cor: "#1f2a22",
      });
    });
  } else if (o.texto)
    bloco(g, o.texto, 56, y + 24, lw, {
      fonte: (z) => `600 ${z}px Archivo`,
      tam: 34 * s,
      min: 22,
      linhas: 4,
      cor: p.sub,
    });
  await rodape(g, o, p, W, H);
}

async function porque(g: Ctx, o: OpcoesCampo, p: Paleta, W: number, H: number, s: number) {
  const story = o.formato === "story";
  const fy = yRodape(o.formato, H);
  const pes = await fotoPessoa(o.pessoa);
  let y = story ? 220 : 60;
  if (pes) {
    const bh = H * (o.formato === "quadrado" ? 0.3 : 0.32);
    cobrir(g, pes, 0, 0, W, bh + (story ? 120 : 0), 0, 0.3);
    const gr = g.createLinearGradient(0, bh * 0.5, 0, bh + (story ? 120 : 0));
    gr.addColorStop(0, `${p.fundo[1]}00`);
    gr.addColorStop(1, p.fundo[1]);
    g.fillStyle = gr;
    g.fillRect(0, 0, W, bh + (story ? 121 : 1));
    // Sombra no alto para o logo branco aparecer em foto clara
    const gt = g.createLinearGradient(0, 0, 0, y + 200);
    gt.addColorStop(0, "rgba(0,0,0,.55)");
    gt.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gt;
    g.fillRect(0, 0, W, y + 200);
    await logo(g, 56, y, 70 * s, "#ffffff", p.ac, o.idioma);
    y = bh + (story ? 120 : 0) - 10;
  } else {
    await logo(g, W / 2, y, 80 * s, p.tx, p.ac, o.idioma, true);
    y += 120 * s;
    // Peça em destaque entre o logo e o título
    const im = await fotoProduto(o);
    if (im) {
      const hp = o.formato === "quadrado" ? 170 : o.formato === "story" ? 380 : 260;
      desenharPeca(g, im, W * 0.2, y, W * 0.6, hp, p);
      y += hp + 30;
    }
  }
  y = rico(g, o.titulo, W / 2, y, W - 120, {
    fonte: (t) => `900 ${t}px Archivo`,
    tam: 68 * s,
    min: 38,
    linhas: 2,
    cor: p.tx,
    acento: p.ac,
    alinhar: "center",
  });
  const itens = (o.itens ?? []).filter(Boolean).slice(0, 3);
  const ics: Icone[] = ["engrenagem", "caminhao", "chat"];
  const gap = 22;
  const y0 = y + 36;
  const hc = Math.min(190, (fy - 36 - y0 - gap * (itens.length - 1)) / Math.max(1, itens.length));
  itens.forEach((t, i) => {
    const [a, b] = t.split("|");
    const cy = y0 + i * (hc + gap);
    g.fillStyle = p.claro ? "#ffffff" : "rgba(255,255,255,.1)";
    retangulo(g, 60, cy, W - 120, hc, 28);
    g.fill();
    if (p.claro) {
      g.strokeStyle = "rgba(13,43,23,.12)";
      g.lineWidth = 2;
      g.stroke();
    }
    const r = Math.min(52, hc * 0.32);
    icone(g, ics[i], 60 + 40 + r, cy + hc / 2, r, p.ac, p.acTx);
    const tx = 60 + 80 + r * 2;
    const ty = bloco(
      g,
      (a ?? "").trim(),
      tx,
      cy + hc / 2 - (b ? 42 * s : 20 * s),
      W - 120 - (tx - 60) - 30,
      {
        fonte: (z) => `800 ${z}px Archivo`,
        tam: 38 * s,
        min: 24,
        linhas: 1,
        cor: p.claro ? "#0d2b17" : p.tx,
      },
    );
    if (b)
      bloco(g, b.trim(), tx, ty + 6, W - 120 - (tx - 60) - 30, {
        fonte: (z) => `500 ${z}px Archivo`,
        tam: 28 * s,
        min: 18,
        linhas: 2,
        cor: p.claro ? "#45574a" : p.sub,
      });
  });
  await rodape(g, o, p, W, H);
}

async function mensagem(g: Ctx, o: OpcoesCampo, p: Paleta, W: number, H: number, s: number) {
  const fy = yRodape(o.formato, H);
  const top = o.formato === "story" ? 220 : 60;
  // Letreiro grande e apagado ao fundo
  g.save();
  g.globalAlpha = p.claro ? 0.06 : 0.08;
  g.fillStyle = p.claro ? "#0d2b17" : "#ffffff";
  g.font = "320px Anton";
  g.textBaseline = "top";
  g.textAlign = "left";
  g.translate(-40, H * 0.15);
  g.rotate(-0.12);
  g.fillText("AGRO", 0, 0);
  g.fillText("PARTS", 60, 300);
  g.restore();
  const x = 90;
  const w = W - 180;
  const pad = 50;
  const tit = {
    fonte: (t: number) => `900 ${t}px Archivo`,
    tam: 62 * s,
    min: 36,
    linhas: 3,
    cor: "#0d2b17",
    acento: p.marca,
    alinhar: "center" as const,
  };
  const sub = {
    fonte: (t: number) => `500 ${t}px Archivo`,
    tam: 34 * s,
    min: 22,
    linhas: 5,
    cor: "#4b5563",
    acento: p.marca,
    alinhar: "center" as const,
    altura: 1.25,
  };
  const cab = 96;
  const ic = 64;
  let hT = rico(g, o.titulo, W / 2, 0, w - pad * 2, { ...tit, medir: true });
  if (o.texto) hT = rico(g, o.texto, W / 2, hT + 20, w - pad * 2, { ...sub, medir: true });
  const hb = o.botao ? 110 : 0;
  const h = cab + ic * 2 + 40 + hT + hb + pad;
  // Peça acima do cartão quando sobra espaço; o cartão desce para baixo dela
  const im = await fotoProduto(o);
  const livre = fy - top - h - 60;
  const hp = im ? Math.min(livre - 40, o.formato === "story" ? 520 : 360) : 0;
  if (im && hp > 140) desenharPeca(g, im, W * 0.18, top + 10, W * 0.64, hp, p);
  const cy =
    im && hp > 140
      ? top + hp + 40 + Math.max(0, (fy - (top + hp + 40) - h - 20) / 2)
      : Math.max(top + 60, top + (fy - top - h) / 2);
  sombra(g, true, 50);
  g.fillStyle = "#ffffff";
  retangulo(g, x, cy, w, h, 40);
  g.fill();
  sombra(g, false);
  // Cabeçalho da notificação
  g.fillStyle = "#f3f4f6";
  retangulo(g, x, cy, w, cab, 40);
  g.fill();
  g.fillRect(x, cy + cab - 40, w, 40);
  g.fillStyle = p.marca;
  retangulo(g, x + 34, cy + 24, 48, 48, 12);
  g.fill();
  g.fillStyle = "#ffffff";
  g.font = "900 22px Archivo";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("AP", x + 58, cy + 49);
  g.textAlign = "left";
  g.fillStyle = "#111827";
  g.font = "800 28px Archivo";
  g.fillText("AGRO PARTS", x + 98, cy + 49);
  g.fillStyle = "#6b7280";
  g.font = "500 24px Archivo";
  g.textAlign = "right";
  g.fillText(pt(o) ? "agora" : "ahora", x + w - 34, cy + 49);
  icone(g, "chat", W / 2, cy + cab + 30 + ic, ic, p.marca, "#ffffff");
  let y = rico(g, o.titulo, W / 2, cy + cab + 40 + ic * 2 + 10, w - pad * 2, tit);
  if (o.texto) y = rico(g, o.texto, W / 2, y + 20, w - pad * 2, sub);
  if (o.botao) pilula(g, o.botao, W / 2, y + 34, p.marca, "#ffffff", 30 * s, true);
  await rodape(g, o, p, W, H);
}

async function depoimento(g: Ctx, o: OpcoesCampo, p: Paleta, W: number, H: number, s: number) {
  const top = o.formato === "story" ? 220 : 60;
  const fy = yRodape(o.formato, H);
  const x = 70;
  const w = W - 140;
  const pad = 56;
  const r = (o.formato === "quadrado" ? 100 : 130) * s;
  const tit = {
    fonte: (t: number) => `900 ${t}px Archivo`,
    tam: 84 * s,
    min: 44,
    linhas: 1,
    cor: p.tx,
    acento: p.ac,
    alinhar: "center" as const,
  };
  const q = {
    fonte: (t: number) => `600 ${t}px Archivo`,
    tam: 44 * s,
    min: 24,
    linhas: 6,
    cor: "#1f2a22",
    acento: p.marca,
    alinhar: "center" as const,
    altura: 1.3,
  };
  const frase = `“${o.texto || ""}”`;
  const titulo = o.titulo || "#ClienteAGROPARTS";
  // Mede tudo antes para centralizar o bloco entre o topo e o rodapé
  const hTit = rico(g, titulo, W / 2, 0, W - 120, { ...tit, medir: true });
  const hq = rico(g, frase, W / 2, 0, w - pad * 2, { ...q, medir: true });
  const hn = o.cidade ? 100 : 64;
  const hCard = hq + pad * 2 + hn;
  const total = hTit + 40 + r * 2 + 30 + 76 + hCard;
  let y = top + Math.max(0, (fy - 40 - top - total) / 2);
  y = rico(g, titulo, W / 2, y, W - 120, tit);
  const cyFoto = y + 40 + r;
  const pes = await fotoPessoa(o.pessoa);
  circulo(g, W / 2, cyFoto, r + 9, p.ac);
  if (pes) {
    g.save();
    g.beginPath();
    g.arc(W / 2, cyFoto, r, 0, Math.PI * 2);
    g.clip();
    cobrir(g, pes, W / 2 - r, cyFoto - r, r * 2, r * 2);
    g.restore();
  } else {
    circulo(g, W / 2, cyFoto, r, "#ffffff");
    // A peça que o cliente comprou no círculo; sem peça, a inicial do nome
    const im = await fotoProduto(o);
    if (im) contem(g, im, W / 2 - r * 0.72, cyFoto - r * 0.72, r * 1.44, r * 1.44);
    else {
      g.fillStyle = p.marca;
      g.font = `${r * 1.1}px Anton`;
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText((o.autor || "C").trim().charAt(0).toUpperCase(), W / 2, cyFoto + 4);
    }
  }
  y = cyFoto + r + 30;
  const nota = Math.max(1, Math.min(5, Math.round(Number(o.destaque) || 5)));
  for (let i = 0; i < 5; i++)
    estrela(g, W / 2 + (i - 2) * 70, y + 26, 30, i < nota ? p.ac : "rgba(255,255,255,.3)");
  y += 76;
  const h = Math.min(hCard, fy - 30 - y);
  g.fillStyle = "#ffffff";
  sombra(g, true, 30);
  retangulo(g, x, y, w, h, 32);
  g.fill();
  sombra(g, false);
  g.fillStyle = p.marca;
  g.font = "180px Anton";
  g.textAlign = "left";
  g.textBaseline = "top";
  g.globalAlpha = 0.15;
  g.fillText("“", x + 24, y - 10);
  g.globalAlpha = 1;
  const yq = rico(g, frase, W / 2, y + pad, w - pad * 2, q);
  g.fillStyle = "#0d2b17";
  g.font = "800 34px Archivo";
  g.textAlign = "center";
  g.fillText(o.autor || "", W / 2, yq + 18);
  if (o.cidade) {
    g.fillStyle = "#6b7280";
    g.font = "500 28px Archivo";
    g.fillText(o.cidade, W / 2, yq + 60);
  }
  await rodape(g, o, p, W, H);
}

async function ficha(g: Ctx, o: OpcoesCampo, p: Paleta, W: number, H: number, s: number) {
  const top = o.formato === "story" ? 210 : 50;
  const fy = yRodape(o.formato, H);
  await logo(g, 56, top, 72 * s, p.tx, p.ac, o.idioma);
  if (o.selo) {
    g.font = "800 24px Archivo";
    const tw = g.measureText(o.selo).width + 40;
    pilula(g, o.selo, W - 56 - tw, top + 14, p.ac, p.acTx, 24);
  }
  const x = 50;
  const y = top + 110 * s;
  const w = W - 100;
  const h = fy - 30 - y;
  g.fillStyle = "#ffffff";
  sombra(g, true, 40);
  retangulo(g, x, y, w, h, 40);
  g.fill();
  sombra(g, false);
  let ty = rico(g, o.titulo || nomeProd(o), x + 50, y + 46, w - 100, {
    fonte: (t) => `900 ${t}px Archivo`,
    tam: 54 * s,
    min: 32,
    linhas: 2,
    cor: "#0d2b17",
    acento: p.marca,
  });
  if (o.modelos)
    ty = bloco(g, `${pt(o) ? "Para" : "Para"}: ${o.modelos}`, x + 50, ty + 8, w - 100, {
      fonte: (t) => `700 ${t}px Archivo`,
      tam: 32 * s,
      min: 22,
      linhas: 2,
      cor: p.marca,
    });
  const baixo = y + h - 130;
  const im = await fotoProduto(o);
  if (im) {
    sombra(g, true, 30);
    contem(g, im, x + 80, ty + 30, w - 160, baixo - ty - 50);
    sombra(g, false);
  }
  if (o.produto?.codigo) {
    g.font = "600 24px Archivo";
    g.fillStyle = "#6b7280";
    g.textAlign = "left";
    g.textBaseline = "top";
    g.fillText(pt(o) ? "Código de referência" : "Código de referencia", x + 50, baixo + 4);
    pilula(g, o.produto.codigo, x + 50, baixo + 40, p.marca, "#ffffff", 30);
  }
  if (o.mostrarPreco && o.produto?.preco) {
    const val = pt(o) && o.produto.preco.brl ? o.produto.preco.brl : o.produto.preco.uyu;
    g.font = `${84 * s}px Anton`;
    g.fillStyle = "#0d2b17";
    g.textAlign = "right";
    g.textBaseline = "top";
    g.fillText(val, x + w - 50, baixo + 10);
  } else if (o.botao) {
    g.font = `800 ${28 * s}px Archivo`;
    const bw = g.measureText(o.botao).width + 28 * s * 1.6;
    pilula(g, o.botao, x + w - 50 - bw, baixo + 40, p.ac, p.acTx, 28 * s);
  }
  await rodape(g, o, p, W, H);
}

async function envio(g: Ctx, o: OpcoesCampo, p: Paleta, W: number, H: number, s: number) {
  const top = o.formato === "story" ? 210 : 56;
  const fy = yRodape(o.formato, H);
  const pes = await fotoPessoa(o.pessoa);
  if (pes) {
    cobrir(g, pes, 0, 0, W, H, 0, 0.3);
    const gr = g.createLinearGradient(0, H * 0.3, 0, H);
    gr.addColorStop(0, "rgba(0,0,0,0)");
    gr.addColorStop(0.55, "rgba(0,0,0,.6)");
    gr.addColorStop(1, "rgba(0,0,0,.88)");
    g.fillStyle = gr;
    g.fillRect(0, 0, W, H);
    const gt = g.createLinearGradient(0, 0, 0, 260);
    gt.addColorStop(0, "rgba(0,0,0,.5)");
    gt.addColorStop(1, "rgba(0,0,0,0)");
    g.fillStyle = gt;
    g.fillRect(0, 0, W, 260);
  } else {
    const im = await fotoProduto(o);
    caminhao(g, W / 2, top + 380, 520, "rgba(255,255,255,.12)", p.fundo[1]);
    if (im) desenharPeca(g, im, W * 0.25, top + 170, W * 0.5, 420, p);
  }
  await logo(g, 56, top, 74 * s, "#ffffff", p.ac, o.idioma);
  const tit = {
    fonte: (t: number) => `${t}px Anton`,
    tam: 104 * s,
    min: 50,
    linhas: 3,
    cor: "#ffffff",
    acento: p.ac,
    maiusculas: true,
    altura: 1.02,
  };
  const sub = {
    fonte: (t: number) => `600 ${t}px Archivo`,
    tam: 34 * s,
    min: 22,
    linhas: 2,
    cor: "#e5e7eb",
    acento: p.ac,
  };
  let h = rico(g, o.titulo, 56, 0, W - 112, { ...tit, medir: true });
  if (o.texto) h = rico(g, o.texto, 56, h + 16, W - 112, { ...sub, medir: true });
  const hp = o.botao ? 90 : 0;
  let y = fy - 40 - h - hp;
  y = rico(g, o.titulo, 56, y, W - 112, tit);
  if (o.texto) y = rico(g, o.texto, 56, y + 16, W - 112, sub);
  if (o.botao) {
    const tam = 28 * s;
    g.font = `800 ${tam}px Archivo`;
    const ph = tam * 1.9;
    const pw = g.measureText(o.botao).width + tam * 1.6 + 56;
    const py = y + 24;
    g.fillStyle = p.ac;
    retangulo(g, 56, py, pw, ph, ph / 2);
    g.fill();
    caminhao(g, 56 + tam * 0.8 + 22, py + ph / 2, 42, p.acTx, p.ac);
    g.fillStyle = p.acTx;
    g.textAlign = "left";
    g.textBaseline = "middle";
    g.fillText(o.botao, 56 + tam * 0.8 + 56, py + ph / 2 + 1);
  }
  await rodape(g, o, p, W, H);
}

const DESENHO: Record<ModeloCampo, typeof oferta> = {
  oferta,
  pergunta,
  sinais,
  pessoa,
  porque,
  mensagem,
  depoimento,
  ficha,
  envio,
};

export async function gerarCampo(o: OpcoesCampo): Promise<HTMLCanvasElement> {
  await carregarFontes();
  const [W, H] = TAMANHO[o.formato];
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  const p = PALETAS[o.paleta];
  fundo(g, p, W, H);
  await DESENHO[o.modelo](g, o, p, W, H, o.formato === "quadrado" ? 0.86 : 1);
  return c;
}
