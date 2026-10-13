// 20 posts de peças para o Instagram (feed 1080×1350): imagem PNG + versão animada (WebM, 7 s).
// Cada post: peça recortada, foto da máquina da marca (Wikimedia Commons, licença livre, com
// crédito), título, frase sobre o componente, marca/tipo de máquina, código e rodapé de contato.
// Uso (raiz do projeto): npx tsx marketing/posts_pecas/gerar.mts [p01 p02…] [--sem-video] [--previa]
// Saída: marketing/posts_pecas/saida/  (pNN_*.png, pNN_*.webm, legendas.md)
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { chromium, type Page } from "playwright";
import { PrismaClient } from "@prisma/client";
import { nomeProduto } from "../../src/lib/pecas-es";

const RAIZ = process.cwd();
const DIR = path.join(RAIZ, "marketing/posts_pecas");
const OUT = path.join(DIR, "saida");
const args = process.argv.slice(2);
const SEM_VIDEO = args.includes("--sem-video");
const PREVIA = args.includes("--previa");
const FPS = PREVIA ? 10 : 30;
const DUR = 7;
const so = args.filter((a) => !a.startsWith("--"));
const url = (p: string) => pathToFileURL(path.join(RAIZ, p)).href;
const LOGO = url("public/logo.png");

// ---------- Fotos das máquinas (Wikimedia Commons) ----------
type Foto = { img: string; credito: string; pos?: string };
function fotos(): Record<string, Foto> {
  const out: Record<string, Foto> = {};
  const ler = (dir: string) => {
    const arq = path.join(RAIZ, dir, "creditos.json");
    if (!fs.existsSync(arq)) return;
    const c = JSON.parse(fs.readFileSync(arq, "utf8"));
    for (const [nome, v] of Object.entries<any>(c)) {
      const lic = String(v.licenca).replace("Public domain", "Dominio público");
      out[nome] = { img: url(`${dir}/${nome}.jpg`), credito: `Foto: ${String(v.autor).split("\n")[0].slice(0, 40)} · ${lic} · Wikimedia Commons` };
    }
  };
  ler("marketing/transmision/fotos");
  ler("marketing/posts_pecas/fotos");
  return out;
}

