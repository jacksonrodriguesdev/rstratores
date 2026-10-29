// Reduz uma foto no navegador antes de enviar (celular no campo: internet fraca e fotos de 5 MB+).
// Lado maior até `max` px, JPEG. Se o navegador não conseguir ler a imagem, devolve o arquivo original.
export async function reduzirImagem(arq: File, max = 1600, qualidade = 0.82): Promise<File> {
  if (!arq.type.startsWith("image/")) return arq;
  try {
    const url = URL.createObjectURL(arq);
    const im = await new Promise<HTMLImageElement>((ok, erro) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = erro;
      i.src = url;
    });
    URL.revokeObjectURL(url);
    const k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(im.naturalWidth * k);
    c.height = Math.round(im.naturalHeight * k);
    c.getContext("2d")!.drawImage(im, 0, 0, c.width, c.height);
    const b = await new Promise<Blob | null>((ok) => c.toBlob(ok, "image/jpeg", qualidade));
    if (!b || b.size >= arq.size) return arq;
    return new File([b], arq.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return arq;
  }
}
