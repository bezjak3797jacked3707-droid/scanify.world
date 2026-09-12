"use client";

import { useEffect, useRef, useState } from "react";

// Three generic silhouette variants (Option B) — fallback for when real
// outline detection isn't available yet, or found too little contrast
// against the background. Picked by the photo's own aspect ratio.
const SHAPE_WIDE = [
    [18, 55], [22, 42], [30, 34], [42, 30], [50, 29], [58, 30], [66, 33],
    [74, 38], [80, 46], [84, 55], [86, 62], [82, 66], [78, 68], [70, 70],
    [70, 74], [64, 76], [60, 74], [58, 70], [42, 70], [40, 74], [34, 76],
    [30, 74], [30, 70], [22, 68], [17, 63],
  ];

const SHAPE_TALL = [
  [50, 12], [58, 15], [63, 22], [65, 32], [64, 44], [67, 52], [68, 62],
  [66, 72], [62, 80], [58, 86], [52, 90], [46, 88], [42, 82], [40, 74],
  [38, 64], [40, 54], [37, 44], [36, 32], [39, 21], [44, 14],
];

const SHAPE_ROUND = [
  [50, 10], [62, 13], [72, 20], [79, 30], [83, 42], [83, 55], [79, 67],
  [72, 77], [62, 84], [50, 87], [38, 84], [28, 77], [21, 67], [17, 55],
  [17, 42], [21, 30], [28, 20], [38, 13],
];

type Variant = "wide" | "tall" | "round";

function pickVariant(naturalWidth: number, naturalHeight: number): Variant {
  const ratio = naturalWidth / naturalHeight;
  if (ratio > 1.15) return "wide";
  if (ratio < 0.85) return "tall";
  return "round";
}

function pointsToPath(points: number[][]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ") + " Z";
}

interface ScanningOverlayProps {
  imageUrl: string;
}

export default function ScanningOverlay({ imageUrl }: ScanningOverlayProps) {
  const [variant, setVariant] = useState<Variant>("round");
  const [realPoints, setRealPoints] = useState<number[][] | null>(null);
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const pathRef = useRef<SVGPathElement>(null);
  const [pathLength, setPathLength] = useState(0);

  useEffect(() => {
    // Pick up a real, already-extracted outline if the background detection
    // (triggered the moment the photo was selected on the scan page) finished
    // in time. If it's missing, malformed, or never ran, fall back silently
    // to the generic silhouette — this must never throw or block rendering.
    try {
      const stored = sessionStorage.getItem("scanify_outline");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRealPoints(parsed);
        }
      }
    } catch {
      // Ignore — generic fallback below handles this case
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mq.matches);
    const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener("change", listener);
    return () => mq.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength());
    }
  }, [variant, realPoints]);

  function handleImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    setVariant(pickVariant(img.naturalWidth, img.naturalHeight));
    setReady(true);
  }

  // Real detected outline takes priority whenever it's available.
  const points = realPoints ?? (variant === "wide" ? SHAPE_WIDE : variant === "tall" ? SHAPE_TALL : SHAPE_ROUND);
  const pathD = pointsToPath(points);
  const nodeCount = points.length;
  const drawDuration = 1.6;
  const staggerStep = drawDuration / nodeCount;

  return (
    <div className="relative w-full h-full overflow-hidden rounded-2xl">
      <img
        src={imageUrl}
        alt="Scanning..."
        onLoad={handleImageLoad}
        className="w-full h-full object-cover"
        style={{ filter: "brightness(0.85)" }}
      />

      {/* Corner brackets */}
      <span className="absolute top-3 left-3 w-8 h-8 border-t-[3px] border-l-[3px] rounded-tl-lg pointer-events-none" style={{ borderColor: "#7c3aed" }} />
      <span className="absolute top-3 right-3 w-8 h-8 border-t-[3px] border-r-[3px] rounded-tr-lg pointer-events-none" style={{ borderColor: "#7c3aed" }} />
      <span className="absolute bottom-3 left-3 w-8 h-8 border-b-[3px] border-l-[3px] rounded-bl-lg pointer-events-none" style={{ borderColor: "#7c3aed" }} />
      <span className="absolute bottom-3 right-3 w-8 h-8 border-b-[3px] border-r-[3px] rounded-br-lg pointer-events-none" style={{ borderColor: "#7c3aed" }} />

      {/* Bouncing sweep line, top to bottom and back */}
      {!reducedMotion && (
        <div
          className="absolute left-0 right-0 pointer-events-none"
          style={{
            top: "-5%",
            height: 3,
            background: "linear-gradient(90deg, transparent 0%, #7c3aed 20%, #a78bfa 50%, #7c3aed 80%, transparent 100%)",
            boxShadow: "0 0 12px 3px rgba(124,58,237,0.8), 0 0 24px 6px rgba(124,58,237,0.4)",
            animation: "scan-sweep 2.4s ease-in-out infinite",
          }}
        />
      )}

      {ready && (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
          style={{ overflow: "visible" }}
        >
          <defs>
            <filter id="scan-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <path
            ref={pathRef}
            d={pathD}
            fill="none"
            stroke="#7c3aed"
            strokeWidth={reducedMotion ? 0.6 : 0.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#scan-glow)"
            opacity={0.85}
            style={
              reducedMotion || pathLength === 0
                ? {}
                : {
                    strokeDasharray: pathLength,
                    strokeDashoffset: 0,
                    animation: `scan-stitch ${drawDuration}s ease-out forwards`,
                  }
            }
          />

          {!reducedMotion && pathLength > 0 && (
            <path
              d={pathD}
              fill="none"
              stroke="#c4b5fd"
              strokeWidth="0.9"
              strokeLinecap="round"
              filter="url(#scan-glow)"
              style={{
                strokeDasharray: `${pathLength * 0.12} ${pathLength * 0.88}`,
                animation: `scan-travel 5s linear ${drawDuration}s infinite`,
              }}
            />
          )}

          {points.map(([x, y], i) => (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={reducedMotion ? 1.3 : 1.1}
              fill="#a78bfa"
              opacity={reducedMotion ? 0.9 : 0}
              filter="url(#scan-glow)"
              style={
                reducedMotion
                  ? { opacity: 0.9 }
                  : {
                      transformBox: "fill-box",
                      transformOrigin: "center",
                      animation: `scan-node-pop 0.3s ease-out ${i * staggerStep}s forwards`,
                    }
              }
            />
          ))}
        </svg>
      )}
    </div>
  );
}