import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "@/lib/supabase";
import { updateStreak } from "@/lib/streak";

export const maxDuration = 300;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
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

async function saveResellResult(parsed: any, imageUrl: string, userId: string, isDeepResearch: boolean) {
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
    full_result: { ...parsed, isDeepResearch },
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

const baseSystemPrompt = `You are an expert reselling analyst with deep knowledge of secondary market prices across all major resale platforms. You identify items precisely from images and provide accurate resell valuations.

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

CONTENT RULES:
Respond with exactly {"error": "inappropriate_content"} for adult or inappropriate content.
Respond with exactly {"error": "buildings_not_supported"} for buildings or fixed structures.
Respond with exactly {"error": "image_unclear"} if the image is too blurry or dark to identify.

IDENTIFICATION:
Examine every visible detail: brand logos, model numbers, colorways, condition, wear patterns, tags, packaging, accessories. Identify the most specific version of the item possible.

For sneakers: exact colorway, release year, size if visible.
For electronics: exact model, storage, color, generation.
For watches: brand, model, reference number, material, dial color.
For clothing: brand, collection, size, season, colorway.
For cars: make, model, year, trim, condition, mileage estimate.
For collectibles: edition, year, grade/condition, packaging.

Assess condition carefully — scratches, wear, missing parts, and original packaging all affect resell value significantly.`;

const fastPricingRules = `
PRICING:
Base your pricing estimate on general market knowledge from your training. Be clear this is an estimate, not a live lookup.

quickSalePrice: 10-20% below your estimated market average.
bestPrice: 5-10% above your estimated market average.
highestSold / lowestSold: your best estimate of the realistic top/bottom 10% of the range.
Price history should reflect plausible year-by-year market movement from 2020 to 2026 based on general trends you're aware of for this category.`;

const deepResearchPricingRules = `
PRICING — DEEP RESEARCH MODE:
You have web search available. Use it to find REAL current sold listings and asking prices for this exact item on the platforms below. Search for the specific item name plus "sold" or "sold listings" per platform where possible.

quickSalePrice: based on real listings you found, priced 10-20% below the real average to sell fast.
bestPrice: based on real listings you found, priced 5-10% above the real average for a patient seller.
averagePrice / highestSold / lowestSold: pull these from actual search results, not estimates. If you cannot find real data for a specific platform, state a lower confidence estimate and note in that platform's "tips" field that this is an estimate due to limited listing data found.
Do not fabricate specific numbers when you have no search result to back them up — prefer a wider estimated range with a note over a precise-looking invented number.`;

function buildSystemPrompt(deepResearch: boolean) {
  return `${baseSystemPrompt}\n${deepResearch ? deepResearchPricingRules : fastPricingRules}

Platform notes:
- eBay: nationwide audience, fees ~13%, premium for rare items
- Facebook Marketplace: local buyers, no fees, 10-20% below eBay
- Craigslist: cash only, similar to Facebook
- StockX/GOAT: authentication required, premium prices
- Depop/Vinted: younger audience, fashion items perform well
- Chrono24: watch specialists, strong prices

Always respond with only valid JSON. No explanation, no markdown, no backticks.`;
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, userId, preferredPlatform, deepResearch } = await req.json();

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

    const [imageResponse, profileResult] = await Promise.all([
      fetch(imageUrl),
      userId
        ? supabase.from("profiles").select("resell_scans_used, is_pro, plan, scans_reset_at").eq("id", userId).single()
        : Promise.resolve({ data: null }),
    ]);

    let isBusiness = false;

    if (userId && profileResult.data) {
      const profile = profileResult.data;
      isBusiness = profile.plan === "business";

      if (!profile.is_pro) {
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

    // Deep Research is Business-tier only — silently fall back to fast mode otherwise
    const useDeepResearch = !!deepResearch && isBusiness;

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");
    const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";

    const platformHint = preferredPlatform
      ? `The user prefers selling on ${preferredPlatform}. Always include this platform in the results and prioritize its data.`
      : "";

    const systemPrompt = buildSystemPrompt(useDeepResearch);

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

    const fullPrompt = `${systemPrompt}\n\n${userMessage}`;

    // DEEP RESEARCH PATH: Claude Sonnet with real web search
    if (useDeepResearch) {
      try {
        console.log("Resell: Deep Research mode via Claude Sonnet + web_search...");
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 2000,
          system: systemPrompt,
          tools: [{ type: "web_search_20250305", name: "web_search", max_uses: 6 } as any],
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

        const textBlock = response.content.find((b: any) => b.type === "text") as any;
        const text = textBlock?.text || "";
        const parsed = parseJSON(text);
        if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });
        parsed.isDeepResearch = true;
        if (userId) await saveResellResult(parsed, imageUrl, userId, true);
        return NextResponse.json(parsed);
      } catch (err: any) {
        console.error("Deep Research failed, falling back to fast mode:", err?.message);
      }
    }

    // FAST PATH — PRIMARY: Gemini 3.1 Flash-Lite
    try {
      console.log("Resell: Trying Gemini 3.1 Flash-Lite (fast estimate)...");
      const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
      const result = await model.generateContent([
        fullPrompt,
        { inlineData: { mimeType, data: base64Image } },
      ]);
      const parsed = parseJSON(result.response.text().trim());
      if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });
      parsed.isDeepResearch = false;
      if (userId) await saveResellResult(parsed, imageUrl, userId, false);
      return NextResponse.json(parsed);
    } catch (err: any) {
      console.error("Resell Gemini failed:", err?.message);
    }

    // FALLBACK 1: Claude Sonnet 4.6 (no search — same fast estimate mode)
    try {
      console.log("Resell: Trying Claude Sonnet 4.6 (fast estimate)...");
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
      parsed.isDeepResearch = false;
      if (userId) await saveResellResult(parsed, imageUrl, userId, false);
      return NextResponse.json(parsed);
    } catch (err: any) {
      console.error("Resell Sonnet failed:", err?.message);
    }

    // FALLBACK 2: GPT-4o
    try {
      console.log("Resell: Trying GPT-4o (fast estimate)...");
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 1200,
        messages: [{
          role: "system",
          content: systemPrompt,
        }, {
          role: "user",
          content: [
            { type: "text", text: userMessage },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: "high",
              },
            },
          ],
        }],
      });
      const text = response.choices[0].message.content?.trim() || "";
      const parsed = parseJSON(text);
      if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });
      parsed.isDeepResearch = false;
      if (userId) await saveResellResult(parsed, imageUrl, userId, false);
      return NextResponse.json(parsed);
    } catch (err: any) {
      console.error("Resell GPT-4o failed:", err?.message);
    }

    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });

  } catch (error: any) {
    console.error("Resell error:", error?.message);
    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });
  }
}