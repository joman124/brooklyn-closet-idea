import { NextRequest, NextResponse } from "next/server";
import { extractChatContext, generateWeeklyOutfits, type PlanDay } from "@/lib/ai";
import { withDb } from "@/lib/db";
import { getWeeklyWeather } from "@/lib/weather";

function dateSequence(startDate: string, days: number): string[] {
  const start = new Date(startDate);
  const dates: string[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    context?: string;
    location?: string;
    startDate?: string;
    days?: number;
  };

  const location = body.location?.trim() || "";
  const startDate = body.startDate || new Date().toISOString().slice(0, 10);
  const days = body.days ?? 7;
  const contextText = body.context?.trim() || "";

  const [planDays, chatContext] = await Promise.all([
    location
      ? getWeeklyWeather(location, startDate, days).then((weather): PlanDay[] =>
          weather.map((day) => ({ date: day.date, location, weather: day }))
        )
      : Promise.resolve(
          dateSequence(startDate, days).map((date): PlanDay => ({ date, location: "", weather: null }))
        ),
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
    days: planDays,
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

  return NextResponse.json({ outfits, weather: planDays.map((d) => d.weather).filter(Boolean), closet });
}
