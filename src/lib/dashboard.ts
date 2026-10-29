// Dashboard do admin: período com datas livres (até 1 ano), horário do Uruguai
import { createServerFn } from "@tanstack/react-start";

const DATA = /^\d{4}-\d{2}-\d{2}$/;

export const dashboardFn = createServerFn({ method: "GET" })
  .validator((d: { de?: string; ate?: string }) => {
    const hoje = new Date(Date.now() - 3 * 3600_000).toISOString().slice(0, 10);
    let ate = DATA.test(String(d?.ate)) ? String(d.ate) : hoje;
    if (ate > hoje) ate = hoje;
    let de = DATA.test(String(d?.de))
      ? String(d.de)
      : new Date(Date.parse(`${ate}T12:00:00Z`) - 29 * 86400_000).toISOString().slice(0, 10);
    if (de > ate) de = ate;
    // No máximo 366 dias
    const min = new Date(Date.parse(`${ate}T12:00:00Z`) - 365 * 86400_000)
      .toISOString()
      .slice(0, 10);
    if (de < min) de = min;
    return { de, ate };
  })
  .handler(async ({ data }) => {
    const { assertAdmin } = await import("./auth.server");
    await assertAdmin();
    const { painelDashboard } = await import("./dashboard.server");
    return painelDashboard(data.de, data.ate);
  });
