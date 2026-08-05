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
    <div style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, padding: "8px 14px" }}>
      <p style={{ color: "var(--color-gold)", fontSize: 11, marginBottom: 2 }}>{label}</p>
      <p style={{ color: "var(--color-text-primary)", fontSize: 15, fontWeight: 600 }}>${payload[0].value.toLocaleString()}</p>
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
      <p className="text-xs uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>{label}</p>
      {children}
    </div>
  );
}

const FAST_LOADING_MESSAGES = [
  "Scanning resell markets…",
  "Identifying item…",
  "Checking eBay sold listings…",
  "Comparing platform prices…",
  "Analyzing market demand…",
  "Calculating best price…",
  "Reviewing price history…",
  "Almost there…",
];

const DEEP_LOADING_MESSAGES = [
  "Identifying item…",
  "Searching live listings…",
  "Checking eBay sold prices…",
  "Checking StockX and GOAT…",
  "Cross-referencing platforms…",
  "Verifying real sold prices…",
  "Compiling sourced data…",
  "Almost there…",
];

function ResellLoadingMessage({ deep }: { deep: boolean }) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const messages = deep ? DEEP_LOADING_MESSAGES : FAST_LOADING_MESSAGES;

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % messages.length);
        setVisible(true);
      }, 300);
    }, 2000);
    return () => clearInterval(interval);
  }, [messages]);

  return (
    <p className="text-sm uppercase tracking-widest transition-opacity duration-300" style={{ color: "var(--color-gold)", opacity: visible ? 1 : 0 }}>
      {messages[index]}
    </p>
  );
}

