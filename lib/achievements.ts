export interface AchievementDef {
    emoji: string;
    label: string;
    unlocked: boolean;
    remaining: number;
    unit: "scan" | "category" | "dollar" | "day";
  }
  
  export function buildAchievements(totalScans: number, categories: number, longestStreak: number, portfolioValue: number): AchievementDef[] {
    return [
      { emoji: "🔍", label: "First Scan", unlocked: totalScans >= 1, remaining: Math.max(0, 1 - totalScans), unit: "scan" },
      { emoji: "📦", label: "5 Scans", unlocked: totalScans >= 5, remaining: Math.max(0, 5 - totalScans), unit: "scan" },
      { emoji: "🏅", label: "25 Scans", unlocked: totalScans >= 25, remaining: Math.max(0, 25 - totalScans), unit: "scan" },
      { emoji: "🗂", label: "Collector", unlocked: categories >= 5, remaining: Math.max(0, 5 - categories), unit: "category" },
      { emoji: "💰", label: "$10k Portfolio", unlocked: portfolioValue >= 10000, remaining: Math.max(0, 10000 - portfolioValue), unit: "dollar" },
      { emoji: "🔥", label: "7 Day Streak", unlocked: longestStreak >= 7, remaining: Math.max(0, 7 - longestStreak), unit: "day" },
    ];
  }
  
  export function getNextAchievement(totalScans: number, categories: number, longestStreak: number, portfolioValue: number): AchievementDef | null {
    const achievements = buildAchievements(totalScans, categories, longestStreak, portfolioValue);
    return achievements.find((a) => !a.unlocked) ?? null;
  }
  
  export function formatAchievementProgress(a: AchievementDef): string {
    if (a.unit === "scan") return `${a.remaining} more scan${a.remaining !== 1 ? "s" : ""} to unlock`;
    if (a.unit === "category") return `${a.remaining} more categor${a.remaining !== 1 ? "ies" : "y"} to unlock`;
    if (a.unit === "dollar") return `$${a.remaining.toLocaleString()} more in portfolio value to unlock`;
    return `${a.remaining} more day${a.remaining !== 1 ? "s" : ""} in your streak to unlock`;
  }