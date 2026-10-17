// Cards de produto da PRÉ-BLACK v2: a foto num cartão 3D (espessura dourada, reflexo, luz),
// parede 3D das peças da mesma categoria no fundo e painel de vidro com as informações.
// Uso: node marketing/pre-black-v2/cards.mjs [--amostra]
// Saída: saida/{es,pt}/cards/NN_nome_codigo.png (feed 4:5) + mosaico de cada idioma
import fs from "fs";
import path from "path";
import { PASTA, PECAS, TXT, abrir, espessura, ico, marca, moeda, parede, relevo } from "./comum.mjs";
import { arquivoCard } from "./nomes.mjs";

const porCat = new Map();
PECAS.forEach((p) => {
  if (!porCat.has(p.cat)) porCat.set(p.cat, []);
  porCat.get(p.cat).push(p.img);
});

const meta = (p, t) =>
  [t.cat(p), p.marca && `${t.para} ${p.marca}`, p.extra].filter(Boolean).join(" · ");
const tam = (s, base) => (s.length > 34 ? base * 0.7 : s.length > 22 ? base * 0.84 : base);

const fundo = (p, rz) => `
  ${parede(porCat.get(p.cat), { cols: 6, linhas: 7, x: -560, y: -380, w: 2200, rx: 62, rz, opac: 0.55, blur: 1.5 })}
  <div class="veu" style="background:radial-gradient(70% 50% at 50% 40%, rgba(5,5,5,.55), rgba(5,5,5,.92) 70%), linear-gradient(180deg, rgba(5,5,5,.6), transparent 30%, transparent 55%, #050505 82%)"></div>
  <div class="luz" style="width:760px;height:520px;left:160px;top:240px;background:rgba(245,197,24,.26)"></div>`;

const topo = (t) =>
  `<div style="position:absolute;left:60px;right:60px;top:54px;display:flex;justify-content:space-between;align-items:center;z-index:5">${marca(t)}<span class="pill pill-oro" style="padding:12px 22px;font-size:19px;letter-spacing:2px">${ico("Zap", 20, 2.6)} ${t.chip}</span></div>`;

const painel = (p, t, top) => `
  <div class="vidro" style="position:absolute;left:56px;right:56px;top:${top}px;bottom:56px;padding:30px 36px;z-index:5">
    <div style="font-size:18px;font-weight:800;letter-spacing:4px;text-transform:uppercase;color:var(--oro)">${meta(p, t)}</div>
    <div class="d" style="font-size:${tam(t.nome(p), 100)}px;margin-top:10px;color:#fff;text-shadow:${relevo("#9a9a9a", "#1c1c1c", 6)}">${t.nome(p)}</div>
    <div style="position:absolute;left:36px;right:36px;bottom:28px;display:flex;justify-content:space-between;align-items:flex-end">
      <div><div style="font-size:14px;font-weight:800;letter-spacing:4px;color:var(--gris)">${t.codigo}</div>
        <div class="mono" style="font-size:40px;color:#fff;letter-spacing:1px">${p.cod}</div></div>
      <div style="text-align:right">
        <div class="pill pill-oro" style="padding:14px 22px;font-size:21px">${ico("Tag", 22, 2.4)} ${t.cta}</div>
        <div style="margin-top:10px;font-size:17px;font-weight:700;color:#d4d4d8;display:flex;gap:16px;justify-content:flex-end">
          <span>${ico("CalendarDays", 18, 2)} ${t.comeca}</span><span>${ico("Truck", 18, 2)} ${t.envio}</span></div>
      </div>
    </div>
  </div>`;

// A) cartão inclinado para a esquerda, moeda à direita
const A = (p, t) => `${fundo(p, -24)}${topo(t)}
  <div class="feixe" style="left:60px;top:-80px"></div>
  <div class="palco" style="left:150px;top:170px;width:640px;height:640px">
    <div class="cartao" style="transform:rotateY(18deg) rotateX(8deg) rotateZ(-2deg);box-shadow:${espessura(-1, 1)}"><img src="${p.img}"></div>
  </div>
  ${moeda(t, 230, "right:60px;top:200px;transform:rotate(12deg);z-index:6")}
  ${painel(p, t, 900)}`;

