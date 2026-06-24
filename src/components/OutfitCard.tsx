"use client";

import Image from "next/image";
import type { ClothingItem, OutfitSuggestion } from "@/lib/types";

interface OutfitCardProps {
  outfit: OutfitSuggestion;
  items: ClothingItem[];
  onVote: (outfitId: string, vote: "up" | "down" | null) => void;
}

export default function OutfitCard({ outfit, items, onVote }: OutfitCardProps) {
  const outfitItems = outfit.itemIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is ClothingItem => Boolean(item));

  const dayLabel = new Date(outfit.date + "T00:00:00").toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface p-4 transition-shadow hover:shadow-md">
      <div className="flex items-baseline justify-between">
        <p className="font-semibold">👚 {dayLabel}</p>
        <p className="text-xs text-muted">{outfit.weatherSummary}</p>
      </div>

      {outfitItems.length === 0 ? (
        <p className="mt-4 text-sm text-muted">Not enough closet items for this day yet.</p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {outfitItems.map((item) => (
            <div key={item.id} className="relative aspect-square overflow-hidden rounded-lg bg-accent-soft/40">
              <Image src={item.imageUrl} alt={item.subcategory} fill className="object-cover" unoptimized />
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-muted">{outfit.rationale}</p>

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={() => onVote(outfit.id, outfit.vote === "up" ? null : "up")}
          className={`flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
            outfit.vote === "up"
              ? "border-success bg-success/10 text-success"
              : "border-border text-muted hover:text-foreground"
          }`}
        >
          👍 Love it
        </button>
        <button
          onClick={() => onVote(outfit.id, outfit.vote === "down" ? null : "down")}
          className={`flex-1 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors ${
            outfit.vote === "down"
              ? "border-danger bg-danger/10 text-danger"
              : "border-border text-muted hover:text-foreground"
          }`}
        >
          👎 Not for me
        </button>
      </div>
    </div>
  );
}
