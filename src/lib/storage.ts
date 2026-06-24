import fs from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

// The uploaded blob is always a canvas-cropped JPEG (see cropImageToBlob), so the
// saved extension must come from its real MIME type rather than the original
// photo's filename — otherwise a cropped JPEG from a "photo.heic" or "photo.png"
// upload gets saved with a mismatched extension that browsers refuse to render.
export function saveUploadedImage(buffer: Buffer, mimeType: string): string {
  ensureUploadDir();
  const ext = EXTENSION_BY_MIME[mimeType] ?? ".jpg";
  const safeName = `${crypto.randomUUID()}${ext}`;
  fs.writeFileSync(path.join(UPLOAD_DIR, safeName), buffer);
  return `/uploads/${safeName}`;
}

export function deleteUploadedImage(imageUrl: string): void {
  if (!imageUrl.startsWith("/uploads/")) return;
  const filePath = path.join(process.cwd(), "public", imageUrl);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}
