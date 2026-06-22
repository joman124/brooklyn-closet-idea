"use client";

import type { DayWeather } from "@/lib/types";

const CONDITION_EMOJI: Record<DayWeather["condition"], string> = {
  sunny: "☀️",
  cloudy: "☁️",
  rainy: "🌧️",
  snowy: "❄️",
  windy: "💨",
};

interface WeatherStripProps {
  location: string;
  onLocationChange: (location: string) => void;
  weather: DayWeather[];
  isLoading: boolean;
}

export default function WeatherStrip({
  location,
  onLocationChange,
  weather,
  isLoading,
}: WeatherStripProps) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted">Planning for</p>
          <input
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder="Optional — city or trip destination"
            className="mt-1 w-64 rounded-lg border border-border bg-background px-3 py-1.5 text-base font-semibold outline-none focus:border-accent"
          />
        </div>
        <p className="text-xs text-muted">
          {location.trim()
            ? "Tip: type a trip destination to plan outfits around different weather."
            : "Leave blank to skip weather and style by your plans alone."}
        </p>
      </div>

      <div className="mt-4 flex gap-3 overflow-x-auto scrollbar-thin pb-1">
        {!location.trim() ? (
          <p className="text-sm text-muted">No location set — weather isn&apos;t factored in.</p>
        ) : isLoading ? (
          <p className="text-sm text-muted">Loading forecast…</p>
        ) : (
          weather.map((day) => (
            <div
              key={day.date}
              className="flex min-w-[88px] flex-col items-center gap-1 rounded-xl border border-border bg-background px-3 py-2 text-center"
            >
              <span className="text-xs font-medium text-muted">
                {new Date(day.date + "T00:00:00").toLocaleDateString(undefined, {
                  weekday: "short",
                })}
              </span>
              <span className="text-xl">{CONDITION_EMOJI[day.condition]}</span>
              <span className="text-sm font-semibold">
                {day.tempHighF}°/{day.tempLowF}°
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
