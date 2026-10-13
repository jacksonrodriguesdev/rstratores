// Descobre quais fotos do agrotrator são só a logo da loja (produto sem foto real).
// Pede o TAMANHO de cada foto 600×600 (HEAD, sem baixar a imagem); a logo tem sempre o mesmo
// tamanho. Depois baixa uma amostra de cada tamanho muito repetido e confere se é a mesma imagem.
//
// Uso: node scripts/extratores/agrotrator_fotos_logo.cjs
// Saída: dados/precos_agrotrator/fotos_logo.json  ({ logos: [url...], tamanhosLogo: [...] })

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const DADOS = path.join(__dirname, "../../dados/precos_agrotrator");
const SIMULTANEAS = 12;
const foto600 = (u) => u.replace(/\/ids\/(\d+)(-\d+-\d+)?\//, "/ids/$1-600-600/").replace(/\?.*$/, "");

async function tamanho(url) {
  for (let i = 0; i < 4; i++) {
    try {
      const r = await fetch(url, { method: "HEAD", signal: AbortSignal.timeout(20_000) });
      if (r.ok) return Number(r.headers.get("content-length") || 0);
      if (r.status === 404) return -1;
    } catch {}
    await new Promise((r) => setTimeout(r, 1500 * (i + 1)));
  }
  return 0;
}

(async () => {
  const cat = JSON.parse(fs.readFileSync(path.join(DADOS, "catalogo.json"), "utf8"));
  const urls = [...new Set(cat.flatMap((p) => p.fotos.map(foto600)))];
  const arqTam = path.join(DADOS, "tamanhos_fotos.json");
  const tam = fs.existsSync(arqTam) ? JSON.parse(fs.readFileSync(arqTam, "utf8")) : {};
  const faltam = urls.filter((u) => !(u in tam) || tam[u] === 0);
  console.log(`${urls.length} fotos · já medidas ${urls.length - faltam.length} · faltam ${faltam.length}`);
  let feitos = 0;
  for (let i = 0; i < faltam.length; i += SIMULTANEAS) {
    await Promise.all(faltam.slice(i, i + SIMULTANEAS).map(async (u) => (tam[u] = await tamanho(u))));
    feitos += SIMULTANEAS;
    if (feitos % 1200 === 0) {
      fs.writeFileSync(arqTam, JSON.stringify(tam));
      console.log(`  ${Math.min(feitos, faltam.length)}/${faltam.length}`);
    }
  }
  fs.writeFileSync(arqTam, JSON.stringify(tam));

  // Tamanhos repetidos muitas vezes: candidatos a logo. Confere o conteúdo de 3 amostras de cada.
  const porTam = {};
  for (const [u, t] of Object.entries(tam)) if (t > 0) (porTam[t] ||= []).push(u);
  const repetidos = Object.entries(porTam).filter(([, l]) => l.length >= 20).sort((a, b) => b[1].length - a[1].length);
  const tamanhosLogo = [];
  for (const [t, lista] of repetidos) {
    const hashes = await Promise.all(
      lista.slice(0, 3).map(async (u) => crypto.createHash("md5").update(Buffer.from(await (await fetch(u)).arrayBuffer())).digest("hex")),
    );
    const iguais = new Set(hashes).size === 1;
    console.log(`tamanho ${t} B: ${lista.length} fotos · amostras ${iguais ? "IGUAIS (logo)" : "diferentes"}`);
    if (iguais) tamanhosLogo.push(Number(t));
  }
  const logos = Object.entries(tam).filter(([, t]) => tamanhosLogo.includes(t)).map(([u]) => u);
  const quebradas = Object.entries(tam).filter(([, t]) => t === -1).map(([u]) => u);
  fs.writeFileSync(path.join(DADOS, "fotos_logo.json"), JSON.stringify({ tamanhosLogo, logos, quebradas }));
  const semFotoReal = cat.filter((p) => p.fotos.length && p.fotos.map(foto600).every((u) => tamanhosLogo.includes(tam[u]) || tam[u] === -1)).length;
  console.log(`\nLogos: ${logos.length} fotos · quebradas: ${quebradas.length} · produtos sem nenhuma foto real: ${semFotoReal} de ${cat.length}`);
})();
