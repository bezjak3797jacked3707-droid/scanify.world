"use client";

import { useEffect } from "react";

export default function AuthSuccessPage() {
  useEffect(() => {
    async function handleSuccess() {
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