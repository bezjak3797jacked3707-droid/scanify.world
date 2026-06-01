"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

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

export default function ResellPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [user, setUser] = useState<User | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [scansUsed, setScansUsed] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [preferredPlatform, setPreferredPlatform] = useState("eBay");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  const scanLimit = 1;

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
    e.target.value = "";
  }

  async function handleResellScan() {
    if (!file || !user) return;
    setIsUploading(true);
    setError("");
    try {
      const compressed = await compressImage(file);
      const fileName = `${Date.now()}.jpg`;
      const filePath = `uploads/resell_${fileName}`;
      const { error: uploadError } = await supabase.storage.from("scans").upload(filePath, compressed, { cacheControl: "3600", upsert: false });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from("scans").getPublicUrl(filePath);
      router.push(`/resell/result?imageUrl=${encodeURIComponent(data.publicUrl)}&userId=${user.id}&platform=${encodeURIComponent(preferredPlatform)}`);
    } catch (err) {
      setError("Upload failed. Please try again.");
      setIsUploading(false);
    }
  }

  if (!user) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-4" style={{ background: "var(--color-black)" }}>
        <div className="rounded-2xl p-6 text-center space-y-3 w-full max-w-sm" style={{ background: "var(--color-surface)", border: "1px solid rgba(201,168,76,0.3)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--color-gold)" }}>Sign in to use Resell Scanner</p>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Find out what your item is worth on resale platforms instantly.</p>
          <button onClick={() => router.push("/")} className="w-full py-2 rounded-xl text-sm font-semibold tracking-wider uppercase" style={{ background: "var(--color-green)", color: "var(--color-gold)" }}>
            Sign In
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-24" style={{ background: "var(--color-black)", color: "var(--color-text-primary)" }}>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      <div className="max-w-md mx-auto px-5 py-8 space-y-6">

        <div className="text-center space-y-1">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--color-gold)" }}>Resell Scanner</p>
          <h1 className="text-3xl" style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}>What's It Worth?</h1>
          <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Find the best price across reselling platforms</p>
        </div>

        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--color-text-muted)" }}>Preferred Platform</p>
          <div className="grid grid-cols-3 gap-2">
            {PLATFORMS.map((p) => (
              <button
                key={p}
                onClick={() => setPreferredPlatform(p)}
                className="py-2 px-3 rounded-xl text-xs font-medium transition-all"
                style={{
                  background: preferredPlatform === p ? "var(--color-green)" : "var(--color-surface)",
                  color: preferredPlatform === p ? "var(--color-gold)" : "var(--color-text-muted)",
                  border: "1px solid",
                  borderColor: preferredPlatform === p ? "var(--color-green)" : "var(--color-border)",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {!preview ? (
          <div
            onClick={() => !limitReached && fileInputRef.current?.click()}
            className="w-full rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-opacity hover:opacity-80"
            style={{ background: "var(--color-surface)", border: "2px dashed var(--color-border)", minHeight: 180, opacity: limitReached ? 0.5 : 1 }}
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
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                {isPro ? "Unlimited scans" : `${scanLimit - scansUsed} free scan${scanLimit - scansUsed !== 1 ? "s" : ""} remaining`}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden">
              <img src={preview} alt="Item to resell" className="w-full h-full object-cover" />
            </div>
            <button onClick={() => { setPreview(null); setFile(null); }} className="text-xs uppercase tracking-widest block ml-auto transition-opacity hover:opacity-70" style={{ color: "var(--color-gold)" }}>
              Retake photo
            </button>
          </div>
        )}

        {limitReached && (
          <div className="rounded-2xl p-4 text-center space-y-3" style={{ background: "var(--color-surface)", border: "1px solid #7c3aed" }}>
            <p className="text-sm font-semibold" style={{ color: "var(--color-gold)" }}>You've used your {scanLimit} free scan</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Upgrade to Pro for 200 scans per month</p>
            <button onClick={() => router.push("/pricing")} className="w-full py-2 rounded-xl text-sm font-semibold tracking-wider uppercase" style={{ background: "var(--color-green)", color: "var(--color-gold)" }}>
              Upgrade to Pro
            </button>
          </div>
        )}

        {preview && !limitReached && (
          <button onClick={handleResellScan} disabled={isUploading} className="w-full py-4 rounded-2xl font-semibold text-base tracking-wider uppercase transition-opacity disabled:opacity-50" style={{ background: "var(--color-green)", color: "var(--color-gold)" }}>
            {isUploading ? "Preparing…" : "Get Resell Value"}
          </button>
        )}

        {error && <p className="text-sm text-red-400 text-center">{error}</p>}

      </div>
    </main>
  );
}

export {};