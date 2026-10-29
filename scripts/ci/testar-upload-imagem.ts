// Teste do envio de imagens do admin (banners, fotos das peças, categorias): o tipo vem do
// conteúdo do arquivo. JPEG com nome .jfif vira .jpg; PNG com nome errado vira .png; AVIF, WEBP e
// GIF passam; HEIC sem conversão, texto com nome de imagem e arquivo grande demais são recusados.
// Roda com: npx tsx scripts/ci/testar-upload-imagem.ts (grava numa pasta temporária)
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

(async () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), "upload-ci-"));
  process.env.UPLOADS_DIR = pasta;
  const { gravarImagem } = await import("../../src/lib/upload-imagem.server");
  const { tipoPorConteudo, precisaConverter, ACEITA_IMAGEM } =
    await import("../../src/lib/formatos-imagem");
  const bytes = (...partes: Array<number[] | string>) =>
    new Uint8Array(
      partes.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)),
    );
  const pad = new Array(40).fill(0);
  const JPEG = bytes([0xff, 0xd8, 0xff, 0xe0, 0, 16], "JFIF", pad);
  const PNG = bytes([0x89], "PNG", [0x0d, 0x0a, 0x1a, 0x0a], pad);
  const GIF = bytes("GIF89a", pad);
  const WEBP = bytes("RIFF", [0, 0, 0, 0], "WEBPVP8 ", pad);
  const AVIF = bytes([0, 0, 0, 0x1c], "ftypavif", [0, 0, 0, 0], "avifmif1miaf", pad);
  const HEIC = bytes([0, 0, 0, 0x18], "ftypheic", [0, 0, 0, 0], "mif1heic", pad);
  const arq = (b: Uint8Array, nome: string, tipo = "") => new File([b], nome, { type: tipo });

  try {
    assert.equal(tipoPorConteudo(JPEG), "jpg");
    assert.equal(tipoPorConteudo(AVIF), "avif");
    assert.equal(tipoPorConteudo(HEIC), null, "HEIC precisa ser convertido antes");
    assert.ok(precisaConverter({ name: "foto.HEIC", type: "" }), "HEIC sem tipo (Windows)");
    assert.ok(precisaConverter({ name: "x.bmp", type: "image/bmp" }));
    assert.ok(precisaConverter({ name: "x.tiff", type: "" }));
    assert.ok(!precisaConverter({ name: "x.jfif", type: "image/jpeg" }), "JFIF não converte");
    assert.ok(ACEITA_IMAGEM.includes(".jfif") && ACEITA_IMAGEM.includes(".heic"));

    const casos: Array<[Uint8Array, string, string]> = [
      [JPEG, "banner.jfif", ".jpg"],
      [JPEG, "foto.JPE", ".jpg"],
      [PNG, "logo.jpg", ".png"],
      [AVIF, "hero.avif", ".avif"],
      [WEBP, "x.webp", ".webp"],
      [GIF, "anim.gif", ".gif"],
    ];
    for (const [b, nome, ext] of casos) {
      const r = await gravarImagem(arq(b, nome), "site/hero", 8);
      assert.ok("path" in r, `${nome} aceito`);
      if (!("path" in r)) continue;
      assert.ok(r.path.startsWith("site/hero/") && r.path.endsWith(ext), `${nome} → ${r.path}`);
      assert.ok(fs.existsSync(path.join(pasta, r.path)), "arquivo gravado");
    }
    for (const [b, nome] of [
      [HEIC, "iphone.heic"],
      [bytes("<html><script>alert(1)</script>", pad), "falso.jpg"],
      [bytes("BM", pad), "velho.bmp"],
    ] as const) {
      const r = await gravarImagem(arq(b, nome), "produtos", 15);
      assert.ok("erro" in r, `${nome} recusado`);
    }
    const grande = new Uint8Array(6 * 1024 * 1024);
    grande.set(JPEG);
    const r = await gravarImagem(arq(grande, "grande.jpg"), "categorias", 5);
    assert.ok("erro" in r && /maior que 5 MB/.test(r.erro), "limite de tamanho");
    console.log("Envio de imagens (JFIF, AVIF, HEIC…): ok");
  } finally {
    fs.rmSync(pasta, { recursive: true, force: true });
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
