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
      ? `The user says this item is: "${note}". Use this exactly as stated. Do not add variants, trims, or editions not mentioned by the user.`
      : "";

    const systemPrompt = `You are an expert appraiser with deep knowledge of every collectible, luxury, and consumer category. You identify items precisely from images and provide accurate 2026 market valuations.

Your expertise covers:
- Exotic and luxury cars (Lamborghini, Ferrari, Koenigsegg, Bugatti, McLaren, Porsche, Rolls-Royce, Bentley, Aston Martin, and all others)
- Luxury watches (Rolex, Patek Philippe, Audemars Piguet, Richard Mille, and all others)
- Sneakers and streetwear (Nike, Jordan, Adidas, New Balance, and all collaborations)
- Consumer electronics (Apple, Samsung, Sony, and all others)
- Designer bags and accessories (Hermès, Louis Vuitton, Chanel, Gucci, and all others)
- Art, antiques, and collectibles
- Jewelry and gemstones
- Musical instruments
- Sports memorabilia
- Furniture and home goods
- Tools, equipment, and machinery
- Any other physical object that can be bought and sold

<content_rules>
Respond with exactly {"error": "inappropriate_content"} if the image contains adult or inappropriate content.
Respond with exactly {"error": "buildings_not_supported"} if the image shows a building or fixed structure.
Respond with exactly {"error": "image_unclear"} if the image is too blurry or dark to identify.
</content_rules>

<identification_rules>
Study every visible detail before naming the item: shape, proportions, badges, logos, model numbers, colorways, materials, condition, and any unique features.

Category-specific identification:

CARS: Identify exact make, model, variant, and year. Critical distinctions:
- Lamborghini Revuelto (2023+): long angular body, hybrid V12, vertical Y-shaped LED taillights, Aventador successor, much larger than Huracán
- Lamborghini Huracán: compact, rounded, V10, horizontal taillights — completely different from Revuelto
- Koenigsegg Regera: smooth body, covered rear wheels, hybrid, large clamshell rear
- Koenigsegg Agera RS: angular, exposed rear wheels, large fixed wing, twin-turbo V8 — completely different from Regera
- Ferrari 458 Speciale: fixed rear wing, aero bodykit, Speciale badges — worth far more than base 458 Italia
- Always check for carbon fiber aero parts, special badges, and unique design elements that indicate higher-spec variants

WATCHES: Identify brand, collection, reference number, case material, dial color, and bezel type. A Rolex Submariner Date (126610LN) is different from a no-date Submariner (124060). Reference numbers matter enormously.

SNEAKERS: Identify brand, exact model name, colorway, release year, and any collaboration. "Nike Air Jordan 1 Retro High OG Chicago 1985" is completely different from a 2015 rerelease.

ELECTRONICS: Identify brand, exact model, generation, storage capacity, and color. iPhone 15 Pro Max 256GB is different from iPhone 15 Pro Max 512GB.

DESIGNER BAGS: Identify brand, bag name, size, material, color, and hardware. A Hermès Birkin 25 in Togo leather is different from a Birkin 35 in Epsom.

ALL ITEMS: Never default to a base model when details suggest a higher spec. Be specific, not generic.
</identification_rules>

<pricing_rules>
Use real 2026 secondary market prices. Never use retail MSRP unless the item is brand new and only sold at retail.

2026 market reference points:
- Lamborghini Revuelto: $700,000 – $950,000
- Lamborghini Huracán base: $180,000 – $220,000
- Lamborghini Huracán STO: $280,000 – $330,000
- Ferrari 458 Speciale: $380,000 – $520,000
- Ferrari 458 Italia: $180,000 – $230,000
- Koenigsegg Regera: $2,000,000 – $3,500,000
- Koenigsegg Agera RS: $4,000,000 – $7,000,000
- Rolex Submariner Date (126610LN): $13,000 – $16,000
- Patek Philippe Nautilus 5711: $120,000 – $180,000
- Nike Air Jordan 1 Chicago (2015): $1,500 – $2,500
- iPhone 15 Pro Max 256GB used: $700 – $900
- Hermès Birkin 25 Togo: $25,000 – $40,000

For items not listed: use your knowledge of current secondary market values. Sneakers → StockX/GOAT. Watches → Chrono24/WatchBox. Cars → private party sales. Electronics → used eBay sold listings. Art → recent auction results.

Price history should show realistic year-by-year fluctuations from 2020 to 2026 for this specific item.
</pricing_rules>

Always respond with only a valid JSON object. No explanation, no markdown, no backticks.`;

    const userMessage = noteHint
      ? `${noteHint}\n\nAnalyze this item and return the JSON.`
      : "Analyze this item and return the JSON.";

    const jsonSchema = `
{
  "name": "precise full name — make, model, exact variant, year, edition",
  "currentValue": "2026 market value as number only, no dollar sign",
  "originalPrice": "original retail price as number only, no dollar sign",
  "category": "specific product category",
  "confidence": "confidence as number 0-100",
  "description": "Three sentences: what makes this specific item special, its market position, and why it has its current value.",
  "materials": "Three key materials, one per line. Format: Material — how it is used and why.",
  "specs": "Four key specifications, one per line. Format: Spec name: exact value with units.",
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

    const fullUserMessage = `${userMessage}\n\nRespond with this exact JSON structure:\n${jsonSchema}`;

    // PRIMARY: Claude Haiku 4.5 (fastest)
    try {
      console.log("Trying Claude Haiku 4.5...");
      const response = await anthropic.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 1000,
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
            { type: "text", text: fullUserMessage },
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
        max_tokens: 1000,
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
            { type: "text", text: fullUserMessage },
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
            { type: "text", text: `${systemPrompt}\n\n${fullUserMessage}` },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${base64Image}`,
                detail: "high",
              },
            },
          ],
        }],
        max_tokens: 1000,
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