// ---------- Os 20 posts ----------
type Post = { id: string; sku: string; foto: string; pos?: string; titulo: string; frase: string; maquina: "TRACTOR" | "COSECHADORA" | "SEMBRADORA" | "PLANTADORA"; layout: "foto" | "diagonal" | "ficha" };
const POSTS: Post[] = [
  { id: "p01", sku: "ACW7483130", foto: "valtra-t235", titulo: "PLATO DE EMBRAGUE", frase: "Transmite la fuerza del motor a la caja. Si el tractor patina o cuesta cambiar, es hora de revisarlo.", maquina: "TRACTOR", layout: "foto" },
  { id: "p02", sku: "9018102536", foto: "massey-5465", titulo: "BOMBA HIDRÁULICA", frase: "Da fuerza al levante de tres puntos y a la dirección. Sin presión, no hay trabajo.", maquina: "TRACTOR", layout: "diagonal" },
  { id: "p03", sku: "73162805CNH", foto: "new-holland-tm115", titulo: "MOTOR HIDRÁULICO", frase: "Convierte la presión del aceite en movimiento para accionar tus implementos.", maquina: "TRACTOR", layout: "ficha" },
  { id: "p04", sku: "CQ47493PR", foto: "john-deere-plantadora", titulo: "ENGRANAJE Z12", frase: "Mueve la distribución de la plantadora para una siembra pareja, surco por surco.", maquina: "PLANTADORA", layout: "foto" },
  { id: "p05", sku: "690050MG", foto: "valtra", titulo: "ENGRANAJE HI-TRAC", frase: "Parte de la tracción delantera: mantiene la fuerza en el barro y en las subidas.", maquina: "TRACTOR", layout: "diagonal" },
  { id: "p06", sku: "3410646CL", foto: "massey-ferguson", titulo: "ENGRANAJE DE CAJA", frase: "Soporta toda la fuerza del motor en cada cambio. Un diente gastado se siente en la marcha.", maquina: "TRACTOR", layout: "ficha" },
  { id: "p07", sku: "504065879CNH", foto: "new-holland-tm115", titulo: "POLEA DEL TENSOR", frase: "Mantiene la correa tensa para que el alternador y el ventilador nunca fallen.", maquina: "TRACTOR", layout: "foto" },
  { id: "p08", sku: "AH205909MANN", foto: "john-deere", titulo: "CUCHILLAS DEL PICADOR", frase: "Pican y esparcen la paja de forma pareja detrás de la cosechadora.", maquina: "COSECHADORA", layout: "diagonal" },
  { id: "p09", sku: "30221420MG", foto: "valtra-t235", titulo: "SINCRONIZADOR", frase: "Iguala la velocidad de los engranajes: cambios suaves y sin ruido.", maquina: "TRACTOR", layout: "ficha" },
  { id: "p10", sku: "1865014SH", foto: "massey-5465", titulo: "HORQUILLA DEL BLOQUEO", frase: "Acciona el bloqueo de diferencial para salir del barro sin que una rueda patine.", maquina: "TRACTOR", layout: "foto" },
  { id: "p11", sku: "47640920CNH", foto: "new-holland-tm115", titulo: "FILTRO DE ACEITE", frase: "Retiene las partículas que desgastan el motor. Cambialo en cada service.", maquina: "TRACTOR", layout: "diagonal" },
  { id: "p12", sku: "CQ57754PR", foto: "john-deere-plantadora", titulo: "GUÍA DEL DISCO DE CORTE", frase: "Mantiene la presión justa del disco para cortar el rastrojo y sembrar parejo.", maquina: "SEMBRADORA", layout: "ficha" },
  { id: "p13", sku: "87535400NOR", foto: "valtra", titulo: "RETÉN DE SEMIEJE", frase: "Evita pérdidas de aceite en el eje trasero y protege los rodamientos.", maquina: "TRACTOR", layout: "foto" },
  { id: "p14", sku: "6223618MANN", foto: "massey-ferguson", titulo: "FILTRO DE AIRE", frase: "El motor respira limpio, rinde más y gasta menos combustible.", maquina: "TRACTOR", layout: "diagonal" },
  { id: "p15", sku: "87605247CNH", foto: "new-holland-tm115", titulo: "SENSOR DE POSICIÓN", frase: "Informa la posición al sistema electrónico para un control preciso del levante.", maquina: "TRACTOR", layout: "ficha" },
  { id: "p16", sku: "L101856EG", foto: "john-deere", titulo: "PISTÓN DE FRENO", frase: "Frenada segura y pareja: tu seguridad y la de tu equipo.", maquina: "TRACTOR", layout: "foto" },
  { id: "p17", sku: "80569920", foto: "valtra-t235", titulo: "CAJA DE PALANCAS", frase: "El mando de los cambios: precisión y firmeza en cada marcha.", maquina: "TRACTOR", layout: "diagonal" },
  { id: "p18", sku: "036374PG", foto: "massey-5465", titulo: "BUJE DE TRACCIÓN", frase: "Reduce el desgaste en la tracción delantera y alarga su vida útil.", maquina: "TRACTOR", layout: "ficha" },
  { id: "p19", sku: "919875CNH", foto: "new-holland", titulo: "BUJE PARA COSECHADORA", frase: "Que la cosecha no se detenga por una pieza gastada.", maquina: "COSECHADORA", layout: "foto" },
  { id: "p20", sku: "47724311CNH", foto: "case-puma", titulo: "RODAMIENTO DE RODILLOS", frase: "Soporta cargas pesadas en ejes y transmisión con menos fricción.", maquina: "TRACTOR", layout: "diagonal" },
];

