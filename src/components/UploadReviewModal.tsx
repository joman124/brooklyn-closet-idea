"use client";

import { useEffect, useMemo, useState } from "react";
import { cropImageToBlob } from "@/lib/crop";
import type { ClothingCategory, ClothingItem, DetectedClothingItem } from "@/lib/types";

const CATEGORIES: ClothingCategory[] = ["top", "bottom", "outerwear", "shoes", "accessory", "dress"];

interface UploadReviewModalProps {
  file: File;
  fileIndex: number;
  fileCount: number;
  detections: DetectedClothingItem[];
  isDetecting: boolean;
  onConfirmed: (item: ClothingItem) => void;
  onDone: () => void;
}

export default function UploadReviewModal({
  file,
  fileIndex,
  fileCount,
  detections,
  isDetecting,
  onConfirmed,
  onDone,
}: UploadReviewModalProps) {
  const [step, setStep] = useState(0);
  const [overrides, setOverrides] = useState<Record<number, Partial<DetectedClothingItem>>>({});
  const [cropUrl, setCropUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fullPreviewUrl = useMemo(() => URL.createObjectURL(file), [file]);
  useEffect(() => {
    return () => URL.revokeObjectURL(fullPreviewUrl);
  }, [fullPreviewUrl]);

  const current = detections[step] ?? null;
  const draft: DetectedClothingItem | null = current ? { ...current, ...overrides[step] } : null;

  useEffect(() => {
    if (!current) return;
    let revoked = false;
    let url: string | null = null;
    cropImageToBlob(file, current.box).then((blob) => {
      if (revoked) return;
      url = URL.createObjectURL(blob);
      setCropUrl(url);
    });
    return () => {
      revoked = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [current, file]);

  function updateDraft(patch: Partial<DetectedClothingItem>) {
    setOverrides((o) => ({ ...o, [step]: { ...o[step], ...patch } }));
  }

  function advance() {
    if (step + 1 >= detections.length) {
      onDone();
    } else {
      setStep((s) => s + 1);
    }
  }

  async function handleYes() {
    if (!current || !draft) return;
    setIsSaving(true);
    try {
      const blob = await cropImageToBlob(file, current.box);
      const formData = new FormData();
      formData.append("file", blob, file.name);
      formData.append("originalFilename", file.name);
      formData.append("category", draft.category);
      formData.append("subcategory", draft.subcategory);
      formData.append("color", draft.color);
      formData.append("pattern", draft.pattern);
      formData.append("styleTags", JSON.stringify(draft.styleTags));
      formData.append("warmth", String(draft.warmth));
      formData.append("formality", String(draft.formality));

      const res = await fetch("/api/items/confirm", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        if (data.item) onConfirmed(data.item);
      }
    } finally {
      setIsSaving(false);
      advance();
    }
  }

  function handleNo() {
    advance();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-surface p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted">
            Photo {fileIndex + 1} of {fileCount}
            {detections.length > 1 ? ` · Item ${step + 1} of ${detections.length}` : ""}
          </p>
          <button onClick={onDone} className="text-sm text-muted hover:text-foreground" aria-label="Close">
            ✕
          </button>
        </div>

        {isDetecting ? (
          <div className="mt-4 flex flex-col items-center gap-3 py-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={fullPreviewUrl} alt="Uploaded photo" className="max-h-56 rounded-xl object-contain" />
            <p className="text-sm text-muted">✨ Spotting clothing items in your photo…</p>
          </div>
        ) : !current || !draft ? (
          <div className="mt-4 py-6 text-center text-sm text-muted">
            No clothing items detected in this photo.
          </div>
        ) : (
          <div className="mt-4">
            <div className="flex items-center justify-center rounded-xl bg-accent-soft/40 p-3">
              {cropUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cropUrl} alt="Detected item" className="max-h-48 rounded-lg object-contain" />
              ) : (
                <div className="h-48 w-full animate-pulse rounded-lg bg-accent-soft" />
              )}
            </div>
            <p className="mt-3 text-center font-medium">Is this your item? 👀</p>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <label className="flex flex-col gap-1">
                <span className="text-muted">Category</span>
                <select
                  value={draft.category}
                  onChange={(e) => updateDraft({ category: e.target.value as ClothingCategory })}
                  className="rounded-lg border border-border bg-background px-2 py-1.5 capitalize"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-muted">Subcategory</span>
                <input
                  value={draft.subcategory}
                  onChange={(e) => updateDraft({ subcategory: e.target.value })}
                  className="rounded-lg border border-border bg-background px-2 py-1.5"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-muted">Color</span>
                <input
                  value={draft.color}
                  onChange={(e) => updateDraft({ color: e.target.value })}
                  className="rounded-lg border border-border bg-background px-2 py-1.5"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-muted">Pattern</span>
                <input
                  value={draft.pattern}
                  onChange={(e) => updateDraft({ pattern: e.target.value })}
                  className="rounded-lg border border-border bg-background px-2 py-1.5"
                />
              </label>
              <label className="col-span-2 flex flex-col gap-1">
                <span className="text-muted">Style tags (comma separated)</span>
                <input
                  value={draft.styleTags.join(", ")}
                  onChange={(e) =>
                    updateDraft({
                      styleTags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                    })
                  }
                  className="rounded-lg border border-border bg-background px-2 py-1.5"
                />
              </label>
            </div>

            <div className="mt-5 flex gap-3">
              <button
                onClick={handleNo}
                disabled={isSaving}
                className="flex-1 rounded-lg border border-border bg-background px-4 py-2.5 text-sm font-semibold text-muted hover:text-foreground disabled:opacity-50"
              >
                Not mine
              </button>
              <button
                onClick={handleYes}
                disabled={isSaving}
                className="flex-1 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {isSaving ? "Saving…" : "Yes, that's mine ✓"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
