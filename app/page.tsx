"use client";

import AuthButton from "@/components/AuthButton";
import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import ThemeToggle from "@/components/ThemeToggle";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const demoData = [
  { year: "2020", price: 185 },
  { year: "2021", price: 240 },
  { year: "2022", price: 210 },
  { year: "2023", price: 265 },
  { year: "2024", price: 310 },
  { year: "2025", price: 340 },
  { year: "2026", price: 380 },
];

const reviews = [
  {
    initials: "SM",
    name: "Sarah M.",
    stars: 5,
    comment: "Found a lamp at a garage sale, scanned it on the spot and found out it was a vintage Murano glass piece worth $600. Paid $8 for it.",
  },
  {
    initials: "TM",
    name: "TOM B.",
    stars: 5,
    comment: "Scanned my Jordan 4s — had them listed $120 under value. Changed it immediately.",
  },
  {
    initials: "AT",
    name: "Amara T.",
    stars: 4,
    comment: "Got my MacBook's exact specs and market value in 10 seconds. No more guessing.",
  },
  {
    initials: "DK",
    name: "Daniel K.",
    stars: 5,
    comment: "My girlfriend thinks I'm scanning everything in the house now. She's not wrong.",
  },
];

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="11" height="11" viewBox="0 0 24 24">
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill={i < count ? "#C9A84C" : "var(--color-border)"}
          />
        </svg>
      ))}
    </div>
  );
}

