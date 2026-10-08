import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { checkDisplayName } from "@/lib/nameFilter";
import { NAME_NOT_ALLOWED } from "@/lib/displayName";

export const dynamic = "force-dynamic";

// OpenAI's moderation endpoint is free and understands many languages.
// It throws if the call fails, so the caller can refuse the name instead of letting it through.
async function isFlaggedByModeration(name: string): Promise<boolean> {
  const res = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({ model: "omni-moderation-latest", input: name }),
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`Moderation API returned ${res.status}`);
  const data = await res.json();
  return Boolean(data?.results?.[0]?.flagged);
}

export async function POST(req: NextRequest) {
  // 1. Who is asking? Taken from the login token, never from the request body.
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }

  let admin: ReturnType<typeof getSupabaseAdmin>;
  try {
    admin = getSupabaseAdmin();
  } catch (err) {
    console.error("set-display-name config error:", err);
    return NextResponse.json({ error: "Something went wrong. Please try again later." }, { status: 500 });
  }

  const { data: userData, error: authError } = await admin.auth.getUser(token);
  if (authError || !userData?.user) {
    return NextResponse.json({ error: "Please sign in again." }, { status: 401 });
  }
  const userId = userData.user.id;

  // 2. Format rules + word filter.
  const body = await req.json().catch(() => null);
  const check = checkDisplayName(body?.name);
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 400 });
  }

  // 3. Moderation (catches what a word list can't, in many languages).
  try {
    if (await isFlaggedByModeration(check.name)) {
      return NextResponse.json({ error: NAME_NOT_ALLOWED }, { status: 400 });
    }
  } catch (err) {
    console.error("Name moderation failed:", err);
    return NextResponse.json(
      { error: "Couldn't check that name right now. Please try again in a moment." },
      { status: 503 }
    );
  }

  // 4. Save. The unique index on lower(display_name) rejects duplicates.
  const { data: updated, error: updateError } = await admin
    .from("profiles")
    .update({ display_name: check.name })
    .eq("id", userId)
    .select("id");

  if (updateError) {
    if (updateError.code === "23505") {
      return NextResponse.json({ error: "That name is already taken." }, { status: 409 });
    }
    console.error("set-display-name update error:", updateError.message);
    return NextResponse.json({ error: "Couldn't save your name. Please try again." }, { status: 500 });
  }
  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }

  // 5. Show the new name on all of this user's earlier scans (and so on the leaderboard).
  const { error: scansError } = await admin
    .from("scan_results")
    .update({ display_name: check.name })
    .eq("user_id", userId);
  if (scansError) console.error("Could not update display_name on old scans:", scansError.message);

  return NextResponse.json({ ok: true, name: check.name });
}