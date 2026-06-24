// Thin REST client for the Gemini API (https://ai.google.dev) — no SDK
// dependency needed, just fetch. Free tier: create a key at
// https://aistudio.google.com/apikey and set GEMINI_API_KEY.
const DEFAULT_MODEL = "gemini-2.5-flash";

function apiKey(): string | null {
  return process.env.GEMINI_API_KEY?.trim() || null;
}

function model(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

export function hasGeminiKey(): boolean {
  return apiKey() !== null;
}

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

async function callGemini(parts: GeminiPart[]): Promise<string | null> {
  const key = apiKey();
  if (!key) return null;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model()}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.6,
          },
        }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return typeof text === "string" ? text : null;
  } catch {
    return null;
  }
}

export async function generateJson<T>(prompt: string): Promise<T | null> {
  const text = await callGemini([{ text: prompt }]);
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function generateJsonFromImage<T>(
  prompt: string,
  imageBuffer: Buffer,
  mimeType: string
): Promise<T | null> {
  const text = await callGemini([
    { inlineData: { mimeType, data: imageBuffer.toString("base64") } },
    { text: prompt },
  ]);
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}
