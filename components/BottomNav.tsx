"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SLOTS = [
  { href: "/",        label: "Home"    },
  { href: "/ranking", label: "Rank"    },
  null, // center — Scan button
  { href: "/history", label: "History" },
  { href: "/pricing", label: "Pricing" },
];

function slotIndex(pathname: string) {
  if (pathname === "/")        return 0;
  if (pathname === "/ranking") return 1;
  if (pathname === "/scan")    return 2;
  if (pathname === "/history") return 3;
  if (pathname === "/pricing") return 4;
  return -1;
}

// ── Icons ──────────────────────────────────────────────

function HomeIcon({ active }: { active: boolean }) {
  const c = active ? "#C9A84C" : "#3a3a3a";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z"
        stroke={c}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={active ? "rgba(201,168,76,0.15)" : "none"}
      />
      <path
        d="M9 21V12h6v9"
        stroke={c}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RankIcon({ active }: { active: boolean }) {
  const c = active ? "#C9A84C" : "#3a3a3a";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <rect x="3"  y="12" width="4" height="9" rx="1"
        fill={active ? "rgba(201,168,76,0.15)" : "none"} stroke={c} strokeWidth="1.7" />
      <rect x="10" y="7"  width="4" height="14" rx="1"
        fill={active ? "rgba(201,168,76,0.15)" : "none"} stroke={c} strokeWidth="1.7" />
      <rect x="17" y="3"  width="4" height="18" rx="1"
        fill={active ? "rgba(201,168,76,0.15)" : "none"} stroke={c} strokeWidth="1.7" />
    </svg>
  );
}

function ClockIcon({ active }: { active: boolean }) {
  const c = active ? "#C9A84C" : "#3a3a3a";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
      stroke={c} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}

function CrownIcon({ active }: { active: boolean }) {
  const c = active ? "#C9A84C" : "#3a3a3a";
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 17h18l-2-9-4 4-3-7-3 7-4-4-2 9z"
        stroke={c}
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={active ? "rgba(201,168,76,0.15)" : "none"}
      />
      <path d="M3 20h18" stroke={c} strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

const ICONS = [HomeIcon, RankIcon, null, ClockIcon, CrownIcon];

// ── Component ───────────────────────────────────────────

export default function BottomNav() {
  const pathname = usePathname();
  const active = slotIndex(pathname);

  // Indicator slides between the 4 non-scan tab centers.
  // Each slot is 20% wide; center = slot*20+10 percent.
  const showIndicator = active >= 0 && active !== 2;
  const indicatorLeft  = `${active * 20 + 10}%`;

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md z-50"
      style={{ background: "#0d0d0d", borderTop: "1px solid #1a1a1a" }}
    >
      {/* Sliding gold indicator at the top of the bar */}
      <div
        className="absolute top-0 rounded-full"
        style={{
          height: 2,
          width: "12%",
          background: "var(--color-gold)",
          left: showIndicator ? indicatorLeft : "-20%",
          transform: "translateX(-50%)",
          opacity: showIndicator ? 1 : 0,
          transition: "left 0.3s cubic-bezier(0.4,0,0.2,1), opacity 0.2s",
          boxShadow: "0 0 8px rgba(201,168,76,0.6)",
        }}
      />

      <div className="flex items-end h-[62px] px-1">
        {SLOTS.map((slot, i) => {
          // Center scan button
          if (slot === null) {
            const scanActive = pathname === "/scan";
            return (
              <div
                key="scan"
                className="flex-1 flex justify-center items-center relative h-full"
              >
                <Link
                  href="/scan"
                  aria-label="Scan"
                  className="absolute flex items-center justify-center rounded-full transition-transform active:scale-95"
                  style={{
                    width: 54,
                    height: 54,
                    bottom: 10,
                    background: scanActive
                      ? "var(--color-gold)"
                      : "var(--color-green)",
                    boxShadow: scanActive
                      ? "0 -4px 24px rgba(201,168,76,0.35), 0 4px 14px rgba(0,0,0,0.5)"
                      : "0 -4px 24px rgba(27,77,62,0.4),  0 4px 14px rgba(0,0,0,0.5)",
                  }}
                >
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <line
                      x1="12" y1="5" x2="12" y2="19"
                      stroke={scanActive ? "#0a0a0a" : "#C9A84C"}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                    <line
                      x1="5" y1="12" x2="19" y2="12"
                      stroke={scanActive ? "#0a0a0a" : "#C9A84C"}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </Link>
              </div>
            );
          }

          // Regular tab
          const isActive = pathname === slot.href;
          const Icon = ICONS[i] as React.FC<{ active: boolean }>;
          return (
            <Link
              key={slot.href}
              href={slot.href}
              className="flex-1 flex flex-col items-center justify-center gap-1 h-full transition-opacity hover:opacity-70"
            >
              <Icon active={isActive} />
              <span
                className="text-[9px] uppercase tracking-widest"
                style={{
                  color: isActive ? "var(--color-gold)" : "#3a3a3a",
                  transition: "color 0.2s",
                }}
              >
                {slot.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
