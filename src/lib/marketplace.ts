// AGRO PARTS Marketplace — tipos, constantes e server functions (client-callable).
// Código puro (roda no site e no admin); a lógica de banco fica em marketplace.server.ts.
import { createServerFn } from "@tanstack/react-start";
import type { FiltroAnuncios } from "./marketplace.server";

// Tipos de máquina (valor guardado no banco + rótulo es/pt).
export const TIPOS_MAQUINA: Array<{ id: string; es: string; pt: string }> = [
  { id: "tractor", es: "Tractores", pt: "Tratores" },
  { id: "cosechadora", es: "Cosechadoras", pt: "Colheitadeiras" },
  { id: "pulverizadora", es: "Pulverizadoras", pt: "Pulverizadores" },
  { id: "implemento", es: "Implementos", pt: "Implementos" },
  { id: "sembradora", es: "Sembradoras", pt: "Plantadeiras" },
  { id: "camion", es: "Camiones", pt: "Caminhões" },
  { id: "otro", es: "Otros", pt: "Outros" },
];
export const tipoLabel = (id: string | null | undefined, idioma: "es" | "pt" = "es") =>
  TIPOS_MAQUINA.find((t) => t.id === id)?.[idioma] ?? id ?? "";

export const DEPARTAMENTOS_UY = [
  "Artigas",
  "Canelones",
  "Cerro Largo",
  "Colonia",
  "Durazno",
  "Flores",
  "Florida",
  "Lavalleja",
  "Maldonado",
  "Montevideo",
  "Paysandú",
  "Río Negro",
  "Rivera",
  "Rocha",
  "Salto",
  "San José",
  "Soriano",
  "Tacuarembó",
  "Treinta y Tres",
];

export const STATUS_ANUNCIO = ["PENDIENTE", "ACTIVO", "PAUSADO", "VENDIDO", "RECHAZADO"] as const;

// Tipos leves pro client (o que as telas consomem).
export type AnuncioCard = {
  id: number;
  titulo: string;
  tipo: string;
  marca: string | null;
  ano: number | null;
  horasKm: number | null;
  unidadeUso: string | null;
  departamento: string | null;
  preco: number | null;
  moeda: string;
  precoConsultar: boolean;
  destaque: boolean;
  foto: string | null;
  fotos: string[];
  empresa: { handle: string; nome: string; verificada: boolean } | null;
};

// ---- Server functions (o client chama estas) ----

export const listarAnunciosFn = createServerFn({ method: "GET" })
  .validator((d: FiltroAnuncios = {}) => d)
  .handler(async ({ data }) => {
    const { listarAnuncios } = await import("./marketplace.server");
    return listarAnuncios(data);
  });

export const getAnuncioFn = createServerFn({ method: "GET" })
  .validator((d: { id: number }) => ({ id: Number(d.id) }))
  .handler(async ({ data }) => {
    const { getAnuncio } = await import("./marketplace.server");
    return getAnuncio(data.id);
  });

export const getEmpresaFn = createServerFn({ method: "GET" })
  .validator((d: { handle: string }) => ({ handle: String(d.handle) }))
  .handler(async ({ data }) => {
    const { getSession } = await import("./auth.server");
    const { getEmpresaPorHandle } = await import("./marketplace.server");
    const s = await getSession();
    const empresa = await getEmpresaPorHandle(data.handle, s?.id ?? null);
    return empresa ? { ...empresa, logado: !!s } : null;
  });

// Seguir/deixar de seguir (precisa estar logado).
export const seguirFn = createServerFn({ method: "POST" })
  .validator((d: { empresaId: number }) => ({ empresaId: Number(d.empresaId) }))
  .handler(async ({ data }) => {
    const { getSession } = await import("./auth.server");
    const s = await getSession();
    if (!s) return { needLogin: true as const };
    const { seguirEmpresa } = await import("./marketplace.server");
    const r = await seguirEmpresa(data.empresaId, s.id);
    return { needLogin: false as const, ...r };
  });

export const facetasFn = createServerFn({ method: "GET" }).handler(async () => {
  const { facetasAnuncios } = await import("./marketplace.server");
  return facetasAnuncios();
});

export const registrarLeadFn = createServerFn({ method: "POST" })
  .validator((d: { id: number; tipo: "whatsapp" | "view" }) => ({
    id: Number(d.id),
    tipo: d.tipo === "whatsapp" ? "whatsapp" : ("view" as "whatsapp" | "view"),
  }))
  .handler(async ({ data }) => {
    const { registrarLead } = await import("./marketplace.server");
    await registrarLead(data.id, data.tipo);
    return { ok: true };
  });
