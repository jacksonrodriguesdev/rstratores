// Capas da PRÉ-BLACK v2: parede 3D de fotos do site no fundo, título em relevo e moeda -20%.
// Uso: node marketing/pre-black-v2/capas.mjs [--amostra]
// Saída: saida/{es,pt}/capas/*.png (feed 4:5 e story 9:16)
import path from "path";
import { PASTA, PECAS, TXT, abrir, ico, marca, moeda, parede, relevo, slug } from "./comum.mjs";

const FOTOS = PECAS.map((p) => p.img);
const grupos = new Map();
PECAS.forEach((p) => {
  if (!grupos.has(p.cat)) grupos.set(p.cat, []);
  grupos.get(p.cat).push(p);
});

const brilhos = (h) => `
  <div class="luz" style="width:900px;height:600px;left:-200px;top:${h * 0.35}px;background:rgba(245,197,24,.28)"></div>
  <div class="luz" style="width:700px;height:500px;right:-250px;top:-150px;background:rgba(255,226,122,.22)"></div>`;
// Véu: escurece a parede embaixo e em cima para o texto respirar
const veu = (h, forte = 0.92) =>
  `<div class="veu" style="background:linear-gradient(180deg, rgba(5,5,5,.88) 0%, rgba(5,5,5,.25) 26%, rgba(5,5,5,.35) 48%, rgba(5,5,5,${forte}) 68%, #050505 100%)"></div>`;
const topo = (t, direita) =>
  `<div style="position:absolute;left:64px;right:64px;top:56px;display:flex;justify-content:space-between;align-items:center">${marca(t)}${direita}</div>`;
const rodape = (t, meio) =>
  `<div style="position:absolute;left:64px;right:64px;bottom:52px;display:flex;justify-content:space-between;align-items:center;font-weight:800;font-size:20px;letter-spacing:2px;color:#d4d4d8">
    <span>${t.site.toUpperCase()}</span><span style="color:var(--gris)">${meio}</span><span style="color:var(--oro)">${t.desliza.toUpperCase()} →</span></div>`;

// ------------------------------------------------------------ capa geral (feed)
const geral = (t) => `
  ${parede(FOTOS, { cols: 8, x: -700, y: -380, w: 2500, rx: 60, rz: -26 })}
  ${veu(1350)}${brilhos(1350)}
  ${topo(t, `<span class="pill pill-vidro" style="padding:12px 22px;font-size:19px;letter-spacing:2px">${ico("CalendarDays", 20, 2.4)} 27—30 NOV</span>`)}
  <div style="position:absolute;left:64px;top:470px">
    <span class="pill pill-oro" style="padding:12px 24px;font-size:22px;letter-spacing:3px">${ico("Zap", 22, 2.6)} ${t.ja}</span>
    <div class="d" style="font-size:250px;margin-top:64px;color:#fff;text-shadow:${relevo("#bdbdbd", "#2a2a2a", 16)}">${t.preBlack.replace("-", "-<br>").replace(" ", "<br>")}</div>
  </div>
  ${moeda(t, 330, "right:60px;top:620px;transform:rotate(-12deg)")}
  <div class="vidro" style="position:absolute;left:64px;right:64px;bottom:120px;padding:26px 34px;display:flex;justify-content:space-between;align-items:center">
    <div><div class="d" style="font-size:64px;color:var(--oro)">${t.todo}</div>
    <div style="font-size:24px;font-weight:700;color:#e4e4e7;margin-top:6px">${t.comeca}</div></div>
    <div style="text-align:right;font-size:20px;font-weight:700;color:#d4d4d8;line-height:1.5">${ico("Truck", 22, 2)} ${t.envio}<br>${ico("MessageCircle", 22, 2)} ${t.zap}</div>
  </div>
  ${rodape(t, `${PECAS.length} ${t.pecas.toUpperCase()}`)}`;

// ------------------------------------------------------------ capa de categoria (feed)
// Tamanho do título pela palavra mais longa (a fonte condensada tem ~0,52 da altura por letra)
const ajusta = (nome, max, largura = 950) =>
  Math.min(max, Math.floor(largura / (Math.max(...nome.split(/\s+/).map((w) => w.length)) * 0.53)));

