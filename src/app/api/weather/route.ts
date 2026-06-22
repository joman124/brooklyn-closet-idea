import { NextRequest, NextResponse } from "next/server";
import { getWeeklyWeather } from "@/lib/weather";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const location = searchParams.get("location")?.trim() || "New York, NY";
  const startDate = searchParams.get("startDate") || new Date().toISOString().slice(0, 10);
  const days = Number(searchParams.get("days") ?? 7);

  const weather = await getWeeklyWeather(location, startDate, days);
  return NextResponse.json({ weather });
}
