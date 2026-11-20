// Tipos e constantes do CRM de prospecção (empresas uruguaias para importação). Puro: usado
// tanto pelo admin (tela) quanto pelo servidor.

export type EstadoProspecto =
  "nuevo" | "contactado" | "respondio" | "cotizando" | "cliente" | "descartado";

export const ESTADOS: Array<{ v: EstadoProspecto; es: string; cor: string }> = [
  { v: "nuevo", es: "Nuevo", cor: "#64748b" },
  { v: "contactado", es: "Contactado", cor: "#2f6abf" },
  { v: "respondio", es: "Respondió", cor: "#c77d1a" },
  { v: "cotizando", es: "Cotizando", cor: "#7a4fc0" },
  { v: "cliente", es: "Cliente", cor: "#1f9d57" },
  { v: "descartado", es: "Descartado", cor: "#b94646" },
];
export const estadoInfo = (e: string) => ESTADOS.find((x) => x.v === e) ?? ESTADOS[0];

export const TIPOS: Array<{ v: string; es: string }> = [
  { v: "repuestera", es: "Repuestera" },
  { v: "taller_agricola", es: "Taller agrícola" },
  { v: "taller_diesel", es: "Taller diesel / inyección" },
  { v: "camiones", es: "Repuestos de camiones" },
  { v: "cooperativa", es: "Cooperativa / acopio" },
  { v: "importador", es: "Importador" },
  { v: "otro", es: "Otro" },
];
export const tipoEs = (v?: string | null) => TIPOS.find((t) => t.v === v)?.es ?? "—";

export const ORIGENES: Array<{ v: string; es: string }> = [
  { v: "maps", es: "Google Maps" },
  { v: "mercadolibre", es: "Mercado Libre" },
  { v: "facebook", es: "Facebook" },
  { v: "referido", es: "Referido" },
  { v: "web", es: "Web / otro" },
];

export const PRIORIDADES = ["alta", "media", "baja"] as const;

export type Prospecto = {
  id: number;
  nombre: string;
  tipo: string | null;
  ciudad: string | null;
  departamento: string | null;
  telefono: string | null;
  email: string | null;
  web: string | null;
  origen: string | null;
  estado: EstadoProspecto;
  prioridad: string | null;
  ultimo_contacto: string | null;
  proximo_contacto: string | null;
  notas: string | null;
  lat: number | null;
  lng: number | null;
};

// Só dígitos; monta número do Uruguai (código 598) para link de WhatsApp.
export function telefonoWhatsapp(tel?: string | null): string {
  let d = String(tel ?? "").replace(/\D/g, "");
  if (!d) return "";
  if (d.startsWith("00")) d = d.slice(2);
  if (d.startsWith("598")) return d;
  if (d.startsWith("0")) d = d.slice(1);
  // número local uruguaio (8–9 dígitos) → prefixa 598
  if (d.length <= 9) return "598" + d;
  return d;
}

// Mensagem de primeiro contato (es) para o link de WhatsApp.
export function mensajeWhatsapp(p: { nombre: string; ciudad?: string | null }): string {
  const donde = p.ciudad ? ` en ${p.ciudad}` : "";
  return (
    `Hola ${p.nombre}! Soy de AGRO PARTS, distribuidora de repuestos agrícolas, de camiones y ` +
    `diesel. Exportamos directo desde Brasil a Uruguay${donde} con origen Mercosur (0% de arancel). ` +
    `¿Compran repuestos para revender o para equipos propios?`
  );
}

// Converte um bloco de texto (colado do Maps/planilha) em prospectos.
// Cada linha: "Nombre <tab|;|,> Ciudad <tab|;|,> Teléfono". Só o nome é obrigatório.
export type ProspectoNuevo = {
  nombre: string;
  ciudad?: string | null;
  telefono?: string | null;
  tipo?: string | null;
  departamento?: string | null;
};
export function parseLinhas(texto: string): ProspectoNuevo[] {
  const out: ProspectoNuevo[] = [];
  for (const bruta of String(texto ?? "").split(/\r?\n/)) {
    const linha = bruta.trim();
    if (!linha) continue;
    // separador: tab > ponto-e-vírgula > vírgula (só se houver 2+)
    let partes: string[];
    if (linha.includes("\t")) partes = linha.split("\t");
    else if (linha.includes(";")) partes = linha.split(";");
    else if ((linha.match(/,/g) || []).length >= 1 && /\d{5,}/.test(linha))
      partes = linha.split(",");
    else partes = [linha];
    const campos = partes.map((p) => p.trim());
    const nombre = campos[0];
    if (!nombre) continue;
    out.push({
      nombre: nombre.slice(0, 200),
      ciudad: campos[1]?.slice(0, 120) || null,
      telefono: campos[2]?.slice(0, 60) || null,
    });
  }
  return out;
}