// ---------- Animação ----------
const A = (nome: string, ini: number, dur = 0.6, fill = "both", ease = "cubic-bezier(.2,.8,.2,1)") => `${nome} ${dur}s ${ease} ${ini}s ${fill}`;
const LOOP = (nome: string, dur: number, ini = 0, ease = "ease-in-out") => `${nome} ${dur}s ${ease} ${ini}s infinite`;
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const WA = `<svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm4.5 12.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg>`;

const CSS = `
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1080px;height:1350px;overflow:hidden;background:#041f11}
body{font-family:Archivo,system-ui,sans-serif;color:#fff;-webkit-font-smoothing:antialiased}
.p{position:relative;width:1080px;height:1350px;overflow:hidden;background:radial-gradient(circle at 70% 30%,#0f6b3a 0,#06321b 55%,#031a0d 100%)}
.d{font-weight:900;font-stretch:66%;line-height:.9;letter-spacing:-.5px}
.grao{position:absolute;inset:0;opacity:.06;background-image:radial-gradient(#fff 1.2px,transparent 1.2px);background-size:14px 14px}
@keyframes fadeUp{from{opacity:0;transform:translateY(60px)}to{opacity:1;transform:none}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes fadeDown{from{opacity:0;transform:translateY(-50px)}to{opacity:1;transform:none}}
@keyframes zoomIn{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:scale(1)}}
@keyframes entra{0%{opacity:0;transform:translateX(320px) rotate(40deg) scale(.6)}70%{opacity:1;transform:translateX(-14px) rotate(-4deg) scale(1.04)}100%{opacity:1;transform:none}}
@keyframes popIn{0%{opacity:0;transform:scale(.3)}65%{opacity:1;transform:scale(1.08)}100%{opacity:1;transform:scale(1)}}
@keyframes kenburns{from{transform:scale(1.12)}to{transform:scale(1.0)}}
@keyframes flutua{0%,100%{transform:translateY(0) rotate(-2deg)}50%{transform:translateY(-18px) rotate(2deg)}}
@keyframes gira{to{transform:rotate(360deg)}}
@keyframes brilho{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:.9;transform:scale(1.08)}}
@keyframes linha{from{width:0}to{width:var(--w)}}
@keyframes alturaL{from{height:0}to{height:var(--h)}}
@keyframes risca{0%{transform:translateX(-120%)}100%{transform:translateX(320%)}}
@keyframes clipDiag{from{clip-path:polygon(0 0,0 0,0 100%,0 100%)}to{clip-path:polygon(0 0,100% 0,100% 82%,0 100%)}}
</style>`;

// Peças com brilho atrás e flutuando
function peca(img: string, x: number, y: number, lado: number, ini: number) {
  return `
  <div style="position:absolute;left:${x - lado * 0.15}px;top:${y - lado * 0.15}px;width:${lado * 1.3}px;height:${lado * 1.3}px;border-radius:50%;background:radial-gradient(circle,rgba(242,201,76,.55),rgba(242,201,76,0) 62%);animation:${A("zoomIn", ini, 0.8)},${LOOP("brilho", 3, ini + 0.8)}"></div>
  <div style="position:absolute;left:${x}px;top:${y}px;width:${lado}px;height:${lado}px;animation:${A("entra", ini + 0.1, 0.9)}">
    <img src="${img}" style="width:100%;height:100%;object-fit:contain;filter:drop-shadow(0 30px 40px rgba(0,0,0,.6));animation:${LOOP("flutua", 4, ini + 1)}">
  </div>`;
}
function tituloAnim(t: string, ini: number, tam: number) {
  return t.split(" ").map((w, i) => `<span style="display:inline-block;margin-right:.18em;animation:${A("popIn", ini + i * 0.12, 0.5)}">${w}</span>`).join("");
}
const selo = (txt: string, ini: number, fundo = "#f2c94c", cor = "#06321b") =>
  `<span style="display:inline-block;background:${fundo};color:${cor};font-weight:900;font-size:26px;letter-spacing:3px;padding:10px 20px;border-radius:12px;animation:${A("fadeDown", ini, 0.5)}">${txt}</span>`;
