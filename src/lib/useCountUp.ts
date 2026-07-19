import { useEffect, useRef, useState } from "react";

export function useCountUp(value: number | null | undefined, durationMs = 650) {
  const [display, setDisplay] = useState(value ?? 0);
  const prevRef = useRef(value ?? 0);

  useEffect(() => {
    if (value == null) return;
    const from = prevRef.current;
    const to = value;
    if (from === to) {
      setDisplay(to);
      return;
    }

    const start = window.performance.now();
    let frame: number;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / durationMs);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
      }
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [value, durationMs]);

  return value == null ? null : display;
}
