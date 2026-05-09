"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const ADMIN_EMAILS = ["emil.bezjak10@gmail.com", "bezjak3797jacked3797@gmail.com"];// Replace with your actual Gmail

interface ScanEntry {
  id: number;
  image_url: string;
  name: string;
  current_value: string;
  category: string;
  display_name: string;
  created_at: string;
  reported: boolean;
  on_leaderboard: boolean;
}

export default function AdminPage() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<ScanEntry[]>([]);
  const [tab, setTab] = useState<"reported" | "all">("reported");

  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !ADMIN_EMAILS.includes(session.user.email ?? "")) {
        router.push("/");
        return;
      }
      setAuthorized(true);
      fetchEntries();
    }
    checkAuth();
  }, []);

  async function fetchEntries() {
    setLoading(true);
    const query = supabase
      .from("scan_results")
      .select("id, image_url, name, current_value, category, display_name, created_at, reported, on_leaderboard")
      .order("created_at", { ascending: false })
      .limit(50);

    if (tab === "reported") {
      query.eq("reported", true);
    }

    const { data } = await query;
    setEntries(data || []);
    setLoading(false);
  }

  useEffect(() => {
    if (authorized) fetchEntries();
  }, [tab, authorized]);

  async function removeFromLeaderboard(id: number) {
    await supabase
      .from("scan_results")
      .update({ on_leaderboard: false, reported: false })
      .eq("id", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  async function clearReport(id: number) {
    await supabase
      .from("scan_results")
      .update({ reported: false })
      .eq("id", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  if (!authorized) return null;

  return (
    <main className="min-h-screen pb-24" style={{ background: "var(--color-black)", color: "#ededed" }}>
      <div className="max-w-md mx-auto px-5 py-8 space-y-6">

        <div className="text-center space-y-1">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--color-gold)" }}>Admin</p>
          <h1 className="text-3xl" style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}>Manage Scans</h1>
        </div>

        {/* Tab switcher */}
        <div className="flex rounded-2xl p-1 gap-1" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          {(["reported", "all"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-xl text-sm font-medium tracking-wider uppercase transition-all"
              style={{
                background: tab === t ? "var(--color-green)" : "transparent",
                color: tab === t ? "var(--color-gold)" : "#555",
              }}
            >
              {t === "reported" ? "Reported" : "All Scans"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="flex gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} style={{ width: 10, height: 10, borderRadius: 3, background: "#7c3aed", animation: `pulse-block 1.2s ease-in-out ${i * 0.15}s infinite` }} />
              ))}
            </div>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-zinc-500 text-sm">No {tab === "reported" ? "reported" : ""} scans found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {entries.map((entry) => (
              <div key={entry.id} className="rounded-2xl p-4 space-y-3" style={{ background: "var(--color-surface)", border: entry.reported ? "1px solid #ef4444" : "1px solid var(--color-border)" }}>
                <div className="flex gap-3 items-center">
                  <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0" style={{ background: "#1a1a1a" }}>
                    {entry.image_url && <img src={entry.image_url} alt={entry.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{entry.name}</p>
                    <p className="text-xs" style={{ color: "#666" }}>{entry.display_name || "Anonymous"}</p>
                    <p className="text-xs" style={{ color: "#00C853" }}>${String(entry.current_value).replace("$", "")}</p>
                    <p className="text-xs" style={{ color: "#444" }}>{new Date(entry.created_at).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => removeFromLeaderboard(entry.id)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider"
                    style={{ background: "#ef4444", color: "white" }}
                  >
                    Remove from Leaderboard
                  </button>
                  <button
                    onClick={() => clearReport(entry.id)}
                    className="flex-1 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider"
                    style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "#666" }}
                  >
                    Clear Report
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export {};