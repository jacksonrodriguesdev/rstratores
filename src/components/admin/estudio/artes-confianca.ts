// Carrosséis de confiança (Estúdio → Criar): dois carrosséis prontos, trazidos de referências de
// conteúdo educativo e adaptados à AGRO PARTS:
// · «Armadilhas» (5 slides): caixa-armadilha com mensagens de golpe na compra de peças
//   (preço bom demais, pressa para pagar, peça sem código) e o slide final com como compramos.
// · «Lupa no site» (7 slides): um celular com o nosso site (peças Massey Ferguson com foto, formas
//   de pagamento, envio e WhatsApp) e a lupa passando por cada parte, com uma frase embaixo.
// O site do celular é desenhado com dados reais (peças com foto própria, preços, telefone);
// opcionalmente, um print do site enviado pelo admin vai na tela do celular da capa e do final.
// Tudo desenhado no canvas (sem fotos de terceiros, sem logotipos de outras marcas).
import { PHONE_DISPLAY } from "@/lib/whatsapp";
import {
  arquivoParaImagem,
  carregarFontes,
  contem,
  fotoRecortada,
  imagem,
  logo,
  retangulo,
  type Ctx,
  type ProdutoArte,
} from "./artes";

const W = 1080;
const H = 1350;
export type Idioma = "es" | "pt";
export type Carrossel = "armadilhas" | "lupa";
// Texto de um slide: *trecho* = caixa verde escura com letra branca (o «Tô fora.»)
export type SlideTexto = { titulo?: string; texto?: string; aviso?: string; itens?: string[] };
export type OpcoesConfianca = {
  carrossel: Carrossel;
  idioma: Idioma;
  produtos: ProdutoArte[]; // até 2 peças com foto (Massey Ferguson)
  slides: SlideTexto[];
  print?: Blob | null; // print do site no celular (capa e final do «Lupa»)
};

const VERDE_ESCURO = "#2c5a2e";

// ---------------------------------------------------------------- textos prontos
export const TEXTOS: Record<Carrossel, Record<Idioma, SlideTexto[]>> = {
  armadilhas: {
    pt: [
      {
        titulo: "Armadilhas na compra de peças que eu não caio",
        texto: "porque compro na *AGRO PARTS*",
      },
      {
        aviso: "Bomba hidráulica MF 290 por R$ 99. *Só no PIX, hoje!*",
        texto: "Preço bom demais + vendedor sem CNPJ? *Tô fora.*",
      },
      {
        aviso: "Última unidade! *Manda o sinal agora* que eu seguro a peça.",
        texto: "Criou pressa para eu pagar? *Já desconfiei.*",
      },
      {
        aviso: "Serve em qualquer Massey, *pode confiar.*",
        texto: "Sem o código da peça? *Não compro no escuro.*",
      },
      {
        titulo: "Na AGRO PARTS você compra seguro:",
        itens: [
          "código original da peça",
          "cartão, PIX ou link de pagamento seguro",
          "nota fiscal e envio para RS, SC e PR",
          "gente do campo no WhatsApp",
        ],
      },
    ],
    es: [
      {
        titulo: "Trampas al comprar repuestos en las que no caigo",
        texto: "porque compro en *AGRO PARTS*",
      },
      {
        aviso: "Bomba hidráulica MF 290 a $U 990. *¡Solo transferencia, hoy!*",
        texto: "¿Precio regalado + vendedor sin RUT? *Paso.*",
      },
      {
        aviso: "¡Última unidad! *Mandá la seña ahora* y te la guardo.",
        texto: "¿Te apuran para pagar? *Ya desconfié.*",
      },
      {
        aviso: "Sirve para cualquier Massey, *confiá.*",
        texto: "¿Sin el código de la pieza? *No compro a ciegas.*",
      },
      {
        titulo: "En AGRO PARTS comprás seguro:",
        itens: [
          "código original de la pieza",
          "tarjeta, Abitab, Redpagos o link de pago",
          "precio y disponibilidad antes de pagar",
          "gente del campo por WhatsApp",
        ],
      },
    ],
  },
  lupa: {
    pt: [
      { titulo: "Olhe a AGRO PARTS *com lupa*" },
      { texto: "Peças para *Massey Ferguson* com código original." },
      { texto: "Cada peça com *código, foto e preço* à vista." },
      { texto: "Pague como preferir: *cartão, PIX ou link seguro.*" },
      { texto: "Enviamos para *RS, SC e PR* com nota fiscal." },
      { texto: "Dúvida? *Gente do campo* responde no WhatsApp." },
      {
        titulo: "Antes de comprar sua peça, confira:",
        itens: [
          "código original",
          "serve no seu modelo",
          "forma de pagamento segura",
          "envio com rastreio",
        ],
      },
    ],
    es: [
      { titulo: "Mirá AGRO PARTS *con lupa*" },
      { texto: "Repuestos para *Massey Ferguson* con código original." },
      { texto: "Cada pieza con *código, foto y precio* a la vista." },
      { texto: "Pagás como prefieras: *tarjeta, Abitab, Redpagos o link.*" },
      { texto: "Te pasamos *precio y disponibilidad* antes de comprar." },
      { texto: "¿Dudas? *Gente del campo* te responde por WhatsApp." },
      {
        titulo: "Antes de comprar tu repuesto, confirmá:",
        itens: [
          "código original",
          "que sirva para tu modelo",
          "forma de pago segura",
          "envío con seguimiento",
        ],
      },
    ],
  },
};
// Formas de pagamento de cada país (as do link de pagamento do site)
export const PAGAMENTOS: Record<Idioma, string[]> = {
  es: ["Tarjeta", "Abitab", "Redpagos", "Link de pago"],
  pt: ["Cartão", "PIX", "Link de pagamento"],
};

