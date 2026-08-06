"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabase";
import { markOnboardingComplete } from "@/lib/onboarding";

type ScanInterest = "cars" | "sneakers" | "watches" | "everything";
type UserGoal = "curious" | "resell" | "collection";

const INTEREST_OPTIONS: { value: ScanInterest; emoji: string; label: string }[] = [
  { value: "cars", emoji: "🚗", label: "Cars & Vehicles" },
  { value: "sneakers", emoji: "👟", label: "Sneakers & Streetwear" },
  { value: "watches", emoji: "⌚", label: "Watches & Jewelry" },
  { value: "everything", emoji: "📦", label: "A bit of everything" },
];

const GOAL_OPTIONS: { value: UserGoal; emoji: string; label: string }[] = [
  { value: "curious", emoji: "🔍", label: "Just curious what things are worth" },
  { value: "resell", emoji: "💰", label: "Looking to resell items for profit" },
  { value: "collection", emoji: "📈", label: "Tracking a collection I own" },
];

const HOW_IT_WORKS = [
  { emoji: "📸", title: "Snap a photo", body: "Point your camera at any item — cars, sneakers, watches, anything." },
  { emoji: "💎", title: "See its value", body: "Get an instant AI-powered price, history, and full specs." },
  { emoji: "🏆", title: "Compete & resell", body: "Camera scans compete on the leaderboard. Use the resell scanner to find the best price to sell." },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [interest, setInterest] = useState<ScanInterest | null>(null);
  const [goal, setGoal] = useState<UserGoal | null>(null);
  const [howItWorksIndex, setHowItWorksIndex] = useState(0);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // If somehow loaded outside the native app, skip straight to home
    if (!Capacitor.isNativePlatform()) {
      router.replace("/");
      return;
    }
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });
  }, [router]);

  async function finishOnboarding() {
    await markOnboardingComplete();
    router.replace("/");
  }

  async function skipOnboarding() {
    await markOnboardingComplete();
    router.replace("/");
  }

  if (loading) return null;

  return (
    <main className="min-h-screen flex flex-col" style={{ background: "var(--color-black)", color: "var(--color-text-primary)", paddingTop: "env(safe-area-inset-top)" }}>

      {/* Skip button — available from step 1 onward */}
      {step > 0 && !user && (
        <div className="flex justify-end px-5 pt-4">
          <button onClick={skipOnboarding} className="text-xs uppercase tracking-widest transition-opacity hover:opacity-70" style={{ color: "var(--color-text-muted)" }}>
            Skip
          </button>
        </div>
      )}

      <div className="flex flex-col flex-1 justify-center px-6 py-8">

        {/* STEP 0 — Welcome */}
        {step === 0 && (
          <div className="flex flex-col items-center text-center gap-6">
            <div className="w-40 h-40 rounded-3xl overflow-hidden">
              <img src="/logo.png" alt="Scanify logo" className="w-full h-full object-contain" style={{ mixBlendMode: "screen" }} />
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl leading-tight" style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}>
                Scan Anything.
                <br />
                <span style={{ color: "var(--color-gold)" }}>Know Its Value.</span>
              </h1>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>AI-powered appraisals in seconds.</p>
            </div>
            <button
              onClick={() => setStep(1)}
              className="w-full max-w-[280px] py-4 rounded-2xl font-semibold text-base tracking-wider uppercase transition-opacity hover:opacity-85"
              style={{ background: "var(--color-green)", color: "var(--color-gold)" }}
            >
              Get Started
            </button>
          </div>
        )}

        {/* STEP 1 — What do you want to scan? */}
        {step === 1 && (
          <div className="flex flex-col gap-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl" style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}>What do you want to scan?</h2>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Pick what interests you most</p>
            </div>
            <div className="flex flex-col gap-3">
              {INTEREST_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setInterest(opt.value); setStep(2); }}
                  className="w-full py-4 px-5 rounded-2xl flex items-center gap-3 transition-opacity hover:opacity-80"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                >
                  <span style={{ fontSize: 22 }}>{opt.emoji}</span>
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2 — Why are you here? */}
        {step === 2 && (
          <div className="flex flex-col gap-6">
            <div className="text-center space-y-1">
              <h2 className="text-2xl" style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}>Why are you here?</h2>
              <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Helps us tailor your experience</p>
            </div>
            <div className="flex flex-col gap-3">
              {GOAL_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setGoal(opt.value); setStep(3); }}
                  className="w-full py-4 px-5 rounded-2xl flex items-center gap-3 transition-opacity hover:opacity-80"
                  style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}
                >
                  <span style={{ fontSize: 22 }}>{opt.emoji}</span>
                  <span className="text-sm font-medium">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3 — How it works */}
        {step === 3 && (
          <div className="flex flex-col gap-8">
            <div className="text-center space-y-1">
              <h2 className="text-2xl" style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}>How Scanify works</h2>
            </div>
            <div className="rounded-2xl p-6 flex flex-col items-center text-center gap-3" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", minHeight: 220 }}>
              <span style={{ fontSize: 40 }}>{HOW_IT_WORKS[howItWorksIndex].emoji}</span>
              <h3 className="text-lg font-semibold">{HOW_IT_WORKS[howItWorksIndex].title}</h3>
              <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>{HOW_IT_WORKS[howItWorksIndex].body}</p>
            </div>
            <div className="flex justify-center gap-2">
              {HOW_IT_WORKS.map((_, i) => (
                <span key={i} className="rounded-full" style={{ width: 6, height: 6, background: i === howItWorksIndex ? "var(--color-gold)" : "var(--color-border)" }} />
              ))}
            </div>
            <button
              onClick={() => {
                if (howItWorksIndex < HOW_IT_WORKS.length - 1) {
                  setHowItWorksIndex(howItWorksIndex + 1);
                } else {
                  setStep(4);
                }
              }}
              className="w-full py-4 rounded-2xl font-semibold text-base tracking-wider uppercase transition-opacity hover:opacity-85"
              style={{ background: "var(--color-green)", color: "var(--color-gold)" }}
            >
              {howItWorksIndex < HOW_IT_WORKS.length - 1 ? "Next" : "Continue"}
            </button>
          </div>
        )}

        {/* STEP 4 — Sign in */}
        {step === 4 && (
          <OnboardingSignIn onSignedIn={(u) => { setUser(u); setStep(5); }} />
        )}

        {/* STEP 5 — Plan selection */}
        {step === 5 && (
          <OnboardingPlanSelect onFinish={finishOnboarding} />
        )}

      </div>
    </main>
  );
}

