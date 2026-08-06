import { Preferences } from "@capacitor/preferences";
import { Capacitor } from "@capacitor/core";

const ONBOARDING_KEY = "scanify_onboarding_complete";

export async function hasCompletedOnboarding(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return true; // website never shows onboarding
  try {
    const { value } = await Preferences.get({ key: ONBOARDING_KEY });
    return value === "true";
  } catch {
    return true; // fail safe — don't block access if check fails
  }
}

export async function markOnboardingComplete(): Promise<void> {
  try {
    await Preferences.set({ key: ONBOARDING_KEY, value: "true" });
  } catch {
    // silent fail — non-critical
  }
}