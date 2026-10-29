import { ehHeic, precisaConverter } from "./formatos-imagem";

// Abre a imagem no navegador. HEIC/HEIF (iPhone): o Chrome e o Edge não abrem sozinhos, então
// usa o heic2any (carregado só nesse caso).
async function abrir(arq: File): Promise<ImageBitmap> {
  try {
    return await createImageBitmap(arq);
  } catch (e) {
    if (!ehHeic(arq)) throw e;
    const { default: heic2any } = await import("heic2any");
    const r = await heic2any({ blob: arq, toType: "image/jpeg", quality: 0.92 });
    return createImageBitmap(Array.isArray(r) ? r[0] : r);
  }
}

async function paraWebp(bmp: ImageBitmap, max: number, qualidade: number, fundo: boolean) {
  const escala = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * escala);
  const h = Math.round(bmp.height * escala);
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const g = c.getContext("2d")!;
  if (fundo) {
    g.fillStyle = "#fff"; // PNG transparente vira fundo branco (como as fotos do catálogo)
    g.fillRect(0, 0, w, h);
  }
  g.drawImage(bmp, 0, 0, w, h);
  return new Promise<Blob | null>((ok) => c.toBlob(ok, "image/webp", qualidade));
}
const comExt = (arq: File, ext: string) => arq.name.replace(/\.[^.]+$/, "") + `.${ext}`;

// Banners e imagens grandes: só converte o que o site não consegue mostrar (HEIC, BMP, TIFF),
// no tamanho original (até 3000 px). JPG/JFIF/PNG/WEBP/AVIF/GIF vão como estão (sem perder
// qualidade). Erro claro quando o navegador não consegue abrir o arquivo.
export async function prepararImagem(arq: File, max = 3000, qualidade = 0.92): Promise<File> {
  if (!precisaConverter(arq)) return arq;
  let bmp: ImageBitmap;
  try {
    bmp = await abrir(arq);
  } catch {
    throw new Error(
      `Não foi possível abrir «${arq.name}». Abra a imagem no computador e salve como JPG ou PNG.`,
    );
  }
  const blob = await paraWebp(bmp, max, qualidade, false);
  if (!blob) throw new Error(`Não foi possível converter «${arq.name}».`);
  return new File([blob], comExt(arq, "webp"), { type: "image/webp" });
}

// Fotos das peças: lado maior até 1600 px, WEBP. Foto de celular (4–8 MB) vira ~150–300 KB:
// envio rápido e site leve. HEIC/BMP/TIFF são sempre convertidos (mesmo que fiquem maiores).
export async function reduzirImagem(arq: File, max = 1600, qualidade = 0.85): Promise<File> {
  const converter = precisaConverter(arq);
  if (!converter && (!arq.type.startsWith("image/") || /gif|svg/.test(arq.type))) return arq;
  try {
    const bmp = await abrir(arq);
    const blob = await paraWebp(bmp, max, qualidade, true);
    if (!blob || (!converter && blob.size >= arq.size)) return arq;
    return new File([blob], comExt(arq, "webp"), { type: "image/webp" });
  } catch {
    if (converter)
      throw new Error(
        `Não foi possível abrir «${arq.name}». Abra a imagem no computador e salve como JPG ou PNG.`,
      );
    return arq;
  }
}

// Envia as fotos (já reduzidas) e devolve os caminhos em /uploads
export async function enviarFotos(arquivos: File[]): Promise<string[]> {
  const fd = new FormData();
  for (const a of arquivos) fd.append("files", await reduzirImagem(a));
  const r = await fetch("/api/admin/products/upload", { method: "POST", body: fd });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Falha no envio das fotos");
  return j.paths as string[];
}