const rodape = (ini: number) => `
  <div style="position:absolute;left:0;right:0;bottom:0;height:120px;background:#031a0d;display:flex;align-items:center;justify-content:space-between;padding:0 50px;animation:${A("fadeUp", ini, 0.6)}">
    <div style="display:flex;align-items:center;gap:14px"><img src="${LOGO}" style="width:62px;height:62px;background:#fff;border-radius:16px;padding:5px"><div><div style="font-size:28px;font-weight:900;font-stretch:90%">AGRO PARTS</div><div style="font-size:20px;font-weight:700;color:#f2c94c">agropartsuy.com</div></div></div>
    <div style="display:flex;align-items:center;gap:10px;background:#25D366;color:#06381b;font-weight:900;font-size:26px;padding:14px 22px;border-radius:14px">${WA} Cotizá por WhatsApp</div>
  </div>`;
const credito = (c: string) => `<div style="position:absolute;right:18px;bottom:128px;font-size:13px;color:rgba(255,255,255,.7);text-shadow:0 1px 3px rgba(0,0,0,.8)">${esc(c)}</div>`;

type Dados = { post: Post; foto: Foto; img: string; nome: string; codigo: string; marca: string };

// Layout 1: foto da máquina em tela cheia, peça na frente
function layoutFoto({ post, foto, img, codigo, marca }: Dados) {
  return `
  <div style="position:absolute;inset:0;background:url('${foto.img}') center 40%/cover;animation:${A("kenburns", 0, DUR, "both", "ease-out")}"></div>
  <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(3,26,13,.15) 0%,rgba(3,26,13,.35) 35%,rgba(3,26,13,.92) 62%,#031a0d 80%)"></div>
  <div style="position:absolute;left:50px;top:50px;display:flex;gap:12px">${selo(marca.toUpperCase(), 0.3)}${selo(post.maquina, 0.45, "rgba(255,255,255,.92)")}</div>
  ${peca(img, 560, 330, 470, 0.6)}
  <div style="position:absolute;left:50px;right:50px;top:800px">
    <div class="d" style="font-size:${post.titulo.length > 18 ? 92 : 112}px">${tituloAnim(post.titulo, 1.5, 0)}</div>
    <div style="margin-top:22px;font-size:36px;font-weight:600;line-height:1.3;max-width:900px;animation:${A("fadeUp", 2.4)}">${esc(post.frase)}</div>
    <div style="margin-top:24px;display:flex;gap:12px;flex-wrap:wrap;animation:${A("fadeUp", 2.9)}">
      <span style="border:2px solid rgba(255,255,255,.35);border-radius:999px;padding:8px 20px;font-size:24px;font-weight:800">Cód. ${esc(codigo)}</span>
      <span style="border:2px solid rgba(255,255,255,.35);border-radius:999px;padding:8px 20px;font-size:24px;font-weight:800">Envíos a todo Uruguay</span>
    </div>
  </div>
  ${credito(foto.credito)}${rodape(3.3)}`;
}

// Layout 2: corte diagonal — foto em cima, painel embaixo
function layoutDiagonal({ post, foto, img, codigo, marca }: Dados) {
  return `
  <div style="position:absolute;left:0;right:0;top:0;height:720px;overflow:hidden;clip-path:polygon(0 0,100% 0,100% 82%,0 100%);animation:${A("clipDiag", 0, 0.9)}">
    <div style="position:absolute;inset:0;background:url('${foto.img}') center/cover;animation:${A("kenburns", 0, DUR, "both", "ease-out")}"></div>
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,.05),rgba(3,26,13,.45))"></div>
  </div>
  <div style="position:absolute;left:0;right:0;top:560px;height:16px;background:#f2c94c;transform:skewY(-7.6deg);transform-origin:left;animation:${A("fadeIn", 0.7, 0.5)}"></div>
  <div style="position:absolute;left:50px;top:50px">${selo(`${marca.toUpperCase()} · ${post.maquina}`, 0.3)}</div>
  ${peca(img, 80, 470, 440, 0.7)}
  <div style="position:absolute;left:560px;right:50px;top:690px">
    <div class="d" style="font-size:${post.titulo.length > 18 ? 76 : 92}px">${tituloAnim(post.titulo, 1.5, 0)}</div>
    <div style="margin-top:20px;font-size:32px;font-weight:600;line-height:1.3;animation:${A("fadeUp", 2.4)}">${esc(post.frase)}</div>
    <div style="margin-top:22px;animation:${A("fadeUp", 2.9)}"><span style="background:#f2c94c;color:#06321b;border-radius:12px;padding:10px 20px;font-size:26px;font-weight:900">Cód. ${esc(codigo)}</span></div>
  </div>
  <div style="position:absolute;left:0;top:0;width:1080px;height:720px;pointer-events:none">${credito(foto.credito).replace("bottom:128px", "bottom:150px")}</div>
  ${rodape(3.3)}`;
}

