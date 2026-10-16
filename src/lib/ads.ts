import { createServerFn } from "@tanstack/react-start";

// Admin → Central de Anúncios. A lógica fica em ads.server.ts (+ ads-meta / ads-google).
const admin = async () => {
  const { assertAdmin } = await import("./auth.server");
  return assertAdmin();
};
const ads = () => import("./ads.server");
type Plataforma = "GOOGLE" | "META";
const plataforma = (p: unknown): Plataforma => (p === "GOOGLE" ? "GOOGLE" : "META");

export const estadoAdsFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  const { configMarketing, mascarar } = await import("./marketing-config.server");
  const c = await configMarketing();
  return {
    ...(await (await ads()).estadoAds()),
    // Campos editáveis aqui (segredos mascarados)
    campos: {
      mkt_gads_customer_id: c.mkt_gads_customer_id,
      mkt_gads_login_customer_id: c.mkt_gads_login_customer_id,
      mkt_gads_dev_token: mascarar(c.mkt_gads_dev_token),
      mkt_meta_ad_account: c.mkt_meta_ad_account,
      mkt_meta_ads_token: mascarar(c.mkt_meta_ads_token),
    },
  };
});

export const salvarContasAdsFn = createServerFn({ method: "POST" })
  .validator((d: Record<string, string>) => {
    const ok = [
      "mkt_gads_customer_id",
      "mkt_gads_login_customer_id",
      "mkt_gads_dev_token",
      "mkt_meta_ad_account",
      "mkt_meta_ads_token",
    ];
    return Object.fromEntries(
      Object.entries(d ?? {})
        .filter(([k]) => ok.includes(k))
        .map(([k, v]) => [k, String(v ?? "").slice(0, 1000)]),
    );
  })
  .handler(async ({ data }) => {
    await admin();
    const { salvarConfigMarketing } = await import("./marketing-config.server");
    await salvarConfigMarketing(data);
    return { ok: true };
  });

export const relatorioAdsFn = createServerFn({ method: "GET" })
  .validator((d: { dias: number }) => ({
    dias: [7, 14, 30, 90].includes(Number(d?.dias)) ? Number(d.dias) : 30,
  }))
  .handler(async ({ data }) => {
    await admin();
    return (await ads()).relatorioAds(data.dias);
  });

export const sincronizarAdsFn = createServerFn({ method: "POST" }).handler(async () => {
  await admin();
  return (await ads()).sincronizarAds();
});

export const statusCampanhaFn = createServerFn({ method: "POST" })
  .validator((d: { plataforma: Plataforma; id: string; ativa: boolean }) => ({
    plataforma: plataforma(d?.plataforma),
    id: String(d?.id || "")
      .replace(/[^\w-]/g, "")
      .slice(0, 40),
    ativa: !!d?.ativa,
  }))
  .handler(async ({ data }) => {
    const s = await admin();
    await (await ads()).alterarStatus(data.plataforma, data.id, data.ativa, s.id);
    return { ok: true };
  });

export const orcamentoCampanhaFn = createServerFn({ method: "POST" })
  .validator(
    (d: { plataforma: Plataforma; id: string; valor: number; confirmarAlto?: boolean }) => ({
      plataforma: plataforma(d?.plataforma),
      id: String(d?.id || "")
        .replace(/[^\w-]/g, "")
        .slice(0, 40),
      valor: Math.round(Number(d?.valor) * 100) / 100,
      confirmarAlto: !!d?.confirmarAlto,
    }),
  )
  .handler(async ({ data }) => {
    const s = await admin();
    await (
      await ads()
    ).alterarOrcamento(data.plataforma, data.id, data.valor, s.id, data.confirmarAlto);
    return { ok: true };
  });

export const desconectarGoogleAdsFn = createServerFn({ method: "POST" }).handler(async () => {
  await admin();
  const { desconectarAds } = await import("./ads-google.server");
  await desconectarAds();
  return { ok: true };
});
