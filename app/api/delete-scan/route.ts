import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function extractStoragePath(imageUrl: string): string | null {
  const marker = "/storage/v1/object/public/scans/";
  const index = imageUrl.indexOf(marker);
  if (index === -1) return null;
  return imageUrl.slice(index + marker.length);
}

export async function POST(req: NextRequest) {
  try {
    const { scanId, userId } = await req.json();

    if (!scanId || !userId) {
      return NextResponse.json({ error: "Missing scanId or userId" }, { status: 400 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Fetch the scan first — verify it belongs to this user and get the image URL
    const { data: scan, error: fetchError } = await supabaseAdmin
      .from("scan_results")
      .select("image_url, user_id")
      .eq("id", scanId)
      .single();

    if (fetchError || !scan) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    if (scan.user_id !== userId) {
      return NextResponse.json({ error: "Not authorized to delete this scan" }, { status: 403 });
    }

    // Delete the storage file
    if (scan.image_url) {
      const path = extractStoragePath(scan.image_url);
      if (path) {
        const { error: storageError } = await supabaseAdmin.storage.from("scans").remove([path]);
        if (storageError) {
          console.error("Storage cleanup error:", storageError.message);
        }
      }
    }

    // Delete the database row
    const { error: deleteError } = await supabaseAdmin.from("scan_results").delete().eq("id", scanId);

    if (deleteError) {
      console.error("Delete scan error:", deleteError.message);
      return NextResponse.json({ error: "Failed to delete scan" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete scan error:", error.message);
    return NextResponse.json({ error: "Failed to delete scan" }, { status: 500 });
  }
}