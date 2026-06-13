import { supabase } from "@/lib/supabase";

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Updates a user's scan streak after a successful scan.
 * Consecutive calendar days (UTC) extend the streak; a gap resets it to 1.
 */
export async function updateStreak(userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("current_streak, longest_streak, last_scan_date")
    .eq("id", userId)
    .single();

  if (!profile) return;

  const today = new Date();
  const todayStr = toDateString(today);
  if (profile.last_scan_date === todayStr) return;

  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const yesterdayStr = toDateString(yesterday);

  const currentStreak = profile.last_scan_date === yesterdayStr ? (profile.current_streak || 0) + 1 : 1;
  const longestStreak = Math.max(profile.longest_streak || 0, currentStreak);

  await supabase
    .from("profiles")
    .update({ current_streak: currentStreak, longest_streak: longestStreak, last_scan_date: todayStr })
    .eq("id", userId);
}
