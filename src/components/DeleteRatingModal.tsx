"use client";

import { useState } from "react";
import type { ClothingItem } from "@/lib/types";

interface DeleteRatingModalProps {
  item: ClothingItem;
  onCancel: () => void;
  onConfirm: (rating: number | null) => void;
}

export default function DeleteRatingModal({ item, onCancel, onConfirm }: DeleteRatingModalProps) {
  const [rating, setRating] = useState<number | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-surface p-6 shadow-xl">
        <p className="text-lg font-semibold">Remove this item? 🗑️</p>
        <p className="mt-1 text-sm text-muted">
          {item.color} {item.subcategory} will be removed from your closet.
        </p>

        <p className="mt-4 text-sm font-medium">Before it goes — how did you feel about it?</p>
        <div className="mt-2 flex gap-1.5">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              onClick={() => setRating(value)}
              className={`flex h-9 w-9 items-center justify-center rounded-full text-lg transition-transform ${
                rating !== null && value <= rating ? "scale-110" : "opacity-40"
              }`}
              aria-label={`${value} star${value === 1 ? "" : "s"}`}
            >
              ⭐
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-muted">
          We&apos;ll use this to fine-tune future outfit picks (optional).
        </p>

        <div className="mt-5 flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-muted hover:text-foreground"
          >
            Keep it
          </button>
          <button
            onClick={() => onConfirm(rating)}
            className="flex-1 rounded-lg bg-danger px-4 py-2.5 text-sm font-semibold text-white"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
