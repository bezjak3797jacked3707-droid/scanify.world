"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function AuthSuccessPage() {
  const router = useRouter();
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  function log(msg: string) {
    setDebugInfo((prev) => [...prev, msg]);
  }

  useEffect(() => {
    async function handleSuccess() {
      log("Page loaded");
      // @ts-ignore
      const isNative = window.Capacitor?.isNativePlatform?.();
      log(`isNativePlatform: ${isNative}`);

      if (isNative) {
        try {
          const { Browser } = await import("@capacitor/browser");
          log("Browser module imported");
          await Browser.close();
          log("Browser closed successfully");
        } catch (err) {
          log(`Browser close error: ${err}`);
        }
      }

      log("Redirecting to home in 3 seconds...");
      setTimeout(() => router.push("/"), 3000);
    }
    handleSuccess();
  }, [router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6 gap-2" style={{ background: "var(--color-black)" }}>
      <p style={{ color: "var(--color-gold)" }}>Signing you in…</p>
      <div style={{ color: "#888", fontSize: 12, marginTop: 20 }}>
        {debugInfo.map((line, i) => (
          <p key={i}>{line}</p>
        ))}
      </div>
    </main>
  );
}