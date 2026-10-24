// Idioma do site público: espanhol (Uruguai) em "/..." e português (Brasil) em "/pt/...".
// Não há rotas duplicadas: o roteador tira o "/pt" do endereço ao entrar e o devolve nos links
// (rewrite em src/router.tsx). O admin, as APIs e os arquivos nunca levam prefixo.
// Textos: const { t } = useT(); t("Texto en español", "Texto em português").
import { useLocation } from "@tanstack/react-router";
import { SITE_URL } from "./site";

export type Idioma = "es" | "pt";
export const HREFLANG: Record<Idioma, string> = { es: "es-UY", pt: "pt-BR" };
export const OG_LOCALE: Record<Idioma, string> = { es: "es_UY", pt: "pt_BR" };

// Caminhos que nunca são traduzidos (admin, APIs, arquivos, mapas do site, feeds)
const SEM_IDIOMA =
  /^\/(admin|api|_serverFn|uploads|sitemap|sitemaps|feeds|catalogo|img|pdfjs|assets|[0-9a-f]{32}\.txt)(\/|$|\.)/;
export const caminhoSemIdioma = (caminho: string) => SEM_IDIOMA.test(caminho);

export function idiomaDoCaminho(caminho: string): Idioma {
  return caminho === "/pt" || caminho.startsWith("/pt/") ? "pt" : "es";
}

// "/pt/loja" -> "/loja"
export function tirarPrefixo(caminho: string): string {
  return idiomaDoCaminho(caminho) === "pt" ? caminho.slice(3) || "/" : caminho;
}

// "/loja" + pt -> "/pt/loja"
export function comPrefixo(caminho: string, idioma: Idioma): string {
  if (idioma === "es" || caminhoSemIdioma(caminho) || idiomaDoCaminho(caminho) === "pt")
    return caminho;
  return caminho === "/" ? "/pt" : `/pt${caminho}`;
}

const caminhoDe = (href: string) => {
  try {
    return new URL(href, "http://x").pathname;
  } catch {
    return "/";
  }
};

export function useIdioma(): Idioma {
  return useLocation({ select: (l) => idiomaDoCaminho(caminhoDe(l.publicHref)) });
}

export const tr = (idioma: Idioma, es: string, pt: string) => (idioma === "pt" ? pt : es);

export function useT() {
  const idioma = useIdioma();
  return {
    idioma,
    t: (es: string, pt: string) => (idioma === "pt" ? pt : es),
    // Para <a href> escritos à mão (os <Link> já recebem o prefixo sozinhos)
    href: (caminho: string) => comPrefixo(caminho, idioma),
  };
}

// Canônico + as duas versões da página (hreflang). Cada versão é de um país: espanhol = Uruguai
// (es-UY), português = Sul do Brasil (pt-BR). O Google mostra a de cada país para quem busca lá,
// e uma não concorre com a outra. caminho = interno, sem "/pt".
export function linksIdioma(caminho: string, idioma: Idioma) {
  const url = (i: Idioma) => `${SITE_URL}${comPrefixo(caminho, i)}`;
  return [
    { rel: "canonical", href: url(idioma) },
    { rel: "alternate", hrefLang: HREFLANG.es, href: url("es") },
    { rel: "alternate", hrefLang: HREFLANG.pt, href: url("pt") },
    { rel: "alternate", hrefLang: "x-default", href: url("es") },
  ];
}
