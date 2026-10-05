import { Tractor, Car } from "lucide-react";

type Props = {
  onSelect: (s: "AGRICOLA" | "AUTOMOTIVA") => void;
};

export function WelcomePortal({ onSelect }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col md:flex-row bg-background animate-in fade-in duration-500">
      <button
        onClick={() => onSelect("AGRICOLA")}
        className="flex-1 relative group cursor-pointer overflow-hidden border-b md:border-b-0 md:border-r border-slate-800"
      >
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1592982537447-7440770cbfc9?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-30 transition-transform duration-700 group-hover:scale-110" />
        <div className="absolute inset-0 bg-slate-900/80 transition-colors group-hover:bg-slate-900/60" />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-white z-10">
          <Tractor className="w-20 h-20 mb-6 text-accent drop-shadow-lg transition-transform duration-500 group-hover:-translate-y-2" />
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tighter drop-shadow-md">
            LINHA AGRÍCOLA
          </h2>
          <p className="mt-4 text-slate-300 font-medium text-base md:text-xl drop-shadow-sm">
            Peças para Tratores e Máquinas Pesadas
          </p>
        </div>
      </button>

      <button
        onClick={() => onSelect("AUTOMOTIVA")}
        className="flex-1 relative group cursor-pointer overflow-hidden"
      >
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center opacity-40 transition-transform duration-700 group-hover:scale-110" />
        <div className="absolute inset-0 bg-slate-100/90 transition-colors group-hover:bg-white/80" />
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-slate-900 z-10">
          <Car className="w-20 h-20 mb-6 text-primary drop-shadow-md transition-transform duration-500 group-hover:-translate-y-2" />
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tighter drop-shadow-md">
            LINHA AUTOMOTIVA
          </h2>
          <p className="mt-4 text-slate-600 font-medium text-base md:text-xl drop-shadow-sm">
            Peças para Carros e Caminhonetes
          </p>
        </div>
      </button>

      {/* Absolute Center Divider Label */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 flex h-14 w-14 md:h-16 md:w-16 items-center justify-center rounded-full bg-background shadow-2xl border-4 border-background pointer-events-none">
        <span className="font-bold text-muted-foreground text-sm md:text-base">OU</span>
      </div>
    </div>
  );
}
