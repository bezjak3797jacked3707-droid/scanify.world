"use client";

import AuthButton from "@/components/AuthButton";

import Link from "next/link";
import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const demoData = [
  { year: "2019", price: 160 },
  { year: "2020", price: 185 },
  { year: "2021", price: 240 },
  { year: "2022", price: 210 },
  { year: "2023", price: 265 },
  { year: "2024", price: 310 },
];

const reviews = [
  {
    initials: "SM",
    name: "Sarah M.",
    stars: 5,
    comment:
      "this makes reselling so much easier with scanify! im lucky i found this out!",
  },
  {
    initials: "JT",
    name: "James T.",
    stars: 5,
    comment:
      "i just sold my old shoes for more then i bought them for!",
  },
  {
    initials: "AL",
    name: "Amara L.",
    stars: 4,
    comment:
      "taking a picture of it is so much easier then doing so much research.",
  },
  {
    initials: "CR",
    name: "Carlos R.",
    stars: 5,
    comment:
      "getting to know the materials its made of is such a luxury.",
  },
];

function Stars({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} width="11" height="11" viewBox="0 0 24 24">
          <path
            d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            fill={i < count ? "#C9A84C" : "#2a2a2a"}
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    setEmail("");
    setMessage("");
  }

  return (
    <main
      className="min-h-screen"
      style={{ background: "var(--color-black)", color: "#ededed" }}
    >
      {/* ═══════════════════════════════════════════
          SECTION 1 — HERO
      ═══════════════════════════════════════════ */}
      <section
        className="relative flex flex-col overflow-hidden"
        style={{
          minHeight: "88vh",
          background:
            "radial-gradient(ellipse 140% 60% at 50% 0%, rgba(27,77,62,0.18) 0%, var(--color-black) 65%)",
        }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 pt-8 relative z-10">
          <span
            className="text-2xl tracking-widest"
            style={{
              color: "var(--color-gold)",
              fontFamily: "var(--font-heading)",
              fontWeight: 500,
            }}
          >
            Scanify
          </span>
          <AuthButton />
        </div>

        {/* Wavy blurred accent line */}
        <div
          className="absolute inset-x-0 pointer-events-none"
          style={{ top: "48%", zIndex: 1 }}
        >
          <svg
            viewBox="0 0 400 70"
            preserveAspectRatio="none"
            className="w-full"
            style={{ height: 70, filter: "blur(10px)", opacity: 0.45 }}
          >
            <defs>
              <linearGradient id="heroWave" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%"   stopColor="#1B4D3E" stopOpacity="0" />
                <stop offset="25%"  stopColor="#C9A84C" stopOpacity="0.9" />
                <stop offset="55%"  stopColor="#1B4D3E" stopOpacity="0.8" />
                <stop offset="80%"  stopColor="#C9A84C" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#1B4D3E" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 35 C60 12, 120 58, 200 35 S320 12, 400 35"
              stroke="url(#heroWave)"
              strokeWidth="3.5"
              fill="none"
            />
            <path
              d="M0 42 C80 20, 160 60, 240 38 S360 18, 400 42"
              stroke="url(#heroWave)"
              strokeWidth="1.5"
              fill="none"
              opacity="0.45"
            />
          </svg>
        </div>

        {/* Center content */}
        <div className="flex flex-col items-center justify-center flex-1 px-6 gap-8 relative z-10 pb-10">
          {/* Logo placeholder */}
          <div className="w-64 h-64 rounded-3xl overflow-hidden">
  <img
    src="/logo.png"
    alt="Scanify logo"
    className="w-full h-full object-contain"
    style={{ mixBlendMode: "screen" }}
  />
</div>

          {/* Tagline */}
          <div className="text-center space-y-1.5">
            <h1
              className="text-4xl leading-tight"
              style={{
                fontFamily: "var(--font-heading)",
                fontWeight: 500,
                color: "#ededed",
              }}
            >
              Scan Anything.
              <br />
              <span style={{ color: "var(--color-gold)" }}>Know Its Value.</span>
            </h1>
            <p className="text-sm" style={{ color: "#666" }}>
              AI-powered appraisals in seconds.
            </p>
          </div>

          {/* CTA buttons */}
          <div className="flex flex-col items-center gap-3 w-full">
            <Link
              href="/scan"
              className="w-full text-center py-4 rounded-2xl font-semibold text-base tracking-wider uppercase transition-opacity hover:opacity-85"
              style={{
                background: "var(--color-green)",
                color: "var(--color-gold)",
              }}
            >
              Try Free Scan
            </Link>
            <Link
              href="/signup"
              className="w-full text-center py-3 rounded-2xl text-sm tracking-wider uppercase font-medium transition-opacity hover:opacity-70"
              style={{
                border: "1px solid rgba(201,168,76,0.35)",
                color: "var(--color-gold)",
              }}
            >
              Sign Up
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 3 — REVIEWS
      ═══════════════════════════════════════════ */}
      <section
        className="px-5 py-12"
        style={{ borderTop: "1px solid var(--color-border)" }}
      >
        <h2
          className="text-2xl text-center mb-6"
          style={{
            fontFamily: "var(--font-heading)",
            color: "var(--color-gold)",
            fontWeight: 500,
          }}
        >
          What People Say
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {reviews.map((r) => (
            <div
              key={r.name}
              className="rounded-2xl p-4 flex flex-col gap-2"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-brown)",
              }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    background: "#2C1A0E",
                    color: "var(--color-gold)",
                    fontSize: 10,
                  }}
                >
                  {r.initials}
                </div>
                <span className="text-xs font-semibold" style={{ color: "#ddd" }}>
                  {r.name}
                </span>
              </div>
              <Stars count={r.stars} />
              <p className="text-xs leading-relaxed" style={{ color: "#777" }}>
                {r.comment}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 4 — HOW IT WORKS
      ═══════════════════════════════════════════ */}
      <section
        className="px-5 py-12"
        style={{ borderTop: "1px solid var(--color-border)" }}
      >
        <h2
          className="text-2xl text-center mb-2"
          style={{
            fontFamily: "var(--font-heading)",
            color: "var(--color-gold)",
            fontWeight: 500,
          }}
        >
          How It Works
        </h2>
        <p className="text-sm text-center mb-8" style={{ color: "#555" }}>
          Snap a photo. Our AI returns value, history, and specs instantly.
        </p>

        {/* Steps */}
        <div className="flex flex-col gap-3 mb-8">
          {[
            {
              n: "1",
              title: "Snap or upload",
              body: "Take a photo of any item — sneakers, electronics, collectibles, art.",
            },
            {
              n: "2",
              title: "AI analyzes",
              body: "Gemini Vision identifies the item and pulls real market data.",
            },
            {
              n: "3",
              title: "See the value",
              body: "Get current price, 6-year history graph, materials, and full specs.",
            },
          ].map((s) => (
            <div
              key={s.n}
              className="flex gap-4 items-start rounded-2xl p-4"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
              }}
            >
              <span
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                style={{
                  background: "var(--color-green)",
                  color: "var(--color-gold)",
                }}
              >
                {s.n}
              </span>
              <div>
                <p className="font-semibold text-sm mb-0.5">{s.title}</p>
                <p className="text-xs leading-relaxed" style={{ color: "#666" }}>
                  {s.body}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Demo price graph */}
        <div
          className="rounded-2xl p-4 pt-5"
          style={{
            background: "var(--color-surface)",
            border: "1px solid var(--color-border)",
          }}
        >
          <p
            className="text-xs uppercase tracking-widest mb-0.5"
            style={{ color: "var(--color-gold)" }}
          >
            Example · Nike Air Jordan 1
          </p>
          <p className="text-xs mb-4" style={{ color: "#444" }}>
            Estimated resale value 2019–2024
          </p>
          <div style={{ height: 148 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={demoData}
                margin={{ top: 5, right: 10, left: -14, bottom: 0 }}
              >
                <XAxis
                  dataKey="year"
                  tick={{ fill: "#555", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "#555", fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: "#111",
                    border: "1px solid #1e1e1e",
                    borderRadius: 10,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#C9A84C", fontSize: 11 }}
                  itemStyle={{ color: "#ededed" }}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="#7c3aed"
                  strokeWidth={2.5}
                  fill="#7c3aed"
                  fillOpacity={0.1}
                  dot={false}
                  isAnimationActive={true}
                  animationDuration={1800}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 5 — CONTACT
      ═══════════════════════════════════════════ */}
      <section
        className="px-5 py-12"
        style={{ borderTop: "1px solid var(--color-border)" }}
      >
        <h2
          className="text-2xl text-center mb-2"
          style={{
            fontFamily: "var(--font-heading)",
            color: "var(--color-gold)",
            fontWeight: 500,
          }}
        >
          Get in Touch
        </h2>
        <p className="text-sm text-center mb-8" style={{ color: "#555" }}>
          Questions, feedback, or partnerships — we&apos;d love to hear from you.
        </p>

        {submitted ? (
          <div
            className="rounded-2xl p-6 text-center"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-green)",
            }}
          >
            <p className="text-sm font-medium" style={{ color: "#00C853" }}>
              Message sent.
            </p>
            <p className="text-xs mt-1" style={{ color: "#666" }}>
              We&apos;ll get back to you soon.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <input
              type="email"
              required
              placeholder="Your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none placeholder:text-zinc-700"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "#ededed",
                fontFamily: "var(--font-body)",
              }}
            />
            <textarea
              required
              rows={4}
              placeholder="Your message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none placeholder:text-zinc-700"
              style={{
                background: "var(--color-surface)",
                border: "1px solid var(--color-border)",
                color: "#ededed",
                fontFamily: "var(--font-body)",
              }}
            />
            <button
              type="submit"
              className="w-full py-3 rounded-xl font-semibold text-sm tracking-wider uppercase transition-opacity hover:opacity-85"
              style={{
                background: "var(--color-gold)",
                color: "#0a0a0a",
              }}
            >
              Send Message
            </button>
          </form>
        )}
      </section>

      {/* ═══════════════════════════════════════════
          SECTION 6 — FOOTER
      ═══════════════════════════════════════════ */}
      <footer
        className="px-5 py-10 flex flex-col items-center gap-5"
        style={{ borderTop: "1px solid var(--color-border)" }}
      >
        <span
          style={{
            fontFamily: "var(--font-heading)",
            color: "var(--color-gold)",
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: "0.15em",
          }}
        >
          Scanify
        </span>
        <div className="flex gap-6 text-xs">
          <a
            href="#"
            target="_blank"
            rel="noopener noreferrer"
            className="transition-opacity hover:opacity-70"
            style={{ color: "#666" }}
          >
            Instagram
          </a>
          <a
            href="/terms"
            className="transition-opacity hover:opacity-70"
            style={{ color: "#666" }}
          >
            Terms of Service
          </a>
          <a
            href="/privacy"
            className="transition-opacity hover:opacity-70"
            style={{ color: "#666" }}
          >
            Privacy Policy
          </a>
        </div>
        <p className="text-xs" style={{ color: "#3a3a3a" }}>
          © {new Date().getFullYear()} Scanify. All rights reserved.
        </p>
      </footer>
    </main>
  );
}
