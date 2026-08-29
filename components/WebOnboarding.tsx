"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const ONBOARDING_KEY = "scanify_web_onboarding_seen";

const demoData = [
  { year: "2020", price: 185 },
  { year: "2021", price: 240 },
  { year: "2022", price: 210 },
  { year: "2023", price: 265 },
  { year: "2024", price: 310 },
  { year: "2025", price: 340 },
  { year: "2026", price: 380 },
];

const demoLeaderboard = [
  { medal: "🥇", name: "Koenigsegg Jesko", value: "$3,400,000" },
  { medal: "🥈", name: "Rolex Daytona", value: "$45,000" },
  { medal: "🥉", name: "Air Jordan 1 (1985)", value: "$28,000" },
];

const demoPlatforms = ["eBay", "StockX", "Chrono24", "GOAT"];

const demoCategoryData = [
  { name: "Cars", value: 4 },
  { name: "Watches", value: 3 },
  { name: "Sneakers", value: 2 },
  { name: "Other", value: 1 },
];
const PIE_COLORS = ["#C9A84C", "#00C853", "#7c3aed", "#3B82F6"];

function CameraVisual() {
  return (
    <div className="w-full flex items-center justify-center" style={{ height: 140 }}>
      <div className="w-24 h-24 rounded-full flex items-center justify-center" style={{ background: "var(--color-green)" }}>
        <svg width="40" height="40" viewBox="0 0 36 36" fill="none">
          <line x1="18" y1="6" x2="18" y2="30" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="6" y1="18" x2="30" y2="18" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}

function GraphVisual() {
  return (
    <div style={{ height: 140 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={demoData} margin={{ top: 5, right: 10, left: -14, bottom: 0 }}>
          <XAxis dataKey="year" tick={{ fill: "var(--color-text-muted)", fontSize: 9 }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fill: "var(--color-text-muted)", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
          <Area type="monotone" dataKey="price" stroke="#7c3aed" strokeWidth={2.5} fill="#7c3aed" fillOpacity={0.15} dot={false} isAnimationActive animationDuration={1200} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function LeaderboardVisual() {
  return (
    <div className="flex flex-col gap-2" style={{ height: 140, justifyContent: "center" }}>
      {demoLeaderboard.map((row) => (
        <div key={row.name} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <span style={{ fontSize: 18 }}>{row.medal}</span>
          <span className="text-xs flex-1 truncate" style={{ color: "var(--color-text-primary)" }}>{row.name}</span>
          <span className="text-xs font-bold" style={{ color: "#00C853" }}>{row.value}</span>
        </div>
      ))}
    </div>
  );
}

function PlatformsVisual() {
  return (
    <div className="flex flex-wrap gap-2 items-center justify-center" style={{ height: 140, alignContent: "center" }}>
      {demoPlatforms.map((p) => (
        <span key={p} className="px-4 py-2 rounded-full text-xs font-medium" style={{ background: "var(--color-surface)", border: "1px solid rgba(201,168,76,0.3)", color: "var(--color-gold)" }}>
          {p}
        </span>
      ))}
    </div>
  );
}

function CollectionVisual() {
  return (
    <div style={{ height: 140 }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={demoCategoryData} dataKey="value" nameKey="name" innerRadius={32} outerRadius={56} paddingAngle={3}>
            {demoCategoryData.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

const SLIDES = [
  { visual: CameraVisual, text: "Take a photo of anything" },
  { visual: GraphVisual, text: "We tell you what it's worth" },
  { visual: LeaderboardVisual, text: "Camera photos can win the leaderboard!" },
  { visual: PlatformsVisual, text: "Want to sell it? We'll find the best price" },
  { visual: CollectionVisual, text: "Every scan builds your collection" },
];

export default function WebOnboarding() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const seen = localStorage.getItem(ONBOARDING_KEY);
    if (!seen) setVisible(true);
  }, []);

  function dismiss() {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setVisible(false);
  }

  function next() {
    if (step < SLIDES.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  }

  if (!visible) return null;

  const Slide = SLIDES[step].visual;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6" style={{ background: "rgba(10,10,10,0.85)", backdropFilter: "blur(4px)" }}>
      <div className="w-full max-w-sm rounded-3xl p-6 flex flex-col gap-5" style={{ background: "var(--color-black)", border: "1px solid var(--color-border)" }}>

        <div className="flex justify-end">
          <button onClick={dismiss} className="text-xs uppercase tracking-widest transition-opacity hover:opacity-70" style={{ color: "var(--color-text-muted)" }}>
            Skip
          </button>
        </div>

        <Slide />

        <p className="text-xl text-center leading-snug" style={{ fontFamily: "var(--font-heading)", fontWeight: 500, color: "var(--color-text-primary)" }}>
          {SLIDES[step].text}
        </p>

        <div className="flex justify-center gap-2">
          {SLIDES.map((_, i) => (
            <span key={i} className="rounded-full" style={{ width: 6, height: 6, background: i === step ? "var(--color-gold)" : "var(--color-border)" }} />
          ))}
        </div>

        <button
          onClick={next}
          className="w-full py-3 rounded-2xl font-semibold text-sm tracking-wider uppercase transition-opacity hover:opacity-85"
          style={{ background: "var(--color-green)", color: "var(--color-gold)" }}
        >
          {step < SLIDES.length - 1 ? "Next" : "Get Started"}
        </button>

      </div>
    </div>
  );
}