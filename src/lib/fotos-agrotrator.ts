import { createServerFn } from "@tanstack/react-start";

// Admin → Produtos: copiar as fotos do agrotrator para a pasta de uploads do servidor
const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  return assertAdmin();
};

export const situacaoFotosAgrotratorFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const { situacaoFotos } = await import("./fotos-agrotrator.server");
  return situacaoFotos();
});

export const copiarFotosAgrotratorFn = createServerFn({ method: "POST" }).handler(async () => {
  await admin();
  const { iniciarCopiaFotos } = await import("./fotos-agrotrator.server");
  iniciarCopiaFotos();
  return { ok: true };
});
