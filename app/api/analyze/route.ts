import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from "@/lib/supabase";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "No image URL provided" }, { status: 400 });
    }

    const imageResponse = await fetch(imageUrl);
    const imageBuffer = await imageResponse.arrayBuffer();
    const base64Image = Buffer.from(imageBuffer).toString("base64");
    const mimeType = imageResponse.headers.get("content-type") || "image/jpeg";

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are an expert appraiser. Analyze this image and return ONLY a JSON object with no extra text, no markdown, no backticks. Use this exact format:
{
  "name": "full product name",
  "currentValue": "estimated current market value in USD",
  "originalPrice": "original retail price in USD",
  "category": "product category",
  "confidence": "confidence percentage as number only",
  "description": "2-3 sentence description",
  "materials": "main materials used",
  "specs": "key specs or features",
  "priceHistory": [
    {"year": "2019", "price": 0},
    {"year": "2020", "price": 0},
    {"year": "2021", "price": 0},
    {"year": "2022", "price": 0},
    {"year": "2023", "price": 0},
    {"year": "2024", "price": 0}
  ]
}
Replace the price values with realistic estimated market prices (as plain numbers, no currency symbols) for this specific item in each year. Base it on known market trends for this type of item.`;

    let lastError: any;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Attempt ${attempt}...`);

        const result = await model.generateContent([
          prompt,
          {
            inlineData: {
              mimeType,
              data: base64Image,
            },
          },
        ]);

        const text = result.response.text().trim();
        const parsed = JSON.parse(text);

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
          price_history: parsed.priceHistory ?? null,
        });

        if (dbError) {
          console.error("DB save error:", dbError.message);
        } else {
          console.log("Scan saved to database.");
        }

        return NextResponse.json(parsed);

      } catch (err: any) {
        lastError = err;
        console.error(`Attempt ${attempt} failed:`, err?.message);
        if (attempt < 3) {
          console.log(`Waiting 5 seconds before retry...`);
          await sleep(5000);
        }
      }
    }

    throw lastError;

  } catch (error: any) {
    console.error("=== ANALYZE ERROR ===");
    console.error("Message:", error?.message);
    return NextResponse.json({ error: "Analysis failed", detail: error?.message }, { status: 500 });
  }
}