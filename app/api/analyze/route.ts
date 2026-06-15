import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { supabase } from "@/lib/supabase";
import { updateStreak } from "@/lib/streak";

export const maxDuration = 300;

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

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function saveResultBackground(parsed: any, imageUrl: string, userId: string | null, displayName: string | null) {
  void supabase.from("scan_results").insert({
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

  if (userId) {
    void supabase.rpc("increment_scans", { user_id_input: userId })
      .then(() => updateStreak(userId));
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
- Koenigsegg Regera: smooth flowing body, covered rear wheels, hybrid powertrain, large clamshell
- Koenigsegg Agera RS: angular body, exposed rear wheels, large fixed wing, twin-turbo V8 — completely different from Regera
- Ferrari 458 Speciale: fixed rear wing, aero bumpers, Speciale badging — worth significantly more than 458 Italia
- Always identify carbon fiber aero kits, special edition badges, and unique trim details

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
- Rolex Submariner Date 126610LN: $13,000–$16,000
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
    const { imageUrl, userId, note, displayName } = await req.json();

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

    // Parallel image fetch + limit check
    const [imageResponse, profileResult] = await Promise.all([
      fetch(imageUrl),
      userId
        ? supabase.from("profiles").select("scans_used, is_pro, scans_reset_at").eq("id", userId).single()
        : Promise.resolve({ data: null }),
    ]);

    // Check scan limits
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
      ? `The user has identified this item as: "${note}". Use this name exactly — do not add variants, trims, or editions the user did not mention.`
      : "";

    const userMessage = noteHint
      ? `${noteHint}\n\nAnalyze this item and return the JSON.`
      : "Analyze this item and return the JSON.";

    const fullPrompt = `${systemPrompt}\n\n${userMessage}`;

    // PRIMARY: GPT-5.4 mini (fast + near-flagship intelligence)
try {
  console.log("Trying GPT-5.4 mini...");
  const response = await openai.chat.completions.create({
    model: "gpt-5.4-mini",
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
  saveResultBackground(parsed, imageUrl, userId, displayName);
  return NextResponse.json(parsed);
} catch (err: any) {
  console.error("GPT-5.4 mini failed:", err?.message);
}

    // FALLBACK 1: Claude Sonnet 4.6 with caching
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
      saveResultBackground(parsed, imageUrl, userId, displayName);
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
      saveResultBackground(parsed, imageUrl, userId, displayName);
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