"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface Scan {
  id: number;
  created_at: string;
  image_url: string;
  name: string;
  current_value: string;
  category: string;
  confidence: string;
  scan_type: string;
}

type SortMode = "recent" | "expensive";

function parsePrice(value: string): number {
  return parseFloat(value.replace(/[^0-9.]/g, "")) || 0;
}

function daysAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "1d ago";
  return `${diff}d ago`;
}

function EmptyState({ onScan }: { onScan: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5">
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-text-faint)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 3" />
        </svg>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium mb-1" style={{ color: "var(--color-text-muted)" }}>No scans this month</p>
        <p className="text-xs" style={{ color: "var(--color-text-faint)" }}>Your scanned items will appear here</p>
      </div>
      <button onClick={onScan} className="px-6 py-3 rounded-2xl text-sm font-semibold tracking-widest uppercase" style={{ background: "var(--color-green)", color: "var(--color-gold)" }}>
        Start Scanning
      </button>
    </div>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);
  const [sort, setSort] = useState<SortMode>("recent");
  const [isLoggedIn, setIsLoggedIn] = useState(true);

  useEffect(() => {
    async function fetchScans() {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setIsLoggedIn(false);
        setScans([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("scan_results")
        .select("id, created_at, image_url, name, current_value, category, confidence, scan_type")
        .eq("user_id", session.user.id)
        .gte("created_at", startOfMonth)
        .order("created_at", { ascending: false });

      if (error) console.error("Failed to fetch scans:", error.message);
      else setScans(data || []);
      setLoading(false);
    }
    fetchScans();
  }, []);

  const sorted = useMemo<Scan[]>(() => {
    if (sort === "expensive") return [...scans].sort((a, b) => parsePrice(b.current_value) - parsePrice(a.current_value));
    return scans;
  }, [scans, sort]);

  const monthLabel = new Date().toLocaleString("default", { month: "long", year: "numeric" });

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-black)" }}>
        <div className="text-center space-y-4">
          <div className="w-10 h-10 rounded-full border-2 border-t-transparent mx-auto animate-spin" style={{ borderColor: "var(--color-green)" }} />
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Loading history…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-10" style={{ background: "var(--color-black)", color: "var(--color-text-primary)" }}>
      <div className="px-5 pt-8">

        <div className="flex items-start justify-between mb-1">
          <div>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--color-gold)" }}>{monthLabel}</p>
            <h1 className="text-3xl" style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}>History</h1>
          </div>

          <div className="flex rounded-xl overflow-hidden mt-1.5" style={{ border: "1px solid var(--color-border)", background: "var(--color-surface)" }}>
            {(["recent", "expensive"] as SortMode[]).map((mode) => {
              const active = sort === mode;
              return (
                <button key={mode} onClick={() => setSort(mode)} className="px-3 py-2 text-[10px] uppercase tracking-widest transition-all" style={{ background: active ? "var(--color-green)" : "transparent", color: active ? "var(--color-gold)" : "var(--color-text-muted)", fontWeight: active ? 600 : 400 }}>
                  {mode === "recent" ? "Recent" : "Expensive"}
                </button>
              );
            })}
          </div>
        </div>

        <p className="text-xs mb-6" style={{ color: "var(--color-text-faint)" }}>
          {isLoggedIn ? `${sorted.length} scan${sorted.length !== 1 ? "s" : ""} this month` : ""}
        </p>

        {!isLoggedIn ? (
          <div className="flex flex-col items-center justify-center py-24 gap-5 text-center">
            <p className="text-sm font-medium" style={{ color: "var(--color-text-muted)" }}>Sign in to view your history</p>
            <button onClick={() => router.push("/")} className="px-6 py-3 rounded-2xl text-sm font-semibold tracking-widest uppercase" style={{ background: "var(--color-green)", color: "var(--color-gold)" }}>
              Sign In
            </button>
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState onScan={() => router.push("/scan")} />
        ) : (
          <div className="flex flex-col gap-3">
            {sorted.map((scan) => (
              <button
                key={scan.id}
                onClick={() => router.push(scan.scan_type === "resell" ? `/resell/result?scanId=${scan.id}` : `/result?scanId=${scan.id}`)}
                className="w-full text-left rounded-2xl flex gap-4 p-4 items-center transition-all hover:opacity-80 active:scale-[0.98]"
                style={{
                  background: scan.scan_type === "resell" ? "linear-gradient(135deg, rgba(201,168,76,0.06) 0%, var(--color-surface) 70%)" : "var(--color-surface)",
                  border: scan.scan_type === "resell" ? "1px solid rgba(201,168,76,0.2)" : "1px solid var(--color-border)",
                }}
              >
                <div className="w-[72px] h-[72px] rounded-xl overflow-hidden flex-shrink-0" style={{ background: "var(--color-thumb)", border: "1px solid var(--color-border)" }}>
                  {scan.image_url ? (
                    <img src={scan.image_url} alt={scan.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" style={{ color: "var(--color-text-faint)" }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="3" y="3" width="18" height="18" rx="3" />
                        <path d="M8 12h8M12 8v8" />
                      </svg>
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="font-semibold text-sm leading-tight truncate" style={{ color: "var(--color-text-primary)" }}>
                      {scan.name}
                    </p>
                    <span className="text-[10px] flex-shrink-0 px-2 py-0.5 rounded-full" style={{ color: "var(--color-text-muted)", background: "var(--color-thumb)", border: "1px solid var(--color-border)" }}>
                      {daysAgo(scan.created_at)}
                    </span>
                  </div>
                  <p className="text-lg font-bold leading-none mb-1" style={{ color: "#00C853" }}>
                    ${Number(String(scan.current_value).replace(/[^0-9.]/g, "")).toLocaleString()}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--color-text-faint)" }}>
                    {scan.scan_type === "resell" ? "🏷️ Resell Scan" : scan.category}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}