"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { Capacitor } from "@capacitor/core";

type BillingPeriod = "monthly" | "annual";

const FREE_FEATURES = [
  { label: "3 scans per month",        included: true  },
  { label: "Basic item identification", included: true  },
  { label: "Current value estimate",   included: true  },
  { label: "Category & materials",     included: true  },
  { label: "Price history graph",      included: false },
  { label: "Leaderboard ranking",      included: false },
  { label: "Priority AI analysis",     included: false },
];

const PRO_FEATURES = [
  "200 scans per month",
  "Full AI appraisal",
  "Price history graph (7 years)",
  "Leaderboard & ranking",
  "Priority AI analysis",
  "Category & materials",
  "Early feature access",
];

const BUSINESS_FEATURES = [
  "Unlimited scans",
  "Full AI appraisal",
  "Price history graph (7 years)",
  "Leaderboard & ranking",
  "Priority AI analysis",
  "Category & materials",
  "Early feature access",
  "Priority support",
];

const COMPARISON = [
  { label: "Monthly scans",       free: "3",      pro: "200",       business: "Unlimited" },
  { label: "AI appraisal",        free: "Basic",  pro: "Priority",  business: "Priority"  },
  { label: "Current value",       free: true,     pro: true,        business: true        },
  { label: "Price history graph", free: false,    pro: true,        business: true        },
  { label: "Leaderboard",         free: false,    pro: true,        business: true        },
  { label: "Materials & specs",   free: true,     pro: true,        business: true        },
  { label: "Deep Research resell (live web search)", free: false, pro: false, business: true },
  { label: "Priority support",    free: false,    pro: false,       business: true        },
];

