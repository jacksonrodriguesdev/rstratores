import type { AvaliacoesGoogle } from "./google-reviews";

// Avaliações reais do perfil da empresa no Google, pela Places API (New).
// Configure no .env: GOOGLE_PLACES_API_KEY e GOOGLE_PLACE_ID.
// A API devolve no máximo 5 avaliações. Cache de 6 h para não pagar a cada visita.
const CACHE_MS = 6 * 60 * 60 * 1000;
let cache: { em: number; dados: AvaliacoesGoogle | null } | null = null;

export async function buscarAvaliacoesGoogle(): Promise<AvaliacoesGoogle | null> {
  const chave = process.env.GOOGLE_PLACES_API_KEY;
  const placeId = process.env.GOOGLE_PLACE_ID;
  if (!chave || !placeId) return null;
  if (cache && Date.now() - cache.em < CACHE_MS) return cache.dados;

  try {
    const res = await fetch(
      `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?languageCode=es`,
      {
        headers: {
          "X-Goog-Api-Key": chave,
          "X-Goog-FieldMask": "rating,userRatingCount,reviews,googleMapsUri",
        },
        signal: AbortSignal.timeout(8000),
      },
    );
    if (!res.ok) throw new Error(`Places API ${res.status}`);
    const p = await res.json();
    const dados: AvaliacoesGoogle = {
      origem: "google",
      nota: p.rating ?? null,
      total: p.userRatingCount ?? null,
      link: p.googleMapsUri ?? null,
      avaliacoes: (p.reviews ?? []).map((r: any) => ({
        autor: r.authorAttribution?.displayName ?? "Cliente Google",
        foto: r.authorAttribution?.photoUri ?? null,
        linkAutor: r.authorAttribution?.uri ?? null,
        nota: r.rating ?? 5,
        texto: r.text?.text ?? r.originalText?.text ?? "",
        quando: r.relativePublishTimeDescription ?? "",
      })),
    };
    cache = { em: Date.now(), dados };
    return dados;
  } catch (e) {
    console.error("Erro ao buscar avaliações do Google:", e);
    cache = { em: Date.now(), dados: null };
    return null;
  }
}
