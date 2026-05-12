import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/lib/supabase";

export const maxDuration = 300;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, userId, note, displayName } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "No image URL provided" }, { status: 400 });
    }

    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("scans_used, is_pro, scans_reset_at")
        .eq("id", userId)
        .single();

      if (profile && !profile.is_pro) {
        const now = new Date();
        const resetAt = new Date(profile.scans_reset_at as string);
        const isNewMonth = now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear();

        if (isNewMonth) {
          await supabase
            .from("profiles")
            .update({ scans_used: 0, scans_reset_at: now.toISOString() })
            .eq("id", userId);
          profile.scans_used = 0;
        }

        if (profile.scans_used >= 5) {
          return NextResponse.json(
            { error: "scan_limit_reached" },
            { status: 403 }
          );
        }
      }
    }

    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");
    const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const noteHint = note ? `The user has identified this item as: "${note}". Use this as a strong hint.` : "";

    const prompt = `You are an expert appraiser with deep knowledge of absolutely any object including luxury goods, cars, motorcycles, boats, aircraft, electronics, smartphones, computers, cameras, watches, jewelry, art, sculptures, collectibles, sneakers, clothing, handbags, furniture, antiques, musical instruments, sports equipment, tools, toys, video games, consoles, books, wine, real estate, and any other physical item. ${noteHint} Analyze this image carefully and identify the exact make, model and variant. Return ONLY a JSON object with no extra text, no markdown, no backticks. Use this exact format:
{
  "name": "full product name including exact model and variant",
  "currentValue": "estimated current market value in USD as a number only",
  "originalPrice": "original retail price in USD as a number only",
  "category": "product category",
  "confidence": "confidence percentage as number only",
  "description": "2-3 sentence description",
  "materials": "main materials used",
  "specs": "key specs or features",
  "priceHistory": [
    {"year": "2019", "price": 0},
    {"year": "2020", "price": 0},
    {"year": "2021", "price": 0},
    {"year": "2022", "price": 0},
    {"year": "2023", "price": 0},
    {"year": "2024", "price": 0}
  ]
}`;

    let lastError: any;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              mimeType,
              data: base64Image,
            },
          },
        ]);

        const text = result.response.text().trim();
        const parsed = JSON.parse(text);

        const { error: dbError } = await supabase.from("scan_results").insert({
          image_url: imageUrl,
          name: parsed.name,
          current_value: parsed.currentValue,
          original_price: parsed.originalPrice,
          category: parsed.category,
          confidence: parsed.confidence,
          description: parsed.description,
          materials: parsed.materials,
          specs: parsed.specs,
          user_id: userId || null,
          full_result: parsed,
          display_name: displayName || "Anonymous",
        });

        if (dbError) {
          console.error("DB save error:", dbError.message);
        }

        if (userId) {
          await supabase.rpc("increment_scans", { user_id_input: userId });
        }

        return NextResponse.json(parsed);

      } catch (err: any) {
        lastError = err;
        console.error(`Attempt ${attempt} failed:`, err?.message);
        if (attempt < 3) {
          await sleep(5000);
        }
      }
    }

    throw lastError;

  } catch (error: any) {
    console.error("=== ANALYZE ERROR ===");
    console.error("Message:", error?.message);
    return NextResponse.json({ error: "Analysis failed", detail: error?.message }, { status: 500 });
  }
}