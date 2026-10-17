// 50 peças × 2 idiomas = 100 artes de produto (feed 4:5, 1080×1350) da PRÉ-BLACK FRIDAY.
// Uso (raiz do projeto):  node marketing/produtos-50/gerar.mjs
// Saída: marketing/produtos-50/saida/es/*.png, saida/pt/*.png e um mosaico de cada idioma.
//
// Estamos na pré-Black: o desconto (DESCONTO em comum.mjs) já vale no site; a Black começa em 27/11.
// Fotos: só as da agrotrator.com.br (loja própria), escolhidas na folha de contato
// (selecao.json). Nada de fotos da redeparts nem de /catalogo (origem de terceiros).
import fs from "fs";
import path from "path";
import { LOGO, PASTA, PECAS, TXT, abrir, cab, ico, selo } from "./comum.mjs";
import { arquivoPeca } from "./nomes.mjs";

const meta = (p, t) =>
  `${t.cat(p)}${p.marca ? ` · ${t.aplic} ${p.marca}` : ""}${p.extra ? ` · ${p.extra}` : ""}`;
const cod = (p, t) => `<div class="cod"><small>${t.codigo}</small><b>${p.cod}</b></div>`;
const rodape = (t) =>
  `<div class="rodape"><span>${ico("Truck", 24)} ${t.envio}</span><span>${ico("MessageCircle", 24)} ${t.zap}</span></div>`;
const tam = (s, base) => (s.length > 34 ? base * 0.72 : s.length > 22 ? base * 0.86 : base);
const comeca = (t, estilo = "") =>
  `<div class="meta" style="color:var(--oro);font-size:18px;letter-spacing:3px;${estilo}">${ico("CalendarDays", 20, 2.4)} ${t.comeca}</div>`;

// 1) Cartão branco com a foto, selo do desconto e a fita "já na pré-Black"
const cartao = (p, t) => `<div class="l">${cab(t)}
  <div style="position:absolute;left:64px;right:64px;top:160px;height:640px;background:#fff;border-radius:44px;overflow:hidden;box-shadow:0 40px 120px rgba(245,197,24,.18)">
    <img class="foto" src="${p.img}" style="padding:40px">
    <div class="cinta" style="width:460px;right:-120px;top:60px;transform:rotate(35deg)">${t.ja}</div>
  </div>
  ${selo(t, "left:40px;top:130px")}
  <div style="position:absolute;left:64px;right:64px;top:835px">
    <div class="meta">${meta(p, t)}</div>
    <div class="t" style="font-size:${tam(t.nome(p), 92)}px;margin-top:12px">${t.nome(p)}</div>
  </div>
  <div style="position:absolute;left:64px;right:64px;bottom:150px;display:flex;align-items:center;justify-content:space-between">${cod(p, t)}<div style="text-align:right"><div class="cta" style="font-size:22px;padding:16px 24px;margin-left:auto">${ico("Tag", 24, 2.4)} ${t.curto}</div>${comeca(t, "margin-top:12px;display:flex;justify-content:flex-end;gap:8px;align-items:center")}</div></div>
  <div style="position:absolute;left:64px;bottom:62px">${rodape(t)}</div>
</div>`;

// 2) Metade de cima branca com a foto grande, corte diagonal
const dividido = (p, t) => `<div class="l">
  <div style="position:absolute;inset:0 0 auto 0;height:800px;background:#fff;clip-path:polygon(0 0,100% 0,100% 84%,0 100%)">
    <img class="foto" src="${p.img}" style="padding:150px 120px 110px">
  </div>
  <div class="brillo" style="top:700px"></div>
  <div class="marca" style="color:#111"><img src="${LOGO}" style="box-shadow:0 0 0 1px #e4e4e7"><div><b>AGRO PARTS</b><span style="color:#b8930f">${t.lema}</span></div></div>
  <div class="chip">${t.chip}</div>
  ${selo(t, "right:56px;top:540px")}
  <div style="position:absolute;left:64px;right:64px;top:820px">
    <div class="meta">${meta(p, t)}</div>
    <div class="t" style="font-size:${tam(t.nome(p), 96)}px;margin-top:12px">${t.nome(p)}</div>
    <div style="margin-top:22px;display:flex;align-items:center;gap:26px">${cod(p, t)}${comeca(t, "display:flex;gap:8px;align-items:center")}</div>
  </div>
  <div style="position:absolute;left:64px;bottom:140px" class="cta">${ico("Tag", 28, 2.4)} ${t.cta}</div>
  <div style="position:absolute;left:64px;bottom:62px">${rodape(t)}</div>
</div>`;

// 3) Título em cima, foto num círculo branco com brilho dourado
const destaque = (p, t) => {
  const longo = t.nome(p).length > 22;
  return `<div class="l">${cab(t)}
  <div style="position:absolute;left:64px;right:64px;top:175px">
    <div class="meta">${meta(p, t)}</div>
    <div class="t" style="font-size:${tam(t.nome(p), 104)}px;margin-top:12px">${t.nome(p)}</div>
  </div>
  <div style="position:absolute;right:-60px;top:${longo ? 450 : 400}px;width:660px;height:660px;border-radius:50%;background:radial-gradient(circle, rgba(245,197,24,.55), transparent 68%)"></div>
  <div style="position:absolute;right:40px;top:${longo ? 510 : 460}px;width:540px;height:540px;border-radius:50%;background:#fff;overflow:hidden;border:10px solid var(--oro)">
    <img class="foto" src="${p.img}" style="padding:70px">
  </div>
  ${selo(t, `right:420px;top:${longo ? 840 : 790}px`)}
  <div style="position:absolute;left:64px;top:${longo ? 560 : 510}px;display:grid;gap:18px">${cod(p, t)}${comeca(t, "display:flex;gap:8px;align-items:center")}</div>
  <div style="position:absolute;left:64px;bottom:140px" class="cta">${ico("Tag", 28, 2.4)} ${t.cta}</div>
  <div style="position:absolute;left:64px;bottom:62px">${rodape(t)}</div>
</div>`;
};

const LAYOUTS = [cartao, dividido, destaque];

const r = await abrir();
const falhas = [];
for (const idioma of ["es", "pt"]) {
  const t = TXT[idioma];
  const dir = path.join(PASTA, "saida", idioma);
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const feitos = [];
  for (const [i, p] of PECAS.entries()) {
    const arq = path.join(dir, arquivoPeca(i, p, idioma));
    if (!(await r.render(LAYOUTS[i % 3](p, t), arq))) falhas.push(arq);
    feitos.push(arq);
  }
  await r.mosaico(feitos, path.join(PASTA, "saida", `mosaico_${idioma}.png`));
  console.log(`✔ ${idioma}: ${feitos.length} artes`);
}
await r.fechar();
if (falhas.length) console.log("⚠ foto não carregou:", falhas.join(", "));
