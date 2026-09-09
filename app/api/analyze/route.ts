import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { supabase } from "@/lib/supabase";
import { updateStreak } from "@/lib/streak";
import { checkRateLimit } from "@/lib/ratelimit";

export const maxDuration = 300;

const GROUNDING_CONFIDENCE_THRESHOLD = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function saveResult(parsed: any, imageUrl: string, userId: string | null, displayName: string | null, eligibleForLeaderboard: boolean) {
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
    on_leaderboard: eligibleForLeaderboard,
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

const systemPrompt = `You are the world's most precise AI appraiser. You analyze images of physical objects and return accurate identifications and 2026 market valuations.

You are a panel of world-class specialists combined into one appraiser: an exotic car authenticator, a certified watch appraiser, a sneaker and streetwear authenticator, a consumer electronics specialist, and a luxury goods appraiser. Whichever category an item falls into, you apply that specialist's exact standard of precision.

This tool is used by a very large, real audience — potentially hundreds of thousands to millions of people worldwide rely on your answer being correct. A wrong identification or valuation is not a minor error here; it directly misleads a real person about something they own or are considering buying or selling. Precision is not optional — it is the entire value of this product.

CONTENT RULES — respond with exact JSON error if triggered:
- Adult or inappropriate content: {"error": "inappropriate_content"}
- Buildings or fixed structures: {"error": "buildings_not_supported"}
- Image too blurry or dark: {"error": "image_unclear"}

CORE PRINCIPLE: Never let familiarity substitute for evidence. Every category has famous, commonly-referenced items that models like you tend to default to when something is rare or hard to place. Resist this. If the visible details don't clearly match a well-known item, describe the actual manufacturer and model you see, even with lower certainty, rather than confidently misnaming it as something more famous. This applies equally to cars, watches, sneakers, electronics, and bags — not just one category.

CARS: Distinguish by body shape, badge placement, taillight design, and proportions before naming a model. Commonly confused pairs to check carefully: Lamborghini Revuelto vs. Huracán (Revuelto is longer, angular, vertical Y-shaped taillights; Huracán is shorter, rounder, horizontal taillights). Koenigsegg Regera vs. Agera RS (Regera has covered rear wheels and a smooth flowing body; Agera RS has exposed wheels and a large fixed wing). Always check for special-edition badging (like Ferrari's "Speciale") which significantly changes value from the base model.

WATCHES: Identify brand, exact model line, reference number if visible, case material, dial color, and bezel type. Commonly confused pairs: different generations of the same model line often look near-identical except for small dial-text or bezel changes — note these if visible.

SNEAKERS: Identify exact colorway name, release year, and any collaboration branding. Similar colorways across different release years can have very different resale values — note any visible tags, box details, or wear patterns that help pin down the specific release.

ELECTRONICS: Identify exact model, generation, and storage/color where determinable from ports, camera layout, or visible markings.

BAGS: Identify brand, model name, size, leather type, and hardware color — hardware color and stitching pattern often distinguish otherwise-similar models.

PRICING — use real-world 2026 secondary market conventions: cars at private-party pricing, watches at Chrono24-style pricing, sneakers at StockX/GOAT averages, electronics at eBay-sold pricing, bags and collectibles at recent auction or resale-platform results.

RESPONSE FORMAT — return only valid JSON, no markdown, no explanation:
{
  "name": "exact precise name with make, model, variant, year, edition",
  "currentValue": "2026 market value as number only",
  "originalPrice": "original retail price as number only",
  "category": "specific product category",
  "confidence": "0-100 as number only",
  "description": "Three sentences covering what makes this exact item special, its market position, and current value context.",
  "materials": "Three materials, one per line. Format: Material — where used and why.",
  "specs": "Four specs with exact figures, one per line. Format: Spec: value with units.",
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

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, userId, note, displayName, eligibleForLeaderboard } = await req.json();
    const isEligibleForLeaderboard = eligibleForLeaderboard === true || eligibleForLeaderboard === "true";

    if (!imageUrl) {
      return NextResponse.json({ error: "No image URL provided" }, { status: 400 });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    if (!(await checkRateLimit(ip))) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment before scanning again." },
        { status: 429 }
      );
    }

    const [imageResponse, profileResult] = await Promise.all([
      fetch(imageUrl),
      userId
        ? supabase.from("profiles").select("scans_used, is_pro, scans_reset_at").eq("id", userId).single()
        : Promise.resolve({ data: null }),
    ]);

    if (userId && profileResult.data) {
      const profile = profileResult.data;
      if (!profile.is_pro) {
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

    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");
    const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";

    const noteHint = note
      ? `The user provided this context about the item: "${note}". Use it as a helpful hint to guide your identification — but you must still determine and return the item's actual specific name (exact make, model, variant, year). If the user's note is vague (e.g. just "car" or "watch"), do not use their words as the name — identify the real item from the image itself. If the user's note gives a specific model name, prioritize that over your own visual guess for the model, but still verify and complete it with the correct full details (year, trim, edition) based on what's visible.`
      : "";

    const userMessage = noteHint
      ? `${noteHint}\n\nAnalyze this item and return the JSON.`
      : "Analyze this item and return the JSON.";

    const fullPrompt = `${systemPrompt}\n\n${userMessage}`;

    // PRIMARY: Gemini 3.5 Flash-Lite, fast, no grounding
    try {
      console.log("Trying Gemini 3.5 Flash-Lite...");
      const model = genAI.getGenerativeModel({ model: "gemini-3.5-flash-lite" });
      const result = await model.generateContent([
        fullPrompt,
        { inlineData: { mimeType, data: base64Image } },
      ]);
      const parsed = parseJSON(result.response.text().trim());
      const contentError = checkContentErrors(parsed);
      if (contentError) return NextResponse.json({ error: contentError }, { status: 400 });

      const confidenceNum = parseInt(String(parsed.confidence), 10);

      if (!isNaN(confidenceNum) && confidenceNum < GROUNDING_CONFIDENCE_THRESHOLD) {
        try {
          console.log(`Confidence ${confidenceNum} below threshold — retrying with search grounding...`);
          const groundedModel = genAI.getGenerativeModel({
            model: "gemini-3.5-flash-lite",
            tools: [{ googleSearch: {} } as any],
          });
          const groundedResult = await groundedModel.generateContent([
            fullPrompt,
            { inlineData: { mimeType, data: base64Image } },
          ]);
          const groundedParsed = parseJSON(groundedResult.response.text().trim());
          const groundedContentError = checkContentErrors(groundedParsed);
          if (!groundedContentError) {
            console.log("Grounded retry succeeded, using grounded result");
            await saveResult(groundedParsed, imageUrl, userId, displayName, isEligibleForLeaderboard);
            return NextResponse.json(groundedParsed);
          }
        } catch (groundingErr: any) {
          console.error("Grounded retry failed, using original fast result instead:", groundingErr?.message);
        }
      }

      await saveResult(parsed, imageUrl, userId, displayName, isEligibleForLeaderboard);
      return NextResponse.json(parsed);
    } catch (err: any) {
      console.error("Gemini 3.5 Flash-Lite failed:", err?.message);
    }

    // FALLBACK 1: Claude Sonnet 4.6
    try {
      console.log("Trying Claude Sonnet 4.6...");
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: [
          {
            type: "text",
            text: systemPrompt,
            cache_control: { type: "ephemeral" },
          },
        ],
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
      const contentError = checkContentErrors(parsed);
      if (contentError) return NextResponse.json({ error: contentError }, { status: 400 });
      await saveResult(parsed, imageUrl, userId, displayName, isEligibleForLeaderboard);
      return NextResponse.json(parsed);
    } catch (err: any) {
      console.error("Claude Sonnet failed:", err?.message);
    }

    // FALLBACK 2: GPT-4o
    try {
      console.log("Trying GPT-4o...");
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        max_tokens: 1000,
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mimeType};base64,${base64Image}`,
                  detail: "high",
                },
              },
              { type: "text", text: userMessage },
            ],
          },
        ],
      });
      const text = response.choices[0].message.content?.trim() || "";
      const parsed = parseJSON(text);
      const contentError = checkContentErrors(parsed);
      if (contentError) return NextResponse.json({ error: contentError }, { status: 400 });
      await saveResult(parsed, imageUrl, userId, displayName, isEligibleForLeaderboard);
      return NextResponse.json(parsed);
    } catch (err: any) {
      console.error("GPT-4o failed:", err?.message);
    }

    return NextResponse.json({ error: "Analysis failed" }, { status: 500 });

  } catch (error: any) {
    console.error("=== ANALYZE ERROR ===");
    console.error("Message:", error?.message);
    return NextResponse.json({ error: "Analysis failed", detail: error?.message }, { status: 500 });
  }
}