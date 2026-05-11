"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface PricePoint {
  year: string;
  price: number;
}

interface ScanResult {
  name: string;
  currentValue: string;
  originalPrice: string;
  category: string;
  confidence: string;
  description: string;
  materials: string;
  specs: string;
  priceHistory?: PricePoint[];
}

const CONFETTI = [
  { tx: "-95px", ty: "-105px", color: "#C9A84C", delay: "0ms",   size: 8 },
  { tx:  "95px", ty: "-105px", color: "#00C853", delay: "40ms",  size: 6 },
  { tx: "-135px",ty:  "-55px", color: "#7c3aed", delay: "80ms",  size: 7 },
  { tx:  "135px",ty:  "-55px", color: "#ffffff", delay: "120ms", size: 5 },
  { tx:  "-60px",ty: "-140px", color: "#C9A84C", delay: "40ms",  size: 6 },
  { tx:   "60px",ty: "-140px", color: "#00C853", delay: "90ms",  size: 8 },
  { tx: "-115px",ty:  "-85px", color: "#7c3aed", delay: "0ms",   size: 5 },
  { tx:  "115px",ty:  "-85px", color: "#C9A84C", delay: "160ms", size: 7 },
  { tx:  "-42px",ty: "-158px", color: "#00C853", delay: "120ms", size: 6 },
  { tx:   "42px",ty: "-158px", color: "#7c3aed", delay: "60ms",  size: 8 },
  { tx: "-158px",ty:  "-42px", color: "#ffffff", delay: "100ms", size: 5 },
  { tx:  "158px",ty:  "-42px", color: "#C9A84C", delay: "140ms", size: 7 },
  { tx:  "-78px",ty: "-125px", color: "#00C853", delay: "20ms",  size: 6 },
  { tx:   "78px",ty: "-125px", color: "#7c3aed", delay: "70ms",  size: 5 },
  { tx: "-125px",ty:  "-75px", color: "#C9A84C", delay: "180ms", size: 8 },
  { tx:  "125px",ty:  "-75px", color: "#ffffff", delay: "50ms",  size: 6 },
];

function ConfettiBurst({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20, overflow: "visible" }}>
      <div className="absolute left-1/2 top-1/2" style={{ transform: "translate(-50%,-50%)" }}>
        {CONFETTI.map((p, i) => (
          <span
            key={i}
            className="absolute rounded-sm"
            style={{
              width: p.size,
              height: p.size,
              background: p.color,
              animationName: "confetti-burst",
              animationDuration: "0.85s",
              animationTimingFunction: "ease-out",
              animationDelay: p.delay,
              animationFillMode: "forwards",
              "--tx": p.tx,
              "--ty": p.ty,
            } as React.CSSProperties}
          />
        ))}
      </div>
    </div>
  );
}

function TrophyIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M6 3h12v7a6 6 0 01-12 0V3z" stroke="#C9A84C" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M6 6H3v2a3 3 0 003 3M18 6h3v2a3 3 0 01-3 3" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 16v3M8 22h8" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#111111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "8px 14px" }}>
      <p style={{ color: "#C9A84C", fontSize: 11, marginBottom: 2 }}>{label}</p>
      <p style={{ color: "#ededed", fontSize: 15, fontWeight: 600 }}>${payload[0].value.toLocaleString()}</p>
    </div>
  );
}

function StatCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4 flex flex-col gap-1.5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
      <p className="text-xs uppercase tracking-widest" style={{ color: "#555" }}>{label}</p>
      {children}
    </div>
  );
}

function InfoCard({ label, content }: { label: string; content: string }) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
      <h3 className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--color-gold)" }}>{label}</h3>
      <p className="text-sm leading-relaxed" style={{ color: "#aaa" }}>{content}</p>
    </div>
  );
}

