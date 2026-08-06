"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { hasCompletedOnboarding } from "@/lib/onboarding";

export default function OnboardingGate() {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (pathname === "/onboarding") { setChecked(true); return; }

    hasCompletedOnboarding().then((done) => {
      if (!done) {
        router.replace("/onboarding");
      } else {
        setChecked(true);
      }
    });
  }, [pathname, router]);

  return null;
}