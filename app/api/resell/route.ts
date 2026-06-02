import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/lib/supabase";

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
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, userId, preferredPlatform } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "No image URL provided" }, { status: 400 });
    }

    // Check resell scan limits
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

    const platformNote = preferredPlatform ? `The user prefers selling on: ${preferredPlatform}. Make sure to include this platform in the results.` : "";

    const prompt = `You are an expert reselling analyst. Analyze this image and identify the item, then provide detailed reselling data across multiple platforms.

${platformNote}

STRICT RULES:
1. If the image contains adult content - respond with exactly: {"error": "inappropriate_content"}
2. If the image shows a building or fixed structure - respond with exactly: {"error": "buildings_not_supported"}
3. If the image is blurry or unclear - respond with exactly: {"error": "image_unclear"}

Analyze the item and return ONLY a JSON object with no extra text, no markdown, no backticks:
{
  "name": "exact product name with model and variant",
  "category": "product category",
  "condition": "estimated condition based on image (New, Like New, Good, Fair)",
  "originalPrice": "original retail price as number only",
  "quickSalePrice": "price for a quick sale within 24-48 hours as number only",
  "bestPrice": "best price if willing to wait 2-4 weeks as number only",
  "platforms": [
    {
      "name": "eBay",
      "averagePrice": "average sold price as number only",
      "highestSold": "highest recent sold price as number only",
      "lowestSold": "lowest recent sold price as number only",
      "demandLevel": "High, Medium or Low",
      "tips": "one short tip for selling on this platform"
    },
    {
      "name": "Facebook Marketplace",
      "averagePrice": "average sold price as number only",
      "highestSold": "highest recent sold price as number only",
      "lowestSold": "lowest recent sold price as number only",
      "demandLevel": "High, Medium or Low",
      "tips": "one short tip for selling on this platform"
    },
    {
      "name": "Craigslist",
      "averagePrice": "average sold price as number only",
      "highestSold": "highest recent sold price as number only",
      "lowestSold": "lowest recent sold price as number only",
      "demandLevel": "High, Medium or Low",
      "tips": "one short tip for selling on this platform"
    }${preferredPlatform && !["eBay", "Facebook Marketplace", "Craigslist"].includes(preferredPlatform) ? `,
    {
      "name": "${preferredPlatform}",
      "averagePrice": "average sold price as number only",
      "highestSold": "highest recent sold price as number only",
      "lowestSold": "lowest recent sold price as number only",
      "demandLevel": "High, Medium or Low",
      "tips": "one short tip for selling on this platform"
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
  "sellingTips": "2-3 sentences of advice for selling this specific item",
  "bestTimeToSell": "brief note on best timing to sell this item"
}`;

    // Try Gemini first
    try {
      console.log("Resell: Trying Gemini...");
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
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

    // Fallback to Claude
    try {
      console.log("Resell: Trying Claude...");
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-5",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mimeType as "image/jpeg" | "image/png" | "image/gif" | "image/webp", data: base64Image } },
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

    // Fallback to OpenAI
    try {
      console.log("Resell: Trying OpenAI...");
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${base64Image}`, detail: "high" } },
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