// ---------------------------------------------------------------- texto com caixa de destaque
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
type Frase = {
  tam: number;
  peso?: number;
  cor?: string;
  caixa?: string; // fundo do destaque; sem caixa = só negrito
  corDestaque?: string;
  alinhar?: "left" | "center";
  linhas?: number;
  altura?: number;
  medir?: boolean;
};
function frase(g: Ctx, texto: string, x: number, y: number, larg: number, o: Frase) {
  if (!texto?.trim()) return y;
  const ws = palavras(texto);
  const fonte = (t: number, d: boolean) =>
    `${d && !o.caixa ? 800 : (o.peso ?? 700)} ${t}px Archivo`;
  let tam = o.tam;
  let linhas: Palavra[][] = [];
  const medidaDe = (p: Palavra) => {
    g.font = fonte(tam, p.d);
    return g.measureText(p.p).width;
  };
  for (;;) {
    g.font = fonte(tam, false);
    const esp = g.measureText(" ").width;
    linhas = [];
    let atual: Palavra[] = [];
    let w = 0;
    for (const p of ws) {
      const pw = medidaDe(p);
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
    if (linhas.length <= (o.linhas ?? 4) || tam <= 22) break;
    tam -= 2;
  }
  const lh = tam * (o.altura ?? 1.25);
  if (o.medir) return y + linhas.length * lh;
  g.textBaseline = "middle";
  g.textAlign = "left";
  g.font = fonte(tam, false);
  const esp = g.measureText(" ").width;
  linhas.forEach((l, i) => {
    const ls = l.map(medidaDe);
    const total = ls.reduce((s, v) => s + v, 0) + esp * l.filter((p, k) => k > 0 && !p.cola).length;
    let cx = o.alinhar === "center" ? x - total / 2 : x;
    const cy = y + i * lh + lh / 2;
    // Caixas atrás dos trechos destacados (uma por trecho contínuo na linha)
    if (o.caixa) {
      let ini = -1;
      let px = cx;
      l.forEach((p, k) => {
        const passo = ls[k] + (l[k + 1]?.cola ? 0 : esp);
        if (p.d && ini < 0) ini = px;
        const fimTrecho = p.d && !l[k + 1]?.d;
        if (fimTrecho && ini >= 0) {
          g.fillStyle = o.caixa!;
          retangulo(
            g,
            ini - tam * 0.18,
            cy - tam * 0.62,
            px + ls[k] - ini + tam * 0.36,
            tam * 1.22,
            6,
          );
          g.fill();
          ini = -1;
        }
        px += passo;
      });
    }
    l.forEach((p, k) => {
      g.font = fonte(tam, p.d);
      g.fillStyle = p.d ? (o.corDestaque ?? o.cor ?? "#fff") : (o.cor ?? "#fff");
      g.fillText(p.p, cx, cy + 1);
      cx += ls[k] + (l[k + 1]?.cola ? 0 : esp);
    });
  });
  return y + linhas.length * lh;
}

// ---------------------------------------------------------------- fundo, contador, ícones
function fundo(g: Ctx) {
  const gr = g.createRadialGradient(W / 2, H * 0.45, 30, W / 2, H * 0.5, H * 0.85);
  gr.addColorStop(0, "#94d36a");
  gr.addColorStop(0.45, "#62b23e");
  gr.addColorStop(1, "#438f2b");
  g.fillStyle = gr;
  g.fillRect(0, 0, W, H);
  // Granulado leve, como papel fotográfico
  g.save();
  for (let i = 0; i < 2600; i++) {
    g.globalAlpha = 0.035;
    g.fillStyle = i % 2 ? "#000" : "#fff";
    g.fillRect((i * 7919) % W, (i * 104729) % H, 2, 2);
  }
  g.restore();
}
function contador(g: Ctx, i: number, n: number) {
  const t = `${i}/${n}`;
  g.font = "600 30px Archivo";
  const w = g.measureText(t).width + 44;
  g.fillStyle = "rgba(38,74,36,.92)";
  retangulo(g, W - 46 - w, 40, w, 62, 31);
  g.fill();
  g.fillStyle = "#fff";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(t, W - 46 - w / 2, 72);
}
function check(g: Ctx, x: number, y: number, r: number) {
  g.strokeStyle = "#ffffff";
  g.lineWidth = 3;
  g.beginPath();
  g.arc(x, y, r, 0, Math.PI * 2);
  g.stroke();
  g.lineWidth = r * 0.28;
  g.lineCap = "round";
  g.lineJoin = "round";
  g.strokeStyle = "#d6f5a8";
  g.beginPath();
  g.moveTo(x - r * 0.45, y + r * 0.02);
  g.lineTo(x - r * 0.1, y + r * 0.38);
  g.lineTo(x + r * 0.62, y - r * 0.45);
  g.stroke();
}
function envelope(g: Ctx, x: number, y: number, s: number, cor: string) {
  g.strokeStyle = cor;
  g.lineWidth = Math.max(2, s * 0.09);
  g.lineJoin = "round";
  retangulo(g, x - s / 2, y - s * 0.34, s, s * 0.68, s * 0.08);
  g.stroke();
  g.beginPath();
  g.moveTo(x - s / 2 + 2, y - s * 0.3);
  g.lineTo(x, y + s * 0.05);
  g.lineTo(x + s / 2 - 2, y - s * 0.3);
  g.stroke();
}
function caminhao(g: Ctx, x: number, y: number, s: number, cor: string, furo: string) {
  g.fillStyle = cor;
  retangulo(g, x - s * 0.5, y - s * 0.3, s * 0.6, s * 0.44, s * 0.05);
  g.fill();
  retangulo(g, x + s * 0.12, y - s * 0.14, s * 0.36, s * 0.28, s * 0.07);
  g.fill();
  for (const rx of [x - s * 0.3, x + s * 0.3]) {
    g.fillStyle = cor;
    g.beginPath();
    g.arc(rx, y + s * 0.2, s * 0.12, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = furo;
    g.beginPath();
    g.arc(rx, y + s * 0.2, s * 0.05, 0, Math.PI * 2);
    g.fill();
  }
}
async function marca(g: Ctx, idioma: Idioma, y: number) {
  await logo(g, W / 2, y, 64, "#ffffff", "#e9ffd2", idioma, true);
}

// ---------------------------------------------------------------- o site no celular
type Regiao = { y: number; h: number };
type Site = {
  tela: HTMLCanvasElement;
  regioes: Record<"hero" | "pecas" | "pago" | "envio" | "zap", Regiao>;
};
const SW = 600;
const SH = 1300;
async function fotoPeca(p?: ProdutoArte) {
  if (!p?.foto) return null;
  try {
    return await fotoRecortada(p.foto);
  } catch {
    return null;
  }
}
async function desenharSite(idioma: Idioma, produtos: ProdutoArte[]): Promise<Site> {
  const c = document.createElement("canvas");
  c.width = SW;
  c.height = SH;
  const g = c.getContext("2d")!;
  const pt = idioma === "pt";
  const verde = "#1f7a3a";
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, SW, SH);
  // barra de status
  g.fillStyle = "#111";
  g.font = "700 20px Archivo";
  g.textBaseline = "middle";
  g.textAlign = "left";
  g.fillText("9:41", 34, 26);
  for (let i = 0; i < 4; i++) g.fillRect(470 + i * 9, 32 - i * 5, 6, 6 + i * 5);
  retangulo(g, 515, 18, 46, 20, 5);
  g.fill();
  // cabeçalho
  const lg = await imagem("/logo.png").catch(() => null);
  if (lg) g.drawImage(lg, 20, 54, 60, 60);
  g.fillStyle = verde;
  g.font = "900 30px Archivo";
  g.textBaseline = "top";
  g.fillText("AGRO PARTS", 92, 60);
  g.fillStyle = "#c48a00";
  g.font = "800 12px Archivo";
  g.fillText(pt ? "PEÇAS AGRÍCOLAS" : "REPUESTOS AGRÍCOLAS", 94, 96);
  g.fillStyle = "#1f2a22";
  for (let i = 0; i < 3; i++) g.fillRect(540, 70 + i * 11, 34, 4);
  // busca
  g.fillStyle = "#f1f3f1";
  retangulo(g, 16, 132, SW - 32, 56, 28);
  g.fill();
  g.strokeStyle = "#7b8a80";
  g.lineWidth = 3;
  g.beginPath();
  g.arc(48, 158, 10, 0, Math.PI * 2);
  g.moveTo(55, 165);
  g.lineTo(63, 173);
  g.stroke();
  g.fillStyle = "#7b8a80";
  g.font = "500 20px Archivo";
  g.textBaseline = "middle";
  g.fillText(pt ? "Buscar por código ou nome…" : "Buscar por código o nombre…", 76, 161);
  // menu
  g.fillStyle = "#e3efdf";
  g.fillRect(0, 198, SW, 50);
  g.font = "700 19px Archivo";
  g.fillStyle = verde;
  g.fillText(pt ? "Início" : "Inicio", 22, 224);
  g.fillStyle = "#3d4a41";
  g.font = "500 19px Archivo";
  g.fillText(pt ? "Peças" : "Repuestos", 98, 224);
  g.fillStyle = VERDE_ESCURO;
  retangulo(g, 222, 206, 196, 36, 8);
  g.fill();
  g.fillStyle = "#fff";
  g.font = "700 18px Archivo";
  g.fillText("Massey Ferguson", 236, 225);
  g.fillStyle = "#3d4a41";
  g.font = "500 19px Archivo";
  g.fillText(pt ? "Contato" : "Contacto", 436, 224);
  // banner
  const hero = { y: 260, h: 228 };
  const gr = g.createLinearGradient(0, hero.y, SW, hero.y + hero.h);
  gr.addColorStop(0, "#0f5a2c");
  gr.addColorStop(1, "#2b9a4f");
  g.fillStyle = gr;
  retangulo(g, 16, hero.y, SW - 32, hero.h, 22);
  g.fill();
  g.fillStyle = "#fff";
  g.textBaseline = "top";
  g.font = "48px Anton";
  g.fillText(pt ? "PEÇAS" : "REPUESTOS", 40, hero.y + 30);
  g.fillText("MASSEY", 40, hero.y + 84);
  g.fillText("FERGUSON", 40, hero.y + 138);
  const f0 = await fotoPeca(produtos[0]);
  if (f0) contem(g, f0, 330, hero.y + 18, 240, hero.h - 36);
  // peças
  const pecas = { y: 502, h: 272 };
  const cw = (SW - 32 - 14) / 2;
  for (let i = 0; i < 2; i++) {
    const p = produtos[i] ?? produtos[0];
    const x = 16 + i * (cw + 14);
    g.fillStyle = "#fff";
    retangulo(g, x, pecas.y, cw, pecas.h, 18);
    g.fill();
    g.strokeStyle = "#e3e6e3";
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = "#f6f7f6";
    retangulo(g, x + 8, pecas.y + 8, cw - 16, 132, 12);
    g.fill();
    const f = await fotoPeca(p);
    if (f) contem(g, f, x + 18, pecas.y + 14, cw - 36, 120);
    g.fillStyle = "#1f2a22";
    g.font = "700 17px Archivo";
    g.textBaseline = "top";
    const nome = (p?.nome ?? "").slice(0, 60);
    const palavrasNome = nome.split(" ");
    let l1 = "";
    let l2 = "";
    for (const w of palavrasNome) {
      if (!l2 && g.measureText(`${l1} ${w}`).width < cw - 24) l1 = `${l1} ${w}`.trim();
      else l2 = `${l2} ${w}`.trim();
    }
    g.fillText(l1, x + 12, pecas.y + 150);
    if (l2)
      g.fillText(
        g.measureText(l2).width > cw - 24 ? `${l2.slice(0, 18)}…` : l2,
        x + 12,
        pecas.y + 171,
      );
    g.fillStyle = "#6b7280";
    g.font = "500 15px Archivo";
    g.fillText(`Cód. ${p?.codigo ?? ""}`, x + 12, pecas.y + 198);
    g.fillStyle = verde;
    g.font = "900 26px Archivo";
    const pr = p?.preco
      ? pt && p.preco.brl
        ? p.preco.brl
        : p.preco.uyu
      : pt
        ? "Consulte"
        : "Consultá";
    g.fillText(pr, x + 12, pecas.y + 224);
  }
  // formas de pagamento
  const pago = { y: 790, h: 160 };
  g.fillStyle = "#eef5ea";
  retangulo(g, 16, pago.y, SW - 32, pago.h, 18);
  g.fill();
  g.fillStyle = VERDE_ESCURO;
  g.font = "900 24px Archivo";
  g.textBaseline = "top";
  g.fillText(pt ? "Formas de pagamento" : "Formas de pago", 36, pago.y + 18);
  let bx = 36;
  let by = pago.y + 62;
  g.font = "700 19px Archivo";
  for (const m of PAGAMENTOS[idioma]) {
    const bw = g.measureText(m).width + 56;
    if (bx + bw > SW - 36) {
      bx = 36;
      by += 46;
    }
    g.fillStyle = "#fff";
    retangulo(g, bx, by, bw, 38, 19);
    g.fill();
    g.strokeStyle = "#cfe2c7";
    g.lineWidth = 2;
    g.stroke();
    g.fillStyle = verde;
    retangulo(g, bx + 12, by + 12, 20, 14, 3);
    g.fill();
    g.fillStyle = "#1f2a22";
    g.textBaseline = "middle";
    g.fillText(m, bx + 40, by + 20);
    g.textBaseline = "top";
    bx += bw + 10;
  }
  // envio
  const envio = { y: 966, h: 140 };
  g.fillStyle = "#fff";
  retangulo(g, 16, envio.y, SW - 32, envio.h, 18);
  g.fill();
  g.strokeStyle = "#e3e6e3";
  g.lineWidth = 2;
  g.stroke();
  g.fillStyle = verde;
  g.beginPath();
  g.arc(76, envio.y + 70, 40, 0, Math.PI * 2);
  g.fill();
  caminhao(g, 76, envio.y + 70, 52, "#fff", verde);
  g.fillStyle = "#1f2a22";
  g.font = "900 24px Archivo";
  g.fillText(pt ? "Envio para RS, SC e PR" : "Respuesta rápida", 134, envio.y + 36);
  g.fillStyle = "#6b7280";
  g.font = "500 18px Archivo";
  g.fillText(
    pt ? "Correios ou transportadora, com nota" : "Precio y disponibilidad por WhatsApp",
    134,
    envio.y + 74,
  );
  // WhatsApp
  const zap = { y: 1122, h: 160 };
  g.fillStyle = "#22a35a";
  retangulo(g, 16, zap.y + 10, SW - 32, 84, 42);
  g.fill();
  g.fillStyle = "#fff";
  g.font = "800 28px Archivo";
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText(pt ? "Peça pelo WhatsApp" : "Cotizá por WhatsApp", SW / 2, zap.y + 53);
  g.fillStyle = "#3d4a41";
  g.font = "600 21px Archivo";
  g.fillText(PHONE_DISPLAY, SW / 2, zap.y + 126);
  g.textAlign = "left";
  return { tela: c, regioes: { hero, pecas, pago, envio, zap } };
}

// Celular: moldura, entalhe e a tela (do topo para baixo, cortada na altura da tela)
function celular(
  g: Ctx,
  x: number,
  y: number,
  w: number,
  tela: CanvasImageSource & { width: number; height: number },
) {
  const h = w * 2.08;
  const r = w * 0.15;
  g.save();
  g.shadowColor = "rgba(0,0,0,.35)";
  g.shadowBlur = 50;
  g.shadowOffsetY = 24;
  const aro = g.createLinearGradient(x, y, x + w, y + h);
  aro.addColorStop(0, "#f2f2f2");
  aro.addColorStop(0.5, "#a9a9a9");
  aro.addColorStop(1, "#e6e6e6");
  g.fillStyle = aro;
  retangulo(g, x, y, w, h, r);
  g.fill();
  g.restore();
  g.fillStyle = "#111";
  retangulo(g, x + w * 0.02, y + w * 0.02, w * 0.96, h - w * 0.04, r * 0.92);
  g.fill();
  const sx = x + w * 0.045;
  const sy = y + w * 0.045;
  const sw = w * 0.91;
  const sh = h - w * 0.09;
  g.save();
  retangulo(g, sx, sy, sw, sh, r * 0.8);
  g.clip();
  g.fillStyle = "#fff";
  g.fillRect(sx, sy, sw, sh);
  const k = sw / tela.width;
  g.drawImage(
    tela,
    0,
    0,
    tela.width,
    Math.min(tela.height, sh / k),
    sx,
    sy,
    sw,
    Math.min(sh, tela.height * k),
  );
  g.restore();
  g.fillStyle = "#111";
  retangulo(g, x + w / 2 - w * 0.15, sy + w * 0.03, w * 0.3, w * 0.075, w * 0.04);
  g.fill();
  return h;
}

// Lupa: aro cromado, vidro com a parte do site ampliada e cabo
function lupa(g: Ctx, cx: number, cy: number, r: number, site: Site, reg: Regiao, angulo: number) {
  // cabo
  const a = (angulo * Math.PI) / 180;
  g.save();
  g.translate(cx, cy);
  g.rotate(a);
  g.shadowColor = "rgba(0,0,0,.3)";
  g.shadowBlur = 30;
  g.shadowOffsetY = 16;
  const cromo = g.createLinearGradient(0, -40, 0, 40);
  cromo.addColorStop(0, "#f7f7f7");
  cromo.addColorStop(0.35, "#bdbdbd");
  cromo.addColorStop(0.6, "#6d6d6d");
  cromo.addColorStop(1, "#d9d9d9");
  g.fillStyle = cromo;
  retangulo(g, r * 0.95, -r * 0.1, r * 0.32, r * 0.2, 10);
  g.fill();
  const cabo = g.createLinearGradient(0, -r * 0.13, 0, r * 0.13);
  cabo.addColorStop(0, "#e9e9e9");
  cabo.addColorStop(0.4, "#9a9a9a");
  cabo.addColorStop(0.75, "#4a4a4a");
  cabo.addColorStop(1, "#bcbcbc");
  g.fillStyle = cabo;
  retangulo(g, r * 1.24, -r * 0.13, r * 0.9, r * 0.26, r * 0.13);
  g.fill();
  g.restore();
  // sombra do aro
  g.save();
  g.shadowColor = "rgba(0,0,0,.35)";
  g.shadowBlur = 40;
  g.shadowOffsetY = 20;
  g.fillStyle = "#fff";
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.fill();
  g.restore();
  // vidro: um quadrado do site centrado na região, ampliado
  g.save();
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.clip();
  const lado = SW * 0.66;
  const fy = Math.max(0, Math.min(SH - lado, reg.y + reg.h / 2 - lado / 2));
  g.drawImage(site.tela, (SW - lado) / 2, fy, lado, lado, cx - r, cy - r, r * 2, r * 2);
  const brilho = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  brilho.addColorStop(0, "rgba(255,255,255,.28)");
  brilho.addColorStop(0.35, "rgba(255,255,255,0)");
  brilho.addColorStop(1, "rgba(0,0,0,.08)");
  g.fillStyle = brilho;
  g.fillRect(cx - r, cy - r, r * 2, r * 2);
  g.restore();
  // aro
  const aro = g.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  aro.addColorStop(0, "#fbfbfb");
  aro.addColorStop(0.3, "#9d9d9d");
  aro.addColorStop(0.55, "#4f4f4f");
  aro.addColorStop(0.8, "#d4d4d4");
  aro.addColorStop(1, "#7a7a7a");
  g.strokeStyle = aro;
  g.lineWidth = r * 0.1;
  g.beginPath();
  g.arc(cx, cy, r + r * 0.05, 0, Math.PI * 2);
  g.stroke();
  g.strokeStyle = "rgba(0,0,0,.35)";
  g.lineWidth = 3;
  g.beginPath();
  g.arc(cx, cy, r, 0, Math.PI * 2);
  g.stroke();
}

// ---------------------------------------------------------------- armadilha (caixa, graveto e corda)
function poligono(g: Ctx, pts: number[][], cor: string | CanvasGradient) {
  g.fillStyle = cor;
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.closePath();
  g.fill();
}
function armadilha(g: Ctx, comCelular: boolean) {
  // Perfil da caixa inclinada, apoiada no chão à esquerda e no graveto à direita
  const P = [250, 880];
  const B1 = [880, 548];
  const T1 = [705, 214];
  const T0 = [75, 546];
  const d = [130, 70]; // profundidade (lado de trás, para a direita e para baixo)
  const add = (p: number[]) => [p[0] + d[0], p[1] + d[1]];
  // sombra no chão
  const sb = g.createRadialGradient(560, 900, 20, 560, 900, 460);
  sb.addColorStop(0, "rgba(20,50,10,.45)");
  sb.addColorStop(1, "rgba(20,50,10,0)");
  g.fillStyle = sb;
  g.beginPath();
  g.ellipse(560, 905, 470, 70, 0, 0, Math.PI * 2);
  g.fill();
  // vão embaixo da caixa levantada (sombra entre a borda de baixo e o chão)
  poligono(g, [P, B1, [B1[0] + 10, 905], [P[0], 905]], "rgba(25,60,15,.32)");
  // interior escuro (boca da caixa)
  poligono(g, [P, B1, add(B1), add(P)], "#c9cec4");
  // lado de cima (comprido, iluminado)
  const topo = g.createLinearGradient(T0[0], T0[1], T1[0] + d[0], T1[1] + d[1]);
  topo.addColorStop(0, "#f4f4f1");
  topo.addColorStop(1, "#e3e4df");
  poligono(g, [T0, T1, add(T1), add(T0)], topo);
  // lado direito (fundo da caixa)
  poligono(g, [T1, B1, add(B1), add(T1)], "#d7d9d2");
  // frente (perfil)
  const frente = g.createLinearGradient(P[0], P[1], T1[0], T1[1]);
  frente.addColorStop(0, "#ffffff");
  frente.addColorStop(1, "#f1f1ee");
  poligono(g, [P, B1, T1, T0], frente);
  g.strokeStyle = "rgba(0,0,0,.06)";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(T1[0], T1[1]);
  g.lineTo(add(T1)[0], add(T1)[1]);
  g.stroke();
  // celular embaixo da caixa (capa)
  if (comCelular) {
    const x = 560;
    const y = 640;
    const w = 130;
    const h = 270;
    g.save();
    g.shadowColor = "rgba(0,0,0,.3)";
    g.shadowBlur = 20;
    g.fillStyle = "#c9c9c9";
    retangulo(g, x, y, w, h, 22);
    g.fill();
    g.restore();
    g.fillStyle = "#3f8a3a";
    retangulo(g, x + 7, y + 7, w - 14, h - 14, 18);
    g.fill();
    g.fillStyle = "#111";
    retangulo(g, x + w / 2 - 22, y + 14, 44, 12, 6);
    g.fill();
    g.fillStyle = "#79c043";
    g.beginPath();
    g.arc(x + w / 2, y + h / 2, 34, 0, Math.PI * 2);
    g.fill();
    envelope(g, x + w / 2, y + h / 2, 34, "#ffffff");
  }
}
// A cena da armadilha um pouco menor, apoiada no mesmo chão (não encosta no título)
function cena(g: Ctx, desenhar: () => void) {
  g.save();
  g.translate(560, 905);
  g.scale(0.8, 0.8);
  g.translate(-560, -905);
  desenhar();
  g.restore();
}
function graveto(g: Ctx) {
  const pts = [
    [872, 912],
    [866, 820],
    [878, 740],
    [872, 650],
    [884, 548],
  ];
  g.lineCap = "round";
  g.lineJoin = "round";
  g.strokeStyle = "#5b4a35";
  g.lineWidth = 22;
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
  g.stroke();
  g.strokeStyle = "#8a765a";
  g.lineWidth = 7;
  g.beginPath();
  pts.forEach(([x, y], i) => (i ? g.lineTo(x - 5, y) : g.moveTo(x - 5, y)));
  g.stroke();
  // nós do galho
  g.strokeStyle = "#5b4a35";
  g.lineWidth = 9;
  for (const [x, y, dx] of [
    [870, 700, -26],
    [878, 600, 24],
    [868, 860, 22],
  ]) {
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + dx, y - 22);
    g.stroke();
  }
}
function corda(g: Ctx) {
  const caminho = () => {
    g.beginPath();
    g.moveTo(860, 790);
    g.bezierCurveTo(905, 760, 930, 830, 880, 840);
    g.bezierCurveTo(830, 850, 900, 900, 960, 880);
    g.bezierCurveTo(1040, 850, 1000, 960, 930, 975);
    g.bezierCurveTo(880, 990, 960, 1040, 1090, 1010);
  };
  g.lineCap = "round";
  g.strokeStyle = "#a88c5e";
  g.lineWidth = 20;
  caminho();
  g.stroke();
  g.strokeStyle = "#d9c193";
  g.lineWidth = 14;
  caminho();
  g.stroke();
  // torção da corda
  g.strokeStyle = "rgba(120,92,52,.55)";
  g.lineWidth = 14;
  g.setLineDash([5, 9]);
  caminho();
  g.stroke();
  g.setLineDash([]);
  // nó no graveto
  g.strokeStyle = "#bfa572";
  g.lineWidth = 16;
  g.beginPath();
  g.ellipse(872, 795, 26, 16, -0.3, 0, Math.PI * 2);
  g.stroke();
}
function notificacao(g: Ctx, texto: string, idioma: Idioma) {
  const x = 250;
  const y = 700;
  const w = 600;
  const pad = 26;
  const hTexto = frase(g, texto, x + pad, 0, w - pad * 2 - 130, {
    tam: 32,
    peso: 500,
    cor: "#4a4a4a",
    corDestaque: "#2b2b2b",
    linhas: 3,
    altura: 1.22,
    medir: true,
  });
  const h = 78 + hTexto + 22;
  g.save();
  g.shadowColor = "rgba(0,0,0,.22)";
  g.shadowBlur = 26;
  g.shadowOffsetY = 10;
  g.fillStyle = "#ffffff";
  retangulo(g, x, y, w, h, 14);
  g.fill();
  g.restore();
  g.fillStyle = "#5fae3a";
  retangulo(g, x + pad, y + 22, 40, 40, 8);
  g.fill();
  envelope(g, x + pad + 20, y + 42, 24, "#ffffff");
  g.fillStyle = "#4a4a4a";
  g.font = "italic 500 26px Archivo";
  g.textBaseline = "middle";
  g.textAlign = "left";
  g.fillText(idioma === "pt" ? "MENSAGEM" : "MENSAJE", x + pad + 56, y + 43);
  g.textAlign = "right";
  g.fillText("1 min", x + w - pad, y + 43);
  frase(g, texto, x + pad, y + 76, w - pad * 2 - 130, {
    tam: 32,
    peso: 500,
    cor: "#4a4a4a",
    corDestaque: "#2b2b2b",
    linhas: 3,
    altura: 1.22,
  });
}
function listaChecks(g: Ctx, itens: string[], x: number, y: number) {
  itens
    .filter(Boolean)
    .slice(0, 6)
    .forEach((t, i) => {
      const ly = y + i * 74;
      check(g, x + 24, ly + 24, 22);
      g.fillStyle = "#ffffff";
      g.font = "500 44px Archivo";
      g.textAlign = "left";
      g.textBaseline = "middle";
      g.fillText(t, x + 70, ly + 26);
    });
  return y + itens.length * 74;
}

