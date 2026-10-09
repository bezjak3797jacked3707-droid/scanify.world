import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function extractStoragePath(imageUrl: string): string | null {
  // Public URLs look like: https://[project].supabase.co/storage/v1/object/public/scans/uploads/12345.jpg
  const marker = "/storage/v1/object/public/scans/";
  const index = imageUrl.indexOf(marker);
  if (index === -1) return null;
  return imageUrl.slice(index + marker.length);
}

export async function POST(req: NextRequest) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    // Who is asking? This comes from the login token, never from the request body,
    // so nobody can delete an account that isn't theirs.
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }

    const { data: userData, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !userData?.user) {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    const userId = userData.user.id;

    // Fetch image URLs before deleting the rows
    const { data: scans } = await supabaseAdmin
      .from("scan_results")
      .select("image_url")
      .eq("user_id", userId);

    if (scans && scans.length > 0) {
      const paths = scans
        .map((s) => (s.image_url ? extractStoragePath(s.image_url) : null))
        .filter((p): p is string => !!p);

      if (paths.length > 0) {
        const { error: storageError } = await supabaseAdmin.storage.from("scans").remove(paths);
        if (storageError) {
          console.error("Storage cleanup error:", storageError.message);
          // Continue anyway — don't block account deletion on storage cleanup failure
        }
      }
    }

    // Delete user's scan data
    await supabaseAdmin.from("scan_results").delete().eq("user_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    // Delete the actual auth user
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (error) {
      console.error("Delete user error:", error.message);
      return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete account error:", error.message);
    return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
  }
}