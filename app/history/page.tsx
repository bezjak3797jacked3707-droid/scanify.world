"use client";

import { useEffect, useState } from "react";
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
}

export default function HistoryPage() {
  const router = useRouter();
  const [scans, setScans] = useState<Scan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchScans() {
      const { data, error } = await supabase
        .from("scan_results")
        .select("id, created_at, image_url, name, current_value, category, confidence")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch scans:", error.message);
      } else {
        setScans(data || []);
      }

      setLoading(false);
    }

    fetchScans();
  }, []);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-zinc-400 text-sm">Loading history...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-md mx-auto space-y-6">

        <div className="space-y-1">
          <p className="text-sm uppercase tracking-[0.2em] text-zinc-500 text-center">History</p>
          <h1 className="text-3xl font-bold text-center">Your Scans</h1>
        </div>

        {scans.length === 0 ? (
          <div className="text-center py-20 space-y-4">
            <p className="text-zinc-500">No scans yet.</p>
            <button
              onClick={() => router.push("/scan")}
              className="bg-white text-black px-6 py-3 rounded-xl font-semibold hover:bg-zinc-200 transition"
            >
              Start Scanning
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {scans.map((scan) => (
              <div
                key={scan.id}
                className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex gap-4 p-4 items-center"
              >
                {scan.image_url ? (
                  <img
                    src={scan.image_url}
                    alt={scan.name}
                    className="w-20 h-20 object-cover rounded-xl flex-shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 bg-zinc-800 rounded-xl flex-shrink-0" />
                )}

                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-semibold text-white truncate">{scan.name}</p>
                  <p className="text-sm text-zinc-400">{scan.category}</p>
                  <div className="flex gap-3 text-sm">
                    <span className="text-white font-medium">{scan.current_value}</span>
                    <span className="text-zinc-500">{scan.confidence}% confidence</span>
                  </div>
                  <p className="text-xs text-zinc-600">
                    {new Date(scan.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => router.push("/scan")}
          className="w-full bg-white text-black py-3 rounded-xl font-semibold hover:bg-zinc-200 transition"
        >
          Scan Another Item
        </button>

      </div>
    </main>
  );
}