export default function ResellResultContent() {
  const router = useRouter();
  const [result, setResult] = useState<any>(null);
  const [imageUrlState, setImageUrlState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [preferredPlatform, setPreferredPlatform] = useState("eBay");
  const [isSharing, setIsSharing] = useState(false);
  const [wasDeepResearch, setWasDeepResearch] = useState(false);

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams(window.location.search);
      const imageUrl = params.get("imageUrl");
      const userId = params.get("userId");
      const platform = params.get("platform") || "eBay";
      const scanId = params.get("scanId");
      const requestDeepResearch = params.get("deepResearch") === "true";

      setPreferredPlatform(platform);
      setWasDeepResearch(requestDeepResearch);

      if (scanId) {
        try {
          const { data } = await supabase.from("scan_results").select("full_result, image_url").eq("id", scanId).single();
          if (data?.full_result) {
            setResult(data.full_result);
            setImageUrlState(data.image_url);
            setPreferredPlatform(data.full_result.platforms?.[0]?.name || "eBay");
            setWasDeepResearch(!!data.full_result.isDeepResearch);
            setLoading(false);
            return;
          }
        } catch {
          setError("Could not load scan.");
          setLoading(false);
          return;
        }
      }

      setImageUrlState(imageUrl);
      if (!imageUrl) { setError("No image provided."); setLoading(false); return; }

      try {
        const res = await fetch("/api/resell", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl, userId, preferredPlatform: platform, deepResearch: requestDeepResearch }),
        });
        const data = await res.json();
        if (data.error === "inappropriate_content") { setError("This item cannot be scanned."); setLoading(false); return; }
        if (data.error === "buildings_not_supported") { setError("Buildings cannot be scanned."); setLoading(false); return; }
        if (data.error === "image_unclear") { setError("Image is too unclear. Please take a clearer photo."); setLoading(false); return; }
        if (data.error === "scan_limit_reached") { setError("You've used your free scans. Upgrade to Pro for more."); setLoading(false); return; }
        if (!res.ok) throw new Error("Analysis failed");
        setResult(data);
        setWasDeepResearch(!!data.isDeepResearch);
      } catch {
        setError("Could not analyze image. Please try again.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleShare() {
    if (!result) return;
    setIsSharing(true);
    try {
      const bestPrice = Number(String(result.bestPrice).replace(/[^0-9.]/g, "")).toLocaleString();
      if (navigator.share) {
        await navigator.share({
          title: `${result.name} — Scanify Resell`,
          text: `I just scanned a ${result.name} on Scanify — best resell price is $${bestPrice}!`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        alert("Link copied to clipboard!");
      }
    } catch (err) {
      console.error("Share failed:", err);
    } finally {
      setIsSharing(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center gap-8" style={{ background: "var(--color-black)" }}>
        <div className="flex gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: 3, background: "#7c3aed", animation: `pulse-block 1.2s ease-in-out ${i * 0.15}s infinite` }} />
          ))}
        </div>
        <ResellLoadingMessage deep={wasDeepResearch} />
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
    <main className="min-h-screen pb-24" style={{ background: "var(--color-black)", color: "var(--color-text-primary)" }}>
      <div className="flex flex-col gap-5 px-5 py-6">

        {imageUrlState && (
          <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden">
            <img src={imageUrlState} alt="Scanned item" className="w-full h-full object-cover" />
          </div>
        )}

        {result && (
          <>
            {/* Honest data source badge */}
            <div
              className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-full self-center"
              style={{
                background: result.isDeepResearch ? "rgba(0,200,83,0.1)" : "rgba(245,158,11,0.08)",
                border: result.isDeepResearch ? "1px solid rgba(0,200,83,0.3)" : "1px solid rgba(245,158,11,0.25)",
              }}
            >
              <span style={{ fontSize: 12 }}>{result.isDeepResearch ? "✓" : "~"}</span>
              <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: result.isDeepResearch ? "#00C853" : "#F59E0B" }}>
                {result.isDeepResearch ? "Verified via live search" : "Estimated pricing"}
              </span>
            </div>

            <h1 className="text-4xl text-center leading-tight" style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}>
              {result.name}
            </h1>

            <div className="grid grid-cols-2 gap-3">
              <StatCard label="Quick Sale">
                <p className="text-xl font-bold" style={{ color: "#F59E0B" }}>${Number(String(result.quickSalePrice).replace(/[^0-9.]/g, "")).toLocaleString()}</p>
                <p className="text-xs" style={{ color: "var(--color-text-faint)" }}>24-48 hours</p>
              </StatCard>
              <StatCard label="Best Price">
                <p className="text-xl font-bold" style={{ color: "#00C853" }}>${Number(String(result.bestPrice).replace(/[^0-9.]/g, "")).toLocaleString()}</p>
                <p className="text-xs" style={{ color: "var(--color-text-faint)" }}>2-4 weeks</p>
              </StatCard>
              <StatCard label="Original Price">
                <p className="text-xl font-bold" style={{ color: "var(--color-text-primary)" }}>${Number(String(result.originalPrice).replace(/[^0-9.]/g, "")).toLocaleString()}</p>
              </StatCard>
              <StatCard label="Condition">
                <p className="text-xl font-bold" style={{ color: "var(--color-gold)" }}>{result.condition}</p>
              </StatCard>
            </div>

            {/* Share button */}
            <button
              onClick={handleShare}
              disabled={isSharing}
              className="w-full py-3 rounded-2xl font-semibold text-sm tracking-wider uppercase transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-gold)", color: "var(--color-gold)" }}
            >
              {isSharing ? "Sharing…" : "⬆ Share Result"}
            </button>

            {result.priceHistory?.length > 0 && (
              <div className="rounded-2xl p-4 pt-5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <h3 className="text-xs uppercase tracking-widest mb-4" style={{ color: "var(--color-gold)" }}>Resell Price History</h3>
                <div style={{ height: 168 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={result.priceHistory} margin={{ top: 5, right: 10, left: -14, bottom: 0 }}>
                      <XAxis dataKey="year" tick={{ fill: "var(--color-text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(value, index) => index === result.priceHistory.length - 1 ? "Now" : value} />
                      <YAxis tick={{ fill: "var(--color-text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`} />
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
                      <p className="font-semibold text-sm" style={{ color: "var(--color-text-primary)" }}>{platform.name}</p>
                      {platform.name === preferredPlatform && (
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(201,168,76,0.2)", color: "var(--color-gold)" }}>Preferred</span>
                      )}
                    </div>
                    <DemandBadge level={platform.demandLevel} />
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>Average</p>
                      <p className="text-sm font-bold" style={{ color: "#00C853" }}>${Number(String(platform.averagePrice).replace(/[^0-9.]/g, "")).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>Highest</p>
                      <p className="text-sm font-bold" style={{ color: "var(--color-gold)" }}>${Number(String(platform.highestSold).replace(/[^0-9.]/g, "")).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs mb-1" style={{ color: "var(--color-text-muted)" }}>Lowest</p>
                      <p className="text-sm font-bold" style={{ color: "#EF4444" }}>${Number(String(platform.lowestSold).replace(/[^0-9.]/g, "")).toLocaleString()}</p>
                    </div>
                  </div>

                  <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>💡 {platform.tips}</p>
                </div>
              ))}
            </div>

            <div className="rounded-2xl p-5 space-y-2" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <h3 className="text-xs uppercase tracking-widest" style={{ color: "var(--color-gold)" }}>Selling Tips</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{result.sellingTips}</p>
            </div>

            <div className="rounded-2xl p-5 space-y-2" style={{ background: "linear-gradient(135deg, rgba(27,77,62,0.3) 0%, var(--color-surface) 70%)", border: "1px solid var(--color-green)" }}>
              <h3 className="text-xs uppercase tracking-widest" style={{ color: "var(--color-gold)" }}>Best Time to Sell</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--color-text-secondary)" }}>{result.bestTimeToSell}</p>
            </div>
          </>
        )}

        <button onClick={() => router.push("/resell")} className="w-full py-4 rounded-2xl font-semibold text-base tracking-wider uppercase transition-opacity hover:opacity-80" style={{ background: "var(--color-green)", color: "var(--color-gold)" }}>
          Resell Another Item
        </button>

      </div>
    </main>
  );
}