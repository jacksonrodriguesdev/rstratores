// Pacote de agendamento da Pré-Black (sem preço): ZIP com as artes + pacote.json para a
// ferramenta «Importar campanha pronta» do Estúdio (Admin → Instagram e Facebook).
// Ordem: espanhol e português alternados; o mesmo produto não sai nos dois idiomas no mesmo dia
// (português começa 50 peças à frente; os stories começam 25 e 75 peças à frente).
// Uso: npx tsx marketing/pre-black-amarelo/pacote.ts  ->  saida/pacote-pre-black.zip
import fs from "fs";
import path from "path";
import JSZip from "jszip";
import { createCanvas, loadImage } from "@napi-rs/canvas";
import { hashtags, legenda, TONS, type Idioma, type Tom } from "../../src/lib/estudio-textos";

const PASTA = path.join(process.cwd(), "marketing/pre-black-amarelo");
const SAIDA = path.join(PASTA, "saida");
const D = JSON.parse(fs.readFileSync(path.join(PASTA, "pecas100.json"), "utf8"));
const PECAS: any[] = D.pecas;
const N = PECAS.length;

const arquivos = (idioma: Idioma, pasta: string) =>
  fs
    .readdirSync(path.join(SAIDA, idioma, pasta))
    .filter((f) => /^\d{3}_.*\.png$/.test(f))
    .sort();
// Legenda da capa: o primeiro bloco de código depois de «## 1. Capa» nas descrições
function legendaCapa(idioma: Idioma) {
  const md = fs.readFileSync(path.join(PASTA, `descricoes_${idioma}.md`), "utf8");
  const m = md.split(/^## 1\./m)[1]?.match(/```\n([\s\S]*?)```/);
  if (!m) throw new Error(`capa sem legenda em descricoes_${idioma}.md`);
  return m[1].trim();
}
const RODAPE = {
  es: `\n\n🖤 Pre Black Friday: -${D.desconto}% en todo el sitio. ¡La Black Friday arranca el 27/11!`,
  pt: `\n\n🖤 Pré-Black Friday: -${D.desconto}% em todo o site. A Black Friday começa em 27/11!`,
};
// Tons sem preço (o «direto» também serve: sem preço ele mostra só código e link)
const TONS_USO = TONS.map((t) => t[0]) as Tom[];

type Item = { arquivo: string; tipo: "FEED" | "STORY"; fila: "feed" | "story"; idioma: Idioma; legenda: string; comentario: string; titulo: string };
const itens: Item[] = [];
const zip = new JSZip();
const pendentes: Array<Promise<void>> = [];
// PNG → JPG (90%): o Instagram só aceita JPEG e o pacote fica ~10× menor
async function jpg(origem: string) {
  const im = await loadImage(fs.readFileSync(origem));
  const c = createCanvas(im.width, im.height);
  const g = c.getContext("2d");
  g.fillStyle = "#fff";
  g.fillRect(0, 0, im.width, im.height);
  g.drawImage(im, 0, 0);
  return c.encode("jpeg", 90);
}
function add(i: Item, origem: string) {
  if (!fs.existsSync(origem)) throw new Error(`falta a arte ${origem}`);
  i.arquivo = i.arquivo.replace(/.png$/, ".jpg");
  pendentes.push(jpg(origem).then((b) => void zip.file(i.arquivo, b)));
  itens.push(i);
}
function peca(p: any) {
  return { nome: p.es, nomePt: p.pt, codigo: p.cod, sku: p.sku, marca: p.marca, categoria: p.cat, preco: null };
}

for (const fila of ["feed", "story"] as const) {
  const tipo = fila === "feed" ? "FEED" : "STORY";
  const capa = fila === "feed" ? "capa_feed_1080x1350.png" : "capa_story_1080x1920.png";
  for (const idioma of ["es", "pt"] as const)
    add(
      {
        arquivo: `${fila}/${idioma}/000_capa.png`,
        tipo,
        fila,
        idioma,
        legenda: fila === "feed" ? legendaCapa(idioma) : "",
        comentario: fila === "feed" ? hashtags({}, idioma).join(" ") : "",
        titulo: idioma === "es" ? "Capa Pre Black Friday" : "Capa Pré-Black Friday",
      },
      path.join(SAIDA, idioma, capa),
    );
  const pasta = fila === "feed" ? "cards" : "stories";
  const lista = { es: arquivos("es", pasta), pt: arquivos("pt", pasta) };
  if (lista.es.length !== N || lista.pt.length !== N)
    throw new Error(`${pasta}: esperava ${N} artes por idioma (es ${lista.es.length}, pt ${lista.pt.length})`);
  const desloc = fila === "feed" ? { es: 0, pt: 50 } : { es: 25, pt: 75 };
  for (let k = 0; k < N; k++)
    for (const idioma of ["es", "pt"] as const) {
      const i = (k + desloc[idioma]) % N;
      const p = PECAS[i];
      const tom = TONS_USO[(i + (idioma === "pt" ? 3 : 0)) % TONS_USO.length];
      add(
        {
          arquivo: `${fila}/${idioma}/${lista[idioma][i]}`,
          tipo,
          fila,
          idioma,
          legenda: fila === "feed" ? legenda(peca(p), idioma, tom) + RODAPE[idioma] : "",
          comentario: fila === "feed" ? hashtags(peca(p), idioma).join(" ") : "",
          titulo: `${idioma === "es" ? p.es : p.pt} · ${p.cod}`,
        },
        path.join(SAIDA, idioma, pasta, lista[idioma][i]),
      );
    }
}

// Conferências: nada de preço nas legendas, nada de «todo o Brasil»
for (const i of itens) {
  if (/R\$|\$U\s?\d/.test(i.legenda)) throw new Error(`legenda com preço: ${i.arquivo}`);
  if (/todo o brasil|o melhor preço/i.test(i.legenda)) throw new Error(`frase proibida: ${i.arquivo}`);
}
await Promise.all(pendentes);
const nome = `pre-black-sem-preco-${new Date().toISOString().slice(0, 10)}`;
zip.file("pacote.json", JSON.stringify({ nome, itens }, null, 1));
const destino = path.join(SAIDA, `pacote-pre-black.zip`);
fs.writeFileSync(destino, await zip.generateAsync({ type: "nodebuffer", compression: "STORE" }));
const f = itens.filter((i) => i.fila === "feed").length;
const s = itens.filter((i) => i.fila === "story").length;
console.log(`✔ ${destino}\n  ${f} posts + ${s} stories (${(fs.statSync(destino).size / 1e6).toFixed(0)} MB)`);
