"use client";

import { useEffect, useRef, useState } from "react";
import ItemCard from "@/components/ItemCard";
import UploadDropzone from "@/components/UploadDropzone";
import UploadReviewModal from "@/components/UploadReviewModal";
import type { ClothingItem, DetectedClothingItem } from "@/lib/types";

const CATEGORY_FILTERS = ["all", "top", "bottom", "outerwear", "shoes", "accessory", "dress"] as const;

export default function ClosetClient() {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [filter, setFilter] = useState<(typeof CATEGORY_FILTERS)[number]>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queueRef = useRef<File[]>([]);
  const isProcessingRef = useRef(false);
  const [activeFile, setActiveFile] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [detections, setDetections] = useState<DetectedClothingItem[]>([]);
  const [isDetecting, setIsDetecting] = useState(false);

  useEffect(() => {
    fetch("/api/items")
      .then((res) => res.json())
      .then((data) => setItems(data.items ?? []))
      .finally(() => setIsLoading(false));
  }, []);

  async function processNext() {
    if (isProcessingRef.current) return;
    const next = queueRef.current.shift();
    if (!next) {
      setActiveFile(null);
      setActiveIndex(0);
      setTotalCount(0);
      return;
    }
    isProcessingRef.current = true;
    setActiveFile(next);
    setFileKey((k) => k + 1);
    setIsDetecting(true);
    setDetections([]);

    try {
      const formData = new FormData();
      formData.append("file", next);
      const res = await fetch("/api/items/detect", { method: "POST", body: formData });
      const data = await res.json();
      setDetections(data.detections ?? []);
    } catch {
      setError("Couldn't analyze that photo. Try again.");
    } finally {
      setIsDetecting(false);
      isProcessingRef.current = false;
    }
  }

  async function handleUpload(files: File[]) {
    setError(null);
    setTotalCount((count) => count + files.length);
    queueRef.current.push(...files);
    await processNext();
  }

  function handleConfirmed(item: ClothingItem) {
    setItems((prev) => [...prev, item]);
  }

  function handleReviewDone() {
    setActiveIndex((i) => i + 1);
    processNext();
  }

  async function handleDelete(id: string, rating: number | null) {
    setItems((prev) => prev.filter((item) => item.id !== id));
    await fetch(`/api/items/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating }),
    });
  }

  async function handleUpdate(id: string, patch: Partial<ClothingItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
    await fetch(`/api/items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  const visibleItems = filter === "all" ? items : items.filter((item) => item.category === filter);
  const isReviewing = activeFile !== null;

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">My Closet 👗</h1>
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
              ? "Your closet is empty — upload a few photos to get started. 📸"
              : "No items in this category yet."}
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {visibleItems.map((item) => (
              <ItemCard key={item.id} item={item} onDelete={handleDelete} onUpdate={handleUpdate} />
            ))}
          </div>
        )}
      </div>

      {isReviewing && activeFile && (
        <UploadReviewModal
          key={fileKey}
          file={activeFile}
          fileIndex={activeIndex}
          fileCount={totalCount}
          detections={detections}
          isDetecting={isDetecting}
          onConfirmed={handleConfirmed}
          onDone={handleReviewDone}
        />
      )}
    </div>
  );
}
