import { useLayoutEffect, useState } from "react";

type Size = { width: number; height: number };

export function useResizeObserver(
  ref: React.RefObject<HTMLElement | null>
): Size {
  const [size, setSize] = useState<Size>({ width: 0, height: 0 });

  useLayoutEffect(() => {
    const el = ref?.current;
    if (!el) return;

    // Update immediately with current size
    const update = () => {
      const r = el.getBoundingClientRect();
      setSize({ width: Math.round(r.width), height: Math.round(r.height) });
    };
    update();

    // Use ResizeObserver when available
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const cr = entry.contentRect;
          setSize({
            width: Math.round(cr.width ?? el.getBoundingClientRect().width),
            height: Math.round(cr.height ?? el.getBoundingClientRect().height),
          });
        }
      });
      ro.observe(el);
      return () => ro.disconnect();
    }

    // Fallback to window resize if ResizeObserver is not present
    const onResize = () => update();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [ref]);

  return size;
}
