import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";
import { updateStreak } from "@/lib/streak";

export const maxDuration = 300;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function saveResult(parsed: any, imageUrl: string, userId: string | null, displayName: string | null) {
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
  if (dbError) console.error("DB save error:", dbError.message);
  if (userId) {
    await supabase.rpc("increment_scans", { user_id_input: userId });
    await updateStreak(userId);
  }
}

function parseJSON(text: string) {
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

function checkContentErrors(parsed: any) {
  if (parsed.error === "inappropriate_content") return "inappropriate_content";
  if (parsed.error === "buildings_not_supported") return "buildings_not_supported";
  if (parsed.error === "image_unclear") return "image_unclear";
  return null;
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

        if (profile.scans_used >= 3) {
          return NextResponse.json({ error: "scan_limit_reached" }, { status: 403 });
        }
      }
    }

    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");
    const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";

    const noteHint = note
      ? `\nThe user believes this item is: "${note}". Use this as your primary identifier. Name it exactly as the user stated — do not add variants, trims, or body styles they did not mention. If they say "Revuelto", the answer is "Lamborghini Revuelto" — not "Revuelto Spyder" or any other variant.\n`
      : "";

    const prompt = `You are an expert appraiser and collector with deep knowledge of luxury cars, watches, sneakers, electronics, art, and collectibles. Your task is to examine this image carefully and identify the item with maximum precision, then provide accurate 2026 market valuations.
${noteHint}
<content_rules>
If the image contains adult or inappropriate content, respond with exactly: {"error": "inappropriate_content"}
If the image shows a building, structure, or anything fixed to the ground, respond with exactly: {"error": "buildings_not_supported"}
If the image is too blurry, dark, or unclear to identify, respond with exactly: {"error": "image_unclear"}
Only appraise portable physical objects that can be bought and sold.
</content_rules>

<identification_approach>
Study the image methodically before naming the item. Look at:
- Overall body shape, proportions, and silhouette
- Distinctive design elements unique to specific models
- Badges, logos, model designations, serial numbers
- Materials, finishes, and construction details
- Any wear, modifications, or special features visible

For exotic and luxury cars specifically, these distinctions matter enormously:

Key car distinctions:
- Lamborghini Revuelto: long, angular, hybrid V12, vertical Y-shaped taillights, Aventador successor. Much larger than Huracán.
- Lamborghini Huracán: compact, rounded, V10, horizontal taillights. Completely different from Revuelto.
- Koenigsegg Regera: covered rear wheels, smooth clamshell body, hybrid. Agera RS: exposed rear wheels, fixed wing, angular. Completely different cars.
- Ferrari 458 Speciale: fixed rear wing, aero bumpers, Speciale badge. Worth significantly more than base 458 Italia.
Apply same precision to all items — watches, sneakers, electronics, collectibles.
</identification_approach>

<valuation_approach>
Use real secondary market prices for 2026 — not MSRP, not historical prices.

Reference points for 2026 market values:
- Lamborghini Revuelto: $700,000 – $900,000+
- Lamborghini Huracán (base): $180,000 – $220,000
- Lamborghini Huracán STO: $280,000 – $320,000
- Ferrari 458 Speciale: $380,000 – $520,000
- Ferrari 458 Italia: $180,000 – $230,000
- Koenigsegg Regera: $2,000,000 – $3,000,000+
- Koenigsegg Agera RS: $4,000,000 – $6,000,000+

For sneakers: use StockX/GOAT average sold prices, not retail.
For watches: use Chrono24 or WatchBox current market prices.
For electronics: apply realistic depreciation from original retail.
For collectibles: reference recent auction results.

Be accurate — do not undervalue rare items or overvalue common ones. The price history should reflect real year-by-year market movement for this specific item from 2020 to 2026.
</valuation_approach>

Respond with only a valid JSON object — no explanation, no markdown, no backticks:

{
  "name": "precise full name including make, model, exact variant, year if determinable",
  "currentValue": "2026 market value as a number only, no dollar sign",
  "originalPrice": "original retail price as a number only, no dollar sign",
  "category": "specific product category",
  "confidence": "your confidence level as a number between 0 and 100",
  "description": "Three sentences describing what makes this specific item special, its market position, and why it has its current value.",
  "materials": "Three key materials, one per line. Format: Material — how it is used and why.",
  "specs": "Four key specifications with exact figures, one per line. Format: Spec name: value.",
  "priceHistory": [
    {"year": "2020", "price": 0},
    {"year": "2021", "price": 0},
    {"year": "2022", "price": 0},
    {"year": "2023", "price": 0},
    {"year": "2024", "price": 0},
    {"year": "2025", "price": 0},
    {"year": "2026", "price": 0}
  ]
}`;

    // PRIMARY: Claude Sonnet 4.6 (best accuracy + good speed)
    try {
      console.log("Trying Claude Sonnet 4.6...");
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: base64Image,
              },
            },
            { type: "text", text: prompt },
          ],
        }],
      });
      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const parsed = parseJSON(text);
      const contentError = checkContentErrors(parsed);
      if (contentError) return NextResponse.json({ error: contentError }, { status: 400 });
      await saveResult(parsed, imageUrl, userId, displayName);
      return NextResponse.json(parsed);
    } catch (err: any) {
      console.error("Claude Sonnet failed:", err?.message);
    }

    // FALLBACK 1: Claude Haiku 4.5
    try {
      console.log("Trying Claude Haiku 4.5...");
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 1200,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: base64Image,
              },
            },
            { type: "text", text: prompt },
          ],
        }],
      });
      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const parsed = parseJSON(text);
      const contentError = checkContentErrors(parsed);
      if (contentError) return NextResponse.json({ error: contentError }, { status: 400 });
      await saveResult(parsed, imageUrl, userId, displayName);
      return NextResponse.json(parsed);
    } catch (err: any) {
      console.error("Claude Haiku failed:", err?.message);
    }

    // FALLBACK 2: OpenAI GPT-4o (last resort)
    try {
      console.log("Trying OpenAI GPT-4o...");
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: "high",
              },
            },
          ],
        }],
        max_tokens: 2000,
      });
      const text = response.choices[0].message.content?.trim() || "";
      const parsed = parseJSON(text);
      const contentError = checkContentErrors(parsed);
      if (contentError) return NextResponse.json({ error: contentError }, { status: 400 });
      await saveResult(parsed, imageUrl, userId, displayName);
      return NextResponse.json(parsed);
    } catch (err: any) {
      console.error("OpenAI failed:", err?.message);
    }

    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });

  } catch (error: any) {
    console.error("=== ANALYZE ERROR ===");
    console.error("Message:", error?.message);
    return NextResponse.json({ error: "Analysis failed", detail: error?.message }, { status: 500 });
  }
}