export default function Home() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const check = () => setIsLight(document.documentElement.classList.contains("light"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, message }),
    });
    setSubmitted(true);
    setEmail("");
    setMessage("");
  }

  return (
    <main className="min-h-screen" style={{ background: "var(--color-black)", color: "var(--color-text-primary)" }}>

      {/* HERO */}
      <section
        className="relative flex flex-col overflow-hidden"
        style={{ minHeight: "88vh", background: "radial-gradient(ellipse 140% 60% at 50% 0%, rgba(27,77,62,0.18) 0%, var(--color-black) 65%)" }}
      >
        <div className="flex items-center justify-between px-6 pt-8 relative z-10">
          <span className="text-2xl tracking-widest" style={{ color: "var(--color-gold)", fontFamily: "var(--font-heading)", fontWeight: 500 }}>
            Scanify
          </span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <AuthButton />
          </div>
        </div>

        <div className="absolute inset-x-0 pointer-events-none" style={{ top: "48%", zIndex: 1 }}>
          <svg viewBox="0 0 400 70" preserveAspectRatio="none" className="w-full" style={{ height: 70, filter: "blur(10px)", opacity: 0.45 }}>
            <defs>
              <linearGradient id="heroWave" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#1B4D3E" stopOpacity="0" />
                <stop offset="25%"  stopColor="#C9A84C" stopOpacity="0.9" />
                <stop offset="55%"  stopColor="#1B4D3E" stopOpacity="0.8" />
                <stop offset="80%"  stopColor="#C9A84C" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#1B4D3E" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0 35 C60 12, 120 58, 200 35 S320 12, 400 35" stroke="url(#heroWave)" strokeWidth="3.5" fill="none" />
            <path d="M0 42 C80 20, 160 60, 240 38 S360 18, 400 42" stroke="url(#heroWave)" strokeWidth="1.5" fill="none" opacity="0.45" />
          </svg>
        </div>

        <div className="flex flex-col items-center justify-center flex-1 px-6 gap-8 relative z-10 pb-10">
          <div className="w-64 h-64 rounded-3xl overflow-hidden">
            <img
              src="/logo.png"
              alt="Scanify logo"
              className="w-full h-full object-contain"
              style={{
                mixBlendMode: isLight ? "normal" : "screen",
                filter: isLight ? "invert(1) sepia(1) saturate(2) hue-rotate(5deg) brightness(0.85)" : "none",
                transition: "filter 0.3s ease",
              }}
            />
          </div>

          <div className="text-center space-y-1.5">
            <h1 className="text-4xl leading-tight" style={{ fontFamily: "var(--font-heading)", fontWeight: 500, color: "var(--color-text-primary)" }}>
              Scan Anything.
              <br />
              <span style={{ color: "var(--color-gold)" }}>Know Its Value.</span>
            </h1>
            <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
              AI-powered appraisals in seconds.
            </p>
          </div>

          <div className="flex flex-col items-center gap-3 w-full">
            <Link href="/scan" className="w-full text-center py-4 rounded-2xl font-semibold text-base tracking-wider uppercase transition-opacity hover:opacity-85" style={{ background: "var(--color-green)", color: "var(--color-gold)" }}>
              {user ? "Scan Now" : "Try Free Scan"}
            </Link>
            <Link href="/pricing" className="w-full text-center py-3 rounded-2xl text-sm tracking-wider uppercase font-medium transition-opacity hover:opacity-70" style={{ border: "1px solid rgba(201,168,76,0.35)", color: "var(--color-gold)" }}>
              {user ? "View Pricing" : "See Plans"}
            </Link>
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="px-5 py-12" style={{ borderTop: "1px solid var(--color-border)" }}>
        <h2 className="text-2xl text-center mb-6" style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)", fontWeight: 500 }}>
          What People Say
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {reviews.map((r) => (
            <div key={r.name} className="rounded-2xl p-4 flex flex-col gap-2" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0" style={{ background: "var(--color-brown)", color: "var(--color-gold)", fontSize: 10 }}>
                  {r.initials}
                </div>
                <span className="text-xs font-semibold" style={{ color: "var(--color-text-primary)" }}>{r.name}</span>
              </div>
              <Stars count={r.stars} />
              <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{r.comment}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="px-5 py-12" style={{ borderTop: "1px solid var(--color-border)" }}>
        <h2 className="text-2xl text-center mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)", fontWeight: 500 }}>
          How It Works
        </h2>
        <p className="text-sm text-center mb-8" style={{ color: "var(--color-text-muted)" }}>
          Snap a photo. Our AI returns value, history, and specs instantly.
        </p>

        <div className="flex flex-col gap-3 mb-8">
          {[
            { n: "1", title: "Snap or upload", body: "Take a photo of any item — sneakers, electronics, collectibles, art." },
            { n: "2", title: "AI analyzes", body: "Gemini Vision identifies the item and pulls real market data." },
            { n: "3", title: "See the value", body: "Get current price, 7-year history graph, materials, and full specs." },
          ].map((s) => (
            <div key={s.n} className="flex gap-4 items-start rounded-2xl p-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
              <span className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ background: "var(--color-green)", color: "var(--color-gold)" }}>
                {s.n}
              </span>
              <div>
                <p className="font-semibold text-sm mb-0.5" style={{ color: "var(--color-text-primary)" }}>{s.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--color-text-muted)" }}>{s.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl p-4 pt-5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <p className="text-xs uppercase tracking-widest mb-0.5" style={{ color: "var(--color-gold)" }}>Example · Nike Air Jordan 1</p>
          <p className="text-xs mb-4" style={{ color: "var(--color-text-faint)" }}>Estimated resale value 2020–2026</p>
          <div style={{ height: 148 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={demoData} margin={{ top: 5, right: 10, left: -14, bottom: 0 }}>
                <XAxis dataKey="year" tick={{ fill: "var(--color-text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--color-text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                <Tooltip contentStyle={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 10, fontSize: 12 }} labelStyle={{ color: "var(--color-gold)", fontSize: 11 }} itemStyle={{ color: "var(--color-text-primary)" }} />
                <Area type="monotone" dataKey="price" stroke="#7c3aed" strokeWidth={2.5} fill="#7c3aed" fillOpacity={0.1} dot={false} isAnimationActive={true} animationDuration={1800} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* CONTACT */}
      <section className="px-5 py-12" style={{ borderTop: "1px solid var(--color-border)" }}>
        <h2 className="text-2xl text-center mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)", fontWeight: 500 }}>
          Get in Touch
        </h2>
        <p className="text-sm text-center mb-8" style={{ color: "var(--color-text-muted)" }}>
          Questions, feedback, or partnerships — we&apos;d love to hear from you.
        </p>

        {submitted ? (
          <div className="rounded-2xl p-6 text-center" style={{ background: "var(--color-surface)", border: "1px solid var(--color-green)" }}>
            <p className="text-sm font-medium" style={{ color: "#00C853" }}>Message sent.</p>
            <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>We&apos;ll get back to you soon.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              required
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", fontFamily: "var(--font-body)" }}
            />
            <textarea
              required
              rows={4}
              placeholder="Your message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", color: "var(--color-text-primary)", fontFamily: "var(--font-body)" }}
            />
            <button type="submit" className="w-full py-3 rounded-xl font-semibold text-sm tracking-wider uppercase transition-opacity hover:opacity-85" style={{ background: "var(--color-gold)", color: "#0a0a0a" }}>
              Send Message
            </button>
          </form>
        )}
      </section>

      {/* FOOTER */}
      <footer className="px-5 py-10 flex flex-col items-center gap-5" style={{ borderTop: "1px solid var(--color-border)" }}>
        <span style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)", fontSize: 22, fontWeight: 500, letterSpacing: "0.15em" }}>
          Scanify
        </span>
        <div className="flex gap-6 text-xs">
        <a href="https://www.instagram.com/scanify.world/" target="_blank" rel="noopener noreferrer" className="transition-opacity hover:opacity-70" style={{ color: "var(--color-text-muted)" }}>Instagram</a>
          <a href="/terms" className="transition-opacity hover:opacity-70" style={{ color: "var(--color-text-muted)" }}>Terms of Service</a>
          <a href="/privacy" className="transition-opacity hover:opacity-70" style={{ color: "var(--color-text-muted)" }}>Privacy Policy</a>
        </div>
        <p className="text-xs" style={{ color: "var(--color-text-faint)" }}>© {new Date().getFullYear()} Scanify. All rights reserved.</p>
      </footer>

    </main>
  );
}