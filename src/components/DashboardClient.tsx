"use client";

import { useEffect, useState } from "react";
import ChatPanel from "@/components/ChatPanel";
import OutfitCard from "@/components/OutfitCard";
import WeatherStrip from "@/components/WeatherStrip";
import type { ChatMessage, ClothingItem, DayWeather, OutfitSuggestion } from "@/lib/types";

export default function DashboardClient() {
  const [location, setLocation] = useState("");
  const [weather, setWeather] = useState<DayWeather[]>([]);
  const [isWeatherLoading, setIsWeatherLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [outfits, setOutfits] = useState<OutfitSuggestion[]>([]);
  const [closet, setCloset] = useState<ClothingItem[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/chat").then((r) => r.json()),
      fetch("/api/outfits").then((r) => r.json()),
    ]).then(([chatData, outfitData]) => {
      setMessages(chatData.chatMessages ?? []);
      setOutfits(outfitData.outfits ?? []);
      setCloset(outfitData.closet ?? []);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ location, days: "7" });

    async function loadWeather() {
      if (!location.trim()) {
        if (!cancelled) {
          setWeather([]);
          setIsWeatherLoading(false);
        }
        return;
      }
      setIsWeatherLoading(true);
      const res = await fetch(`/api/weather?${params.toString()}`);
      const data = await res.json();
      if (cancelled) return;
      setWeather(data.weather ?? []);
      setIsWeatherLoading(false);
    }

    loadWeather();
    return () => {
      cancelled = true;
    };
  }, [location]);

  async function handleSendMessage(message: string) {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    });
    const data = await res.json();
    if (data.userMessage && data.assistantMessage) {
      setMessages((prev) => [...prev, data.userMessage, data.assistantMessage]);
    }
  }

  async function handleGenerate() {
    setError(null);
    setIsGenerating(true);
    const context = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(". ");

    try {
      const res = await fetch("/api/outfits/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ context, location, days: 7 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Couldn't generate outfits.");
        return;
      }
      setOutfits(data.outfits ?? []);
      setCloset(data.closet ?? []);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleVote(outfitId: string, vote: "up" | "down" | null) {
    setOutfits((prev) =>
      prev.map((o) => (o.id === outfitId ? { ...o, vote } : o))
    );
    await fetch("/api/outfits/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outfitId, vote }),
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">This Week</h1>
        <p className="mt-1 text-muted">
          Tell us what&apos;s going on, check the weather, and let AI build your week of outfits.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <WeatherStrip
            location={location}
            onLocationChange={setLocation}
            weather={weather}
            isLoading={isWeatherLoading}
          />

          <div className="flex items-center justify-between rounded-2xl border border-border bg-surface p-5">
            <div>
              <p className="font-semibold">Ready to plan your week?</p>
              <p className="text-sm text-muted">
                {closet.length === 0
                  ? "Upload some wardrobe items first."
                  : `Mixing from ${closet.length} closet item${closet.length === 1 ? "" : "s"}.`}
              </p>
            </div>
            <button
              onClick={handleGenerate}
              disabled={isGenerating || closet.length === 0}
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isGenerating ? "Styling…" : "Generate this week's outfits"}
            </button>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          {outfits.length > 0 && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {outfits
                .slice()
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((outfit) => (
                  <OutfitCard key={outfit.id} outfit={outfit} items={closet} onVote={handleVote} />
                ))}
            </div>
          )}
        </div>

        <div>
          <ChatPanel messages={messages} onSend={handleSendMessage} />
        </div>
      </div>
    </div>
  );
}
