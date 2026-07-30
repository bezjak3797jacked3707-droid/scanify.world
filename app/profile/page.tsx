"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import type { User } from "@supabase/supabase-js";

interface Profile {
  scans_used: number;
  is_pro: boolean;
  current_streak: number;
  longest_streak: number;
}

interface BestScan {
  name: string;
  current_value: string;
  image_url: string;
  created_at: string;
}

interface CategorySlice {
  name: string;
  value: number;
}

const PIE_COLORS = ["#C9A84C", "#00C853", "#7c3aed", "#3B82F6", "#EF4444", "#F59E0B", "#14B8A6"];

interface Achievement {
  emoji: string;
  label: string;
  unlocked: boolean;
}

function buildAchievements(totalScans: number, categories: number, longestStreak: number, portfolioValue: number): Achievement[] {
  return [
    { emoji: "🔍", label: "First Scan", unlocked: totalScans >= 1 },
    { emoji: "📦", label: "5 Scans", unlocked: totalScans >= 5 },
    { emoji: "🏅", label: "25 Scans", unlocked: totalScans >= 25 },
    { emoji: "🗂", label: "Collector", unlocked: categories >= 5 },
    { emoji: "💰", label: "$10k Portfolio", unlocked: portfolioValue >= 10000 },
    { emoji: "🔥", label: "7 Day Streak", unlocked: longestStreak >= 7 },
  ];
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bestScans, setBestScans] = useState<BestScan[]>([]);
  const [totalScans, setTotalScans] = useState(0);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [categoryData, setCategoryData] = useState<CategorySlice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push("/"); return; }
      setUser(session.user);

      const { data: profileData } = await supabase.from("profiles").select("scans_used, is_pro, current_streak, longest_streak").eq("id", session.user.id).single();
      setProfile(profileData);

      const { count } = await supabase.from("scan_results").select("*", { count: "exact", head: true }).eq("user_id", session.user.id);
      setTotalScans(count || 0);

      const { data: scans } = await supabase.from("scan_results").select("name, current_value, image_url, created_at, category").eq("user_id", session.user.id);
      if (scans && scans.length > 0) {
        const withValue = scans
          .map((s) => ({ ...s, numericValue: parseFloat(String(s.current_value).replace(/[^0-9.]/g, "")) }))
          .filter((s) => !isNaN(s.numericValue));

        const sorted = [...withValue].sort((a, b) => b.numericValue - a.numericValue);
        setBestScans(sorted.slice(0, 3));

        setPortfolioValue(withValue.reduce((sum, s) => sum + s.numericValue, 0));

        const byCategory = new Map<string, number>();
        for (const s of scans) {
          const cat = s.category || "Other";
          byCategory.set(cat, (byCategory.get(cat) || 0) + 1);
        }
        setCategoryData([...byCategory.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));
      }
      setLoading(false);
    }
    loadProfile();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
  }

  async function handleManageSubscription() {
    const res = await fetch("/api/portal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userEmail: user?.email }) });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
  }

  async function handleDeleteAccount() {
    if (!user) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      if (res.ok) {
        await supabase.auth.signOut();
        router.push("/");
      } else {
        alert("Failed to delete account. Please try again or contact support.");
        setDeleting(false);
      }
    } catch {
      alert("Failed to delete account. Please try again or contact support.");
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-black)" }}>
        <div className="flex gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={{ width: 10, height: 10, borderRadius: 3, background: "#7c3aed", animation: `pulse-block 1.2s ease-in-out ${i * 0.15}s infinite` }} />
          ))}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24" style={{ background: "var(--color-black)", color: "var(--color-text-primary)" }}>
      <div className="max-w-md mx-auto px-5 py-8 space-y-6">

        <div className="text-center space-y-1">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--color-gold)" }}>Account</p>
          <h1 className="text-3xl" style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}>Profile</h1>
        </div>

        <div className="rounded-2xl p-6 flex flex-col items-center gap-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          {user?.user_metadata?.avatar_url ? (
            <img src={user.user_metadata.avatar_url} alt="Profile" className="w-20 h-20 rounded-full" style={{ border: "2px solid var(--color-gold)" }} />
          ) : (
            <div className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold" style={{ background: "var(--color-green)", color: "var(--color-gold)" }}>
              {user?.email?.[0]?.toUpperCase()}
            </div>
          )}
          <div className="text-center">
            <p className="font-semibold text-lg">{user?.user_metadata?.full_name || "User"}</p>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{user?.email}</p>
          </div>
          <div className="px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest" style={{
            background: profile?.is_pro ? "rgba(201,168,76,0.15)" : "rgba(27,77,62,0.3)",
            border: profile?.is_pro ? "1px solid rgba(201,168,76,0.4)" : "1px solid var(--color-green)",
            color: profile?.is_pro ? "var(--color-gold)" : "#00C853",
          }}>
            {profile?.is_pro ? "⭐ Pro Member" : "Free Plan"}
          </div>
        </div>

        {!!profile?.current_streak && profile.current_streak > 0 && (
          <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.12) 0%, var(--color-surface) 70%)", border: "1px solid rgba(201,168,76,0.3)" }}>
            <span className="text-3xl">🔥</span>
            <div>
              <p className="text-lg font-bold" style={{ color: "var(--color-gold)" }}>{profile.current_streak} day{profile.current_streak !== 1 ? "s" : ""} streak</p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {profile.longest_streak > profile.current_streak ? `Longest: ${profile.longest_streak} days` : "Keep it going — scan today!"}
              </p>
            </div>
          </div>
        )}

        {portfolioValue > 0 && (
          <div className="rounded-2xl p-5 text-center" style={{ background: "linear-gradient(135deg, rgba(0,200,83,0.1) 0%, var(--color-surface) 70%)", border: "1px solid var(--color-green)" }}>
            <p className="text-xs uppercase tracking-widest mb-1" style={{ color: "var(--color-gold)" }}>Portfolio Value</p>
            <p className="text-3xl font-bold" style={{ color: "#00C853" }}>${portfolioValue.toLocaleString()}</p>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>Total value of everything you&apos;ve scanned</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl p-4 text-center" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <p className="text-3xl font-bold" style={{ color: "var(--color-gold)" }}>{totalScans}</p>
            <p className="text-xs uppercase tracking-widest mt-1" style={{ color: "var(--color-text-muted)" }}>Total Scans</p>
          </div>
          <div className="rounded-2xl p-4 text-center" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <p className="text-3xl font-bold" style={{ color: "#00C853" }}>
              {profile?.is_pro ? "200+" : `${Math.max(0, 3 - (profile?.scans_used || 0))}`}
            </p>
            <p className="text-xs uppercase tracking-widest mt-1" style={{ color: "var(--color-text-muted)" }}>
              {profile?.is_pro ? "Scans / Month" : "Scans Left"}
            </p>
          </div>
        </div>

        {categoryData.length > 0 && (
          <div className="rounded-2xl p-5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--color-gold)" }}>Category Breakdown</p>
            <div className="flex items-center gap-4">
              <div style={{ width: 110, height: 110, flexShrink: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={28} outerRadius={50} paddingAngle={2}>
                      {categoryData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }}
                      labelStyle={{ color: "var(--color-gold)" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                {categoryData.slice(0, 5).map((c, i) => (
                  <div key={c.name} className="flex items-center gap-2 min-w-0">
                    <span className="rounded-full flex-shrink-0" style={{ width: 8, height: 8, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>{c.name}</span>
                    <span className="text-xs ml-auto flex-shrink-0" style={{ color: "var(--color-text-muted)" }}>{c.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="rounded-2xl p-5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--color-gold)" }}>Achievements</p>
          <div className="grid grid-cols-3 gap-3">
            {buildAchievements(totalScans, categoryData.length, profile?.longest_streak || 0, portfolioValue).map((a) => (
              <div key={a.label} className="rounded-xl p-3 flex flex-col items-center text-center gap-1" style={{ background: "var(--color-thumb)", border: "1px solid var(--color-border)", opacity: a.unlocked ? 1 : 0.35 }}>
                <span className="text-2xl">{a.emoji}</span>
                <p className="text-[10px] uppercase tracking-wide leading-tight" style={{ color: a.unlocked ? "var(--color-text-secondary)" : "var(--color-text-muted)" }}>{a.label}</p>
              </div>
            ))}
          </div>
        </div>

        {bestScans.length > 0 && (
          <div className="rounded-2xl p-5 space-y-3" style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.1) 0%, var(--color-surface) 70%)", border: "1px solid rgba(201,168,76,0.3)" }}>
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--color-gold)" }}>🏆 Your Top Scans</p>
            {bestScans.map((scan, index) => (
              <div key={index} className="flex gap-3 items-center">
                <span className="text-lg flex-shrink-0">{index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}</span>
                {scan.image_url && <img src={scan.image_url} alt={scan.name} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />}
                <div>
                  <p className="font-semibold text-sm">{scan.name}</p>
                  <p className="text-base font-bold" style={{ color: "#00C853" }}>
                    ${Number(String(scan.current_value).replace(/[^0-9.]/g, "")).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {!profile?.is_pro && (
          <button onClick={() => router.push("/pricing")} className="w-full py-4 rounded-2xl font-semibold text-base tracking-wider uppercase transition-opacity hover:opacity-80" style={{ background: "var(--color-green)", color: "var(--color-gold)" }}>
            Upgrade to Pro
          </button>
        )}

        {profile?.is_pro && (
          <button onClick={handleManageSubscription} className="w-full py-3 rounded-2xl text-sm font-semibold uppercase tracking-wider transition-opacity hover:opacity-70" style={{ border: "1px solid var(--color-green)", color: "var(--color-green)" }}>
            Manage Subscription
          </button>
        )}

        <button onClick={() => router.push("/history")} className="w-full py-3 rounded-2xl text-sm font-semibold uppercase tracking-wider transition-opacity hover:opacity-70" style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
          View History
        </button>

        <button onClick={handleSignOut} className="w-full py-3 rounded-2xl text-sm font-semibold uppercase tracking-wider transition-opacity hover:opacity-70" style={{ border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}>
          Sign Out
        </button>

        {!showDeleteConfirm ? (
          <button onClick={() => setShowDeleteConfirm(true)} className="w-full py-3 rounded-2xl text-sm font-semibold uppercase tracking-wider transition-opacity hover:opacity-70" style={{ border: "1px solid #EF4444", color: "#EF4444" }}>
            Delete Account
          </button>
        ) : (
          <div className="rounded-2xl p-4 space-y-3" style={{ background: "var(--color-surface)", border: "1px solid #EF4444" }}>
            <p className="text-sm font-semibold text-center" style={{ color: "#EF4444" }}>Delete your account permanently?</p>
            <p className="text-xs text-center" style={{ color: "var(--color-text-muted)" }}>This removes all your scans, history, and data. This cannot be undone.</p>
            <div className="flex gap-2">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider" style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}>
                Cancel
              </button>
              <button onClick={handleDeleteAccount} disabled={deleting} className="flex-1 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider disabled:opacity-50" style={{ background: "#EF4444", color: "white" }}>
                {deleting ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
          </div>
        )}

      </div>
    </main>
  );
}

export {};