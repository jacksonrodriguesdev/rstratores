// Catálogos e manuais em PDF para mecânicos. Os arquivos ficam em <uploads>/catalogos
// (fora do git e do pacote do site; na Hostinger, dentro de UPLOADS_DIR) e são entregues
// pela rota /catalogos/archivo/$id, que confere se o catálogo está publicado e o login.
import fs from "fs";
import path from "path";
import { prisma } from "./prisma";
import { pastaUploads } from "./uploads.server";

export const pastaCatalogos = () => path.join(pastaUploads(), "catalogos");

// Caminho absoluto de um catálogo; recusa caminhos que saiam da pasta
export function caminhoCatalogo(relativo: string): string {
  const raiz = path.resolve(pastaCatalogos());
  const arq = path.resolve(raiz, relativo);
  if (!arq.startsWith(raiz + path.sep)) throw new Error("Caminho inválido");
  return arq;
}

const MARCAS: Array<[RegExp, string]> = [
  [/massey|mf\b|agco/i, "Massey Ferguson"],
  [/valtra|valmet/i, "Valtra"],
  [/john.?deere|\bjd\b/i, "John Deere"],
  [/new.?holland|\bnh\b/i, "New Holland"],
  [/case|maxxum|puma|magnum/i, "Case IH"],
  [/ford/i, "Ford"],
  [/agrale/i, "Agrale"],
];
const tipoPorNome = (n: string) =>
  /servi[cç]o|oficina|taller|reparaci|workshop/i.test(n) ? "Manual de taller" : /operador|operaci|instru/i.test(n) ? "Manual del operador" : /pe[cç]as|piezas|parts|repuestos/i.test(n) ? "Catálogo de piezas" : "Catálogo de piezas";
const tituloPorNome = (n: string) =>
  path
    .basename(n, path.extname(n))
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/^./, (c) => c.toUpperCase());

function listarPdfs(dir: string, base = dir): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listarPdfs(p, base));
    else if (/\.pdf$/i.test(e.name)) out.push(path.relative(base, p).split(path.sep).join("/"));
  }
  return out;
}

// Registra os PDFs que estão na pasta e ainda não têm cadastro (entram despublicados)
export async function detectarCatalogos() {
  const pasta = pastaCatalogos();
  fs.mkdirSync(pasta, { recursive: true });
  const existentes = new Set((await prisma.catalogos.findMany({ select: { arquivo: true } })).map((c) => c.arquivo));
  const novos = [];
  for (const rel of listarPdfs(pasta)) {
    if (existentes.has(rel)) continue;
    const nome = rel.toLowerCase();
    const c = await prisma.catalogos.create({
      data: {
        titulo: tituloPorNome(rel).slice(0, 200),
        marca: MARCAS.find(([re]) => re.test(nome))?.[1] ?? null,
        tipo: tipoPorNome(nome),
        idioma: /portugu|pt\b|_por/i.test(nome) ? "Portugués" : /ingl|english|_ing/i.test(nome) ? "Inglés" : "Español",
        arquivo: rel,
        tamanho: BigInt(fs.statSync(path.join(pasta, rel)).size),
        ativo: false,
      },
    });
    novos.push(c.id);
  }
  return { novos: novos.length, pasta };
}

export const serializar = (c: any) => ({
  id: c.id as number,
  titulo: c.titulo as string,
  marca: c.marca as string | null,
  tipo: c.tipo as string,
  descricao: c.descricao as string | null,
  idioma: c.idioma as string | null,
  tamanho: Number(c.tamanho),
  ativo: c.ativo as boolean,
  exige_login: c.exige_login as boolean,
  downloads: c.downloads as number,
  ordem: c.ordem as number,
  arquivo: c.arquivo as string,
});
