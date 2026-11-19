// Coordenadas (lat, lng) de lugares do Uruguai: para posicionar no mapa prospectos adicionados só
// por cidade, e para achar a cidade/departamento mais próximos ao clicar no mapa. Pure.

export type LugarUY = { nombre: string; departamento: string; lat: number; lng: number };

export const LUGARES_UY: LugarUY[] = [
  // Departamentos (capital) — e cidades principais
  { nombre: "Montevideo", departamento: "Montevideo", lat: -34.9011, lng: -56.1645 },
  { nombre: "Canelones", departamento: "Canelones", lat: -34.5225, lng: -56.2778 },
  { nombre: "Las Piedras", departamento: "Canelones", lat: -34.7281, lng: -56.2206 },
  { nombre: "Pando", departamento: "Canelones", lat: -34.7206, lng: -55.9575 },
  { nombre: "Ciudad de la Costa", departamento: "Canelones", lat: -34.8, lng: -55.95 },
  { nombre: "Santa Lucía", departamento: "Canelones", lat: -34.4583, lng: -56.3906 },
  { nombre: "Maldonado", departamento: "Maldonado", lat: -34.9087, lng: -54.9586 },
  { nombre: "San Carlos", departamento: "Maldonado", lat: -34.7925, lng: -54.9178 },
  { nombre: "Punta del Este", departamento: "Maldonado", lat: -34.9492, lng: -54.9336 },
  { nombre: "Rocha", departamento: "Rocha", lat: -34.4833, lng: -54.3333 },
  { nombre: "Chuy", departamento: "Rocha", lat: -33.6971, lng: -53.4606 },
  { nombre: "Castillos", departamento: "Rocha", lat: -34.1975, lng: -53.8339 },
  { nombre: "La Paloma", departamento: "Rocha", lat: -34.6606, lng: -54.1636 },
  { nombre: "Treinta y Tres", departamento: "Treinta y Tres", lat: -33.2333, lng: -54.3833 },
  { nombre: "Vergara", departamento: "Treinta y Tres", lat: -32.9397, lng: -53.9397 },
  { nombre: "Melo", departamento: "Cerro Largo", lat: -32.3686, lng: -54.1675 },
  { nombre: "Río Branco", departamento: "Cerro Largo", lat: -32.5939, lng: -53.3769 },
  { nombre: "Rivera", departamento: "Rivera", lat: -30.9053, lng: -55.5508 },
  { nombre: "Tranqueras", departamento: "Rivera", lat: -31.2028, lng: -55.7506 },
  { nombre: "Artigas", departamento: "Artigas", lat: -30.4, lng: -56.4667 },
  { nombre: "Bella Unión", departamento: "Artigas", lat: -30.2611, lng: -57.5992 },
  { nombre: "Salto", departamento: "Salto", lat: -31.3833, lng: -57.9667 },
  { nombre: "Paysandú", departamento: "Paysandú", lat: -32.3214, lng: -58.0756 },
  { nombre: "Guichón", departamento: "Paysandú", lat: -32.3489, lng: -57.1958 },
  { nombre: "Fray Bentos", departamento: "Río Negro", lat: -33.1333, lng: -58.3 },
  { nombre: "Young", departamento: "Río Negro", lat: -32.6975, lng: -57.6328 },
  { nombre: "Mercedes", departamento: "Soriano", lat: -33.2525, lng: -58.0269 },
  { nombre: "Dolores", departamento: "Soriano", lat: -33.5333, lng: -58.2167 },
  { nombre: "Cardona", departamento: "Soriano", lat: -33.8736, lng: -57.3706 },
  { nombre: "Colonia del Sacramento", departamento: "Colonia", lat: -34.4714, lng: -57.8442 },
  { nombre: "Carmelo", departamento: "Colonia", lat: -34.0, lng: -58.2833 },
  { nombre: "Juan Lacaze", departamento: "Colonia", lat: -34.4328, lng: -57.4489 },
  { nombre: "Nueva Helvecia", departamento: "Colonia", lat: -34.3003, lng: -57.2322 },
  { nombre: "Rosario", departamento: "Colonia", lat: -34.3161, lng: -57.3539 },
  { nombre: "Nueva Palmira", departamento: "Colonia", lat: -33.8714, lng: -58.4106 },
  { nombre: "San José de Mayo", departamento: "San José", lat: -34.3375, lng: -56.7139 },
  { nombre: "Ciudad del Plata", departamento: "San José", lat: -34.4597, lng: -56.4178 },
  { nombre: "Trinidad", departamento: "Flores", lat: -33.5233, lng: -56.9011 },
  { nombre: "Florida", departamento: "Florida", lat: -34.0954, lng: -56.2142 },
  { nombre: "Durazno", departamento: "Durazno", lat: -33.3806, lng: -56.5231 },
  { nombre: "Sarandí del Yí", departamento: "Durazno", lat: -33.3486, lng: -55.6281 },
  { nombre: "Minas", departamento: "Lavalleja", lat: -34.3753, lng: -55.2378 },
  { nombre: "Tacuarembó", departamento: "Tacuarembó", lat: -31.7306, lng: -55.9847 },
  { nombre: "Paso de los Toros", departamento: "Tacuarembó", lat: -32.8139, lng: -56.5125 },
];

// Centro e zoom do Uruguai (para a vista inicial do mapa)
export const CENTRO_UY: [number, number] = [-32.8, -56.0];
export const ZOOM_UY = 7;

const norm = (s: string) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const MAPA = new Map(LUGARES_UY.map((l) => [norm(l.nombre), l]));

// Coordenada de uma cidade pelo nome (null se desconhecida).
export function coordDeCiudad(nombre?: string | null): [number, number] | null {
  if (!nombre) return null;
  const l = MAPA.get(norm(nombre));
  return l ? [l.lat, l.lng] : null;
}

// Lugar mais próximo de um ponto (para auto-preencher cidade/departamento ao clicar no mapa).
export function lugarMasCercano(lat: number, lng: number): LugarUY {
  let melhor = LUGARES_UY[0];
  let min = Infinity;
  for (const l of LUGARES_UY) {
    const d = (l.lat - lat) ** 2 + (l.lng - lng) ** 2;
    if (d < min) {
      min = d;
      melhor = l;
    }
  }
  return melhor;
}
