import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";

export const maxDuration = 300;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

    const noteHint = note ? `The user has identified this item as: "${note}". Use this as a strong hint.` : "";

    const prompt = `You are the world's most accurate AI appraiser with expert knowledge of every physical object that exists. Your job is to identify items with extreme precision and provide accurate market valuations.

CRITICAL INSTRUCTION: You must provide EXTREMELY detailed and comprehensive responses. Do not summarize. Do not be brief. Write as much detail as possible for description, materials and specs. Users are paying for detailed professional appraisals. Short responses are unacceptable.

${noteHint}

STRICT RULES:
1. If the image contains adult content, sexual items, or anything inappropriate - respond with exactly: {"error": "inappropriate_content"}
2. If the image shows a building, house, skyscraper, bridge, or any fixed structure - respond with exactly: {"error": "buildings_not_supported"}
3. If the image is blurry, too dark, or you cannot identify any object - respond with exactly: {"error": "image_unclear"}
4. Only analyze portable physical objects that can be bought and sold.

IDENTIFICATION RULES:
- Look extremely carefully at ALL visible details: logos, badges, model numbers, color, shape, design elements, stitching, hardware, labels
- For cars: identify the exact make, model, year, trim level and any special edition (e.g. "2019 Lamborghini Huracán Performante" not just "Lamborghini")
- For shoes: identify exact colorway and edition (e.g. "Nike Air Jordan 1 Retro High OG Chicago 2015" not just "Jordan 1")
- For electronics: identify exact model number and variant (e.g. "Apple iPhone 15 Pro Max 256GB Natural Titanium" not just "iPhone")
- For watches: identify exact reference number if visible (e.g. "Rolex Submariner Date 126610LN" not just "Rolex")
- For clothing: identify brand, collection, and season if possible
- Never guess vaguely - if you can see a logo or badge always use it
- If the user provided a hint about the item, use it heavily to guide identification

VALUATION RULES:
- Research current real market prices not just retail prices
- For cars use current market value not MSRP unless asked
- For sneakers use current resale market value (StockX/GOAT prices)
- For electronics use current used market value
- For collectibles use recent auction results
- Be specific with numbers - avoid wide ranges
- Price history should show realistic yearly market fluctuations
- The current year is 2026. Always provide 2026 market values for currentValue not older prices
- The priceHistory must end with 2026 as the most recent year showing the same value as currentValue
- Be conservative with valuations — when in doubt price lower not higher
- For cars use private party sale value not dealer prices
- For sneakers use average sold prices not asking prices
- For electronics account for depreciation and used condition
- Do not overestimate — users should be pleasantly surprised not disappointed
- If the item shows wear or age factor that into the price

Return ONLY a JSON object with no extra text, no markdown, no backticks:
{
  "name": "extremely specific and accurate product name with exact model, variant, year, and edition",
  "currentValue": "the current 2026 market value in USD as a number only no dollar sign",
  "originalPrice": "original retail price in USD as a number only no dollar sign",
  "category": "specific product category",
  "confidence": "your confidence percentage as a number only",
  "description": "Write exactly 3 sentences. Cover what makes this item special and its market context. Be specific but concise.",
  "materials": "List exactly 3 key materials. One line each. Format: Material — brief reason why used.",
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

    // PRIMARY: Try Gemini 2.5 Flash first (cheapest, most detailed)
    try {
      console.log("Trying Gemini 2.5 Flash...");
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      const result = await model.generateContent([
        prompt,
        { inlineData: { mimeType, data: base64Image } },
      ]);
      const parsed = parseJSON(result.response.text().trim());
      const contentError = checkContentErrors(parsed);
      if (contentError) return NextResponse.json({ error: contentError }, { status: 400 });
      await saveResult(parsed, imageUrl, userId, displayName);
      return NextResponse.json(parsed);
    } catch (err: any) {
      console.error("Gemini 2.5 Flash failed:", err?.message);
    }

    // FALLBACK 1: Claude 3.5 Sonnet (reliable, great detail)
    try {
      console.log("Trying Claude 3.5 Sonnet...");
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 2500,
        messages: [
          {
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
          },
        ],
      });
      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const parsed = parseJSON(text);
      const contentError = checkContentErrors(parsed);
      if (contentError) return NextResponse.json({ error: contentError }, { status: 400 });
      await saveResult(parsed, imageUrl, userId, displayName);
      return NextResponse.json(parsed);
    } catch (err: any) {
      console.error("Claude failed:", err?.message);
    }

    // FALLBACK 2: OpenAI GPT-4o (most reliable)
    try {
      console.log("Trying OpenAI GPT-4o...");
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
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
          },
        ],
        max_tokens: 2500,
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