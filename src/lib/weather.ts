import type { DayWeather } from "./types";
import { hashString, seededRandom } from "./hash";

// Rough seasonal baseline (Northern Hemisphere) used only for mock data.
function seasonalRangeF(month: number): [number, number] {
  if (month === 12 || month === 1 || month === 2) return [18, 42];
  if (month >= 3 && month <= 5) return [42, 66];
  if (month >= 6 && month <= 8) return [64, 92];
  return [40, 64]; // fall
}

function mockDayWeather(location: string, date: string): DayWeather {
  const seed = hashString(`${location.toLowerCase().trim()}|${date}`);
  const month = new Date(date).getMonth() + 1;
  const [lo, hi] = seasonalRangeF(month);
  const spread = hi - lo;
  const r1 = seededRandom(seed);
  const r2 = seededRandom(seed * 1.7 + 13);
  const r3 = seededRandom(seed * 2.3 + 7);

  const tempHighF = Math.round(lo + r1 * spread);
  const tempLowF = Math.round(tempHighF - 6 - r2 * 10);

  const conditionRoll = r3;
  let condition: DayWeather["condition"];
  let precipitationChance: number;
  if (tempHighF <= 33 && conditionRoll > 0.6) {
    condition = "snowy";
    precipitationChance = Math.round(40 + conditionRoll * 50);
  } else if (conditionRoll > 0.78) {
    condition = "rainy";
    precipitationChance = Math.round(50 + conditionRoll * 40);
  } else if (conditionRoll > 0.55) {
    condition = "cloudy";
    precipitationChance = Math.round(conditionRoll * 30);
  } else if (conditionRoll > 0.4) {
    condition = "windy";
    precipitationChance = Math.round(conditionRoll * 15);
  } else {
    condition = "sunny";
    precipitationChance = Math.round(conditionRoll * 10);
  }

  return { date, location, tempHighF, tempLowF, condition, precipitationChance };
}

async function realDayWeather(
  location: string,
  date: string
): Promise<DayWeather | null> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) return null;

  try {
    const geoRes = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(
        location
      )}&limit=1&appid=${apiKey}`
    );
    const geo = await geoRes.json();
    if (!Array.isArray(geo) || geo.length === 0) return null;
    const { lat, lon } = geo[0];

    const forecastRes = await fetch(
      `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=imperial&appid=${apiKey}`
    );
    const forecast = await forecastRes.json();
    const entries = (forecast.list ?? []).filter((entry: { dt_txt: string }) =>
      entry.dt_txt.startsWith(date)
    );
    if (entries.length === 0) return null;

    const temps: number[] = entries.map((e: { main: { temp: number } }) => e.main.temp);
    const conditions: string[] = entries.map(
      (e: { weather: { main: string }[] }) => e.weather[0]?.main?.toLowerCase() ?? "clear"
    );
    const pops: number[] = entries.map((e: { pop?: number }) => e.pop ?? 0);

    const conditionMap: Record<string, DayWeather["condition"]> = {
      rain: "rainy",
      thunderstorm: "rainy",
      drizzle: "rainy",
      snow: "snowy",
      clouds: "cloudy",
      clear: "sunny",
      wind: "windy",
    };
    const mostCommon = conditions.sort(
      (a, b) =>
        conditions.filter((c) => c === b).length -
        conditions.filter((c) => c === a).length
    )[0];

    return {
      date,
      location,
      tempHighF: Math.round(Math.max(...temps)),
      tempLowF: Math.round(Math.min(...temps)),
      condition: conditionMap[mostCommon] ?? "cloudy",
      precipitationChance: Math.round(Math.max(...pops) * 100),
    };
  } catch {
    return null;
  }
}

export async function getWeatherForDate(
  location: string,
  date: string
): Promise<DayWeather> {
  const real = await realDayWeather(location, date);
  return real ?? mockDayWeather(location, date);
}

export async function getWeeklyWeather(
  location: string,
  startDate: string,
  days = 7
): Promise<DayWeather[]> {
  const start = new Date(startDate);
  const results: DayWeather[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    results.push(await getWeatherForDate(location, iso));
  }
  return results;
}
