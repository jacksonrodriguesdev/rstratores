// Etapas do pedido (acompanhamento): o admin troca em Vendas e o cliente recebe e-mail e aviso
// no sininho do site. A ordem da lista é a ordem da linha do tempo.
export type Etapa =
  "AGUARDANDO" | "PEDIDO_FEITO" | "CHEGOU" | "EMBALANDO" | "DESPACHADO" | "ENTREGUE";
export type InfoEtapa = {
  id: Etapa;
  es: string;
  pt: string;
  textoEs: string;
  textoPt: string;
  admin: string; // rótulo no painel
};
export const ETAPAS: InfoEtapa[] = [
  {
    id: "AGUARDANDO",
    es: "Esperando a AGRO PARTS",
    pt: "Aguardando a AGRO PARTS",
    textoEs: "Recibimos tu pedido y lo estamos revisando.",
    textoPt: "Recebemos seu pedido e estamos conferindo.",
    admin: "Aguardando AGRO PARTS",
  },
  {
    id: "PEDIDO_FEITO",
    es: "Pedido confirmado",
    pt: "Pedido feito",
    textoEs: "Tu pedido está confirmado y ya lo estamos preparando.",
    textoPt: "Seu pedido está confirmado e já estamos preparando.",
    admin: "Pedido feito",
  },
  {
    id: "CHEGOU",
    es: "Llegó a AGRO PARTS",
    pt: "Chegou na AGRO PARTS",
    textoEs: "Tus repuestos ya están con nosotros.",
    textoPt: "Suas peças já estão com a gente.",
    admin: "Chegou na AGRO PARTS",
  },
  {
    id: "EMBALANDO",
    es: "Preparando el paquete",
    pt: "Sendo embalado",
    textoEs: "Estamos embalando tu pedido con cuidado.",
    textoPt: "Estamos embalando seu pedido com cuidado.",
    admin: "Sendo embalado",
  },
  {
    id: "DESPACHADO",
    es: "Entregado a la transportadora",
    pt: "Entregue à transportadora",
    textoEs: "Tu pedido salió. Te pasamos el número de seguimiento.",
    textoPt: "Seu pedido saiu. Enviamos o código de rastreio.",
    admin: "Entregue à transportadora",
  },
  {
    id: "ENTREGUE",
    es: "Entregado",
    pt: "Entregue",
    textoEs: "¡Tu pedido llegó! Gracias por comprar en AGRO PARTS.",
    textoPt: "Seu pedido chegou! Obrigado por comprar na AGRO PARTS.",
    admin: "Entregue ao cliente",
  },
];
export const etapaDe = (id: string | null | undefined) =>
  ETAPAS.find((e) => e.id === id) ?? ETAPAS[0];
export const indiceEtapa = (id: string | null | undefined) =>
  Math.max(
    0,
    ETAPAS.findIndex((e) => e.id === id),
  );
// Nome da etapa no idioma, com a transportadora quando saiu (ex.: «Entregado a DAC»)
export function nomeEtapa(id: string, idioma: "es" | "pt", transportadora?: string | null) {
  const e = etapaDe(id);
  if (e.id === "DESPACHADO" && transportadora?.trim())
    return idioma === "pt"
      ? `Entregue a ${transportadora.trim()}`
      : `Entregado a ${transportadora.trim()}`;
  return idioma === "pt" ? e.pt : e.es;
}
