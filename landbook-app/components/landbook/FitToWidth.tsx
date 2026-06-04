"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Scales its children down to fit the available width, the way a PDF page does:
 * the whole sheet shrinks uniformly so nothing reflows and nothing overflows.
 *
 * On screens at least DESIGN_WIDTH wide the children render completely untouched
 * (no width, no zoom), so the desktop layout is identical to having no wrapper.
 * Below that, `zoom` is used rather than `transform: scale` because zoom reflows
 * the layout box — so the surrounding flow takes the scaled size automatically,
 * with no height compensation or overflow clipping needed.
 */
const DESIGN_WIDTH = 800;

export function FitToWidth({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const update = () => {
      setZoom(Math.min(1, container.clientWidth / DESIGN_WIDTH));
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={containerRef}>
      <div style={zoom < 1 ? { width: DESIGN_WIDTH, zoom } : undefined}>
        {children}
      </div>
    </div>
  );
}
