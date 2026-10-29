// Formatos de imagem aceitos no admin (banners, fotos das peças, categorias).
// O site só serve formatos que todo navegador mostra: JPG, PNG, WEBP, AVIF e GIF. Os outros:
//  - JFIF, JPE, PJPEG, PJP: são JPEG com outro nome → gravados como .jpg (sem conversão);
//  - HEIC/HEIF (iPhone), BMP e TIFF: convertidos para WEBP no navegador antes do envio
//    (src/lib/imagem-cliente.ts → prepararImagem).
// O servidor confere o tipo pelo conteúdo do arquivo (assinatura), não pelo nome.

// Para o <input type="file" accept>: mostra todos esses arquivos na janela de escolha
export const ACEITA_IMAGEM =
  "image/*,.jpg,.jpeg,.jfif,.jpe,.pjpeg,.pjp,.png,.webp,.avif,.gif,.bmp,.heic,.heif,.tif,.tiff";

export const FORMATOS_TEXTO = "JPG, JFIF, PNG, WEBP, AVIF, GIF, HEIC (iPhone), BMP ou TIFF";

const extDe = (nome: string) => nome.split(".").pop()?.toLowerCase() ?? "";

// Precisa converter no navegador antes de enviar (o site não consegue mostrar como está)
export function precisaConverter(arq: { name: string; type: string }) {
  const ext = extDe(arq.name);
  return (
    ["heic", "heif", "bmp", "tif", "tiff"].includes(ext) ||
    /^image\/(heic|heif|bmp|x-ms-bmp|tiff)$/.test(arq.type)
  );
}
export const ehHeic = (arq: { name: string; type: string }) =>
  /\.(heic|heif)$/i.test(arq.name) || /^image\/hei[cf]/.test(arq.type);

// Tipo real pelos primeiros bytes. Devolve a extensão com que o arquivo deve ser gravado.
export type ExtWeb = "jpg" | "png" | "gif" | "webp" | "avif";
export function tipoPorConteudo(b: Uint8Array): ExtWeb | null {
  const s = (i: number, n: number) => String.fromCharCode(...b.subarray(i, i + n));
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "jpg"; // JPEG/JFIF/EXIF
  if (b[0] === 0x89 && s(1, 3) === "PNG") return "png";
  if (s(0, 4) === "GIF8") return "gif";
  if (s(0, 4) === "RIFF" && s(8, 4) === "WEBP") return "webp";
  // AVIF: caixa ftyp com marca avif/avis (HEIC tem heic/mif1 e não é aceito sem conversão)
  if (s(4, 4) === "ftyp") {
    const marcas = s(8, Math.min(32, b.length - 8));
    if (/avi[fs]/.test(marcas)) return "avif";
  }
  return null;
}

export const ERRO_FORMATO = `Formato não suportado. Use ${FORMATOS_TEXTO}.`;
