"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

interface Profile {
  scans_used: number;
  is_pro: boolean;
}

interface BestScan {
  name: string;
  current_value: string;
  image_url: string;
  created_at: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bestScan, setBestScan] = useState<BestScan | null>(null);
  const [totalScans, setTotalScans] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProfile() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/");
        return;
      }

      setUser(session.user);

      // Get profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("scans_used, is_pro")
        .eq("id", session.user.id)
        .single();

      setProfile(profileData);

      // Get total scans
      const { count } = await supabase
        .from("scan_results")
        .select("*", { count: "exact", head: true })
        .eq("user_id", session.user.id);

      setTotalScans(count || 0);

      // Get best scan
      const { data: scans } = await supabase
        .from("scan_results")
        .select("name, current_value, image_url, created_at")
        .eq("user_id", session.user.id);

      if (scans && scans.length > 0) {
        const best = scans
          .map((s) => ({
            ...s,
            numericValue: parseFloat(String(s.current_value).replace(/[^0-9.]/g, "")),
          }))
          .filter((s) => !isNaN(s.numericValue))
          .sort((a, b) => b.numericValue - a.numericValue)[0];

        if (best) setBestScan(best);
      }

      setLoading(false);
    }

    loadProfile();
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/");
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
    <main className="min-h-screen pb-24" style={{ background: "var(--color-black)", color: "#ededed" }}>
      <div className="max-w-md mx-auto px-5 py-8 space-y-6">

        {/* Header */}
        <div className="text-center space-y-1">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--color-gold)" }}>Account</p>
          <h1 className="text-3xl" style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}>Profile</h1>
        </div>

        {/* Profile card */}
        <div
          className="rounded-2xl p-6 flex flex-col items-center gap-4"
          style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
        >
          {user?.user_metadata?.avatar_url ? (
            <img
              src={user.user_metadata.avatar_url}
              alt="Profile"
              className="w-20 h-20 rounded-full"
              style={{ border: "2px solid var(--color-gold)" }}
            />
          ) : (
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold"
              style={{ background: "var(--color-green)", color: "var(--color-gold)" }}
            >
              {user?.email?.[0]?.toUpperCase()}
            </div>
          )}

          <div className="text-center">
            <p className="font-semibold text-lg">{user?.user_metadata?.full_name || "User"}</p>
            <p className="text-sm" style={{ color: "#666" }}>{user?.email}</p>
          </div>

          {/* Plan badge */}
          <div
            className="px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-widest"
            style={{
              background: profile?.is_pro ? "rgba(201,168,76,0.15)" : "rgba(27,77,62,0.3)",
              border: profile?.is_pro ? "1px solid rgba(201,168,76,0.4)" : "1px solid var(--color-green)",
              color: profile?.is_pro ? "var(--color-gold)" : "#00C853",
            }}
          >
            {profile?.is_pro ? "⭐ Pro Member" : "Free Plan"}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div
            className="rounded-2xl p-4 text-center"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <p className="text-3xl font-bold" style={{ color: "var(--color-gold)" }}>{totalScans}</p>
            <p className="text-xs uppercase tracking-widest mt-1" style={{ color: "#555" }}>Total Scans</p>
          </div>

          <div
            className="rounded-2xl p-4 text-center"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
          >
            <p className="text-3xl font-bold" style={{ color: "#00C853" }}>
              {profile?.is_pro ? "∞" : `${Math.max(0, 2 - (profile?.scans_used || 0))}`}
            </p>
            <p className="text-xs uppercase tracking-widest mt-1" style={{ color: "#555" }}>
              {profile?.is_pro ? "Unlimited" : "Scans Left"}
            </p>
          </div>
        </div>

        {/* Best scan */}
        {bestScan && (
          <div
            className="rounded-2xl p-5 space-y-3"
            style={{
              background: "linear-gradient(135deg, rgba(201,168,76,0.1) 0%, var(--color-surface) 70%)",
              border: "1px solid rgba(201,168,76,0.3)",
            }}
          >
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--color-gold)" }}>
              🏆 Your Best Scan
            </p>
            <div className="flex gap-3 items-center">
              {bestScan.image_url && (
                <img
                  src={bestScan.image_url}
                  alt={bestScan.name}
                  className="w-16 h-16 rounded-xl object-cover flex-shrink-0"
                />
              )}
              <div>
                <p className="font-semibold text-sm">{bestScan.name}</p>
                <p className="text-lg font-bold" style={{ color: "#00C853" }}>
                  ${String(bestScan.current_value).replace("$", "")}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upgrade button if free */}
        {!profile?.is_pro && (
          <button
            onClick={() => router.push("/pricing")}
            className="w-full py-4 rounded-2xl font-semibold text-base tracking-wider uppercase transition-opacity hover:opacity-80"
            style={{ background: "var(--color-green)", color: "var(--color-gold)" }}
          >
            Upgrade to Pro
          </button>
        )}

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="w-full py-3 rounded-2xl text-sm font-semibold uppercase tracking-wider transition-opacity hover:opacity-70"
          style={{ border: "1px solid #333", color: "#666" }}
        >
          Sign Out
        </button>

      </div>
    </main>
  );
}

export {};