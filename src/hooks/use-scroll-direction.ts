import { useEffect, useState } from "react";

// Estado de rolagem para o header dinâmico.
// `scrolled`: saiu do topo. `hidden`: rolando para baixo depois de `threshold` px.
export function useScrollDirection(threshold = 120) {
  const [state, setState] = useState({ scrolled: false, hidden: false });

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const update = () => {
      const y = window.scrollY;
      const delta = y - lastY;
      // Ignora micro-rolagens para o header não "piscar".
      if (Math.abs(delta) > 6) {
        setState({ scrolled: y > 8, hidden: delta > 0 && y > threshold });
        lastY = y;
      } else if (y <= 8) {
        setState({ scrolled: false, hidden: false });
      }
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);

  return state;
}
