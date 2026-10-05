import path from "path";

// Pasta dos arquivos enviados (banners, categorias, cotações, fotos de produtos).
// Fica fora de public/: o build copia public/ inteiro para o pacote, e só o catálogo
// antigo tem 133 mil imagens. Os arquivos são servidos pela rota src/routes/uploads.$.ts.
// Em produção, aponte UPLOADS_DIR para uma pasta persistente fora do diretório do deploy.
export function pastaUploads(): string {
  return path.resolve(process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads"));
}

// Caminho absoluto de um arquivo enviado. Recusa caminhos que saiam da pasta (ex.: "../.env").
export function caminhoUpload(relativo: string): string {
  const raiz = pastaUploads();
  const arquivo = path.resolve(raiz, relativo);
  if (!arquivo.startsWith(raiz + path.sep)) throw new Error("Caminho de upload inválido");
  return arquivo;
}
