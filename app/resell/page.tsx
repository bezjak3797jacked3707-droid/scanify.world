"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

const PLATFORMS = [
  "eBay",
  "Facebook Marketplace",
  "Craigslist",
  "Blocket",
  "Vinted",
  "Depop",
  "StockX",
  "GOAT",
  "Chrono24",
  "Mobile.de",
];

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxSize = 1024;
      let width = img.width;
      let height = img.height;
      if (width > height && width > maxSize) { height = (height * maxSize) / width; width = maxSize; }
      else if (height > maxSize) { width = (width * maxSize) / height; height = maxSize; }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        resolve(new File([blob!], "resell.jpg", { type: "image/jpeg" }));
        URL.revokeObjectURL(url);
      }, "image/jpeg", 0.8);
    };
    img.src = url;
  });
}

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

export default function ResellPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [scansUsed, setScansUsed] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [preferredPlatform, setPreferredPlatform] = useState("eBay");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any>(null);

  const scanLimit = 3;

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase.from("profiles").select("scans_used, is_pro").eq("id", session.user.id).single()
          .then(({ data }) => {
            if (data) { setScansUsed(data.scans_used); setIsPro(data.is_pro); }
          });
      }
    });
  }, []);

  const limitReached = !isPro && scansUsed >= scanLimit;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setError("");
    setResult(null);
    e.target.value = "";
  }

  async function handleResellScan() {
    if (!file || !user) return;
    setIsLoading(true);
    setError("");

    try {
      const compressed = await compressImage(file);
      const fileName = `${Date.now()}.jpg`;
      const filePath = `uploads/resell_${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("scans")
        .upload(filePath, compressed, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("scans").getPublicUrl(filePath);

      const res = await fetch("/api/resell", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: data.publicUrl,
          userId: user.id,
          preferredPlatform,
        }),
      });

      const resData = await res.json();

      if (resData.error === "inappropriate_content") { setError("This item cannot be scanned."); setIsLoading(false); return; }
      if (resData.error === "buildings_not_supported") { setError("Buildings cannot be scanned."); setIsLoading(false); return; }
      if (resData.error === "image_unclear") { setError("Image is too unclear. Please take a clearer photo."); setIsLoading(false); return; }
      if (resData.error === "scan_limit_reached") { setError("You've used your free scans. Upgrade to Pro for more."); setIsLoading(false); return; }
      if (!res.ok) throw new Error("Analysis failed");

      setResult(resData);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  if (!user) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-4" style={{ background: "var(--color-black)" }}>
        <div className="rounded-2xl p-6 text-center space-y-3 w-full max-w-sm" style={{ background: "var(--color-surface)", border: "1px solid rgba(201,168,76,0.3)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--color-gold)" }}>Sign in to use Resell Scanner</p>
          <p className="text-xs" style={{ color: "#666" }}>Find out what your item is worth on resale platforms instantly.</p>
          <button onClick={() => router.push("/")} className="w-full py-2 rounded-xl text-sm font-semibold tracking-wider uppercase" style={{ background: "var(--color-green)", color: "var(--color-gold)" }}>
            Sign In
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24" style={{ background: "var(--color-black)", color: "#ededed" }}>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      <div className="max-w-md mx-auto px-5 py-8 space-y-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--color-gold)" }}>Resell Scanner</p>
          <h1 className="text-3xl" style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}>What's It Worth?</h1>
          <p className="text-xs" style={{ color: "#555" }}>Find the best price across reselling platforms</p>
        </div>

        {/* Platform selector */}
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest" style={{ color: "#555" }}>Preferred Platform</p>
          <div className="grid grid-cols-3 gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => setPreferredPlatform(p)}
                className="py-2 px-3 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: preferredPlatform === p ? "var(--color-green)" : "var(--color-surface)",
                  color: preferredPlatform === p ? "var(--color-gold)" : "#555",
                  border: "1px solid",
                  borderColor: preferredPlatform === p ? "var(--color-green)" : "var(--color-border)",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Upload area */}
        {!preview ? (
          <div
            onClick={() => !limitReached && fileInputRef.current?.click()}
            className="w-full rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-opacity hover:opacity-80"
            style={{
              background: "var(--color-surface)",
              border: "2px dashed var(--color-border)",
              minHeight: 180,
              opacity: limitReached ? 0.5 : 1,
            }}
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "var(--color-green)" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <line x1="12" y1="5" x2="12" y2="19" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="5" y1="12" x2="19" y2="12" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--color-gold)" }}>
              {limitReached ? "Upgrade to scan more" : "Tap to upload photo"}
            </p>
            {!limitReached && (
              <p className="text-xs" style={{ color: "#555" }}>
                {isPro ? "Unlimited scans" : `${scanLimit - scansUsed} free scan${scanLimit - scansUsed !== 1 ? "s" : ""} remaining`}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden">
              <img src={preview} alt="Item to resell" className="w-full h-full object-cover" />
            </div>
            <button
              onClick={() => { setPreview(null); setFile(null); setResult(null); }}
              className="text-xs uppercase tracking-widest self-end block ml-auto transition-opacity hover:opacity-70"
              style={{ color: "var(--color-gold)" }}
            >
              Change photo
            </button>
          </div>
        )}

        {/* Limit warning */}
        {limitReached && (
          <div className="rounded-2xl p-4 text-center space-y-3" style={{ background: "var(--color-surface)", border: "1px solid #7c3aed" }}>
            <p className="text-sm font-semibold" style={{ color: "#C9A84C" }}>You've used your {scanLimit} free scans</p>
            <p className="text-xs" style={{ color: "#666" }}>Upgrade to Pro for 200 scans per month</p>
            <button onClick={() => router.push("/pricing")} className="w-full py-2 rounded-xl text-sm font-semibold tracking-wider uppercase" style={{ background: "var(--color-green)", color: "var(--color-gold)" }}>
              Upgrade to Pro
            </button>
          </div>
        )}

        {/* Scan button */}
        {preview && !result && (
          <button
            onClick={handleResellScan}
            disabled={isLoading || limitReached}
            className="w-full py-4 rounded-2xl font-semibold text-base tracking-wider uppercase transition-opacity disabled:opacity-50"
            style={{ background: "var(--color-green)", color: "var(--color-gold)" }}
          >
            {isLoading ? "Analyzing…" : "Get Resell Value"}
          </button>
        )}

        {error && <p className="text-sm text-red-400 text-center">{error}</p>}

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <div className="flex gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: 3, background: "#7c3aed", animation: `pulse-block 1.2s ease-in-out ${i * 0.15}s infinite` }} />
              ))}
            </div>
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--color-gold)" }}>Scanning resell markets…</p>
          </div>
        )}

        {/* Results */}
        {result && !isLoading && (
          <div className="space-y-4">

            {/* Item name */}
            <h2 className="text-2xl text-center leading-tight" style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}>
              {result.name}
            </h2>

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#555" }}>Quick Sale</p>
                <p className="text-xl font-bold" style={{ color: "#F59E0B" }}>
                  ${Number(String(result.quickSalePrice).replace(/[^0-9.]/g, "")).toLocaleString()}
                </p>
                <p className="text-xs mt-1" style={{ color: "#444" }}>24-48 hours</p>
              </div>
              <div className="rounded-2xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#555" }}>Best Price</p>
                <p className="text-xl font-bold" style={{ color: "#00C853" }}>
                  ${Number(String(result.bestPrice).replace(/[^0-9.]/g, "")).toLocaleString()}
                </p>
                <p className="text-xs mt-1" style={{ color: "#444" }}>2-4 weeks</p>
              </div>
              <div className="rounded-2xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#555" }}>Original Price</p>
                <p className="text-xl font-bold" style={{ color: "#ededed" }}>
                  ${Number(String(result.originalPrice).replace(/[^0-9.]/g, "")).toLocaleString()}
                </p>
              </div>
              <div className="rounded-2xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
                <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "#555" }}>Condition</p>
                <p className="text-xl font-bold" style={{ color: "var(--color-gold)" }}>{result.condition}</p>
              </div>
            </div>

            {/* Price history graph */}
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

            {/* Platform breakdown */}
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--color-gold)" }}>Platform Breakdown</p>
              {result.platforms?.map((platform: any, index: number) => (
                <div
                  key={index}
                  className="rounded-2xl p-4 space-y-3"
                  style={{
                    background: platform.name === preferredPlatform
                      ? "linear-gradient(135deg, rgba(201,168,76,0.1) 0%, var(--color-surface) 70%)"
                      : "var(--color-surface)",
                    border: platform.name === preferredPlatform
                      ? "1px solid rgba(201,168,76,0.4)"
                      : "1px solid var(--color-border)",
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

                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center">
                      <p className="text-xs" style={{ color: "#555" }}>Average</p>
                      <p className="text-sm font-bold" style={{ color: "#00C853" }}>
                        ${Number(String(platform.averagePrice).replace(/[^0-9.]/g, "")).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs" style={{ color: "#555" }}>Highest</p>
                      <p className="text-sm font-bold" style={{ color: "var(--color-gold)" }}>
                        ${Number(String(platform.highestSold).replace(/[^0-9.]/g, "")).toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs" style={{ color: "#555" }}>Lowest</p>
                      <p className="text-sm font-bold" style={{ color: "#EF4444" }}>
                        ${Number(String(platform.lowestSold).replace(/[^0-9.]/g, "")).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <p className="text-xs" style={{ color: "#666" }}>💡 {platform.tips}</p>
                </div>
              ))}
            </div>

            {/* Selling tips */}
            <div className="rounded-2xl p-5 space-y-2" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <h3 className="text-xs uppercase tracking-widest" style={{ color: "var(--color-gold)" }}>Selling Tips</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#aaa" }}>{result.sellingTips}</p>
            </div>

            {/* Best time to sell */}
            <div className="rounded-2xl p-5 space-y-2" style={{ background: "linear-gradient(135deg, rgba(27,77,62,0.3) 0%, var(--color-surface) 70%)", border: "1px solid var(--color-green)" }}>
              <h3 className="text-xs uppercase tracking-widest" style={{ color: "var(--color-gold)" }}>Best Time to Sell</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#aaa" }}>{result.bestTimeToSell}</p>
            </div>

            {/* Scan again */}
            <button
              onClick={() => { setPreview(null); setFile(null); setResult(null); }}
              className="w-full py-4 rounded-2xl font-semibold text-base tracking-wider uppercase transition-opacity hover:opacity-80"
              style={{ background: "var(--color-green)", color: "var(--color-gold)" }}
            >
              Scan Another Item
            </button>

          </div>
        )}
      </div>
    </main>
  );
}

export {};