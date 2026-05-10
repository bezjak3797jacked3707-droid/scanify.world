"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function SuccessPage() {
  const router = useRouter();

  useEffect(() => {
    setTimeout(() => {
      router.push("/profile");
    }, 3000);
  }, []);

  return (
    <main
      className="min-h-screen flex items-center justify-center px-6"
      style={{ background: "var(--color-black)", color: "#ededed" }}
    >
      <div className="text-center space-y-6">
        <div className="text-6xl">🎉</div>
        <h1
          className="text-3xl"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)" }}
        >
          Welcome to Pro!
        </h1>
        <p className="text-sm" style={{ color: "#666" }}>
          Your account has been upgraded. Redirecting you now...
        </p>
      </div>
    </main>
  );
}

export {};