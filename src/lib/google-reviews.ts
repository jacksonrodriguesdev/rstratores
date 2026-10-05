import { createServerFn } from "@tanstack/react-start";

export type AvaliacaoGoogle = {
  autor: string;
  foto?: string | null;
  linkAutor?: string | null;
  nota: number;
  texto: string;
  quando?: string;
};

export type AvaliacoesGoogle = {
  // "google": vindas da Places API. "manual": cadastradas no admin (copiadas do perfil no Google).
  origem: "google" | "manual";
  nota: number | null;
  total: number | null;
  link: string | null;
  avaliacoes: AvaliacaoGoogle[];
};

export const getAvaliacoesGoogleFn = createServerFn({ method: "GET" }).handler(async () => {
  const server = await import("./google-reviews.server");
  return server.buscarAvaliacoesGoogle();
});
