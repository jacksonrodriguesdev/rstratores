// Criativos "Cómo funciona": chamam o público para o site e ensinam a usar, com telas reais.
// Uso (raiz do projeto):
//   node marketing/como_funciona/capturar_telas.cjs   (atualiza as telas do site, opcional)
//   node marketing/como_funciona/gerar.cjs            -> marketing/como_funciona/saida
const fs = require("fs");
const path = require("path");
const { pathToFileURL } = require("url");
const { chromium } = require(path.join(process.cwd(), "node_modules/playwright"));

const RAIZ = process.cwd();
const DIR = path.join(RAIZ, "marketing/como_funciona");
const OUT = path.join(DIR, "saida");
const SITE = "agropartsuy.com";
const tela = (n) => pathToFileURL(path.join(DIR, "telas", n + ".png")).href;
const LOGO = pathToFileURL(path.join(RAIZ, "public/logo.png")).href;

const BASE = `
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wdth,wght@12..96,75..100,400..800&family=Manrope:wght@500;600;700;800&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
<style>
:root{--papel:#f7f4ec;--menta:#e2f0e4;--verde:#135c33;--noche:#0f2a1b;--oro:#f2b705;--whats:#25D366;--gris:#5d6b61}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:"Manrope",system-ui,sans-serif;color:var(--noche);-webkit-font-smoothing:antialiased}
.l{position:relative;overflow:hidden;background:var(--papel)}
.d{font-family:"Bricolage Grotesque","Manrope",sans-serif;font-weight:800;line-height:.95;letter-spacing:-1.5px}
.verde{color:var(--verde)}
.ojo{font-size:24px;font-weight:800;letter-spacing:4px;text-transform:uppercase;color:var(--verde)}
.marca{display:flex;align-items:center;gap:12px}
.marca img{width:56px;height:56px}
.marca b{font-family:"Bricolage Grotesque";font-size:28px;font-weight:800}
.tel{position:absolute;border-radius:58px;background:#111;padding:12px;box-shadow:0 40px 80px rgba(15,42,27,.28)}
.tel .pant{border-radius:46px;overflow:hidden;position:relative;background:#fff}
.tel img{display:block;width:100%}
.paso{display:inline-grid;place-items:center;width:92px;height:92px;border-radius:50%;background:var(--verde);color:#fff;font-family:"Bricolage Grotesque";font-size:52px;font-weight:800}
.nota{position:absolute;background:var(--noche);color:#fff;font-weight:800;font-size:26px;padding:16px 24px;border-radius:20px;box-shadow:0 14px 30px rgba(0,0,0,.2)}
.nota.oro{background:var(--oro);color:var(--noche)}
.flecha{position:absolute;overflow:visible}
.mancha{position:absolute;border-radius:50%;background:var(--menta)}
.btn{display:inline-flex;align-items:center;gap:14px;border-radius:999px;font-weight:800}
.ico{width:1em;height:1em;flex:none}
.pts{position:absolute;bottom:52px;left:0;right:0;display:flex;justify-content:center;gap:10px}
.pts i{width:12px;height:12px;border-radius:50%;background:#cfd8cf}
.pts i.on{width:36px;border-radius:6px;background:var(--verde)}
</style>`;

const WHATS = `<svg class="ico" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.7.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4a.5.5 0 0 0 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6a2.7 2.7 0 0 0 1.8-1.3 2.2 2.2 0 0 0 .2-1.3c-.1-.1-.3-.2-.5-.3Z"/></svg>`;
const marca = `<div class="marca"><img src="${LOGO}"><b>AGRO PARTS</b></div>`;