function CheckIcon({ gold }: { gold?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="11" fill={gold ? "rgba(201,168,76,0.14)" : "rgba(0,200,83,0.09)"} />
      <path d="M7 12.5l3.5 3.5L17 8" stroke={gold ? "#C9A84C" : "#00C853"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="11" fill="rgba(128,128,128,0.06)" />
      <path d="M9 9l6 6M15 9l-6 6" stroke="var(--color-text-faint)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [isNative, setIsNative] = useState(false);
  const [billing, setBilling] = useState<BillingPeriod>("monthly");
  const [activeSlide, setActiveSlide] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  function handleScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const index = Math.round(el.scrollLeft / el.clientWidth);
    setActiveSlide(index);
  }

  function goToSlide(index: number) {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: index * el.clientWidth, behavior: "smooth" });
  }

  async function handleUpgrade(plan: "pro" | "business") {
    setLoading(plan);

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      window.location.href = "/";
      return;
    }

    const priceId =
      plan === "pro"
        ? billing === "annual"
          ? process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID
          : process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID
        : billing === "annual"
          ? process.env.NEXT_PUBLIC_STRIPE_BUSINESS_ANNUAL_PRICE_ID
          : process.env.NEXT_PUBLIC_STRIPE_BUSINESS_PRICE_ID;

    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        priceId,
        userId: session.user.id,
        userEmail: session.user.email,
      }),
    });

    const data = await res.json();

    if (data.url) {
      window.location.href = data.url;
    }

    setLoading(null);
  }

  function NativeUpgradeNotice() {
    return (
      <div className="w-full text-center py-3 rounded-2xl text-[11px]" style={{ background: "var(--color-thumb)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}>
        Manage your plan at <span style={{ color: "var(--color-gold)", fontWeight: 600 }}>scanify.world</span>
      </div>
    );
  }

  return (
    <main className="min-h-screen pb-12" style={{ background: "var(--color-black)", color: "var(--color-text-primary)" }}>
      <div className="px-5 pt-10">

        <div className="text-center mb-8">
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--color-gold)" }}>Pricing</p>
          <h1 className="text-4xl leading-tight mb-3" style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}>Simple, honest pricing</h1>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>Start free. Upgrade when you want more.</p>
        </div>

        {/* Monthly / Annual toggle */}
        <div className="flex items-center justify-center gap-1 mb-8 mx-auto p-1 rounded-2xl" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", maxWidth: 280 }}>
          <button
            onClick={() => setBilling("monthly")}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all"
            style={{
              background: billing === "monthly" ? "var(--color-green)" : "transparent",
              color: billing === "monthly" ? "var(--color-gold)" : "var(--color-text-muted)",
            }}
          >
            Monthly
          </button>
          <button
            onClick={() => setBilling("annual")}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider transition-all relative"
            style={{
              background: billing === "annual" ? "var(--color-green)" : "transparent",
              color: billing === "annual" ? "var(--color-gold)" : "var(--color-text-muted)",
            }}
          >
            Annual
            <span
              className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full text-[9px] font-bold"
              style={{ background: "#00C853", color: "#0a0a0a" }}
            >
              -16%
            </span>
          </button>
        </div>

        {/* Swipeable plan slides */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto no-scrollbar mb-4"
          style={{ scrollSnapType: "x mandatory", gap: 12 }}
        >
          {/* Free slide */}
          <div className="flex-shrink-0 w-full rounded-3xl p-5 flex flex-col" style={{ scrollSnapAlign: "center", background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
            <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--color-text-muted)" }}>Free</p>
            <div className="flex items-end gap-1 mb-5">
              <span className="text-4xl font-bold" style={{ color: "var(--color-text-primary)" }}>$0</span>
              <span className="text-xs pb-1.5" style={{ color: "var(--color-text-muted)" }}>/mo</span>
            </div>
            <ul className="flex flex-col gap-3 flex-1 mb-5">
              {FREE_FEATURES.map((f) => (
                <li key={f.label} className="flex items-start gap-2">
                  {f.included ? <CheckIcon /> : <CrossIcon />}
                  <span className="text-[11px] leading-snug" style={{ color: f.included ? "var(--color-text-secondary)" : "var(--color-text-faint)" }}>{f.label}</span>
                </li>
              ))}
            </ul>
            <Link href="/scan" className="block w-full text-center py-3 rounded-2xl text-[10px] font-semibold uppercase tracking-widest transition-opacity hover:opacity-60" style={{ border: "1px solid var(--color-border)", color: "var(--color-text-muted)" }}>
              Get Started
            </Link>
          </div>

          {/* Pro slide */}
          <div className="flex-shrink-0 w-full rounded-3xl p-5 flex flex-col relative" style={{ scrollSnapAlign: "center", background: "linear-gradient(155deg, rgba(27,77,62,0.22) 0%, var(--color-surface) 55%)", border: "1px solid var(--color-green)", boxShadow: "0 16px 48px rgba(27,77,62,0.22), 0 4px 20px rgba(0,0,0,0.5)" }}>
            <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full whitespace-nowrap" style={{ background: "var(--color-green)", color: "var(--color-gold)", fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
              Most Popular
            </div>
            <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--color-gold)" }}>Pro</p>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-4xl font-bold" style={{ color: "var(--color-gold)" }}>${billing === "annual" ? "29.99" : "2.99"}</span>
              <span className="text-xs pb-1.5" style={{ color: "var(--color-text-muted)" }}>/{billing === "annual" ? "yr" : "mo"}</span>
            </div>
            {billing === "annual" && (
              <p className="text-[10px] mb-4" style={{ color: "#00C853" }}>vs $35.88 billed monthly</p>
            )}
            {billing === "monthly" && <div className="mb-4" />}
            <ul className="flex flex-col gap-3 flex-1 mb-5">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckIcon gold />
                  <span className="text-[11px] leading-snug" style={{ color: "var(--color-text-secondary)" }}>{f}</span>
                </li>
              ))}
            </ul>
            {isNative ? (
              <NativeUpgradeNotice />
            ) : (
              <button
                onClick={() => handleUpgrade("pro")}
                disabled={loading === "pro"}
                className="w-full text-center py-3 rounded-2xl text-[10px] font-semibold uppercase tracking-widest transition-opacity hover:opacity-85 disabled:opacity-50"
                style={{ background: "var(--color-green)", color: "var(--color-gold)" }}
              >
                {loading === "pro" ? "Loading..." : "Upgrade to Pro"}
              </button>
            )}
          </div>

          {/* Business slide */}
          <div className="flex-shrink-0 w-full rounded-3xl p-5 flex flex-col" style={{ scrollSnapAlign: "center", background: "linear-gradient(155deg, rgba(201,168,76,0.08) 0%, var(--color-surface) 55%)", border: "1px solid rgba(201,168,76,0.3)" }}>
            <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: "var(--color-gold)" }}>Business</p>
            <div className="flex items-end gap-1 mb-1">
              <span className="text-4xl font-bold" style={{ color: "var(--color-gold)" }}>${billing === "annual" ? "99.99" : "9.99"}</span>
              <span className="text-xs pb-1.5" style={{ color: "var(--color-text-muted)" }}>/{billing === "annual" ? "yr" : "mo"}</span>
            </div>
            {billing === "annual" && (
              <p className="text-[10px] mb-4" style={{ color: "#00C853" }}>vs $119.88 billed monthly</p>
            )}
            {billing === "monthly" && <div className="mb-4" />}
            <ul className="flex flex-col gap-3 flex-1 mb-5">
              {BUSINESS_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckIcon gold />
                  <span className="text-[11px] leading-snug" style={{ color: "var(--color-text-secondary)" }}>{f}</span>
                </li>
              ))}
              <li className="flex items-start gap-2 rounded-lg p-2 -mx-2" style={{ background: "rgba(0,200,83,0.08)" }}>
                <CheckIcon />
                <span className="text-[11px] leading-snug font-semibold" style={{ color: "#00C853" }}>
                  🔍 Deep Research resell scans — real live web search for verified sold prices
                </span>
              </li>
            </ul>
            {isNative ? (
              <NativeUpgradeNotice />
            ) : (
              <button
                onClick={() => handleUpgrade("business")}
                disabled={loading === "business"}
                className="w-full text-center py-3 rounded-2xl text-[10px] font-semibold uppercase tracking-widest transition-opacity hover:opacity-85 disabled:opacity-50"
                style={{ background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)", color: "var(--color-gold)" }}
              >
                {loading === "business" ? "Loading..." : "Get Business"}
              </button>
            )}
          </div>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mb-10">
          {[0, 1, 2].map((i) => (
            <button
              key={i}
              onClick={() => goToSlide(i)}
              aria-label={`Go to slide ${i + 1}`}
              className="rounded-full transition-all"
              style={{
                width: activeSlide === i ? 20 : 6,
                height: 6,
                background: activeSlide === i ? "var(--color-gold)" : "var(--color-border)",
              }}
            />
          ))}
        </div>

        {/* Comparison table */}
        <div className="rounded-3xl overflow-hidden" style={{ border: "1px solid var(--color-border)" }}>
          <div className="grid grid-cols-4 px-4 py-4" style={{ background: "var(--color-surface)", borderBottom: "1px solid var(--color-border)" }}>
            <span className="text-xs font-semibold" style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)", letterSpacing: "0.06em" }}>Compare</span>
            <span className="text-[9px] uppercase tracking-widest text-center" style={{ color: "var(--color-text-secondary)" }}>Free</span>
            <span className="text-[9px] uppercase tracking-widest text-center" style={{ color: "var(--color-gold)" }}>Pro</span>
            <span className="text-[9px] uppercase tracking-widest text-center" style={{ color: "var(--color-gold)" }}>Biz</span>
          </div>

          {COMPARISON.map((row, i) => (
            <div key={row.label} className="grid grid-cols-4 px-4 py-3 items-center" style={{ borderBottom: i < COMPARISON.length - 1 ? "1px solid var(--color-border)" : undefined, background: i % 2 === 0 ? "transparent" : "var(--color-card-alt)" }}>
              <span className="text-[10px]" style={{ color: "var(--color-text-secondary)" }}>{row.label}</span>
              <div className="flex justify-center items-center">
                {typeof row.free === "boolean" ? (row.free ? <CheckIcon /> : <CrossIcon />) : <span className="text-[10px]" style={{ color: "var(--color-text-muted)" }}>{row.free}</span>}
              </div>
              <div className="flex justify-center items-center">
                {typeof row.pro === "boolean" ? (row.pro ? <CheckIcon gold /> : <CrossIcon />) : <span className="text-[10px] font-medium" style={{ color: "var(--color-gold)" }}>{row.pro}</span>}
              </div>
              <div className="flex justify-center items-center">
                {typeof row.business === "boolean" ? (row.business ? <CheckIcon gold /> : <CrossIcon />) : <span className="text-[10px] font-medium" style={{ color: "var(--color-gold)" }}>{row.business}</span>}
              </div>
            </div>
          ))}
        </div>

        <p className="text-center text-[11px] mt-8" style={{ color: "var(--color-text-faint)" }}>
          Pricing in USD · Cancel anytime · No hidden fees
        </p>

      </div>
    </main>
  );
}