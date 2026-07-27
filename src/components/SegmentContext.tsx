import { createContext, useContext, useEffect, useState, ReactNode } from "react";

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
      setSegmentState(saved);
    }
  }, []);

  const setSegment = (s: Segment) => {
    setSegmentState(s);
    localStorage.setItem("store_segment", s);
  };

  return (
    <SegmentContext.Provider value={{ segment, setSegment }}>
      {children}
    </SegmentContext.Provider>
  );
}

export function useSegment() {
  const context = useContext(SegmentContext);
  if (!context) {
    throw new Error("useSegment must be used within a SegmentProvider");
  }
  return context;
}
