"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function ScanPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [scansUsed, setScansUsed] = useState(0);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        supabase
          .from("profiles")
          .select("scans_used, is_pro")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => {
            if (data) {
              setScansUsed(data.scans_used);
              setIsPro(data.is_pro);
            }
          });
      }
    });
  }, []);

  const scanLimit = 2;
  const limitReached = !isPro && scansUsed >= scanLimit;

  function openPicker() {
    if (limitReached) return;
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setError("");
    e.target.value = "";
  }

  async function handleScan() {
    if (!file) return;
    setIsUploading(true);
    setError("");

    try {
      const fileExt = file.name.split(".").pop() || "jpg";
      const fileName = `${Date.now()}.${fileExt}`;
      const filePath = `uploads/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("scans")
        .upload(filePath, file, { cacheControl: "3600", upsert: false });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("scans").getPublicUrl(filePath);

      console.log("=== SENDING USER ID ===", user?.id);
router.push(
  `/result?imageUrl=${encodeURIComponent(data.publicUrl)}&userId=${user?.id ?? ""}`
);
    } catch (err) {
      console.error(err);
      setError("Upload failed. Check bucket setup and try again.");
      setIsUploading(false);
    }
  }

  return (
    <main
      className="min-h-screen flex flex-col"
      style={{ background: "var(--color-black)", color: "#ededed" }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {!preview ? (
        <div className="flex flex-col flex-1 items-center justify-center px-10 gap-6">

          {/* Scan limit warning */}
          {limitReached && (
            <div
              className="w-full max-w-[300px] rounded-2xl p-4 text-center space-y-3"
              style={{
                background: "var(--color-surface)",
                border: "1px solid #7c3aed",
              }}
            >
              <p className="text-sm font-semibold" style={{ color: "#C9A84C" }}>
                You've used your {scanLimit} free scans
              </p>
              <p className="text-xs" style={{ color: "#666" }}>
                Upgrade to Pro for 99+ scans per month
              </p>
              <button
                onClick={() => router.push("/pricing")}
                className="w-full py-2 rounded-xl text-sm font-semibold tracking-wider uppercase"
                style={{
                  background: "var(--color-green)",
                  color: "var(--color-gold)",
                }}
              >
                Upgrade to Pro
              </button>
            </div>
          )}

          {/* Viewfinder with L-corner guides */}
          <div className="relative w-full max-w-[300px] aspect-square flex items-center justify-center">
            <span
              className="absolute top-0 left-0 w-9 h-9 border-t-[3px] border-l-[3px]"
              style={{ borderColor: limitReached ? "#333" : "var(--color-green)" }}
            />
            <span
              className="absolute top-0 right-0 w-9 h-9 border-t-[3px] border-r-[3px]"
              style={{ borderColor: limitReached ? "#333" : "var(--color-green)" }}
            />
            <span
              className="absolute bottom-0 left-0 w-9 h-9 border-b-[3px] border-l-[3px]"
              style={{ borderColor: limitReached ? "#333" : "var(--color-green)" }}
            />
            <span
              className="absolute bottom-0 right-0 w-9 h-9 border-b-[3px] border-r-[3px]"
              style={{ borderColor: limitReached ? "#333" : "var(--color-green)" }}
            />

            <button
              onClick={openPicker}
              type="button"
              disabled={limitReached}
              aria-label="Open camera or file picker"
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
            <p
              className="text-xs uppercase tracking-[0.25em]"
              style={{ color: "var(--color-gold)" }}
            >
              {user ? `${scanLimit - scansUsed} free scan${scanLimit - scansUsed !== 1 ? "s" : ""} remaining` : "Tap to scan"}
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col flex-1 px-5 py-6 gap-5">
          <div className="w-full aspect-[4/3] rounded-2xl overflow-hidden">
            <img src={preview} alt="Selected item" className="w-full h-full object-cover" />
          </div>

          <button
            onClick={openPicker}
            type="button"
            className="text-xs uppercase tracking-widest self-end transition-opacity hover:opacity-70"
            style={{ color: "var(--color-gold)" }}
          >
            Retake photo
          </button>

          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Tell us about this item (optional)"
            rows={3}
            className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none placeholder:text-zinc-600"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              color: "#ededed",
              fontFamily: "var(--font-body)",
            }}
          />

          <button
            onClick={handleScan}
            disabled={isUploading}
            type="button"
            className="w-full rounded-2xl py-4 text-base font-semibold tracking-wider uppercase transition-opacity disabled:opacity-50"
            style={{
              background: "var(--color-green)",
              color: "var(--color-gold)",
            }}
          >
            {isUploading ? "Uploading…" : "Scan"}
          </button>

          {error && (
            <p className="text-sm text-red-400 text-center">{error}</p>
          )}
        </div>
      )}
    </main>
  );
}