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

// Sniffs the real image format from a file's magic bytes, independent of
// whatever extension it was saved with.
function sniffExtension(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return ".jpg";
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
    return ".png";
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP")
    return ".webp";
  if (buffer.length >= 6 && buffer.subarray(0, 6).toString("ascii") === "GIF89a") return ".gif";
  if (buffer.length >= 6 && buffer.subarray(0, 6).toString("ascii") === "GIF87a") return ".gif";
  return null;
}

// Items saved before the upload pipeline matched extensions to real content
// (see saveUploadedImage above) may have a file on disk whose extension
// doesn't match its actual bytes, which browsers refuse to render. Sniffs
// each closet item's image file and renames/repoints it if it's mismatched.
export function repairMismatchedImageExtension(imageUrl: string): string {
  if (!imageUrl.startsWith("/uploads/")) return imageUrl;
  const filePath = path.join(process.cwd(), "public", imageUrl);
  let buffer: Buffer;
  try {
    buffer = fs.readFileSync(filePath);
  } catch {
    return imageUrl;
  }

  const realExt = sniffExtension(buffer);
  const currentExt = path.extname(imageUrl).toLowerCase();
  if (!realExt || realExt === currentExt) return imageUrl;

  const newUrl = imageUrl.slice(0, -currentExt.length) + realExt;
  const newPath = path.join(process.cwd(), "public", newUrl);
  fs.renameSync(filePath, newPath);
  return newUrl;
}
