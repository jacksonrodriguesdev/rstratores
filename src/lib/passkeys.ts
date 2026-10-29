// Mi cuenta → Seguridad: aparelhos com Face ID / digital ativados (listar e remover)
import { createServerFn } from "@tanstack/react-start";

const sessao = async () => {
  const { getSession } = await import("./auth.server");
  const s = await getSession();
  if (!s) throw new Error("Ingresá a tu cuenta.");
  return s;
};

export const minhasPasskeysFn = createServerFn({ method: "GET" }).handler(async () => {
  const s = await sessao();
  const { listarPasskeys } = await import("./passkey.server");
  return listarPasskeys(Number(s.id));
});

export const removerPasskeyFn = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => ({ id: Number(d?.id) || 0 }))
  .handler(async ({ data }) => {
    const s = await sessao();
    const { removerPasskey } = await import("./passkey.server");
    await removerPasskey(Number(s.id), data.id);
    return { ok: true };
  });
