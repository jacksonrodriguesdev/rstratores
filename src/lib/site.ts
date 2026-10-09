// Endereço público do site: links absolutos (WhatsApp, Google, redes sociais, sitemap).
// Fixo no build (e não window.location) para o HTML do servidor e o do navegador serem iguais.
// Para trocar de domínio, defina VITE_SITE_URL na Hostinger e faça o deploy de novo.
// É o endereço do canonical, sitemap e robots: precisa ser o domínio que está no ar.
const configurado = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();
export const SITE_URL = (configurado || "https://agropartsuy.com").replace(/\/+$/, "");

// Endereços que levam ao mesmo site e devem redirecionar (301) para o SITE_URL,
// para o Google não ver conteúdo duplicado (www e domínios antigos).
export const DOMINIOS_ALIAS = ["www.agropartsuy.com", "rsautopecas.com", "www.rsautopecas.com", "agroparts.com.uy", "www.agroparts.com.uy"];
