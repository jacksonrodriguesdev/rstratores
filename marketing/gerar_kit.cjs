// Gera marketing/kit_anuncios.html (página do kit de anúncios) a partir de kit_dados.cjs.
// Uso: node marketing/gerar_kit.cjs
const fs = require("fs");
const path = require("path");
const d = require("./kit_dados.cjs");

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n = (t) => [...t].length;

// Lista copiável: cada linha com contador de caracteres e um botão "Copiar tudo"
const lista = (titulo, itens, max) => `
<div class="bloco">
  <div class="bloco-topo"><h4>${esc(titulo)}</h4><button class="copiar" data-copiar="${esc(itens.join("\n"))}">Copiar todos</button></div>
  <ol class="linhas">${itens
    .map((t) => `<li><span class="txt">${esc(t)}</span>${max ? `<span class="cont ${n(t) > max ? "ruim" : ""}">${n(t)}/${max}</span>` : ""}</li>`)
    .join("")}</ol>
</div>`;

const CRIATIVOS = fs
  .readdirSync(path.join(__dirname, "criativos"))
  .filter((f) => f.endsWith(".png"))
  .sort();
const grupoCriativo = (f) =>
  f.startsWith("feed") ? "Feed Instagram/Facebook · 4:5" : f.startsWith("story") ? "Stories e Reels · 9:16" : f.startsWith("carrusel") ? "Carrossel · 1:1" : "Google (Display e Performance Max)";
const grupos = {};
for (const f of CRIATIVOS) (grupos[grupoCriativo(f)] ??= []).push(f);

