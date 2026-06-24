"use client";

import { useState } from "react";
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
  onUseMyLocation: () => void;
  isLocating: boolean;
  weather: DayWeather[];
  isLoading: boolean;
}

export default function WeatherStrip({
  location,
  onLocationChange,
  onUseMyLocation,
  isLocating,
  weather,
  isLoading,
}: WeatherStripProps) {
  const [draft, setDraft] = useState(location);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onLocationChange(draft);
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted">🌤️ What city should we style for?</p>
          <form onSubmit={submit} className="mt-1 flex flex-wrap gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Enter your city (e.g. Brooklyn, NY)"
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-base font-semibold outline-none focus:border-accent sm:w-64"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white"
              >
                Set
              </button>
              <button
                type="button"
                onClick={onUseMyLocation}
                disabled={isLocating}
                className="whitespace-nowrap rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-muted hover:text-foreground disabled:opacity-50"
              >
                {isLocating ? "Locating…" : "📍 Use my location"}
              </button>
            </div>
          </form>
        </div>
        <p className="text-xs text-muted">
          {location.trim()
            ? `Live forecast for ${location}.`
            : "We need a city to pull live weather and style outfits around it."}
        </p>
      </div>

      <div className="mt-4 flex gap-3 overflow-x-auto scrollbar-thin pb-1">
        {!location.trim() ? (
          <p className="text-sm text-muted">No city set yet — add one above to see this week&apos;s forecast.</p>
        ) : isLoading ? (
          <p className="text-sm text-muted">Loading live forecast…</p>
        ) : weather.length === 0 ? (
          <p className="text-sm text-muted">Couldn&apos;t find that city — try a different spelling.</p>
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
