import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";
import { updateStreak } from "@/lib/streak";

export const maxDuration = 300;

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const requestCounts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 5;
  const record = requestCounts.get(ip);
  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }
  if (record.count >= maxRequests) return false;
  record.count++;
  return true;
}

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

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment before scanning again." },
        { status: 429 }
      );
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

    const platformHint = preferredPlatform
      ? `The user prefers selling on ${preferredPlatform}. Always include this platform in the results and prioritize its data.`
      : "";

    const systemPrompt = `You are an expert reselling analyst with deep knowledge of secondary market prices across all major resale platforms. You identify items precisely from images and provide accurate, data-driven resell valuations for 2026.

Your expertise covers all resellable categories:
- Sneakers and streetwear (StockX, GOAT, Grailed)
- Electronics (eBay, Swappa, Back Market)
- Luxury watches (Chrono24, WatchBox, Bob's Watches)
- Designer bags and accessories (The RealReal, Vestiaire)
- Collectibles, trading cards, and memorabilia
- Clothing and vintage apparel (Depop, Vinted, Grailed)
- Cars and vehicles (AutoTrader, CarGurus, private party)
- Furniture, art, and home goods
- Musical instruments and equipment
- Sports equipment and gear

<content_rules>
Respond with exactly {"error": "inappropriate_content"} for adult or inappropriate content.
Respond with exactly {"error": "buildings_not_supported"} for buildings or fixed structures.
Respond with exactly {"error": "image_unclear"} if the image is too blurry or dark to identify.
</content_rules>

<identification>
Examine every visible detail: brand logos, model numbers, colorways, condition, wear patterns, tags, packaging, accessories. Identify the most specific version of the item possible.

For sneakers: exact colorway, release year, size if visible.
For electronics: exact model, storage, color, generation.
For watches: brand, model, reference number, material, dial color.
For clothing: brand, collection, size, season, colorway.
For cars: make, model, year, trim, condition, mileage estimate.
For collectibles: edition, year, grade/condition, packaging.

Assess condition carefully — scratches, wear, missing parts, and original packaging all affect resell value significantly.
</identification>

<pricing>
Use real 2026 secondary market prices. Research what items actually sell for, not what they are listed for.

quickSalePrice: 10-20% below market average — priced to sell within 24-48 hours.
bestPrice: 5-10% above market average — for a patient seller willing to wait 2-4 weeks.

Platform-specific pricing:
- eBay: nationwide audience, buyers pay premium for rare/graded items, fees ~13%
- Facebook Marketplace: local buyers, cash deals, no fees, expect 10-20% below eBay
- Craigslist: similar to Facebook, cash only, safety concerns lower demand
- StockX/GOAT: authentication required, premium prices for verified items
- Depop/Vinted: younger audience, fashion-forward items perform well
- Chrono24: watch specialists, informed buyers, strong prices for quality pieces
- Blocket: Swedish market, adjust prices for local demand

highestSold: realistic top 10% of recent sales.
lowestSold: realistic bottom 10% of recent sales.
Price history should reflect actual year-by-year market movement from 2020 to 2026.
</pricing>

Always respond with only valid JSON. No explanation, no markdown, no backticks.`;

    const preferredPlatformJson = preferredPlatform && !["eBay", "Facebook Marketplace", "Craigslist"].includes(preferredPlatform)
      ? `,
    {
      "name": "${preferredPlatform}",
      "averagePrice": 0,
      "highestSold": 0,
      "lowestSold": 0,
      "demandLevel": "High, Medium or Low",
      "tips": "specific tip for selling on ${preferredPlatform}"
    }`
      : "";

    const userMessage = `${platformHint ? platformHint + "\n\n" : ""}Analyze this item for resale and return this exact JSON structure:

{
  "name": "precise product name with exact model, variant, colorway, year, and condition",
  "category": "specific product category",
  "condition": "condition assessment: New, Like New, Good, Fair, or Poor",
  "originalPrice": "original retail price as number only",
  "quickSalePrice": "quick sale price within 48 hours as number only",
  "bestPrice": "best price if willing to wait 2-4 weeks as number only",
  "platforms": [
    {
      "name": "eBay",
      "averagePrice": "average sold price as number only",
      "highestSold": "highest recent sold price as number only",
      "lowestSold": "lowest recent sold price as number only",
      "demandLevel": "High, Medium or Low",
      "tips": "one specific actionable tip for this item on eBay"
    },
    {
      "name": "Facebook Marketplace",
      "averagePrice": "average local sale price as number only",
      "highestSold": "highest local sold price as number only",
      "lowestSold": "lowest local sold price as number only",
      "demandLevel": "High, Medium or Low",
      "tips": "one specific actionable tip for this item locally"
    },
    {
      "name": "Craigslist",
      "averagePrice": "average price as number only",
      "highestSold": "highest price as number only",
      "lowestSold": "lowest price as number only",
      "demandLevel": "High, Medium or Low",
      "tips": "one specific actionable tip for Craigslist"
    }${preferredPlatformJson}
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
  "bestTimeToSell": "specific timing advice based on market trends and seasonality for this item"
}`;

    // PRIMARY: Claude Haiku 4.5 (fast)
    try {
      console.log("Resell: Trying Claude Haiku 4.5...");
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 1200,
        system: systemPrompt,
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
            { type: "text", text: userMessage },
          ],
        }],
      });
      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const parsed = parseJSON(text);
      if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });
      if (userId) await saveResellResult(parsed, imageUrl, userId);
      return NextResponse.json(parsed);
    } catch (err: any) {
      console.error("Resell Haiku failed:", err?.message);
    }

    // FALLBACK 1: Claude Sonnet 4.6
    try {
      console.log("Resell: Trying Claude Sonnet 4.6...");
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1200,
        system: systemPrompt,
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
            { type: "text", text: userMessage },
          ],
        }],
      });
      const text = response.content[0].type === "text" ? response.content[0].text : "";
      const parsed = parseJSON(text);
      if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });
      if (userId) await saveResellResult(parsed, imageUrl, userId);
      return NextResponse.json(parsed);
    } catch (err: any) {
      console.error("Resell Sonnet failed:", err?.message);
    }

    // FALLBACK 2: OpenAI GPT-4o
    try {
      console.log("Resell: Trying OpenAI...");
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: `${systemPrompt}\n\n${userMessage}` },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: "high",
              },
            },
          ],
        }],
        max_tokens: 1200,
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