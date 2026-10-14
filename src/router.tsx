import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { idiomaDoCaminho, tirarPrefixo, comPrefixo, type Idioma } from "./lib/idioma";

export const getRouter = () => {
  const queryClient = new QueryClient();
  // Idioma da página atual: "/pt/..." = português. Um roteador por requisição no servidor e um no navegador.
  let idioma: Idioma = "es";

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
    rewrite: {
      // Entrando: "/pt/loja" vira a rota "/loja" (as páginas são as mesmas nos dois idiomas)
      input: ({ url }) => {
        idioma = idiomaDoCaminho(url.pathname);
        if (idioma === "es") return undefined;
        url.pathname = tirarPrefixo(url.pathname);
        return url;
      },
      // Saindo (links, navegação): em português, todo link interno ganha "/pt"
      output: ({ url }) => {
        const novo = comPrefixo(url.pathname, idioma);
        if (novo === url.pathname) return undefined;
        url.pathname = novo;
        return url;
      },
    },
  });

  return router;
};
