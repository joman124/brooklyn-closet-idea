import fs from "fs";
import path from "path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export function ensureUploadDir(): void {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

export function saveUploadedImage(buffer: Buffer, originalFilename: string): string {
  ensureUploadDir();
  const ext = path.extname(originalFilename) || ".jpg";
  const safeName = `${crypto.randomUUID()}${ext.toLowerCase()}`;
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
