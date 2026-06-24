"use client";

import { useState } from "react";
import Image from "next/image";
import DeleteRatingModal from "@/components/DeleteRatingModal";
import type { ClothingCategory, ClothingItem } from "@/lib/types";

const CATEGORIES: ClothingCategory[] = ["top", "bottom", "outerwear", "shoes", "accessory", "dress"];

interface ItemCardProps {
  item: ClothingItem;
  onDelete: (id: string, rating: number | null) => void;
  onUpdate: (id: string, patch: Partial<ClothingItem>) => void;
}

export default function ItemCard({ item, onDelete, onUpdate }: ItemCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [draft, setDraft] = useState(item);

  function startEdit() {
    setDraft(item);
    setIsEditing(true);
  }

  function saveEdit() {
    onUpdate(item.id, {
      category: draft.category,
      subcategory: draft.subcategory,
      color: draft.color,
      pattern: draft.pattern,
      styleTags: draft.styleTags,
    });
    setIsEditing(false);
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-surface transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="relative aspect-square w-full overflow-hidden bg-accent-soft/40">
        <Image src={item.imageUrl} alt={item.subcategory} fill className="object-cover transition-transform group-hover:scale-105" unoptimized />
      </div>

      <div className="absolute right-2 top-2 hidden gap-1.5 group-hover:flex">
        <button
          onClick={startEdit}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-xs text-white"
          aria-label="Edit tags"
        >
          ✎
        </button>
        <button
          onClick={() => setIsConfirmingDelete(true)}
          className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white"
          aria-label="Remove item"
        >
          ×
        </button>
      </div>

      {isEditing ? (
        <div className="space-y-2 p-3 text-sm">
          <select
            value={draft.category}
            onChange={(e) => setDraft({ ...draft, category: e.target.value as ClothingCategory })}
            className="w-full rounded-lg border border-border bg-background px-2 py-1 capitalize"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <input
            value={draft.subcategory}
            onChange={(e) => setDraft({ ...draft, subcategory: e.target.value })}
            placeholder="Subcategory"
            className="w-full rounded-lg border border-border bg-background px-2 py-1"
          />
          <input
            value={draft.color}
            onChange={(e) => setDraft({ ...draft, color: e.target.value })}
            placeholder="Color"
            className="w-full rounded-lg border border-border bg-background px-2 py-1"
          />
          <input
            value={draft.styleTags.join(", ")}
            onChange={(e) =>
              setDraft({
                ...draft,
                styleTags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
              })
            }
            placeholder="Style tags, comma separated"
            className="w-full rounded-lg border border-border bg-background px-2 py-1"
          />
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => setIsEditing(false)}
              className="flex-1 rounded-lg border border-border px-2 py-1 text-xs font-medium text-muted"
            >
              Cancel
            </button>
            <button
              onClick={saveEdit}
              className="flex-1 rounded-lg bg-accent px-2 py-1 text-xs font-semibold text-white"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="p-3">
          <p className="truncate text-sm font-semibold capitalize">{item.subcategory}</p>
          <p className="truncate text-xs text-muted capitalize">
            {item.color} · {item.pattern}
          </p>
          <div className="mt-2 flex flex-wrap gap-1">
            {item.styleTags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] capitalize text-accent"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {isConfirmingDelete && (
        <DeleteRatingModal
          item={item}
          onCancel={() => setIsConfirmingDelete(false)}
          onConfirm={(rating) => {
            setIsConfirmingDelete(false);
            onDelete(item.id, rating);
          }}
        />
      )}
    </div>
  );
}
