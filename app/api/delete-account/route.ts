import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function extractStoragePath(imageUrl: string): string | null {
  // Public URLs look like: https://[project].supabase.co/storage/v1/object/public/scans/uploads/12345.jpg
  const marker = "/storage/v1/object/public/scans/";
  const index = imageUrl.indexOf(marker);
  if (index === -1) return null;
  return imageUrl.slice(index + marker.length);
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: "Missing userId" }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

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