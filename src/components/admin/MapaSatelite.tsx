// Mapa em modo satélite para os mapas do painel (Visitantes, Clientes, Análises). Usa as mesmas
// informações do gráfico ECharts: centro e zoom do «geo», e os pontos das séries de dispersão
// (value = [longitude, latitude, quantidade]), com o mesmo tamanho e o mesmo balão (tooltip).
// Imagens: Esri World Imagery + nomes de lugares e fronteiras (Esri). Leaflet só no navegador.
import { useEffect, useRef } from "react";

type Ponto = { lon: number; lat: number; raio: number; cor: string; html: string };

// Converte o zoom do ECharts (1 = mundo inteiro) para o do Leaflet
const zoomLeaflet = (z: number) =>
  Math.max(2, Math.min(13, Math.round(1.6 + Math.log2(Math.max(1, z)) * 1.25)));

// Pontos das séries de dispersão no sistema «geo», com tamanho e balão do próprio gráfico
export function pontosDoGrafico(option: any): Ponto[] {
  const out: Ponto[] = [];
  const formatter = option?.tooltip?.formatter;
  for (const s of option?.series ?? []) {
    if (s?.coordinateSystem !== "geo" || !/scatter/i.test(s.type ?? "")) continue;
    const tam = s.symbolSize;
    const cor = s.itemStyle?.color ?? "#f2b705";
    for (const d of s.data ?? []) {
      const v = Array.isArray(d) ? d : d?.value;
      if (!Array.isArray(v) || v[0] == null || v[1] == null) continue;
      const size = typeof tam === "function" ? Number(tam(v)) : Number(tam ?? 10);
      if (!(size > 0)) continue; // séries só de rótulo (symbolSize 0) ficam de fora
      let html = "";
      if (typeof formatter === "function") {
        try {
          html = String(
            formatter({ seriesType: s.type, data: d, name: d?.name ?? "", value: v }) ?? "",
          );
        } catch {
          html = "";
        }
      }
      out.push({
        lon: Number(v[0]),
        lat: Number(v[1]),
        raio: size / 2,
        cor,
        html: html || `${d?.name ?? ""} ${v[2] ?? ""}`,
      });
    }
  }
  return out;
}

export function MapaSatelite({ option, height }: { option: any; height: number | string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let mapa: any;
    let vivo = true;
    (async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");
      if (!vivo || !ref.current) return;
      const geo = option?.geo ?? {};
      const [lon, lat] = Array.isArray(geo.center) ? geo.center : [-56, -32];
      mapa = L.map(ref.current, {
        zoomControl: true,
        attributionControl: true,
        worldCopyJump: true,
      }).setView([lat, lon], zoomLeaflet(Number(geo.zoom) || 1));
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          maxZoom: 18,
          attribution: "Imagens © Esri, Maxar, Earthstar Geographics e comunidade GIS",
        },
      ).addTo(mapa);
      // Nomes de cidades, estradas e fronteiras por cima das fotos
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 18, opacity: 0.9 },
      ).addTo(mapa);
      for (const p of pontosDoGrafico(option)) {
        L.circleMarker([p.lat, p.lon], {
          radius: Math.max(4, p.raio),
          color: "#ffffff",
          weight: 2,
          fillColor: p.cor,
          fillOpacity: 0.85,
        })
          .bindTooltip(p.html, { direction: "top", sticky: true })
          .addTo(mapa);
      }
    })();
    return () => {
      vivo = false;
      mapa?.remove();
    };
  }, [option]);
  return <div ref={ref} style={{ width: "100%", height }} className="z-0" />;
}
