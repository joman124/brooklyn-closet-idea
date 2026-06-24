import { NextRequest, NextResponse } from "next/server";
import { getWeeklyWeather, getWeeklyWeatherByCoords, reverseGeocode } from "@/lib/weather";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("startDate") || new Date().toISOString().slice(0, 10);
  const days = Number(searchParams.get("days") ?? 7);

  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  if (lat && lon) {
    const label = (await reverseGeocode(Number(lat), Number(lon))) || "Your location";
    const weather = await getWeeklyWeatherByCoords(Number(lat), Number(lon), label, startDate, days);
    return NextResponse.json({ weather, location: label });
  }

  const location = searchParams.get("location")?.trim();
  if (!location) {
    return NextResponse.json({ error: "A city is required to fetch weather." }, { status: 400 });
  }

  const weather = await getWeeklyWeather(location, startDate, days);
  return NextResponse.json({ weather, location });
}
