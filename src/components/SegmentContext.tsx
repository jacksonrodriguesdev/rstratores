import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { linhaPermitida } from "@/lib/linhas";

type Segment = "AGRICOLA" | "AUTOMOTIVA";

type SegmentContextType = {
  segment: Segment;
  setSegment: (s: Segment) => void;
};

const SegmentContext = createContext<SegmentContextType | undefined>(undefined);

export function SegmentProvider({ children }: { children: ReactNode }) {
  const [segment, setSegmentState] = useState<Segment>("AGRICOLA");

  useEffect(() => {
    const saved = localStorage.getItem("store_segment") as Segment;
    if (saved === "AGRICOLA" || saved === "AUTOMOTIVA") {
      setSegmentState(linhaPermitida(saved));
    }
  }, []);

  const setSegment = (s: Segment) => {
    // Com a linha automotiva desligada, o segmento fica sempre em AGRICOLA.
    const linha = linhaPermitida(s);
    setSegmentState(linha);
    localStorage.setItem("store_segment", linha);
  };

  return (
    <SegmentContext.Provider value={{ segment, setSegment }}>{children}</SegmentContext.Provider>
  );
}

export function useSegment() {
  const context = useContext(SegmentContext);
  if (!context) {
    throw new Error("useSegment must be used within a SegmentProvider");
  }
  return context;
}