const html = `<title>Kit de Anúncios AGRO PARTS</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..100,500..900&family=Source+Sans+3:wght@400;600;700&display=swap" rel="stylesheet">
<style>
/* Documento de trabalho: barra de seções fixa, colunas de texto estreitas, blocos copiáveis */
:root {
  --fundo: #f4f6f1; --papel: #ffffff; --tinta: #16211a; --suave: #5a6a5f; --linha: #dde4da;
  --verde: #14532d; --verde-claro: #e3efe5; --oro: #946c00; --oro-fundo: #fff4cf; --alerta: #9a2b16; --alerta-fundo: #fde8e2; --whats: #128c4b;
  --display: "Archivo", "Arial Narrow", system-ui, sans-serif; --texto: "Source Sans 3", system-ui, sans-serif;
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) {
  --fundo: #0e1511; --papel: #16201a; --tinta: #e6efe8; --suave: #9fb2a5; --linha: #2a3a30;
  --verde: #7fd39c; --verde-claro: #1d3326; --oro: #f2c544; --oro-fundo: #3a3112; --alerta: #ffab95; --alerta-fundo: #3d1d15; --whats: #4fd38a; color-scheme: dark } }
:root[data-theme="dark"] {
  --fundo: #0e1511; --papel: #16201a; --tinta: #e6efe8; --suave: #9fb2a5; --linha: #2a3a30;
  --verde: #7fd39c; --verde-claro: #1d3326; --oro: #f2c544; --oro-fundo: #3a3112; --alerta: #ffab95; --alerta-fundo: #3d1d15; --whats: #4fd38a; color-scheme: dark }
* { box-sizing: border-box }
body { margin: 0; background: var(--fundo); color: var(--tinta); font: 17px/1.55 var(--texto) }
.pagina { max-width: 1040px; margin: 0 auto; padding-inline: 18px; padding-block: 28px 80px }
h1, h2, h3, h4 { font-family: var(--display); line-height: 1.1; text-wrap: balance; margin: 0 }
h1 { font-size: clamp(34px, 6vw, 56px); font-weight: 900; font-stretch: 85% }
h2 { font-size: clamp(26px, 4vw, 36px); font-weight: 900; font-stretch: 88%; margin-top: 56px; scroll-margin-top: 70px }
h3 { font-size: 22px; font-weight: 800; margin-top: 34px }
h4 { font-size: 16px; font-weight: 800; letter-spacing: .02em }
p { margin: 10px 0; max-width: 68ch }
.olho { font-size: 13px; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; color: var(--oro) }
.lead { font-size: 19px; color: var(--suave); max-width: 62ch }
nav.secoes { position: sticky; top: env(safe-area-inset-top, 0px); z-index: 5; background: var(--fundo); border-bottom: 1px solid var(--linha);
  display: flex; gap: 6px; overflow-x: auto; padding: 10px 0; margin-top: 22px; scrollbar-width: none }
nav.secoes a { flex: none; text-decoration: none; color: var(--tinta); font-weight: 700; font-size: 15px; padding: 7px 14px; border-radius: 999px; background: var(--papel); border: 1px solid var(--linha) }
nav.secoes a:hover, nav.secoes a:focus-visible { border-color: var(--verde); color: var(--verde); outline: none }
.fatos { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 12px; margin-top: 22px }
.fato { background: var(--papel); border: 1px solid var(--linha); border-radius: 12px; padding: 14px 16px }
.fato b { display: block; font-family: var(--display); font-size: 26px; font-weight: 900; color: var(--verde); font-variant-numeric: tabular-nums }
.fato span { color: var(--suave); font-size: 15px }
.alerta { background: var(--alerta-fundo); border-left: 4px solid var(--alerta); border-radius: 8px; padding: 14px 18px; margin-top: 18px }
.alerta b { color: var(--alerta) }
.check { list-style: none; padding: 0; margin: 14px 0 0; display: grid; gap: 10px }
.check li { background: var(--papel); border: 1px solid var(--linha); border-radius: 10px; padding: 12px 14px 12px 44px; position: relative }
.check li::before { content: ""; position: absolute; left: 14px; top: 15px; width: 16px; height: 16px; border-radius: 4px; border: 2px solid var(--verde) }
.check li.urgente::before { border-color: var(--alerta) }
.galeria { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; margin-top: 12px }
.galeria figure { margin: 0; background: var(--papel); border: 1px solid var(--linha); border-radius: 10px; padding: 8px }
.galeria img { width: 100%; height: auto; display: block; border-radius: 6px; max-width: 100% }
.galeria figcaption { font-size: 12px; color: var(--suave); margin-top: 6px; word-break: break-all }
.bloco { background: var(--papel); border: 1px solid var(--linha); border-radius: 12px; padding: 14px 16px; margin-top: 14px; min-width: 0 }
.bloco-topo { display: flex; align-items: center; justify-content: space-between; gap: 12px }
.linhas { margin: 10px 0 0; padding-left: 22px; display: grid; gap: 6px }
.linhas li { display: flex; justify-content: space-between; gap: 12px; align-items: baseline }
.linhas .txt { min-width: 0; overflow-wrap: anywhere }
.cont { flex: none; font-size: 12px; color: var(--suave); font-variant-numeric: tabular-nums }
.cont.ruim { color: var(--alerta); font-weight: 700 }
button.copiar { flex: none; font: 700 14px var(--texto); color: var(--verde); background: var(--verde-claro); border: 0; border-radius: 999px; padding: 7px 14px; cursor: pointer }
button.copiar:focus-visible { outline: 2px solid var(--verde); outline-offset: 2px }
button.copiar.ok { background: var(--verde); color: var(--papel) }
.duas { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 14px }
.tabela { overflow-x: auto; margin-top: 12px; border: 1px solid var(--linha); border-radius: 12px; background: var(--papel) }
table { border-collapse: collapse; width: 100%; font-size: 15px }
th, td { text-align: left; padding: 10px 12px; border-bottom: 1px solid var(--linha); vertical-align: top }
th { font-family: var(--display); font-size: 13px; letter-spacing: .06em; text-transform: uppercase; color: var(--suave) }
tr:last-child td { border-bottom: 0 }
code, .url { font-family: ui-monospace, Consolas, monospace; font-size: 13px; overflow-wrap: anywhere; color: var(--verde) }
.tag { display: inline-block; font-size: 13px; font-weight: 700; padding: 2px 10px; border-radius: 999px; background: var(--oro-fundo); color: var(--oro); margin: 2px 4px 2px 0 }
.camp { background: var(--papel); border: 1px solid var(--linha); border-radius: 12px; padding: 16px 18px; margin-top: 14px }
.camp h4 { font-size: 19px }
.camp .porque { color: var(--suave); margin: 6px 0 0 }
.roteiro { display: grid; grid-template-columns: 74px 1fr; gap: 6px 14px; margin-top: 10px; font-size: 15px }
.roteiro b { font-variant-numeric: tabular-nums; color: var(--oro) }
footer { margin-top: 60px; color: var(--suave); font-size: 14px }
</style>

<div class="pagina">
  <div class="olho">AGRO PARTS · agropartsuy.com</div>
  <h1>Kit de anúncios para Google, Instagram e Facebook</h1>
  <p class="lead">Criativos com telas reais do site, textos prontos em espanhol do Uruguai e a estrutura das campanhas. Todo texto tem botão para copiar; os limites de caracteres do Google já foram conferidos.</p>

  <div class="fatos">
    <div class="fato"><b>29.000+</b><span>repuestos no catálogo</span></div>
    <div class="fato"><b>999</b><span>com foto do produto</span></div>
    <div class="fato"><b>19</b><span>departamentos com envio DAC</span></div>
    <div class="fato"><b>${CRIATIVOS.length}</b><span>criativos prontos</span></div>
  </div>

  <nav class="secoes" aria-label="Seções">
    <a href="#antes">Antes de anunciar</a><a href="#criativos">Criativos</a><a href="#google">Google Ads</a><a href="#meta">Instagram e Facebook</a><a href="#organico">Posts orgânicos</a><a href="#medicao">Medição e verba</a>
  </nav>

  <h2 id="antes">Antes de anunciar</h2>
  <p>Anúncio leva o cliente direto para o WhatsApp e para o site. Estes pontos precisam estar certos antes de colocar dinheiro.</p>
  <div class="alerta"><b>Número do WhatsApp.</b> Os botões do site abrem o número <code>55 39 9942-8130</code>, mas o rodapé mostra <code>(53) 99953-4631</code>. Confirme qual é o certo antes de qualquer campanha: se estiver errado, todo clique pago se perde. Para clientes no Uruguai, um número uruguaio (+598) também passa mais confiança.</div>
  <ul class="check">
    <li class="urgente"><b>Domínio novo no sitemap.</b> O sitemap e o robots.txt ainda apontam para rsautopecas.com. Defina <code>VITE_SITE_URL=https://agropartsuy.com</code> na Hostinger e faça o redeploy.</li>
    <li class="urgente"><b>Seção de envios DAC na home.</b> Ela não aparece em agropartsuy.com. Em Admin → Página Inicial, adicione o bloco «Envíos a Uruguay».</li>
    <li><b>Ofertas do banner.</b> O site anuncia «Envío gratis desde $5.000 UYU», «Hasta 10x sin interés» e «30% OFF». Se usar nos anúncios, confirme que estão valendo.</li>
    <li><b>Google Analytics 4 e Meta Pixel.</b> Crie as contas e coloque <code>VITE_GA4_ID</code> e <code>VITE_META_PIXEL_ID</code> na Hostinger. O site já envia «generate_lead» e «Contact» a cada clique no WhatsApp.</li>
    <li><b>Google Search Console.</b> Cadastre agropartsuy.com e envie <code>https://agropartsuy.com/sitemap.xml</code>.</li>
    <li><b>Perfil da Empresa no Google</b> (Google Maps) e página no Facebook/Instagram com o mesmo nome, logo e WhatsApp.</li>
    <li><b>Fotos dos produtos.</b> As 999 fotos vieram da extração de outra loja. Para anúncios por muito tempo, prefira fotos próprias ou peça autorização.</li>
  </ul>

  <h2 id="criativos">Criativos</h2>
  <p>Todos estão na pasta <code>marketing/criativos</code> do projeto (e no GitHub). No celular, toque e segure a imagem para salvar.</p>
  ${Object.entries(grupos)
    .map(
      ([g, fs]) => `<h3>${esc(g)}</h3><div class="galeria">${fs
        .map((f) => `<figure><img src="criativos/${f}" alt="${esc(f)}" loading="lazy"><figcaption>${esc(f)}</figcaption></figure>`)
        .join("")}</div>`,
    )
    .join("")}

  <h2 id="google">Google Ads</h2>
  <p><b>Configuração:</b> local <span class="tag">Uruguay</span> idioma <span class="tag">Español</span> rede <span class="tag">Pesquisa</span> (desligue «Rede de Display» nas campanhas de pesquisa). Lances: comece com «Maximizar cliques» com teto de CPC e, quando houver 15–30 conversões, troque para «Maximizar conversões».</p>

  <h3>Anúncio responsivo (vale para todos os grupos)</h3>
  <div class="duas">
    ${lista("Títulos (até 30)", d.google.titulos, 30)}
    ${lista("Descrições (até 90)", d.google.descricoes, 90)}
  </div>

  <h3>Campanhas e grupos de anúncios</h3>
  ${d.google.campanhas
    .map(
      (c) => `<div class="camp"><h4>${esc(c.nome)}</h4><p class="porque">${esc(c.porque)}</p>
      <div class="tabela"><table><thead><tr><th>Grupo</th><th>Palavras-chave</th><th>Página de destino</th></tr></thead><tbody>
      ${c.grupos
        .map(
          (g) => `<tr><td><b>${esc(g.nome)}</b>${g.titulosExtra ? `<br><span style="color:var(--suave);font-size:13px">Títulos extra: ${g.titulosExtra.map(esc).join(" · ")}</span>` : ""}</td>
          <td>${g.palavras.map((p) => `<code>${esc(p)}</code>`).join("<br>")}</td>
          <td><span class="url">${esc(g.destino)}</span> <button class="copiar" data-copiar="${esc(g.destino)}">Copiar</button></td></tr>`,
        )
        .join("")}
      </tbody></table></div></div>`,
    )
    .join("")}
  <p style="font-size:15px;color:var(--suave)">Aspas = correspondência de frase; colchetes = correspondência exata.</p>

  <div class="duas">
    ${lista("Palavras negativas (nível da conta)", d.google.negativas)}
    ${lista("Frases de destaque (até 25)", d.google.destaques, 25)}
  </div>
  <div class="bloco"><div class="bloco-topo"><h4>Sitelinks</h4></div>
    <div class="tabela"><table><thead><tr><th>Texto (25)</th><th>Descrição (35)</th><th>URL</th></tr></thead><tbody>
    ${d.google.sitelinks.map(([t, ds, u]) => `<tr><td>${esc(t)} <span class="cont">${n(t)}</span></td><td>${esc(ds)} <span class="cont">${n(ds)}</span></td><td><span class="url">${esc(u)}</span></td></tr>`).join("")}
    </tbody></table></div></div>
  ${lista("Snippet estruturado · Cabeçalho «Marcas»", d.google.snippetMarcas, 25)}

  <h3>Performance Max (opcional, depois da pesquisa rodar)</h3>
  <p>Use os criativos <code>google_paisagem_1200x628</code>, <code>google_quadrado_1200x1200</code> e os dois logos. Nome da empresa: <b>${esc(d.google.pmax.nomeEmpresa)}</b>.</p>
  <div class="duas">
    ${lista("Títulos (até 30)", d.google.pmax.titulos, 30)}
    ${lista("Descrições (até 90, uma até 60)", d.google.pmax.descricoes, 90)}
  </div>
  ${lista("Títulos longos (até 90)", d.google.pmax.titulosLongos, 90)}

  <h2 id="meta">Instagram e Facebook (Meta Ads)</h2>
  <p><b>Público:</b> ${esc(d.meta.publico.local)} · ${esc(d.meta.publico.idade)} · ${esc(d.meta.publico.posicionamentos)}.</p>
  <p><b>Interesses:</b> ${d.meta.publico.interesses.map((i) => `<span class="tag">${esc(i)}</span>`).join("")}</p>
  ${d.meta.campanhas
    .map(
      (c) => `<div class="camp"><h4>${esc(c.nome)}</h4><p style="margin:4px 0 0"><b>Objetivo:</b> ${esc(c.objetivo)}</p><p class="porque">${esc(c.porque)}</p>
      <p style="margin:6px 0 0"><b>Criativos:</b> ${c.criativos.map((x) => `<code>${esc(x)}</code>`).join(", ")}</p>
      ${c.destino ? `<p style="margin:6px 0 0"><b>Destino:</b> <span class="url">${esc(c.destino)}</span> <button class="copiar" data-copiar="${esc(c.destino)}">Copiar</button></p>` : ""}</div>`,
    )
    .join("")}
  ${lista("Texto principal (variações)", d.meta.textos)}
  <div class="duas">
    ${lista("Títulos (até 40)", d.meta.titulos, 40)}
    ${lista("Descrição", [d.meta.descricao])}
  </div>

  <h3>Roteiros de Reels (15 segundos)</h3>
  <p>Grave a tela do celular navegando em agropartsuy.com (gravador de tela do próprio celular) e intercale com imagens reais da peça e do depósito. Pessoas reais da equipe passam mais confiança que banco de imagem.</p>
  ${d.meta.reels
    .map((r) => `<div class="camp"><h4>${esc(r.nome)}</h4><div class="roteiro">${r.cenas.map(([t, c]) => `<b>${esc(t)}</b><span>${esc(c)}</span>`).join("")}</div></div>`)
    .join("")}

  <h2 id="organico">Posts orgânicos · 4 semanas</h2>
  <p>Três posts por semana mantêm a página ativa, o que ajuda os anúncios a converter: quem clica costuma olhar o perfil antes de chamar.</p>
  <div class="tabela"><table><thead><tr><th>Quando</th><th>Tema</th><th>Imagem</th><th>Legenda</th></tr></thead><tbody>
  ${d.organico.map(([s, dia, tema, img, leg]) => `<tr><td>${esc(s)}<br><span style="color:var(--suave)">${esc(dia)}</span></td><td>${esc(tema)}</td><td><code>${esc(img)}</code></td><td>${esc(leg)} <button class="copiar" data-copiar="${esc(leg + "\n\n" + d.hashtags)}">Copiar</button></td></tr>`).join("")}
  </tbody></table></div>
  ${lista("Hashtags", [d.hashtags])}

  <h2 id="medicao">Medição e verba inicial</h2>
  <h3>Links com UTM</h3>
  <p>Todos os destinos acima já têm <code>utm_source</code>, <code>utm_medium</code> e <code>utm_campaign</code>, então o Google Analytics separa as visitas por campanha. Testei: o site mantém esses parâmetros.</p>
  <h3>Conversões</h3>
  <ul class="check">
    <li><b>Google Ads:</b> em Metas → Conversões, importe do GA4 o evento <code>generate_lead</code> (clique no WhatsApp).</li>
    <li><b>Meta:</b> com o Pixel ligado, use o evento <code>Contact</code> como conversão. Na campanha de WhatsApp, a conversão é a conversa iniciada.</li>
    <li><b>No painel do site:</b> Admin → Interesse dos clientes mostra cliques no WhatsApp por peça e as buscas sem resultado (peças que faltam no catálogo).</li>
  </ul>
  <h3>Verba para os primeiros 14 dias (ponto de partida)</h3>
  <div class="tabela"><table><thead><tr><th>Canal</th><th>Por dia</th><th>O que olhar</th></tr></thead><tbody>
    <tr><td>Google · Search Marcas</td><td>US$ 6</td><td>Custo por clique no WhatsApp, termos de pesquisa (negative o que não for peça agrícola)</td></tr>
    <tr><td>Google · Search Tipo + Genéricas</td><td>US$ 4</td><td>Quais categorias geram conversa</td></tr>
    <tr><td>Meta · Clic a WhatsApp</td><td>US$ 6</td><td>Custo por conversa iniciada</td></tr>
    <tr><td>Meta · Remarketing</td><td>US$ 2</td><td>Frequência abaixo de 4 por semana</td></tr>
  </tbody></table></div>
  <p>Depois de 14 dias, mova verba para o que gerou conversas mais baratas e pause o resto. Valores são sugestão para começar; ajuste ao seu caixa.</p>

  <footer>Gerado a partir do repositório (marketing/kit_dados.cjs e gerar_kit.cjs). Para mudar um texto, edite kit_dados.cjs e rode <code>node marketing/gerar_kit.cjs</code>.</footer>
</div>

<script>
document.addEventListener("click", async (e) => {
  const b = e.target.closest("button.copiar");
  if (!b) return;
  const texto = b.getAttribute("data-copiar");
  const rotulo = b.textContent;
  try {
    await navigator.clipboard.writeText(texto);
    b.textContent = "Copiado"; b.classList.add("ok");
  } catch {
    // Sem permissão de área de transferência: seleciona o texto para copiar à mão
    const alvo = b.closest(".bloco, td, p");
    const r = document.createRange(); r.selectNodeContents(alvo);
    const s = getSelection(); s.removeAllRanges(); s.addRange(r);
    b.textContent = "Selecionado";
  }
  setTimeout(() => { b.textContent = rotulo; b.classList.remove("ok"); }, 1600);
});
</script>
`;

fs.writeFileSync(path.join(__dirname, "kit_anuncios.html"), html);
console.log("marketing/kit_anuncios.html gerado com", CRIATIVOS.length, "criativos");
