import { useEffect, useRef } from "react";

// Gráfico ECharts. Carrega a biblioteca só no navegador (o painel também é renderizado
// no servidor) e redimensiona junto com o contêiner.
type Props = { option: any; height?: number | string; className?: string; mapa?: boolean };

let mapaRegistrado: Promise<void> | null = null;
async function registrarMapa(echarts: any) {
  // Contorno dos países (public/geo/world.json, do pacote ECharts 4.9, licença Apache-2.0)
  mapaRegistrado ??= fetch("/geo/world.json")
    .then((r) => r.json())
    .then((geo) => echarts.registerMap("world", geo));
  return mapaRegistrado;
}

export function EChart({ option, height = 320, className, mapa }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const grafico = useRef<any>(null);
  // Última opção recebida: a biblioteca carrega depois do primeiro render
  const atual = useRef(option);
  atual.current = option;

  useEffect(() => {
    let vivo = true;
    let ro: ResizeObserver | undefined;
    (async () => {
      const echarts = await import("echarts");
      if (mapa) await registrarMapa(echarts);
      if (!vivo || !ref.current) return;
      grafico.current = echarts.init(ref.current, undefined, { renderer: "canvas" });
      grafico.current.setOption(atual.current);
      ro = new ResizeObserver(() => grafico.current?.resize());
      ro.observe(ref.current);
    })();
    return () => {
      vivo = false;
      ro?.disconnect();
      grafico.current?.dispose();
      grafico.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    grafico.current?.setOption(option, true);
  }, [option]);

  return <div ref={ref} className={className} style={{ width: "100%", height }} />;
}
