"use client";

import { useRef, useState } from "react";

interface UploadDropzoneProps {
  onUpload: (files: File[]) => Promise<void>;
}

export default function UploadDropzone({ onUpload }: UploadDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;
    setIsUploading(true);
    try {
      await onUpload(files);
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
        isDragging ? "border-accent bg-accent-soft/50" : "border-border bg-surface"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <span className="text-3xl">📷</span>
      <p className="font-medium">
        {isUploading ? "Uploading & tagging with AI…" : "Drag photos here, or click to upload"}
      </p>
      <p className="text-sm text-muted">
        Add as many wardrobe photos as you like — we&apos;ll auto-tag category, color, and style.
      </p>
    </div>
  );
}
