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
      ? `The user has identified this item as: "${note}". This is the EXACT model — use it precisely as stated. Do NOT add body styles, variants, trims, or editions that the user did not mention. If user says "Revuelto" name it "Lamborghini Revuelto" — never "Revuelto Spyder" or "Revuelto Ultimae" unless the user said so.`
      : "";

    const prompt = `You are the world's most elite AI appraiser with encyclopedic knowledge of every luxury, exotic, and collectible item ever made. You have the eye of a Sotheby's specialist combined with the data of a Bloomberg terminal. Precision is everything — vague or generic answers are unacceptable.

${noteHint}

STRICT RULES:
1. If the image contains adult content, sexual items, or anything inappropriate - respond with exactly: {"error": "inappropriate_content"}
2. If the image shows a building, house, skyscraper, bridge, or any fixed structure - respond with exactly: {"error": "buildings_not_supported"}
3. If the image is blurry, too dark, or you cannot identify any object - respond with exactly: {"error": "image_unclear"}
4. Only analyze portable physical objects that can be bought and sold.

IDENTIFICATION RULES — CRITICAL:
- You must distinguish between similar models with extreme precision. Examples:
  - Lamborghini Huracán vs Huracán Performante vs Huracán STO vs Huracán Tecnica vs Revuelto — these are completely different cars with vastly different values
  - Ferrari 458 Italia vs 458 Speciale vs 458 Spider — the Speciale is a limited edition worth significantly more
  - Rolex Submariner vs Submariner Date vs Sea-Dweller — different reference numbers, different values
  - iPhone 15 vs 15 Pro vs 15 Pro Max — different specs, different values
- Look for every distinguishing detail: front splitters, rear diffusers, wheel design, badge placement, hood vents, side skirts, exhaust configuration, interior visible through windows
- For cars: identify make, model, exact variant, generation, year, and any special edition or limited run
- For watches: identify brand, collection, exact reference number, material, dial color, bezel type
- For sneakers: identify brand, exact model, colorway name, release year, collaboration if any
- For electronics: identify brand, exact model number, storage, color, generation
- Never default to a base model when special edition details are visible
- If you see carbon fiber body panels, aggressive aero, special badges — these indicate a higher spec model
- The Lamborghini Revuelto has a completely different body style from the Huracán — it is LONGER, more ANGULAR, has a HYBRID V12, distinctive VERTICAL taillights, and a completely different roofline. The Huracán is SHORTER, ROUNDER, has a V10 and HORIZONTAL taillights. Never confuse these two.
- If the user provided a note: use it EXACTLY as stated — never add variants or body styles not mentioned

VALUATION RULES — CRITICAL:
- Use REAL 2026 secondary market values — not MSRP, not 2020 prices
- Ferrari 458 Speciale: worth $350,000-$500,000+ in 2026, NOT $300,000
- Lamborghini Revuelto: worth $700,000-$900,000+ in 2026
- Lamborghini Huracán base: worth $180,000-$220,000 in 2026
- Lamborghini Huracán STO: worth $280,000-$320,000 in 2026
- For any exotic/limited car: values have appreciated significantly since new
- For sneakers: use actual StockX/GOAT average sold prices, not retail
- For watches: use Chrono24/WatchBox current asking prices
- For electronics: account for depreciation from original retail
- For collectibles: use recent auction hammer prices
- Do NOT undervalue rare or limited edition items
- Do NOT overvalue common items
- Price history must show realistic year-by-year market movement for this specific item

Return ONLY a JSON object with no extra text, no markdown, no backticks:
{
  "name": "extremely precise name — make, model, exact variant, year, special edition if applicable",
  "currentValue": "accurate 2026 market value as number only no dollar sign",
  "originalPrice": "original retail/MSRP as number only no dollar sign",
  "category": "specific category",
  "confidence": "confidence percentage as number only",
  "description": "Write exactly 3 sentences. Be specific about what makes THIS exact variant special versus the base model.",
  "materials": "List exactly 3 key materials. One line each. Format: Material — where used and why.",
  "specs": "List exactly 4 key specs with exact numbers. One line each. Format: Spec: value.",
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

    // PRIMARY: Claude Haiku 4.5 (fast + accurate)
    try {
      console.log("Trying Claude Haiku 4.5...");
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 2000,
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

    // FALLBACK 1: Claude Sonnet 4.6 (more accurate)
    try {
      console.log("Trying Claude Sonnet 4.6...");
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 2000,
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