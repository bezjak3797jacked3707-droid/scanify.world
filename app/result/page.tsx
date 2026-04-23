"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

interface ScanResult {
  name: string;
  currentValue: string;
  originalPrice: string;
  category: string;
  confidence: string;
  description: string;
  materials: string;
  specs: string;
}

export default function ResultPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const imageUrl = searchParams.get("imageUrl");

  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!imageUrl) return;

    async function analyze() {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl }),
        });

        if (!res.ok) throw new Error("Analysis failed");

        const data = await res.json();
        setResult(data);
      } catch (err) {
        console.error(err);
        setError("Could not analyze image. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    analyze();
  }, [imageUrl]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-zinc-400 text-sm">Analyzing your item...</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-center space-y-4">
          <p className="text-red-400">{error}</p>
          <button
            onClick={() => router.push("/scan")}
            className="bg-white text-black px-6 py-3 rounded-xl font-semibold"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-6 py-10">
      <div className="max-w-md mx-auto space-y-6">

        <h1 className="text-3xl font-bold text-center">Scan Result</h1>

        {imageUrl && (
          <div className="rounded-2xl overflow-hidden border border-zinc-800 h-64">
            <img src={imageUrl} alt="Scanned item" className="w-full h-full object-cover" />
          </div>
        )}

        {result && (
          <>
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
              <h2 className="text-xl font-semibold">{result.name}</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-zinc-500">Current Value</p>
                  <p className="text-lg font-semibold">{result.currentValue}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Original Price</p>
                  <p className="text-lg font-semibold">{result.originalPrice}</p>
                </div>
                <div>
                  <p className="text-zinc-500">Confidence</p>
                  <p className="text-lg font-semibold">{result.confidence}%</p>
                </div>
                <div>
                  <p className="text-zinc-500">Category</p>
                  <p className="text-lg font-semibold">{result.category}</p>
                </div>
              </div>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-2">
              <h3 className="text-lg font-semibold">Details</h3>
              <p className="text-zinc-400 text-sm">{result.description}</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-2">
              <h3 className="text-lg font-semibold">Materials</h3>
              <p className="text-zinc-400 text-sm">{result.materials}</p>
            </div>

            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-2">
              <h3 className="text-lg font-semibold">Specs</h3>
              <p className="text-zinc-400 text-sm">{result.specs}</p>
            </div>
          </>
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