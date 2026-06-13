"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { vibrate } from "@/lib/haptics";
import type { User } from "@supabase/supabase-js";

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const maxSize = 800;
      let width = img.width;
      let height = img.height;
      if (width > height && width > maxSize) { height = (height * maxSize) / width; width = maxSize; }
      else if (height > maxSize) { width = (width * maxSize) / height; height = maxSize; }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        resolve(new File([blob!], "scan.jpg", { type: "image/jpeg" }));
        URL.revokeObjectURL(url);
      }, "image/jpeg", 0.75);
    };
    img.src = url;
  });
}

export default function ScanPage() {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const libraryInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [isPreUploading, setIsPreUploading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [scansUsed, setScansUsed] = useState(0);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        supabase.from("profiles").select("scans_used, is_pro").eq("id", session.user.id).single()
          .then(({ data }) => { if (data) { setScansUsed(data.scans_used); setIsPro(data.is_pro); } });
      }
    });
  }, []);

  const scanLimit = 3;
  const limitReached = !isPro && scansUsed >= scanLimit;

  function openCamera() {
    if (!user) { router.push("/"); return; }
    if (limitReached) return;
    vibrate();
    cameraInputRef.current?.click();
  }

  function openLibrary() {
    if (!user) { router.push("/"); return; }
    if (limitReached) return;
    vibrate();
    libraryInputRef.current?.click();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Reset previous upload
    setUploadedUrl(null);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setError("");
    e.target.value = "";

    // Pre-upload in background immediately
    setIsPreUploading(true);
    try {
      const compressed = await compressImage(selected);
      const fileName = `${Date.now()}.jpg`;
      const filePath = `uploads/${fileName}`;
      const { error: uploadError } = await supabase.storage
        .from("scans")
        .upload(filePath, compressed, { cacheControl: "3600", upsert: false });

      if (!uploadError) {
        const { data } = supabase.storage.from("scans").getPublicUrl(filePath);
        setUploadedUrl(data.publicUrl);
      }
    } catch (err) {
      // Silent fail — handleScan will retry
    } finally {
      setIsPreUploading(false);
    }
  }

  async function handleScan() {
    if (!file) return;
    vibrate(20);
    setIsUploading(true);
    setError("");

    try {
      let publicUrl = uploadedUrl;

      // If pre-upload didn't finish, upload now
      if (!publicUrl) {
        const compressed = await compressImage(file);
        const fileName = `${Date.now()}.jpg`;
        const filePath = `uploads/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from("scans")
          .upload(filePath, compressed, { cacheControl: "3600", upsert: false });
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from("scans").getPublicUrl(filePath);
        publicUrl = data.publicUrl;
      }

      router.push(
        `/result?imageUrl=${encodeURIComponent(publicUrl)}&userId=${user?.id ?? ""}&note=${encodeURIComponent(note)}&displayName=${encodeURIComponent(user?.user_metadata?.full_name ?? "Anonymous")}`
      );
    } catch (err) {
      setError("Upload failed. Please try again.");
      setIsUploading(false);
    }
  }

  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--color-black)", color: "var(--color-text-primary)" }}>
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
      <input ref={libraryInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

      {!preview ? (
        <div className="flex flex-col flex-1 items-center justify-center px-10 gap-6">

          {limitReached && (
            <div className="w-full max-w-[300px] rounded-2xl p-4 text-center space-y-3" style={{ background: "var(--color-surface)", border: "1px solid #7c3aed" }}>
              <p className="text-sm font-semibold" style={{ color: "var(--color-gold)" }}>You've used your {scanLimit} free scans</p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Upgrade to Pro for 200 scans per month</p>
              <button onClick={() => router.push("/pricing")} className="w-full py-2 rounded-xl text-sm font-semibold tracking-wider uppercase" style={{ background: "var(--color-green)", color: "var(--color-gold)" }}>
                Upgrade to Pro
              </button>
            </div>
          )}

          {!user && (
            <div className="w-full max-w-[300px] rounded-2xl p-4 text-center space-y-3" style={{ background: "var(--color-surface)", border: "1px solid rgba(201,168,76,0.3)" }}>
              <p className="text-sm font-semibold" style={{ color: "var(--color-gold)" }}>Sign in to start scanning</p>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Create a free account to scan any item and discover its value instantly.</p>
              <button onClick={() => router.push("/")} className="w-full py-2 rounded-xl text-sm font-semibold tracking-wider uppercase" style={{ background: "var(--color-green)", color: "var(--color-gold)" }}>
                Sign In
              </button>
            </div>
          )}

          <div className="relative w-full max-w-[300px] aspect-square flex items-center justify-center">
            <span className="absolute top-0 left-0 w-9 h-9 border-t-[3px] border-l-[3px]" style={{ borderColor: limitReached ? "var(--color-border)" : "var(--color-green)" }} />
            <span className="absolute top-0 right-0 w-9 h-9 border-t-[3px] border-r-[3px]" style={{ borderColor: limitReached ? "var(--color-border)" : "var(--color-green)" }} />
            <span className="absolute bottom-0 left-0 w-9 h-9 border-b-[3px] border-l-[3px]" style={{ borderColor: limitReached ? "var(--color-border)" : "var(--color-green)" }} />
            <span className="absolute bottom-0 right-0 w-9 h-9 border-b-[3px] border-r-[3px]" style={{ borderColor: limitReached ? "var(--color-border)" : "var(--color-green)" }} />

            <button
              onClick={openCamera}
              type="button"
              disabled={limitReached}
              aria-label="Open camera"
              className="w-24 h-24 rounded-full flex items-center justify-center transition-opacity hover:opacity-80 active:scale-95 disabled:opacity-30"
              style={{ background: "var(--color-green)" }}
            >
              <svg width="36" height="36" viewBox="0 0 36 36" fill="none">
                <line x1="18" y1="6" x2="18" y2="30" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round" />
                <line x1="6" y1="18" x2="30" y2="18" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          {!limitReached && (
            <p className="text-xs uppercase tracking-[0.25em]" style={{ color: "var(--color-gold)" }}>
              {!user ? "Sign in to scan" : isPro ? "Tap to scan" : `${scanLimit - scansUsed} free scan${scanLimit - scansUsed !== 1 ? "s" : ""} remaining`}
            </p>
          )}

          {!limitReached && user && (
            <button onClick={openLibrary} type="button" className="text-xs uppercase tracking-widest transition-opacity hover:opacity-70" style={{ color: "var(--color-text-muted)" }}>
              Choose from gallery
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col flex-1 px-5 py-6 gap-5">
          <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden">
            <img src={preview} alt="Selected item" className="w-full h-full object-cover" />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button onClick={openCamera} type="button" className="text-xs uppercase tracking-widest transition-opacity hover:opacity-70" style={{ color: "var(--color-gold)" }}>
                Retake photo
              </button>
              <button onClick={openLibrary} type="button" className="text-xs uppercase tracking-widest transition-opacity hover:opacity-70" style={{ color: "var(--color-text-muted)" }}>
                Gallery
              </button>
            </div>
            {isPreUploading && (
              <p className="text-xs" style={{ color: "var(--color-text-faint)" }}>Preparing…</p>
            )}
            {uploadedUrl && !isPreUploading && (
              <p className="text-xs" style={{ color: "#00C853" }}>✓ Ready</p>
            )}
          </div>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tell us about this item (optional)"
            rows={3}
            className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none"
            style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", fontFamily: "var(--font-body)" }}
          />

          <button
            onClick={handleScan}
            disabled={isUploading}
            type="button"
            className="w-full rounded-2xl py-4 text-base font-semibold tracking-wider uppercase transition-opacity disabled:opacity-50"
            style={{ background: "var(--color-green)", color: "var(--color-gold)" }}
          >
            {isUploading ? "Preparing scan…" : "Scan"}
          </button>

          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
        </div>
      )}
    </main>
  );
}