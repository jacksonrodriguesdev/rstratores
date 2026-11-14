import { createServerFn } from "@tanstack/react-start";
import type { ConfigPostAuto } from "./posts-auto.server";

const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  return assertAdmin();
};

export const getPostAutoFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const { configPostAuto } = await import("./posts-auto.server");
  return configPostAuto();
});

export const salvarPostAutoFn = createServerFn({ method: "POST" })
  .validator((d: ConfigPostAuto) => d)
  .handler(async ({ data }) => {
    await admin();
    const { salvarConfigPostAuto } = await import("./posts-auto.server");
    await salvarConfigPostAuto(data);
    return { ok: true };
  });

// Gera um post agora (preview), mesmo com a automação desligada.
export const gerarPostAgoraFn = createServerFn({ method: "POST" }).handler(async () => {
  await admin();
  const { gerarPostDiario } = await import("./posts-auto.server");
  const id = await gerarPostDiario(true);
  if (!id) throw new Error("Não foi possível gerar (Instagram conectado? há produtos com foto?).");
  return { ok: true, id };
});