const categoria = (t, ps) => {
  const nome = t.cat(ps[0]);
  // Nome de várias palavras quebra em 2 linhas: letra menor para caber junto das miniaturas
  const fs = Math.min(ajusta(nome, 190), nome.length > 12 && nome.includes(" ") ? 150 : 190);
  const fotos = ps.map((p) => p.img);
  return `
  ${parede(fotos, { cols: 6, linhas: 7, x: -520, y: -320, w: 2100, rx: 56, rz: 22 })}
  ${veu(1350, 0.95)}${brilhos(1350)}
  ${topo(t, `<span class="pill pill-oro" style="padding:12px 22px;font-size:19px;letter-spacing:2px">${t.chip}</span>`)}
  ${moeda(t, 250, "right:56px;top:250px;transform:rotate(10deg)")}
  <div style="position:absolute;left:64px;right:64px;bottom:236px;display:flex;flex-direction:column">
    <span class="pill pill-oro" style="align-self:flex-start;padding:10px 20px;font-size:20px;letter-spacing:3px">${ico("Zap", 20, 2.6)} ${t.ja}</span>
    <div class="d" style="font-size:${fs}px;margin-top:22px;color:#fff;text-shadow:${relevo("#c99a06", "#3d2d00", 14)}">${nome}</div>
    <div style="display:flex;gap:26px;margin-top:48px;perspective:1200px">${ps
      .slice(0, 4)
      .map(
        (p, i) =>
          `<div style="width:200px;height:200px;flex:none;background:#fff;border-radius:30px;transform:rotateY(${-18 + i * 12}deg) rotateX(8deg) translateY(${i % 2 ? 14 : 0}px);box-shadow:8px 8px 0 #d9a90a,14px 14px 0 #8a6500,30px 50px 60px rgba(0,0,0,.7)"><img src="${p.img}" style="width:100%;height:100%;object-fit:contain;padding:22px"></div>`,
      )
      .join("")}</div>
  </div>
  <div style="position:absolute;left:64px;bottom:128px;display:flex;gap:16px;align-items:center">
    <span class="pill pill-oro" style="padding:18px 28px;font-size:26px">${ico("Tag", 26, 2.4)} ${t.cta}</span>
    <span class="pill pill-vidro" style="padding:18px 24px;font-size:22px;color:#e4e4e7">${ico("CalendarDays", 22, 2)} ${t.comeca}</span>
  </div>
  ${rodape(t, `${ps.length} ${t.pecas.toUpperCase()}`)}`;
};

// ------------------------------------------------------------ capa geral (story 9:16)
const story = (t) => `
  ${parede(FOTOS, { cols: 8, linhas: 11, x: -900, y: -300, w: 2700, rx: 62, rz: -30 })}
  <div class="veu" style="background:linear-gradient(180deg, rgba(5,5,5,.9) 0%, rgba(5,5,5,.2) 22%, rgba(5,5,5,.45) 45%, rgba(5,5,5,.95) 62%, #050505 100%)"></div>
  ${brilhos(1920)}
  <div style="position:absolute;left:64px;top:240px">${marca(t)}</div>
  <div style="position:absolute;left:64px;right:64px;top:900px">
    <span class="pill pill-oro" style="padding:14px 26px;font-size:26px;letter-spacing:3px">${ico("Zap", 26, 2.6)} ${t.ja}</span>
    <div class="d" style="font-size:270px;margin-top:24px;color:#fff;text-shadow:${relevo("#bdbdbd", "#2a2a2a", 16)}">${t.preBlack.replace("-", "-<br>").replace(" ", "<br>")}</div>
  </div>
  ${moeda(t, 330, "right:60px;top:950px;transform:rotate(-12deg)")}
  <div style="position:absolute;left:64px;right:64px;top:1480px;text-align:center">
    <div class="d" style="font-size:72px;color:var(--oro)">${t.todo}</div>
    <div style="font-size:30px;font-weight:700;color:#e4e4e7;margin-top:12px">${t.comeca}</div>
  </div>`;

const amostra = process.argv.includes("--amostra");
const r = await abrir();
for (const idioma of amostra ? ["pt"] : ["es", "pt"]) {
  const t = TXT[idioma];
  const dir = path.join(PASTA, "saida", idioma, "capas");
  const feitos = [];
  const a = path.join(dir, "00_capa_geral.png");
  await r.render(geral(t), a);
  feitos.push(a);
  let n = 1;
  for (const [, ps] of grupos) {
    if (amostra && n > 2) break;
    const arq = path.join(dir, `${String(n++).padStart(2, "0")}_capa_${slug(t.cat(ps[0]))}.png`);
    await r.render(categoria(t, ps), arq);
    feitos.push(arq);
  }
  const s = path.join(dir, "story_capa_geral.png");
  await r.render(story(t), s, 1080, 1920);
  if (!amostra) await r.mosaico(feitos, path.join(PASTA, "saida", `mosaico_capas_${idioma}.png`), 6);
  console.log(`✔ capas ${idioma}: ${feitos.length + 1}`);
}
await r.fechar();
if (r.falhas.length) console.log("⚠ foto não carregou:", r.falhas.join(", "));
