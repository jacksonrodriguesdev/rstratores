// Endereço público do site: links absolutos (WhatsApp, Google, redes sociais, sitemap).
// Fixo no build (e não window.location) para o HTML do servidor e o do navegador serem iguais.
// Para trocar de domínio, defina VITE_SITE_URL na Hostinger (ex.: https://www.agroparts.com.uy)
// e faça o deploy de novo.
const configurado = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();
export const SITE_URL = (configurado || "https://rsautopecas.com").replace(/\/+$/, "");
