import { createServerFn } from "@tanstack/react-start";

type Grupo = { visitantes: number; sessoes: number; whatsapp: number };

export type Visitantes = {
  dias: number;
  resumo: {
    visitas: number;
    visitantes: number;
    sessoes: number;
    paginasPorSessao: number;
    cliquesWhatsapp: number;
    sessoesComWhatsapp: number;
    conversao: number;
    pctUruguay: number;
    pctComLocal: number;
  };
  porDia: Array<{ dia: string; visitas: number; visitantes: number; sessoes: number; whatsapp: number }>;
  paises: Array<Grupo & { code: string; nome: string }>;
  regioes: Array<Grupo & { region: string; code: string | null }>;
  pagoPorRegiao: Array<Grupo & { region: string; code: string | null }>;
  pagoForaDoPais: number;
  cidades: Array<Grupo & { city: string; region: string | null; code: string | null; lat: number | null; lon: number | null }>;
  fontes: Array<Grupo & { fonte: string; meio: string }>;
  campanhas: Array<Grupo & { campanha: string; fonte: string; meio: string }>;
  dispositivos: Array<{ nome: string; sessoes: number }>;
  navegadores: Array<{ nome: string; sessoes: number }>;
  sistemas: Array<{ nome: string; sessoes: number }>;
  paginas: Array<{ path: string; visitas: number }>;
  entradas: Array<{ path: string; sessoes: number }>;
  horario: number[][];
  recentes: Array<{ quando: string; path: string; city: string | null; region: string | null; code: string | null; fonte: string | null; device: string | null; browser: string | null; visitante: string }>;
};

// Painel Visitantes (só admin)
export const getVisitantesFn = createServerFn({ method: "GET" })
  .validator((d: { dias: number; pais?: string | null }) => ({
    dias: Math.min(Math.max(Number(d?.dias) || 30, 1), 365),
    pais: d?.pais === "UY" ? "UY" : null,
  }))
  .handler(async ({ data }) => {
    const { assertAdmin } = await import("./auth.server");
    await assertAdmin();
    const { resumoVisitantes } = await import("./visitantes.server");
    return resumoVisitantes(data.dias, data.pais);
  });
