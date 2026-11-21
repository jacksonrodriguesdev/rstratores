// Mapa de rutas de exportación Brasil → Uruguay (SVG inline, sin dependencias externas, SSR-safe).
// Muestra los 6 pasos de frontera y cómo la mercadería llega desde cada paso a todo el país.
// viewBox 0 0 600 640 — proyección simple del contorno de Uruguay.
import { MapPin } from "lucide-react";

// Contorno simplificado de Uruguay (recorrido del borde, sentido horario desde el NO).
const CONTORNO =
  "M94,24 L221,42 L324,107 L478,234 L565,327 L560,400 L558,472 L500,545 L430,615 " +
  "L391,629 L320,634 L252,629 L150,612 L67,573 L40,470 L16,398 L40,293 L54,170 L70,90 Z";

// Pasos de frontera con Brasil (nodo de entrada).
const FRONTERAS = [
  { k: "bella-union", n: "Bella Unión", x: 94, y: 24 },
  { k: "artigas", n: "Artigas", x: 221, y: 42 },
  { k: "rivera", n: "Rivera", x: 324, y: 107 },
  { k: "acegua", n: "Aceguá", x: 478, y: 234 },
  { k: "rio-branco", n: "Río Branco", x: 565, y: 327 },
  { k: "chuy", n: "Chuy", x: 558, y: 472 },
];

// Ciudades de destino (punto + etiqueta).
const CIUDADES = [
  { n: "Salto", x: 54, y: 170 },
  { n: "Paysandú", x: 40, y: 293 },
  { n: "Fray Bentos", x: 16, y: 398 },
  { n: "Mercedes", x: 46, y: 414 },
  { n: "Colonia", x: 67, y: 573 },
  { n: "San José", x: 194, y: 556 },
  { n: "Florida", x: 250, y: 525 },
  { n: "Durazno", x: 215, y: 431 },
  { n: "Tacuarembó", x: 275, y: 216 },
  { n: "Melo", x: 478, y: 299 },
  { n: "Treinta y Tres", x: 455, y: 411 },
  { n: "Minas", x: 358, y: 560 },
  { n: "Rocha", x: 460, y: 575 },
  { n: "Maldonado", x: 391, y: 629 },
];

const MVD = { n: "Montevideo", x: 252, y: 629 };

// Rutas logísticas (polilíneas desde cada paso hacia el país, convergiendo en el sur).
const RUTAS: Array<Array<[number, number]>> = [
  [
    [94, 24],
    [54, 170],
    [40, 293],
    [16, 398],
    [67, 573],
    [252, 629],
  ],
  [
    [221, 42],
    [54, 170],
  ],
  [
    [324, 107],
    [275, 216],
    [215, 431],
    [250, 525],
    [252, 629],
  ],
  [
    [478, 234],
    [478, 299],
    [455, 411],
    [358, 560],
    [252, 629],
  ],
  [
    [565, 327],
    [455, 411],
    [460, 575],
    [391, 629],
    [252, 629],
  ],
  [
    [558, 472],
    [460, 575],
    [391, 629],
  ],
];

const poly = (pts: Array<[number, number]>) => pts.map((p) => p.join(",")).join(" ");

export function MapaCaminhos({ className = "" }: { className?: string }) {
  return (
    <figure className={className}>
      <svg
        viewBox="0 0 600 660"
        role="img"
        aria-label="Mapa de las rutas de exportación de repuestos desde Brasil a todo Uruguay"
        className="h-auto w-full"
      >
        <defs>
          <linearGradient id="mcLand" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#0b4026" />
            <stop offset="1" stopColor="#06311c" />
          </linearGradient>
          <radialGradient id="mcNode" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#fde68a" />
            <stop offset="1" stopColor="#f59e0b" />
          </radialGradient>
          <filter id="mcGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <style>{`
            @keyframes mcDash { to { stroke-dashoffset: -160; } }
            @keyframes mcPulse { 0%,100% { opacity:.35; r:11 } 50% { opacity:0; r:20 } }
            .mc-flow { stroke-dasharray: 10 14; animation: mcDash 3s linear infinite; }
            @media (prefers-reduced-motion: reduce){ .mc-flow{ animation:none } .mc-pulse{ animation:none } }
          `}</style>
        </defs>

        {/* Tierra */}
        <path
          d={CONTORNO}
          fill="url(#mcLand)"
          stroke="#10b981"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Borde con Brasil (más grueso, ámbar) — NO y NE */}
        <path
          d="M94,24 L221,42 L324,107 L478,234 L565,327"
          fill="none"
          stroke="#f59e0b"
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* Rutas base + flujo animado */}
        {RUTAS.map((r, i) => (
          <g key={i}>
            <polyline
              points={poly(r)}
              fill="none"
              stroke="#34d399"
              strokeWidth="2.5"
              opacity="0.4"
            />
            <polyline
              points={poly(r)}
              fill="none"
              stroke="#a7f3d0"
              strokeWidth="2.5"
              className="mc-flow"
            />
          </g>
        ))}

        {/* Ciudades */}
        {CIUDADES.map((c) => (
          <g key={c.n}>
            <circle cx={c.x} cy={c.y} r="4.5" fill="#ecfdf5" stroke="#059669" strokeWidth="1.5" />
            <text x={c.x + 8} y={c.y + 4} fill="#d1fae5" fontSize="13" fontWeight="600">
              {c.n}
            </text>
          </g>
        ))}

        {/* Montevideo (capital, destacada) */}
        <g>
          <circle cx={MVD.x} cy={MVD.y} r="7" fill="#fff" stroke="#047857" strokeWidth="2" />
          <text x={MVD.x + 11} y={MVD.y + 5} fill="#fff" fontSize="15" fontWeight="800">
            {MVD.n}
          </text>
        </g>

        {/* Pasos de frontera */}
        {FRONTERAS.map((f) => (
          <g key={f.k}>
            <circle
              className="mc-pulse"
              cx={f.x}
              cy={f.y}
              r="11"
              fill="#f59e0b"
              style={{ animation: "mcPulse 2.6s ease-in-out infinite" }}
            />
            <circle cx={f.x} cy={f.y} r="7" fill="url(#mcNode)" filter="url(#mcGlow)" />
            <text
              x={f.x + (f.x > 520 ? -12 : 11)}
              y={f.y + 4}
              textAnchor={f.x > 520 ? "end" : "start"}
              fill="#fde68a"
              fontSize="13.5"
              fontWeight="800"
            >
              {f.n}
            </text>
          </g>
        ))}
      </svg>

      <figcaption className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-white/70">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400" /> Paso de frontera
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5 text-emerald-300" /> Ciudad de destino
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-6 bg-emerald-300" /> Ruta de despacho
        </span>
      </figcaption>
    </figure>
  );
}