// Layout 3: ficha técnica — fundo de projeto, peça no centro com cotas, foto em selo redondo
function layoutFicha({ post, foto, img, codigo, marca }: Dados) {
  const grade = `background-image:linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px);background-size:40px 40px`;
  return `
  <div style="position:absolute;inset:0;${grade}"></div>
  <div style="position:absolute;left:50px;top:55px;font-size:24px;font-weight:800;letter-spacing:6px;color:#f2c94c;animation:${A("fadeDown", 0.2)}">FICHA TÉCNICA · ${esc(codigo)}</div>
  <div style="position:absolute;left:50px;top:95px;width:980px;height:3px;background:rgba(242,201,76,.5)"></div>
  <div style="position:absolute;left:150px;top:190px;width:780px;height:600px;border:3px dashed rgba(255,255,255,.18);border-radius:30px;animation:${A("fadeIn", 0.3)}"></div>
  <div style="position:absolute;left:210px;top:150px;height:3px;background:#f2c94c;--w:660px;animation:${A("linha", 0.9, 0.8)}"></div>
  <div style="position:absolute;left:110px;top:230px;width:3px;background:#f2c94c;--h:520px;animation:${A("alturaL", 1, 0.8)}"></div>
  ${peca(img, 290, 220, 500, 0.4)}
  <div style="position:absolute;right:50px;top:620px;width:250px;height:250px;border-radius:50%;overflow:hidden;border:8px solid #fff;box-shadow:0 20px 40px rgba(0,0,0,.5);animation:${A("popIn", 1.2, 0.7)}"><div style="width:100%;height:100%;background:url('${foto.img}') center/cover"></div></div>
  <div style="position:absolute;right:50px;top:880px;width:250px;text-align:center;font-size:22px;font-weight:800;animation:${A("fadeIn", 1.6)}">${esc(marca)}<br><span style="color:#f2c94c">${post.maquina}</span></div>
  <div style="position:absolute;left:50px;right:330px;top:860px">
    <div class="d" style="font-size:${post.titulo.length > 18 ? 74 : 92}px">${tituloAnim(post.titulo, 1.5, 0)}</div>
    <div style="margin-top:18px;font-size:32px;font-weight:600;line-height:1.3;animation:${A("fadeUp", 2.4)}">${esc(post.frase)}</div>
  </div>
  ${credito(foto.credito)}${rodape(3.1)}`;
}

// ---------- Renderização ----------
const FFMPEG = (() => {
  const base = path.join(os.homedir(), "AppData/Local/ms-playwright");
  for (const d of (fs.existsSync(base) ? fs.readdirSync(base) : []).filter((d) => d.startsWith("ffmpeg")).sort().reverse()) {
    const f = path.join(base, d, "ffmpeg-win64.exe");
    if (fs.existsSync(f)) return f;
  }
  return null;
})();

