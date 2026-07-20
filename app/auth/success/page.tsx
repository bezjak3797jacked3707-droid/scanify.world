"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AuthSuccessPage() {
  const router = useRouter();

  useEffect(() => {
    async function handleSuccess() {
      // @ts-ignore
      if (window.Capacitor?.isNativePlatform?.()) {
        // @ts-ignore
        const { Browser } = await import("@capacitor/browser");
        await Browser.close().catch(() => {});
      }
      router.push("/");
    }
    handleSuccess();
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center" style={{ background: "var(--color-black)" }}>
      <p style={{ color: "var(--color-gold)" }}>Signing you in…</p>
    </main>
  );
}