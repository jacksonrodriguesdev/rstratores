import { createServerFn } from "@tanstack/react-start";

// Home personalizada: seções «Para vos» a partir do histórico anônimo do visitante
export const paraVoceFn = createServerFn({ method: "GET" })
  .validator((d: { vistos?: string[]; visitorId?: string | null }) => ({
    vistos: (Array.isArray(d?.vistos) ? d.vistos : [])
      .map((s) => String(s).slice(0, 64))
      .slice(0, 24),
    visitorId: d?.visitorId
      ? String(d.visitorId)
          .replace(/[^\w-]/g, "")
          .slice(0, 64)
      : null,
  }))
  .handler(async ({ data }) => {
    const { paraVoce } = await import("./para-voce.server");
    return paraVoce(data);
  });
