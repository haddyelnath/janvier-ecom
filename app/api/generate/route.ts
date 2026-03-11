// ─────────────────────────────────────────────────────────────────────────────
// JANVIER Ecom Photo Studio — Gemini API Route
//
// POST /api/generate
// Accepts: multipart/form-data with { image: File, mode: "A" | "B" | "C" }
// Returns: JSON with { layflat?: ImageResult, detail?: ImageResult }
//          where ImageResult = { data: string (base64), mimeType: string }
//
// The GEMINI_API_KEY is stored server-side only — never sent to the client.
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from "next/server";

// ── Model configuration ────────────────────────────────────────────────────
// This is the Gemini model that supports image input + image output.
// If Google updates the model name, change it here.
// The model specified for this project.
// If the API returns a 404 model-not-found error, check the latest model IDs at:
// https://ai.google.dev/gemini-api/docs/models/gemini
const GEMINI_MODEL = "gemini-2.0-flash-preview-image-generation";

// Gemini REST API base URL
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

// ── Prompts ────────────────────────────────────────────────────────────────
// These prompts are used exactly as specified — do not modify without testing.

const PROMPT_LAYFLAT = `Convert the garment from the reference image into a photorealistic \
luxury e-commerce layflat product photo. Remove the hanger, background, \
and all non-garment elements. Isolate only the garment and reconstruct \
it as a neatly arranged layflat shot on a seamless pure white background \
(#FFFFFF), captured from a perfectly straight overhead top-down angle.
Preserve the garment exactly as in the reference: same silhouette, same \
proportions, same construction, same fabric, same color, same length, \
same sleeve and shoulder shape, same neckline or collar, same placket, \
buttons, zippers, stitching, pockets, trims, pleats, folds, \
embellishments, print placement, branding, and texture. Do not alter \
the design. Do not make it more fashionable, more minimal, or more \
generic. No reinterpretation.
The garment should be carefully flattened in a luxury e-commerce style, \
with clean alignment and balanced presentation. Keep the arrangement \
tidy and refined, but realistic — not overly stiff, not artificially \
vector-like. Show natural material character and subtle dimensionality. \
Fabric should appear premium, detailed, and true to life.
Use soft, neutral studio lighting with even exposure and high clarity. \
Background must remain pure white and distraction-free. No props, no \
styling elements, no extra garments, and no accessories unless \
originally attached to the item. Produce a commercially ready layflat \
fashion image with crisp detail, realistic texture, accurate \
construction, and premium online retail presentation.`;

const PROMPT_DETAIL = `Convert the garment reference into a photorealistic luxury e-commerce \
close-up detail shot. Focus on authentic product construction and \
textile realism: fabric texture, stitching, seam lines, closures, \
trims, edge finishing, pleats, folds, panels, embroidery, hardware, \
and surface quality. Preserve the exact original garment design, color, \
material character, and craftsmanship. Do not reinterpret or beautify \
beyond realistic premium studio presentation.
Frame the shot like a professional ecommerce detail image: close, \
precise, balanced, and easy to read. The crop should emphasize \
craftsmanship and material quality while keeping the composition clean \
and commercially useful. Use soft neutral studio lighting, sharp focus, \
high texture fidelity, and a seamless pure white background. No props, \
no body, no styling, no hanger, no distractions, no fashion editorial \
mood. Premium luxury ecommerce standard.
Crop into the most important garment detail area in a natural ecommerce \
way, prioritizing craftsmanship, texture, and construction clarity.`;

// ── Types ──────────────────────────────────────────────────────────────────

interface ImageResult {
  data: string;     // base64-encoded image
  mimeType: string; // e.g. "image/png"
}

// ── Core Gemini API call ───────────────────────────────────────────────────

/**
 * Sends an image + text prompt to the Gemini API and returns the generated image.
 * Uses the REST API directly for maximum compatibility with new model capabilities.
 *
 * @param imageBase64 - The input garment photo encoded as base64
 * @param imageMimeType - MIME type of the input image (image/jpeg, image/png, image/webp)
 * @param prompt - The generation prompt (PROMPT_LAYFLAT or PROMPT_DETAIL)
 * @param apiKey - Gemini API key from environment variables
 * @returns The generated image as base64 + mimeType
 */