function OnboardingSignIn({ onSignedIn }: { onSignedIn: (user: any) => void }) {
  const [signing, setSigning] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) onSignedIn(session.user);
    });
    return () => subscription.unsubscribe();
  }, [onSignedIn]);

  async function handleGoogleLogin() {
    setSigning(true);
    try {
      const { SocialLogin } = await import("@capgo/capacitor-social-login");
      const result = await SocialLogin.login({ provider: "google", options: {} });
      const idToken = (result.result as any)?.idToken;
      if (idToken) {
        await supabase.auth.signInWithIdToken({ provider: "google", token: idToken });
      }
    } catch (err) {
      console.error("Google sign in failed:", err);
    } finally {
      setSigning(false);
    }
  }

  async function handleAppleLogin() {
    setSigning(true);
    try {
      const { SocialLogin } = await import("@capgo/capacitor-social-login");
      const result = await SocialLogin.login({ provider: "apple", options: {} });
      const idToken = (result.result as any)?.idToken;
      if (idToken) {
        await supabase.auth.signInWithIdToken({ provider: "apple", token: idToken });
      }
    } catch (err) {
      console.error("Apple sign in failed:", err);
    } finally {
      setSigning(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl" style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}>Create your account</h2>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Sign in to save your scans and start free</p>
      </div>
      <div className="flex flex-col gap-3">
        <button
          onClick={handleGoogleLogin}
          disabled={signing}
          className="flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
          style={{ background: "var(--color-green)", color: "var(--color-gold)" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#C9A84C" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#C9A84C" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#C9A84C" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#C9A84C" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>
        <button
          onClick={handleAppleLogin}
          disabled={signing}
          className="flex items-center justify-center gap-2 py-4 rounded-2xl text-sm font-medium transition-opacity hover:opacity-85 disabled:opacity-50"
          style={{ background: "black", border: "1px solid rgba(255,255,255,0.2)", color: "white" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
            <path d="M16.365 1.43c0 1.14-.493 2.27-1.177 3.08-.744.9-1.99 1.57-2.987 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.572-2.27 1.206-2.98.804-.94 2.142-1.64 3.248-1.68.03.13.05.28.05.43zm4.565 15.71c-.03.07-.463 1.58-1.518 3.12-.945 1.34-1.94 2.71-3.43 2.71-1.517 0-1.9-.88-3.63-.88-1.698 0-2.302.91-3.67.91-1.377 0-2.332-1.26-3.428-2.8-1.287-1.82-2.323-4.63-2.323-7.28 0-4.28 2.797-6.55 5.552-6.55 1.448 0 2.675.95 3.6.95.865 0 2.222-1.01 3.902-1.01.613 0 2.886.06 4.374 2.19-.13.07-2.583 1.5-2.583 4.46 0 3.51 3.087 4.75 3.154 4.77z"/>
          </svg>
          Continue with Apple
        </button>
      </div>
    </div>
  );
}

function OnboardingPlanSelect({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="text-center space-y-1">
        <h2 className="text-2xl" style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}>Choose your plan</h2>
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Start free — upgrade anytime</p>
      </div>

      <button
        onClick={onFinish}
        className="w-full py-5 rounded-2xl flex flex-col items-center gap-1 transition-opacity hover:opacity-90"
        style={{ background: "var(--color-green)", border: "2px solid var(--color-gold)" }}
      >
        <span className="text-xs uppercase tracking-widest" style={{ color: "var(--color-gold)" }}>Recommended</span>
        <span className="text-xl font-bold" style={{ color: "var(--color-gold)" }}>Start Free</span>
        <span className="text-xs" style={{ color: "rgba(201,168,76,0.8)" }}>3 scans/month · No card needed</span>
      </button>

      <div className="flex flex-col gap-3">
        <div className="rounded-2xl p-4 flex items-center justify-between" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <div>
            <p className="text-sm font-semibold">Pro</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>200 scans/month</p>
          </div>
          <span className="text-lg font-bold" style={{ color: "var(--color-gold)" }}>$2.99/mo</span>
        </div>
        <div className="rounded-2xl p-4 flex items-center justify-between" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <div>
            <p className="text-sm font-semibold">Business</p>
            <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>Unlimited + Deep Research</p>
          </div>
          <span className="text-lg font-bold" style={{ color: "var(--color-gold)" }}>$9.99/mo</span>
        </div>
      </div>

      <p className="text-[11px] text-center" style={{ color: "var(--color-text-faint)" }}>
        You can upgrade anytime from your profile
      </p>

      <button
        onClick={onFinish}
        className="text-xs uppercase tracking-widest transition-opacity hover:opacity-70"
        style={{ color: "var(--color-text-muted)" }}
      >
        Continue with Free
      </button>
    </div>
  );
}