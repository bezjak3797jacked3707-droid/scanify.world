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
  PieChart,
  Pie,
  Cell,
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
const PIE_COLORS = ["#C9A84C", "#00C853", "#7c3aed", "#3B82F6", "#EF4444", "#F59E0B", "#14B8A6"];

function formatCompactCurrency(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}k`;
  return `$${value.toLocaleString()}`;
}

interface CategorySlice {
  name: string;
  value: number;
}

interface BestScan {
  name: string;
  current_value: string;
  image_url: string;
}

function MyActivitySection({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [totalScans, setTotalScans] = useState(0);
  const [portfolioValue, setPortfolioValue] = useState(0);
  const [categoryData, setCategoryData] = useState<CategorySlice[]>([]);
  const [bestScans, setBestScans] = useState<BestScan[]>([]);

  useEffect(() => {
    async function load() {
      const { count } = await supabase
        .from("scan_results")
        .select("*", { count: "exact", head: true })
        .eq("user_id", userId);
      setTotalScans(count || 0);

      const { data: scans } = await supabase
        .from("scan_results")
        .select("name, current_value, image_url, category")
        .eq("user_id", userId);

      if (scans && scans.length > 0) {
        const withValue = scans
          .map((s) => ({ ...s, numericValue: parseFloat(String(s.current_value).replace(/[^0-9.]/g, "")) }))
          .filter((s) => !isNaN(s.numericValue));

        const sorted = [...withValue].sort((a, b) => b.numericValue - a.numericValue);
        setBestScans(sorted.slice(0, 3));
        setPortfolioValue(withValue.reduce((sum, s) => sum + s.numericValue, 0));

        const byCategory = new Map<string, number>();
        for (const s of scans) {
          const cat = s.category || "Other";
          byCategory.set(cat, (byCategory.get(cat) || 0) + 1);
        }
        setCategoryData([...byCategory.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value));
      }
      setLoading(false);
    }
    load();
  }, [userId]);

  if (loading) {
    return (
      <section className="px-5 py-12" style={{ borderTop: "1px solid var(--color-border)" }}>
        <div className="flex justify-center py-8">
          <div className="flex gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} style={{ width: 8, height: 8, borderRadius: 2, background: "#7c3aed", animation: `pulse-block 1.2s ease-in-out ${i * 0.15}s infinite` }} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (totalScans === 0) {
    return (
      <section className="px-5 py-12" style={{ borderTop: "1px solid var(--color-border)" }}>
        <div className="rounded-2xl p-8 text-center space-y-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <p className="text-2xl" style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)", fontWeight: 500 }}>
            Your first scan is waiting
          </p>
          <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
            Scan anything to start building your collection, unlock achievements, and see your portfolio grow.
          </p>
          <Link href="/scan" className="inline-block px-8 py-3 rounded-2xl font-semibold text-sm tracking-wider uppercase transition-opacity hover:opacity-85" style={{ background: "var(--color-green)", color: "var(--color-gold)" }}>
            Scan Now
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="px-5 py-12" style={{ borderTop: "1px solid var(--color-border)" }}>
      <h2 className="text-2xl text-center mb-6" style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)", fontWeight: 500 }}>
        Your Collection
      </h2>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="rounded-2xl p-4 text-center" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <p className="text-3xl font-bold" style={{ color: "var(--color-gold)" }}>{totalScans}</p>
          <p className="text-xs uppercase tracking-widest mt-1" style={{ color: "var(--color-text-muted)" }}>Total Scans</p>
        </div>
        <div className="rounded-2xl p-4 text-center" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <p className="text-3xl font-bold" style={{ color: "#00C853" }}>{formatCompactCurrency(portfolioValue)}</p>
          <p className="text-xs uppercase tracking-widest mt-1" style={{ color: "var(--color-text-muted)" }}>Portfolio Value</p>
        </div>
      </div>

      {categoryData.length > 0 && (
        <div className="rounded-2xl p-5 mb-4" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
          <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--color-gold)" }}>Category Breakdown</p>
          <div className="flex items-center gap-4">
            <div style={{ width: 100, height: 100, flexShrink: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={categoryData} dataKey="value" nameKey="name" innerRadius={26} outerRadius={46} paddingAngle={2}>
                    {categoryData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 flex flex-col gap-1.5 min-w-0">
              {categoryData.slice(0, 5).map((c, i) => (
                <div key={c.name} className="flex items-center gap-2 min-w-0">
                  <span className="rounded-full flex-shrink-0" style={{ width: 8, height: 8, background: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>{c.name}</span>
                  <span className="text-xs ml-auto flex-shrink-0" style={{ color: "var(--color-text-muted)" }}>{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {bestScans.length > 0 && (
        <div className="rounded-2xl p-5 space-y-3 mb-4" style={{ background: "linear-gradient(135deg, rgba(201,168,76,0.1) 0%, var(--color-surface) 70%)", border: "1px solid rgba(201,168,76,0.3)" }}>
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--color-gold)" }}>🏆 Your Top Scans</p>
          {bestScans.map((scan, index) => (
            <div key={index} className="flex gap-3 items-center">
              <span className="text-lg flex-shrink-0">{index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉"}</span>
              {scan.image_url && <img src={scan.image_url} alt={scan.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />}
              <div className="min-w-0">
                <p className="font-semibold text-sm truncate">{scan.name}</p>
                <p className="text-sm font-bold" style={{ color: "#00C853" }}>
                  {formatCompactCurrency(Number(String(scan.current_value).replace(/[^0-9.]/g, "")))}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Link href="/scan" className="block w-full text-center py-4 rounded-2xl font-semibold text-base tracking-wider uppercase transition-opacity hover:opacity-85" style={{ background: "var(--color-green)", color: "var(--color-gold)" }}>
        Scan Something New
      </Link>
    </section>
  );
}

interface TutorialSlideProps {
  visual: React.ReactNode;
  text: string;
}

function TutorialSlide({ visual, text }: TutorialSlideProps) {
  return (
    <div className="rounded-2xl p-5" style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)" }}>
      {visual}
      <p className="text-lg text-center mt-4" style={{ fontFamily: "var(--font-heading)", fontWeight: 500, color: "var(--color-text-primary)" }}>
        {text}
      </p>
    </div>
  );
}

function TutorialSection() {
  return (
    <section id="tutorial" className="px-5 py-12" style={{ borderTop: "1px solid var(--color-border)" }}>
      <h2 className="text-2xl text-center mb-2" style={{ fontFamily: "var(--font-heading)", color: "var(--color-gold)", fontWeight: 500 }}>
        How It Works
      </h2>
      <p className="text-sm text-center mb-8" style={{ color: "var(--color-text-muted)" }}>
        Everything Scanify does, in five quick steps.
      </p>

      <div className="flex flex-col gap-4">

        <TutorialSlide
          text="Take a photo of anything"
          visual={
            <div className="w-full flex items-center justify-center" style={{ height: 120 }}>
              <div className="w-20 h-20 rounded-full flex items-center justify-center" style={{ background: "var(--color-green)" }}>
                <svg width="34" height="34" viewBox="0 0 36 36" fill="none">
                  <line x1="18" y1="6" x2="18" y2="30" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round" />
                  <line x1="6" y1="18" x2="30" y2="18" stroke="#C9A84C" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          }
        />

        <TutorialSlide
          text="We tell you what it's worth"
          visual={
            <div style={{ height: 120 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={demoData} margin={{ top: 5, right: 10, left: -14, bottom: 0 }}>
                  <XAxis dataKey="year" tick={{ fill: "var(--color-text-muted)", fontSize: 9 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--color-text-muted)", fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Area type="monotone" dataKey="price" stroke="#7c3aed" strokeWidth={2.5} fill="#7c3aed" fillOpacity={0.15} dot={false} isAnimationActive animationDuration={1200} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          }
        />

        <TutorialSlide
          text="Camera photos can win the leaderboard!"
          visual={
            <div className="flex flex-col gap-2" style={{ height: 120, justifyContent: "center" }}>
              {demoLeaderboard.map((row) => (
                <div key={row.name} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ background: "var(--color-thumb)", border: "1px solid var(--color-border)" }}>
                  <span style={{ fontSize: 16 }}>{row.medal}</span>
                  <span className="text-xs flex-1 truncate" style={{ color: "var(--color-text-primary)" }}>{row.name}</span>
                  <span className="text-xs font-bold" style={{ color: "#00C853" }}>{row.value}</span>
                </div>
              ))}
            </div>
          }
        />

        <TutorialSlide
          text="Want to sell it? We'll find the best price"
          visual={
            <div className="flex flex-wrap gap-2 items-center justify-center" style={{ height: 120, alignContent: "center" }}>
              {demoPlatforms.map((p) => (
                <span key={p} className="px-4 py-2 rounded-full text-xs font-medium" style={{ background: "var(--color-thumb)", border: "1px solid rgba(201,168,76,0.3)", color: "var(--color-gold)" }}>
                  {p}
                </span>
              ))}
            </div>
          }
        />

        <TutorialSlide
          text="Every scan builds your collection"
          visual={
            <div style={{ height: 120 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={demoCategoryData} dataKey="value" nameKey="name" innerRadius={28} outerRadius={48} paddingAngle={3}>
                    {demoCategoryData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          }
        />

      </div>
    </section>
  );
}

function ScrollHint() {
  return (
    <div className="flex justify-center pb-6 relative z-10">
      <a href="#tutorial" aria-label="Scroll to see how Scanify works" style={{ animation: "bounce-hint 2s ease-in-out infinite" }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <path d="M6 9l6 6 6-6" stroke="var(--color-gold)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
      <style jsx>{`
        @keyframes bounce-hint {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50% { transform: translateY(6px); opacity: 1; }
        }
      `}</style>
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

        <div className="flex flex-col items-center justify-center flex-1 px-6 gap-8 relative z-10 pb-4">
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

        {!user && <ScrollHint />}
      </section>

      {user ? <MyActivitySection userId={user.id} /> : <TutorialSection />}

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