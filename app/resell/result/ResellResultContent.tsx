"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#111111", border: "1px solid #1e1e1e", borderRadius: 10, padding: "8px 14px" }}>
      <p style={{ color: "#C9A84C", fontSize: 11, marginBottom: 2 }}>{label}</p>
      <p style={{ color: "#ededed", fontSize: 15, fontWeight: 600 }}>${payload[0].value.toLocaleString()}</p>
    </div>
  );
}

function DemandBadge({ level }: { level: string }) {
  const color = level === "High" ? "#00C853" : level === "Medium" ? "#F59E0B" : "#EF4444";
  const bg = level === "High" ? "rgba(0,200,83,0.1)" : level === "Medium" ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)";
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: bg, color }}>
      {level} Demand
    </span>
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

export default function ResellResultContent() {
  const router = useRouter();

  const [result, setResult] = useState<any>(null);
  const [imageUrlState, setImageUrlState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preferredPlatform, setPreferredPlatform] = useState("eBay");

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams(window.location.search);
      const imageUrl = params.get("imageUrl");
      const userId = params.get("userId");
      const platform = params.get("platform") || "eBay";
      const scanId = params.get("scanId");

      setPreferredPlatform(platform);

      // Loading from history
      if (scanId) {
        try {
          const { data } = await supabase
            .from("scan_results")
            .select("full_result, image_url")
            .eq("id", scanId)
            .single();

          if (data?.full_result) {
            setResult(data.full_result);
            setImageUrlState(data.image_url);
            setPreferredPlatform(data.full_result.platforms?.[0]?.name || "eBay");
            setLoading(false);
            return;
          }
        } catch {
          setError("Could not load scan.");
          setLoading(false);
          return;
        }
      }

      // Fresh scan
      setImageUrlState(imageUrl);

      if (!imageUrl) {
        setError("No image provided.");
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/resell", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl, userId, preferredPlatform: platform }),
        });

        const data = await res.json();

        if (data.error === "inappropriate_content") { setError("This item cannot be scanned. Scanify does not support inappropriate content."); setLoading(false); return; }
        if (data.error === "buildings_not_supported") { setError("Buildings cannot be scanned. Scanify is for physical objects only."); setLoading(false); return; }
        if (data.error === "image_unclear") { setError("Image is too unclear. Please take a clearer photo."); setLoading(false); return; }
        if (data.error === "scan_limit_reached") { setError("You've used your free scans. Upgrade to Pro for more."); setLoading(false); return; }
        if (!res.ok) throw new Error("Analysis failed");

        setResult(data);
      } catch {
        setError("Could not analyze image. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-8" style={{ background: "var(--color-black)" }}>
        <div className="flex gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: 3, background: "#7c3aed", animation: `pulse-block 1.2s ease-in-out ${i * 0.15}s infinite` }} />
          ))}
        </div>
        <p className="text-sm uppercase tracking-widest" style={{ color: "var(--color-gold)" }}>
  Scanning resell markets…
