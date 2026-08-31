import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { supabase } from "@/lib/supabase";
import { updateStreak } from "@/lib/streak";
import { checkRateLimit } from "@/lib/ratelimit";

export const maxDuration = 300;

// Below this confidence, we retry once with live search grounding enabled
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

You specialize in:
- Exotic and luxury cars (Lamborghini, Ferrari, Koenigsegg, Bugatti, McLaren, Porsche, Rolls-Royce, Pagani, and all others)
- Luxury watches (Rolex, Patek Philippe, Audemars Piguet, Richard Mille, Hublot, and all others)
- Sneakers and streetwear (Nike, Jordan, Adidas, New Balance, and all collaborations)
- Consumer electronics (Apple, Samsung, Sony, and all others)
- Designer bags (Hermès, Louis Vuitton, Chanel, Gucci, Bottega Veneta, and all others)
- Jewelry, art, antiques, collectibles, instruments, memorabilia, furniture, tools, and all other sellable objects

CONTENT RULES — respond with exact JSON error if triggered:
- Adult or inappropriate content: {"error": "inappropriate_content"}
- Buildings or fixed structures: {"error": "buildings_not_supported"}
- Image too blurry or dark: {"error": "image_unclear"}

IDENTIFICATION — be extremely precise:
Look at every visible detail: body shape, proportions, badges, logos, model numbers, colorways, stitching, hardware, serial numbers, condition, and unique features.

Cars — critical distinctions you must get right:
- Lamborghini Revuelto (2023+): long angular body, hybrid V12, vertical Y-shaped LED taillights, Aventador replacement, significantly larger than Huracán
- Lamborghini Huracán: shorter, rounder, V10, horizontal taillights — never confuse with Revuelto
- Koenigsegg Regera: smooth flowing body, covered rear wheels, hybrid powertrain, large clamshell rear
- Koenigsegg Agera RS: angular body, exposed rear wheels, large fixed wing, twin-turbo V8 — completely different from Regera
- Koenigsegg Gemera: Koenigsegg's ONLY four-seater, long sleek body, no B-pillar, dihedral doors, hybrid V8+electric powertrain, 2300hp, seats 4 adults — worth $1,900,000+ in 2026
- Kimera K39 (2026): Italian hypercar, carbon monocoque, Koenigsegg-sourced 5.0L twin-turbo V8, 972hp, pop-up headlights, massive rear wing, 1980s endurance racing inspired design, only ~50 units — worth $2,700,000
- Brabus Bodo (2026): coachbuilt hyper-GT based on Aston Martin Vanquish, entirely new carbon fiber body, 5.2L twin-turbo V12, 1000hp, extremely low 130cm tall, boat-tail rear, 77 units worldwide — worth $1,200,000–$1,700,000
- Ferrari 458 Speciale: fixed rear wing, aero bumpers, Speciale badging — worth significantly more than 458 Italia
- Always identify carbon fiber aero kits, special edition badges, and unique trim details

CRITICAL: The specific cars listed above (Revuelto, Huracán, Regera, Agera RS, Gemera, Kimera K39, Brabus Bodo, 458 Speciale/Italia) are reference examples ONLY. Never default to one of these names just because a car is rare, unusual, or hard to identify. If the visible badges, logos, proportions, or details do NOT clearly match one of these specific cars, identify the actual manufacturer and model you see instead — even if it's an obscure or low-production car you're less certain about. A rare car you correctly describe as "unidentified American hypercar, possibly SSC or similar" with lower confidence is far better than confidently misnaming it as one of the reference cars above. Always prioritize visible badges and manufacturer nameplates over silhouette similarity to these examples.

Watches: brand, exact model, reference number, material, dial color, bezel type
Sneakers: brand, exact model, colorway name, release year, collaboration
Electronics: brand, exact model, generation, storage, color
Bags: brand, model name, size, leather type, color, hardware color

PRICING — use real 2026 secondary market values:
- Lamborghini Revuelto: $700,000–$950,000
- Lamborghini Huracán base: $180,000–$220,000
- Lamborghini Huracán STO: $280,000–$330,000
- Ferrari 458 Speciale: $380,000–$520,000
- Ferrari 458 Italia: $180,000–$230,000
- Koenigsegg Regera: $2,000,000–$3,500,000
- Koenigsegg Agera RS: $4,000,000–$7,000,000
- Koenigsegg Gemera: $1,900,000–$2,500,000
- Kimera K39: $2,500,000–$3,000,000
- Brabus Bodo: $1,200,000–$1,700,000- Rolex Submariner Date 126610LN: $13,000–$16,000
- Patek Philippe Nautilus 5711: $120,000–$180,000
- Nike Air Jordan 1 Chicago 2015: $1,500–$2,500
- iPhone 15 Pro Max 256GB used: $700–$900
- Hermès Birkin 25 Togo: $25,000–$40,000

For all other items: sneakers → StockX/GOAT averages. Watches → Chrono24. Cars → private party. Electronics → eBay sold. Art → auction results.

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

      // If confidence is low, retry once with grounding before accepting the result
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
          // Falls through to use the original fast result below
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