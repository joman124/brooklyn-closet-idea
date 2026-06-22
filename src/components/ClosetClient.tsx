"use client";

import { useEffect, useState } from "react";
import ItemCard from "@/components/ItemCard";
import UploadDropzone from "@/components/UploadDropzone";
import type { ClothingItem } from "@/lib/types";

const CATEGORY_FILTERS = ["all", "top", "bottom", "outerwear", "shoes", "accessory", "dress"] as const;

export default function ClosetClient() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [filter, setFilter] = useState<(typeof CATEGORY_FILTERS)[number]>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/items")
      .then((res) => res.json())
      .then((data) => setItems(data.items ?? []))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleUpload(files: File[]) {
    setError(null);
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));
    const res = await fetch("/api/items", { method: "POST", body: formData });
    if (!res.ok) {
      setError("Something went wrong uploading those photos. Try again.");
      return;
    }
    const data = await res.json();
    setItems((prev) => [...prev, ...(data.items ?? [])]);
  }

  async function handleDelete(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
    await fetch(`/api/items/${id}`, { method: "DELETE" });
  }

  const visibleItems = filter === "all" ? items : items.filter((item) => item.category === filter);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">My Closet</h1>
          <p className="mt-1 text-muted">
            {items.length} item{items.length === 1 ? "" : "s"} tagged and ready to mix into outfits.
          </p>
        </div>
      </div>

      <UploadDropzone onUpload={handleUpload} />
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-8 flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium capitalize transition-colors ${
              filter === cat
                ? "bg-accent text-white"
                : "border border-border bg-surface text-muted hover:text-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {isLoading ? (
          <p className="text-muted">Loading your closet…</p>
        ) : visibleItems.length === 0 ? (
          <p className="mt-12 text-center text-muted">
            {items.length === 0
              ? "Your closet is empty — upload a few photos to get started."
              : "No items in this category yet."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {visibleItems.map((item) => (
              <ItemCard key={item.id} item={item} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
