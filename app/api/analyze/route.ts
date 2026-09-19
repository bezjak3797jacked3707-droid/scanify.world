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

// More resilient JSON parsing: strips markdown fences, then extracts the first
// {...} block if the model added any stray text before/after the JSON.
function parseJSON(text: string) {
  let clean = text.replace(/```json|```/g, "").trim();
  const firstBrace = clean.indexOf("{");
  const lastBrace = clean.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    clean = clean.slice(firstBrace, lastBrace + 1);
  }
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
- The MAIN SUBJECT the user is trying to scan is itself a building, house, or fixed architectural structure (e.g. someone photographed a house or storefront as the actual subject): {"error": "buildings_not_supported"}
- Image too blurry or dark: {"error": "image_unclear"}

IMPORTANT: A building, garage, house, or structure visible in the BACKGROUND of a photo does NOT trigger this rule. Cars, and many other items, are very commonly photographed with buildings in the background — this is normal and expected. Only trigger this rule if the building itself is clearly what the photo is actually of, with no scannable object as the real subject.

CORE PRINCIPLE — AVOID ANCHORING: Never let familiarity substitute for evidence. Every brand and category has famous, commonly-referenced items that you may be tempted to default to when something is rare, unusual, or hard to place. Resist this actively. If the visible details in front of you don't clearly and specifically match a well-known item, describe the actual details you can support with evidence — even at lower confidence — rather than confidently naming a more famous item in the same lineup. A genuine warning sign: if you notice you would give the same specific model name to several different, unrelated-looking items, that is a sign you are pattern-matching to a memorized example rather than reading the actual image in front of you. This applies equally to cars, watches, sneakers, electronics, and bags — no single model should ever function as a default guess for its entire brand or category.

IDENTIFICATION — be extremely precise:
Look at every visible detail: body shape, proportions, badges, logos, model numbers, colorways, stitching, hardware, serial numbers, condition, and unique features.

Cars: exact make, model, variant, and year, grounded in visible badges and body details — not silhouette resemblance to a more famous model.
Watches: brand, exact model, reference number, material, dial color, bezel type.
Sneakers: brand, exact model, colorway name, release year, collaboration.
Electronics: brand, exact model, generation, storage, color.
Bags: brand, model name, size, leather type, color, hardware color.

EVIDENCE STANDARD: Your "evidence" field must cite something independent of the name you're about to give — an actual visible detail (text, a proportion, a color, a hardware shape). Restating the name in different words (e.g. "it looks like a Submariner") is not valid evidence and should not be treated as grounds for high confidence.

PRICING — use real 2026 secondary market values as reference points where genuinely common and well-known:
- Rolex Submariner Date 126610LN: $13,000–$16,000
- Patek Philippe Nautilus 5711: $120,000–$180,000
- Nike Air Jordan 1 Chicago 2015: $1,500–$2,500
- iPhone 15 Pro Max 256GB used: $700–$900
- Hermès Birkin 25 Togo: $25,000–$40,000

For everything else: sneakers → StockX/GOAT averages. Watches → Chrono24. Cars → private party sale prices. Electronics → eBay sold listings. Art and collectibles → recent auction results.

RESPONSE FORMAT — return only valid JSON, no markdown, no explanation. Fill the fields in this exact order — the early fields must genuinely inform the later ones, not be filled in after you've already decided on a name:
{
  "visibleText": "Transcribe every visible marking, code, stamp, tag, serial number, badge text, or label exactly as it appears. Write 'none clearly visible' if nothing readable is present.",
  "evidence": "State the specific visible details that led to your identification — cite exact text from visibleText if any exists, or specific shape/proportion/hardware details if no text is visible. This must be independent of the name itself, not a restatement of it.",
  "evidenceFound": "true if your identification is grounded in actual text, numbers, or unambiguous markings visible in the image. false if you are relying primarily on general shape, silhouette, or resemblance to a known item without confirming text or markings.",
  "name": "exact precise name with make, model, variant, year, edition — determined from the evidence above, not decided first",
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

    // PRIMARY: Gemini 3.5 Flash-Lite, fast, no grounding, low temperature for consistent answers
    try {
      console.log("Trying Gemini 3.5 Flash-Lite...");
      const model = genAI.getGenerativeModel({
        model: "gemini-3.5-flash-lite",
        generationConfig: { temperature: 0.2 },
      });
      const result = await model.generateContent([
        fullPrompt,
        { inlineData: { mimeType, data: base64Image } },
      ]);
      const parsed = parseJSON(result.response.text().trim());
      const contentError = checkContentErrors(parsed);
      if (contentError) console.log(`Content rejected as "${contentError}" — full model response:`, JSON.stringify(parsed));
      if (contentError) return NextResponse.json({ error: contentError }, { status: 400 });

      const confidenceNum = parseInt(String(parsed.confidence), 10);
      const hasEvidence = parsed.evidenceFound === true || parsed.evidenceFound === "true";
      const lowConfidence = !isNaN(confidenceNum) && confidenceNum < GROUNDING_CONFIDENCE_THRESHOLD;

      if (!hasEvidence || lowConfidence) {
        try {
          console.log(
            !hasEvidence
              ? "No concrete identifying evidence found — retrying with search grounding..."
              : `Confidence ${confidenceNum} below threshold — retrying with search grounding...`
          );
          const groundedModel = genAI.getGenerativeModel({
            model: "gemini-3.5-flash-lite",
            generationConfig: { temperature: 0.2 },
            tools: [{ googleSearch: {} } as any],
          });
          const groundedResult = await groundedModel.generateContent([
            fullPrompt,
            { inlineData: { mimeType, data: base64Image } },
          ]);
          const groundedParsed = parseJSON(groundedResult.response.text().trim());
          const groundedContentError = checkContentErrors(groundedParsed);
          if (groundedContentError) console.log(`Content rejected as "${groundedContentError}" — full model response:`, JSON.stringify(groundedParsed));
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
        temperature: 0.2,
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
        temperature: 0.2,
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