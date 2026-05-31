import { Suspense } from "react";
import ResellResultContent from "./ResellResultContent";

export default function ResellResultPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex flex-col items-center justify-center gap-8" style={{ background: "#0a0a0a" }}>
        <div className="flex gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: 3, background: "#7c3aed", animation: `pulse-block 1.2s ease-in-out ${i * 0.15}s infinite` }} />
          ))}
        </div>
        <p className="text-sm uppercase tracking-widest" style={{ color: "#C9A84C" }}>Scanning resell markets…</p>
      </main>
    }>
      <ResellResultContent />
    </Suspense>
  );
}