"use client";

import { useState } from "react";
import Image from "next/image";
import DeleteRatingModal from "@/components/DeleteRatingModal";
import type { ClothingCategory, ClothingItem } from "@/lib/types";

const CATEGORIES: ClothingCategory[] = ["top", "bottom", "outerwear", "shoes", "accessory", "dress"];

interface ItemDetailModalProps {
  item: ClothingItem;
  onClose: () => void;
  onDelete: (id: string, rating: number | null) => void;
  onUpdate: (id: string, patch: Partial<ClothingItem>) => void;
}

export default function ItemDetailModal({ item, onClose, onDelete, onUpdate }: ItemDetailModalProps) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-sm overflow-hidden rounded-2xl bg-surface shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative aspect-square w-full bg-accent-soft/40">
          <Image src={item.imageUrl} alt={item.subcategory} fill className="object-cover" unoptimized />
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white"
          >
            ×
          </button>
        </div>

        {isEditing ? (
          <div className="space-y-2 p-4 text-sm">
            <select
              value={draft.category}
              onChange={(e) => setDraft({ ...draft, category: e.target.value as ClothingCategory })}
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5 capitalize"
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
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5"
            />
            <input
              value={draft.color}
              onChange={(e) => setDraft({ ...draft, color: e.target.value })}
              placeholder="Color"
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5"
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
              className="w-full rounded-lg border border-border bg-background px-2 py-1.5"
            />
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setIsEditing(false)}
                className="flex-1 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="flex-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-semibold text-white"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4">
            <p className="text-base font-semibold capitalize">
              {item.color} {item.subcategory}
            </p>
            <p className="text-sm text-muted capitalize">
              {item.category} · {item.pattern}
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

            <div className="mt-4 flex gap-2">
              <button
                onClick={startEdit}
                className="flex-1 rounded-lg border border-border px-3 py-2 text-sm font-medium text-muted hover:text-foreground"
              >
                ✎ Edit tags
              </button>
              <button
                onClick={() => setIsConfirmingDelete(true)}
                className="flex-1 rounded-lg border border-danger/30 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10"
              >
                Remove
              </button>
            </div>
          </div>
        )}
      </div>

      {isConfirmingDelete && (
        <DeleteRatingModal
          item={item}
          onCancel={() => setIsConfirmingDelete(false)}
          onConfirm={(rating) => {
            setIsConfirmingDelete(false);
            onDelete(item.id, rating);
            onClose();
          }}
        />
      )}
    </div>
  );
}