async function callGemini(
  imageBase64: string,
  imageMimeType: string,
  prompt: string,
  apiKey: string
): Promise<ImageResult> {
  const url = `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const requestBody = {
    contents: [
      {
        parts: [
          // Input: the uploaded garment photo
          {
            inlineData: {
              mimeType: imageMimeType,
              data: imageBase64,
            },
          },
          // Input: the generation prompt text
          {
            text: prompt,
          },
        ],
      },
    ],
    // Request image output from the model
    generationConfig: {
      responseModalities: ["image"],
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  // Handle HTTP errors from the Gemini API
  if (!response.ok) {
    let errorMessage = `Gemini API error (${response.status})`;
    try {
      const errorBody = await response.json();
      errorMessage = errorBody?.error?.message || errorMessage;
    } catch {
      // Ignore JSON parse errors on error responses
    }
    throw new Error(errorMessage);
  }

  const data = await response.json();

  // Extract the image from the response candidates
  const candidates = data?.candidates;
  if (!candidates || candidates.length === 0) {
    throw new Error("Gemini returned no candidates. The model may have refused the request.");
  }

  const parts = candidates[0]?.content?.parts;
  if (!parts || parts.length === 0) {
    throw new Error("Gemini returned no content parts in the response.");
  }

  // Find the part that contains image data (inlineData)
  for (const part of parts) {
    if (part.inlineData) {
      return {
        data: part.inlineData.data,
        mimeType: part.inlineData.mimeType,
      };
    }
  }

  // If no image part was found, the model may have returned only text
  const textPart = parts.find((p: { text?: string }) => p.text);
  if (textPart?.text) {
    throw new Error(
      `Model returned text instead of an image: "${textPart.text.slice(0, 100)}"`
    );
  }

  throw new Error("No image found in Gemini response.");
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // ── 1. Check API key is configured ──────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[generate] GEMINI_API_KEY is not set in environment variables.");
    return NextResponse.json(
      { error: "Server configuration error: API key not set. Contact the admin." },
      { status: 500 }
    );
  }

  // ── 2. Parse the multipart form data ────────────────────────────────────
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Failed to parse the uploaded file. Please try again." },
      { status: 400 }
    );
  }

  const imageFile = formData.get("image") as File | null;
  const mode = formData.get("mode") as string | null;

  // Validate image presence
  if (!imageFile || imageFile.size === 0) {
    return NextResponse.json({ error: "No image provided." }, { status: 400 });
  }

  // Validate mode
  if (!mode || !["A", "B", "C"].includes(mode)) {
    return NextResponse.json({ error: "Invalid mode. Must be A, B, or C." }, { status: 400 });
  }

  // Validate MIME type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(imageFile.type)) {
    return NextResponse.json(
      { error: "Unsupported file type. Please upload a JPG, PNG, or WEBP image." },
      { status: 400 }
    );
  }

  // ── 3. Convert the image file to base64 ─────────────────────────────────
  let imageBase64: string;
  try {
    const arrayBuffer = await imageFile.arrayBuffer();
    imageBase64 = Buffer.from(arrayBuffer).toString("base64");
  } catch {
    return NextResponse.json(
      { error: "Failed to process the uploaded image. Please try again." },
      { status: 500 }
    );
  }

  const imageMimeType = imageFile.type;

  // ── 4. Call Gemini based on mode ─────────────────────────────────────────
  try {
    if (mode === "A") {
      // Mode A: Layflat only
      console.log("[generate] Mode A: generating layflat...");
      const layflat = await callGemini(imageBase64, imageMimeType, PROMPT_LAYFLAT, apiKey);
      return NextResponse.json({ layflat });
    }

    if (mode === "B") {
      // Mode B: Detail Close-up only
      console.log("[generate] Mode B: generating detail close-up...");
      const detail = await callGemini(imageBase64, imageMimeType, PROMPT_DETAIL, apiKey);
      return NextResponse.json({ detail });
    }

    if (mode === "C") {
      // Mode C: Run both A and B in parallel, return both results together
      console.log("[generate] Mode C: generating layflat + detail in parallel...");
      const [layflat, detail] = await Promise.all([
        callGemini(imageBase64, imageMimeType, PROMPT_LAYFLAT, apiKey),
        callGemini(imageBase64, imageMimeType, PROMPT_DETAIL, apiKey),
      ]);
      return NextResponse.json({ layflat, detail });
    }

    // Should never reach here due to validation above
    return NextResponse.json({ error: "Invalid mode." }, { status: 400 });

  } catch (error) {
    // Log the full error server-side for debugging
    console.error("[generate] Gemini API error:", error);

    // Return a friendly message to the client
    const message =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred while generating the image.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ── Route configuration ────────────────────────────────────────────────────
// Increase Vercel function timeout — Gemini image generation can take 30–60s.
// Note: Free tier Vercel has a 10s limit on Hobby plan; Pro plan allows 60s.
export const maxDuration = 60;
