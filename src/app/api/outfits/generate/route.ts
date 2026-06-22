import { NextRequest, NextResponse } from "next/server";
import { extractChatContext, generateWeeklyOutfits } from "@/lib/ai";
import { withDb } from "@/lib/db";
import { getWeeklyWeather } from "@/lib/weather";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    context?: string;
    location?: string;
    startDate?: string;
    days?: number;
  };

  const location = body.location?.trim() || "New York, NY";
  const startDate = body.startDate || new Date().toISOString().slice(0, 10);
  const days = body.days ?? 7;
  const contextText = body.context?.trim() || "";

  const [weather, chatContext] = await Promise.all([
    getWeeklyWeather(location, startDate, days),
    contextText ? extractChatContext(contextText) : Promise.resolve(null),
  ]);

  const { closet, itemScores } = withDb((data) => ({
    closet: data.items,
    itemScores: data.itemScores,
  }));

  if (closet.length === 0) {
    return NextResponse.json(
      { error: "Upload some wardrobe items first so there's something to work with." },
      { status: 400 }
    );
  }

  const outfits = generateWeeklyOutfits({
    closet,
    days: weather,
    context: contextText,
    formalityHint: chatContext?.formalityHint ?? 2,
    activityTags: chatContext?.activityTags ?? [],
    itemScores,
  });

  withDb((data) => {
    const dates = new Set(outfits.map((o) => o.date));
    data.outfits = data.outfits.filter((o) => !dates.has(o.date));
    data.outfits.push(...outfits);
  });

  return NextResponse.json({ outfits, weather, closet });
}
