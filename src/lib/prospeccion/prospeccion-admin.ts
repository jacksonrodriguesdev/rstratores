import { createServerFn } from "@tanstack/react-start";
import type { EstadoProspecto } from "./prospeccion-comum";
import type { DatosProspecto, FiltroProspeccion } from "./prospeccion.server";

// Funções do Admin → Prospección (CRM de importadores UY). Gate de admin; lógica em .server (import tardio).
const admin = async () => {
  const { assertAdmin } = await import("../auth.server");
  await assertAdmin();
};

export const estatProspeccionFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  return (await import("./prospeccion.server")).estatisticasProspeccion();
});

export const listarProspectosFn = createServerFn({ method: "GET" })
  .validator((d: FiltroProspeccion) => d ?? {})
  .handler(async ({ data }) => {
    await admin();
    return (await import("./prospeccion.server")).listarProspectos(data);
  });

export const guardarProspectoFn = createServerFn({ method: "POST" })
  .validator((d: DatosProspecto) => d)
  .handler(async ({ data }) => {
    await admin();
    return (await import("./prospeccion.server")).guardarProspecto(data);
  });

export const cambiarEstadoFn = createServerFn({ method: "POST" })
  .validator((d: { id: number; estado: EstadoProspecto }) => d)
  .handler(async ({ data }) => {
    await admin();
    return (await import("./prospeccion.server")).cambiarEstadoProspecto(data.id, data.estado);
  });

export const fijarProximoFn = createServerFn({ method: "POST" })
  .validator((d: { id: number; fecha: string | null }) => d)
  .handler(async ({ data }) => {
    await admin();
    return (await import("./prospeccion.server")).fijarProximoContacto(data.id, data.fecha);
  });

export const eliminarProspectoFn = createServerFn({ method: "POST" })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await admin();
    return (await import("./prospeccion.server")).eliminarProspecto(data.id);
  });

export const importarProspectosFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      texto: string;
      tipo?: string | null;
      ciudad?: string | null;
      departamento?: string | null;
      origen?: string | null;
    }) => d,
  )
  .handler(async ({ data }) => {
    await admin();
    const { parseLinhas } = await import("./prospeccion-comum");
    const linhas = parseLinhas(data.texto);
    return (await import("./prospeccion.server")).importarProspectos(linhas, {
      tipo: data.tipo ?? null,
      ciudad: data.ciudad ?? null,
      departamento: data.departamento ?? null,
      origen: data.origen ?? null,
    });
  });

export const exportarProspectosFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  return (await import("./prospeccion.server")).exportarProspectosCsv();
});

export const prospectosMapaFn = createServerFn({ method: "GET" }).handler(async () => {
  await admin();
  return (await import("./prospeccion.server")).listarProspectosMapa();
});

export const obtenerProspectoFn = createServerFn({ method: "GET" })
  .validator((d: { id: number }) => d)
  .handler(async ({ data }) => {
    await admin();
    return (await import("./prospeccion.server")).obtenerProspecto(data.id);
  });

export const importarSemillaFn = createServerFn({ method: "POST" }).handler(async () => {
  await admin();
  return (await import("./prospeccion.server")).importarSemillaUy();
});