// B) cartão inclinado para a direita, moeda à esquerda
const B = (p, t) => `${fundo(p, 24)}${topo(t)}
  <div class="feixe" style="left:180px;top:-80px"></div>
  <div class="palco" style="left:290px;top:170px;width:640px;height:640px">
    <div class="cartao" style="transform:rotateY(-18deg) rotateX(8deg) rotateZ(2deg);box-shadow:${espessura(1, 1)}"><img src="${p.img}"></div>
  </div>
  ${moeda(t, 230, "left:56px;top:210px;transform:rotate(-12deg);z-index:6")}
  ${painel(p, t, 900)}`;

// C) de frente sobre um pedestal, com o nome em cima
const C = (p, t) => `${fundo(p, -10)}${topo(t)}
  <div style="position:absolute;left:60px;right:60px;top:150px;z-index:5">
    <div style="font-size:18px;font-weight:800;letter-spacing:4px;text-transform:uppercase;color:var(--oro)">${meta(p, t)}</div>
    <div class="d" style="font-size:${tam(t.nome(p), 96)}px;margin-top:10px;color:#fff;text-shadow:${relevo("#c99a06", "#3d2d00", 10)}">${t.nome(p)}</div>
  </div>
  <div style="position:absolute;left:250px;top:${t.nome(p).length > 22 ? 1010 : 960}px;width:580px;height:90px;border-radius:50%;background:radial-gradient(closest-side, rgba(245,197,24,.55), transparent);filter:blur(6px)"></div>
  <div style="position:absolute;left:290px;top:${t.nome(p).length > 22 ? 970 : 920}px;width:500px;height:70px;border-radius:50%;background:linear-gradient(180deg,#ffe27a,#c99a06);box-shadow:0 26px 0 #7a5a00, 0 50px 60px rgba(0,0,0,.7)"></div>
  <div class="palco" style="left:315px;top:${t.nome(p).length > 22 ? 520 : 470}px;width:450px;height:450px">
    <div class="cartao" style="border-radius:36px;transform:rotateX(6deg);-webkit-box-reflect:none;box-shadow:0 0 0 6px #f5c518, 0 40px 60px rgba(0,0,0,.6)"><img src="${p.img}"></div>
  </div>
  ${moeda(t, 210, `right:70px;top:${t.nome(p).length > 22 ? 470 : 430}px;transform:rotate(10deg);z-index:6`)}
  <div style="position:absolute;left:56px;right:56px;bottom:56px;z-index:5;display:flex;justify-content:space-between;align-items:center" class="vidro">
    <div style="padding:22px 30px"><div style="font-size:14px;font-weight:800;letter-spacing:4px;color:var(--gris)">${t.codigo}</div><div class="mono" style="font-size:38px">${p.cod}</div></div>
    <div style="padding:22px 30px;text-align:right"><div class="pill pill-oro" style="padding:14px 22px;font-size:21px">${ico("Tag", 22, 2.4)} ${t.cta}</div>
      <div style="margin-top:8px;font-size:17px;font-weight:700;color:#d4d4d8">${ico("CalendarDays", 18, 2)} ${t.comeca} · ${t.envio}</div></div>
  </div>`;

const LAYOUTS = [A, B, C];
const amostra = process.argv.includes("--amostra");
const r = await abrir();
for (const idioma of amostra ? ["pt"] : ["es", "pt"]) {
  const t = TXT[idioma];
  const dir = path.join(PASTA, "saida", idioma, "cards");
  if (!amostra) fs.rmSync(dir, { recursive: true, force: true });
  const feitos = [];
  for (const [i, p] of PECAS.entries()) {
    if (amostra && i > 2) break;
    const arq = path.join(dir, arquivoCard(i, p, idioma));
    await r.render(LAYOUTS[i % 3](p, t), arq);
    feitos.push(arq);
  }
  if (!amostra) await r.mosaico(feitos, path.join(PASTA, "saida", `mosaico_cards_${idioma}.png`));
  console.log(`✔ cards ${idioma}: ${feitos.length}`);
}
await r.fechar();
if (r.falhas.length) console.log("⚠ foto não carregou:", r.falhas.join(", "));