export default function ResultContent() {
  const router = useRouter();

  const [imageUrlState, setImageUrlState] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [chartDrawn, setChartDrawn] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const imageUrlParam = params.get("imageUrl");
    const scanId = params.get("scanId");

    if (scanId) {
      async function loadFromDb() {
        try {
          const { data, error } = await supabase
            .from("scan_results")
            .select("full_result, image_url")
            .eq("id", scanId)
            .single();

          if (error) throw new Error("Not found");

          if (data?.full_result) {
            setResult(data.full_result);
            setImageUrlState(data.image_url);
            setTimeout(() => setChartDrawn(true), 1700);
            setLoading(false);
          } else if (data?.image_url) {
            const res = await fetch("/api/analyze", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imageUrl: data.image_url }),
            });
            if (!res.ok) throw new Error("Analysis failed");
            const result = await res.json();
            setResult(result);
            setImageUrlState(data.image_url);
            setTimeout(() => setShowConfetti(true), 200);
            setTimeout(() => setShowConfetti(false), 1200);
            setTimeout(() => setChartDrawn(true), 1700);
            setLoading(false);
          }
        } catch {
          setError("Could not load scan.");
          setLoading(false);
        }
      }
      loadFromDb();
      return;
    }

    if (!imageUrlParam) {
      setLoading(false);
      return;
    }

    async function analyze() {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            imageUrl: imageUrlParam,
            userId: params.get("userId"),
            note: params.get("note"),
            displayName: params.get("displayName"),
          }),
        });
        if (!res.ok) throw new Error("Analysis failed");
        const data = await res.json();
        setResult(data);
        setImageUrlState(imageUrlParam);
        setTimeout(() => setShowConfetti(true), 200);
        setTimeout(() => setShowConfetti(false), 1200);
        setTimeout(() => setChartDrawn(true), 1700);
      } catch {
        setError("Could not analyze image. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    analyze();
  }, []);

  const confidenceNum = parseInt(result?.confidence ?? "0", 10);

  const confidenceStyle = useMemo(() => {
    if (confidenceNum >= 80) return { color: "#00C853", textShadow: "0 0 10px #00C853, 0 0 20px rgba(0,200,83,0.4)" };
    if (confidenceNum >= 50) return { color: "#F59E0B", textShadow: "0 0 10px #F59E0B, 0 0 20px rgba(245,158,11,0.4)" };
    return { color: "#EF4444", textShadow: "0 0 10px #EF4444, 0 0 20px rgba(239,68,68,0.4)" };
  }, [confidenceNum]);

  const rankPercent = useMemo(() => {
    if (!result) return 5;
    return Math.max(1, Math.min(25, Math.round((100 - confidenceNum) / 4 + 1)));
  }, [result, confidenceNum]);

  const priceHistory = result?.priceHistory ?? [];

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-8" style={{ background: "var(--color-black)" }}>
        <div className="flex gap-3 items-end justify-center" style={{ height: 48 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: 3, background: "#7c3aed", animation: `pulse-block 1.2s ease-in-out ${i * 0.15}s infinite` }} />
          ))}
        </div>
        <p className="text-sm uppercase tracking-widest" style={{ color: "var(--color-gold)" }}>Analyzing your item…</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--color-black)" }}>
        <div className="text-center space-y-4">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={() => router.push("/scan")} className="px-6 py-3 rounded-xl font-semibold text-sm" style={{ background: "var(--color-green)", color: "var(--color-gold)" }}>
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-10" style={{ background: "var(--color-black)", color: "#ededed" }}>
      <div className="flex flex-col gap-5 px-5 py-6">

        {imageUrlState && (
          <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden">
            <img src={imageUrlState} alt="Scanned item" className="w-full h-full object-cover" />
          </div>
        )}

        {result && (
          <>
            <h1 className="text-4xl text-center leading-tight" style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}>
              {result.name}
            </h1>

            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Current Value">
                <div className="relative" style={{ overflow: "visible" }}>
                  <ConfettiBurst active={showConfetti} />
                  <p className="text-xl font-bold" style={{ color: "#00C853", animation: "price-glow-pulse 2.5s ease-in-out infinite", textShadow: "0 0 10px #00C853, 0 0 20px rgba(0,200,83,0.4)" }}>
                    {"$" + String(result.currentValue).replace("$", "")}
                  </p>
                </div>
              </StatCard>

              <StatCard label="Original Price">
                <p className="text-xl font-bold" style={{ color: "#00C853" }}>
                  {"$" + String(result.originalPrice).replace("$", "")}
                </p>
              </StatCard>

              <StatCard label="Confidence">
                <p className="text-xl font-bold" style={confidenceStyle}>
                  {result.confidence}%
                </p>
                {confidenceNum < 50 && (
                  <p className="text-xs leading-snug mt-0.5" style={{ color: "#EF4444" }}>
                    We are not confident in this result, we apologize
                  </p>
                )}
              </StatCard>

              <StatCard label="Category">
                <p className="text-xl font-bold" style={{ color: "#ededed" }}>{result.category}</p>
              </StatCard>
            </div>

            {priceHistory.length > 0 && (
              <div className="rounded-2xl p-4 pt-5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <h3 className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--color-gold)" }}>Price History</h3>
                <div className={`relative ${chartDrawn ? "chart-flicker" : ""}`} style={{ height: 168 }}>
                  {!chartDrawn && (
                    <div className="absolute pointer-events-none" style={{ top: 0, bottom: 28, left: 36, right: 10, zIndex: 5 }}>
                      <div style={{ position: "absolute", top: "50%", width: 18, height: 18, borderRadius: "50%", background: "radial-gradient(circle, #7c3aed 30%, transparent 80%)", boxShadow: "0 0 18px 10px rgba(124,58,237,0.75)", transform: "translate(-50%, -50%)", animation: "leading-edge-move 1.5s linear forwards" }} />
                    </div>
                  )}
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={priceHistory} margin={{ top: 5, right: 10, left: -14, bottom: 0 }}>
                      <XAxis dataKey="year" tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="price" stroke="#7c3aed" strokeWidth={2.5} fill="#7c3aed" fillOpacity={0.1} dot={false} isAnimationActive={true} animationDuration={1500} animationEasing="ease-out" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: "linear-gradient(135deg, rgba(27,77,62,0.6) 0%, var(--color-surface) 70%)", border: "1px solid var(--color-green)" }}>
              <div className="w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.4)" }}>
                <TrophyIcon />
              </div>
              <div>
                <p className="text-xs uppercase tracking-widest" style={{ color: "var(--color-gold)" }}>Leaderboard</p>
                <p className="text-lg font-bold mt-0.5">Top {rankPercent}% by Value</p>
                <p className="text-xs" style={{ color: "#666" }}>Across all {result.category} scans</p>
              </div>
            </div>

            <InfoCard label="Details" content={result.description} />
            <InfoCard label="Materials" content={result.materials} />
            <InfoCard label="Specs" content={result.specs} />
          </>
        )}

        <button onClick={() => router.push("/scan")} className="w-full py-4 rounded-2xl font-semibold text-base tracking-wider uppercase transition-opacity hover:opacity-80" style={{ background: "var(--color-green)", color: "var(--color-gold)" }}>
          Scan Another Item
        </button>

      </div>
    </main>
  );
}