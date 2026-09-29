import { useEffect, useState } from "react";

export interface ElementSize {
  width: number;
  height: number;
}

/**
 * The size of the element given to the returned ref, kept current with a ResizeObserver. Where
 * there is no ResizeObserver (jsdom), it stays at `fallback`.
 */
export function useElementSize<T extends Element>(fallback: ElementSize) {
  const [element, setElement] = useState<T | null>(null);
  const [size, setSize] = useState<ElementSize>(fallback);

  useEffect(() => {
    if (!element || typeof ResizeObserver === "undefined") {
      return;
    }
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setSize(previous => (previous.width === width && previous.height === height ? previous : { width, height }));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return [setElement, size] as const;
}
