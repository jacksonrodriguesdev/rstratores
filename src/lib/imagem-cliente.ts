// Reduz a foto no navegador antes de enviar: lado maior até 1600 px, WEBP.
// Foto de celular (4–8 MB) vira ~150–300 KB: envio rápido e site leve.
export async function reduzirImagem(arq: File, max = 1600, qualidade = 0.85): Promise<File> {
  if (!arq.type.startsWith("image/") || arq.type === "image/gif" || arq.type === "image/svg+xml") return arq;
  try {
    const bmp = await createImageBitmap(arq);
    const escala = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.round(bmp.width * escala);
    const h = Math.round(bmp.height * escala);
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d")!;
    g.fillStyle = "#fff"; // PNG transparente vira fundo branco (como as fotos do catálogo)
    g.fillRect(0, 0, w, h);
    g.drawImage(bmp, 0, 0, w, h);
    const blob: Blob | null = await new Promise((ok) => c.toBlob(ok, "image/webp", qualidade));
    if (!blob || blob.size >= arq.size) return arq;
    return new File([blob], arq.name.replace(/\.[^.]+$/, "") + ".webp", { type: "image/webp" });
  } catch {
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
