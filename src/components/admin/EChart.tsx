import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { MapaSatelite } from "./MapaSatelite";

// Gráfico ECharts. Carrega a biblioteca só no navegador (o painel também é renderizado
// no servidor) e redimensiona junto com o contêiner.
// gl: gráficos 3D (echarts-gl), carregado só quando usado
type Props = {
  option: any;
  height?: number | string;
  className?: string;
  mapa?: boolean;
  gl?: boolean;
  aoClicar?: (p: any) => void;
};

let mapaRegistrado: Promise<void> | null = null;
async function registrarMapa(echarts: any) {
  // Contorno dos países (public/geo/world.json, do pacote ECharts 4.9, licença Apache-2.0)
  mapaRegistrado ??= fetch("/geo/world.json")
    .then((r) => r.json())
    .then((geo) => echarts.registerMap("world", geo));
  return mapaRegistrado;
}

export function EChart({ option, height = 320, className, mapa, gl, aoClicar }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const grafico = useRef<any>(null);
  // Última opção recebida: a biblioteca carrega depois do primeiro render
  const atual = useRef(option);
  atual.current = option;
  const clique = useRef(aoClicar);
  clique.current = aoClicar;

  useEffect(() => {
    let vivo = true;
    let ro: ResizeObserver | undefined;
    (async () => {
      const echarts = await import("echarts");
      if (mapa) await registrarMapa(echarts);
      if (gl) await import("echarts-gl");
      if (!vivo || !ref.current) return;
      grafico.current = echarts.init(ref.current, undefined, { renderer: "canvas" });
      grafico.current.setOption(atual.current);
      grafico.current.on("click", (p: any) => clique.current?.(p));
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

  // Mapas: botão «Mapa | Satélite» (a escolha fica guardada neste navegador)
  const [satelite, setSatelite] = useState(false);
  useEffect(() => {
    if (!mapa) return;
    try {
      setSatelite(localStorage.getItem("mapa_modo") === "satelite");
    } catch {
      /* sem armazenamento: começa no mapa */
    }
  }, [mapa]);
  const trocar = (s: boolean) => {
    setSatelite(s);
    try {
      localStorage.setItem("mapa_modo", s ? "satelite" : "mapa");
    } catch {
      /* ignora */
    }
    if (!s) setTimeout(() => grafico.current?.resize(), 0);
  };

  if (!mapa) return <div ref={ref} className={className} style={{ width: "100%", height }} />;
  return (
    <div className={cn("relative", className)}>
      <div className="absolute right-2 top-2 z-[500] inline-flex rounded-lg border bg-white/95 p-0.5 text-xs font-semibold shadow">
        {(
          [
            [false, "Mapa"],
            [true, "Satélite"],
          ] as const
        ).map(([s, nome]) => (
          <button
            key={nome}
            type="button"
            onClick={() => trocar(s)}
            className={cn(
              "rounded-md px-2.5 py-1",
              satelite === s
                ? "bg-primary text-primary-foreground"
                : "text-zinc-600 hover:bg-zinc-100",
            )}
          >
            {nome}
          </button>
        ))}
      </div>
      <div ref={ref} style={{ width: "100%", height, display: satelite ? "none" : "block" }} />
      {satelite && <MapaSatelite option={option} height={height} />}
    </div>
  );
}
