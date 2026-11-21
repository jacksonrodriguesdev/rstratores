// Calculadora pública de costo desembarcado (Brasil → Uruguay). Usa la base de cubagem del admin
// (cubagem_ref: peso + medidas + peso cubado por código) para estimar el flete, y la camada aduanera
// (custoUruguai: arancel 0% Mercosur, tasa consular, IVA) para el costo final. Captura el lead en el CRM.
import { createServerFn } from "@tanstack/react-start";
import {
  custoUruguai,
  acordoDaNcm,
  ncmValida,
  formatarNcm,
  TAXAS_PADRAO,
  type Preferencia,
  type LinhaCusto,
} from "./aduana/aduana-comum";

// ---------------------------------------------------------------- tipos (navegador + servidor)
export type ItemEntrada = { codigo: string; qty: number; precioUsd?: number | null };

export type ItemCalculado = {
  codigo: string;
  qty: number;
  encontrado: boolean;
  nombre: string | null;
  ncm: string | null;
  ncmFmt: string | null;
  acordo: string | null; // ACE02 / ACE18
  preferencia: Preferencia;
  confianza: string | null; // ALTA / MEDIA / ESTIMADA
  peso_kg: number | null;
  peso_cubado_kg: number | null;
  volume_m3: number | null;
  comp_cm: number | null;
  larg_cm: number | null;
  alt_cm: number | null;
  precioUsd: number | null;
};

export type ResultadoCalculo = {
  items: ItemCalculado[];
  encontrados: number;
  sinDato: number;
  pesoRealKg: number;
  pesoCubadoKg: number;
  volumeM3: number;
  flete: { estimado: number; configurado: boolean; moeda: string };
  // Solo si hay precios cargados en TODOS los ítems encontrados:
  costo: null | {
    fob: number;
    flete: number;
    seguro: number;
    cif: number;
    arancel: number;
    tasaConsular: number;
    iva: number;
    despachante: number;
    total: number;
    totalSemIva: number;
    economiaMercosul: number;
  };
  taxas: { tasaConsular: number; iva: number; aec: number };
};

const r2 = (n: number) => Math.round(n * 100) / 100;

