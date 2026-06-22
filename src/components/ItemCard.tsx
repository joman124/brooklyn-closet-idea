"use client";

import Image from "next/image";
import type { ClothingItem } from "@/lib/types";

interface ItemCardProps {
  item: ClothingItem;
  onDelete: (id: string) => void;
}

export default function ItemCard({ item, onDelete }: ItemCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border bg-surface">
      <div className="relative aspect-square w-full overflow-hidden bg-accent-soft/40">
        <Image src={item.imageUrl} alt={item.subcategory} fill className="object-cover" unoptimized />
      </div>
      <button
        onClick={() => onDelete(item.id)}
        className="absolute right-2 top-2 hidden h-7 w-7 items-center justify-center rounded-full bg-black/60 text-sm text-white group-hover:flex"
        aria-label="Remove item"
      >
        ×
      </button>
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
    </div>
  );
}
