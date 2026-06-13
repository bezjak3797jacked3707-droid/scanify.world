import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/lib/supabase";
import { updateStreak } from "@/lib/streak";

export const maxDuration = 300;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

function parseJSON(text: string) {
  const clean = text.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

async function saveResellResult(parsed: any, imageUrl: string, userId: string) {
  await supabase.from("scan_results").insert({
    image_url: imageUrl,
    name: parsed.name,
    current_value: parsed.bestPrice,
    original_price: parsed.originalPrice,
    category: parsed.category,
    confidence: "100",
    description: parsed.sellingTips,
    materials: "",
    specs: "",
    user_id: userId,
    full_result: parsed,
    display_name: "Anonymous",
    on_leaderboard: false,
    scan_type: "resell",
  });

  const { data: current } = await supabase
    .from("profiles")
    .select("resell_scans_used")
    .eq("id", userId)
    .single();

  await supabase
    .from("profiles")
    .update({ resell_scans_used: (current?.resell_scans_used || 0) + 1 })
    .eq("id", userId);

  await updateStreak(userId);
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, userId, preferredPlatform } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "No image URL provided" }, { status: 400 });
    }

    if (userId) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("resell_scans_used, is_pro, scans_reset_at")
        .eq("id", userId)
        .single();

      if (profile && !profile.is_pro) {
        const now = new Date();
        const resetAt = new Date(profile.scans_reset_at as string);
        const isNewMonth = now.getMonth() !== resetAt.getMonth() || now.getFullYear() !== resetAt.getFullYear();

        if (isNewMonth) {
          await supabase
            .from("profiles")
            .update({ resell_scans_used: 0, scans_reset_at: now.toISOString() })
            .eq("id", userId);
          profile.resell_scans_used = 0;
        }

        if ((profile.resell_scans_used || 0) >= 1) {
          return NextResponse.json({ error: "scan_limit_reached" }, { status: 403 });
        }
      }
    }

    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");
    const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";

    const platformNote = preferredPlatform ? `The user prefers selling on: ${preferredPlatform}. Always include this platform and prioritize its data.` : "";

    const prompt = `You are the world's most accurate reselling expert with deep knowledge of secondary market prices across all major platforms. Your job is to identify items precisely and provide realistic, data-driven resell valuations.

${platformNote}

STRICT RULES:
1. If the image contains adult content - respond with exactly: {"error": "inappropriate_content"}
2. If the image shows a building or fixed structure - respond with exactly: {"error": "buildings_not_supported"}
3. If the image is blurry or unclear - respond with exactly: {"error": "image_unclear"}

IDENTIFICATION RULES:
- Examine ALL visible details: brand logos, model numbers, colorways, serial numbers, condition, wear patterns, accessories present
- For sneakers: identify exact colorway, release year, and size if visible (e.g. "Nike Air Jordan 1 Retro High OG 'Chicago' 2015 - Size 10")
- For electronics: identify exact model, storage capacity, color, and generation (e.g. "Apple iPhone 14 Pro Max 256GB Deep Purple")
- For watches: identify brand, model, reference number, and material (e.g. "Rolex Submariner Date 126610LN Black Ceramic")
- For clothing: identify brand, collection, size, and season
- For cars: identify make, model, year, trim, and any visible modifications
- For collectibles: identify edition, year, condition grade, and any certificates/packaging visible
- Assess condition carefully from the image: scratches, wear, missing parts, original packaging

PRICING RULES:
- Use REAL current 2026 secondary market prices — not retail MSRP
- For sneakers: use StockX/GOAT average sold prices
- For electronics: use eBay sold listings average
- For watches: use Chrono24/WatchBox current market
- For cars: use AutoTrader/CarGurus private party values
- For collectibles: use recent auction results
- quickSalePrice should be 10-20% below market to sell within 48 hours
- bestPrice should be 5-10% above average market if patient
- Platform prices should reflect that platform's typical buyer — eBay buyers pay more for rare items, Facebook Marketplace buyers want local deals
- highestSold should be realistic top 10% of sales
- lowestSold should be realistic bottom 10% of sales
- Price history should show realistic year-by-year market fluctuations based on actual demand trends for this specific item
- The current year is 2026

Return ONLY a JSON object with no extra text, no markdown, no backticks:
{
  "name": "extremely precise product name with exact model, variant, colorway, year, and condition",
  "category": "specific product category",
  "condition": "precise condition assessment based on visible wear (New, Like New, Good, Fair, Poor)",
  "originalPrice": "original retail price as number only",
  "quickSalePrice": "realistic quick sale price within 48 hours as number only",
  "bestPrice": "realistic best price if patient as number only",
  "platforms": [
    {
      "name": "eBay",
      "averagePrice": "realistic average sold price on eBay as number only",
      "highestSold": "realistic highest recent sold price as number only",
      "lowestSold": "realistic lowest recent sold price as number only",
      "demandLevel": "High, Medium or Low based on actual market demand",
      "tips": "specific actionable tip for selling this exact item on this platform"
    },
    {
      "name": "Facebook Marketplace",
      "averagePrice": "realistic average local sale price as number only",
      "highestSold": "realistic highest local sold price as number only",
      "lowestSold": "realistic lowest local sold price as number only",
      "demandLevel": "High, Medium or Low",
      "tips": "specific actionable tip for selling this exact item locally"
    },
    {
      "name": "Craigslist",
      "averagePrice": "realistic average price as number only",
      "highestSold": "realistic highest price as number only",
      "lowestSold": "realistic lowest price as number only",
      "demandLevel": "High, Medium or Low",
      "tips": "specific actionable tip for this platform"
    }${preferredPlatform && !["eBay", "Facebook Marketplace", "Craigslist"].includes(preferredPlatform) ? `,
    {
      "name": "${preferredPlatform}",
      "averagePrice": "realistic average price on ${preferredPlatform} as number only",
      "highestSold": "realistic highest price as number only",
      "lowestSold": "realistic lowest price as number only",
      "demandLevel": "High, Medium or Low",
      "tips": "specific actionable tip for selling on ${preferredPlatform}"
    }` : ""}
  ],
  "priceHistory": [
    {"year": "2020", "price": 0},
    {"year": "2021", "price": 0},
    {"year": "2022", "price": 0},
    {"year": "2023", "price": 0},
    {"year": "2024", "price": 0},
    {"year": "2025", "price": 0},
    {"year": "2026", "price": 0}
  ],
  "sellingTips": "2-3 specific actionable tips for selling this exact item for maximum profit",
  "bestTimeToSell": "specific timing advice for this exact item based on market trends and seasonality"
}`;

    // PRIMARY: Gemini 2.0 Flash (faster)
    try {
      console.log("Resell: Trying Gemini 2.0 Flash...");
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent([
        prompt,
        { inlineData: { mimeType, data: base64Image } },
      ]);
      const parsed = parseJSON(result.response.text().trim());
      if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });
      if (userId) await saveResellResult(parsed, imageUrl, userId);
      return NextResponse.json(parsed);
    } catch (err: any) {
      console.error("Resell Gemini failed:", err?.message);
    }

    // FALLBACK 1: Claude
    try {
      console.log("Resell: Trying Claude...");
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
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
      if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });
      if (userId) await saveResellResult(parsed, imageUrl, userId);
      return NextResponse.json(parsed);
    } catch (err: any) {
      console.error("Resell Claude failed:", err?.message);
    }

    // FALLBACK 2: OpenAI
    try {
      console.log("Resell: Trying OpenAI...");
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
      if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });
      if (userId) await saveResellResult(parsed, imageUrl, userId);
      return NextResponse.json(parsed);
    } catch (err: any) {
      console.error("Resell OpenAI failed:", err?.message);
    }

    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });

  } catch (error: any) {
    console.error("Resell error:", error?.message);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}