</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--color-black)" }}>
        <div className="text-center space-y-4">
          <p className="text-red-400 text-sm">{error}</p>
          <button onClick={() => router.push("/resell")} className="px-6 py-3 rounded-xl font-semibold text-sm" style={{ background: "var(--color-green)", color: "var(--color-gold)" }}>
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24" style={{ background: "var(--color-black)", color: "#ededed" }}>
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
              <StatCard label="Quick Sale">
                <p className="text-xl font-bold" style={{ color: "#F59E0B" }}>
                  ${Number(String(result.quickSalePrice).replace(/[^0-9.]/g, "")).toLocaleString()}
                </p>
                <p className="text-xs" style={{ color: "#444" }}>24-48 hours</p>
              </StatCard>

              <StatCard label="Best Price">
                <p className="text-xl font-bold" style={{ color: "#00C853" }}>
                  ${Number(String(result.bestPrice).replace(/[^0-9.]/g, "")).toLocaleString()}
                </p>
                <p className="text-xs" style={{ color: "#444" }}>2-4 weeks</p>
              </StatCard>

              <StatCard label="Original Price">
                <p className="text-xl font-bold" style={{ color: "#ededed" }}>
                  ${Number(String(result.originalPrice).replace(/[^0-9.]/g, "")).toLocaleString()}
                </p>
              </StatCard>

              <StatCard label="Condition">
                <p className="text-xl font-bold" style={{ color: "var(--color-gold)" }}>{result.condition}</p>
              </StatCard>
            </div>

            {result.priceHistory?.length > 0 && (
              <div className="rounded-2xl p-4 pt-5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <h3 className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--color-gold)" }}>Resell Price History</h3>
                <div style={{ height: 168 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={result.priceHistory} margin={{ top: 5, right: 10, left: -14, bottom: 0 }}>
                      <XAxis dataKey="year" tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value, index) => index === result.priceHistory.length - 1 ? "Now" : value} />
                      <YAxis tick={{ fill: "#555", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
                      <Tooltip content={<ChartTooltip />} />
                      <Area type="monotone" dataKey="price" stroke="#C9A84C" strokeWidth={2.5} fill="#C9A84C" fillOpacity={0.1} dot={false} isAnimationActive={true} animationDuration={1500} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--color-gold)" }}>Platform Breakdown</p>
              {result.platforms?.map((platform: any, index: number) => (
                <div
                  key={index}
                  className="rounded-2xl p-4 space-y-3"
                  style={{
                    background: platform.name === preferredPlatform ? "linear-gradient(135deg, rgba(201,168,76,0.1) 0%, var(--color-surface) 70%)" : "var(--color-surface)",
                    border: platform.name === preferredPlatform ? "1px solid rgba(201,168,76,0.4)" : "1px solid var(--color-border)",
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{platform.name}</p>
                      {platform.name === preferredPlatform && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(201,168,76,0.2)", color: "var(--color-gold)" }}>
                          Preferred
                        </span>
                      )}
                    </div>
                    <DemandBadge level={platform.demandLevel} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs mb-1" style={{ color: "#555" }}>Average</p>
                      <p className="text-sm font-bold" style={{ color: "#00C853" }}>
                        ${Number(String(platform.averagePrice).replace(/[^0-9.]/g, "")).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs mb-1" style={{ color: "#555" }}>Highest</p>
                      <p className="text-sm font-bold" style={{ color: "var(--color-gold)" }}>
                        ${Number(String(platform.highestSold).replace(/[^0-9.]/g, "")).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs mb-1" style={{ color: "#555" }}>Lowest</p>
                      <p className="text-sm font-bold" style={{ color: "#EF4444" }}>
                        ${Number(String(platform.lowestSold).replace(/[^0-9.]/g, "")).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs" style={{ color: "#666" }}>💡 {platform.tips}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl p-5 space-y-2" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <h3 className="text-xs uppercase tracking-widest" style={{ color: "var(--color-gold)" }}>Selling Tips</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#aaa" }}>{result.sellingTips}</p>
            </div>

            <div className="rounded-2xl p-5 space-y-2" style={{ background: "linear-gradient(135deg, rgba(27,77,62,0.3) 0%, var(--color-surface) 70%)", border: "1px solid var(--color-green)" }}>
              <h3 className="text-xs uppercase tracking-widest" style={{ color: "var(--color-gold)" }}>Best Time to Sell</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#aaa" }}>{result.bestTimeToSell}</p>
            </div>
          </>
        )}

        <button
          onClick={() => router.push("/resell")}
          className="w-full py-4 rounded-2xl font-semibold text-base tracking-wider uppercase transition-opacity hover:opacity-80"
          style={{ background: "var(--color-green)", color: "var(--color-gold)" }}
        >
          Scan Another Item
        </button>

      </div>
    </main>
  );
}