// ---------------------------------------------------------------- slides
async function slideArmadilha(g: Ctx, o: OpcoesConfianca, i: number, n: number) {
  const s = o.slides[i] ?? {};
  fundo(g);
  if (i === 0) {
    frase(g, s.titulo ?? "", W / 2, 110, W - 220, {
      tam: 66,
      peso: 800,
      alinhar: "center",
      linhas: 3,
      altura: 1.14,
    });
    cena(g, () => armadilha(g, true));
    cena(g, () => graveto(g));
    cena(g, () => corda(g));
    frase(g, s.texto ?? "", W / 2, 1010, W - 300, {
      tam: 44,
      peso: 500,
      alinhar: "center",
      caixa: VERDE_ESCURO,
      linhas: 3,
    });
    await marca(g, o.idioma, H - 130);
  } else if (i < n - 1) {
    contador(g, i + 1, n);
    cena(g, () => armadilha(g, false));
    if (s.aviso) notificacao(g, s.aviso, o.idioma);
    cena(g, () => graveto(g));
    cena(g, () => corda(g));
    frase(g, s.texto ?? "", 130, 1030, W - 260, {
      tam: 56,
      peso: 700,
      caixa: VERDE_ESCURO,
      linhas: 3,
      altura: 1.22,
    });
  } else {
    contador(g, i + 1, n);
    const y = frase(g, s.titulo ?? "", 110, 170, W - 220, {
      tam: 70,
      peso: 800,
      linhas: 3,
      altura: 1.12,
    });
    const yl = listaChecks(g, s.itens ?? [], 120, y + 60);
    await rodapeFinal(g, o, Math.max(yl + 40, H - 330));
  }
}
async function rodapeFinal(g: Ctx, o: OpcoesConfianca, y: number) {
  g.fillStyle = "#ffffff";
  g.save();
  g.shadowColor = "rgba(0,0,0,.2)";
  g.shadowBlur = 30;
  retangulo(g, 70, y, W - 140, 190, 30);
  g.fill();
  g.restore();
  await logo(g, 104, y + 40, 100, "#123d1f", "#1f8a46", o.idioma);
  g.fillStyle = "#1f2a22";
  g.font = "700 28px Archivo";
  g.textAlign = "right";
  g.textBaseline = "middle";
  g.fillText(PHONE_DISPLAY, W - 104, y + 66);
  g.fillText(o.idioma === "pt" ? "agropartsuy.com/pt" : "agropartsuy.com", W - 104, y + 106);
  g.fillText("@rsagroparts", W - 104, y + 146);
}
async function slideLupa(
  g: Ctx,
  o: OpcoesConfianca,
  i: number,
  n: number,
  site: Site,
  print: HTMLImageElement | null,
) {
  const s = o.slides[i] ?? {};
  fundo(g);
  const telaCapa = print ?? site.tela;
  if (i === 0) {
    frase(g, s.titulo ?? "", W / 2, 100, W - 200, {
      tam: 64,
      peso: 800,
      alinhar: "center",
      caixa: VERDE_ESCURO,
      linhas: 2,
      altura: 1.2,
    });
    const glow = g.createRadialGradient(W / 2, 700, 30, W / 2, 700, 520);
    glow.addColorStop(0, "rgba(255,255,255,.55)");
    glow.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = glow;
    g.fillRect(0, 200, W, 1000);
    celular(g, W / 2 - 190, 290, 380, telaCapa);
    return;
  }
  contador(g, i + 1, n);
  if (i === n - 1) {
    const y = frase(g, s.titulo ?? "", 110, 160, W - 220, {
      tam: 70,
      peso: 800,
      linhas: 3,
      altura: 1.12,
    });
    listaChecks(g, s.itens ?? [], 120, y + 50);
    celular(g, W / 2 - 230, 880, 460, telaCapa);
    return;
  }
  // Slides da lupa: celular pequeno ao fundo e a lupa sobre a parte do site
  const POS: Array<{ x: number; y: number; ang: number; reg: keyof Site["regioes"] }> = [
    { x: 520, y: 520, ang: 22, reg: "hero" },
    { x: 560, y: 540, ang: 28, reg: "pecas" },
    { x: 560, y: 530, ang: 150, reg: "pago" },
    { x: 560, y: 520, ang: -38, reg: "envio" },
    { x: 540, y: 520, ang: 90, reg: "zap" },
  ];
  const pos = POS[(i - 1) % POS.length];
  celular(g, W / 2 - 110, 300, 220, site.tela);
  lupa(g, pos.x, pos.y, 320, site, site.regioes[pos.reg], pos.ang);
  frase(g, s.texto ?? "", W / 2, 1000, W - 200, {
    tam: 46,
    peso: 700,
    alinhar: "center",
    caixa: VERDE_ESCURO,
    linhas: 3,
    altura: 1.28,
  });
  await marca(g, o.idioma, H - 120);
}

export const quantosSlides = (c: Carrossel) => (c === "armadilhas" ? 5 : 7);

export async function gerarConfianca(o: OpcoesConfianca): Promise<HTMLCanvasElement[]> {
  await carregarFontes();
  const n = quantosSlides(o.carrossel);
  const site = o.carrossel === "lupa" ? await desenharSite(o.idioma, o.produtos) : null;
  const print = o.print ? await arquivoParaImagem(o.print) : null;
  const out: HTMLCanvasElement[] = [];
  for (let i = 0; i < n; i++) {
    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d")!;
    if (o.carrossel === "armadilhas") await slideArmadilha(g, o, i, n);
    else await slideLupa(g, o, i, n, site!, print);
    out.push(c);
  }
  return out;
}