async function render(page: Page, id: string, nome: string, html: string) {
  const tmp = path.join(os.tmpdir(), `agro_post_${id}`);
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.mkdirSync(tmp, { recursive: true });
  const arq = path.join(tmp, "post.html");
  fs.writeFileSync(arq, `<!doctype html><meta charset="utf-8">${CSS}<body><div class="p">${html}</div></body>`);
  await page.goto(pathToFileURL(arq).href, { waitUntil: "networkidle" });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => (i.onload = i.onerror = r)))));
  });
  const em = (ms: number) => page.evaluate((t) => document.getAnimations().forEach((a) => { a.pause(); a.currentTime = t; }), ms);
  // Imagem estática: tudo já entrou
  await em(5000);
  await page.screenshot({ path: path.join(OUT, `${id}_${nome}.png`) });
  if (!SEM_VIDEO && FFMPEG) {
    const total = DUR * FPS;
    const ff = spawn(FFMPEG, ["-y", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "pipe:0", "-c:v", "libvpx", "-b:v", "10M", "-crf", "5", "-qmin", "0", "-qmax", "30", "-deadline", "good", "-cpu-used", "1", "-auto-alt-ref", "0", path.join(OUT, `${id}_${nome}.webm`)]);
    let erro = "";
    ff.stderr.on("data", (d) => (erro = (erro + d).slice(-600)));
    const fim = new Promise<number>((ok) => ff.on("close", (c) => ok(c ?? 1)));
    for (let f = 0; f < total; f++) {
      await em((f / FPS) * 1000);
      const buf = await page.screenshot({ type: "jpeg", quality: 92 });
      if (!ff.stdin.write(buf)) await new Promise((ok) => ff.stdin.once("drain", ok));
    }
    ff.stdin.end();
    if ((await fim) !== 0) throw new Error(`ffmpeg falhou em ${id}: ${erro}`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
}

const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
const prisma = new PrismaClient();
const rows = await prisma.agricolas.findMany({ where: { sku: { in: POSTS.map((p) => p.sku) } } });
await prisma.$disconnect();
const porSku = new Map(rows.map((r) => [r.sku, r]));
const F = fotos();
fs.mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1080, height: 1350 } });
const page = await ctx.newPage();
const legendas: string[] = ["# Posts de peças — legendas para o Instagram", "", "Imagem: `pNN_*.png` (feed 1080×1350). Versão animada: `pNN_*.webm` (7 s, sem áudio; no CapCut coloque música e exporte em MP4 para Reels/Stories).", ""];
for (const post of POSTS.filter((p) => !so.length || so.includes(p.id))) {
  const r = porSku.get(post.sku);
  const foto = F[post.foto];
  if (!r || !foto) {
    console.log(post.id, "pulado:", !r ? "peça não encontrada" : `foto ${post.foto} não encontrada`);
    continue;
  }
  const d: Dados = { post, foto, img: url(`marketing/redes/recortes/${post.sku}-1.png`), nome: nomeProduto(r as any), codigo: (r.codigo_fabricante || r.sku).trim(), marca: r.marca ?? "" };
  const html = post.layout === "foto" ? layoutFoto(d) : post.layout === "diagonal" ? layoutDiagonal(d) : layoutFicha(d);
  const nome = slug(post.titulo);
  const t0 = Date.now();
  await render(page, post.id, nome, html);
  console.log(`${post.id} ${post.titulo} (${d.marca}) ok ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  const tag = d.marca.replace(/\s+/g, "").toLowerCase();
  legendas.push(
    `## ${post.id} · ${post.titulo} — ${d.marca}`,
    "",
    "```",
    `⚙️ ${post.titulo.charAt(0)}${post.titulo.slice(1).toLowerCase()} para ${post.maquina.toLowerCase()} ${d.marca}\n${post.frase}\n\n🔎 ${d.nome}\n🏷️ Código: ${d.codigo}\n📦 Envíos a todo Uruguay por DAC\n💬 Cotizá por WhatsApp o en agropartsuy.com/produto/${encodeURIComponent(r.sku.trim())}\n\n#${tag} #repuestos #repuestosagricolas #${post.maquina.toLowerCase()} #uruguay #agro #maquinariaagricola`,
    "```",
    `_${foto.credito}_`,
    "",
  );
}
fs.writeFileSync(path.join(OUT, "legendas.md"), legendas.join("\n"));
await browser.close();