// Celular com recorte da tela: `y` = de onde começa (px da captura de 390 de largura) e `h` = altura visível
const celular = ({ img, x, y, w, rot = 0, desde = 0, alto = 844 }) => {
  const esc = (w - 24) / 390;
  return `<div class="tel" style="left:${x}px;top:${y}px;width:${w}px;transform:rotate(${rot}deg)"><div class="pant" style="height:${alto * esc}px"><img src="${tela(img)}" style="margin-top:${-desde * esc}px"></div></div>`;
};
// Seta desenhada à mão de (x1,y1) até (x2,y2)
const flecha = (x1, y1, x2, y2, cor = "var(--noche)") => {
  const cx = (x1 + x2) / 2 - (y2 - y1) * 0.22, cy = (y1 + y2) / 2 + (x2 - x1) * 0.22;
  const ang = Math.atan2(y2 - cy, x2 - cx), a = 22;
  const p1 = [x2 - a * Math.cos(ang - 0.5), y2 - a * Math.sin(ang - 0.5)], p2 = [x2 - a * Math.cos(ang + 0.5), y2 - a * Math.sin(ang + 0.5)];
  return `<svg class="flecha" style="left:0;top:0" width="1080" height="1920"><path d="M${x1} ${y1} Q${cx} ${cy} ${x2} ${y2}" stroke="${cor}" stroke-width="5" fill="none" stroke-linecap="round" stroke-dasharray="2 12"/><path d="M${p1} L${x2} ${y2} L${p2}" stroke="${cor}" stroke-width="6" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
};
const pontos = (n, ativo) => `<div class="pts">${Array.from({ length: n }, (_, k) => `<i class="${k === ativo ? "on" : ""}"></i>`).join("")}</div>`;
const qr = (id, tam) => `<div id="${id}" style="width:${tam}px;height:${tam}px"></div><script>new QRCode(document.getElementById("${id}"),{text:"https://${SITE}/?utm_source=instagram&utm_medium=organic&utm_campaign=como_funciona",width:${tam},height:${tam},colorDark:"#0f2a1b",colorLight:"#ffffff"});</script>`;
const bolha = (linhas, escala = 1) => `<div style="background:#efeae2;border-radius:${30 * escala}px;padding:${26 * escala}px;box-shadow:0 30px 60px rgba(15,42,27,.18)">
  <div style="display:flex;align-items:center;gap:${12 * escala}px;margin-bottom:${18 * escala}px;font-size:${22 * escala}px;font-weight:700;color:#54656f"><img src="${LOGO}" style="width:${46 * escala}px;background:#fff;border-radius:50%;padding:${4 * escala}px">AGRO PARTS · WhatsApp</div>
  <div style="margin-left:auto;max-width:92%;background:#d9fdd3;border-radius:${24 * escala}px ${6 * escala}px ${24 * escala}px ${24 * escala}px;padding:${20 * escala}px ${24 * escala}px;font-size:${24 * escala}px;line-height:1.4">${linhas}</div></div>`;
const MSG_COTIZACION = `¡Hola! Quiero cotizar estos repuestos:<br><br>• 1x Filtro Aire Externo — Cód: 055119<br>• 1x Conjunto Filtro Hidráulico — Cód: 1329214C1<br>• 1x Kit Embrague Valtra — Cód: 85026700`;

const ITENS = [];
const add = (nome, w, h, html, legenda = "") => ITENS.push({ nome, w, h, html, legenda });
const TAGS = "#AgroParts #RepuestosAgricolas #Uruguay #Tractores #CampoUruguayo #MasseyFerguson #JohnDeere #NewHolland #Valtra";

// ---------- Carrossel tutorial (4:5) ----------
const N = 7;
add("carrusel_01_portada", 1080, 1350, `<div class="l" style="width:1080px;height:1350px">
  <div class="mancha" style="width:900px;height:900px;left:420px;top:380px"></div>
  <div style="position:absolute;left:64px;top:60px">${marca}</div>
  <div class="ojo" style="position:absolute;left:64px;top:190px">Guía rápida</div>
  <h1 class="d" style="position:absolute;left:64px;top:240px;width:520px;font-size:98px">Cotizá tu repuesto en <span class="verde">4 pasos</span></h1>
  <p style="position:absolute;left:64px;top:760px;width:440px;font-size:30px;line-height:1.4;font-weight:600;color:var(--gris)">Sin registrarte, desde el celular, con respuesta por WhatsApp.</p>
  ${celular({ img: "07_home", x: 600, y: 200, w: 420, rot: 4 })}
  <div style="position:absolute;left:64px;bottom:120px;font-size:34px;font-weight:800">Deslizá →</div>${pontos(N, 0)}
</div>`, `Cotizar tu repuesto en AGRO PARTS es así de fácil 👇 (deslizá)\n1️⃣ Buscá por código o nombre\n2️⃣ Elegí la pieza\n3️⃣ Armá tu lista\n4️⃣ Pedí el precio por WhatsApp\nSin registrarte. Envíos a todo Uruguay por DAC.\n👉 ${SITE}\n\n${TAGS}`);

const passo = (n, titulo, texto, img, nota, extra = "", tel = {}, pTop = 640) =>
  `<div class="l" style="width:1080px;height:1350px">
  <div class="mancha" style="width:760px;height:760px;left:420px;top:420px"></div>
  <div style="position:absolute;left:64px;top:60px">${marca}</div>
  <div style="position:absolute;left:64px;top:180px;display:flex;align-items:center;gap:22px"><span class="paso">${n}</span><span class="ojo">Paso ${n} de 4</span></div>
  <h1 class="d" style="position:absolute;left:64px;top:310px;width:500px;font-size:84px">${titulo}</h1>
  <p style="position:absolute;left:64px;top:${pTop}px;width:420px;font-size:28px;line-height:1.45;font-weight:600;color:var(--gris)">${texto}</p>
  ${celular({ img, x: 560, y: 170, w: 450, rot: 0, ...tel })}
  ${nota}${extra}${pontos(N, n)}</div>`;

add("carrusel_02_buscar", 1080, 1350, passo(1, "Buscá tu repuesto", "Escribí el código original o el nombre de la pieza. Las sugerencias aparecen mientras escribís.", "01_busca",
  `<div class="nota oro" style="left:64px;top:540px">Escribí el código</div>${flecha(372, 572, 648, 262)}`, "", { alto: 760 }, 720));
add("carrusel_03_elegir", 1080, 1350, passo(2, "Elegí la pieza", "Ves la foto, el código y la marca del tractor. Si tenés dudas, te confirmamos la compatibilidad.", "02_produto",
  `<div class="nota" style="left:110px;top:1000px">Código para comparar</div>${flecha(440, 1012, 604, 880)}`, "", { alto: 760, desde: 60 }));
add("carrusel_04_lista", 1080, 1350, passo(3, "Armá tu lista", "Tocá «Agregar a mi cotización» en cada pieza. Podés cambiar cantidades cuando quieras.", "03_cotizacion",
  `<div class="nota oro" style="left:90px;top:1010px">Todo en un solo pedido</div>${flecha(432, 1022, 596, 945)}`, "", { alto: 760, desde: 0 }));
add("carrusel_05_whatsapp", 1080, 1350, `<div class="l" style="width:1080px;height:1350px">
  <div class="mancha" style="width:800px;height:800px;left:380px;top:360px;background:#d6f5df"></div>
  <div style="position:absolute;left:64px;top:60px">${marca}</div>
  <div style="position:absolute;left:64px;top:180px;display:flex;align-items:center;gap:22px"><span class="paso" style="background:var(--whats)">4</span><span class="ojo">Paso 4 de 4</span></div>
  <h1 class="d" style="position:absolute;left:64px;top:310px;width:900px;font-size:92px">Pedí el precio por <span style="color:#128C4B">WhatsApp</span></h1>
  <div style="position:absolute;left:150px;right:64px;top:560px">${bolha(MSG_COTIZACION)}</div>
  <p style="position:absolute;left:64px;top:1030px;width:900px;font-size:30px;line-height:1.45;font-weight:600;color:var(--gris)">El mensaje sale listo, con los códigos. Te respondemos con precio, disponibilidad y costo de envío a tu localidad.</p>
  ${pontos(N, 5)}</div>`);
add("carrusel_06_talleres", 1080, 1350, `<div class="l" style="width:1080px;height:1350px;background:var(--noche);color:#fff">
  <div style="position:absolute;left:64px;top:60px" class="marca"><img src="${LOGO}" style="background:#fff;border-radius:16px;padding:4px"><b style="color:#fff">AGRO PARTS</b></div>
  <div class="ojo" style="position:absolute;left:64px;top:190px;color:var(--oro)">Extra · para talleres</div>
  <h1 class="d" style="position:absolute;left:64px;top:240px;width:500px;font-size:88px">¿Tenés una lista de códigos?</h1>
  <p style="position:absolute;left:64px;top:560px;width:430px;font-size:30px;line-height:1.45;font-weight:600;color:#c9dccf">En <b style="color:#fff">Pedido rápido</b> pegás todos los códigos, con cantidades, y cotizás todo junto.</p>
  ${celular({ img: "06_pedido_rapido", x: 570, y: 170, w: 440, alto: 760, desde: 60 })}
  <div class="nota oro" style="left:64px;top:1010px">agropartsuy.com/pedido-rapido</div>
  ${pontos(N, 6).replace(/#cfd8cf/g, "#3c5546")}</div>`);
add("carrusel_07_cierre", 1080, 1350, `<div class="l" style="width:1080px;height:1350px">
  <div class="mancha" style="width:1000px;height:1000px;left:40px;top:300px"></div>
  <div style="position:absolute;left:64px;top:60px">${marca}</div>
  <h1 class="d" style="position:absolute;left:64px;right:64px;top:200px;text-align:center;font-size:110px">Probalo ahora</h1>
  <div style="position:absolute;left:50%;top:400px;transform:translateX(-50%);background:#fff;padding:26px;border-radius:30px;box-shadow:0 30px 60px rgba(15,42,27,.18)">${qr("q1", 360)}</div>
  <div class="d" style="position:absolute;left:0;right:0;top:880px;text-align:center;font-size:76px" class="verde"><span class="verde">${SITE}</span></div>
  <p style="position:absolute;left:120px;right:120px;top:990px;text-align:center;font-size:30px;font-weight:600;color:var(--gris)">Escaneá el código o tocá el link de la bio. Más de 29.000 repuestos y envíos a todo Uruguay.</p>
  ${pontos(N, 6).replace('class="on"', "").replace(/<i class=""><\/i>$/, "")}</div>`);

// ---------- Posts de recurso (4:5) ----------
const recurso = (nome, eyebrow, titulo, texto, celCfg, nota, legenda) =>
  add(nome, 1080, 1350, `<div class="l" style="width:1080px;height:1350px">
  <div class="mancha" style="width:820px;height:820px;left:-200px;top:600px"></div>
  <div style="position:absolute;left:64px;top:60px">${marca}</div>
  <div class="ojo" style="position:absolute;left:64px;top:190px">${eyebrow}</div>
  <h1 class="d" style="position:absolute;left:64px;top:240px;width:520px;font-size:92px">${titulo}</h1>
  <p style="position:absolute;left:64px;top:700px;width:440px;font-size:29px;line-height:1.45;font-weight:600;color:var(--gris)">${texto}</p>
  ${celular(celCfg)}${nota}
  <div class="btn" style="position:absolute;left:64px;bottom:64px;background:var(--verde);color:#fff;font-size:30px;padding:22px 34px">Entrá a ${SITE}</div></div>`, legenda);

recurso("recurso_01_codigo", "Buscador inteligente", "Buscá por el código de la pieza", "Escribí el código original o el del fabricante y te mostramos la pieza al instante, con foto.",
  { img: "01_busca", x: 570, y: 160, w: 450, alto: 844 }, `<div class="nota oro" style="left:64px;top:930px">También «rodamiento», «retén»…</div>`,
  `¿Tenés el código de la pieza? 🔎 Escribilo en el buscador de ${SITE} y la encontrás al instante. También podés buscar por nombre: «rodamiento», «retén», «filtro de aceite»…\n\n${TAGS}`);
recurso("recurso_02_marca", "Por marca de tractor", "Repuestos para tu tractor", "Filtrá por Massey Ferguson, Valtra, John Deere, New Holland, Case IH y más.",
  { img: "05_marca", x: 570, y: 160, w: 450, alto: 844 }, "",
  `Elegí la marca de tu tractor y mirá los repuestos disponibles 🚜 Massey Ferguson, Valtra, John Deere, New Holland, Case IH, Ford y Agrale.\n👉 ${SITE}\n\n${TAGS}`);
recurso("recurso_03_categorias", "Todo ordenado", "Todas las categorías a un toque", "Transmisión, hidráulica, filtros, sellos, rodamientos, frenos y más.",
  { img: "04_categorias", x: 570, y: 160, w: 450, alto: 614, desde: 230 }, "",
  `Transmisión, hidráulica, filtros, sellos, rodamientos, frenos… Encontrá todo ordenado por categoría en ${SITE} 📱\n\n${TAGS}`);
add("recurso_04_envios", 1080, 1350, `<div class="l" style="width:1080px;height:1350px">
  <div style="position:absolute;left:64px;top:60px">${marca}</div>
  <div class="ojo" style="position:absolute;left:64px;top:190px">Envíos</div>
  <h1 class="d" style="position:absolute;left:64px;top:240px;width:950px;font-size:118px">Llegamos a <span class="verde">todo Uruguay</span></h1>
  <div style="position:absolute;left:64px;right:64px;top:560px;display:grid;grid-template-columns:repeat(3,1fr);gap:22px">
    ${[["19", "departamentos"], ["DAC", "despacho con seguimiento"], ["WhatsApp", "te avisamos cuando sale"]].map(([a, b]) => `<div style="background:#fff;border-radius:28px;padding:34px 26px;box-shadow:0 14px 34px rgba(15,42,27,.08)"><div class="d verde" style="font-size:${a.length > 4 ? 52 : 92}px">${a}</div><div style="font-size:26px;font-weight:700;margin-top:14px;color:var(--gris)">${b}</div></div>`).join("")}
  </div>
  <p style="position:absolute;left:64px;top:930px;width:900px;font-size:30px;line-height:1.45;font-weight:600;color:var(--gris)">Con el número de seguimiento ves tu paquete en dac.com.uy desde que sale hasta que llega.</p>
  <div class="btn" style="position:absolute;left:64px;bottom:64px;background:var(--verde);color:#fff;font-size:30px;padding:22px 34px">Pedí tu repuesto en ${SITE}</div></div>`,
  `📦 Enviamos a los 19 departamentos por DAC, con número de seguimiento. Pedí tu repuesto en ${SITE} y te avisamos por WhatsApp cuando sale.\n\n${TAGS}`);

// ---------- Sequência de stories (9:16) ----------
const story = (nome, html) => add(nome, 1080, 1920, `<div class="l" style="width:1080px;height:1920px">${html}</div>`);
const barra = (k) => `<div style="position:absolute;left:40px;right:40px;top:40px;display:flex;gap:8px">${Array.from({ length: 5 }, (_, i) => `<i style="flex:1;height:6px;border-radius:3px;background:${i <= k ? "var(--noche)" : "#d8ddd6"}"></i>`).join("")}</div>`;
story("story_01_pregunta", `${barra(0)}<div class="mancha" style="width:1200px;height:1200px;left:-60px;top:520px"></div>
  <div style="position:absolute;left:80px;top:150px">${marca}</div>
  <h1 class="d" style="position:absolute;left:80px;top:420px;width:920px;font-size:150px">¿Se te rompió una pieza del tractor?</h1>
  <div style="position:absolute;left:80px;right:80px;top:1180px;background:#fff;border-radius:36px;padding:40px;box-shadow:0 20px 50px rgba(15,42,27,.12)">
    <div style="font-size:34px;font-weight:800;margin-bottom:24px">¿Qué estás buscando?</div>
    ${["Filtros", "Rodamientos", "Retenes", "Otra pieza"].map((t) => `<div style="border:3px solid #dfe6de;border-radius:20px;padding:20px 26px;font-size:32px;font-weight:700;margin-top:14px">${t}</div>`).join("")}
  </div>
  <div style="position:absolute;left:0;right:0;bottom:140px;text-align:center;font-size:30px;font-weight:800;color:var(--gris)">Tocá para seguir →</div>`);
story("story_02_entra", `${barra(1)}<div style="position:absolute;left:80px;top:150px">${marca}</div>
  <h1 class="d" style="position:absolute;left:80px;top:300px;width:920px;font-size:120px">Entrá a <span class="verde">${SITE}</span></h1>
  ${celular({ img: "07_home", x: 210, y: 700, w: 660, alto: 844 })}`);
story("story_03_busca", `${barra(2)}<div style="position:absolute;left:80px;top:150px">${marca}</div>
  <h1 class="d" style="position:absolute;left:80px;top:300px;width:920px;font-size:116px">Buscá y tocá <span class="verde">«Consultar precio»</span></h1>
  ${celular({ img: "02_produto", x: 210, y: 760, w: 660, alto: 844 })}
  <div class="nota oro" style="left:80px;top:1650px">Se abre WhatsApp con el código listo</div>`);
story("story_04_whatsapp", `${barra(3)}<div class="mancha" style="width:1200px;height:1200px;left:-60px;top:560px;background:#d6f5df"></div>
  <div style="position:absolute;left:80px;top:150px">${marca}</div>
  <h1 class="d" style="position:absolute;left:80px;top:300px;width:920px;font-size:120px">Te respondemos con precio y envío</h1>
  <div style="position:absolute;left:80px;right:80px;top:820px">${bolha(MSG_COTIZACION, 1.25)}</div>`);
story("story_05_link", `${barra(4)}<div style="position:absolute;left:80px;top:150px">${marca}</div>
  <h1 class="d" style="position:absolute;left:80px;right:80px;top:330px;text-align:center;font-size:130px">Probalo ahora</h1>
  <div style="position:absolute;left:50%;top:640px;transform:translateX(-50%);background:#fff;padding:34px;border-radius:40px;box-shadow:0 30px 60px rgba(15,42,27,.18)">${qr("q2", 460)}</div>
  <div class="btn" style="position:absolute;left:50%;transform:translateX(-50%);top:1260px;background:var(--whats);color:#06381b;font-size:44px;padding:28px 48px;white-space:nowrap">${WHATS} ${SITE}</div>`);

// ---------- Capas de Reels (9:16) ----------
const capaReel = (nome, linha1, linha2, img) => story(nome, `<div style="position:absolute;inset:0;background:var(--noche)"></div>
  ${celular({ img, x: 240, y: 720, w: 600, rot: -5 })}
  <div style="position:absolute;left:0;right:0;top:0;height:900px;background:linear-gradient(var(--noche) 70%,transparent)"></div>
  <div style="position:absolute;left:80px;top:180px" class="marca"><img src="${LOGO}" style="background:#fff;border-radius:16px;padding:4px"><b style="color:#fff">AGRO PARTS</b></div>
  <h1 class="d" style="position:absolute;left:80px;top:360px;width:920px;font-size:140px;color:#fff">${linha1} <span style="color:var(--oro)">${linha2}</span></h1>`);
capaReel("reel_portada_01", "Así cotizás en", "15 segundos", "02_produto");
capaReel("reel_portada_02", "Pedido rápido", "para talleres", "06_pedido_rapido");

// ---------- Capas dos Destaques do perfil ----------
const ICONES = {
  "Cómo comprar": '<path d="M3 3h2l2.4 12.2a2 2 0 0 0 2 1.6h8.8a2 2 0 0 0 2-1.6L22 7H6"/><circle cx="10" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/>',
  Envíos: '<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  Marcas: '<circle cx="7" cy="16" r="4"/><circle cx="18" cy="17" r="2.5"/><path d="M4 12V6h6l2 5h6v4M9 6V3"/>',
  Talleres: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M3.5 6l1.5 1.5L7.5 5M3.5 12l1.5 1.5L7.5 11M3.5 18l1.5 1.5L7.5 17"/>',
  Ofertas: '<path d="M19 5 5 19"/><circle cx="7" cy="7" r="2.5"/><circle cx="17" cy="17" r="2.5"/>',
  Contacto: '<path d="M21 12a8.5 8.5 0 0 1-12.6 7.4L3 21l1.6-5A8.5 8.5 0 1 1 21 12Z"/>',
};
Object.entries(ICONES).forEach(([nome, d], i) =>
  story(`destacado_${String(i + 1).padStart(2, "0")}_${nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "_")}`,
    `<div style="position:absolute;inset:0;background:var(--verde)"></div>
    <div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:560px;height:560px;border-radius:50%;background:var(--papel);display:grid;place-items:center">
      <svg viewBox="0 0 24 24" width="300" height="300" fill="none" stroke="#135c33" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${d}</svg></div>
    <div style="position:absolute;left:0;right:0;top:1340px;text-align:center;font-family:'Bricolage Grotesque';font-size:64px;font-weight:800;color:#fff">${nome}</div>`));

// ---------- Render ----------
(async () => {
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const p = await b.newPage();
  const tmp = path.join(OUT, "_tmp.html");
  for (const it of ITENS) {
    await p.setViewportSize({ width: it.w, height: it.h });
    fs.writeFileSync(tmp, `<!doctype html><meta charset="utf-8">${BASE}<body>${it.html}</body>`);
    await p.goto(pathToFileURL(tmp).href, { waitUntil: "networkidle" });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(OUT, it.nome + ".png"), clip: { x: 0, y: 0, width: it.w, height: it.h } });
  }
  fs.rmSync(tmp, { force: true });
  fs.writeFileSync(path.join(OUT, "legendas.md"), "# Legendas · Cómo funciona\n\n" + ITENS.filter((i) => i.legenda).map((i) => `## ${i.nome}.png\n\n${i.legenda}\n`).join("\n") +
    "\n## Stories (sequência)\n\nPublique story_01 a story_05 em ordem. No story_01 use a figurinha de enquete; no story_05, a figurinha de link para " + SITE + ".\n" +
    "\n## Destaques do perfil\n\nUse destacado_* como capa dos Destaques: Cómo comprar, Envíos, Marcas, Talleres, Ofertas e Contacto.\n");
  const mini = ITENS.map((i) => `<figure style="margin:0"><img src="${pathToFileURL(path.join(OUT, i.nome + ".png")).href}" style="width:100%;border-radius:8px;display:block"><figcaption style="font:12px system-ui;color:#555;margin-top:4px">${i.nome}</figcaption></figure>`).join("");
  fs.writeFileSync(tmp, `<!doctype html><body style="margin:0;padding:20px;background:#e9ebe5"><div style="display:grid;grid-template-columns:repeat(8,1fr);gap:14px;align-items:start">${mini}</div></body>`);
  await p.setViewportSize({ width: 2000, height: 800 });
  await p.goto(pathToFileURL(tmp).href, { waitUntil: "load" });
  await p.waitForTimeout(400);
  await p.screenshot({ path: path.join(OUT, "mosaico.png"), fullPage: true });
  fs.rmSync(tmp, { force: true });
  await b.close();
  console.log(`${ITENS.length} criativos em ${path.relative(RAIZ, OUT)}`);
})();
