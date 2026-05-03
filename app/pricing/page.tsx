import Link from "next/link";

// ── Feature lists ───────────────────────────────────────

const FREE_FEATURES = [
  { label: "2 scans per month",       included: true  },
  { label: "Basic item identification",included: true  },
  { label: "Current value estimate",  included: true  },
  { label: "Category & materials",    included: true  },
  { label: "Price history graph",     included: false },
  { label: "Leaderboard ranking",     included: false },
  { label: "Priority AI analysis",    included: false },
];

const PRO_FEATURES = [
  "99+ scans per month",
  "Full AI appraisal",
  "Price history graph (6 years)",
  "Leaderboard & ranking",
  "Priority AI analysis",
  "Category & materials",
  "Early feature access",
];

const COMPARISON = [
  { label: "Monthly scans",        free: "2",       pro: "99+"  },
  { label: "AI appraisal",         free: "Basic",   pro: "Priority"   },
  { label: "Current value",        free: true,      pro: true         },
  { label: "Price history graph",  free: false,     pro: true         },
  { label: "Leaderboard",          free: false,     pro: true         },
  { label: "Materials & specs",    free: true,      pro: true         },
  { label: "Early access",         free: false,     pro: true         },
];

// ── Icons ───────────────────────────────────────────────

function CheckIcon({ gold }: { gold?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle
        cx="12" cy="12" r="11"
        fill={gold ? "rgba(201,168,76,0.14)" : "rgba(0,200,83,0.09)"}
      />
      <path
        d="M7 12.5l3.5 3.5L17 8"
        stroke={gold ? "#C9A84C" : "#00C853"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="11" fill="rgba(255,255,255,0.02)" />
      <path
        d="M9 9l6 6M15 9l-6 6"
        stroke="#2a2a2a"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// ── Page ────────────────────────────────────────────────

export default function PricingPage() {
  return (
    <main
      className="min-h-screen pb-12"
      style={{ background: "var(--color-black)", color: "#ededed" }}
    >
      <div className="px-5 pt-10">

        {/* Header */}
        <div className="text-center mb-10">
          <p
            className="text-xs uppercase tracking-widest mb-3"
            style={{ color: "var(--color-gold)" }}
          >
            Pricing
          </p>
          <h1
            className="text-4xl leading-tight mb-3"
            style={{ fontFamily: "var(--font-heading)", fontWeight: 500 }}
          >
            Simple, honest pricing
          </h1>
          <p className="text-sm" style={{ color: "#555" }}>
            Start free. Upgrade when you want more.
          </p>
        </div>

        {/* ── Two-column plan cards ── */}
        <div className="grid grid-cols-2 gap-3 items-start mb-8">

          {/* Free card */}
          <div
            className="rounded-3xl p-5 flex flex-col"
            style={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              minHeight: 420,
            }}
          >
            <p
              className="text-[10px] uppercase tracking-widest mb-5"
              style={{ color: "#555" }}
            >
              Free
            </p>

            <div className="mb-6">
              <div className="flex items-end gap-1">
                <span className="text-4xl font-bold" style={{ color: "#ededed" }}>
                  $0
                </span>
                <span className="text-xs pb-1.5" style={{ color: "#3a3a3a" }}>
                  /mo
                </span>
              </div>
            </div>

            <ul className="flex flex-col gap-3 flex-1 mb-7">
              {FREE_FEATURES.map((f) => (
                <li key={f.label} className="flex items-start gap-2">
                  {f.included ? <CheckIcon /> : <CrossIcon />}
                  <span
                    className="text-[11px] leading-snug"
                    style={{ color: f.included ? "#aaa" : "#333" }}
                  >
                    {f.label}
                  </span>
                </li>
              ))}
            </ul>

            <Link
              href="/scan"
              className="block w-full text-center py-3 rounded-2xl text-[10px] font-semibold uppercase tracking-widest transition-opacity hover:opacity-60"
              style={{
                border: "1px solid #222",
                color: "#555",
              }}
            >
              Get Started
            </Link>
          </div>

          {/* Pro card — elevated with green border */}
          <div
            className="rounded-3xl p-5 flex flex-col relative"
            style={{
              background:
                "linear-gradient(155deg, rgba(27,77,62,0.22) 0%, var(--color-surface) 55%)",
              border: "1px solid var(--color-green)",
              transform: "translateY(-10px)",
              boxShadow:
                "0 16px 48px rgba(27,77,62,0.22), 0 4px 20px rgba(0,0,0,0.5)",
              minHeight: 420,
            }}
          >
            {/* Most Popular badge */}
            <div
              className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full whitespace-nowrap"
              style={{
                background: "var(--color-green)",
                color: "var(--color-gold)",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Most Popular
            </div>

            <p
              className="text-[10px] uppercase tracking-widest mb-5"
              style={{ color: "var(--color-gold)" }}
            >
              Pro
            </p>

            <div className="mb-6">
              <div className="flex items-end gap-1">
                <span
                  className="text-4xl font-bold"
                  style={{ color: "var(--color-gold)" }}
                >
                  $9.99
                </span>
                <span className="text-xs pb-1.5" style={{ color: "#555" }}>
                  /mo
                </span>
              </div>
            </div>

            <ul className="flex flex-col gap-3 flex-1 mb-7">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <CheckIcon gold />
                  <span className="text-[11px] leading-snug" style={{ color: "#ccc" }}>
                    {f}
                  </span>
                </li>
              ))}
            </ul>

            <Link
              href="/upgrade"
              className="block w-full text-center py-3 rounded-2xl text-[10px] font-semibold uppercase tracking-widest transition-opacity hover:opacity-85"
              style={{
                background: "var(--color-green)",
                color: "var(--color-gold)",
              }}
            >
              Upgrade to Pro
            </Link>
          </div>
        </div>

        {/* ── Comparison table ── */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{ border: "1px solid var(--color-border)" }}
        >
          {/* Table header */}
          <div
            className="grid grid-cols-3 px-5 py-4"
            style={{
              background: "var(--color-surface)",
              borderBottom: "1px solid var(--color-border)",
            }}
          >
            <span
              className="text-xs font-semibold"
              style={{
                fontFamily: "var(--font-heading)",
                color: "var(--color-gold)",
                letterSpacing: "0.06em",
              }}
            >
              Compare
            </span>
            <span
              className="text-[10px] uppercase tracking-widest text-center"
              style={{ color: "#444" }}
            >
              Free
            </span>
            <span
              className="text-[10px] uppercase tracking-widest text-center"
              style={{ color: "var(--color-gold)" }}
            >
              Pro
            </span>
          </div>

          {/* Table rows */}
          {COMPARISON.map((row, i) => (
            <div
              key={row.label}
              className="grid grid-cols-3 px-5 py-3.5 items-center"
              style={{
                borderBottom:
                  i < COMPARISON.length - 1
                    ? "1px solid #0f0f0f"
                    : undefined,
                background:
                  i % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)",
              }}
            >
              <span className="text-[11px]" style={{ color: "#555" }}>
                {row.label}
              </span>

              {/* Free cell */}
              <div className="flex justify-center items-center">
                {typeof row.free === "boolean" ? (
                  row.free ? <CheckIcon /> : <CrossIcon />
                ) : (
                  <span className="text-[11px]" style={{ color: "#3a3a3a" }}>
                    {row.free}
                  </span>
                )}
              </div>

              {/* Pro cell */}
              <div className="flex justify-center items-center">
                {typeof row.pro === "boolean" ? (
                  row.pro ? <CheckIcon gold /> : <CrossIcon />
                ) : (
                  <span
                    className="text-[11px] font-medium"
                    style={{ color: "var(--color-gold)" }}
                  >
                    {row.pro}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-center text-[11px] mt-8" style={{ color: "#2e2e2e" }}>
          Pricing in USD · Cancel anytime · No hidden fees
        </p>

      </div>
    </main>
  );
}
