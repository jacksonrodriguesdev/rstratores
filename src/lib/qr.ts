import { createServerFn } from "@tanstack/react-start";

// QR code gerado no servidor (a biblioteca não vai para o navegador). Só endereços do próprio site.
export const qrSiteFn = createServerFn({ method: "GET" })
  .validator((d: { url: string }) => {
    const url = String(d?.url ?? "").slice(0, 300);
    return { url };
  })
  .handler(async ({ data }) => {
    const { SITE_URL } = await import("./site");
    if (!data.url.startsWith(SITE_URL + "/")) throw new Error("endereço fora do site");
    const QRCode = (await import("qrcode")).default;
    return QRCode.toDataURL(data.url, { margin: 1, width: 360, color: { dark: "#14532d" } });
  });
