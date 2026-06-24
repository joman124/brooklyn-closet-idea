import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

// Files saved to public/uploads at runtime (after the production build) aren't
// picked up by Next's build-time static file serving, so they 404 even though
// they exist on disk. Serving them through a dynamic route handler instead
// reads straight from disk on every request, sidestepping that stale snapshot.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path: segments } = await params;
  const filename = segments.join("/");

  if (filename.includes("..") || path.isAbsolute(filename)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const filePath = path.join(UPLOAD_DIR, filename);
  if (!filePath.startsWith(UPLOAD_DIR)) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  let buffer: Buffer;
  try {
    buffer = fs.readFileSync(filePath);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = path.extname(filename).toLowerCase();
  const contentType = CONTENT_TYPE_BY_EXT[ext] ?? "application/octet-stream";

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
