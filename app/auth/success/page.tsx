"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthSuccessPage() {
  useEffect(() => {
    async function handleSuccess() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          console.error("Session exchange failed:", error.message);
        }
      }

      // @ts-ignore
      const isNative = window.Capacitor?.isNativePlatform?.();
      if (isNative) {
        try {
          const { Browser } = await import("@capacitor/browser");
          await Browser.close();
        } catch (err) {
          console.error("Browser close error:", err);
        }
      }

      window.location.href = "/";
    }
    handleSuccess();
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-2" style={{ background: "var(--color-black)" }}>
      <p style={{ color: "var(--color-gold)" }}>Signing you in…</p>
    </main>
  );
}