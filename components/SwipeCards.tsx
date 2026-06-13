"use client";

import { useRef, useState } from "react";

export default function SwipeCards({ children }: { children: React.ReactNode[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  function handleScroll() {
    const el = containerRef.current;
    if (!el || el.clientWidth === 0) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActive(Math.max(0, Math.min(children.length - 1, index)));
  }

  function goTo(i: number) {
    const el = containerRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }

  return (
    <div>
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar"
      >
        {children.map((child, i) => (
          <div key={i} className="snap-center shrink-0 w-full">
            {child}
          </div>
        ))}
      </div>
      {children.length > 1 && (
        <div className="flex justify-center items-center gap-1.5 mt-3">
          {children.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              aria-label={`Go to card ${i + 1}`}
              className="rounded-full transition-all"
              style={{
                width: active === i ? 18 : 6,
                height: 6,
                background: active === i ? "var(--color-gold)" : "var(--color-border)",
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
