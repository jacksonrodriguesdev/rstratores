// Grava uma imagem enviada pelo admin em uploads/<pasta>/. O tipo vem do conteúdo do arquivo
// (formatos-imagem.ts → tipoPorConteudo): .jfif vira .jpg, extensão errada é corrigida e
// arquivo que não é imagem (ou HEIC/BMP/TIFF não convertido) é recusado.
import * as fs from "fs/promises";
import * as path from "path";
import { ERRO_FORMATO, tipoPorConteudo } from "./formatos-imagem";

export async function gravarImagem(
  file: File,
  pasta: string,
  maxMb: number,
): Promise<{ path: string } | { erro: string }> {
  if (file.size > maxMb * 1024 * 1024)
    return { erro: `Imagem maior que ${maxMb} MB: ${file.name}` };
  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = tipoPorConteudo(buffer);
  if (!ext) return { erro: `${file.name}: ${ERRO_FORMATO}` };
  const relativo = `${pasta}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { caminhoUpload } = await import("./uploads.server");
  const dest = caminhoUpload(relativo);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  await fs.writeFile(dest, buffer);
  return { path: relativo };
}
