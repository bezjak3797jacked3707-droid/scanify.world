import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { supabase } from "@/lib/supabase";
import { updateStreak } from "@/lib/streak";
import { checkRateLimit } from "@/lib/ratelimit";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getSystemPrompt } from "@/lib/prompts";

export const maxDuration = 300;

const GROUNDING_CONFIDENCE_THRESHOLD = 60;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function saveResult(parsed: any, imageUrl: string, userId: string | null, _clientDisplayName: string | null, eligibleForLeaderboard: boolean) {
  // The leaderboard name always comes from the user's profile, looked up here on the server.
  // The displayName sent by the browser is ignored on purpose, so nobody can put their own text on the board.
  let displayName = "Anonymous";
  if (userId) {
    try {
      const { data } = await getSupabaseAdmin()
        .from("profiles")
        .select("display_name")
        .eq("id", userId)
        .maybeSingle();
      if (data?.display_name) displayName = data.display_name;
    } catch (err) {
      console.error("Could not load display name:", err);
    }
  }

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
    display_name: displayName,
    on_leaderboard: eligibleForLeaderboard,
  });
  if (dbError) console.error("DB save error:", dbError.message);
  if (userId) {
    await supabase.rpc("increment_scans", { user_id_input: userId });
    await updateStreak(userId);
  }
}

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl, userId, displayName, eligibleForLeaderboard } = body;
    // Cap the note so nobody can stuff the prompt (and your bill) with huge text.
    const note: string | null = typeof body.note === "string" ? body.note.trim().slice(0, 200) || null : null;
    const isEligibleForLeaderboard = eligibleForLeaderboard === true || eligibleForLeaderboard === "true";

    if (!imageUrl || typeof imageUrl !== "string") {
      return NextResponse.json({ error: "No image URL provided" }, { status: 400 });
    }

    // Only accept images that live in your own Supabase "scans" bucket.
    const supabaseBase = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/+$/, "");
    const allowedPrefix = `${supabaseBase}/storage/v1/object/public/scans/`;
    if (!imageUrl.startsWith(allowedPrefix) || imageUrl.includes("..")) {
      return NextResponse.json({ error: "Invalid image URL" }, { status: 400 });
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

    if (!imageResponse.ok) {
      return NextResponse.json({ error: "Could not load image" }, { status: 400 });
    }

    const imageBuffer = await imageResponse.arrayBuffer();
    if (imageBuffer.byteLength > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Image too large" }, { status: 413 });
    }
    const base64Image = Buffer.from(imageBuffer).toString("base64");
    const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";

    // The prompt lives in lib/prompts.ts (switch between old and new there).
    const systemPrompt = getSystemPrompt();

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

      console.log(`Fast result — name: "${parsed.name}", confidence: ${confidenceNum}, evidenceFound: ${hasEvidence}, evidence: "${parsed.evidence}"`);

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