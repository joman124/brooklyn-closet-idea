import type { DayWeather } from "./types";
import { hashString, seededRandom } from "./hash";

// ---------------------------------------------------------------------------
// Live weather: Open-Meteo (api.open-meteo.com) is the primary source — it's
// completely free, needs no API key, and is genuinely live. OpenWeatherMap
// (OPENWEATHER_API_KEY) is kept as an optional secondary source if Open-Meteo
// is unreachable. Deterministic mock data is the last-resort fallback so the
// app still works offline.
// ---------------------------------------------------------------------------

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

function mockWeeklyWeather(location: string, startDate: string, days: number): DayWeather[] {
  return dateSequence(startDate, days).map((date) => mockDayWeather(location, date));
}

export interface GeoResult {
  lat: number;
  lon: number;
  label: string;
}

export async function geocodeCity(location: string): Promise<GeoResult | null> {
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        location
      )}&count=1&language=en&format=json`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const result = data.results?.[0];
    if (!result) return null;
    const label = [result.name, result.admin1, result.country].filter(Boolean).join(", ");
    return { lat: result.latitude, lon: result.longitude, label };
  } catch {
    return null;
  }
}

// Free, keyless reverse-geocoding used for the "use my location" button —
// turns browser geolocation coordinates back into a human-readable place name.
export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
    );
    if (!res.ok) return null;
    const data = await res.json();
    return data.city || data.locality || data.principalSubdivision || null;
  } catch {
    return null;
  }
}

const WMO_CONDITION: Record<number, DayWeather["condition"]> = {
  0: "sunny",
  1: "sunny",
  2: "cloudy",
  3: "cloudy",
  45: "cloudy",
  48: "cloudy",
  51: "rainy",
  53: "rainy",
  55: "rainy",
  56: "rainy",
  57: "rainy",
  61: "rainy",
  63: "rainy",
  65: "rainy",
  66: "rainy",
  67: "rainy",
  71: "snowy",
  73: "snowy",
  75: "snowy",
  77: "snowy",
  80: "rainy",
  81: "rainy",
  82: "rainy",
  85: "snowy",
  86: "snowy",
  95: "rainy",
  96: "rainy",
  99: "rainy",
};

function conditionFromCode(code: number, windSpeedMaxMph?: number): DayWeather["condition"] {
  if ((code === 0 || code === 1) && windSpeedMaxMph && windSpeedMaxMph >= 25) return "windy";
  return WMO_CONDITION[code] ?? "cloudy";
}

async function fetchOpenMeteoForecast(
  lat: number,
  lon: number,
  label: string,
  startDate: string,
  days: number
): Promise<DayWeather[] | null> {
  try {
    const end = new Date(startDate);
    end.setDate(end.getDate() + days - 1);
    const endDate = end.toISOString().slice(0, 10);
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
        `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weathercode,windspeed_10m_max` +
        `&temperature_unit=fahrenheit&windspeed_unit=mph&timezone=auto` +
        `&start_date=${startDate}&end_date=${endDate}`
    );
    if (!res.ok) return null;
    const data = await res.json();
    const daily = data.daily;
    if (!daily?.time?.length) return null;
    return daily.time.map(
      (date: string, i: number): DayWeather => ({
        date,
        location: label,
        tempHighF: Math.round(daily.temperature_2m_max[i]),
        tempLowF: Math.round(daily.temperature_2m_min[i]),
        condition: conditionFromCode(daily.weathercode[i], daily.windspeed_10m_max?.[i]),
        precipitationChance: Math.round(daily.precipitation_probability_max?.[i] ?? 0),
      })
    );
  } catch {
    return null;
  }
}

async function fetchOpenWeatherForecast(
  location: string,
  startDate: string,
  days: number
): Promise<DayWeather[] | null> {
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

    const conditionMap: Record<string, DayWeather["condition"]> = {
      rain: "rainy",
      thunderstorm: "rainy",
      drizzle: "rainy",
      snow: "snowy",
      clouds: "cloudy",
      clear: "sunny",
      wind: "windy",
    };

    return dateSequence(startDate, days)
      .map((date): DayWeather | null => {
        const entries = (forecast.list ?? []).filter((entry: { dt_txt: string }) =>
          entry.dt_txt.startsWith(date)
        );
        if (entries.length === 0) return null;
        const temps: number[] = entries.map((e: { main: { temp: number } }) => e.main.temp);
        const conditions: string[] = entries.map(
          (e: { weather: { main: string }[] }) => e.weather[0]?.main?.toLowerCase() ?? "clear"
        );
        const pops: number[] = entries.map((e: { pop?: number }) => e.pop ?? 0);
        const mostCommon = conditions.sort(
          (a, b) =>
            conditions.filter((c) => c === b).length - conditions.filter((c) => c === a).length
        )[0];
        return {
          date,
          location,
          tempHighF: Math.round(Math.max(...temps)),
          tempLowF: Math.round(Math.min(...temps)),
          condition: conditionMap[mostCommon] ?? "cloudy",
          precipitationChance: Math.round(Math.max(...pops) * 100),
        };
      })
      .filter((d): d is DayWeather => d !== null);
  } catch {
    return null;
  }
}

export async function getWeeklyWeatherByCoords(
  lat: number,
  lon: number,
  label: string,
  startDate: string,
  days = 7
): Promise<DayWeather[]> {
  const real = await fetchOpenMeteoForecast(lat, lon, label, startDate, days);
  if (real && real.length) return real;
  return mockWeeklyWeather(label, startDate, days);
}

export async function getWeeklyWeather(
  location: string,
  startDate: string,
  days = 7
): Promise<DayWeather[]> {
  const geo = await geocodeCity(location);
  if (geo) {
    const real = await fetchOpenMeteoForecast(geo.lat, geo.lon, geo.label || location, startDate, days);
    if (real && real.length) return real;
  }

  const fromOpenWeather = await fetchOpenWeatherForecast(location, startDate, days);
  if (fromOpenWeather && fromOpenWeather.length) return fromOpenWeather;

  return mockWeeklyWeather(location, startDate, days);
}