// ---------------------------------------------------------------- simular
export const simularCostoFn = createServerFn({ method: "POST" })
  .validator((d: { items: ItemEntrada[] }) => ({
    items: (Array.isArray(d?.items) ? d.items : [])
      .slice(0, 50)
      .map((i) => ({
        codigo: String(i?.codigo ?? "").slice(0, 64),
        qty: Math.min(Math.max(Math.floor(Number(i?.qty) || 1), 1), 9999),
        precioUsd:
          i?.precioUsd == null || i.precioUsd === ("" as unknown)
            ? null
            : Math.max(0, Number(i.precioUsd) || 0) || null,
      }))
      .filter((i) => i.codigo.trim().length >= 2),
  }))
  .handler(async ({ data }): Promise<ResultadoCalculo> => {
    const { cubagemPorCodigos, tarifaFrete } = await import("./cubagem/cubagem.server");
    const { calcularFrete } = await import("./cubagem/frete");
    const { normalizarCodigo } = await import("./b2b-comum");

    const [mapa, tarifa] = await Promise.all([
      cubagemPorCodigos(data.items.map((i) => i.codigo)),
      tarifaFrete(),
    ]);

    let pesoRealKg = 0;
    let pesoCubadoKg = 0;
    let volumeM3 = 0;
    let encontrados = 0;
    let sinDato = 0;

    const items: ItemCalculado[] = data.items.map((i) => {
      const c = mapa.get(normalizarCodigo(i.codigo));
      const encontrado = !!c;
      if (c) {
        encontrados++;
        pesoRealKg += (c.peso_kg ?? 0) * i.qty;
        pesoCubadoKg += (c.peso_cubado_kg ?? 0) * i.qty;
        volumeM3 += (c.volume_m3 ?? 0) * i.qty;
      } else {
        sinDato++;
      }
      const ncm = c?.ncm ?? null;
      const ac = ncm ? acordoDaNcm(ncm) : null;
      const preferencia: Preferencia = ncmValida(ncm) ? "SIM" : "A_CONFIRMAR";
      return {
        codigo: i.codigo,
        qty: i.qty,
        encontrado,
        nombre: c?.nome ?? null,
        ncm,
        ncmFmt: ncm ? formatarNcm(ncm) : null,
        acordo: ac?.acordo ?? null,
        preferencia,
        confianza: c?.confianca ?? null,
        peso_kg: c?.peso_kg ?? null,
        peso_cubado_kg: c?.peso_cubado_kg ?? null,
        volume_m3: c?.volume_m3 ?? null,
        comp_cm: c?.comp_cm ?? null,
        larg_cm: c?.larg_cm ?? null,
        alt_cm: c?.alt_cm ?? null,
        precioUsd: i.precioUsd ?? null,
      };
    });

    pesoRealKg = r2(pesoRealKg);
    pesoCubadoKg = r2(pesoCubadoKg);
    volumeM3 = Math.round(volumeM3 * 1000) / 1000;

    const configurado = tarifa.porKg > 0 || tarifa.taxaFixa > 0 || tarifa.minimo > 0;
    const flete = configurado ? calcularFrete(pesoCubadoKg, tarifa) : 0;

    // Costo con impuestos: solo si todos los ítems encontrados tienen precio cargado.
    const conPrecio = items.filter((i) => i.encontrado && i.precioUsd != null && i.precioUsd > 0);
    const todosConPrecio = encontrados > 0 && conPrecio.length === encontrados;
    let costo: ResultadoCalculo["costo"] = null;
    if (todosConPrecio) {
      const lineas: LinhaCusto[] = conPrecio.map((i) => ({
        qtd: i.qty,
        preco: i.precioUsd!,
        preferencia: i.preferencia,
        aec: null,
      }));
      const cu = custoUruguai(lineas, configurado ? flete : null, TAXAS_PADRAO);
      costo = {
        fob: cu.fob,
        flete: cu.frete,
        seguro: cu.seguro,
        cif: cu.cif,
        arancel: cu.arancel,
        tasaConsular: cu.tasaConsular,
        iva: cu.iva,
        despachante: cu.despachante,
        total: cu.total,
        totalSemIva: cu.totalSemIva,
        economiaMercosul: cu.economiaMercosul,
      };
    }

    return {
      items,
      encontrados,
      sinDato,
      pesoRealKg,
      pesoCubadoKg,
      volumeM3,
      flete: { estimado: flete, configurado, moeda: tarifa.moeda },
      costo,
      taxas: {
        tasaConsular: TAXAS_PADRAO.tasaConsularMercosul,
        iva: TAXAS_PADRAO.iva,
        aec: TAXAS_PADRAO.aecPadrao,
      },
    };
  });

// ---------------------------------------------------------------- captura de lead (→ CRM prospectos)
export const guardarLeadFn = createServerFn({ method: "POST" })
  .validator(
    (d: {
      contacto?: string;
      empresa?: string;
      telefono?: string;
      email?: string;
      departamento?: string;
      ciudad?: string;
      resumen?: string;
    }) => ({
      contacto: String(d?.contacto ?? "").slice(0, 120),
      empresa: String(d?.empresa ?? "").slice(0, 160),
      telefono: String(d?.telefono ?? "").slice(0, 60),
      email: String(d?.email ?? "").slice(0, 190),
      departamento: String(d?.departamento ?? "").slice(0, 120),
      ciudad: String(d?.ciudad ?? "").slice(0, 120),
      resumen: String(d?.resumen ?? "").slice(0, 2000),
    }),
  )
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const nombre = (data.empresa || data.contacto || "").trim();
    if (!nombre) throw new Error("Falta el nombre.");
    if (!data.telefono && !data.email) throw new Error("Dejá un WhatsApp o email.");
    const { guardarProspecto } = await import("./prospeccion/prospeccion.server");
    const notas = [
      data.contacto ? `Contacto: ${data.contacto}` : "",
      "Lead de la calculadora de costo de importación.",
      data.resumen,
    ]
      .filter(Boolean)
      .join("\n");
    await guardarProspecto({
      nombre,
      tipo: "importador",
      telefono: data.telefono || null,
      email: data.email || null,
      ciudad: data.ciudad || null,
      departamento: data.departamento || null,
      origen: "calculadora",
      estado: "respondio",
      prioridad: "alta",
      proximo_contacto: new Date().toISOString().slice(0, 10),
      notas,
    });
    return { ok: true };
  });
